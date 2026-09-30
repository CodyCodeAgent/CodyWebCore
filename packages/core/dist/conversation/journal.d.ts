import type { CodexEvent } from './index.js';
export type ConversationEventJournal<TEvent extends CodexEvent = CodexEvent> = {
    events: readonly TEvent[];
    nativeEventsAfterIso: string | null;
    compactedAtIso: string | null;
};
export interface ConversationEventJournalStore<TEvent extends CodexEvent = CodexEvent> {
    append(conversationId: string, event: TEvent): void | Promise<void>;
    read(conversationId: string): ConversationEventJournal<TEvent> | Promise<ConversationEventJournal<TEvent>>;
    replace(conversationId: string, journal: ConversationEventJournal<TEvent>): void | Promise<void>;
}
export type ConversationHistorySnapshot<TEvent extends CodexEvent = CodexEvent> = {
    events: readonly TEvent[];
    watermark: number;
};
export declare class ConversationEventJournalCoordinator<TEvent extends CodexEvent = CodexEvent> {
    private readonly store;
    constructor(store: ConversationEventJournalStore<TEvent>);
    append(conversationId: string, event: TEvent): Promise<void>;
    snapshot(conversationId: string, native: ConversationHistorySnapshot<TEvent>): Promise<ConversationHistorySnapshot<TEvent>>;
    replace(conversationId: string, journal: ConversationEventJournal<TEvent>): Promise<void>;
    clear(conversationId: string, atIso?: string): Promise<void>;
}
export declare function mergeConversationSnapshotWithJournal<TEvent extends CodexEvent>(native: ConversationHistorySnapshot<TEvent>, journal: ConversationEventJournal<TEvent>): ConversationHistorySnapshot<TEvent>;
export declare function conversationHandoffTranscript(events: readonly CodexEvent[], maxCharacters?: number): string;
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