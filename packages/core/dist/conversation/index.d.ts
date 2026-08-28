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
    tool?: ConversationTool | null;
    messageType?: string;
    rawPayload?: unknown;
    isUnhandled?: boolean;
};
export type DataAuthority = 'overlay' | 'replace-snapshot' | 'invalidate' | 'apply-delta-then-reconcile' | 'ignore';
export declare function dataAuthorityFor(method: string): DataAuthority;
export declare function normalizeMessageText(value: string): string;
export declare function mergeMessages<T extends ConversationMessage>(previous: T[], incoming: T[], options?: {
    preserveMissing?: boolean;
}): T[];
export declare function upsertLiveDelta<T extends ConversationMessage>(messages: T[], input: {
    messageId: string;
    textDelta: string;
    turnId?: string;
    messageType: 'agentMessage.live' | 'plan.live';
}): T[];
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
export type CodexEventType = 'thread.attached' | 'turn.started' | 'turn.retrying' | 'turn.completed' | 'turn.failed' | 'turn.interrupted' | 'user.completed' | 'assistant.delta' | 'assistant.completed' | 'reasoning.delta' | 'reasoning.break' | 'plan.delta' | 'plan.replaced' | 'tool.started' | 'tool.updated' | 'tool.completed' | 'fileChange.updated' | 'approval.requested' | 'approval.resolved' | 'question.requested' | 'question.resolved' | 'runtime.connected' | 'runtime.disconnected' | 'provider.extension';
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
    turnId?: string;
    text: string;
    raw: unknown;
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
    pendingRequests: ConversationRequest[];
    connection: ConversationConnectionState;
    history: ConversationHistoryState;
    /** Protocol order across messages, tools, plans, requests and turn receipts. */
    presentation: ConversationPresentationRef[];
    appliedEventIds: string[];
};
export declare function createConversationState(threadId?: string): ConversationState;
/** Applies normalized live and history events through the same deterministic state transition path. */
export declare function reduceConversationEvent(previous: ConversationState, event: CodexEvent): ConversationState;
export declare function reduceConversationEvents(initial: ConversationState, events: readonly CodexEvent[]): ConversationState;
//# sourceMappingURL=index.d.ts.map