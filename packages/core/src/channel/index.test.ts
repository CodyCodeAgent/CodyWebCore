import { describe, expect, it } from 'vitest'
import { createConversationState, reduceConversationEvents, type CodexEvent } from '../conversation/index.js'
import { ReliableChannelOutbox, channelCommandId, channelConversationKey, extractMarkdownImageReferences, projectChannelTurn, stripMarkdownImages, type ChannelInboundMessage, type ChannelOutboxItem, type ChannelOutboxStore } from './index.js'

const message: ChannelInboundMessage = {
  provider: 'feishu', accountId: 'bot-1', eventId: 'event-1', messageId: 'message-1',
  conversation: { id: 'chat-1', scope: 'topic', rootId: 'root-1' }, sender: { id: 'user-1', type: 'user' },
  text: 'hello', attachments: [], addressedToAgent: true, mentionsOtherRecipient: false,
  createdAtIso: '2026-09-05T00:00:00.000Z',
}

describe('channel identities', () => {
  it('keeps command and conversation identities stable across redelivery', () => {
    expect(channelCommandId(message)).toBe(channelCommandId({ ...message }))
    expect(channelConversationKey(message)).toBe('feishu:bot-1:topic:chat-1:root-1')
    expect(channelCommandId({ ...message, eventId: 'event-2' })).not.toBe(channelCommandId(message))
  })
})

describe('channel turn projection', () => {
  it('keeps terminal authority when a late delta arrives', () => {
    const event = (type: CodexEvent['type'], data: Record<string, unknown> = {}): CodexEvent => ({
      id: `${type}-${JSON.stringify(data)}`, type, threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-09-05T00:00:00.000Z', data,
    })
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      event('turn.started'), event('assistant.completed', { text: 'answer' }), event('turn.completed'), event('assistant.delta', { text: 'late', delta: 'late' }),
    ])
    expect(projectChannelTurn(state, 'turn-1', 4)).toMatchObject({ status: 'completed', terminal: true, assistantText: 'answer', assistantImages: [] })
  })

  it('projects structured and Markdown images once while retaining authoritative text', () => {
    const state = createConversationState('thread-1')
    state.turns['turn-1'] = { id: 'turn-1', lifecycle: 'completed' }
    state.messages.push({
      id: 'message-1', role: 'assistant', text: 'Result\n\n![chart](</safe/chart one.png>)\n![duplicate](/safe/screenshot.png)',
      images: ['/safe/screenshot.png'], turnId: 'turn-1', messageType: 'agentMessage',
    })

    expect(projectChannelTurn(state, 'turn-1', 2)).toMatchObject({
      assistantImages: ['/safe/screenshot.png', '/safe/chart one.png'],
    })
    expect(extractMarkdownImageReferences(state.messages[0].text)).toEqual([
      { alt: 'chart', source: '/safe/chart one.png' },
      { alt: 'duplicate', source: '/safe/screenshot.png' },
    ])
    expect(stripMarkdownImages(state.messages[0].text, image => `[image: ${image.alt}]`)).toBe('Result\n\n[image: chart]\n[image: duplicate]')
  })
})

describe('ReliableChannelOutbox', () => {
  it('retries transient failures and dead-letters permanent failures', async () => {
    let now = new Date('2026-09-05T00:00:00.000Z')
    const rows = new Map<string, ChannelOutboxItem>()
    const store: ChannelOutboxStore = {
      async enqueue(input) {
        const existing = [...rows.values()].find(row => row.dedupeKey === input.dedupeKey)
        if (existing) return existing
        const row: ChannelOutboxItem = { ...input, status: 'pending', attempts: 0, availableAtIso: input.availableAtIso ?? now.toISOString() }
        rows.set(row.id, row); return row
      },
      async claim(input) {
        return [...rows.values()].filter(row => (row.status === 'pending' || row.status === 'retry_wait') && row.availableAtIso <= input.nowIso).slice(0, input.limit).map(row => {
          row.status = 'leased'; row.attempts += 1; return { ...row }
        })
      },
      async markSent(id, remoteMessageId) { Object.assign(rows.get(id)!, { status: 'sent', remoteMessageId }) },
      async markRetry(id, lastError, availableAtIso) { Object.assign(rows.get(id)!, { status: 'retry_wait', lastError, availableAtIso }) },
      async markDeadLetter(id, lastError) { Object.assign(rows.get(id)!, { status: 'dead_letter', lastError }) },
    }
    let calls = 0
    const queue = new ReliableChannelOutbox({ provider: 'feishu', accountId: 'bot-1' }, store, {
      async deliver() { calls += 1; if (calls === 1) throw new Error('timeout'); return { remoteMessageId: 'remote-1' } },
      classifyError(error) { return { message: String(error), retryable: !String(error).includes('forbidden') } },
    }, { retryBaseMs: 100, now: () => now, randomId: () => 'out-1' })
    await queue.enqueue({ kind: 'send_text', targetId: 'chat-1', payload: {}, dedupeKey: 'event-1:0' })
    await queue.flush()
    expect(rows.get('out-1')?.status).toBe('retry_wait')
    now = new Date(now.getTime() + 100)
    await queue.flush()
    expect(rows.get('out-1')).toMatchObject({ status: 'sent', remoteMessageId: 'remote-1', attempts: 2 })

    const permanent = new ReliableChannelOutbox({ provider: 'feishu', accountId: 'bot-1' }, store, {
      async deliver() { throw new Error('forbidden') }, classifyError(error) { return { message: String(error), retryable: false } },
    }, { now: () => now, randomId: () => 'out-2' })
    await permanent.enqueue({ kind: 'send_text', targetId: 'chat-1', payload: {}, dedupeKey: 'event-2:0' })
    await permanent.flush()
    expect(rows.get('out-2')?.status).toBe('dead_letter')
  })
})
