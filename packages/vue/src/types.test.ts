import { describe, expect, it } from 'vitest'
import { createConversationState, reduceConversationEvents, type CodexEvent } from '../../core/src/conversation/index.js'
import { conversationEntriesFromState, questionFieldsFromParams } from './types.js'

const at = (second: number) => `2026-08-28T00:00:${String(second).padStart(2, '0')}.000Z`
const event = (id: string, type: CodexEvent['type'], second: number, data: Record<string, unknown>, itemId?: string): CodexEvent => ({
  id, type, threadId: 'thread-1', turnId: 'turn-1', ...(itemId ? { itemId } : {}), atIso: at(second), data,
})

describe('conversationEntriesFromState', () => {
  it('preserves protocol order across messages, tools and completion receipts', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      event('start', 'turn.started', 1, {}),
      event('user', 'user.completed', 2, { text: '检查代码' }, 'user-1'),
      event('tool', 'tool.started', 3, { tool: { kind: 'command', title: '命令执行', status: 'running', summary: 'pnpm test', details: [] } }, 'tool-1'),
      event('answer', 'assistant.completed', 4, { text: '检查完成。' }, 'answer-1'),
      event('done', 'turn.completed', 7, {}),
    ])

    expect(conversationEntriesFromState(state).map((row) => row.kind)).toEqual(['message', 'tool', 'message', 'worked'])
    expect(conversationEntriesFromState(state).at(-1)).toMatchObject({ kind: 'worked', label: 'Worked for 6s' })
  })

  it('keeps a completion receipt after a late assistant history item', () => {
    // thread/read can materialize the assistant item after turn.completed was
    // already observed on the realtime connection. The visual Turn boundary
    // must remain after the entire Turn rather than splitting its reply.
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      event('start', 'turn.started', 1, {}),
      event('user', 'user.completed', 2, { text: '检查代码' }, 'user-1'),
      event('done', 'turn.completed', 3, {}),
      event('answer', 'assistant.completed', 4, { text: '检查完成。' }, 'answer-1'),
    ])

    expect(conversationEntriesFromState(state).map((row) => row.kind)).toEqual(['message', 'message', 'worked'])
  })

  it('normalizes request_user_input questions without product-specific parsing', () => {
    expect(questionFieldsFromParams({ questions: [{ id: 'q1', header: 'Scope', question: 'Choose', isOther: true, isSecret: false, options: [{ label: 'Alpha', description: 'A' }] }] })).toEqual([{
      id: 'q1', header: 'Scope', question: 'Choose', isOther: true, isSecret: false, options: [{ label: 'Alpha', description: 'A' }],
    }])
  })
})
