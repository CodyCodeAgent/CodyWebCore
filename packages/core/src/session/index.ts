import type { AppServerHost, RuntimeNotification, ServerRequest, ServerRequestReply } from '../runtime/index.js'
import {
  asRecord,
  isApprovalRequestMethod,
  isToolUserInputRequestMethod,
  readItemId,
  readString,
  readThreadId,
  readTurnId,
} from '../protocol/index.js'
import { createTypedCodexClient, type TypedCodexClient } from '../protocol/methods.js'
import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js'
import type { ThreadResumeParams } from '../protocol/generated/v2/ThreadResumeParams.js'
import type { UserInput } from '../protocol/generated/v2/UserInput.js'
import type { CodexEvent } from '../conversation/index.js'
import {
  contentFromUserItem,
  normalizeCodexNotification,
  normalizeThreadHistory,
  outputText,
  textFromError,
} from './normalization.js'
import type { ExecutionContext, TurnInput } from './turn-input.js'

export * from './token-usage.js'
export * from './turn-input.js'
export * from './catalog.js'
export {
  conversationToolFromItem,
  normalizeCodexNotification,
  normalizeThreadHistory,
  readCodexStatus,
} from './normalization.js'
export type {
  CodexNotificationEventIdentity,
  CodexNotificationInput,
  NormalizeCodexNotificationOptions,
} from './normalization.js'

export type ThreadBinding = {
  /** Product-owned stable identifier (conversation id, task id, etc.). */
  id: string
  threadId: string
}

export type TurnHandle = { threadId: string; turnId: string }
export type TurnOutcome = { handle: TurnHandle; terminalEvent: CodexEvent }

export type ProtectedOperation = {
  requestId: number
  method: string
  threadId: string
  turnId: string
  itemId: string
  params: unknown
}

export type PolicyDecision =
  | { action: 'ask' }
  | { action: 'allow'; reply?: ServerRequestReply; reason?: string }
  | { action: 'deny'; reply?: ServerRequestReply; reason: string }

export interface ExecutionPolicyProvider {
  evaluate(operation: ProtectedOperation, binding: ThreadBinding, context: ExecutionContext): Promise<PolicyDecision> | PolicyDecision
}

export type CodexSessionDiagnostic = {
  level: 'info' | 'warning' | 'error'
  message: string
  method?: string
  params?: unknown
}

export type CodexSessionManagerOptions = {
  host: AppServerHost
  policy?: ExecutionPolicyProvider
  nowIso?: () => string
  /** Maximum silence between events for an active turn. Progress resets this watchdog. */
  turnInactivityTimeoutMs?: number
  onDiagnostic?: (diagnostic: CodexSessionDiagnostic) => void
}

type AttachedSession = {
  binding: ThreadBinding
  context: ExecutionContext
  activeTurnId: string
  queueTail: Promise<void>
  attached: boolean
}

type TurnWaiter = {
  resolve: (event: CodexEvent) => void
  reject: (error: Error) => void
}

type TurnWatchdog = {
  handle: TurnHandle
  timer: ReturnType<typeof setTimeout>
  inactivityTimeoutMs: number
}

const DEFAULT_TURN_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000

export class CodexSessionManager {
  private readonly sessions = new Map<string, AttachedSession>()
  private readonly sessionIdByThreadId = new Map<string, string>()
  private readonly listeners = new Set<(event: CodexEvent) => void>()
  private readonly waiters = new Map<string, TurnWaiter[]>()
  private readonly turnWatchdogs = new Map<string, TurnWatchdog>()
  private readonly terminalEvents = new Map<string, CodexEvent>()
  private readonly pendingRequests = new Map<string, { request: ServerRequest; bindingId: string; kind: 'approval' | 'question' }>()
  private readonly client: TypedCodexClient
  private readonly nowIso: () => string
  private eventSequence = 0
  private unlisten: (() => void) | null = null

  constructor(private readonly options: CodexSessionManagerOptions) {
    this.client = createTypedCodexClient(options.host)
    this.nowIso = options.nowIso ?? (() => new Date().toISOString())
    this.unlisten = options.host.subscribe((notification) => { void this.handleNotification(notification) })
  }

