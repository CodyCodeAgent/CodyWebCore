/** Deterministic conversation state primitives. They deliberately contain no Vue/React state. */
export * from './history-window.js'

export * from './messages.js'

import {
  formatTurnDuration,
  mergeMessages,
  upsertLiveDelta,
  areUserMessagesEquivalent,
  type ConversationMessage,
  type ConversationTool,
} from './messages.js'

export type CodexEventType =
  | 'thread.attached'
  | 'thread.context.updated'
  | 'thread.compaction.started'
  | 'thread.compacted'
  | 'turn.started'
  | 'turn.activity'
  | 'turn.retrying'
  | 'turn.disconnected'
  | 'turn.completed'
  | 'turn.failed'
  | 'turn.interrupted'
  | 'command.queued'
  | 'command.bound'
  | 'command.failed'
  | 'user.completed'
  | 'assistant.delta'
  | 'assistant.completed'
  | 'reasoning.delta'
  | 'reasoning.break'
  | 'plan.delta'
  | 'plan.replaced'
  | 'tool.started'
  | 'tool.updated'
  | 'tool.completed'
  | 'fileChange.updated'
  | 'approval.requested'
  | 'approval.resolved'
  | 'question.requested'
  | 'question.resolved'
  | 'runtime.connected'
  | 'runtime.disconnected'
  | 'provider.extension'

/** Framework- and transport-neutral event emitted by the shared Codex session manager. */
export type CodexEvent = {
  id: string
  type: CodexEventType
  threadId: string
  turnId?: string
  itemId?: string
  atIso: string
  data: Record<string, unknown>
}

export type TurnLifecycle = 'idle' | 'running' | 'retrying' | 'disconnected' | 'completed' | 'failed' | 'interrupted'

export type ConversationTurnState = {
  id: string
  lifecycle: TurnLifecycle
  startedAtIso?: string
  completedAtIso?: string
  durationMs?: number
  retryMessage?: string
  error?: string
}

export type ConversationTimelineEntry =
  | { id: string; kind: 'tool'; turnId?: string; itemId?: string; tool: ConversationTool }
  | { id: string; kind: 'reasoning'; turnId?: string; itemId?: string; text: string }

export type ConversationRequest = {
  id: string
  kind: 'approval' | 'question'
  threadId: string
  turnId?: string
  itemId?: string
  method: string
  params: unknown
  requestedAtIso: string
}

export type ConversationPlanState = {
  threadId: string
  turnId?: string
  itemId?: string
  text: string
  explanation?: string
  steps?: Array<{ step: string; status: 'pending' | 'inProgress' | 'completed' }>
  raw: unknown
  updatedAtIso: string
  revision: number
  lifecycle: 'active' | 'ended'
  possiblyStale: boolean
}

export type ConversationActivityState = {
  label: string
  details: string[]
  updatedAtIso: string
}

export type ConversationContextUsageState = {
  turnId: string
  usedTokens: number
  inputTokens: number
  contextWindow: number | null
  autoCompactTokenLimit: number | null
  compactionState: 'idle' | 'compacting' | 'compacted'
  updatedAtIso: string
}

export type ConversationConnectionState = {
  status: 'connected' | 'disconnected'
  message: string
  updatedAtIso: string
}

export type ConversationTransportConnectionState = {
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  reconnectAttempt: number
  closeCode: number | null
  closeReason: string
  updatedAtIso: string
}

export type ConversationHistoryState = {
  loading: boolean
  hasMore: boolean
  cursor: string | null
  requestRevision: number
  error: string
  loadedAtIso: string
}

export type ConversationPresentationRef = {
  id: string
  kind: 'message' | 'timeline' | 'plan' | 'request' | 'failure' | 'interrupted' | 'worked'
  turnId?: string
}

export type ConversationState = {
  threadId: string
  activeTurnId: string
  turns: Record<string, ConversationTurnState>
  messages: ConversationMessage[]
  timeline: ConversationTimelineEntry[]
  reasoningText: string
  plan: ConversationPlanState | null
  activity: ConversationActivityState | null
  contextUsage: ConversationContextUsageState | null
  pendingRequests: ConversationRequest[]
  connection: ConversationConnectionState
  /** Browser/client transport only. It never changes native Runtime or Turn state. */
  transportConnection: ConversationTransportConnectionState
  history: ConversationHistoryState
  /** Protocol order across messages, tools, plans, requests and turn receipts. */
  presentation: ConversationPresentationRef[]
  appliedEventIds: string[]
}

export type ConversationLiveOverlay = {
  activityLabel: string
  activityDetails: string[]
  reasoningText: string
  errorText: string
}

/** Assistant and plan messages that should overlay durable history. */
export function conversationOverlayMessagesFromState(state: ConversationState): ConversationMessage[] {
  const messages = state.messages
    .filter((message) => message.role === 'assistant')
    .map((message) => {
      const lifecycle = message.turnId ? state.turns[message.turnId]?.lifecycle : undefined
      const terminal = lifecycle === 'completed' || lifecycle === 'failed' || lifecycle === 'interrupted'
      return {
        ...message,
        id: message.id.replace(/^(?:live|agent):/u, ''),
        messageType: terminal ? 'agentMessage' : 'agentMessage.live',
      }
    })
  if (!state.plan?.text || state.plan.lifecycle === 'ended') return messages
  return [...messages, {
    id: state.plan.itemId || `plan:${state.plan.turnId || 'current'}:live`,
    turnId: state.plan.turnId,
    role: 'assistant',
    text: state.plan.text,
    messageType: 'plan.live',
  }]
}

