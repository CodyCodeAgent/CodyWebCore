import type { CodexEvent } from './index.js'

export type ConversationEventJournal<TEvent extends CodexEvent = CodexEvent> = { events: readonly TEvent[]; nativeEventsAfterIso: string | null; compactedAtIso: string | null }
export interface ConversationEventJournalStore<TEvent extends CodexEvent = CodexEvent> {
  append(conversationId: string, event: TEvent): void | Promise<void>
  read(conversationId: string): ConversationEventJournal<TEvent> | Promise<ConversationEventJournal<TEvent>>
  replace(conversationId: string, journal: ConversationEventJournal<TEvent>): void | Promise<void>
}
export type ConversationHistorySnapshot<TEvent extends CodexEvent = CodexEvent> = { events: readonly TEvent[]; watermark: number }
export class ConversationEventJournalCoordinator<TEvent extends CodexEvent = CodexEvent> {
  constructor(private readonly store: ConversationEventJournalStore<TEvent>) {}
  async append(conversationId: string, event: TEvent): Promise<void> { await this.store.append(conversationId, event) }
  async snapshot(conversationId: string, native: ConversationHistorySnapshot<TEvent>): Promise<ConversationHistorySnapshot<TEvent>> { return mergeConversationSnapshotWithJournal(native, await this.store.read(conversationId)) }
  async replace(conversationId: string, journal: ConversationEventJournal<TEvent>): Promise<void> { await this.store.replace(conversationId, journal) }
  async clear(conversationId: string, atIso = new Date().toISOString()): Promise<void> { await this.store.replace(conversationId, { events: [], nativeEventsAfterIso: atIso, compactedAtIso: atIso }) }
}
export function mergeConversationSnapshotWithJournal<TEvent extends CodexEvent>(native: ConversationHistorySnapshot<TEvent>, journal: ConversationEventJournal<TEvent>): ConversationHistorySnapshot<TEvent> {
  const current = journal.nativeEventsAfterIso ? native.events.filter((event) => event.atIso > journal.nativeEventsAfterIso!) : native.events
  const seen = new Set<string>(); const ordered: Array<{ event: TEvent; index: number }> = []
  for (const event of [...journal.events, ...current]) { if (!event.id || seen.has(event.id)) continue; seen.add(event.id); ordered.push({ event, index: ordered.length }) }
  ordered.sort((left, right) => left.event.atIso.localeCompare(right.event.atIso) || left.index - right.index)
  return { events: ordered.map((item) => item.event), watermark: native.watermark }
}
export function conversationHandoffTranscript(events: readonly CodexEvent[], maxCharacters = 24_000): string {
  const transcript = events.filter((event) => event.type === 'user.completed' || event.type === 'assistant.completed').map((event) => `${event.type === 'user.completed' ? 'User' : 'Assistant'}: ${eventText(event).trim()}`).filter((line) => !line.endsWith(':')).join('\n\n')
  const bounded = Math.max(1, Math.trunc(maxCharacters)); if (transcript.length <= bounded) return transcript
  const head = Math.max(1, Math.floor(bounded / 3)); const tail = Math.max(1, bounded - head)
  return `${transcript.slice(0, head)}\n\n… (middle history omitted) …\n\n${transcript.slice(-tail)}`
}
export function createConversationHandoffReplay<TEvent extends CodexEvent = CodexEvent>(input: { threadId: string; turnId: string; atIso: string; summary: string; notice?: string; createId?: (kind: 'user' | 'assistant' | 'completed') => string; decorate?: (event: CodexEvent) => TEvent }): TEvent[] {
  const createId = input.createId ?? ((kind: string) => `handoff:${input.turnId}:${kind}`); const decorate = input.decorate ?? ((event: CodexEvent) => event as TEvent); const notice = input.notice ?? 'Conversation history was compacted into the following handoff summary.'
  const event = (type: CodexEvent['type'], kind: 'user' | 'assistant' | 'completed', data: Record<string, unknown>): TEvent => decorate({ id: createId(kind), type, threadId: input.threadId, turnId: input.turnId, atIso: input.atIso, data })
  return [event('user.completed', 'user', { text: notice }), event('assistant.completed', 'assistant', { text: input.summary }), event('turn.completed', 'completed', { status: 'completed' })]
}
function eventText(event: CodexEvent): string { const value = event.data.text; return typeof value === 'string' ? value : '' }
