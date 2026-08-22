import { describe, expect, it } from 'vitest'
import { dataAuthorityFor, mergeMessages, previewToolOutput, upsertLiveDelta } from '../src/conversation/index.js'

describe('conversation core', () => {
  it('replaces an optimistic user message without duplicating it', () => {
    const output = mergeMessages(
      [{ id: 'optimistic', turnId: 't1', role: 'user' as const, text: 'hello', messageType: 'userMessage.optimistic' }],
      [{ id: 'persisted', turnId: 't1', role: 'user' as const, text: 'hello' }],
      { preserveMissing: true },
    )
    expect(output).toEqual([{ id: 'persisted', turnId: 't1', role: 'user', text: 'hello' }])
  })

  it('keeps realtime deltas in one row', () => {
    const once = upsertLiveDelta([], { messageId: 'a', textDelta: 'one', messageType: 'agentMessage.live' })
    const twice = upsertLiveDelta(once, { messageId: 'a', textDelta: ' two', messageType: 'agentMessage.live' })
    expect(twice).toHaveLength(1)
    expect(twice[0]?.text).toBe('one two')
  })

  it('classifies authority and bounds tool previews', () => {
    expect(dataAuthorityFor('item/agentMessage/delta')).toBe('overlay')
    expect(dataAuthorityFor('turn/plan/updated')).toBe('replace-snapshot')
    expect(previewToolOutput('a\nb\nc', 2).truncated).toBe(true)
  })
})

