import { describe, expect, it } from 'vitest'
import { createConversationState, dataAuthorityFor, mergeMessages, previewToolOutput, reduceConversationEvents, upsertLiveDelta } from '../src/conversation/index.js'

describe('conversation core', () => {
  it('replaces an optimistic user message without duplicating it', () => {
    const output = mergeMessages(
      [{ id: 'optimistic', turnId: 't1', role: 'user' as const, text: 'hello', messageType: 'userMessage.optimistic' }],
      [{ id: 'persisted', turnId: 't1', role: 'user' as const, text: 'hello' }],
      { preserveMissing: true },
    )
    expect(output).toEqual([{ id: 'persisted', turnId: 't1', role: 'user', text: 'hello' }])
  })

  it('replaces an assistant realtime overlay with the durable item', () => {
    const output = mergeMessages(
      [{ id: 'live:item-1', turnId: 'turn-1', role: 'assistant' as const, text: 'Hello ', messageType: 'agentMessage.live' }],
      [{ id: 'item-1', turnId: 'turn-1', role: 'assistant' as const, text: 'Hello world' }],
      { preserveMissing: true },
    )
    expect(output).toEqual([{ id: 'item-1', turnId: 'turn-1', role: 'assistant', text: 'Hello world' }])
  })

  it('keeps realtime deltas in one row', () => {
    const once = upsertLiveDelta([], { messageId: 'a', textDelta: 'one', messageType: 'agentMessage.live' })
    const twice = upsertLiveDelta(once, { messageId: 'a', textDelta: ' two', messageType: 'plan.live', turnId: 'turn-1' })
    expect(twice).toHaveLength(1)
    expect(twice[0]?.text).toBe('one two')
    expect(twice[0]).toMatchObject({ messageType: 'plan.live', turnId: 'turn-1' })
  })

  it('classifies authority and bounds tool previews', () => {
    expect(dataAuthorityFor('item/agentMessage/delta')).toBe('overlay')
    expect(dataAuthorityFor('turn/plan/updated')).toBe('replace-snapshot')
    expect(previewToolOutput('a\nb\nc', 2).truncated).toBe(true)
  })

  it('keeps retry notices as overlay state and accepts only one terminal transition', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'started', type: 'turn.started', data: {} },
      { ...base, id: 'retry-1', type: 'turn.retrying', data: { error: 'Reconnecting 1/5' } },
      { ...base, id: 'retry-2', type: 'turn.retrying', data: { error: 'Reconnecting 2/5' } },
      { ...base, id: 'done', type: 'turn.completed', data: {} },
      { ...base, id: 'late-failure', type: 'turn.failed', data: { error: 'late duplicate' } },
    ])
    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'completed' })
    expect(state.activeTurnId).toBe('')
  })
})
