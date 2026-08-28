import { type CodexEvent, type ConversationState } from '../conversation/index.js';
export type ConversationSubscriptionEvent = {
    type: 'event';
    event: CodexEvent;
} | {
    type: 'connected';
} | {
    type: 'disconnected';
    error?: string;
};
export interface ConversationTransport {
    read(threadId: string): Promise<CodexEvent[]>;
    subscribe(threadId: string, listener: (event: ConversationSubscriptionEvent) => void): () => void;
}
export type ConversationController = {
    getState(): ConversationState;
    subscribe(listener: (state: ConversationState) => void): () => void;
    start(): Promise<void>;
    refresh(): Promise<void>;
    dispose(): void;
};
/**
 * Browser-neutral controller used by both products. Native history is authoritative;
 * realtime events are overlays and every reconnect is reconciled through read().
 */
export declare function createConversationController(threadId: string, transport: ConversationTransport): ConversationController;
export type ReconnectingSocket = {
    close(): void;
};
export type ReconnectingSocketOptions = {
    url: string | (() => string);
    parse(data: unknown): ConversationSubscriptionEvent | null;
    listener: (event: ConversationSubscriptionEvent) => void;
    createSocket?: (url: string) => WebSocket;
    minDelayMs?: number;
    maxDelayMs?: number;
};
/** Small shared WebSocket lifecycle with bounded exponential reconnect. */
export declare function createReconnectingConversationSocket(options: ReconnectingSocketOptions): ReconnectingSocket;
//# sourceMappingURL=index.d.ts.map