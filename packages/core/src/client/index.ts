import {
  createConversationState,
  reduceConversationEvent,
  reduceConversationEvents,
  type CodexEvent,
  type ConversationState,
} from '../conversation/index.js'

export type ConversationSubscriptionEvent =
  | { type: 'event'; event: CodexEvent }
  | { type: 'connected'; atIso?: string }
  | { type: 'disconnected'; error?: string; atIso?: string; reconnectAttempt?: number; retryInMs?: number | null; closeCode?: number | null; closeReason?: string }

export interface ConversationTransport {
  /** Registers the native thread with the process-wide owner. This is
   * idempotent and must never create a second App Server process. */
  attach?(threadId: string): Promise<void>
  read(threadId: string): Promise<CodexEvent[]>
  subscribe(threadId: string, listener: (event: ConversationSubscriptionEvent) => void): () => void
  /** Accepts a command into the process-wide SessionManager. Native binding and
   * terminal state return through subscribe(); this call only acknowledges
   * durable command admission. */
  submit?(command: ConversationCommand): Promise<{ clientCommandId: string }>
}

export type ConversationCommand = {
  threadId: string
  clientCommandId: string
  mode: 'queue' | 'steer'
  input: unknown
  context?: unknown
}

export type ConversationOptimisticMessage = {
  id: string
  text: string
  images?: string[]
  skills?: Array<{ name: string; path: string; displayName?: string }>
}

export type ConversationController = {
  getState(): ConversationState
  subscribe(listener: (state: ConversationState) => void): () => void
  /**
   * Adds a local user row before the transport has acknowledged turn/start.
   * The row is reconciled with the native user item rather than appended again.
   */
  enqueueUserMessage(input: ConversationOptimisticMessage): void
  /** The single browser command entrypoint: optimistic projection first,
   * process-owner admission second, and an explicit failed outbox on transport
   * rejection. Products must not coordinate turn/start themselves. */
  submitUserMessage(input: ConversationOptimisticMessage, command: Omit<ConversationCommand, 'threadId' | 'clientCommandId'>): Promise<{ clientCommandId: string }>
  bindQueuedUserMessage(id: string, turnId: string): void
  failQueuedUserMessage(id: string, error: string): void
  discardQueuedUserMessage(id: string): void
  /** Applies a product-originated normalized event without creating a second message store. */
  ingestEvent(event: CodexEvent): void
  start(): Promise<void>
  refresh(): Promise<void>
  dispose(): void
}

/**
 * Browser-neutral controller used by both products. Native history is authoritative;
 * realtime events are overlays and every reconnect is reconciled through read().
 */
