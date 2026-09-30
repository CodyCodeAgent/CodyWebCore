import type { CodexEvent } from './index.js';
/**
 * Product-owned durable storage record for providers that cannot replay a
 * complete UI event history after reconnecting. Core owns the event identity,
 * ordering and compaction semantics; products choose their database, retention
 * policy and cache-management UI.
 */
export type ConversationEventJournal<TEvent extends CodexEvent = CodexEvent> = {
    events: readonly TEvent[];
    /** Events at or before this cut are intentionally absent from replay. This
     * prevents an attached provider's in-memory snapshot from resurrecting a
     * product-cleared local history. */
    nativeEventsAfterIso: string | null;
    compactedAtIso: string | null;
};
/** Storage port deliberately has no database dependency. A product can back
 * it with SQLite, IndexedDB, a server store or an encrypted local file. */
export interface ConversationEventJournalStore<TEvent extends CodexEvent = CodexEvent> {
    append(conversationId: string, event: TEvent): void | Promise<void>;
    read(conversationId: string): ConversationEventJournal<TEvent> | Promise<ConversationEventJournal<TEvent>>;
    replace(conversationId: string, journal: ConversationEventJournal<TEvent>): void | Promise<void>;
}
export type ConversationHistorySnapshot<TEvent extends CodexEvent = CodexEvent> = {
    events: readonly TEvent[];
    watermark: number;
};
/**
 * Provider-neutral journal coordinator. It deliberately does not infer a
 * provider's native history durability: callers persist every event only when
 * their provider declares that a product replay cache is required.
 */
export declare class ConversationEventJournalCoordinator<TEvent extends CodexEvent = CodexEvent> {
    private readonly store;
    constructor(store: ConversationEventJournalStore<TEvent>);
    append(conversationId: string, event: TEvent): Promise<void>;
    snapshot(conversationId: string, native: ConversationHistorySnapshot<TEvent>): Promise<ConversationHistorySnapshot<TEvent>>;
    replace(conversationId: string, journal: ConversationEventJournal<TEvent>): Promise<void>;
    /** Keep the provider Session intact while making its pre-clear in-memory
     * events ineligible for a later replay. */
    clear(conversationId: string, atIso?: string): Promise<void>;
}
/**
 * Reconciles a provider snapshot with a durable product journal. Event IDs are
 * the authority for deduplication; timestamp ordering is only used to place
 * two distinct events from different sources predictably. The native watermark
 * is preserved because it belongs to the provider owner, not the journal.
 */
export declare function mergeConversationSnapshotWithJournal<TEvent extends CodexEvent>(native: ConversationHistorySnapshot<TEvent>, journal: ConversationEventJournal<TEvent>): ConversationHistorySnapshot<TEvent>;
/** A bounded, role-bearing transcript source that a provider can turn into an
 * explicit handoff summary before its verbose journal is compacted. Core does
 * not invoke a model or decide the summary language. */
export declare function conversationHandoffTranscript(events: readonly CodexEvent[], maxCharacters?: number): string;
/** Creates the minimal replay record retained after a product has obtained a
 * provider-generated handoff. `decorate` lets products add their own durable
 * conversation identifier without leaking it into Core's portable event type. */
export declare function createConversationHandoffReplay<TEvent extends CodexEvent = CodexEvent>(input: {
    threadId: string;
    turnId: string;
    atIso: string;
    summary: string;
    notice?: string;
    createId?: (kind: 'user' | 'assistant' | 'completed') => string;
    decorate?: (event: CodexEvent) => TEvent;
}): TEvent[];
//# sourceMappingURL=journal.d.ts.map