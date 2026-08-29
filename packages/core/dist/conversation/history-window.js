export const DEFAULT_VISIBLE_MESSAGE_COUNT = 80;
export const MESSAGE_HISTORY_PAGE_SIZE = 80;
export function normalizedVisibleMessageCount(messageCount, requestedCount) {
    const normalizedMessageCount = Math.max(Math.trunc(messageCount), 0);
    const normalizedRequestedCount = Math.max(Math.trunc(requestedCount), DEFAULT_VISIBLE_MESSAGE_COUNT);
    return Math.min(normalizedRequestedCount, normalizedMessageCount);
}
export function visibleMessageStartIndex(messageCount, visibleCount) {
    return Math.max(Math.trunc(messageCount) - Math.max(Math.trunc(visibleCount), 0), 0);
}
export function hiddenMessageCount(messageCount, visibleCount) {
    return visibleMessageStartIndex(messageCount, visibleCount);
}
export function nextVisibleMessageCount(messageCount, visibleCount, pageSize = MESSAGE_HISTORY_PAGE_SIZE) {
    const nextCount = Math.max(Math.trunc(visibleCount), 0) + Math.max(Math.trunc(pageSize), 1);
    return normalizedVisibleMessageCount(messageCount, nextCount);
}
export function buildConversationScrollMetrics(params) {
    const maxScrollTop = Math.max(params.scrollHeight - params.clientHeight, 0);
    const scrollRatio = maxScrollTop > 0
        ? Math.min(Math.max(params.scrollTop / maxScrollTop, 0), 1)
        : 1;
    const distanceFromBottom = params.scrollHeight - (params.scrollTop + params.clientHeight);
    return {
        maxScrollTop,
        scrollRatio,
        isAtBottom: distanceFromBottom <= params.bottomThresholdPx,
    };
}
export function buildConversationScrollState(params) {
    const metrics = buildConversationScrollMetrics(params);
    return {
        scrollTop: params.scrollTop,
        isAtBottom: metrics.isAtBottom,
        scrollRatio: metrics.scrollRatio,
    };
}
export function restoredConversationScrollTop(savedState, maxScrollTop) {
    const targetScrollTop = typeof savedState.scrollRatio === 'number'
        ? savedState.scrollRatio * maxScrollTop
        : savedState.scrollTop;
    return Math.min(Math.max(targetScrollTop, 0), maxScrollTop);
}
export function preservedConversationScrollTop(savedState, maxScrollTop) {
    return Math.min(Math.max(savedState.scrollTop, 0), maxScrollTop);
}
export function shouldRestoreConversationToBottom(scrollState) {
    return !scrollState || scrollState.isAtBottom;
}
export function shouldPreserveConversationViewport(scrollState) {
    return scrollState?.isAtBottom === false;
}
export function normalizedConversationBottomLockFrames(frames) {
    return Math.max(Math.trunc(frames), 1);
}
export function shouldLockConversationToBottom(scrollState) {
    return shouldRestoreConversationToBottom(scrollState);
}
//# sourceMappingURL=history-window.js.map