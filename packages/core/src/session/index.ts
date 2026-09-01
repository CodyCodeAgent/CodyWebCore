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
import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js'
import type { ThreadResumeParams } from '../protocol/generated/v2/ThreadResumeParams.js'
import type { ConfigReadResponse } from '../protocol/generated/v2/ConfigReadResponse.js'
import type { GetAccountRateLimitsResponse } from '../protocol/generated/v2/GetAccountRateLimitsResponse.js'
import type { McpServerRefreshResponse } from '../protocol/generated/v2/McpServerRefreshResponse.js'
import type { UserInput } from '../protocol/generated/v2/UserInput.js'
import { latestAssistantTextFromEvents, type CodexEvent } from '../conversation/index.js'
import {
  contentFromUserItem,
  normalizeCodexNotification,
  normalizeThreadHistory,
  outputText,
  textFromError,
} from './normalization.js'
import type { ExecutionContext, TurnInput } from './turn-input.js'
import { CodexThreadCommands } from './commands.js'
import {
  CodexSessionCatalog,
  type CodexCollaborationModeOption,
  type CodexModelOption,
  type CodexSkillCatalogGroup,
  type CodexSkillOption,
  type CodexThreadSummary,
  type ListCodexThreadsOptions,
} from './catalog.js'

export * from './token-usage.js'
export * from './turn-input.js'
export * from './catalog.js'
export * from './commands.js'
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
export type CodexConversationSnapshot = {
  events: CodexEvent[]
  watermark: number
}
/**
 * The process owner owns the complete normalized outcome for one native Turn.
 * Products may render or persist this value, but must not replay a second
 * reducer to guess a terminal state or extract a final answer.
 */
export type TurnOutcome = {
  handle: TurnHandle
  terminalEvent: CodexEvent
  assistantText: string
  events: readonly CodexEvent[]
}
export type TurnSubmission = {
  /** Product-generated id for the local outbox row. It never masquerades as a native Turn id. */
  clientCommandId: string
  /** Resolves only after App Server acknowledges turn/start (or turn/steer). */
  started: Promise<TurnHandle>
  /** Resolves with the one authoritative terminal event for the native Turn. */
  completed: Promise<TurnOutcome>
}

/** Authoritative process-owner state for a product binding. Products may use
 * this for guards and diagnostics, but must never persist or independently
 * advance it. */
export type CodexSessionSnapshot = {
  bindingId: string
  threadId: string
  activeTurnId: string
  pendingRequestCount: number
  attached: boolean
  runtimeAvailable: boolean
  quarantinedReason: string
}

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

/** A reply that has been accepted by the one Core request broker. Product
 * adapters may audit or persist a scoped grant from this record, but must not
 * issue a second App Server reply. */
export type ServerRequestResolution = {
  operation: ProtectedOperation
  binding: ThreadBinding
  context: ExecutionContext
  request: ServerRequest
  kind: 'approval' | 'question'
  reply: ServerRequestReply
  automatic: boolean
  policyDecision?: PolicyDecision
}

export interface ExecutionPolicyProvider {
  evaluate(operation: ProtectedOperation, binding: ThreadBinding, context: ExecutionContext): Promise<PolicyDecision> | PolicyDecision
  onResolved?(resolution: ServerRequestResolution): Promise<void> | void
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
  /** Fallback ceiling for legacy upstream response-stream errors that omit retry metadata. */
  maxUpstreamRetryAttempts?: number
  /** Number of native thread/read checks after requesting a Turn stop. */
  turnStopReconcileAttempts?: number
  /** Delay between native stop reconciliation reads. */
  turnStopReconcileDelayMs?: number
  onDiagnostic?: (diagnostic: CodexSessionDiagnostic) => void
}

