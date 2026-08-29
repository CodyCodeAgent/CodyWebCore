/** Deterministic message reconciliation shared by every renderer and transport. */
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
//# sourceMappingURL=messages.d.ts.map