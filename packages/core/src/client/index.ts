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

export type ConversationAttachment = {
  /** Current owner state that is not guaranteed to exist in native history
   * yet (for example, a Turn that is still running). */
  events: CodexEvent[]
}

export interface ConversationTransport {
  /** Registers the native thread with the process-wide owner. This is
   * idempotent and must never create a second App Server process. */
  attach?(threadId: string): Promise<ConversationAttachment | void>
  read(threadId: string): Promise<CodexEvent[]>
  subscribe(threadId: string, listener: (event: ConversationSubscriptionEvent) => void): () => void
  /** Accepts a command into the process-wide SessionManager. Native binding and
   * terminal state return through subscribe(); this call only acknowledges
   * durable command admission. */
  submit?(command: ConversationCommand): Promise<{ clientCommandId: string }>
  /** Requests interruption through the process-wide owner. The owner, not a
   * browser product, decides the authoritative terminal transition. */
  interrupt?(threadId: string): Promise<void>
}

export type ConversationCommand = {
  threadId: string
  clientCommandId: string
  mode: 'queue' | 'steer'
  input: unknown
  context?: unknown
}

export type ConversationOptimisticMessage = {
  text: string
  images?: string[]
  skills?: Array<{ name: string; path: string; displayName?: string }>
}

export type ConversationControllerOptions = {
  /** Test hook only. Product code must never manufacture command ids. */
  createClientCommandId?: () => string
}

