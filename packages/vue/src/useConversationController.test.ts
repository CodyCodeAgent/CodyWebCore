// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { ConversationSubscriptionEvent, ConversationTransport } from '@codycodeagent/cody-web-core/client'
import type { CodexEvent } from '@codycodeagent/cody-web-core/conversation'
import { useConversationController } from './useConversationController.js'

function assistantEvent(threadId: string, id: string, text: string): CodexEvent {
  return {
    id,
    type: 'assistant.completed',
    threadId,
    turnId: `turn:${id}`,
    atIso: '2026-08-29T00:00:00.000Z',
    data: { text },
  }
}

function transport(history: CodexEvent[] = []) {
  let listener: ((event: ConversationSubscriptionEvent) => void) | null = null
  let disposed = false
  const value: ConversationTransport = {
    read: async () => history,
    subscribe: (_threadId, next) => {
      listener = next
      return () => { disposed = true; listener = null }
    },
  }
  return {
    value,
    emit(event: ConversationSubscriptionEvent) { listener?.(event) },
    get disposed() { return disposed },
  }
}

describe('useConversationController', () => {
  it('combines native history and live events in reactive Vue state', async () => {
    const source = transport([assistantEvent('thread-1', 'history', 'history')])
    const conversation = useConversationController()

    await conversation.connect('thread-1', source.value)
    source.emit({ type: 'event', event: assistantEvent('thread-1', 'live', 'live') })

    expect(conversation.state.value.threadId).toBe('thread-1')
    expect(conversation.state.value.messages.map(message => message.text)).toEqual(['history', 'live'])
  })

  it('disposes the previous transport before switching threads', async () => {
    const first = transport()
    const second = transport()
    const conversation = useConversationController()

    await conversation.connect('thread-1', first.value)
    await conversation.connect('thread-2', second.value)
    first.emit({ type: 'event', event: assistantEvent('thread-1', 'stale', 'stale') })
    second.emit({ type: 'event', event: assistantEvent('thread-2', 'current', 'current') })

    expect(first.disposed).toBe(true)
    expect(conversation.state.value.threadId).toBe('thread-2')
    expect(conversation.state.value.messages.map(message => message.text)).toEqual(['current'])
  })

  it('keeps live updates active when initial history is unavailable', async () => {
    const source = transport()
    source.value.read = async () => { throw new Error('history unavailable') }
    const conversation = useConversationController()

    await expect(conversation.connect('thread-1', source.value)).resolves.toBeUndefined()
    source.emit({ type: 'event', event: assistantEvent('thread-1', 'live', 'still live') })

    expect(conversation.state.value.history.error).toBe('history unavailable')
    expect(conversation.state.value.messages[0]?.text).toBe('still live')
  })
})
