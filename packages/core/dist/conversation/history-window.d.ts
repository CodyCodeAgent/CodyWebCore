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
//# sourceMappingURL=history-window.d.ts.map