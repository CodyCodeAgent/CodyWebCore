/** Deterministic message reconciliation shared by every renderer and transport. */
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
  outbox?: { status: 'queued' | 'sending' | 'failed'; lastError?: string }
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

function normalizeImageIdentity(value: string): string {
  const normalized = value.trim()
  const localImagePrefix = '/codex-api/local-image?path='
  if (!normalized.startsWith(localImagePrefix)) return normalized
  try { return decodeURIComponent(normalized.slice(localImagePrefix.length)) } catch { return normalized }
}

function imageIdentity(message: ConversationMessage): string {
  return (message.images ?? []).map(normalizeImageIdentity).join('\u0001')
}

function userIdentity(message: ConversationMessage): string {
  return `${normalizeMessageText(message.text)}\u0000${imageIdentity(message)}\u0000${skillIdentity(message)}`
}

function isLocalPendingUserMessage(message: ConversationMessage): boolean {
  return message.role === 'user' && (
    message.messageType === 'userMessage.optimistic'
    || message.messageType?.startsWith('userMessage.outbox.') === true
  )
}

function isPersistedUserMessage(message: ConversationMessage): boolean {
  return message.role === 'user' && !isLocalPendingUserMessage(message)
}

function isLiveAssistant(message: ConversationMessage): boolean {
  return message.role === 'assistant'
    && (message.messageType === 'agentMessage.live' || message.messageType === 'plan.live')
}

function reconcilesLiveAssistant(live: ConversationMessage, persisted: ConversationMessage): boolean {
  if (!isLiveAssistant(live) || persisted.role !== 'assistant') return false
  if (!live.turnId || live.turnId !== persisted.turnId) return false
  const liveText = normalizeMessageText(live.text)
  const persistedText = normalizeMessageText(persisted.text)
  if (!liveText || !persistedText) return false
  return liveText === persistedText || persistedText.startsWith(liveText)
}

function isSameUserMessage(first: ConversationMessage, second: ConversationMessage): boolean {
  return first.role === 'user' && second.role === 'user' && userIdentity(first) === userIdentity(second)
}

function sameUnknown(first: unknown, second: unknown): boolean {
  if (first === second) return true
  try { return JSON.stringify(first) === JSON.stringify(second) } catch { return false }
}

export function areConversationMessageFieldsEqual<T extends ConversationMessage>(first: T, second: T): boolean {
  return first.id === second.id && first.turnId === second.turnId && first.role === second.role && first.text === second.text
    && first.messageType === second.messageType && imageIdentity(first) === imageIdentity(second) && skillIdentity(first) === skillIdentity(second)
    && first.outbox?.status === second.outbox?.status && first.outbox?.lastError === second.outbox?.lastError
    && sameUnknown(first.tool ?? null, second.tool ?? null) && sameUnknown(first.rawPayload, second.rawPayload)
    && first.isUnhandled === second.isUnhandled
}

export function areConversationMessageArraysStable<T extends ConversationMessage>(first: T[], second: T[]): boolean {
  return first.length === second.length && first.every((message, index) => message === second[index])
}

function removeDuplicateMessageIds<T extends ConversationMessage>(messages: T[]): T[] {
  const seen = new Set<string>()
  const next: T[] = []
  for (const message of messages) {
    if (message.id && seen.has(message.id)) continue
    if (message.id) seen.add(message.id)
    next.push(message)
  }
  return next.length === messages.length ? messages : next
}

export function removeDuplicateAdjacentUserMessages<T extends ConversationMessage>(messages: T[]): T[] {
  const next: T[] = []
  for (const message of messages) {
    const previous = next.at(-1)
    if (!previous || !isSameUserMessage(previous, message)) {
      next.push(message)
      continue
    }
    if (isLocalPendingUserMessage(previous) && !isLocalPendingUserMessage(message)) next[next.length - 1] = message
  }
  return next.length === messages.length && next.every((message, index) => message === messages[index]) ? messages : next
}

function turnUserIdentity(message: ConversationMessage): string {
  if (!message.turnId || !isPersistedUserMessage(message)) return ''
  return `${message.turnId}\u0000${userIdentity(message)}`
}

function insertAtProtocolPosition<T extends ConversationMessage>(base: T[], rows: T[], incoming: T[]): T[] {
  if (!rows.length) return base
  const result = [...base]
  const incomingIndex = new Map(incoming.map((message, index) => [message.id, index]))
  for (const row of rows) {
    const position = incomingIndex.get(row.id) ?? incoming.length
    let insertionIndex = -1
    for (let index = position - 1; index >= 0; index -= 1) {
      const anchor = result.findIndex((message) => message.id === incoming[index]?.id)
      if (anchor >= 0) { insertionIndex = anchor + 1; break }
    }
    if (insertionIndex < 0) {
      for (let index = position + 1; index < incoming.length; index += 1) {
        const anchor = result.findIndex((message) => message.id === incoming[index]?.id)
        if (anchor >= 0) { insertionIndex = anchor; break }
      }
    }
    if (insertionIndex < 0 && row.turnId) {
      const receipt = result.findIndex((message) => message.turnId === row.turnId && message.messageType === 'worked')
      if (receipt >= 0) insertionIndex = receipt
    }
    result.splice(insertionIndex < 0 ? result.length : insertionIndex, 0, row)
  }
  return result
}