export function createConversationController(threadId: string, transport: ConversationTransport): ConversationController {
  let state = createConversationState(threadId)
  let readRevision = 0
  let unsubscribeTransport: (() => void) | null = null
  let started = false
  let initialReadSettled = false
  let initialReadPromise: Promise<void> | null = null
  let realtimeEventRevision = 0
  let realtimeJournal: Array<{ revision: number; event: CodexEvent }> = []
  let localOutboxJournal: CodexEvent[] = []
  const listeners = new Set<(value: ConversationState) => void>()
  const MAX_REALTIME_JOURNAL_EVENTS = 10_000

  const publish = (next: ConversationState): void => {
    if (next === state) return
    state = next
    for (const listener of listeners) listener(state)
  }

  const queuedMessageId = (id: string): string => `user:${id}`
  const pruneSettledOutbox = (next: ConversationState): void => {
    const visibleIds = new Set(next.messages.map((message) => message.id))
    localOutboxJournal = localOutboxJournal.filter((event) => visibleIds.has(queuedMessageId(event.itemId || event.id)))
  }

  const applyRealtimeEvent = (event: CodexEvent): void => {
    if (!event.id || event.threadId !== threadId) return
    const commandId = typeof event.data.clientCommandId === 'string'
      ? event.data.clientCommandId
      : event.itemId
    if (event.type === 'command.bound' && commandId && event.turnId) {
      localOutboxJournal = localOutboxJournal.map((row) => (
        row.itemId === commandId ? { ...row, turnId: event.turnId } : row
      ))
    }
    if (event.type === 'command.failed' && commandId) {
      localOutboxJournal = localOutboxJournal.map((row) => row.itemId === commandId ? {
        ...row,
        id: `local-outbox-failed:${commandId}:${Date.now().toString(36)}`,
        atIso: event.atIso,
        data: { ...row.data, optimistic: false, localOutbox: 'failed', error: event.data.error },
      } : row)
    }
    realtimeEventRevision += 1
    realtimeJournal = [
      ...realtimeJournal,
      { revision: realtimeEventRevision, event },
    ].slice(-MAX_REALTIME_JOURNAL_EVENTS)
    const next = reduceConversationEvent(state, event)
    pruneSettledOutbox(next)
    publish(next)
  }

  const refresh = async (realtimeBaseline = realtimeEventRevision): Promise<void> => {
    const revision = ++readRevision
    const realtimeRevisionAtStart = realtimeBaseline
    publish({ ...state, history: { ...state.history, loading: true, requestRevision: revision, error: '' } })
    try {
      const events = await transport.read(threadId)
      if (revision !== readRevision) return
      // Native history is authoritative, but events arriving after this read
      // started may not have reached its snapshot yet. Replay only that suffix;
      // older live overlays are intentionally replaced by native history.
      const snapshot = reduceConversationEvents(
        reduceConversationEvents(createConversationState(threadId), events),
        realtimeJournal
          .filter((entry) => entry.revision > realtimeRevisionAtStart)
          .map((entry) => entry.event),
      )
      const reconciled = reduceConversationEvents(snapshot, localOutboxJournal)
      pruneSettledOutbox(reconciled)
      // A native snapshot can still contain the last in-flight approval after
      // the transport has disconnected. Connection state is newer authority
      // for interactive requests: do not resurrect controls that cannot be
      // resolved until the owner reconnects and performs another native read.
      const connectionReconciled = state.connection.status === 'disconnected'
        ? { ...reconciled, activeTurnId: '', activity: null, pendingRequests: [] }
        : reconciled
      publish({
        ...connectionReconciled,
        connection: state.connection,
        history: {
          ...connectionReconciled.history,
          loading: false,
          requestRevision: revision,
          error: '',
          loadedAtIso: new Date().toISOString(),
        },
      })
    } catch (error) {
      if (revision !== readRevision) return
      publish({
        ...state,
        history: {
          ...state.history,
          loading: false,
          requestRevision: revision,
          error: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    }
  }

  const start = (): Promise<void> => {
    if (started && initialReadPromise) return initialReadPromise
    if (started) return Promise.resolve()
    started = true
    if (!unsubscribeTransport) {
      unsubscribeTransport = transport.subscribe(threadId, (value) => {
        if (value.type === 'event') {
          applyRealtimeEvent(value.event)
          return
        }
        if (value.type === 'connected') {
          publish({
            ...state,
            transportConnection: {
              status: 'connected', reconnectAttempt: 0, closeCode: null, closeReason: '',
              updatedAtIso: value.atIso ?? new Date().toISOString(),
            },
          })
          if (initialReadSettled) void refresh().catch(() => undefined)
          return
        }
        publish({
          ...state,
          transportConnection: {
            status: 'reconnecting',
            reconnectAttempt: value.reconnectAttempt ?? state.transportConnection.reconnectAttempt + 1,
            closeCode: value.closeCode ?? null,
            closeReason: value.closeReason ?? value.error ?? '',
            updatedAtIso: value.atIso ?? new Date().toISOString(),
          },
        })
      })
    }
    // Initial history is enrichment, not a prerequisite for realtime use. The
    // error remains visible in state while the live subscription stays usable.
    // Explicit refresh() calls still reject so retry controls can report failure.
    // A controller may be created by a global realtime event before the user
    // selects/starts that thread. The first native read must replay the entire
    // journal, otherwise that pre-start event disappears when the empty (or
    // slightly stale) native snapshot replaces the current projection.
    // Subsequent refreshes still use a current revision baseline and therefore
    // replace old overlays with native history as intended.
    const initialRealtimeBaseline = 0
    initialReadPromise = (transport.attach
      ? transport.attach(threadId).then(() => refresh(initialRealtimeBaseline))
      : refresh(initialRealtimeBaseline))
      .catch((error) => {
        if (!state.history.error) {
          publish({
            ...state,
            history: {
              ...state.history,
              loading: false,
              error: error instanceof Error ? error.message : String(error),
            },
          })
        }
      })
      .finally(() => {
        initialReadSettled = true
        initialReadPromise = null
      })
    return initialReadPromise
  }

  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    enqueueUserMessage(input) {
      if (!input.id || !input.text.trim()) return
      const event: CodexEvent = {
        id: `local-outbox:${input.id}`,
        type: 'user.completed',
        threadId,
        itemId: input.id,
        atIso: new Date().toISOString(),
        data: {
          text: input.text,
          ...(input.images?.length ? { images: input.images } : {}),
          ...(input.skills?.length ? { skills: input.skills } : {}),
          optimistic: true,
          localOutbox: 'sending',
        },
      }
      localOutboxJournal = [...localOutboxJournal.filter((row) => row.itemId !== input.id), event]
      publish(reduceConversationEvent(state, event))
    },
    async submitUserMessage(input, command) {
      if (!transport.submit) throw new Error('Conversation transport does not support command submission.')
      if (!input.id || !input.text.trim()) throw new Error('Conversation command requires a non-empty user message.')
      this.enqueueUserMessage(input)
      try {
        return await transport.submit({
          ...command,
          threadId,
          clientCommandId: input.id,
        })
      } catch (error) {
        this.failQueuedUserMessage(input.id, error instanceof Error ? error.message : String(error))
        throw error
      }
    },
    bindQueuedUserMessage(id, turnId) {
      if (!id || !turnId) return
      localOutboxJournal = localOutboxJournal.map((event) => event.itemId === id ? { ...event, turnId } : event)
      publish(reduceConversationEvent(state, {
        id: `local-command-bound:${id}:${turnId}`,
        type: 'command.bound',
        threadId,
        turnId,
        itemId: id,
        atIso: new Date().toISOString(),
        data: { clientCommandId: id },
      }))
    },
    failQueuedUserMessage(id, error) {
      if (!id) return
      const current = localOutboxJournal.find((event) => event.itemId === id)
      if (!current) return
      const failed: CodexEvent = {
        ...current,
        id: `local-outbox-failed:${id}:${Date.now().toString(36)}`,
        atIso: new Date().toISOString(),
        data: { ...current.data, optimistic: false, localOutbox: 'failed', error },
      }
      localOutboxJournal = localOutboxJournal.map((event) => event.itemId === id ? failed : event)
      publish(reduceConversationEvent(state, failed))
    },
    discardQueuedUserMessage(id) {
      if (!id) return
      localOutboxJournal = localOutboxJournal.filter((event) => event.itemId !== id)
      const messageId = queuedMessageId(id)
      if (!state.messages.some((message) => message.id === messageId)) return
      publish({
        ...state,
        messages: state.messages.filter((message) => message.id !== messageId),
        presentation: state.presentation.filter((row) => row.id !== messageId),
      })
    },
    ingestEvent(event) {
      applyRealtimeEvent(event)
    },
    start,
    refresh,
    dispose() {
      readRevision += 1
      started = false
      initialReadSettled = false
      initialReadPromise = null
      realtimeJournal = []
      localOutboxJournal = []
      realtimeEventRevision = 0
      unsubscribeTransport?.()
      unsubscribeTransport = null
      listeners.clear()
    },
  }
}

export type ReconnectingSocket = {
  close(): void
}

export type ReconnectingSocketOptions = {
  url: string | (() => string)
  parse(data: unknown): ConversationSubscriptionEvent | null
  listener: (event: ConversationSubscriptionEvent) => void
  createSocket?: (url: string) => WebSocket
  minDelayMs?: number
  maxDelayMs?: number
  /** Optional application heartbeat. This detects half-open browser sockets
   * without polling an unrelated HTTP health endpoint. */
  heartbeatIntervalMs?: number
  heartbeatTimeoutMs?: number
  heartbeatPayload?: string
}

/** Small shared WebSocket lifecycle with bounded exponential reconnect. */
export function createReconnectingConversationSocket(options: ReconnectingSocketOptions): ReconnectingSocket {
  const createSocket = options.createSocket ?? ((url) => new WebSocket(url))
  const minDelay = Math.max(100, options.minDelayMs ?? 500)
  const maxDelay = Math.max(minDelay, options.maxDelayMs ?? 10_000)
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let delay = minDelay
  let closed = false
  let reconnectAttempt = 0
  let openedAt = 0
  let lastActivityAt = 0
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const clearHeartbeat = (): void => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  const startHeartbeat = (current: WebSocket): void => {
    clearHeartbeat()
    const interval = Math.max(1_000, options.heartbeatIntervalMs ?? 20_000)
    const timeout = Math.max(interval * 2, options.heartbeatTimeoutMs ?? 45_000)
    lastActivityAt = Date.now()
    heartbeatTimer = setInterval(() => {
      if (closed || socket !== current) return
      if (Date.now() - lastActivityAt > timeout) {
        current.close(4000, 'heartbeat timeout')
        return
      }
      if (current.readyState === 1) current.send(options.heartbeatPayload ?? JSON.stringify({ type: 'ping' }))
    }, interval)
  }

  const connect = (): void => {
    if (closed) return
    openedAt = 0
    socket = createSocket(typeof options.url === 'function' ? options.url() : options.url)
    const current = socket
    current.addEventListener('open', () => {
      openedAt = Date.now()
      lastActivityAt = openedAt
      startHeartbeat(current)
      options.listener({ type: 'connected', atIso: new Date().toISOString() })
    })
    current.addEventListener('message', (event) => {
      lastActivityAt = Date.now()
      const parsed = options.parse(event.data)
      if (parsed) options.listener(parsed)
    })
    current.addEventListener('error', () => current.close())
    current.addEventListener('close', (event) => {
      if (socket !== current) return
      clearHeartbeat()
      socket = null
      if (closed || reconnectTimer) return
      if (openedAt > 0 && Date.now() - openedAt >= 30_000) {
        delay = minDelay
        reconnectAttempt = 0
      }
      reconnectAttempt += 1
      const wait = delay
      delay = Math.min(maxDelay, Math.round(delay * 1.6))
      options.listener({
        type: 'disconnected', atIso: new Date().toISOString(),
        reconnectAttempt,
        retryInMs: wait,
        closeCode: typeof event.code === 'number' ? event.code : null,
        closeReason: typeof event.reason === 'string' ? event.reason : '',
      })
      reconnectTimer = setTimeout(() => { reconnectTimer = null; connect() }, wait)
    })
  }
  connect()

  return {
    close() {
      closed = true
      clearHeartbeat()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = null
      socket?.close()
      socket = null
    },
  }
}
