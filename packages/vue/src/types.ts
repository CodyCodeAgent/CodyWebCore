import type {
  ConversationMessage,
  ConversationRequest,
  ConversationState,
  ConversationTool,
} from '@codycodeagent/cody-web-core/conversation'
import { formatTurnDuration } from '@codycodeagent/cody-web-core/conversation'

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
  | { id: string; kind: 'worked'; label: string }

/** Converts shared reducer state into the shared Vue presentation model. */
export function conversationEntriesFromState(state: ConversationState): CodyConversationEntry[] {
  const entries: CodyConversationEntry[] = []
  const seen = new Set<string>()
  const messages = new Map(state.messages.map((message) => [message.id, message]))
  const timeline = new Map(state.timeline.map((row) => [row.id, row]))

  const appendTimeline = (row: ConversationState['timeline'][number]): void => {
    if (row.kind === 'reasoning') {
      entries.push({ id: row.id, kind: 'reasoning', text: row.text })
      seen.add(row.id)
      return
    }
    if (!row.tool.summary && row.tool.details.length === 0 && !row.tool.output && row.tool.kind !== 'fileChange') return
    if (row.tool.kind !== 'fileChange') {
      entries.push({ id: row.id, kind: 'tool', tool: row.tool })
      seen.add(row.id)
      return
    }
    const groupId = `file-group:${row.turnId ?? row.id}`
    const previous = entries.at(-1)
    if (!previous || previous.kind !== 'tool' || previous.id !== groupId) {
      const entry: Extract<CodyConversationEntry, { kind: 'tool' }> = { id: groupId, kind: 'tool', tool: { ...row.tool } }
      entries.push(entry)
      seen.add(row.id)
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
    seen.add(row.id)
  }

  for (const ref of state.presentation ?? []) {
    if (ref.kind === 'message') {
      const message = messages.get(ref.id)
      if (message) { entries.push({ id: message.id, kind: 'message', message }); seen.add(message.id) }
    } else if (ref.kind === 'timeline') {
      const row = timeline.get(ref.id)
      if (row) appendTimeline(row)
    } else if (ref.kind === 'plan') {
      if (state.plan?.text && (!ref.turnId || ref.turnId === state.plan.turnId)) {
        entries.push({ id: ref.id, kind: 'plan', text: state.plan.text }); seen.add(ref.id)
      }
    } else if (ref.kind === 'request') {
      const request = state.pendingRequests.find((row) => `request:${row.id}` === ref.id)
      if (request) { entries.push({ id: ref.id, kind: 'request', request }); seen.add(ref.id) }
    } else if (ref.kind === 'failure') {
      const turn = ref.turnId ? state.turns[ref.turnId] : undefined
      if (turn?.error) { entries.push({ id: ref.id, kind: 'failure', text: turn.error }); seen.add(ref.id) }
    } else if (ref.kind === 'worked') {
      const turn = ref.turnId ? state.turns[ref.turnId] : undefined
      if (turn?.completedAtIso) {
        const duration = turn.startedAtIso ? Date.parse(turn.completedAtIso) - Date.parse(turn.startedAtIso) : 0
        entries.push({ id: ref.id, kind: 'worked', label: `Worked for ${formatTurnDuration(duration)}` })
        seen.add(ref.id)
      }
    }
  }

  for (const message of state.messages) if (!seen.has(message.id)) entries.push({ id: message.id, kind: 'message', message })
  for (const row of state.timeline) if (!seen.has(row.id)) appendTimeline(row)
  const planId = `plan:${state.plan?.turnId || 'current'}`
  if (state.plan?.text && !seen.has(planId)) entries.push({ id: planId, kind: 'plan', text: state.plan.text })
  for (const request of state.pendingRequests) if (!seen.has(`request:${request.id}`)) entries.push({ id: `request:${request.id}`, kind: 'request', request })
  for (const turn of Object.values(state.turns)) {
    if (turn.lifecycle === 'failed' && turn.error && !seen.has(`failure:${turn.id}`)) entries.push({ id: `failure:${turn.id}`, kind: 'failure', text: turn.error })
  }
  return entries
}