/** Returns the last completed assistant response without exposing native payload shapes. */
export function latestAssistantTextFromEvents(events: readonly CodexEvent[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'assistant.completed') continue
    const text = eventText(event.data).trim()
    if (text) return text
  }
  return ''
}

/** Selects the authoritative terminal transition from one normalized event batch. */
export function latestTerminalTurnEvent(events: readonly CodexEvent[]): CodexEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'turn.completed' || event?.type === 'turn.failed' || event?.type === 'turn.interrupted') return event
  }
  return null
}

export type ConversationFeedEntry =
  | { id: string; kind: 'message'; turnId?: string; message: ConversationMessage }
  | { id: string; kind: 'timeline'; turnId?: string; entry: ConversationTimelineEntry }
  | { id: string; kind: 'plan'; turnId?: string; plan: ConversationPlanState }
  | { id: string; kind: 'request'; turnId?: string; request: ConversationRequest }
  | { id: string; kind: 'turn'; turnId: string; status: 'completed' | 'failed' | 'interrupted'; durationMs: number | null; error: string }
  | { id: string; kind: 'activity'; turnId: string; status: 'running' | 'retrying' | 'waiting' | 'disconnected'; label: string; detail: string }

const MAX_APPLIED_EVENT_IDS = 10_000

function eventText(data: Record<string, unknown>, fallback = ''): string {
  const value = data.text ?? data.error ?? data.message
  return typeof value === 'string' ? value : fallback
}

function eventTool(data: Record<string, unknown>): ConversationTool {
  const value = data.tool
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const tool = value as Partial<ConversationTool>
    return {
      kind: typeof tool.kind === 'string' ? tool.kind : 'tool',
      title: typeof tool.title === 'string' ? tool.title : 'Agent tool',
      status: typeof tool.status === 'string' ? tool.status : 'unknown',
      summary: typeof tool.summary === 'string' ? tool.summary : '',
      details: Array.isArray(tool.details) ? tool.details.filter((row): row is string => typeof row === 'string') : [],
      ...(typeof tool.output === 'string' ? { output: tool.output } : {}),
      ...(typeof tool.outputLabel === 'string' ? { outputLabel: tool.outputLabel } : {}),
    }
  }
  return { kind: 'tool', title: 'Agent tool', status: 'unknown', summary: '', details: [] }
}

function appendUniqueOutput(previous: string | undefined, incoming: string | undefined): string | undefined {
  if (!incoming) return previous
  if (!previous) return incoming
  if (previous.includes(incoming)) return previous
  return `${previous}${previous.endsWith('\n') ? '' : '\n'}${incoming}`
}

function upsertTimelineTool(
  timeline: ConversationTimelineEntry[],
  event: CodexEvent,
  phase: 'started' | 'updated' | 'completed',
): ConversationTimelineEntry[] {
  const incoming = eventTool(event.data)
  const key = toolTimelineId(event, incoming)
  const index = timeline.findIndex((entry) => entry.kind === 'tool' && entry.id === key)
  const status = incoming.status && incoming.status !== 'unknown'
    ? incoming.status
    : phase === 'started' ? 'running' : phase === 'completed' ? 'completed' : 'running'
  if (index < 0) {
    return [...timeline, { id: key, kind: 'tool', turnId: event.turnId, itemId: event.itemId, tool: { ...incoming, status } }]
  }
  const current = timeline[index]
  if (!current || current.kind !== 'tool') return timeline
  const next = [...timeline]
  next[index] = {
    ...current,
    tool: {
      ...current.tool,
      ...incoming,
      status,
      details: [...new Set([...current.tool.details, ...incoming.details])],
      output: appendUniqueOutput(current.tool.output, incoming.output),
    },
  }
  return next
}

function toolTimelineId(event: CodexEvent, tool = eventTool(event.data)): string {
  // Codex emits both item/fileChange/* and turn/diff/updated for the same turn.
  // They are two views of one operation, not two user-facing tools.
  if (tool.kind === 'fileChange' && event.turnId) return `tool:fileChange:${event.turnId}`
  return `tool:${event.itemId || event.id}`
}

function terminalizeTurnTools(
  timeline: ConversationTimelineEntry[],
  turnId: string,
  status: 'completed' | 'failed' | 'cancelled',
): ConversationTimelineEntry[] {
  let changed = false
  const next = timeline.map((entry) => {
    if (entry.kind !== 'tool' || entry.turnId !== turnId || !/run|start|pending|wait|unknown/iu.test(entry.tool.status)) return entry
    changed = true
    return { ...entry, tool: { ...entry.tool, status } }
  })
  return changed ? next : timeline
}

function settleTurnOutboxMessages(messages: ConversationMessage[], turnId: string): ConversationMessage[] {
  let changed = false
  const next = messages.map((message) => {
    if (message.role !== 'user' || message.turnId !== turnId || !message.outbox) return message
    changed = true
    const { outbox: _outbox, ...settled } = message
    return { ...settled, messageType: 'userMessage.settled' }
  })
  return changed ? next : messages
}

function failTurnOutboxMessages(messages: ConversationMessage[], turnId: string, error: string): ConversationMessage[] {
  let changed = false
  const next = messages.map((message) => {
    if (message.role !== 'user' || message.turnId !== turnId || !message.outbox) return message
    changed = true
    return {
      ...message,
      messageType: 'userMessage.outbox.failed',
      outbox: { status: 'failed' as const, lastError: error },
    }
  })
  return changed ? next : messages
}

