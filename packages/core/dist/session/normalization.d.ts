import type { CodexEvent, ConversationTool } from '../conversation/index.js';
export declare function textFromError(value: unknown): string;
export declare function contentFromUserItem(item: unknown): {
    text: string;
    images: string[];
    skills: Array<{
        name: string;
        path: string;
        displayName?: string;
    }>;
};
export declare function outputText(value: unknown): string;
export declare function readCodexStatus(value: unknown): string;
/** Canonical history/realtime tool view model for native Codex items. */
export declare function conversationToolFromItem(item: unknown, phase?: 'started' | 'updated' | 'completed'): ConversationTool | null;
export type CodexNotificationInput = {
    method: string;
    params?: unknown;
    atIso?: string;
    receivedAtIso?: string;
};
export type CodexNotificationEventIdentity = {
    method: string;
    suffix: string;
    threadId: string;
    turnId: string;
    itemId: string;
    atIso: string;
};
export type NormalizeCodexNotificationOptions = {
    fallbackThreadId?: string;
    fallbackTurnId?: string;
    includeProviderExtensions?: boolean;
    nowIso?: () => string;
    eventId?: (identity: CodexNotificationEventIdentity) => string;
};
/**
 * Converts one raw App Server notification into framework- and product-neutral
 * conversation events. This is the sole native notification interpretation
 * path used by the shared session manager and product adapters.
 */
export declare function normalizeCodexNotification(notification: CodexNotificationInput, options?: NormalizeCodexNotificationOptions): CodexEvent[];
export declare function normalizeThreadHistory(payload: unknown, fallbackThreadId?: string): CodexEvent[];
//# sourceMappingURL=normalization.d.ts.map