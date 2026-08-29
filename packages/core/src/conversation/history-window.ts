export type ConversationScrollState = {
  scrollTop: number
  isAtBottom: boolean
  scrollRatio?: number
}

export type ConversationScrollMetrics = {
  maxScrollTop: number
  scrollRatio: number
  isAtBottom: boolean
}

export const DEFAULT_VISIBLE_MESSAGE_COUNT = 80
export const MESSAGE_HISTORY_PAGE_SIZE = 80

export function normalizedVisibleMessageCount(messageCount: number, requestedCount: number): number {
  const normalizedMessageCount = Math.max(Math.trunc(messageCount), 0)
  const normalizedRequestedCount = Math.max(Math.trunc(requestedCount), DEFAULT_VISIBLE_MESSAGE_COUNT)
  return Math.min(normalizedRequestedCount, normalizedMessageCount)
}

export function visibleMessageStartIndex(messageCount: number, visibleCount: number): number {
  return Math.max(Math.trunc(messageCount) - Math.max(Math.trunc(visibleCount), 0), 0)
}

export function hiddenMessageCount(messageCount: number, visibleCount: number): number {
  return visibleMessageStartIndex(messageCount, visibleCount)
}

export function nextVisibleMessageCount(
  messageCount: number,
  visibleCount: number,
  pageSize = MESSAGE_HISTORY_PAGE_SIZE,
): number {
  const nextCount = Math.max(Math.trunc(visibleCount), 0) + Math.max(Math.trunc(pageSize), 1)
  return normalizedVisibleMessageCount(messageCount, nextCount)
}

export function buildConversationScrollMetrics(params: {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  bottomThresholdPx: number
}): ConversationScrollMetrics {
  const maxScrollTop = Math.max(params.scrollHeight - params.clientHeight, 0)
  const scrollRatio = maxScrollTop > 0
    ? Math.min(Math.max(params.scrollTop / maxScrollTop, 0), 1)
    : 1
  const distanceFromBottom = params.scrollHeight - (params.scrollTop + params.clientHeight)
  return {
    maxScrollTop,
    scrollRatio,
    isAtBottom: distanceFromBottom <= params.bottomThresholdPx,
  }
}

export function buildConversationScrollState(params: {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  bottomThresholdPx: number
}): ConversationScrollState {
  const metrics = buildConversationScrollMetrics(params)
  return {
    scrollTop: params.scrollTop,
    isAtBottom: metrics.isAtBottom,
    scrollRatio: metrics.scrollRatio,
  }
}

export function restoredConversationScrollTop(savedState: ConversationScrollState, maxScrollTop: number): number {
  const targetScrollTop = typeof savedState.scrollRatio === 'number'
    ? savedState.scrollRatio * maxScrollTop
    : savedState.scrollTop
  return Math.min(Math.max(targetScrollTop, 0), maxScrollTop)
}

export function preservedConversationScrollTop(savedState: ConversationScrollState, maxScrollTop: number): number {
  return Math.min(Math.max(savedState.scrollTop, 0), maxScrollTop)
}

export function shouldRestoreConversationToBottom(scrollState: ConversationScrollState | null): boolean {
  return !scrollState || scrollState.isAtBottom
}

export function shouldPreserveConversationViewport(
  scrollState: ConversationScrollState | null,
): scrollState is ConversationScrollState {
  return scrollState?.isAtBottom === false
}

export function normalizedConversationBottomLockFrames(frames: number): number {
  return Math.max(Math.trunc(frames), 1)
}

export function shouldLockConversationToBottom(scrollState: ConversationScrollState | null): boolean {
  return shouldRestoreConversationToBottom(scrollState)
}