function updateTurn(state: ConversationState, event: CodexEvent, lifecycle: TurnLifecycle): ConversationState {
  const turnId = event.turnId || state.activeTurnId
  if (!turnId) return state
  const current = state.turns[turnId]
  if ((current?.lifecycle === 'completed' || current?.lifecycle === 'failed' || current?.lifecycle === 'interrupted')
    && (lifecycle === 'completed' || lifecycle === 'failed' || lifecycle === 'interrupted')) return state
  const terminal = lifecycle === 'completed' || lifecycle === 'failed' || lifecycle === 'interrupted'
  const error = lifecycle === 'failed'
    ? eventText(event.data, 'Codex failed to complete this turn.')
    : lifecycle === 'disconnected'
      ? eventText(event.data, 'Codex upstream response stream disconnected.')
      : undefined
  const retryMessage = lifecycle === 'retrying' ? eventText(event.data, 'Reconnecting…') : undefined
  const explicitDurationMs = typeof event.data.durationMs === 'number' && Number.isFinite(event.data.durationMs)
    ? Math.max(event.data.durationMs, 0)
    : undefined
  return {
    ...state,
    activeTurnId: terminal
      ? (state.activeTurnId === turnId ? '' : state.activeTurnId)
      : turnId,
    turns: {
      ...state.turns,
      [turnId]: {
        id: turnId,
        lifecycle,
        startedAtIso: current?.startedAtIso ?? (lifecycle === 'running' ? event.atIso : undefined),
        ...(terminal ? { completedAtIso: event.atIso } : {}),
        ...(explicitDurationMs !== undefined ? { durationMs: explicitDurationMs } : {}),
        ...(retryMessage ? { retryMessage } : {}),
        ...(error ? { error } : {}),
      },
    },
  }
}

function hasTerminalTurn(state: ConversationState, event: CodexEvent): boolean {
  const turnId = event.turnId || state.activeTurnId
  const lifecycle = turnId ? state.turns[turnId]?.lifecycle : undefined
  return lifecycle === 'completed' || lifecycle === 'failed' || lifecycle === 'interrupted'
}

function endConversationPlan(plan: ConversationPlanState | null, turnId: string): ConversationPlanState | null {
  if (!plan || plan.turnId !== turnId || plan.lifecycle === 'ended') return plan
  return {
    ...plan,
    lifecycle: 'ended',
    possiblyStale: plan.steps?.some((step) => step.status !== 'completed') === true,
  }
}

export function createConversationState(threadId = ''): ConversationState {
  return {
    threadId,
    activeTurnId: '',
    turns: {},
    messages: [],
    timeline: [],
    reasoningText: '',
    plan: null,
    activity: null,
    contextUsage: null,
    pendingRequests: [],
    connection: { status: 'connected', message: '', updatedAtIso: new Date(0).toISOString() },
    transportConnection: {
      status: 'idle', reconnectAttempt: 0, closeCode: null, closeReason: '', updatedAtIso: new Date(0).toISOString(),
    },
    history: {
      loading: false,
      hasMore: false,
      cursor: null,
      requestRevision: 0,
      error: '',
      loadedAtIso: '',
    },
    presentation: [],
    appliedEventIds: [],
  }
}

function appendPresentation(
  presentation: ConversationPresentationRef[],
  ref: ConversationPresentationRef,
  replace?: (row: ConversationPresentationRef) => boolean,
): ConversationPresentationRef[] {
  const replacementIndex = replace ? presentation.findIndex(replace) : -1
  if (replacementIndex >= 0) {
    const next = [...presentation]
    next[replacementIndex] = ref
    return next.filter((row, index) => row.id !== ref.id || index === replacementIndex)
  }
  if (presentation.some((row) => row.kind === ref.kind && row.id === ref.id)) return presentation
  return [...presentation, ref]
}