export function mergeMessages<T extends ConversationMessage>(previous: T[], incoming: T[], options: { preserveMissing?: boolean } = {}): T[] {
  const dedupedIncoming = removeDuplicateMessageIds(incoming)
  const previousById = new Map(previous.map((message) => [message.id, message]))
  const incomingById = new Map(dedupedIncoming.map((message) => [message.id, message]))
  const stableIncoming = dedupedIncoming.map((message) => {
    const oldMessage = previousById.get(message.id)
    return oldMessage && areConversationMessageFieldsEqual(oldMessage, message) ? oldMessage : message
  })
  if (!options.preserveMissing) {
    const compacted = removeDuplicateAdjacentUserMessages(stableIncoming)
    return areConversationMessageArraysStable(previous, compacted) ? previous : compacted
  }

  const consumed = new Set<string>()
  const turnLinkedIncoming = new Map<string, T[]>()
  for (const message of stableIncoming) {
    const key = turnUserIdentity(message)
    if (!key) continue
    const matches = turnLinkedIncoming.get(key)
    if (matches) matches.push(message)
    else turnLinkedIncoming.set(key, [message])
  }
  const merged = previous.map((oldMessage) => {
    const exact = incomingById.get(oldMessage.id)
    if (exact) {
      consumed.add(exact.id)
      return areConversationMessageFieldsEqual(oldMessage, exact) ? oldMessage : exact
    }
    if (isLocalPendingUserMessage(oldMessage)) {
      const persisted = stableIncoming.find((message) => !consumed.has(message.id) && isPersistedUserMessage(message) && isSameUserMessage(oldMessage, message))
      if (persisted) { consumed.add(persisted.id); return persisted }
    }
    const key = turnUserIdentity(oldMessage)
    const replay = (key ? turnLinkedIncoming.get(key) : undefined)
      ?.find((message) => !consumed.has(message.id) && isSameUserMessage(oldMessage, message))
    if (replay) { consumed.add(replay.id); return replay }
    if (isLiveAssistant(oldMessage)) {
      const persisted = stableIncoming.find((message) => !consumed.has(message.id) && reconcilesLiveAssistant(oldMessage, message))
      if (persisted) { consumed.add(persisted.id); return persisted }
    }
    return oldMessage
  })

  let lastTurnBoundary = -1
  for (let index = previous.length - 1; index >= 0; index -= 1) {
    if (previous[index]?.messageType === 'worked') { lastTurnBoundary = index; break }
  }
  const currentTurnUsers = previous.slice(lastTurnBoundary + 1).filter(isPersistedUserMessage)
  const appended = stableIncoming.filter((message) => {
    if (consumed.has(message.id) || previousById.has(message.id)) return false
    return !(isPersistedUserMessage(message) && currentTurnUsers.some((existing) => isSameUserMessage(existing, message)))
  })
  const ordered = insertAtProtocolPosition(merged, appended, stableIncoming)
  const compacted = removeDuplicateAdjacentUserMessages(removeDuplicateMessageIds(ordered))
  return areConversationMessageArraysStable(previous, compacted) ? previous : compacted
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
    next[index] = {
      ...next[index],
      ...(input.turnId ? { turnId: input.turnId } : {}),
      text: `${next[index].text}${input.textDelta}`,
      messageType: input.messageType,
    }
    return next
  }
  return [...messages, {
    id: input.messageId, turnId: input.turnId, role: 'assistant', text: input.textDelta, messageType: input.messageType,
  } as T]
}

export function removeRedundantLiveAssistantMessages<T extends ConversationMessage>(messages: T[], persisted: T[]): T[] {
  const persistedIds = new Set(persisted.filter((message) => message.role === 'assistant').map((message) => message.id))
  const persistedTexts = new Set(persisted.filter((message) => message.role === 'assistant').map((message) => normalizeMessageText(message.text)).filter(Boolean))
  if (!persistedIds.size && !persistedTexts.size) return messages
  const next = messages.filter((message) => {
    if (message.messageType !== 'agentMessage.live' && message.messageType !== 'plan.live') return true
    return !persistedIds.has(message.id) && !persistedTexts.has(normalizeMessageText(message.text))
  })
  return next.length === messages.length ? messages : next
}

export function compactConversationMessages<T extends ConversationMessage>(messages: T[]): T[] {
  const persistedUsers = messages.filter(isPersistedUserMessage)
  const consumed = new Set<string>()
  const next: T[] = []
  for (const message of removeDuplicateAdjacentUserMessages(removeDuplicateMessageIds(messages))) {
    if (!isLocalPendingUserMessage(message)) {
      if (!consumed.has(message.id)) next.push(message)
      continue
    }
    const replacement = persistedUsers.find((candidate) => !consumed.has(candidate.id) && isSameUserMessage(message, candidate))
    if (!replacement) { next.push(message); continue }
    if (!next.some((displayed) => isPersistedUserMessage(displayed) && isSameUserMessage(displayed, replacement))) next.push(replacement)
    consumed.add(replacement.id)
  }
  return areConversationMessageArraysStable(messages, next) ? messages : next
}

export function reconcilePersistedMessages<T extends ConversationMessage>(messages: T[], persisted: T[]): T[] {
  return mergeMessages(removeRedundantLiveAssistantMessages(messages, persisted), persisted, { preserveMissing: true })
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

export function formatTurnDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return '<1s'
  const totalSeconds = Math.max(1, Math.round(durationMs / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${String(hours)}h`)
  if (minutes > 0 || hours > 0) parts.push(`${String(minutes)}m`)
  parts.push(`${String(seconds > 0 || parts.length === 0 ? seconds : 0)}s`)
  return parts.join(' ')
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
