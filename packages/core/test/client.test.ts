import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConversationController, createReconnectingConversationSocket, type ConversationSubscriptionEvent, type ConversationTransport } from '../src/client/index.js'
import type { CodexEvent } from '../src/conversation/index.js'

function event(id: string, type: CodexEvent['type'], data: Record<string, unknown> = {}): CodexEvent {
  return { id, type, threadId: 'thread-1', turnId: 'turn-1', atIso: new Date(0).toISOString(), data }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject })
  return { promise, resolve, reject }
}

afterEach(() => vi.useRealTimers())

describe('ConversationController', () => {
  it('attaches once before the initial native read', async () => {
    const calls: string[] = []
    const controller = createConversationController('thread-1', {
      attach: async () => { calls.push('attach') },
      read: async () => { calls.push('read'); return [] },
      subscribe: () => () => undefined,
    })

    await Promise.all([controller.start(), controller.start()])
    expect(calls).toEqual(['attach', 'read'])
  })

  it('keeps the realtime subscription alive and exposes owner attach failures', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const controller = createConversationController('thread-1', {
      attach: async () => { throw new Error('owner unavailable') },
      read: async () => [],
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    })

    await expect(controller.start()).resolves.toBeUndefined()
    expect(controller.getState().history.error).toBe('owner unavailable')
    listener?.({ type: 'event', event: event('live', 'assistant.completed', { text: 'subscription still works' }) })
    expect(controller.getState().messages.map(message => message.text)).toEqual(['subscription still works'])
  })

  it('uses latest-wins native reads', async () => {
    const first = deferred<CodexEvent[]>()
    const second = deferred<CodexEvent[]>()
    let readCount = 0
    const transport: ConversationTransport = {
      read: () => (++readCount === 1 ? first.promise : second.promise),
      subscribe: () => () => undefined,
    }
    const controller = createConversationController('thread-1', transport)
    const oldRead = controller.refresh()
    const newRead = controller.refresh()
    second.resolve([event('new', 'assistant.completed', { text: 'new snapshot' })])
    await newRead
    first.resolve([event('old', 'assistant.completed', { text: 'stale snapshot' })])
    await oldRead
    expect(controller.getState().messages.map(message => message.text)).toEqual(['new snapshot'])
  })

  it('reconciles realtime overlays with native history after reconnect', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    let snapshot: CodexEvent[] = []
    const transport: ConversationTransport = {
      read: async () => snapshot,
      subscribe: (_threadId, next) => { listener = next; return () => { listener = undefined } },
    }
    const controller = createConversationController('thread-1', transport)
    await controller.start()
    listener?.({ type: 'event', event: event('live-delta', 'assistant.delta', { text: 'hel' }) })
    expect(controller.getState().messages[0]?.text).toBe('hel')
    snapshot = [event('history-message', 'assistant.completed', { text: 'hello' }), event('history-terminal', 'turn.completed')]
    listener?.({ type: 'connected' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(controller.getState().messages.map(message => message.text)).toEqual(['hello'])
    expect(controller.getState().turns['turn-1']?.lifecycle).toBe('completed')
  })

  it('replays realtime events that arrive while native history is loading', async () => {
    const history = deferred<CodexEvent[]>()
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const transport: ConversationTransport = {
      read: () => history.promise,
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    }
    const controller = createConversationController('thread-1', transport)
    const start = controller.start()

    listener?.({ type: 'event', event: event('live', 'assistant.completed', { text: 'arrived during read' }) })
    history.resolve([])
    await start

    expect(controller.getState().messages.map(message => message.text)).toEqual(['arrived during read'])
  })

  it('preserves realtime events received before a background thread is started', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    })

    // Global multiplexed realtime creates the thread projection before the
    // user selects it and before attach/read begins.
    controller.ingestEvent(event('background-answer', 'assistant.completed', { text: '后台线程输出' }))
    await controller.start()

    expect(controller.getState().messages.map(message => message.text)).toEqual(['后台线程输出'])
    listener?.({ type: 'connected' })
    await new Promise(resolve => setTimeout(resolve, 0))
    // A later native reconciliation may legitimately replace that overlay.
    expect(controller.getState().messages).toEqual([])
  })

  it('does not resurrect a request resolved while native history is loading', async () => {
    const history = deferred<CodexEvent[]>()
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const transport: ConversationTransport = {
      read: () => history.promise,
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    }
    const controller = createConversationController('thread-1', transport)
    const start = controller.start()
    listener?.({ type: 'event', event: event('resolved', 'approval.resolved', { requestId: 'approval-1' }) })
    history.resolve([event('requested', 'approval.requested', { requestId: 'approval-1', method: 'item/commandExecution/requestApproval' })])
    await start

    expect(controller.getState().pendingRequests).toEqual([])
  })

  it('does not resurrect stale approvals after the App Server runtime disconnects', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const snapshot = [
      event('turn', 'turn.started'),
      event('approval', 'approval.requested', { requestId: 'approval-1', method: 'item/commandExecution/requestApproval' }),
    ]
    const transport: ConversationTransport = {
      read: async () => snapshot,
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    }
    const controller = createConversationController('thread-1', transport)
    await controller.start()
    expect(controller.getState().pendingRequests).toHaveLength(1)

    listener?.({ type: 'event', event: { ...event('runtime-down', 'runtime.disconnected', { error: 'owner unavailable' }), turnId: undefined } })
    expect(controller.getState().pendingRequests).toEqual([])
    expect(controller.getState().turns['turn-1']).toMatchObject({ lifecycle: 'disconnected' })

    await controller.refresh()
    expect(controller.getState().pendingRequests).toEqual([])
    expect(controller.getState().activeTurnId).toBe('')
    expect(controller.getState().presentation).not.toContainEqual(expect.objectContaining({ kind: 'failure' }))
  })

  it('keeps native turn and approval state intact while only the browser transport reconnects', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const controller = createConversationController('thread-1', {
      read: async () => [
        event('turn', 'turn.started'),
        event('approval', 'approval.requested', { requestId: 'approval-1', method: 'item/commandExecution/requestApproval' }),
      ],
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    })
    await controller.start()
    listener?.({ type: 'disconnected', reconnectAttempt: 2, closeCode: 1006, closeReason: 'network changed' })

    expect(controller.getState().transportConnection).toMatchObject({
      status: 'reconnecting', reconnectAttempt: 2, closeCode: 1006, closeReason: 'network changed',
    })
    expect(controller.getState().activeTurnId).toBe('turn-1')
    expect(controller.getState().turns['turn-1']?.lifecycle).toBe('running')
    expect(controller.getState().pendingRequests).toHaveLength(1)
    expect(controller.getState().connection.status).toBe('connected')
  })

  it('coalesces the initial socket connection with the initial native read', async () => {
    let readCount = 0
    const transport: ConversationTransport = {
      read: async () => { readCount += 1; return [] },
      subscribe: (_threadId, listener) => {
        listener({ type: 'connected' })
        return () => undefined
      },
    }
    const controller = createConversationController('thread-1', transport)
    await Promise.all([controller.start(), controller.start()])
    expect(readCount).toBe(1)
  })

  it('keeps realtime usable when the initial native history read fails', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const transport: ConversationTransport = {
      read: async () => { throw new Error('history unavailable') },
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    }
    const controller = createConversationController('thread-1', transport)
    await expect(controller.start()).resolves.toBeUndefined()
    expect(controller.getState().history).toMatchObject({ loading: false, error: 'history unavailable' })
    listener?.({ type: 'event', event: event('live', 'assistant.completed', { text: 'live still works' }) })
    expect(controller.getState().messages.map(message => message.text)).toEqual(['live still works'])
    await expect(controller.refresh()).rejects.toThrow('history unavailable')
  })

  it('shows a queued user message before turn/start or history responds, then replaces it with the native item', async () => {
    const history = deferred<CodexEvent[]>()
    const transport: ConversationTransport = {
      read: () => history.promise,
      subscribe: () => () => undefined,
    }
    const controller = createConversationController('thread-1', transport)
    const start = controller.start()

    controller.enqueueUserMessage({ id: 'local-1', text: '先检查当前分支' })
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:local-1', text: '先检查当前分支', messageType: 'userMessage.optimistic', outbox: { status: 'sending' } },
    ])

    history.resolve([{
      ...event('native-user', 'user.completed', { text: '先检查当前分支' }),
      itemId: 'native-user-1',
    }])
    await start

    expect(controller.getState().messages).toMatchObject([
      { id: 'user:native-user-1', text: '先检查当前分支' },
    ])
    expect(controller.getState().messages).toHaveLength(1)
    expect(controller.getState().messages[0]?.outbox).toBeUndefined()
  })

  it('owns optimistic submission and preserves a failed outbox when command admission fails', async () => {
    const admission = deferred<{ clientCommandId: string }>()
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: () => () => undefined,
      submit: () => admission.promise,
    })
    const submitted = controller.submitUserMessage({ id: 'command-1', text: '立即可见' }, {
      mode: 'queue', input: { input: [{ type: 'text', text: '立即可见' }] },
    })
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', text: '立即可见', outbox: { status: 'sending' } },
    ])
    admission.reject(new Error('owner unavailable'))
    await expect(submitted).rejects.toThrow('owner unavailable')
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', text: '立即可见', outbox: { status: 'failed', lastError: 'owner unavailable' } },
    ])
  })

  it('discards a queued command without touching native history rows', () => {
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: () => () => undefined,
    })
    controller.enqueueUserMessage({ id: 'discard-me', text: 'queued draft' })
    controller.discardQueuedUserMessage('discard-me')
    expect(controller.getState().messages).toEqual([])
    expect(controller.getState().presentation).toEqual([])
  })

  it('keeps one user row while a client command is queued, bound, and replaced by native history', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    let snapshot: CodexEvent[] = []
    const transport: ConversationTransport = {
      read: async () => snapshot,
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    }
    const controller = createConversationController('thread-1', transport)
    await controller.start()
    controller.enqueueUserMessage({ id: 'command-1', text: '检查分支' })
    listener?.({ type: 'event', event: { ...event('queued', 'command.queued', { text: '检查分支' }), itemId: 'command-1', turnId: undefined } })
    listener?.({ type: 'event', event: { ...event('bound', 'command.bound'), itemId: 'command-1', turnId: 'turn-1' } })

    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', text: '检查分支', turnId: 'turn-1' },
    ])

    snapshot = [{ ...event('native-user', 'user.completed', { text: '检查分支' }), itemId: 'native-user-1' }]
    listener?.({ type: 'connected' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(controller.getState().messages).toMatchObject([{ id: 'user:native-user-1', text: '检查分支' }])
    expect(controller.getState().messages).toHaveLength(1)
  })

  it('removes a late-bound optimistic row when the native user item arrived first', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    })
    await controller.start()
    controller.enqueueUserMessage({ id: 'command-1', text: 'same command' })
    listener?.({ type: 'event', event: {
      ...event('native-user', 'user.completed', { text: 'same command' }),
      itemId: 'native-user-1',
    } })
    controller.bindQueuedUserMessage('command-1', 'turn-1')
    expect(controller.getState().messages).toMatchObject([{ id: 'user:native-user-1', text: 'same command' }])
    expect(controller.getState().messages).toHaveLength(1)
  })

  it('keeps a failed queued user message visible for an explicit retry', () => {
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: () => () => undefined,
    })
    controller.enqueueUserMessage({ id: 'local-1', text: '执行检查' })
    controller.failQueuedUserMessage('local-1', 'request timed out')

    expect(controller.getState().messages).toMatchObject([
      { id: 'user:local-1', messageType: 'userMessage.outbox.failed', outbox: { status: 'failed', lastError: 'request timed out' } },
    ])
  })
})