/** Applies normalized live and history events through the same deterministic state transition path. */
export function reduceConversationEvent(previous: ConversationState, event: CodexEvent): ConversationState {
  if (!event.id || previous.appliedEventIds.includes(event.id)) return previous
  let state: ConversationState = {
    ...previous,
    threadId: event.threadId || previous.threadId,
    appliedEventIds: [...previous.appliedEventIds, event.id].slice(-MAX_APPLIED_EVENT_IDS),
  }

  if (event.type === 'thread.attached' || event.type === 'runtime.connected') {
    return { ...state, connection: { status: 'connected', message: '', updatedAtIso: event.atIso } }
  }
  if (event.type === 'runtime.disconnected') {
    const disconnected = state.activeTurnId
      ? updateTurn(state, { ...event, turnId: state.activeTurnId }, 'disconnected')
      : state
    return {
      ...disconnected,
      activeTurnId: '',
      activity: null,
      pendingRequests: [],
      connection: { status: 'disconnected', message: eventText(event.data), updatedAtIso: event.atIso },
    }
  }
  if (event.type === 'thread.context.updated') {
    return {
      ...state,
      contextUsage: {
        turnId: typeof event.data.turnId === 'string' ? event.data.turnId : event.turnId ?? '',
        usedTokens: typeof event.data.usedTokens === 'number' ? event.data.usedTokens : 0,
        inputTokens: typeof event.data.inputTokens === 'number' ? event.data.inputTokens : 0,
        contextWindow: typeof event.data.contextWindow === 'number' ? event.data.contextWindow : state.contextUsage?.contextWindow ?? null,
        autoCompactTokenLimit: typeof event.data.autoCompactTokenLimit === 'number' ? event.data.autoCompactTokenLimit : state.contextUsage?.autoCompactTokenLimit ?? null,
        compactionState: 'idle',
        updatedAtIso: event.atIso,
      },
    }
  }
  if (event.type === 'thread.compaction.started') {
    return {
      ...state,
      contextUsage: {
        turnId: state.contextUsage?.turnId ?? event.turnId ?? '',
        usedTokens: state.contextUsage?.usedTokens ?? 0,
        inputTokens: state.contextUsage?.inputTokens ?? 0,
        contextWindow: state.contextUsage?.contextWindow ?? null,
        autoCompactTokenLimit: state.contextUsage?.autoCompactTokenLimit ?? null,
        compactionState: 'compacting',
        updatedAtIso: event.atIso,
      },
      activity: { label: 'Compacting context', details: [], updatedAtIso: event.atIso },
    }
  }
  if (event.type === 'thread.compacted') {
    return {
      ...state,
      activeTurnId: '',
      activity: null,
      contextUsage: {
        turnId: state.contextUsage?.turnId ?? event.turnId ?? '',
        usedTokens: state.contextUsage?.usedTokens ?? 0,
        inputTokens: state.contextUsage?.inputTokens ?? 0,
        contextWindow: state.contextUsage?.contextWindow ?? null,
        autoCompactTokenLimit: state.contextUsage?.autoCompactTokenLimit ?? null,
        compactionState: 'compacted',
        updatedAtIso: event.atIso,
      },
    }
  }
  if (event.type === 'turn.activity') {
    const label = typeof event.data.label === 'string' ? event.data.label : ''
    return {
      ...state,
      activity: label ? {
        label,
        details: Array.isArray(event.data.details) ? event.data.details.filter((value): value is string => typeof value === 'string') : [],
        updatedAtIso: event.atIso,
      } : null,
    }
  }
  if (event.type === 'turn.started') return updateTurn(state, event, 'running')
  if (event.type === 'turn.retrying') return updateTurn(state, event, 'retrying')
  if (event.type === 'turn.disconnected') {
    const updated = updateTurn(state, event, 'disconnected')
    const turnId = event.turnId || state.activeTurnId
    if (!turnId) return { ...updated, activity: null }
    return {
      ...updated,
      messages: failTurnOutboxMessages(
        updated.messages,
        turnId,
        eventText(event.data, 'Codex upstream response stream disconnected.'),
      ),
      timeline: terminalizeTurnTools(updated.timeline, turnId, 'failed'),
      pendingRequests: updated.pendingRequests.filter((request) => request.turnId !== turnId),
      reasoningText: '',
      activity: null,
      plan: endConversationPlan(updated.plan, turnId),
    }
  }
  if (event.type === 'turn.completed') {
    if (hasTerminalTurn(state, event)) return state
    const updated = updateTurn(state, event, 'completed')
    const turnId = event.turnId || state.activeTurnId
    if (!turnId) return updated
    const timeline = terminalizeTurnTools(updated.timeline, turnId, 'completed')
    const presentation = event.data.durationKnown === false
      ? updated.presentation
      : appendPresentation(updated.presentation, { id: `worked:${turnId}`, kind: 'worked', turnId })
    return { ...updated, messages: settleTurnOutboxMessages(updated.messages, turnId), timeline, presentation, pendingRequests: updated.pendingRequests.filter((request) => request.turnId !== turnId), reasoningText: '', activity: null, plan: endConversationPlan(updated.plan, turnId) }
  }
  if (event.type === 'turn.failed') {
    if (hasTerminalTurn(state, event)) return state
    const turnId = event.turnId || state.activeTurnId
    const retainOutboxForRetry = event.data.retainOutboxForRetry === true
      || (turnId ? state.turns[turnId]?.lifecycle === 'disconnected' : false)
    const updated = updateTurn(state, event, 'failed')
    return turnId
      ? { ...updated, messages: retainOutboxForRetry ? failTurnOutboxMessages(updated.messages, turnId, eventText(event.data, 'Codex failed to complete this turn.')) : settleTurnOutboxMessages(updated.messages, turnId), timeline: terminalizeTurnTools(updated.timeline, turnId, 'failed'), presentation: appendPresentation(updated.presentation, { id: `failure:${turnId}`, kind: 'failure', turnId }), pendingRequests: updated.pendingRequests.filter((request) => request.turnId !== turnId), reasoningText: '', activity: null, plan: endConversationPlan(updated.plan, turnId) }
      : { ...updated, activity: null }
  }
  if (event.type === 'turn.interrupted') {
    if (hasTerminalTurn(state, event)) return state
    const turnId = event.turnId || state.activeTurnId
    const retainOutboxForRetry = turnId ? state.turns[turnId]?.lifecycle === 'disconnected' : false
    const updated = updateTurn(state, event, 'interrupted')
    return turnId
      ? { ...updated, messages: retainOutboxForRetry ? failTurnOutboxMessages(updated.messages, turnId, state.turns[turnId]?.error || 'Codex upstream response stream disconnected.') : settleTurnOutboxMessages(updated.messages, turnId), timeline: terminalizeTurnTools(updated.timeline, turnId, 'cancelled'), presentation: appendPresentation(updated.presentation, { id: `interrupted:${turnId}`, kind: 'interrupted', turnId }), pendingRequests: updated.pendingRequests.filter((request) => request.turnId !== turnId), reasoningText: '', activity: null, plan: endConversationPlan(updated.plan, turnId) }
      : { ...updated, activity: null }
  }

  if (event.type === 'command.queued') {
    const commandId = event.itemId || event.id
    const text = eventText(event.data)
    const images = Array.isArray(event.data.images) ? event.data.images.filter((value): value is string => typeof value === 'string') : []
    const skills = Array.isArray(event.data.skills)
      ? event.data.skills.filter((value): value is { name: string; path: string; displayName?: string } => {
        if (!value || typeof value !== 'object') return false
        const row = value as Record<string, unknown>
        return typeof row.name === 'string' && typeof row.path === 'string'
      })
      : []
    const message: ConversationMessage = {
      id: `user:${commandId}`,
      role: 'user',
      text,
      ...(images.length ? { images } : {}),
      ...(skills.length ? { skills } : {}),
      messageType: 'userMessage.optimistic',
      outbox: { status: 'queued' },
    }
    return {
      ...state,
      messages: mergeMessages(state.messages, [message], { preserveMissing: true }),
      presentation: appendPresentation(state.presentation, { id: message.id, kind: 'message' }),
    }
  }
  if (event.type === 'command.bound') {
    const commandId = event.itemId || ''
    if (!commandId || !event.turnId) return state
    const messageId = `user:${commandId}`
    const optimistic = state.messages.find((message) => message.id === messageId)
    const native = optimistic && state.messages.find((message) => (
      message.id !== messageId
      && message.role === 'user'
      && message.turnId === event.turnId
      && message.messageType?.startsWith('userMessage.') !== true
      && areUserMessagesEquivalent(message, optimistic)
    ))
    if (native) {
      return {
        ...state,
        messages: state.messages.filter((message) => message.id !== messageId),
        presentation: state.presentation.filter((row) => row.id !== messageId),
      }
    }
    const messages = state.messages.map((message) => message.id === messageId
      ? { ...message, turnId: event.turnId, outbox: { status: 'sending' as const } }
      : message)
    const presentation = state.presentation.map((row) => row.id === messageId
      ? { ...row, turnId: event.turnId }
      : row)
    return messages.some((message, index) => message !== state.messages[index])
      || presentation.some((row, index) => row !== state.presentation[index])
      ? { ...state, messages, presentation }
      : state
  }
  if (event.type === 'command.failed') {
    const commandId = event.itemId || ''
    if (!commandId) return state
    const messageId = `user:${commandId}`
    const error = eventText(event.data, 'Codex failed to start this command.')
    const messages = state.messages.map((message) => message.id === messageId
      ? { ...message, messageType: 'userMessage.outbox.failed', outbox: { status: 'failed' as const, lastError: error } }
      : message)
    return messages.some((message, index) => message !== state.messages[index]) ? { ...state, messages } : state
  }

  if (event.type === 'user.completed') {
    const text = eventText(event.data)
    const images = Array.isArray(event.data.images) ? event.data.images.filter((value): value is string => typeof value === 'string') : []
    const skills = Array.isArray(event.data.skills)
      ? event.data.skills.filter((value): value is { name: string; path: string; displayName?: string } => {
        if (!value || typeof value !== 'object') return false
        const row = value as Record<string, unknown>
        return typeof row.name === 'string' && typeof row.path === 'string'
      })
      : []
    const messageId = `user:${event.itemId || event.id}`
    const localOutbox = event.data.localOutbox === 'failed' ? 'failed' : event.data.localOutbox === 'queued' ? 'queued' : event.data.localOutbox === 'sending' ? 'sending' : ''
    const optimistic = event.data.optimistic === true
    const incomingMessage: ConversationMessage = {
      id: messageId,
      turnId: event.turnId,
      role: 'user',
      text,
      ...(images.length ? { images } : {}),
      ...(skills.length ? { skills } : {}),
      ...(optimistic ? { messageType: 'userMessage.optimistic', outbox: { status: localOutbox || 'sending' } } : {}),
      ...(localOutbox === 'failed' ? { messageType: 'userMessage.outbox.failed', outbox: { status: 'failed' as const, ...(typeof event.data.error === 'string' ? { lastError: event.data.error } : {}) } } : {}),
    }
    // A refresh can already contain the durable user item while an in-memory
    // optimistic journal is replayed afterwards. Do not resurrect that row.
    if (optimistic && event.turnId && state.messages.some((message) => (
      message.role === 'user'
      && message.turnId === event.turnId
      && message.messageType?.startsWith('userMessage.') !== true
      && areUserMessagesEquivalent(message, incomingMessage)
    ))) return state
    return {
      ...state,
      messages: mergeMessages(state.messages, [incomingMessage], { preserveMissing: true }),
      presentation: appendPresentation(state.presentation, { id: messageId, kind: 'message', turnId: event.turnId },
        (row) => row.kind === 'message' && row.turnId === event.turnId && row.id.startsWith('user:')),
    }
  }

  if (event.type === 'assistant.delta') {
    const messageId = `live:${event.itemId || event.turnId || event.id}`
    return {
      ...state,
      reasoningText: '',
      messages: upsertLiveDelta(state.messages, {
        messageId,
        textDelta: eventText(event.data),
        turnId: event.turnId,
        messageType: 'agentMessage.live',
      }),
      presentation: appendPresentation(state.presentation, { id: messageId, kind: 'message', turnId: event.turnId }),
    }
  }
  if (event.type === 'assistant.completed') {
    const text = eventText(event.data)
    if (!text) return state
    const messageId = `agent:${event.itemId || event.id}`
    const liveMessageId = `live:${event.itemId || event.turnId || event.id}`
    return {
      ...state,
      reasoningText: '',
      messages: mergeMessages(state.messages.filter((message) => message.id !== liveMessageId), [{
        id: messageId,
        turnId: event.turnId,
        role: 'assistant',
        text,
      }], { preserveMissing: true }),
      presentation: appendPresentation(state.presentation, { id: messageId, kind: 'message', turnId: event.turnId },
        (row) => row.kind === 'message' && row.turnId === event.turnId && row.id.startsWith('live:')),
    }
  }
  if (event.type === 'reasoning.delta') {
    const delta = eventText(event.data)
    const itemId = event.itemId || event.id
    const index = state.timeline.findIndex((entry) => entry.kind === 'reasoning' && entry.itemId === itemId)
    const timeline = [...state.timeline]
    if (index < 0) timeline.push({ id: `reasoning:${itemId}`, kind: 'reasoning', turnId: event.turnId, itemId, text: delta })
    else {
      const current = timeline[index]
      if (current?.kind === 'reasoning') timeline[index] = { ...current, text: `${current.text}${delta}` }
    }
    return {
      ...state,
      reasoningText: `${state.reasoningText}${delta}`,
      timeline,
      presentation: appendPresentation(state.presentation, { id: `reasoning:${itemId}`, kind: 'timeline', turnId: event.turnId }),
    }
  }
  if (event.type === 'reasoning.break') {
    return state.reasoningText && !state.reasoningText.endsWith('\n\n')
      ? { ...state, reasoningText: `${state.reasoningText}\n\n` }
      : state
  }
  if (event.type === 'plan.delta' || event.type === 'plan.replaced') {
    const text = eventText(event.data)
    const planId = `plan:${event.turnId || 'current'}`
    const currentPlan = state.plan && state.plan.turnId === event.turnId ? state.plan : null
    const previousRevision = currentPlan?.revision ?? 0
    const revision = event.type === 'plan.replaced' ? previousRevision + 1 : previousRevision
    return {
      ...state,
      reasoningText: '',
      plan: {
        threadId: event.threadId,
        turnId: event.turnId,
        itemId: event.itemId || currentPlan?.itemId,
        text: event.type === 'plan.delta' ? `${state.plan?.text ?? ''}${text}` : text,
        ...(typeof event.data.explanation === 'string' ? { explanation: event.data.explanation } : {}),
        ...(Array.isArray(event.data.steps) ? { steps: event.data.steps as ConversationPlanState['steps'] } : {}),
        raw: event.data.raw ?? event.data,
        updatedAtIso: event.atIso,
        revision,
        lifecycle: 'active',
        possiblyStale: false,
      },
      presentation: appendPresentation(state.presentation, { id: planId, kind: 'plan', turnId: event.turnId },
        (row) => row.kind === 'plan' && row.turnId === event.turnId),
    }
  }
  if (event.type === 'tool.started' || event.type === 'tool.updated' || event.type === 'fileChange.updated' || event.type === 'tool.completed') {
    const phase = event.type === 'tool.started' ? 'started' : event.type === 'tool.completed' ? 'completed' : 'updated'
    const toolId = toolTimelineId(event)
    return {
      ...state,
      timeline: upsertTimelineTool(state.timeline, event, phase),
      presentation: appendPresentation(state.presentation, { id: toolId, kind: 'timeline', turnId: event.turnId }),
    }
  }

  if (event.type === 'approval.requested' || event.type === 'question.requested') {
    const id = String(event.data.requestId ?? event.data.approvalId ?? event.id)
    if (state.pendingRequests.some((request) => request.id === id)) return state
    return {
      ...state,
      pendingRequests: [...state.pendingRequests, {
        id,
        kind: event.type === 'approval.requested' ? 'approval' : 'question',
        threadId: event.threadId,
        turnId: event.turnId,
        itemId: event.itemId,
        method: typeof event.data.method === 'string' ? event.data.method : '',
        params: event.data.params ?? event.data,
        requestedAtIso: event.atIso,
      }],
      presentation: appendPresentation(state.presentation, { id: `request:${id}`, kind: 'request', turnId: event.turnId }),
    }
  }
  if (event.type === 'approval.resolved' || event.type === 'question.resolved') {
    const id = String(event.data.requestId ?? event.data.approvalId ?? '')
    return id ? { ...state, pendingRequests: state.pendingRequests.filter((request) => request.id !== id) } : state
  }
  return state
}

