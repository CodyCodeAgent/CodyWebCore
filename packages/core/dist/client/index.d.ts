import { type CodexEvent, type ConversationState } from '../conversation/index.js';
export type ConversationSubscriptionEvent = {
    type: 'event';
    event: CodexEvent;
} | {
    type: 'connected';
    atIso?: string;
} | {
    type: 'disconnected';
    error?: string;
    atIso?: string;
    reconnectAttempt?: number;
    retryInMs?: number | null;
    closeCode?: number | null;
    closeReason?: string;
};
export type ConversationAttachment = {
    /** Current owner state that is not guaranteed to exist in native history
     * yet (for example, a Turn that is still running). */
    events: CodexEvent[];
};
export interface ConversationTransport {
    /** Registers the native thread with the process-wide owner. This is
     * idempotent and must never create a second App Server process. */
    attach?(threadId: string): Promise<ConversationAttachment | void>;
    read(threadId: string): Promise<CodexEvent[]>;
    subscribe(threadId: string, listener: (event: ConversationSubscriptionEvent) => void): () => void;
    /** Accepts a command into the process-wide SessionManager. Native binding and
     * terminal state return through subscribe(); this call only acknowledges
     * durable command admission. */
    submit?(command: ConversationCommand): Promise<{
        clientCommandId: string;
    }>;
    /** Requests interruption through the process-wide owner. The owner, not a
     * browser product, decides the authoritative terminal transition. */
    interrupt?(threadId: string): Promise<void>;
}
export type ConversationCommand = {
    threadId: string;
    clientCommandId: string;
    mode: 'queue' | 'steer';
    input: unknown;
    context?: unknown;
};
export type ConversationOptimisticMessage = {
    text: string;
    images?: string[];
    skills?: Array<{
        name: string;
        path: string;
        displayName?: string;
    }>;
};
export type ConversationControllerOptions = {
    /** Test hook only. Product code must never manufacture command ids. */
    createClientCommandId?: () => string;
};
export type ConversationController = {
    getState(): ConversationState;
    subscribe(listener: (state: ConversationState) => void): () => void;
    /** The single browser command entrypoint: optimistic projection first,
     * process-owner admission second, and an explicit failed outbox on transport
     * rejection. Products must not coordinate turn/start themselves. */
    submitUserMessage(input: ConversationOptimisticMessage, command: Omit<ConversationCommand, 'threadId' | 'clientCommandId'>): Promise<{
        clientCommandId: string;
    }>;
    /** Replays one explicitly failed local command as a new command. */
    retryFailedUserMessage(messageId: string, command: Omit<ConversationCommand, 'threadId' | 'clientCommandId'>): Promise<{
        clientCommandId: string;
    }>;
    /** Removes a pre-admission failed command. Native history is never touched. */
    discardFailedUserMessage(messageId: string): void;
    /** Delegates an interrupt intent to the process-wide owner. */
    interrupt(): Promise<void>;
    /** Applies a product-originated normalized event without creating a second message store. */
    ingestEvent(event: CodexEvent): void;
    start(): Promise<void>;
    refresh(): Promise<void>;
    dispose(): void;
};
/**
 * Browser-neutral controller used by both products. Native history is authoritative;
 * realtime events are overlays and every reconnect is reconciled through read().
 */
export declare function createConversationController(threadId: string, transport: ConversationTransport, options?: ConversationControllerOptions): ConversationController;
export type ReconnectingSocket = {
    close(): void;
    /** Sends a small control frame on the current socket generation. Returns
     * false while the socket is reconnecting so callers can safely replay their
     * desired subscription set when the next open event arrives. */
    send(data: string): boolean;
};
export type ReconnectingSocketOptions = {
    url: string | (() => string);
    parse(data: unknown): ConversationSubscriptionEvent | null;
    listener: (event: ConversationSubscriptionEvent) => void;
    createSocket?: (url: string) => WebSocket;
    minDelayMs?: number;
    maxDelayMs?: number;
    /** Optional application heartbeat. This detects half-open browser sockets
     * without polling an unrelated HTTP health endpoint. */
    heartbeatIntervalMs?: number;
    heartbeatTimeoutMs?: number;
    heartbeatPayload?: string;
    /** Randomized reconnect spread prevents many tabs reconnecting in lockstep. */
    reconnectJitterRatio?: number;
    random?: () => number;
};
/** Small shared WebSocket lifecycle with bounded exponential reconnect. */
export declare function createReconnectingConversationSocket(options: ReconnectingSocketOptions): ReconnectingSocket;
//# sourceMappingURL=index.d.ts.map