describe('ReconnectingConversationSocket', () => {
  it('uses socket activity for health, emits close authority, and reconnects once', () => {
    vi.useFakeTimers()
    class FakeSocket {
      readonly listeners = new Map<string, Array<(event: any) => void>>()
      readyState = 1
      sent: string[] = []
      addEventListener(type: string, listener: (event: any) => void) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
      }
      send(value: string) { this.sent.push(value) }
      close(code = 1000, reason = '') { this.emit('close', { code, reason }) }
      emit(type: string, event: any = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event) }
    }
    const sockets: FakeSocket[] = []
    const events: ConversationSubscriptionEvent[] = []
    const transport = createReconnectingConversationSocket({
      url: 'ws://example.test',
      createSocket: () => { const socket = new FakeSocket(); sockets.push(socket); return socket as unknown as WebSocket },
      parse: () => null,
      listener: (event) => events.push(event),
      minDelayMs: 500,
      heartbeatIntervalMs: 1_000,
      heartbeatTimeoutMs: 2_000,
      random: () => 0.5,
    })
    sockets[0]!.emit('open')
    vi.advanceTimersByTime(1_000)
    expect(sockets[0]!.sent).toEqual([JSON.stringify({ type: 'ping' })])
    sockets[0]!.emit('message', { data: JSON.stringify({ type: 'pong' }) })
    sockets[0]!.emit('close', { code: 1006, reason: 'network changed' })
    expect(events.at(-1)).toMatchObject({ type: 'disconnected', reconnectAttempt: 1, retryInMs: 500, closeCode: 1006 })
    vi.advanceTimersByTime(500)
    expect(sockets).toHaveLength(2)
    transport.close()
  })

  it('resets reconnect backoff after a stable socket and does not reuse an earlier open timestamp', () => {
    vi.useFakeTimers()
    class FakeSocket {
      readonly listeners = new Map<string, Array<(event: any) => void>>()
      readyState = 1
      addEventListener(type: string, listener: (event: any) => void) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
      }
      send() {}
      close(code = 1000, reason = '') { this.emit('close', { code, reason }) }
      emit(type: string, event: any = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event) }
    }
    const sockets: FakeSocket[] = []
    const events: ConversationSubscriptionEvent[] = []
    const transport = createReconnectingConversationSocket({
      url: 'ws://example.test',
      createSocket: () => { const socket = new FakeSocket(); sockets.push(socket); return socket as unknown as WebSocket },
      parse: () => null,
      listener: (event) => events.push(event),
      minDelayMs: 500,
      maxDelayMs: 10_000,
      random: () => 0.5,
    })

    sockets[0]!.emit('open')
    vi.advanceTimersByTime(30_000)
    sockets[0]!.emit('close', { code: 1006, reason: 'network changed' })
    expect(events.at(-1)).toMatchObject({ type: 'disconnected', reconnectAttempt: 1, retryInMs: 500 })
    vi.advanceTimersByTime(500)
    // The replacement fails before opening. Its close must not inherit the
    // stable timestamp from the previous socket.
    sockets[1]!.emit('close', { code: 1006, reason: 'connect failed' })
    expect(events.at(-1)).toMatchObject({ type: 'disconnected', reconnectAttempt: 2, retryInMs: 800 })
    transport.close()
  })

  it('does not enable an application heartbeat unless the product opts in', () => {
    vi.useFakeTimers()
    class FakeSocket {
      readonly listeners = new Map<string, Array<(event: any) => void>>()
      readyState = 1
      sent: string[] = []
      addEventListener(type: string, listener: (event: any) => void) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
      }
      send(value: string) { this.sent.push(value) }
      close(code = 1000, reason = '') { this.emit('close', { code, reason }) }
      emit(type: string, event: any = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event) }
    }
    const socket = new FakeSocket()
    const transport = createReconnectingConversationSocket({
      url: 'ws://example.test',
      createSocket: () => socket as unknown as WebSocket,
      parse: () => null,
      listener: () => undefined,
    })
    socket.emit('open')
    vi.advanceTimersByTime(60_000)
    expect(socket.sent).toEqual([])
    transport.close()
  })
})