export function reduceConversationEvents(initial: ConversationState, events: readonly CodexEvent[]): ConversationState {
  return events.reduce(reduceConversationEvent, initial)
}

export type ConversationStateRegistry = Readonly<Record<string, ConversationState>>

/**
 * Reduces a mixed stream for any number of threads while preserving referential
 * identity for every untouched thread. Products can keep one shared App Server
 * subscription without rebuilding per-thread reducers.
 */
export function reduceConversationRegistryEvents(
  previous: ConversationStateRegistry,
  events: readonly CodexEvent[],
): ConversationStateRegistry {
  if (events.length === 0) return previous
  let next: Record<string, ConversationState> | null = null
  for (const event of events) {
    if (!event.threadId) continue
    const currentRegistry = next ?? previous
    const current = currentRegistry[event.threadId] ?? createConversationState(event.threadId)
    const updated = reduceConversationEvent(current, event)
    if (updated === current) continue
    if (!next) next = { ...previous }
    next[event.threadId] = updated
  }
  return next ?? previous
}

export function conversationStateFromRegistry(
  registry: ConversationStateRegistry,
  threadId: string,
): ConversationState {
  return registry[threadId] ?? createConversationState(threadId)
}

export function conversationLiveOverlayFromState(state: ConversationState): ConversationLiveOverlay | null {
  const latestTurn = Object.values(state.turns).at(-1)
  const errorText = latestTurn?.lifecycle === 'failed' || latestTurn?.lifecycle === 'disconnected'
    ? latestTurn.error ?? ''
    : ''
  const reasoningText = state.reasoningText.trim()
  if (!state.activity && !reasoningText && !errorText) return null
  return {
    activityLabel: state.activity?.label || 'Thinking',
    activityDetails: state.activity?.details ?? [],
    reasoningText,
    errorText,
  }
}