export type ConversationController = {
  getState(): ConversationState
  subscribe(listener: (state: ConversationState) => void): () => void
  /** The single browser command entrypoint: optimistic projection first,
   * process-owner admission second, and an explicit failed outbox on transport
   * rejection. Products must not coordinate turn/start themselves. */
  submitUserMessage(input: ConversationOptimisticMessage, command: Omit<ConversationCommand, 'threadId' | 'clientCommandId'>): Promise<{ clientCommandId: string }>
  /** Replays one explicitly failed local command as a new command. */
  retryFailedUserMessage(messageId: string, command: Omit<ConversationCommand, 'threadId' | 'clientCommandId'>): Promise<{ clientCommandId: string }>
  /** Removes a pre-admission failed command. Native history is never touched. */
  discardFailedUserMessage(messageId: string): void
  /** Delegates an interrupt intent to the process-wide owner. */
  interrupt(): Promise<void>
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
export function createConversationController(
  threadId: string,
  transport: ConversationTransport,
  options: ConversationControllerOptions = {},
): ConversationController {
  let state = createConversationState(threadId)
  let readRevision = 0
  let unsubscribeTransport: (() => void) | null = null
  let started = false
  let initialReadSettled = false
  let initialReadPromise: Promise<void> | null = null
  let realtimeEventRevision = 0
  let realtimeJournal: Array<{ revision: number; event: CodexEvent }> = []
  let localOutboxJournal: CodexEvent[] = []
  const admittedCommandIds = new Set<string>()
  const listeners = new Set<(value: ConversationState) => void>()
  const MAX_REALTIME_JOURNAL_EVENTS = 10_000
  let generatedCommandSequence = 0

  const nextClientCommandId = (): string => {
    generatedCommandSequence += 1
    const random = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    return options.createClientCommandId?.() || `command:${threadId}:${random}:${String(generatedCommandSequence)}`
  }

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
    if ((event.type === 'command.queued' || event.type === 'command.bound') && commandId) {
      admittedCommandIds.add(commandId)
    }
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
      // Native history is durable, but it can lag the process owner while a
      // command is queued or a Turn is still running. Re-read the owner's
      // volatile attachment snapshot for every reconciliation instead of
      // assuming that an earlier attachment has already reached thread/read.
      // This keeps refresh/reconnect and multi-tab projections on the same
      // authoritative command order without a browser-side durable outbox.
      const attachment = transport.attach ? await transport.attach(threadId) : undefined
      if (revision !== readRevision) return
      // Native history is authoritative, but events arriving after this read
      // started may not have reached its snapshot yet. Replay only that suffix;
      // older live overlays are intentionally replaced by native history.
      // Project the local command first. Native history can then reconcile its
      // user item in place. Replaying the local row after history makes the
      // same accepted command look like a second, newer user message and also
      // forces unsafe text-only deduplication across retry attempts.
      const snapshot = reduceConversationEvents(
        reduceConversationEvents(
          reduceConversationEvents(
            reduceConversationEvents(createConversationState(threadId), localOutboxJournal),
            events,
          ),
          attachment?.events ?? [],
        ),
        realtimeJournal
          .filter((entry) => entry.revision > realtimeRevisionAtStart)
          .map((entry) => entry.event),
      )
      const reconciled = snapshot
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
    initialReadPromise = refresh(initialRealtimeBaseline)
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
    async submitUserMessage(input, command) {
      if (!transport.submit) throw new Error('Conversation transport does not support command submission.')
      if (!input.text.trim()) throw new Error('Conversation command requires a non-empty user message.')
      const commandId = nextClientCommandId()
      const event: CodexEvent = {
        id: `local-outbox:${commandId}`,
        type: 'user.completed',
        threadId,
        itemId: commandId,
        atIso: new Date().toISOString(),
        data: {
          text: input.text,
          ...(input.images?.length ? { images: input.images } : {}),
          ...(input.skills?.length ? { skills: input.skills } : {}),
          optimistic: true,
          localOutbox: 'queued',
        },
      }
      localOutboxJournal = [...localOutboxJournal.filter((row) => row.itemId !== commandId), event]
      publish(reduceConversationEvent(state, event))
      try {
        await transport.submit({
          ...command,
          threadId,
          clientCommandId: commandId,
        })
        return { clientCommandId: commandId }
      } catch (error) {
        // A proxy can lose the HTTP 202 after the owner has already emitted
        // command.queued over realtime. That owner event is stronger evidence
        // than the failed response path; preserve the admitted command and let
        // its native events drive the lifecycle.
        if (admittedCommandIds.has(commandId)) return { clientCommandId: commandId }
        const message = error instanceof Error ? error.message : String(error)
        const failed = localOutboxJournal.find((row) => row.itemId === commandId)
        if (failed) {
          const failedEvent: CodexEvent = {
            ...failed,
            id: `local-outbox-failed:${commandId}:${Date.now().toString(36)}`,
            atIso: new Date().toISOString(),
            data: { ...failed.data, optimistic: false, localOutbox: 'failed', error: message },
          }
          localOutboxJournal = localOutboxJournal.map((row) => row.itemId === commandId ? failedEvent : row)
          publish(reduceConversationEvent(state, failedEvent))
        }
        throw error
      }
    },
    async retryFailedUserMessage(messageId, command) {
      const failed = state.messages.find((message) => message.id === messageId && message.role === 'user' && message.outbox?.status === 'failed')
      if (!failed) throw new Error('Only a failed local command can be retried.')
      return this.submitUserMessage({ text: failed.text, images: failed.images, skills: failed.skills }, command)
    },
    discardFailedUserMessage(messageId) {
      const failed = state.messages.find((message) => message.id === messageId && message.role === 'user' && message.outbox?.status === 'failed')
      if (!failed) return
      const commandId = messageId.startsWith('user:') ? messageId.slice('user:'.length) : messageId
      localOutboxJournal = localOutboxJournal.filter((event) => event.itemId !== commandId)
      publish({
        ...state,
        messages: state.messages.filter((message) => message.id !== failed.id),
        presentation: state.presentation.filter((row) => row.id !== failed.id),
      })
    },
    async interrupt() {
      if (!transport.interrupt) throw new Error('Conversation transport does not support interruption.')
      if (!state.activeTurnId) return
      await transport.interrupt(threadId)
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
  /** Sends a small control frame on the current socket generation. Returns
   * false while the socket is reconnecting so callers can safely replay their
   * desired subscription set when the next open event arrives. */
  send(data: string): boolean
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
  /** Randomized reconnect spread prevents many tabs reconnecting in lockstep. */
  reconnectJitterRatio?: number
  random?: () => number
}

/** Small shared WebSocket lifecycle with bounded exponential reconnect. */
export function createReconnectingConversationSocket(options: ReconnectingSocketOptions): ReconnectingSocket {
  const createSocket = options.createSocket ?? ((url) => new WebSocket(url))
  const minDelay = Math.max(100, options.minDelayMs ?? 500)
  const maxDelay = Math.max(minDelay, options.maxDelayMs ?? 10_000)
  const jitterRatio = Math.min(0.5, Math.max(0, options.reconnectJitterRatio ?? 0.2))
  const random = options.random ?? Math.random
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let delay = minDelay
  let closed = false
  let reconnectAttempt = 0
  let openedAt = 0
  let lastActivityAt = 0
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let heartbeatTickAt = 0

  const clearHeartbeat = (): void => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  const startHeartbeat = (current: WebSocket): void => {
    clearHeartbeat()
    if (!options.heartbeatIntervalMs || options.heartbeatIntervalMs <= 0) return
    const interval = Math.max(1_000, options.heartbeatIntervalMs)
    const timeout = Math.max(interval * 2, options.heartbeatTimeoutMs ?? 45_000)
    lastActivityAt = Date.now()
    heartbeatTickAt = lastActivityAt
    heartbeatTimer = setInterval(() => {
      if (closed || socket !== current) return
      const now = Date.now()
      const timerLag = now - heartbeatTickAt
      heartbeatTickAt = now
      // Browsers heavily throttle background-tab timers. A late callback is
      // not evidence that the socket was dead; give the server one fresh probe
      // window after the tab wakes instead of immediately closing it.
      if (timerLag > interval * 2) lastActivityAt = now
      if (now - lastActivityAt > timeout) {
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
      if (closed || socket !== current) return
      openedAt = Date.now()
      lastActivityAt = openedAt
      startHeartbeat(current)
      options.listener({ type: 'connected', atIso: new Date().toISOString() })
    })
    current.addEventListener('message', (event) => {
      if (closed || socket !== current) return
      lastActivityAt = Date.now()
      const parsed = options.parse(event.data)
      if (parsed) options.listener(parsed)
    })
    current.addEventListener('error', () => {
      if (!closed && socket === current) current.close()
    })
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
      const jitter = 1 + ((random() * 2) - 1) * jitterRatio
      const wait = Math.max(0, Math.round(delay * jitter))
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
    send(data) {
      if (closed || !socket || socket.readyState !== 1) return false
      try {
        socket.send(data)
        return true
      } catch {
        return false
      }
    },
  }
}
