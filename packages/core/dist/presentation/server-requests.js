import { TOOL_CALL_REQUEST_METHOD, TOOL_USER_INPUT_REQUEST_METHOD, asRecord, isCommandApprovalRequestMethod, isFileChangeApprovalRequestMethod, isToolCallRequestMethod, isToolUserInputRequestMethod, readString, } from '../protocol/index.js';
import { approvalDecisionForScope, approvalScopeForDecision, buildApprovalRiskSummary, } from './approval-risk.js';
export { TOOL_CALL_REQUEST_METHOD, TOOL_USER_INPUT_REQUEST_METHOD };
export const GLOBAL_SERVER_REQUEST_SCOPE = '__global__';
function protocolString(record, camelKey, snakeKey) {
    return readString(record?.[camelKey]) || readString(record?.[snakeKey]);
}
export function normalizeServerRequest(value, options = {}) {
    const row = asRecord(value);
    if (!row)
        return null;
    const id = row.id;
    const method = readString(row.method);
    if (typeof id !== 'number' || !Number.isInteger(id) || !method)
        return null;
    const params = row.params ?? null;
    const requestParams = asRecord(params);
    const commandPolicy = asRecord(row.commandPolicy);
    const fileChangePolicy = asRecord(row.fileChangePolicy);
    return {
        id,
        method,
        threadId: protocolString(requestParams, 'threadId', 'thread_id') || GLOBAL_SERVER_REQUEST_SCOPE,
        turnId: protocolString(requestParams, 'turnId', 'turn_id'),
        itemId: protocolString(requestParams, 'itemId', 'item_id'),
        receivedAtIso: protocolString(row, 'receivedAtIso', 'received_at_iso') || options.receivedAtIso || new Date().toISOString(),
        params,
        ...(commandPolicy ? { commandPolicy } : {}),
        ...(fileChangePolicy ? { fileChangePolicy } : {}),
    };
}
/**
 * Projects an approval/question already owned by the conversation reducer into
 * the UI card contract. Products must not rebuild a second pending-request
 * store from a separate polling endpoint: the request in ConversationState is
 * the one that is ordered and cleared with its Turn.
 */
