import { describe, expect, it } from 'vitest'
import { createConversationController, type ConversationSubscriptionEvent, type ConversationTransport } from '../src/client/index.js'
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

describe('ConversationController', () => {
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

  it('does not resurrect stale approvals while the owner transport is disconnected', async () => {
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

    listener?.({ type: 'disconnected', error: 'owner unavailable' })
    expect(controller.getState().pendingRequests).toEqual([])
    expect(controller.getState().turns['turn-1']).toMatchObject({ lifecycle: 'disconnected' })

    await controller.refresh()
    expect(controller.getState().pendingRequests).toEqual([])
    expect(controller.getState().activeTurnId).toBe('')
    expect(controller.getState().presentation).not.toContainEqual(expect.objectContaining({ kind: 'failure' }))
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