export function pruneConversationStateRegistry(
  registry: ConversationStateRegistry,
  activeThreadIds: ReadonlySet<string>,
): ConversationStateRegistry {
  const entries = Object.entries(registry).filter(([threadId]) => activeThreadIds.has(threadId))
  if (entries.length === Object.keys(registry).length) return registry
  return Object.fromEntries(entries)
}

/**
 * Selects one protocol-ordered, framework-neutral feed from reducer state.
 * Renderers may group or localize entries, but must not rebuild ordering or
 * terminal/activity semantics independently.
 */
export function conversationFeedFromState(state: ConversationState): ConversationFeedEntry[] {
  const feed: ConversationFeedEntry[] = []
  const seen = new Set<string>()
  const messages = new Map(state.messages.map((message) => [message.id, message]))
  const timeline = new Map(state.timeline.map((entry) => [entry.id, entry]))

  const turnHasVisibleContent = (turnId: string): boolean => (
    state.messages.some((message) => message.turnId === turnId)
    || state.timeline.some((entry) => entry.turnId === turnId)
    || Boolean(state.plan?.turnId === turnId && state.plan.text.trim())
    || state.pendingRequests.some((request) => request.turnId === turnId)
  )

  const appendTurn = (id: string, turnId: string, status: 'completed' | 'failed' | 'interrupted'): void => {
    const turn = state.turns[turnId]
    if (!turn) return
    // Codex can acknowledge a Turn and then abort before materializing any
    // user, assistant, plan, request, reasoning, or tool item. Keep that Turn
    // in reducer state for diagnostics, but do not render an orphaned
    // "Stopped" receipt in the conversation transcript.
    if (status === 'interrupted' && !turnHasVisibleContent(turnId)) return
    const durationMs = turn.durationMs ?? (turn.startedAtIso && turn.completedAtIso
      ? Math.max(Date.parse(turn.completedAtIso) - Date.parse(turn.startedAtIso), 0)
      : null)
    feed.push({ id, kind: 'turn', turnId, status, durationMs, error: turn.error ?? '' })
    seen.add(id)
  }

  for (const ref of state.presentation) {
    if (ref.kind === 'message') {
      const message = messages.get(ref.id)
      if (message) { feed.push({ id: ref.id, kind: 'message', turnId: ref.turnId, message }); seen.add(ref.id) }
      continue
    }
    if (ref.kind === 'timeline') {
      const entry = timeline.get(ref.id)
      if (entry) { feed.push({ id: ref.id, kind: 'timeline', turnId: ref.turnId, entry }); seen.add(ref.id) }
      continue
    }
    if (ref.kind === 'plan') {
      if (state.plan?.text && (!ref.turnId || ref.turnId === state.plan.turnId)) {
        feed.push({ id: ref.id, kind: 'plan', turnId: ref.turnId, plan: state.plan })
        seen.add(ref.id)
      }
      continue
    }
    if (ref.kind === 'request') {
      const request = state.pendingRequests.find((row) => `request:${row.id}` === ref.id)
      if (request) { feed.push({ id: ref.id, kind: 'request', turnId: ref.turnId, request }); seen.add(ref.id) }
      continue
    }
    if (ref.turnId && ref.kind === 'worked') appendTurn(ref.id, ref.turnId, 'completed')
    else if (ref.turnId && ref.kind === 'failure') appendTurn(ref.id, ref.turnId, 'failed')
    else if (ref.turnId && ref.kind === 'interrupted') appendTurn(ref.id, ref.turnId, 'interrupted')
  }

  for (const message of state.messages) {
    if (!seen.has(message.id)) feed.push({ id: message.id, kind: 'message', turnId: message.turnId, message })
  }
  for (const entry of state.timeline) {
    if (!seen.has(entry.id)) feed.push({ id: entry.id, kind: 'timeline', turnId: entry.turnId, entry })
  }
  const planId = `plan:${state.plan?.turnId || 'current'}`
  if (state.plan?.text && !seen.has(planId)) feed.push({ id: planId, kind: 'plan', turnId: state.plan.turnId, plan: state.plan })
  for (const request of state.pendingRequests) {
    const requestId = `request:${request.id}`
    if (!seen.has(requestId)) feed.push({ id: requestId, kind: 'request', turnId: request.turnId, request })
  }
  for (const turn of Object.values(state.turns)) {
    if (turn.lifecycle === 'failed' && !seen.has(`failure:${turn.id}`)) appendTurn(`failure:${turn.id}`, turn.id, 'failed')
    if (turn.lifecycle === 'interrupted' && !seen.has(`interrupted:${turn.id}`)) appendTurn(`interrupted:${turn.id}`, turn.id, 'interrupted')
  }

  const activeTurn = state.activeTurnId ? state.turns[state.activeTurnId] : undefined
  if (activeTurn) {
    const pendingRequest = state.pendingRequests.find((request) => !request.turnId || request.turnId === activeTurn.id)
    if (pendingRequest) {
      feed.push({
        id: `activity:${activeTurn.id}`, kind: 'activity', turnId: activeTurn.id, status: 'waiting',
        label: pendingRequest.kind === 'approval' ? 'Waiting for approval' : 'Waiting for answer',
        detail: 'Codex will continue after this request is resolved.',
      })
    } else if (activeTurn.lifecycle === 'retrying') {
      feed.push({
        id: `activity:${activeTurn.id}`, kind: 'activity', turnId: activeTurn.id, status: 'retrying',
        label: activeTurn.retryMessage || 'Codex is reconnecting',
        detail: state.connection.status === 'disconnected' ? 'Connection interrupted; waiting to recover.' : 'Restoring this response.',
      })
    } else if (activeTurn.lifecycle === 'disconnected') {
      feed.push({
        id: `activity:${activeTurn.id}`, kind: 'activity', turnId: activeTurn.id, status: 'disconnected',
        label: activeTurn.error || 'Codex upstream response stream disconnected',
        detail: 'The command was not resent. Stop this Turn before retrying the message.',
      })
    } else if (activeTurn.lifecycle === 'running') {
      feed.push({
        id: `activity:${activeTurn.id}`, kind: 'activity', turnId: activeTurn.id, status: 'running',
        label: state.activity?.label || 'Codex is working',
        detail: state.connection.status === 'connected' ? 'Live updates active.' : 'Waiting to restore the connection.',
      })
    }
  }
  return orderConversationFeedByTurn(state, feed)
}

