/** Deterministic conversation state primitives. They deliberately contain no Vue/React state. */
export type MessageRole = 'user' | 'assistant' | 'system';
export type ConversationTool = {
    kind: string;
    title: string;
    status: string;
    summary: string;
    details: string[];
    output?: string;
    outputLabel?: string;
};
export type ConversationMessage = {
    id: string;
    turnId?: string;
    role: MessageRole;
    text: string;
    images?: string[];
    skills?: Array<{
        name: string;
        path: string;
        displayName?: string;
    }>;
    outbox?: {
        status: 'queued' | 'sending' | 'failed';
        lastError?: string;
    };
    tool?: ConversationTool | null;
    messageType?: string;
    rawPayload?: unknown;
    isUnhandled?: boolean;
};
export type DataAuthority = 'overlay' | 'replace-snapshot' | 'invalidate' | 'apply-delta-then-reconcile' | 'ignore';
export declare function dataAuthorityFor(method: string): DataAuthority;
export declare function normalizeMessageText(value: string): string;
export declare function areConversationMessageFieldsEqual<T extends ConversationMessage>(first: T, second: T): boolean;
export declare function areConversationMessageArraysStable<T extends ConversationMessage>(first: T[], second: T[]): boolean;
export declare function removeDuplicateAdjacentUserMessages<T extends ConversationMessage>(messages: T[]): T[];
export declare function mergeMessages<T extends ConversationMessage>(previous: T[], incoming: T[], options?: {
    preserveMissing?: boolean;
}): T[];
export declare function upsertLiveDelta<T extends ConversationMessage>(messages: T[], input: {
    messageId: string;
    textDelta: string;
    turnId?: string;
    messageType: 'agentMessage.live' | 'plan.live';
}): T[];
export declare function removeRedundantLiveAssistantMessages<T extends ConversationMessage>(messages: T[], persisted: T[]): T[];
export declare function compactConversationMessages<T extends ConversationMessage>(messages: T[]): T[];
export declare function reconcilePersistedMessages<T extends ConversationMessage>(messages: T[], persisted: T[]): T[];
export declare function toolStatusTone(status: string): 'neutral' | 'running' | 'success' | 'danger';
export declare function previewToolOutput(output: string, maxLines?: number, maxChars?: number): {
    text: string;
    truncated: boolean;
};
export declare function formatTurnDuration(durationMs: number): string;
export declare function groupConsecutiveFileChanges<T extends ConversationMessage>(messages: T[]): Array<{
    firstIndex: number;
    messages: T[];
}>;
export type CodexEventType = 'thread.attached' | 'thread.context.updated' | 'thread.compacted' | 'turn.started' | 'turn.activity' | 'turn.retrying' | 'turn.completed' | 'turn.failed' | 'turn.interrupted' | 'user.completed' | 'assistant.delta' | 'assistant.completed' | 'reasoning.delta' | 'reasoning.break' | 'plan.delta' | 'plan.replaced' | 'tool.started' | 'tool.updated' | 'tool.completed' | 'fileChange.updated' | 'approval.requested' | 'approval.resolved' | 'question.requested' | 'question.resolved' | 'runtime.connected' | 'runtime.disconnected' | 'provider.extension';
/** Framework- and transport-neutral event emitted by the shared Codex session manager. */
export type CodexEvent = {
    id: string;
    type: CodexEventType;
    threadId: string;
    turnId?: string;
    itemId?: string;
    atIso: string;
    data: Record<string, unknown>;
};
export type TurnLifecycle = 'idle' | 'running' | 'retrying' | 'completed' | 'failed' | 'interrupted';
export type ConversationTurnState = {
    id: string;
    lifecycle: TurnLifecycle;
    startedAtIso?: string;
    completedAtIso?: string;
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
    compactionState: 'idle' | 'compacted';
    updatedAtIso: string;
};
export type ConversationConnectionState = {
    status: 'connected' | 'disconnected';
    message: string;
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
export type ConversationScrollState = {
    scrollTop: number;
    isAtBottom: boolean;
    scrollRatio?: number;
};
export type ConversationScrollMetrics = {
    maxScrollTop: number;
    scrollRatio: number;
    isAtBottom: boolean;
};
export declare const DEFAULT_VISIBLE_MESSAGE_COUNT = 80;
export declare const MESSAGE_HISTORY_PAGE_SIZE = 80;
export declare function normalizedVisibleMessageCount(messageCount: number, requestedCount: number): number;
export declare function visibleMessageStartIndex(messageCount: number, visibleCount: number): number;
export declare function hiddenMessageCount(messageCount: number, visibleCount: number): number;
export declare function nextVisibleMessageCount(messageCount: number, visibleCount: number, pageSize?: number): number;
export declare function buildConversationScrollMetrics(params: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    bottomThresholdPx: number;
}): ConversationScrollMetrics;
export declare function buildConversationScrollState(params: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    bottomThresholdPx: number;
}): ConversationScrollState;
export declare function restoredConversationScrollTop(savedState: ConversationScrollState, maxScrollTop: number): number;
export declare function preservedConversationScrollTop(savedState: ConversationScrollState, maxScrollTop: number): number;
export declare function shouldRestoreConversationToBottom(scrollState: ConversationScrollState | null): boolean;
export declare function shouldPreserveConversationViewport(scrollState: ConversationScrollState | null): scrollState is ConversationScrollState;
export declare function normalizedConversationBottomLockFrames(frames: number): number;
export declare function shouldLockConversationToBottom(scrollState: ConversationScrollState | null): boolean;
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
    status: 'running' | 'retrying' | 'waiting';
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