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

  it('exposes the latest native history read error without dropping live state', async () => {
    let listener: ((value: ConversationSubscriptionEvent) => void) | undefined
    const transport: ConversationTransport = {
      read: async () => { throw new Error('history unavailable') },
      subscribe: (_threadId, next) => { listener = next; return () => undefined },
    }
    const controller = createConversationController('thread-1', transport)
    listener?.({ type: 'event', event: event('unused', 'assistant.completed', { text: 'unused' }) })
    await expect(controller.start()).rejects.toThrow('history unavailable')
    expect(controller.getState().history).toMatchObject({ loading: false, error: 'history unavailable' })
  })
})
