/** Deterministic conversation state primitives. They deliberately contain no Vue/React state. */
export * from './history-window.js';
export * from './messages.js';
import { type ConversationMessage, type ConversationTool } from './messages.js';
export type CodexEventType = 'thread.attached' | 'thread.context.updated' | 'thread.compaction.started' | 'thread.compacted' | 'turn.started' | 'turn.activity' | 'turn.retrying' | 'turn.disconnected' | 'turn.completed' | 'turn.failed' | 'turn.interrupted' | 'command.queued' | 'command.bound' | 'command.failed' | 'user.completed' | 'assistant.delta' | 'assistant.completed' | 'reasoning.delta' | 'reasoning.break' | 'plan.delta' | 'plan.replaced' | 'tool.started' | 'tool.updated' | 'tool.completed' | 'fileChange.updated' | 'approval.requested' | 'approval.resolved' | 'question.requested' | 'question.resolved' | 'runtime.connected' | 'runtime.disconnected' | 'provider.extension';
/** Framework- and transport-neutral event emitted by the shared Codex session manager. */
export type CodexEvent = {
    id: string;
    /** Monotonic per-owner revision. It is assigned only by a live owner and
     * lets a reconnect replay the exact suffix after an owner snapshot. */
    ownerRevision?: number;
    type: CodexEventType;
    threadId: string;
    turnId?: string;
    itemId?: string;
    atIso: string;
    data: Record<string, unknown>;
};
export type TurnLifecycle = 'idle' | 'running' | 'retrying' | 'disconnected' | 'completed' | 'failed' | 'interrupted';
export type ConversationTurnState = {
    id: string;
    lifecycle: TurnLifecycle;
    startedAtIso?: string;
    completedAtIso?: string;
    durationMs?: number;
    retryMessage?: string;
    error?: string;
};
export type ConversationTimelineEntry = {
    id: string;
    kind: 'tool';
    turnId?: string;
    itemId?: string;
    tool: ConversationTool;
} | {
    id: string;
    kind: 'reasoning';
    turnId?: string;
    itemId?: string;
    text: string;
};
export type ConversationRequest = {
    id: string;
    kind: 'approval' | 'question';
    threadId: string;
    turnId?: string;
    itemId?: string;
    method: string;
    params: unknown;
    requestedAtIso: string;
};
export type ConversationPlanState = {
    threadId: string;
    turnId?: string;
    itemId?: string;
    text: string;
    explanation?: string;
    steps?: Array<{
        step: string;
        status: 'pending' | 'inProgress' | 'completed';
    }>;
    raw: unknown;
    updatedAtIso: string;
    revision: number;
    lifecycle: 'active' | 'ended';
    possiblyStale: boolean;
};
export type ConversationActivityState = {
    label: string;
    details: string[];
    updatedAtIso: string;
};
export type ConversationContextUsageState = {
    turnId: string;
    usedTokens: number;
    inputTokens: number;
    contextWindow: number | null;
    autoCompactTokenLimit: number | null;
    compactionState: 'idle' | 'compacting' | 'compacted';
    updatedAtIso: string;
};
export type ConversationConnectionState = {
    status: 'connected' | 'disconnected';
    message: string;
    updatedAtIso: string;
};
export type ConversationTransportConnectionState = {
    status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
    reconnectAttempt: number;
    closeCode: number | null;
    closeReason: string;
    updatedAtIso: string;
};
export type ConversationHistoryState = {
    loading: boolean;
    hasMore: boolean;
    cursor: string | null;
    requestRevision: number;
    error: string;
    loadedAtIso: string;
};
export type ConversationPresentationRef = {
    id: string;
    kind: 'message' | 'timeline' | 'plan' | 'request' | 'failure' | 'interrupted' | 'worked';
    turnId?: string;
};
export type ConversationState = {
    threadId: string;
    activeTurnId: string;
    turns: Record<string, ConversationTurnState>;
    messages: ConversationMessage[];
    timeline: ConversationTimelineEntry[];
    reasoningText: string;
    plan: ConversationPlanState | null;
    activity: ConversationActivityState | null;
    contextUsage: ConversationContextUsageState | null;
    pendingRequests: ConversationRequest[];
    connection: ConversationConnectionState;
    /** Browser/client transport only. It never changes native Runtime or Turn state. */
    transportConnection: ConversationTransportConnectionState;
    history: ConversationHistoryState;
    /** Protocol order across messages, tools, plans, requests and turn receipts. */
    presentation: ConversationPresentationRef[];
    appliedEventIds: string[];
};
export type ConversationLiveOverlay = {
    activityLabel: string;
    activityDetails: string[];
    reasoningText: string;
    errorText: string;
};
/** Assistant and plan messages that should overlay durable history. */
export declare function conversationOverlayMessagesFromState(state: ConversationState): ConversationMessage[];
/** Returns the last completed assistant response without exposing native payload shapes. */
export declare function latestAssistantTextFromEvents(events: readonly CodexEvent[]): string;
/** Selects the authoritative terminal transition from one normalized event batch. */
export declare function latestTerminalTurnEvent(events: readonly CodexEvent[]): CodexEvent | null;
export type ConversationFeedEntry = {
    id: string;
    kind: 'message';
    turnId?: string;
    message: ConversationMessage;
} | {
    id: string;
    kind: 'timeline';
    turnId?: string;
    entry: ConversationTimelineEntry;
} | {
    id: string;
    kind: 'plan';
    turnId?: string;
    plan: ConversationPlanState;
} | {
    id: string;
    kind: 'request';
    turnId?: string;
    request: ConversationRequest;
} | {
    id: string;
    kind: 'turn';
    turnId: string;
    status: 'completed' | 'failed' | 'interrupted';
    durationMs: number | null;
    error: string;
} | {
    id: string;
    kind: 'activity';
    turnId: string;
    status: 'running' | 'retrying' | 'waiting' | 'disconnected';
    label: string;
    detail: string;
};
export declare function createConversationState(threadId?: string): ConversationState;
/** Applies normalized live and history events through the same deterministic state transition path. */
export declare function reduceConversationEvent(previous: ConversationState, event: CodexEvent): ConversationState;
export declare function reduceConversationEvents(initial: ConversationState, events: readonly CodexEvent[]): ConversationState;
export type ConversationStateRegistry = Readonly<Record<string, ConversationState>>;
/**
 * Reduces a mixed stream for any number of threads while preserving referential
 * identity for every untouched thread. Products can keep one shared App Server
 * subscription without rebuilding per-thread reducers.
 */
export declare function reduceConversationRegistryEvents(previous: ConversationStateRegistry, events: readonly CodexEvent[]): ConversationStateRegistry;
export declare function conversationStateFromRegistry(registry: ConversationStateRegistry, threadId: string): ConversationState;
export declare function conversationLiveOverlayFromState(state: ConversationState): ConversationLiveOverlay | null;
export declare function pruneConversationStateRegistry(registry: ConversationStateRegistry, activeThreadIds: ReadonlySet<string>): ConversationStateRegistry;
/**
 * Selects one protocol-ordered, framework-neutral feed from reducer state.
 * Renderers may group or localize entries, but must not rebuild ordering or
 * terminal/activity semantics independently.
 */
export declare function conversationFeedFromState(state: ConversationState): ConversationFeedEntry[];
/**
 * Flattens the shared feed into a transport-friendly transcript. Interactive
 * requests and transient activity stay in their typed state channels.
 */
export declare function conversationTranscriptFromState(state: ConversationState): ConversationMessage[];
//# sourceMappingURL=index.d.ts.map