export function normalizeConversationRequest(request) {
    const id = Number(request.id);
    if (!Number.isInteger(id))
        return null;
    const source = asRecord(request.params);
    const params = {
        ...(source ?? {}),
        threadId: request.threadId,
        ...(request.turnId ? { turnId: request.turnId } : {}),
        ...(request.itemId ? { itemId: request.itemId } : {}),
    };
    return normalizeServerRequest({
        id,
        method: request.method,
        receivedAtIso: request.requestedAtIso,
        params,
    });
}
export function readResolvedServerRequestId(value) {
    const row = asRecord(value);
    const id = row?.id ?? row?.requestId ?? row?.request_id;
    return typeof id === 'number' && Number.isInteger(id) ? id : null;
}
function requestsEqual(first, second) {
    return first.id === second.id
        && first.method === second.method
        && first.threadId === second.threadId
        && first.turnId === second.turnId
        && first.itemId === second.itemId
        && first.receivedAtIso === second.receivedAtIso
        && first.params === second.params
        && first.commandPolicy === second.commandPolicy
        && first.fileChangePolicy === second.fileChangePolicy;
}
function sortedRequests(requests) {
    return [...requests].sort((first, second) => first.receivedAtIso.localeCompare(second.receivedAtIso));
}
export function upsertServerRequest(requestsByThreadId, request) {
    const scope = request.threadId || GLOBAL_SERVER_REQUEST_SCOPE;
    const current = requestsByThreadId[scope] ?? [];
    const index = current.findIndex(row => row.id === request.id);
    if (index >= 0 && requestsEqual(current[index], request))
        return requestsByThreadId;
    const next = [...current];
    if (index >= 0)
        next.splice(index, 1, request);
    else
        next.push(request);
    return { ...requestsByThreadId, [scope]: sortedRequests(next) };
}
export function removeServerRequestById(requestsByThreadId, requestId) {
    const next = {};
    let changed = false;
    for (const [threadId, requests] of Object.entries(requestsByThreadId)) {
        const filtered = requests.filter(request => request.id !== requestId);
        if (filtered.length !== requests.length)
            changed = true;
        if (filtered.length > 0)
            next[threadId] = filtered;
    }
    return changed ? next : requestsByThreadId;
}
export function pruneServerRequestsToThreads(requestsByThreadId, activeThreadIds) {
    const next = {};
    let changed = false;
    for (const [threadId, requests] of Object.entries(requestsByThreadId)) {
        if (threadId === GLOBAL_SERVER_REQUEST_SCOPE || activeThreadIds.has(threadId))
            next[threadId] = requests;
        else
            changed = true;
    }
    return changed ? next : requestsByThreadId;
}
export function selectServerRequestsForThread(requestsByThreadId, threadId) {
    return sortedRequests([
        ...(threadId ? requestsByThreadId[threadId] ?? [] : []),
        ...(requestsByThreadId[GLOBAL_SERVER_REQUEST_SCOPE] ?? []),
    ]);
}
export function flattenServerRequests(requestsByThreadId) {
    return sortedRequests(Object.values(requestsByThreadId).flat());
}
export function serverRequestKind(method) {
    if (isCommandApprovalRequestMethod(method))
        return 'command_approval';
    if (isFileChangeApprovalRequestMethod(method))
        return 'file_change_approval';
    if (isToolUserInputRequestMethod(method))
        return 'tool_user_input';
    if (isToolCallRequestMethod(method))
        return 'tool_call';
    return 'unknown';
}
export function isServerApprovalRequestKind(kind) {
    return kind === 'command_approval' || kind === 'file_change_approval';
}
export function isServerApprovalRequest(request) {
    return isServerApprovalRequestKind(serverRequestKind(request.method));
}
export function serverRequestActionKeyPrefix(kind) {
    if (kind === 'command_approval')
        return 'command';
    if (kind === 'file_change_approval')
        return 'file';
    return 'request';
}
export function buildServerRequestCards(requests, translator) {
    return requests.map(request => ({
        request,
        summary: buildApprovalRiskSummary(request, translator),
        kind: serverRequestKind(request.method),
        isApprovalRequest: isServerApprovalRequest(request),
    }));
}
export function formatServerRequestTime(value, format = 'short') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return format === 'long' ? date.toLocaleString() : date.toLocaleTimeString();
}
export function serverRequestMetaLabel(input) {
    const parts = [`${input.idPrefix ?? '#'}${String(input.request.id)}`];
    if (input.includeThread)
        parts.push(input.request.threadId || 'global');
    parts.push(formatServerRequestTime(input.request.receivedAtIso, input.timeFormat ?? 'short'));
    return parts.join(' · ');
}
export function serverRequestRiskCounts(cards) {
    return {
        high: cards.filter(card => card.summary.level === 'high').length,
        medium: cards.filter(card => card.summary.level === 'medium').length,
    };
}
export function serverRequestBadgeTone(cards) {
    const counts = serverRequestRiskCounts(cards);
    if (counts.high > 0)
        return 'high';
    return cards.length > 0 ? 'medium' : 'low';
}
export function serverRequestApprovalCenterSummary(cards) {
    if (cards.length === 0)
        return 'No local command, file, or tool approvals are waiting.';
    const counts = serverRequestRiskCounts(cards);
    return `${String(counts.high)} high risk · ${String(counts.medium)} medium · respond without leaving the workspace`;
}
export function approvalGrantSummaryText(cwd, grants) {
    if (!cwd)
        return 'Choose a workspace to inspect reusable approvals.';
    if (grants.length === 0)
        return 'Exact-match workspace and permanent grants will appear here.';
    const permanentCount = grants.filter(grant => grant.scope === 'permanent').length;
    return `${String(grants.length)} active · ${String(permanentCount)} permanent`;
}
export function buildApprovalDecisionReply(requestId, decision) {
    return { id: requestId, approvalScope: approvalScopeForDecision(decision), result: { decision } };
}
export function buildApprovalScopeReply(requestId, scope) {
    return { id: requestId, approvalScope: scope, result: { decision: approvalDecisionForScope(scope) } };
}
export function buildEmptyServerRequestReply(requestId) {
    return { id: requestId, result: {} };
}
export function buildRejectedServerRequestReply(requestId, message) {
    return { id: requestId, error: { code: -32000, message } };
}
//# sourceMappingURL=server-requests.js.map