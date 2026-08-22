/** Deterministic conversation state primitives. They deliberately contain no Vue/React state. */
export type MessageRole = 'user' | 'assistant' | 'system'

export type ConversationTool = {
  kind: string
  title: string
  status: string
  summary: string
  details: string[]
  output?: string
  outputLabel?: string
}

export type ConversationMessage = {
  id: string
  turnId?: string
  role: MessageRole
  text: string
  images?: string[]
  skills?: Array<{ name: string; path: string; displayName?: string }>
  tool?: ConversationTool | null
  messageType?: string
  rawPayload?: unknown
  isUnhandled?: boolean
}

export type DataAuthority = 'overlay' | 'replace-snapshot' | 'invalidate' | 'apply-delta-then-reconcile' | 'ignore'

export function dataAuthorityFor(method: string): DataAuthority {
  if (method === 'turn/plan/updated') return 'replace-snapshot'
  if (method === 'thread/tokenUsage/updated') return 'apply-delta-then-reconcile'
  if (method === 'account/rateLimits/updated' || method === 'thread/started') return 'invalidate'
  if (/^item\/(agentMessage|reasoning|plan)\/(delta|textDelta|summaryTextDelta)$/u.test(method)) return 'overlay'
  if (/^(turn|item)\//u.test(method)) return 'invalidate'
  return 'ignore'
}

export function normalizeMessageText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function skillIdentity(message: ConversationMessage): string {
  return (message.skills ?? []).map((skill) => `${skill.name}\u0000${skill.path}`).join('\u0001')
}

function imageIdentity(message: ConversationMessage): string {
  return (message.images ?? []).map((image) => image.trim()).join('\u0001')
}

function userIdentity(message: ConversationMessage): string {
  return `${normalizeMessageText(message.text)}\u0000${imageIdentity(message)}\u0000${skillIdentity(message)}`
}

function isOptimistic(message: ConversationMessage): boolean {
  return message.role === 'user' && message.messageType === 'userMessage.optimistic'
}

function isSameUserMessage(first: ConversationMessage, second: ConversationMessage): boolean {
  return first.role === 'user' && second.role === 'user' && userIdentity(first) === userIdentity(second)
}

function sameMessage<T extends ConversationMessage>(first: T, second: T): boolean {
  return first.id === second.id && first.turnId === second.turnId && first.role === second.role && first.text === second.text
    && first.messageType === second.messageType && imageIdentity(first) === imageIdentity(second) && skillIdentity(first) === skillIdentity(second)
    && JSON.stringify(first.tool ?? null) === JSON.stringify(second.tool ?? null)
}

export function mergeMessages<T extends ConversationMessage>(previous: T[], incoming: T[], options: { preserveMissing?: boolean } = {}): T[] {
  const dedupedIncoming = incoming.filter((message, index, rows) => rows.findIndex((row) => row.id === message.id) === index)
  const byIncomingId = new Map(dedupedIncoming.map((message) => [message.id, message]))
  const consumed = new Set<string>()
  const merged = previous.map((oldMessage) => {
    const exact = byIncomingId.get(oldMessage.id)
    if (exact) { consumed.add(exact.id); return sameMessage(oldMessage, exact) ? oldMessage : exact }
    if (isOptimistic(oldMessage)) {
      const persisted = dedupedIncoming.find((message) => !consumed.has(message.id) && !isOptimistic(message) && isSameUserMessage(oldMessage, message))
      if (persisted) { consumed.add(persisted.id); return persisted }
    }
    if (oldMessage.role === 'user' && oldMessage.turnId) {
      const replay = dedupedIncoming.find((message) => !consumed.has(message.id) && message.turnId === oldMessage.turnId && isSameUserMessage(oldMessage, message))
      if (replay) { consumed.add(replay.id); return replay }
    }
    return oldMessage
  })

  const appended = dedupedIncoming.filter((message) => {
    if (consumed.has(message.id) || previous.some((previousMessage) => previousMessage.id === message.id)) return false
    if (message.role === 'user' && merged.some((existing) => existing.turnId === message.turnId && isSameUserMessage(existing, message))) return false
    return true
  })
  const next = options.preserveMissing ? [...merged, ...appended] : dedupedIncoming
  const result: T[] = []
  for (const message of next) {
    const previousMessage = result.at(-1)
    if (previousMessage && isSameUserMessage(previousMessage, message)) {
      if (isOptimistic(previousMessage) && !isOptimistic(message)) result[result.length - 1] = message
      continue
    }
    result.push(message)
  }
  return result
}

export function upsertLiveDelta<T extends ConversationMessage>(messages: T[], input: {
  messageId: string
  textDelta: string
  turnId?: string
  messageType: 'agentMessage.live' | 'plan.live'
}): T[] {
  if (!input.messageId || !input.textDelta) return messages
  const index = messages.findIndex((message) => message.id === input.messageId)
  if (index >= 0) {
    const next = [...messages]
    next[index] = { ...next[index], text: `${next[index].text}${input.textDelta}` }
    return next
  }
  return [...messages, {
    id: input.messageId, turnId: input.turnId, role: 'assistant', text: input.textDelta, messageType: input.messageType,
  } as T]
}

export function reconcilePersistedMessages<T extends ConversationMessage>(messages: T[], persisted: T[]): T[] {
  const withoutRedundantLive = messages.filter((message) => {
    if (message.messageType !== 'agentMessage.live' && message.messageType !== 'plan.live') return true
    return !persisted.some((item) => item.id === message.id || (item.role === 'assistant' && normalizeMessageText(item.text) === normalizeMessageText(message.text)))
  })
  return mergeMessages(withoutRedundantLive, persisted, { preserveMissing: true })
}

export function toolStatusTone(status: string): 'neutral' | 'running' | 'success' | 'danger' {
  if (/fail|error|cancel|reject/iu.test(status)) return 'danger'
  if (/complete|success|done|approved/iu.test(status)) return 'success'
  if (/run|start|pending|wait/iu.test(status)) return 'running'
  return 'neutral'
}

export function previewToolOutput(output: string, maxLines = 80, maxChars = 12_000): { text: string; truncated: boolean } {
  const lines = output.split(/\r?\n/u)
  const constrained = lines.slice(0, maxLines).join('\n').slice(0, maxChars)
  return { text: constrained, truncated: constrained.length < output.length || lines.length > maxLines }
}

export function groupConsecutiveFileChanges<T extends ConversationMessage>(messages: T[]): Array<{ firstIndex: number; messages: T[] }> {
  const groups: Array<{ firstIndex: number; messages: T[] }> = []
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (message?.tool?.kind !== 'fileChange') continue
    const group = [message]
    for (let cursor = index + 1; messages[cursor]?.tool?.kind === 'fileChange'; cursor += 1) group.push(messages[cursor])
    groups.push({ firstIndex: index, messages: group })
    index += group.length - 1
  }
  return groups
}