/**
 * Protocol events for a queued follow-up can arrive before the active Turn's
 * later assistant/tool/terminal events. The presentation log records that
 * arrival order for identity reconciliation, but the transcript must keep a
 * Turn contiguous. Turn insertion order comes from normalized turn.started
 * history; truly unscoped rows retain their nearest preceding Turn, while
 * unbound optimistic commands remain at the end until command.bound assigns
 * their native Turn.
 */
function orderConversationFeedByTurn(
  state: ConversationState,
  feed: ConversationFeedEntry[],
): ConversationFeedEntry[] {
  const turnIds = Object.keys(state.turns)
  if (turnIds.length === 0) return feed

  const leading: ConversationFeedEntry[] = []
  const pending: ConversationFeedEntry[] = []
  const byTurn = new Map(turnIds.map((turnId) => [turnId, [] as ConversationFeedEntry[]]))
  let nearestTurnId = ''

  for (const item of feed) {
    const itemTurnId = item.turnId
      || (item.kind === 'message' ? item.message.turnId ?? '' : '')
    if (itemTurnId) {
      const bucket = byTurn.get(itemTurnId) ?? []
      bucket.push({ ...item, turnId: itemTurnId })
      byTurn.set(itemTurnId, bucket)
      nearestTurnId = itemTurnId
      continue
    }

    if (
      item.kind === 'message'
      && item.message.role === 'user'
      && Boolean(item.message.outbox)
    ) {
      pending.push(item)
      continue
    }

    if (nearestTurnId) byTurn.get(nearestTurnId)?.push(item)
    else leading.push(item)
  }

  const ordered = [
    ...leading,
    ...turnIds.flatMap((turnId) => byTurn.get(turnId) ?? []),
    ...[...byTurn.entries()]
      .filter(([turnId]) => !state.turns[turnId])
      .flatMap(([, items]) => items),
    ...pending,
  ]
  return ordered.every((item, index) => item === feed[index]) ? feed : ordered
}