type AttachedSession = {
  binding: ThreadBinding
  context: ExecutionContext
  activeTurnId: string
  queueTail: Promise<void>
  attached: boolean
  quarantinedReason: string
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

type UpstreamRetry = {
  attempts: number
  limit: number
}

type SubmissionRecord = {
  fingerprint: string
  submission: TurnSubmission
  bindingId: string
  threadId: string
  commandId: string
  content: Record<string, unknown>
  state: 'queued' | 'bound' | 'terminal' | 'failed'
  turnId?: string
}

type PendingServerRequest = {
  request: ServerRequest
  bindingId: string
  kind: 'approval' | 'question'
  operation: ProtectedOperation
  event?: CodexEvent
}

const DEFAULT_TURN_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000
const DEFAULT_MAX_UPSTREAM_RETRY_ATTEMPTS = 5
const DEFAULT_TURN_STOP_RECONCILE_ATTEMPTS = 5
const DEFAULT_TURN_STOP_RECONCILE_DELAY_MS = 1_000
/**
 * A Turn outcome is an in-process handoff for product adapters, never a
 * history cache. Retain only a bounded tail so one very chatty tool cannot
 * make the shared owner grow without bound while a Turn is running.
 */
const MAX_TURN_OUTCOME_EVENTS = 256
const MAX_OWNER_JOURNAL_EVENTS = 10_000

export class CodexSessionManager {
  private readonly sessions = new Map<string, AttachedSession>()
  private readonly sessionIdByThreadId = new Map<string, string>()
  private readonly listeners = new Set<(event: CodexEvent) => void>()
  private readonly waiters = new Map<string, TurnWaiter[]>()
  private readonly turnWatchdogs = new Map<string, TurnWatchdog>()
  private readonly upstreamRetries = new Map<string, UpstreamRetry>()
  private readonly operationalStops = new Map<string, Promise<void>>()
  private readonly terminalEvents = new Map<string, CodexEvent>()
  private readonly ownerJournalByBindingId = new Map<string, CodexEvent[]>()
  private readonly turnEvents = new Map<string, CodexEvent[]>()
  private readonly operationalFailures = new Map<string, CodexEvent>()
  private readonly submissions = new Map<string, SubmissionRecord>()
  private readonly pendingRequests = new Map<string, PendingServerRequest>()
  private readonly requestResolutions = new Map<string, Promise<void>>()
  private readonly resolvedRequests = new Set<string>()
  private readonly commands: CodexThreadCommands
  private readonly catalog: CodexSessionCatalog
  private readonly nowIso: () => string
  private eventSequence = 0
  private ownerRevision = 0
  private commandSequence = 0
  private runtimeUnavailable = false
  private disposed = false
  private unlisten: (() => void) | null = null

  constructor(private readonly options: CodexSessionManagerOptions) {
    this.commands = new CodexThreadCommands(options.host)
    this.catalog = new CodexSessionCatalog(options.host)
    this.nowIso = options.nowIso ?? (() => new Date().toISOString())
    this.unlisten = options.host.subscribe((notification) => { void this.handleNotification(notification) })
  }

  subscribe(listener: (event: CodexEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Returns stable live events for unresolved approvals/questions after a product view reconnects. */
  listPendingEvents(bindingId: string): CodexEvent[] {
    return [...this.pendingRequests.values()]
      .filter((pending) => pending.bindingId === bindingId && pending.event)
      .map((pending) => pending.event!)
  }

  /** A product may expose a pending-request badge, but Core remains the
   * authority for whether that request can still be resolved. */
  isServerRequestPending(requestId: string): boolean {
    return this.pendingRequests.has(requestId)
  }

  /** Returns the volatile owner state needed to attach a browser projection.
   * Native thread/read can lag an active Turn, so attach must explicitly
   * publish that Turn instead of making the browser infer activity. */
  listAttachmentEvents(bindingId: string): CodexEvent[] {
    const session = this.require(bindingId)
    const events: CodexEvent[] = []
    for (const record of this.submissions.values()) {
      if (record.bindingId !== bindingId || (record.state !== 'queued' && record.state !== 'bound')) continue
      events.push({
        id: this.eventId('attachment:command.queued', record.threadId, '', record.commandId),
        type: 'command.queued',
        threadId: record.threadId,
        itemId: record.commandId,
        atIso: this.nowIso(),
        data: { ...record.content, clientCommandId: record.commandId, attachment: true },
      })
      if (record.state === 'bound' && record.turnId) {
        events.push({
          id: this.eventId('attachment:command.bound', record.threadId, record.turnId, record.commandId),
          type: 'command.bound',
          threadId: record.threadId,
          turnId: record.turnId,
          itemId: record.commandId,
          atIso: this.nowIso(),
          data: { clientCommandId: record.commandId, attachment: true },
        })
      }
    }
    if (session.activeTurnId) {
      const key = this.turnKey(session.binding.threadId, session.activeTurnId)
      const operationalFailure = this.operationalFailures.get(key)
      events.push(operationalFailure ?? {
        id: this.eventId('attachment:turn.started', session.binding.threadId, session.activeTurnId),
        type: 'turn.started',
        threadId: session.binding.threadId,
        turnId: session.activeTurnId,
        atIso: new Date().toISOString(),
        data: { status: 'running', attachment: true },
      })
    }
    // Native history can only report the safety interrupt used to stop an
    // unrecoverable response stream. The process owner knows that the actual
    // outcome is a retryable operational failure, so that correction remains
    // part of every attachment snapshot for the lifetime of this owner.
    for (const event of this.terminalEvents.values()) {
      if (event.threadId === session.binding.threadId && event.data.terminalCorrection === true) events.push(event)
    }
    events.push(...this.listPendingEvents(bindingId))
    return events
  }

  snapshot(bindingId: string): CodexSessionSnapshot | null {
    const session = this.sessions.get(bindingId)
    if (!session) return null
    let pendingRequestCount = 0
    for (const pending of this.pendingRequests.values()) {
      if (pending.bindingId === bindingId) pendingRequestCount += 1
    }
    return {
      bindingId,
      threadId: session.binding.threadId,
      activeTurnId: session.activeTurnId,
      pendingRequestCount,
      attached: session.attached,
      runtimeAvailable: !this.runtimeUnavailable && !this.disposed,
      quarantinedReason: session.quarantinedReason,
    }
  }

  async create(bindingId: string, context: ExecutionContext): Promise<ThreadBinding> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    const threadId = await this.commands.startThread({
      ...context.thread,
      experimentalRawEvents: context.thread.experimentalRawEvents ?? false,
    } as ThreadStartParams)
    const binding = { id: bindingId, threadId }
    this.attachLocal(binding, context)
    this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId, mode: 'created' } })
    return binding
  }

  /**
   * Starts a native thread and binds it to itself in one owner operation.
   *
   * Browser clients never receive a window in which a new native thread exists
   * without a Core binding.  Product navigation may use the returned id, but
   * future read/submit/interrupt operations must come back through this
   * manager.
   */
  async startThread(context: ExecutionContext): Promise<ThreadBinding> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    const threadId = await this.commands.startThread({
      ...context.thread,
      experimentalRawEvents: context.thread.experimentalRawEvents ?? false,
    } as ThreadStartParams)
    const binding = { id: threadId, threadId }
    this.attachLocal(binding, context)
    this.emit({ type: 'thread.attached', threadId, data: { bindingId: binding.id, mode: 'created' } })
    return binding
  }

  /** Catalog and thread mutations are owner operations too.  Keeping them
   * here prevents product browsers from using a generic RPC tunnel for the
   * same native threads that this manager serializes. */
  async listThreads(options: ListCodexThreadsOptions = {}): Promise<CodexThreadSummary[]> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.listThreads(options)
  }

  async listModels(): Promise<CodexModelOption[]> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.listModels()
  }

  async listCollaborationModes(): Promise<CodexCollaborationModeOption[]> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.listCollaborationModes()
  }

  async readConfig(): Promise<ConfigReadResponse> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.readConfig()
  }

  async reloadMcpServers(): Promise<McpServerRefreshResponse> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.reloadMcpServers()
  }

  async readAccountRateLimits(): Promise<GetAccountRateLimitsResponse> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.readAccountRateLimits()
  }

  async listSkills(cwds: string[]): Promise<CodexSkillOption[]> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.listSkills(cwds)
  }

  async listSkillCatalog(cwds: string[]): Promise<CodexSkillCatalogGroup[]> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.catalog.listSkillCatalog(cwds)
  }

  async setSkillEnabled(path: string, enabled: boolean): Promise<void> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    await this.catalog.setSkillEnabled(path, enabled)
  }

  async renameThread(threadId: string, name: string): Promise<void> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    await this.commands.renameThread(threadId, name)
  }

  async forkThread(threadId: string): Promise<string> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    return this.commands.forkThread(threadId)
  }

  async compactThread(threadId: string): Promise<void> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    await this.commands.compactThread(threadId)
  }

  async archiveThread(threadId: string): Promise<void> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    await this.commands.archiveThread(threadId)
  }

  async resume(binding: ThreadBinding, context: ExecutionContext): Promise<void> {
    this.requireUsable()
    await this.options.host.ensureInitialized()
    await this.commands.resumeThread(binding.threadId, context.thread as Omit<ThreadResumeParams, 'threadId'>)
    const snapshot = await this.catalog.readThreadSnapshot(binding.threadId)
    this.forgetTerminalEvents(binding.threadId)
    const session = this.attachLocal(binding, context)
    const activeTurn = [...snapshot.turns].reverse().find((turn) => /progress|running|active|started/iu.test(turn.status))
    if (activeTurn && session.activeTurnId !== activeTurn.turnId) {
      session.activeTurnId = activeTurn.turnId
      session.queueTail = this.waitForTurn({ threadId: binding.threadId, turnId: activeTurn.turnId })
        .then(() => undefined)
    }
    this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId: binding.id, mode: 'resumed' } })
  }

  detach(bindingId: string): void {
    const session = this.sessions.get(bindingId)
    if (!session) return
    this.sessions.delete(bindingId)
    this.sessionIdByThreadId.delete(session.binding.threadId)
    this.ownerJournalByBindingId.delete(bindingId)
  }

  /** Updates product policy/settings for future turns without rebinding the native thread. */
  setContext(bindingId: string, context: ExecutionContext): void {
    this.require(bindingId).context = context
  }

  async read(bindingId: string): Promise<CodexEvent[]> {
    const session = this.require(bindingId)
    await this.ensureSessionReady(session)
    return this.catalog.readThread(session.binding.threadId)
  }

  /**
   * The only safe reconnect cut: durable native history and the owner's live
   * journal are captured with a monotonically increasing watermark. A browser
   * subscribes first and replays only owner events newer than this watermark.
   */
  async readSnapshot(bindingId: string): Promise<CodexConversationSnapshot> {
    const session = this.require(bindingId)
    await this.ensureSessionReady(session)
    const history = await this.catalog.readThread(session.binding.threadId)
    const watermark = this.ownerRevision
    const journal = this.ownerJournalByBindingId.get(bindingId) ?? []
    return { events: [...history, ...journal.filter(event => (event.ownerRevision ?? 0) <= watermark)], watermark }
  }

  submit(bindingId: string, input: TurnInput, mode: 'queue' | 'steer' = 'queue', clientCommandId?: string): TurnSubmission {
    this.requireUsable()
    const session = this.require(bindingId)
    const commandId = clientCommandId?.trim() || `command:${bindingId}:${String(++this.commandSequence)}`
    const submissionKey = `${bindingId}\u0000${session.binding.threadId}\u0000${commandId}`
    const fingerprint = JSON.stringify({ mode, input })
    const existingSubmission = this.submissions.get(submissionKey)
    if (existingSubmission) {
      if (existingSubmission.fingerprint !== fingerprint) {
        throw new Error(`Client command ${commandId} was already submitted with different content`)
      }
      return existingSubmission.submission
    }
    const content = contentFromInputs(input.input)
    let resolveStarted!: (handle: TurnHandle) => void
    let rejectStarted!: (error: unknown) => void
    const started = new Promise<TurnHandle>((resolve, reject) => { resolveStarted = resolve; rejectStarted = reject })
    let resolveCompleted!: (outcome: TurnOutcome) => void
    let rejectCompleted!: (error: unknown) => void
    const completed = new Promise<TurnOutcome>((resolve, reject) => { resolveCompleted = resolve; rejectCompleted = reject })
    // A product may only need the immediate command id. Keep background failures
    // observable through events without producing an unhandled rejection.
    void started.catch(() => undefined)
    void completed.catch(() => undefined)
    const submission: TurnSubmission = { clientCommandId: commandId, started, completed }
    const record: SubmissionRecord = {
      fingerprint,
      submission,
      bindingId,
      threadId: session.binding.threadId,
      commandId,
      content,
      state: 'queued',
    }
    this.submissions.set(submissionKey, record)
    // Publish only after the owner record exists. A second browser can attach
    // synchronously from an event listener; emitting first creates a gap where
    // that tab sees neither the realtime event nor the attachment replay.
    this.emit({
      type: 'command.queued',
      threadId: session.binding.threadId,
      itemId: commandId,
      data: { ...content, clientCommandId: commandId },
    })
    // Bound memory without sacrificing idempotency for any realistic active
    // browser outbox. The oldest command is the least useful replay.
    if (this.submissions.size > 10_000) {
      const oldestKey = this.submissions.keys().next().value as string | undefined
      if (oldestKey) this.submissions.delete(oldestKey)
    }
    const execute = async (): Promise<void> => {
      let handle: TurnHandle | null = null
      try {
        this.requireUsable()
        await this.ensureSessionReady(session)
        const turnId = mode === 'steer'
          ? await this.steerSubmission(session, input)
          : await this.commands.startTurn(session.binding.threadId, {
            ...(session.context.turn ?? {}),
            input: input.input,
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.effort !== undefined ? { effort: input.effort } : {}),
            ...(input.collaborationMode !== undefined ? { collaborationMode: input.collaborationMode } : {}),
            ...(input.approvalPolicy !== undefined ? { approvalPolicy: input.approvalPolicy } : {}),
            ...(input.approvalsReviewer !== undefined ? { approvalsReviewer: input.approvalsReviewer } : {}),
            ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
            ...(input.runtimeWorkspaceRoots !== undefined ? { runtimeWorkspaceRoots: input.runtimeWorkspaceRoots } : {}),
            ...(input.sandboxPolicy !== undefined ? { sandboxPolicy: input.sandboxPolicy } : {}),
            ...(input.outputSchema !== undefined ? { outputSchema: input.outputSchema } : {}),
            ...(input.responsesapiClientMetadata !== undefined ? { responsesapiClientMetadata: input.responsesapiClientMetadata } : {}),
          })
        handle = { threadId: session.binding.threadId, turnId }
        session.activeTurnId = handle.turnId
        record.state = 'bound'
        record.turnId = handle.turnId
        this.emit({
          type: 'command.bound',
          threadId: handle.threadId,
          turnId: handle.turnId,
          itemId: commandId,
          data: { clientCommandId: commandId },
        })
        resolveStarted(handle)
        const terminalEvent = await this.waitForTurn(handle)
        const outcomeKey = this.turnKey(handle.threadId, handle.turnId)
        const events = this.turnEvents.get(outcomeKey) ?? []
        // No attachment or reconnect path reads this transient outcome buffer;
        // native thread/read plus owner snapshots remain authoritative. Release
        // it as soon as the submitter has received its immutable result.
        this.turnEvents.delete(outcomeKey)
        resolveCompleted({
          handle,
          terminalEvent,
          assistantText: latestAssistantTextFromEvents(events),
          events: [...events],
        })
      } catch (error) {
        if (handle) this.turnEvents.delete(this.turnKey(handle.threadId, handle.turnId))
        if (!handle) {
          record.state = 'failed'
          this.emit({
            type: 'command.failed',
            threadId: session.binding.threadId,
            itemId: commandId,
            data: { clientCommandId: commandId, error: textFromError(error) || 'Codex failed to start this command.' },
          })
        }
        rejectStarted(error)
        rejectCompleted(error)
        throw error
      }
    }
    // Queue mode is serialized behind the authoritative terminal event of the
    // previous Turn. Steering is different: it targets the currently active
    // native Turn and must run immediately. Putting steer on queueTail makes it
    // wait until that Turn has already finished, at which point there is no
    // active Turn left to steer.
    const scheduled = mode === 'steer'
      ? execute()
      : session.queueTail.catch(() => undefined).then(execute)
    if (mode === 'queue') session.queueTail = scheduled.catch(() => undefined)
    else void scheduled.catch(() => undefined)
    return submission
  }

  async send(bindingId: string, input: TurnInput, mode: 'queue' | 'steer' = 'queue', clientCommandId?: string): Promise<TurnHandle> {
    return this.submit(bindingId, input, mode, clientCommandId).started
  }

  async run(bindingId: string, input: TurnInput, mode: 'queue' | 'steer' = 'queue', clientCommandId?: string): Promise<TurnOutcome> {
    return this.submit(bindingId, input, mode, clientCommandId).completed
  }

  async interrupt(bindingId: string): Promise<boolean> {
    const session = this.require(bindingId)
    await this.ensureSessionReady(session)
    if (!session.activeTurnId) return false
    void this.requestNativeStop(
      { threadId: session.binding.threadId, turnId: session.activeTurnId },
      'Codex Turn interruption could not be confirmed.',
    )
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
    await this.resolveRequestOnce(bindingId, requestId, 'approval', async (pending) => {
      const reply = { result: { decision } }
      await this.options.host.resolveServerRequest(pending.request.id, reply)
      this.pendingRequests.delete(requestId)
      await this.notifyServerRequestResolved(pending, reply, false)
      this.emit({ type: 'approval.resolved', threadId: this.require(bindingId).binding.threadId, data: { requestId, decision } })
    })
  }

  async respondQuestion(bindingId: string, requestId: string, answer: unknown): Promise<void> {
    await this.resolveRequestOnce(bindingId, requestId, 'question', async (pending) => {
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
      const reply = { result: { answers } }
      await this.options.host.resolveServerRequest(pending.request.id, reply)
      this.pendingRequests.delete(requestId)
      await this.notifyServerRequestResolved(pending, reply, false)
      this.emit({ type: 'question.resolved', threadId: this.require(bindingId).binding.threadId, data: { requestId } })
    })
  }

  /**
   * Resolves a pending server request through the same manager that registered
   * it.  Product adapters may decide *what* a user chose (including their own
   * audit/grant scope), but they must not call AppServerHost directly: doing so
   * races the manager's pending-request and terminal cleanup state.
   */
  async respondServerRequest(requestId: string, reply: ServerRequestReply): Promise<void> {
    const pending = this.pendingRequests.get(requestId)
    if (!pending) throw new Error(`No pending server request ${requestId}`)
    const request = pending.request
    await this.options.host.resolveServerRequest(request.id, reply)
    this.pendingRequests.delete(requestId)
    await this.notifyServerRequestResolved(pending, reply, false)
    const session = this.require(pending.bindingId)
    const operation = {
      requestId,
      approvalId: requestId,
      method: request.method,
      ...(reply.error ? { decision: 'decline' } : {}),
    }
    this.emit({
      type: pending.kind === 'approval' ? 'approval.resolved' : 'question.resolved',
      threadId: session.binding.threadId,
      data: operation,
    })
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.unlisten?.()
    this.unlisten = null
    for (const watchdog of this.turnWatchdogs.values()) clearTimeout(watchdog.timer)
    this.turnWatchdogs.clear()
    this.upstreamRetries.clear()
    this.operationalStops.clear()
    this.operationalFailures.clear()
    this.turnEvents.clear()
    this.submissions.clear()
    for (const rows of this.waiters.values()) for (const waiter of rows) waiter.reject(new Error('Codex session manager disposed'))
    this.waiters.clear()
    this.pendingRequests.clear()
    this.requestResolutions.clear()
    this.resolvedRequests.clear()
    this.sessions.clear()
    this.sessionIdByThreadId.clear()
    this.ownerJournalByBindingId.clear()
  }

  private attachLocal(binding: ThreadBinding, context: ExecutionContext): AttachedSession {
    const existingBindingId = this.sessionIdByThreadId.get(binding.threadId)
    if (existingBindingId && existingBindingId !== binding.id) throw new Error(`Codex thread ${binding.threadId} is already attached to ${existingBindingId}`)
    const previous = this.sessions.get(binding.id)
    if (previous?.binding.threadId === binding.threadId) {
      previous.context = context
      previous.attached = true
      this.sessionIdByThreadId.set(binding.threadId, binding.id)
      return previous
    }
    if (previous && previous.binding.threadId !== binding.threadId) {
      this.sessionIdByThreadId.delete(previous.binding.threadId)
    }
    const session: AttachedSession = { binding, context, activeTurnId: '', queueTail: Promise.resolve(), attached: true, quarantinedReason: '' }
    this.sessions.set(binding.id, session)
    this.sessionIdByThreadId.set(binding.threadId, binding.id)
    return session
  }

  private requireUsable(): void {
    if (this.disposed) throw new Error('Codex session manager is disposed')
    if (this.runtimeUnavailable) throw new Error('Codex App Server is unavailable. Restart the product service to create a new owner process.')
  }

  private require(bindingId: string): AttachedSession {
    const session = this.sessions.get(bindingId)
    if (!session) throw new Error(`Codex thread binding ${bindingId} is not attached`)
    return session
  }

  private async steerSubmission(session: AttachedSession, input: TurnInput): Promise<string> {
    if (!session.activeTurnId) throw new Error('turn/steer requires an active turn')
    await this.commands.steerTurn(session.binding.threadId, session.activeTurnId, input.input)
    return session.activeTurnId
  }

  private async ensureSessionReady(session: AttachedSession): Promise<void> {
    if (session.quarantinedReason) throw new Error(session.quarantinedReason)
    if (session.attached) return
    if (this.runtimeUnavailable) throw new Error('Codex App Server is unavailable. Restart the product service to create a new owner process.')
    throw new Error(`Codex thread binding ${session.binding.id} is detached`)
  }

  private forgetTerminalEvents(threadId: string): void {
    const prefix = `${threadId}\u0000`
    for (const key of this.terminalEvents.keys()) if (key.startsWith(prefix)) this.terminalEvents.delete(key)
    for (const key of this.turnEvents.keys()) if (key.startsWith(prefix)) this.turnEvents.delete(key)
    for (const key of this.operationalFailures.keys()) if (key.startsWith(prefix)) this.operationalFailures.delete(key)
  }

  private requirePending(bindingId: string, requestId: string, kind: 'approval' | 'question') {
    const pending = this.pendingRequests.get(requestId)
    if (!pending || pending.bindingId !== bindingId || pending.kind !== kind) throw new Error(`No pending ${kind} request ${requestId}`)
    return pending
  }

  private async resolveRequestOnce(
    bindingId: string,
    requestId: string,
    kind: 'approval' | 'question',
    resolve: (pending: PendingServerRequest) => Promise<void>,
  ): Promise<void> {
    const key = `${bindingId}\u0000${kind}\u0000${requestId}`
    if (this.resolvedRequests.has(key)) return
    const inFlight = this.requestResolutions.get(key)
    if (inFlight) return inFlight
    const operation = (async () => {
      const pending = this.requirePending(bindingId, requestId, kind)
      await resolve(pending)
      this.resolvedRequests.add(key)
      if (this.resolvedRequests.size > 2_048) this.resolvedRequests.delete(this.resolvedRequests.values().next().value as string)
    })()
    this.requestResolutions.set(key, operation)
    try {
      await operation
    } finally {
      this.requestResolutions.delete(key)
    }
  }

  private eventId(method: string, threadId: string, turnId = '', itemId = ''): string {
    this.eventSequence += 1
    return `live:${String(this.eventSequence)}:${method}:${threadId}:${turnId}:${itemId}`
  }

  private emit(input: Omit<CodexEvent, 'id' | 'atIso'> & { id?: string; atIso?: string }): CodexEvent {
    // An interrupt requested by the owner after an operational response-stream
    // failure is a safety mechanism, not a user cancellation. Codex reports the
    // resulting native terminal as `interrupted`; preserve the actual failure
    // cause so products render one retryable failure instead of a misleading
    // Stopped receipt. Explicit user interrupts have no operational failure and
    // remain `turn.interrupted`.
    const operationalFailure = input.turnId
      ? this.operationalFailures.get(this.turnKey(input.threadId, input.turnId))
      : undefined
    const normalizedInput = input.type === 'turn.interrupted' && operationalFailure
      ? {
          ...input,
          id: this.eventId('owner:terminal-correction', input.threadId, input.turnId, input.itemId),
          type: 'turn.failed' as const,
          data: {
            ...input.data,
            nativeEventId: input.id ?? '',
            terminalCorrection: true,
            error: textFromError(operationalFailure.data.error)
              || textFromError(input.data.error)
              || 'Codex upstream response stream failed.',
            cause: operationalFailure.data.cause ?? 'operational_failure',
            retainOutboxForRetry: true,
            interruptedAfterOperationalFailure: true,
          },
        }
      : input
    if ((normalizedInput.type === 'turn.completed' || normalizedInput.type === 'turn.failed' || normalizedInput.type === 'turn.interrupted') && normalizedInput.turnId) {
      const existing = this.terminalEvents.get(this.turnKey(normalizedInput.threadId, normalizedInput.turnId))
      if (existing) return existing
    }
    if (normalizedInput.type === 'turn.disconnected' && normalizedInput.turnId) {
      const key = this.turnKey(normalizedInput.threadId, normalizedInput.turnId)
      const terminal = this.terminalEvents.get(key)
      if (terminal) return terminal
      const existing = this.operationalFailures.get(key)
      if (existing) return existing
    }
    const event: CodexEvent = {
      ...normalizedInput,
      id: normalizedInput.id ?? this.eventId(normalizedInput.type, normalizedInput.threadId, normalizedInput.turnId, normalizedInput.itemId),
      atIso: normalizedInput.atIso ?? this.nowIso(),
      ownerRevision: ++this.ownerRevision,
    }
    const bindingId = this.sessionIdByThreadId.get(event.threadId)
    if (bindingId) {
      const journal = this.ownerJournalByBindingId.get(bindingId) ?? []
      journal.push(event)
      if (journal.length > MAX_OWNER_JOURNAL_EVENTS) journal.splice(0, journal.length - MAX_OWNER_JOURNAL_EVENTS)
      this.ownerJournalByBindingId.set(bindingId, journal)
    }
    if (event.turnId) {
      const key = this.turnKey(event.threadId, event.turnId)
      const events = this.turnEvents.get(key) ?? []
      events.push(event)
      if (events.length > MAX_TURN_OUTCOME_EVENTS) events.splice(0, events.length - MAX_TURN_OUTCOME_EVENTS)
      this.turnEvents.set(key, events)
      if (this.turnEvents.size > 10_000) {
        const oldestKey = this.turnEvents.keys().next().value as string | undefined
        if (oldestKey) this.turnEvents.delete(oldestKey)
      }
    }
    if (event.turnId && event.type !== 'turn.completed' && event.type !== 'turn.failed' && event.type !== 'turn.interrupted') this.refreshTurnInactivity(event.threadId, event.turnId)
    if (event.type === 'turn.completed' || event.type === 'turn.failed' || event.type === 'turn.interrupted') this.finishTurn(event)
    if (event.type === 'turn.disconnected') this.finishOperationalFailure(event)
    for (const listener of this.listeners) listener(event)
    return event
  }

  private finishTurn(event: CodexEvent): void {
    if (!event.turnId) return
    const key = this.turnKey(event.threadId, event.turnId)
    if (this.terminalEvents.has(key)) return
    this.terminalEvents.set(key, event)
    if (this.terminalEvents.size > 10_000) {
      const oldestKey = this.terminalEvents.keys().next().value as string | undefined
      if (oldestKey) this.terminalEvents.delete(oldestKey)
    }
    this.operationalFailures.delete(key)
    this.upstreamRetries.delete(key)
    const bindingId = this.sessionIdByThreadId.get(event.threadId)
    const session = bindingId ? this.sessions.get(bindingId) : undefined
    if (session?.activeTurnId === event.turnId) {
      session.activeTurnId = ''
      session.quarantinedReason = ''
    }
    for (const record of this.submissions.values()) {
      if (record.threadId === event.threadId && record.turnId === event.turnId) record.state = 'terminal'
    }
    for (const [requestId, pending] of this.pendingRequests) {
      if (pending.event?.threadId === event.threadId && pending.event.turnId === event.turnId) {
        this.pendingRequests.delete(requestId)
      }
    }
    const rows = this.waiters.get(key) ?? []
    this.waiters.delete(key)
    this.clearTurnWatchdog(key)
    for (const waiter of rows) waiter.resolve(event)
  }

  private finishOperationalFailure(event: CodexEvent): void {
    if (!event.turnId) return
    const key = this.turnKey(event.threadId, event.turnId)
    if (this.terminalEvents.has(key) || this.operationalFailures.has(key)) return
    this.operationalFailures.set(key, event)
    this.upstreamRetries.delete(key)
    // App Server versions do not consistently follow a response-stream
    // failure with a native terminal notification. Request one stop, then use
    // native thread/read as the only fallback terminal authority. If native
    // state cannot prove that the Turn stopped, quarantine this conversation
    // instead of releasing its queue into a potentially overlapping Turn.
    void this.stopOperationallyFailedTurn(event)
  }

  private async stopOperationallyFailedTurn(event: CodexEvent): Promise<void> {
    if (!event.turnId) return
    return this.requestNativeStop(
      { threadId: event.threadId, turnId: event.turnId },
      textFromError(event.data.error) || 'Codex upstream response stream failed.',
    )
  }

  private requestNativeStop(handle: TurnHandle, reason: string): Promise<void> {
    const key = this.turnKey(handle.threadId, handle.turnId)
    if (this.terminalEvents.has(key)) return Promise.resolve()
    const existing = this.operationalStops.get(key)
    if (existing) return existing
    const operation = this.reconcileStoppedTurn(handle, reason).finally(() => {
      if (this.operationalStops.get(key) === operation) this.operationalStops.delete(key)
    })
    this.operationalStops.set(key, operation)
    return operation
  }

  private async reconcileStoppedTurn(handle: TurnHandle, reason: string): Promise<void> {
    const key = this.turnKey(handle.threadId, handle.turnId)
    let interruptError = ''
    try {
      await this.commands.interruptTurn(handle.threadId, handle.turnId)
    } catch (error) {
      interruptError = textFromError(error) || 'unknown error'
      this.options.onDiagnostic?.({ level: 'warning', message: `Failed to request Codex Turn interruption: ${interruptError}`, method: 'turn/interrupt' })
    }
    const attempts = Math.max(1, this.options.turnStopReconcileAttempts ?? DEFAULT_TURN_STOP_RECONCILE_ATTEMPTS)
    const delayMs = Math.max(0, this.options.turnStopReconcileDelayMs ?? DEFAULT_TURN_STOP_RECONCILE_DELAY_MS)
    let readError = ''
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (this.disposed || this.runtimeUnavailable || this.terminalEvents.has(key)) return
      try {
        const events = await this.catalog.readThread(handle.threadId)
        const terminal = [...events].reverse().find((candidate) => candidate.turnId === handle.turnId && (
          candidate.type === 'turn.completed' || candidate.type === 'turn.failed' || candidate.type === 'turn.interrupted'
        ))
        if (terminal) {
          this.emit(terminal)
          return
        }
      } catch (error) {
        readError = textFromError(error) || 'unknown error'
      }
      if (attempt + 1 < attempts && delayMs > 0) await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, delayMs)
        timer.unref?.()
      })
    }
    if (this.disposed || this.runtimeUnavailable || this.terminalEvents.has(key)) return
    const bindingId = this.sessionIdByThreadId.get(handle.threadId)
    const session = bindingId ? this.sessions.get(bindingId) : undefined
    const detail = [interruptError && `interrupt: ${interruptError}`, readError && `thread/read: ${readError}`].filter(Boolean).join('; ')
    const quarantineReason = `Codex Turn ${handle.turnId} could not be confirmed stopped. This conversation is quarantined; restart the product service before sending another command.${detail ? ` ${detail}` : ''}`
    if (session) session.quarantinedReason = quarantineReason
    this.clearTurnWatchdog(key)
    for (const waiter of this.waiters.get(key) ?? []) waiter.reject(new Error(quarantineReason))
    this.waiters.delete(key)
    const existingFailure = this.operationalFailures.get(key)
    if (existingFailure) {
      this.operationalFailures.set(key, { ...existingFailure, data: { ...existingFailure.data, error: reason, quarantined: true, quarantineReason } })
    } else {
      this.emit({ type: 'turn.disconnected', threadId: handle.threadId, turnId: handle.turnId, data: { error: reason, cause: 'stop_confirmation_timeout', quarantined: true, quarantineReason } })
    }
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
      this.emit({
        type: 'turn.disconnected',
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

  private trackUpstreamRetry(event: CodexEvent): CodexEvent | null {
    if (event.type !== 'turn.retrying' || !event.turnId) return null
    const key = this.turnKey(event.threadId, event.turnId)
    const previous = this.upstreamRetries.get(key)
    const reportedAttempt = nonNegativeInteger(event.data.retryAttempt)
    const reportedLimit = positiveInteger(event.data.retryLimit)
    const defaultLimit = positiveInteger(this.options.maxUpstreamRetryAttempts) ?? DEFAULT_MAX_UPSTREAM_RETRY_ATTEMPTS
    const limit = reportedLimit ?? previous?.limit ?? defaultLimit
    const attempts = Math.max((previous?.attempts ?? 0) + 1, reportedAttempt ?? 0)
    this.upstreamRetries.set(key, { attempts, limit })
    const data = { ...event.data, retryAttempt: attempts, retryLimit: limit }
    // `willRetry` is advisory. It must not extend an explicitly configured
    // retry budget indefinitely: some App Server versions keep reporting it
    // as true after their response stream has already become unrecoverable.
    if (attempts < limit && event.data.willRetry !== false) {
      Object.assign(event.data, data)
      return null
    }
    return {
      ...event,
      id: this.eventId('turn.disconnected:upstream-retries', event.threadId, event.turnId),
      type: 'turn.disconnected',
      data: {
        ...data,
        cause: 'upstream_response_stream_unrecoverable',
        error: `Codex 上游响应流恢复失败，未自动重发。${textFromError(event.data.error) || '重试次数已耗尽。'}`,
      },
    }
  }

  private turnKey(threadId: string, turnId: string): string { return `${threadId}\u0000${turnId}` }

  private async handleNotification(notification: RuntimeNotification): Promise<void> {
    if (notification.method === 'server/request/expired') {
      const requestId = String(asRecord(notification.params)?.id ?? '')
      if (requestId) this.pendingRequests.delete(requestId)
      return
    }
    if (notification.method === 'server/request') {
      const request = notification.params as ServerRequest
      if (typeof request?.id === 'number') await this.handleServerRequest(request)
      return
    }
    if (notification.method === 'runtime/disconnected') {
      this.runtimeUnavailable = true
      this.pendingRequests.clear()
      const error = textFromError(asRecord(notification.params)?.error ?? notification.params) || 'Codex App Server disconnected.'
      for (const session of this.sessions.values()) {
        const activeTurnId = session.activeTurnId
        const [event] = normalizeCodexNotification(notification, {
          fallbackThreadId: session.binding.threadId,
          fallbackTurnId: activeTurnId,
          eventId: ({ method, suffix, threadId, turnId, itemId }) => this.eventId(`${method}:${suffix}`, threadId, turnId, itemId),
        })
        if (event) this.emit(event)
        if (activeTurnId) {
          this.emit({
            id: this.eventId('owner:runtime-terminal', session.binding.threadId, activeTurnId),
            type: 'turn.failed',
            threadId: session.binding.threadId,
            turnId: activeTurnId,
            data: {
              error,
              cause: 'runtime_unavailable',
              retainOutboxForRetry: true,
              terminalCorrection: true,
            },
          })
          const key = this.turnKey(session.binding.threadId, activeTurnId)
          this.clearTurnWatchdog(key)
          this.upstreamRetries.delete(key)
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
      // Only App Server `error` notifications represent a concrete response
      // stream retry attempt. Generic warnings are activity updates and must
      // not consume the retry budget.
      const upstreamRetryFailure = notification.method === 'error' ? this.trackUpstreamRetry(event) : null
      if (upstreamRetryFailure) {
        this.emit(upstreamRetryFailure)
        continue
      }
      if (event.turnId && event.type !== 'turn.retrying') this.upstreamRetries.delete(this.turnKey(event.threadId, event.turnId))
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
    const isQuestion = isToolUserInputRequestMethod(request.method)
    if (!isApprovalRequestMethod(request.method) && !isQuestion) {
      const reason = `Unsupported Codex server request method: ${request.method}`
      this.options.onDiagnostic?.({ level: 'error', message: reason, method: request.method, params })
      await this.options.host.resolveServerRequest(request.id, { error: { code: -32601, message: reason } })
      return
    }
    const kind = isQuestion ? 'question' : 'approval'
    const requestId = String(request.id)
    // Register before asynchronous policy evaluation. Expiry, terminal cleanup,
    // runtime disconnect, or dispose can now invalidate this exact entry and
    // prevent a late policy result from creating a ghost approval.
    const pending: PendingServerRequest = { request, bindingId, kind, operation }
    this.pendingRequests.set(requestId, pending)
    const decision = await this.options.policy?.evaluate(operation, session.binding, session.context) ?? { action: 'ask' as const }
    if (this.pendingRequests.get(requestId) !== pending) return
    if (decision.action === 'allow') {
      const reply = decision.reply ?? { result: { decision: 'accept' } }
      await this.options.host.resolveServerRequest(request.id, reply)
      this.pendingRequests.delete(requestId)
      await this.notifyServerRequestResolved(pending, reply, true, decision)
      this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'accept', automatic: true, reason: decision.reason } })
      return
    }
    if (decision.action === 'deny') {
      const reply = decision.reply ?? { error: { code: -32000, message: decision.reason } }
      await this.options.host.resolveServerRequest(request.id, reply)
      this.pendingRequests.delete(requestId)
      await this.notifyServerRequestResolved(pending, reply, true, decision)
      this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'decline', automatic: true, reason: decision.reason } })
      return
    }
    const event = this.emit({
      type: kind === 'approval' ? 'approval.requested' : 'question.requested',
      threadId, turnId: operation.turnId, itemId: operation.itemId,
      data: { requestId, approvalId: requestId, method: request.method, params },
    })
    if (this.pendingRequests.get(requestId) === pending) pending.event = event
  }

  private async notifyServerRequestResolved(
    pending: PendingServerRequest,
    reply: ServerRequestReply,
    automatic: boolean,
    policyDecision?: PolicyDecision,
  ): Promise<void> {
    const session = this.sessions.get(pending.bindingId)
    if (!session || !this.options.policy?.onResolved) return
    try {
      await this.options.policy.onResolved({
        operation: pending.operation,
        binding: session.binding,
        context: session.context,
        request: pending.request,
        kind: pending.kind,
        reply,
        automatic,
        policyDecision,
      })
    } catch (error) {
      this.options.onDiagnostic?.({ level: 'warning', message: `Server-request resolution audit failed: ${textFromError(error)}`, method: pending.request.method, params: pending.request.params })
    }
  }
}

function contentFromInputs(input: UserInput[]): ReturnType<typeof contentFromUserItem> {
  return contentFromUserItem({ content: input })
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}
