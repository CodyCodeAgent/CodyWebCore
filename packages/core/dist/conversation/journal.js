export class ConversationEventJournalCoordinator {
    store;
    constructor(store) {
        this.store = store;
    }
    async append(conversationId, event) { await this.store.append(conversationId, event); }
    async snapshot(conversationId, native) { return mergeConversationSnapshotWithJournal(native, await this.store.read(conversationId)); }
    async replace(conversationId, journal) { await this.store.replace(conversationId, journal); }
    async clear(conversationId, atIso = new Date().toISOString()) { await this.store.replace(conversationId, { events: [], nativeEventsAfterIso: atIso, compactedAtIso: atIso }); }
}
export function mergeConversationSnapshotWithJournal(native, journal) {
    const current = journal.nativeEventsAfterIso ? native.events.filter((event) => event.atIso > journal.nativeEventsAfterIso) : native.events;
    const seen = new Set();
    const ordered = [];
    for (const event of [...journal.events, ...current]) {
        if (!event.id || seen.has(event.id))
            continue;
        seen.add(event.id);
        ordered.push({ event, index: ordered.length });
    }
    ordered.sort((left, right) => left.event.atIso.localeCompare(right.event.atIso) || left.index - right.index);
    return { events: ordered.map((item) => item.event), watermark: native.watermark };
}
export function conversationHandoffTranscript(events, maxCharacters = 24_000) {
    const transcript = events.filter((event) => event.type === 'user.completed' || event.type === 'assistant.completed').map((event) => `${event.type === 'user.completed' ? 'User' : 'Assistant'}: ${eventText(event).trim()}`).filter((line) => !line.endsWith(':')).join('\n\n');
    const bounded = Math.max(1, Math.trunc(maxCharacters));
    if (transcript.length <= bounded)
        return transcript;
    const head = Math.max(1, Math.floor(bounded / 3));
    const tail = Math.max(1, bounded - head);
    return `${transcript.slice(0, head)}\n\n… (middle history omitted) …\n\n${transcript.slice(-tail)}`;
}
export function createConversationHandoffReplay(input) {
    const createId = input.createId ?? ((kind) => `handoff:${input.turnId}:${kind}`);
    const decorate = input.decorate ?? ((event) => event);
    const notice = input.notice ?? 'Conversation history was compacted into the following handoff summary.';
    const event = (type, kind, data) => decorate({ id: createId(kind), type, threadId: input.threadId, turnId: input.turnId, atIso: input.atIso, data });
    return [event('user.completed', 'user', { text: notice }), event('assistant.completed', 'assistant', { text: input.summary }), event('turn.completed', 'completed', { status: 'completed' })];
}
function eventText(event) { const value = event.data.text; return typeof value === 'string' ? value : ''; }
//# sourceMappingURL=journal.js.map