/**
 * Flattens the shared feed into a transport-friendly transcript. Interactive
 * requests and transient activity stay in their typed state channels.
 */
export function conversationTranscriptFromState(state: ConversationState): ConversationMessage[] {
  return conversationFeedFromState(state).flatMap((item): ConversationMessage[] => {
    if (item.kind === 'message') return [item.message]
    if (item.kind === 'timeline') {
      if (item.entry.kind === 'reasoning') return [{
        id: item.id, turnId: item.turnId, role: 'system', text: item.entry.text, messageType: 'reasoning',
      }]
      return [{
        id: item.id, turnId: item.turnId, role: 'system', text: '',
        messageType: `tool.${item.entry.tool.kind}`, tool: item.entry.tool,
      }]
    }
    if (item.kind === 'plan') return [{
      id: item.id, turnId: item.turnId, role: 'assistant', text: item.plan.text, messageType: 'plan',
    }]
    if (item.kind !== 'turn') return []
    if (item.status === 'failed') return [{
      id: item.id, turnId: item.turnId, role: 'system', text: item.error || 'Codex failed to complete this turn.', messageType: 'turn.failed',
    }]
    if (item.status === 'interrupted') return [{
      id: item.id, turnId: item.turnId, role: 'system', text: 'Stopped', messageType: 'turn.interrupted',
    }]
    if (item.durationMs === null) return []
    return [{
      id: item.id, turnId: item.turnId, role: 'system',
      text: `Worked for ${formatTurnDuration(item.durationMs)}`, messageType: 'worked',
    }]
  })
}