  subscribe(listener: (event: CodexEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async create(bindingId: string, context: ExecutionContext): Promise<ThreadBinding> {
    await this.options.host.ensureInitialized()
    const result = await this.client.call('thread/start', {
      ...context.thread,
      experimentalRawEvents: context.thread.experimentalRawEvents ?? false,
    } as ThreadStartParams)
    const binding = { id: bindingId, threadId: result.thread.id }
    this.attachLocal(binding, context)
    this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId, mode: 'created' } })
    return binding
  }

  async resume(binding: ThreadBinding, context: ExecutionContext): Promise<void> {
    await this.options.host.ensureInitialized()
    const params: ThreadResumeParams = {
      ...context.thread,
      threadId: binding.threadId,
    }
    await this.client.call('thread/resume', params)
    this.forgetTerminalEvents(binding.threadId)
    this.attachLocal(binding, context)
    this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId: binding.id, mode: 'resumed' } })
  }

  detach(bindingId: string): void {
    const session = this.sessions.get(bindingId)
    if (!session) return
    this.sessions.delete(bindingId)
    this.sessionIdByThreadId.delete(session.binding.threadId)
  }

  /** Updates product policy/settings for future turns without rebinding the native thread. */
  setContext(bindingId: string, context: ExecutionContext): void {
    this.require(bindingId).context = context
  }

  async read(bindingId: string): Promise<CodexEvent[]> {
    const session = this.require(bindingId)
    await this.ensureSessionReady(session)
    const result = await this.client.call('thread/read', { threadId: session.binding.threadId, includeTurns: true })
    return normalizeThreadHistory(result, session.binding.threadId)
  }

  async send(bindingId: string, input: TurnInput, mode: 'queue' | 'steer' = 'queue'): Promise<TurnHandle> {
    const session = this.require(bindingId)
    await this.ensureSessionReady(session)
    if (mode === 'steer') {
      if (!session.activeTurnId) throw new Error('turn/steer requires an active turn')
      await this.client.call('turn/steer', { threadId: session.binding.threadId, expectedTurnId: session.activeTurnId, input: input.input })
      return { threadId: session.binding.threadId, turnId: session.activeTurnId }
    }
    let resolveStarted!: (handle: TurnHandle) => void
    let rejectStarted!: (error: unknown) => void
    const started = new Promise<TurnHandle>((resolve, reject) => { resolveStarted = resolve; rejectStarted = reject })
    const execute = async (): Promise<void> => {
      try {
        const result = await this.client.call('turn/start', {
          ...(session.context.turn ?? {}),
          threadId: session.binding.threadId,
          input: input.input,
          ...(input.model !== undefined ? { model: input.model } : {}),
          ...(input.effort !== undefined ? { effort: input.effort } : {}),
          ...(input.collaborationMode !== undefined ? { collaborationMode: input.collaborationMode } : {}),
          ...(input.approvalPolicy !== undefined ? { approvalPolicy: input.approvalPolicy } : {}),
          ...(input.approvalsReviewer !== undefined ? { approvalsReviewer: input.approvalsReviewer } : {}),
          ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
          ...(input.runtimeWorkspaceRoots !== undefined ? { runtimeWorkspaceRoots: input.runtimeWorkspaceRoots } : {}),
          ...(input.sandboxPolicy !== undefined ? { sandboxPolicy: input.sandboxPolicy } : {}),
        })
        const handle = { threadId: session.binding.threadId, turnId: result.turn.id }
        session.activeTurnId = handle.turnId
        this.emit({ type: 'user.completed', threadId: handle.threadId, turnId: handle.turnId, data: { ...contentFromInputs(input.input), optimistic: true } })
        resolveStarted(handle)
        await this.waitForTurn(handle)
      } catch (error) {
        rejectStarted(error)
        throw error
      }
    }
    const scheduled = session.queueTail.catch(() => undefined).then(execute)
    session.queueTail = scheduled.catch(() => undefined)
    return started
  }

  async run(bindingId: string, input: TurnInput, mode: 'queue' | 'steer' = 'queue'): Promise<TurnOutcome> {
    const handle = await this.send(bindingId, input, mode)
    return { handle, terminalEvent: await this.waitForTurn(handle) }
  }

  async interrupt(bindingId: string): Promise<boolean> {
    const session = this.require(bindingId)
    await this.ensureSessionReady(session)
    if (!session.activeTurnId) return false
    await this.client.call('turn/interrupt', { threadId: session.binding.threadId, turnId: session.activeTurnId })
    return true
  }

  waitForTurn(handle: TurnHandle): Promise<CodexEvent> {
    const key = this.turnKey(handle.threadId, handle.turnId)
    const terminal = this.terminalEvents.get(key)
    if (terminal) return Promise.resolve(terminal)
    this.ensureTurnWatchdog(handle)
    return new Promise<CodexEvent>((resolve, reject) => {
      const rows = this.waiters.get(key) ?? []
      rows.push({ resolve, reject })
      this.waiters.set(key, rows)
    })
  }

  async respondApproval(bindingId: string, requestId: string, decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel'): Promise<void> {
    const pending = this.requirePending(bindingId, requestId, 'approval')
    await this.options.host.resolveServerRequest(pending.request.id, { result: { decision } })
    this.pendingRequests.delete(requestId)
    this.emit({ type: 'approval.resolved', threadId: this.require(bindingId).binding.threadId, data: { requestId, decision } })
  }

  async respondQuestion(bindingId: string, requestId: string, answer: unknown): Promise<void> {
    const pending = this.requirePending(bindingId, requestId, 'question')
    const supplied = asRecord(answer)
    let answers: Record<string, { answers: string[] }>
    if (supplied && Object.values(supplied).every(value => Array.isArray(asRecord(value)?.answers))) {
      answers = supplied as Record<string, { answers: string[] }>
    } else {
      const params = asRecord(asRecord(pending.request.params)?.params ?? pending.request.params)
      const questions = Array.isArray(params?.questions) ? params.questions : []
      const text = typeof answer === 'string' ? answer : outputText(answer)
      answers = Object.fromEntries(questions.flatMap((question, index) => {
        const id = readString(asRecord(question)?.id) || `question-${String(index + 1)}`
        return [[id, { answers: [text] }]]
      }))
      if (Object.keys(answers).length === 0) answers = { answer: { answers: [text] } }
    }
    await this.options.host.resolveServerRequest(pending.request.id, { result: { answers } })
    this.pendingRequests.delete(requestId)
    this.emit({ type: 'question.resolved', threadId: this.require(bindingId).binding.threadId, data: { requestId } })
  }

  async dispose(): Promise<void> {
    this.unlisten?.()
    this.unlisten = null
    for (const watchdog of this.turnWatchdogs.values()) clearTimeout(watchdog.timer)
    this.turnWatchdogs.clear()
    for (const rows of this.waiters.values()) for (const waiter of rows) waiter.reject(new Error('Codex session manager disposed'))
    this.waiters.clear()
    this.sessions.clear()
    this.sessionIdByThreadId.clear()
  }

  private attachLocal(binding: ThreadBinding, context: ExecutionContext): void {
    const existingBindingId = this.sessionIdByThreadId.get(binding.threadId)
    if (existingBindingId && existingBindingId !== binding.id) throw new Error(`Codex thread ${binding.threadId} is already attached to ${existingBindingId}`)
    this.sessions.set(binding.id, { binding, context, activeTurnId: '', queueTail: Promise.resolve(), attached: true })
    this.sessionIdByThreadId.set(binding.threadId, binding.id)
  }

  private require(bindingId: string): AttachedSession {
    const session = this.sessions.get(bindingId)
    if (!session) throw new Error(`Codex thread binding ${bindingId} is not attached`)
    return session
  }

  private async ensureSessionReady(session: AttachedSession): Promise<void> {
    if (session.attached) return
    await this.options.host.ensureInitialized()
    await this.client.call('thread/resume', {
      ...session.context.thread,
      threadId: session.binding.threadId,
    } as ThreadResumeParams)
    this.forgetTerminalEvents(session.binding.threadId)
    session.attached = true
    this.emit({ type: 'runtime.connected', threadId: session.binding.threadId, data: { resumed: true } })
  }

  private forgetTerminalEvents(threadId: string): void {
    const prefix = `${threadId}\u0000`
    for (const key of this.terminalEvents.keys()) if (key.startsWith(prefix)) this.terminalEvents.delete(key)
  }

  private requirePending(bindingId: string, requestId: string, kind: 'approval' | 'question') {
    const pending = this.pendingRequests.get(requestId)
    if (!pending || pending.bindingId !== bindingId || pending.kind !== kind) throw new Error(`No pending ${kind} request ${requestId}`)
    return pending
  }

  private eventId(method: string, threadId: string, turnId = '', itemId = ''): string {
    this.eventSequence += 1
    return `live:${String(this.eventSequence)}:${method}:${threadId}:${turnId}:${itemId}`
  }

  private emit(input: Omit<CodexEvent, 'id' | 'atIso'> & { id?: string; atIso?: string }): CodexEvent {
    if ((input.type === 'turn.completed' || input.type === 'turn.failed' || input.type === 'turn.interrupted') && input.turnId) {
      const existing = this.terminalEvents.get(this.turnKey(input.threadId, input.turnId))
      if (existing) return existing
    }
    const event: CodexEvent = {
      ...input,
      id: input.id ?? this.eventId(input.type, input.threadId, input.turnId, input.itemId),
      atIso: input.atIso ?? this.nowIso(),
    }
    if (event.turnId && event.type !== 'turn.completed' && event.type !== 'turn.failed' && event.type !== 'turn.interrupted') this.refreshTurnInactivity(event.threadId, event.turnId)
    if (event.type === 'turn.completed' || event.type === 'turn.failed' || event.type === 'turn.interrupted') this.finishTurn(event)
    for (const listener of this.listeners) listener(event)
    return event
  }

  private finishTurn(event: CodexEvent): void {
    if (!event.turnId) return
    const key = this.turnKey(event.threadId, event.turnId)
    if (this.terminalEvents.has(key)) return
    this.terminalEvents.set(key, event)
    const bindingId = this.sessionIdByThreadId.get(event.threadId)
    const session = bindingId ? this.sessions.get(bindingId) : undefined
    if (session?.activeTurnId === event.turnId) session.activeTurnId = ''
    const rows = this.waiters.get(key) ?? []
    this.waiters.delete(key)
    this.clearTurnWatchdog(key)
    for (const waiter of rows) waiter.resolve(event)
  }

  private ensureTurnWatchdog(handle: TurnHandle): void {
    const key = this.turnKey(handle.threadId, handle.turnId)
    if (this.turnWatchdogs.has(key)) return
    const watchdog: TurnWatchdog = {
      handle,
      timer: undefined as unknown as ReturnType<typeof setTimeout>,
      inactivityTimeoutMs: Math.max(250, this.options.turnInactivityTimeoutMs ?? DEFAULT_TURN_INACTIVITY_TIMEOUT_MS),
    }
    this.turnWatchdogs.set(key, watchdog)
    this.armTurnWatchdog(watchdog)
  }

  private armTurnWatchdog(watchdog: TurnWatchdog): void {
    clearTimeout(watchdog.timer)
    watchdog.timer = setTimeout(() => {
      const key = this.turnKey(watchdog.handle.threadId, watchdog.handle.turnId)
      if (this.turnWatchdogs.get(key) !== watchdog) return
      void this.client.call('turn/interrupt', watchdog.handle).catch((error: unknown) => {
        this.options.onDiagnostic?.({
          level: 'warning',
          message: `Failed to interrupt inactive Codex turn: ${textFromError(error) || 'unknown error'}`,
          method: 'turn/interrupt',
        })
      })
      this.emit({
        type: 'turn.failed',
        threadId: watchdog.handle.threadId,
        turnId: watchdog.handle.turnId,
        data: { error: `Codex turn ${watchdog.handle.turnId} had no progress for ${String(watchdog.inactivityTimeoutMs)}ms`, cause: 'inactivity_timeout' },
      })
    }, watchdog.inactivityTimeoutMs)
    watchdog.timer.unref?.()
  }

  private refreshTurnInactivity(threadId: string, turnId: string): void {
    const watchdog = this.turnWatchdogs.get(this.turnKey(threadId, turnId))
    if (watchdog) this.armTurnWatchdog(watchdog)
  }

  private clearTurnWatchdog(key: string): void {
    const watchdog = this.turnWatchdogs.get(key)
    if (!watchdog) return
    clearTimeout(watchdog.timer)
    this.turnWatchdogs.delete(key)
  }

  private turnKey(threadId: string, turnId: string): string { return `${threadId}\u0000${turnId}` }

  private async handleNotification(notification: RuntimeNotification): Promise<void> {
    if (notification.method === 'server/request') {
      const request = notification.params as ServerRequest
      if (typeof request?.id === 'number') await this.handleServerRequest(request)
      return
    }
    if (notification.method === 'runtime/disconnected') {
      const error = textFromError(asRecord(notification.params)?.error ?? notification.params) || 'Codex App Server disconnected.'
      for (const session of this.sessions.values()) {
        const [event] = normalizeCodexNotification(notification, {
          fallbackThreadId: session.binding.threadId,
          fallbackTurnId: session.activeTurnId,
          eventId: ({ method, suffix, threadId, turnId, itemId }) => this.eventId(`${method}:${suffix}`, threadId, turnId, itemId),
        })
        if (event) this.emit(event)
        if (session.activeTurnId) {
          const key = this.turnKey(session.binding.threadId, session.activeTurnId)
          this.clearTurnWatchdog(key)
          for (const waiter of this.waiters.get(key) ?? []) waiter.reject(new Error(error))
          this.waiters.delete(key)
        }
        session.activeTurnId = ''
        session.attached = false
      }
      return
    }
    const params = asRecord(notification.params) ?? {}
    const threadId = readThreadId(params)
    const bindingId = this.sessionIdByThreadId.get(threadId)
    if (!threadId || !bindingId) {
      this.options.onDiagnostic?.({ level: 'warning', message: 'Ignored Codex notification without an attached thread.', method: notification.method, params: notification.params })
      return
    }
    const session = this.sessions.get(bindingId)!
    const events = normalizeCodexNotification(notification, {
      fallbackTurnId: session.activeTurnId,
      includeProviderExtensions: true,
      eventId: ({ method, suffix, threadId: eventThreadId, turnId, itemId: eventItemId }) => this.eventId(`${method}:${suffix}`, eventThreadId, turnId, eventItemId),
    })
    for (const event of events) {
      if (event.type === 'turn.started' && event.turnId) session.activeTurnId = event.turnId
      this.emit(event)
    }
  }

  private async handleServerRequest(request: ServerRequest): Promise<void> {
    const outer = asRecord(request.params)
    const params = outer?.params ?? request.params
    const threadId = readThreadId(params)
    const bindingId = this.sessionIdByThreadId.get(threadId)
    if (!threadId || !bindingId) {
      this.options.onDiagnostic?.({ level: 'error', message: 'Cannot route Codex server request to an attached thread.', method: request.method, params: request.params })
      return
    }
    const session = this.sessions.get(bindingId)!
    const operation: ProtectedOperation = {
      requestId: request.id,
      method: request.method,
      threadId,
      turnId: readTurnId(params) || session.activeTurnId,
      itemId: readItemId(params),
      params,
    }
    const decision = await this.options.policy?.evaluate(operation, session.binding, session.context) ?? { action: 'ask' as const }
    if (decision.action === 'allow') {
      await this.options.host.resolveServerRequest(request.id, decision.reply ?? { result: { decision: 'accept' } })
      this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'accept', automatic: true, reason: decision.reason } })
      return
    }
    if (decision.action === 'deny') {
      await this.options.host.resolveServerRequest(request.id, decision.reply ?? { error: { code: -32000, message: decision.reason } })
      this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'decline', automatic: true, reason: decision.reason } })
      return
    }
    const isQuestion = isToolUserInputRequestMethod(request.method)
    const kind = isQuestion ? 'question' : 'approval'
    if (!isApprovalRequestMethod(request.method) && !isQuestion) {
      this.options.onDiagnostic?.({ level: 'warning', message: 'Unsupported server request is pending for explicit product handling.', method: request.method, params })
    }
    const requestId = String(request.id)
    this.pendingRequests.set(requestId, { request, bindingId, kind })
    this.emit({
      type: kind === 'approval' ? 'approval.requested' : 'question.requested',
      threadId, turnId: operation.turnId, itemId: operation.itemId,
      data: { requestId, approvalId: requestId, method: request.method, params },
    })
  }
}

function contentFromInputs(input: UserInput[]): ReturnType<typeof contentFromUserItem> {
  return contentFromUserItem({ content: input })
}
