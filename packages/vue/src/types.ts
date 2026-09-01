import type {
  ConversationMessage,
  ConversationRequest,
  ConversationState,
  ConversationTool,
} from '@codycodeagent/cody-web-core/conversation'
import { conversationFeedFromState, formatTurnDuration } from '@codycodeagent/cody-web-core/conversation'

export type CodyMessageRole = 'user' | 'assistant' | 'system'

/** A product supplies these choices; the shared component owns interaction and presentation. */
export type CodyComposerOption = {
  value: string
  label: string
  description?: string
}

export type CodyQuestionField = {
  id: string
  header: string
  question: string
  isOther: boolean
  isSecret: boolean
  options: Array<{ label: string; description: string }>
}

export function questionFieldsFromParams(value: unknown): CodyQuestionField[] {
  if (!value || typeof value !== 'object') return []
  const row = value as Record<string, unknown>
  const questions = Array.isArray(row.questions) ? row.questions : []
  return questions.flatMap((value, index) => {
    if (!value || typeof value !== 'object') return []
    const question = value as Record<string, unknown>
    const text = typeof question.question === 'string' ? question.question.trim() : ''
    if (!text) return []
    const options = Array.isArray(question.options) ? question.options : []
    return [{
      id: typeof question.id === 'string' && question.id.trim() ? question.id.trim() : `question-${String(index + 1)}`,
      header: typeof question.header === 'string' ? question.header.trim() : '',
      question: text,
      isOther: question.isOther === true,
      isSecret: question.isSecret === true,
      options: options.flatMap(option => {
        if (!option || typeof option !== 'object') return []
        const optionRow = option as Record<string, unknown>
        const label = typeof optionRow.label === 'string' ? optionRow.label.trim() : ''
        return label ? [{ label, description: typeof optionRow.description === 'string' ? optionRow.description.trim() : '' }] : []
      }),
    }]
  })
}

export function requestSummary(value: unknown): string {
  if (!value || typeof value !== 'object') return 'Codex 请求执行一项受保护操作。'
  const row = value as Record<string, unknown>
  const direct = row.reason ?? row.question ?? row.command
  if (typeof direct === 'string' && direct.trim()) return direct
  return questionFieldsFromParams(value)[0]?.question ?? 'Codex 请求执行一项受保护操作。'
}

export type CodyTool = ConversationTool

export type CodyMessage = ConversationMessage

export type CodyConversationEntry =
  | { id: string; kind: 'message'; message: CodyMessage }
  | { id: string; kind: 'tool'; tool: CodyTool }
  | { id: string; kind: 'reasoning'; text: string; title?: string }
  | { id: string; kind: 'plan'; text: string }
  | { id: string; kind: 'request'; request: ConversationRequest }
  | { id: string; kind: 'failure'; text: string }
  | { id: string; kind: 'interrupted'; text: string }
  | { id: string; kind: 'worked'; label: string }
  | { id: string; kind: 'activity'; title: string; detail: string; tone: 'running' | 'retrying' | 'waiting' | 'disconnected' }

/** Converts shared reducer state into the shared Vue presentation model. */
export function conversationEntriesFromState(state: ConversationState): CodyConversationEntry[] {
  const entries: CodyConversationEntry[] = []
  const appendTimeline = (row: ConversationState['timeline'][number]): void => {
    if (row.kind === 'reasoning') {
      entries.push({ id: row.id, kind: 'reasoning', text: row.text })
      return
    }
    if (!row.tool.summary && row.tool.details.length === 0 && !row.tool.output && row.tool.kind !== 'fileChange') return
    if (row.tool.kind !== 'fileChange') {
      entries.push({ id: row.id, kind: 'tool', tool: row.tool })
      return
    }
    const groupId = `file-group:${row.turnId ?? row.id}`
    const previous = entries.at(-1)
    if (!previous || previous.kind !== 'tool' || previous.id !== groupId) {
      const details = [...new Set(row.tool.details)]
      const entry: Extract<CodyConversationEntry, { kind: 'tool' }> = {
        id: groupId,
        kind: 'tool',
        tool: {
          ...row.tool,
          title: details.length > 1 ? `文件变更 · ${String(details.length)} 个文件` : '文件变更',
          summary: details.length ? `${String(details.length)} 个文件已更新` : row.tool.summary,
          details,
        },
      }
      entries.push(entry)
      return
    }
    const details = [...new Set([...previous.tool.details, ...row.tool.details])]
    const output = [previous.tool.output, row.tool.output].filter(Boolean).join('\n\n')
    previous.tool = {
      ...previous.tool,
      status: /fail|error|cancel|reject/iu.test(`${previous.tool.status} ${row.tool.status}`) ? 'failed' : row.tool.status,
      title: details.length > 1 ? `文件变更 · ${String(details.length)} 个文件` : '文件变更',
      summary: details.length ? `${String(details.length)} 个文件已更新` : row.tool.summary,
      details,
      ...(output ? { output } : {}),
    }
  }

  for (const item of conversationFeedFromState(state)) {
    if (item.kind === 'message') entries.push({ id: item.id, kind: 'message', message: item.message })
    else if (item.kind === 'timeline') appendTimeline(item.entry)
    else if (item.kind === 'plan') entries.push({ id: item.id, kind: 'plan', text: item.plan.text })
    else if (item.kind === 'request') entries.push({ id: item.id, kind: 'request', request: item.request })
    else if (item.kind === 'turn' && item.status === 'failed') entries.push({ id: item.id, kind: 'failure', text: item.error })
    // A Turn's interrupted lifecycle is state, not a chat message. Rendering
    // it as a transcript row made owner safety interrupts (for an upstream
    // failure) look like duplicated user-visible "Stopped" replies.
    else if (item.kind === 'turn' && item.status === 'interrupted') continue
    else if (item.kind === 'turn' && item.status === 'completed') entries.push({ id: item.id, kind: 'worked', label: `Worked for ${formatTurnDuration(item.durationMs ?? 0)}` })
    else if (item.kind === 'activity') {
      entries.push({
        id: item.id,
        kind: 'activity',
        title: item.status === 'waiting'
          ? (state.pendingRequests.find((request) => !request.turnId || request.turnId === item.turnId)?.kind === 'approval' ? '等待你的审批' : '等待你的回答')
          : item.label,
        detail: item.status === 'waiting'
          ? '处理后 Codex 会继续本次回复'
          : item.status === 'retrying'
            ? (state.connection.status === 'disconnected' ? '连接已中断，等待恢复' : '正在恢复本次回复')
            : (state.connection.status === 'connected' ? '实时更新中' : '等待恢复连接'),
        tone: item.status,
      })
    }
  }
  return entries
}
