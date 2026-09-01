import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  conversationBrowserTransportStateFromEvent,
  createConversationController,
  createReconnectingConversationSocket,
  initialConversationBrowserTransportState,
  type ConversationSubscriptionEvent,
  type ConversationTransport,
} from '../src/client/index.js'
import { conversationFeedFromState, type CodexEvent } from '../src/conversation/index.js'

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
  it('shares one browser transport projection for retryable and terminal closes', () => {
    const retrying = conversationBrowserTransportStateFromEvent(initialConversationBrowserTransportState(), {
      type: 'disconnected', closeCode: 1005, reconnectAttempt: 1, retryInMs: 500, willReconnect: true,
    })
    expect(retrying).toMatchObject({ status: 'reconnecting', reconnectAttempt: 1, willReconnect: true })

    const terminal = conversationBrowserTransportStateFromEvent(retrying, {
      type: 'disconnected', closeCode: 4404, closeReason: 'conversation deleted', willReconnect: false,
    })
    expect(terminal).toMatchObject({ status: 'disconnected', closeCode: 4404, willReconnect: false })
  })

  it('reads native history then overlays one current owner attachment snapshot', async () => {
    const calls: string[] = []
    const controller = createConversationController('thread-1', {
      attach: async () => { calls.push('attach') },
      read: async () => { calls.push('read'); return [] },
      subscribe: () => () => undefined,
    })

    await Promise.all([controller.start(), controller.start()])
    expect(calls).toEqual(['read', 'attach'])
  })

  it('projects volatile owner state returned by attach before native history catches up', async () => {
    const controller = createConversationController('thread-1', {
      attach: async () => ({
        events: [{
          id: 'attachment-active', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-live',
          atIso: new Date(0).toISOString(), data: { attachment: true },
        }],
      }),
      read: async () => [],
      subscribe: () => () => undefined,
    })

    await controller.start()

    expect(controller.getState().activeTurnId).toBe('turn-live')
    expect(controller.getState().turns['turn-live']?.lifecycle).toBe('running')
  })

  it('re-applies the current owner command snapshot after every reconnect refresh', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    let attachCount = 0
    const attachmentEvents: CodexEvent[] = [
      { ...event('owner-queued', 'command.queued', { text: '跨标签消息', clientCommandId: 'command-1', attachment: true }), itemId: 'command-1', turnId: undefined },
      { ...event('owner-bound', 'command.bound', { clientCommandId: 'command-1', attachment: true }), itemId: 'command-1' },
      { ...event('owner-running', 'turn.started', { attachment: true }) },
    ]
    const controller = createConversationController('thread-1', {
      attach: async () => { attachCount += 1; return { events: attachmentEvents } },
      // Deliberately stale: native thread/read has not caught up to the owner.
      read: async () => [],
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    })

    await controller.start()
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', text: '跨标签消息', turnId: 'turn-1', outbox: { status: 'sending' } },
    ])

    listener?.({ type: 'connected' })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(attachCount).toBe(2)
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', text: '跨标签消息', turnId: 'turn-1', outbox: { status: 'sending' } },
    ])
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

  it('uses the owner watermark to replay only the realtime suffix of an atomic snapshot', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const controller = createConversationController('thread-1', {
      // The service has already included revision 7 in its snapshot. A second
      // browser can receive the same event from the socket while its GET is in
      // flight, so applying it again would create the old duplicate-at-bottom
      // failure this contract exists to prevent.
      snapshot: async () => ({
        events: [event('assistant-7', 'assistant.completed', { text: 'from snapshot' })],
        watermark: 7,
      }),
      read: async () => [],
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    })

    const start = controller.start()
    listener?.({ type: 'event', event: event('assistant-7', 'assistant.completed', { text: 'from snapshot' }), ownerRevision: 7 })
    listener?.({ type: 'event', event: event('assistant-8', 'assistant.completed', { text: 'live suffix' }), ownerRevision: 8 })
    await start

    expect(controller.getState().messages.map(message => message.text)).toEqual(['from snapshot', 'live suffix'])
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
    const admission = deferred<{ clientCommandId: string }>()
    const transport: ConversationTransport = {
      read: () => history.promise,
      subscribe: () => () => undefined,
      submit: () => admission.promise,
    }
    const controller = createConversationController('thread-1', transport, { createClientCommandId: () => 'local-1' })
    const start = controller.start()

    const submitted = controller.submitUserMessage({ text: '先检查当前分支' }, { mode: 'queue', input: {} })
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:local-1', text: '先检查当前分支', messageType: 'userMessage.optimistic', outbox: { status: 'queued' } },
    ])

    history.resolve([{
      ...event('native-user', 'user.completed', { text: '先检查当前分支' }),
      itemId: 'native-user-1',
    }])
    await start
    admission.resolve({ clientCommandId: 'local-1' })
    await submitted

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
    }, { createClientCommandId: () => 'command-1' })
    const submitted = controller.submitUserMessage({ text: '立即可见' }, {
      mode: 'queue', input: { input: [{ type: 'text', text: '立即可见' }] },
    })
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', text: '立即可见', outbox: { status: 'queued' } },
    ])
    admission.reject(new Error('owner unavailable'))
    await expect(submitted).rejects.toThrow('owner unavailable')
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', text: '立即可见', outbox: { status: 'failed', lastError: 'owner unavailable' } },
    ])
  })

  it('trusts realtime command admission when the matching HTTP response is lost', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const admission = deferred<{ clientCommandId: string }>()
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
      submit: () => admission.promise,
    }, { createClientCommandId: () => 'command-1' })
    await controller.start()
    const submitted = controller.submitUserMessage({ text: 'run once' }, {
      mode: 'queue', input: { input: [{ type: 'text', text: 'run once' }] },
    })
    listener?.({
      type: 'event',
      event: { ...event('admitted', 'command.queued', { text: 'run once', clientCommandId: 'command-1' }), itemId: 'command-1', turnId: undefined },
    })
    admission.reject(new Error('HTTP response lost'))

    await expect(submitted).resolves.toEqual({ clientCommandId: 'command-1' })
    expect(controller.getState().messages).toMatchObject([
      { id: 'user:command-1', outbox: { status: 'queued' } },
    ])
  })

  it('discards an explicitly failed command without touching native history rows', async () => {
    const admission = deferred<{ clientCommandId: string }>()
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: () => () => undefined,
      submit: () => admission.promise,
    }, { createClientCommandId: () => 'discard-me' })
    const submitted = controller.submitUserMessage({ text: 'queued draft' }, { mode: 'queue', input: {} })
    admission.reject(new Error('owner unavailable'))
    await expect(submitted).rejects.toThrow('owner unavailable')
    controller.discardFailedUserMessage('user:discard-me')
    expect(controller.getState().messages).toEqual([])
    expect(controller.getState().presentation).toEqual([])
  })

  it('keeps one user row while a client command is queued, bound, and replaced by native history', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    let snapshot: CodexEvent[] = []
    const transport: ConversationTransport = {
      read: async () => snapshot,
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
      submit: async (command) => ({ clientCommandId: command.clientCommandId }),
    }
    const controller = createConversationController('thread-1', transport, { createClientCommandId: () => 'command-1' })
    await controller.start()
    await controller.submitUserMessage({ text: '检查分支' }, { mode: 'queue', input: {} })
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
      submit: async (command) => ({ clientCommandId: command.clientCommandId }),
    }, { createClientCommandId: () => 'command-1' })
    await controller.start()
    await controller.submitUserMessage({ text: 'same command' }, { mode: 'queue', input: {} })
    listener?.({ type: 'event', event: {
      ...event('native-user', 'user.completed', { text: 'same command' }),
      itemId: 'native-user-1',
    } })
    listener?.({ type: 'event', event: { ...event('bound', 'command.bound'), itemId: 'command-1', turnId: 'turn-1', data: { clientCommandId: 'command-1' } } })
    expect(controller.getState().messages).toMatchObject([{ id: 'user:native-user-1', text: 'same command' }])
    expect(controller.getState().messages).toHaveLength(1)
  })

  it('keeps a failed queued user message visible for an explicit retry', async () => {
    const admission = deferred<{ clientCommandId: string }>()
    const controller = createConversationController('thread-1', {
      read: async () => [],
      subscribe: () => () => undefined,
      submit: () => admission.promise,
    }, { createClientCommandId: () => 'local-1' })
    const submitted = controller.submitUserMessage({ text: '执行检查' }, { mode: 'queue', input: {} })
    admission.reject(new Error('request timed out'))
    await expect(submitted).rejects.toThrow('request timed out')

    expect(controller.getState().messages).toMatchObject([
      { id: 'user:local-1', messageType: 'userMessage.optimistic', outbox: { status: 'failed', lastError: 'request timed out' } },
    ])
  })

  it('keeps two browser tabs on one owner-ordered feed through submit, live events, and snapshot refresh', async () => {
    const history: CodexEvent[] = []
    const listeners = new Set<(value: ConversationSubscriptionEvent) => void>()
    let ownerRevision = 0
    const transport: ConversationTransport = {
      snapshot: async () => ({ events: [...history], watermark: ownerRevision }),
      read: async () => [...history],
      submit: async (command) => ({ clientCommandId: command.clientCommandId }),
      subscribe: (_threadId, listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
    const publish = (next: CodexEvent, durable = false): void => {
      ownerRevision += 1
      if (durable) history.push(next)
      for (const listener of listeners) listener({ type: 'event', event: next, ownerRevision })
    }

    const firstTab = createConversationController('thread-1', transport, { createClientCommandId: () => 'command-shared' })
    const secondTab = createConversationController('thread-1', transport, { createClientCommandId: () => 'command-second-tab' })
    await Promise.all([firstTab.start(), secondTab.start()])

    await firstTab.submitUserMessage({ text: 'same owner, two tabs' }, { mode: 'queue', input: {} })
    const started = { ...event('turn-started', 'turn.started'), turnId: 'turn-shared' }
    const queued = { ...event('command-queued', 'command.queued', { text: 'same owner, two tabs', clientCommandId: 'command-shared' }), itemId: 'command-shared', turnId: undefined }
    const bound = { ...event('command-bound', 'command.bound', { clientCommandId: 'command-shared' }), itemId: 'command-shared', turnId: 'turn-shared' }
    const user = { ...event('native-user', 'user.completed', { text: 'same owner, two tabs' }), itemId: 'native-user', turnId: 'turn-shared' }
    const assistant = { ...event('native-assistant', 'assistant.completed', { text: 'one answer' }), itemId: 'native-assistant', turnId: 'turn-shared' }
    const completed = { ...event('turn-completed', 'turn.completed', { durationMs: 25 }), turnId: 'turn-shared' }
    publish(queued)
    publish(bound)
    publish(started, true)
    publish(user, true)
    publish(assistant, true)
    publish(completed, true)
    await Promise.all([firstTab.refresh(), secondTab.refresh()])

    for (const controller of [firstTab, secondTab]) {
      const feed = conversationFeedFromState(controller.getState())
      const messages = feed.filter((entry) => entry.kind === 'message').map((entry) => entry.message)
      expect(messages).toEqual([
        expect.objectContaining({ role: 'user', id: 'user:native-user', turnId: 'turn-shared', text: 'same owner, two tabs' }),
        expect.objectContaining({ role: 'assistant', id: 'agent:native-assistant', turnId: 'turn-shared', text: 'one answer' }),
      ])
      expect(feed.filter((entry) => entry.kind === 'turn' && entry.status === 'completed')).toHaveLength(1)
      expect(new Set(feed.map((entry) => entry.id)).size).toBe(feed.length)
    }
  })

  it('keeps 100 turns protocol ordered and duplicate-free through repeated history/live reconciliation', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const history: CodexEvent[] = []
    let commandIndex = 0
    const controller = createConversationController('thread-1', {
      read: async () => history,
      submit: async (command) => ({ clientCommandId: command.clientCommandId }),
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    }, { createClientCommandId: () => `command-${String(++commandIndex)}` })
    await controller.start()

    for (let index = 1; index <= 100; index += 1) {
      const turnId = `turn-${String(index)}`
      const commandId = `command-${String(index)}`
      const atIso = new Date(index * 1_000).toISOString()
      const completionIso = new Date(index * 1_000 + 100).toISOString()
      await controller.submitUserMessage({ text: `task ${String(index)}` }, {
        mode: 'queue', input: { input: [{ type: 'text', text: `task ${String(index)}` }] },
      })
      const started = { id: `start-${String(index)}`, type: 'turn.started' as const, threadId: 'thread-1', turnId, atIso, data: {} }
      const user = { id: `user-${String(index)}`, type: 'user.completed' as const, threadId: 'thread-1', turnId, itemId: `native-user-${String(index)}`, atIso, data: { text: `task ${String(index)}` } }
      const assistant = { id: `assistant-${String(index)}`, type: 'assistant.completed' as const, threadId: 'thread-1', turnId, itemId: `native-assistant-${String(index)}`, atIso, data: { text: `result ${String(index)}` } }
      const completed = { id: `done-${String(index)}`, type: 'turn.completed' as const, threadId: 'thread-1', turnId, atIso: completionIso, data: { durationMs: 100 } }
      listener?.({ type: 'event', event: { id: `bound-${String(index)}`, type: 'command.bound', threadId: 'thread-1', turnId, itemId: commandId, atIso, data: { clientCommandId: commandId } } })
      listener?.({ type: 'event', event: assistant })
      listener?.({ type: 'event', event: completed })
      history.push(started, user, assistant, completed)
      await controller.refresh()
    }

    const feed = conversationFeedFromState(controller.getState())
    const messages = feed.filter((entry) => entry.kind === 'message').map((entry) => entry.message)
    expect(messages.filter(message => message.role === 'user')).toHaveLength(100)
    expect(messages.filter(message => message.role === 'assistant')).toHaveLength(100)
    expect(feed.filter(entry => entry.kind === 'turn' && entry.status === 'completed')).toHaveLength(100)
    expect(new Set(feed.map(entry => entry.id)).size).toBe(feed.length)
    expect(messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(
      Array.from({ length: 100 }, (_value, index) => `task ${String(index + 1)}`),
    )
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

  it('does not reconnect after a terminal application close code', () => {
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
      listener: event => events.push(event),
    })
    sockets[0]!.emit('open')
    sockets[0]!.emit('close', { code: 4404, reason: 'conversation deleted' })

    expect(events.at(-1)).toMatchObject({ type: 'disconnected', closeCode: 4404, willReconnect: false, retryInMs: null })
    vi.runAllTimers()
    expect(sockets).toHaveLength(1)
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

  it('sends control frames only on the current open socket generation', () => {
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
      url: 'ws://example.test', createSocket: () => socket as unknown as WebSocket,
      parse: () => null, listener: () => undefined,
    })
    expect(transport.send('{"type":"subscribe"}')).toBe(true)
    expect(socket.sent).toEqual(['{"type":"subscribe"}'])
    transport.close()
    expect(transport.send('{"type":"subscribe"}')).toBe(false)
  })

  it('ignores late messages from a socket generation after it is closed', () => {
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
    const socket = new FakeSocket()
    const events: ConversationSubscriptionEvent[] = []
    const transport = createReconnectingConversationSocket({
      url: 'ws://example.test',
      createSocket: () => socket as unknown as WebSocket,
      parse: () => ({ type: 'connected', atIso: 'late-message' }),
      listener: (event) => events.push(event),
    })
    socket.emit('open')
    transport.close()
    socket.emit('message', { data: '{}' })
    socket.emit('open')

    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('connected')
  })
})
