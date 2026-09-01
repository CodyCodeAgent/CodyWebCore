import { TOOL_CALL_REQUEST_METHOD, TOOL_USER_INPUT_REQUEST_METHOD } from '../protocol/index.js';
import { type ApprovalDecision, type ApprovalDecisionScope, type ApprovalRiskSummary, type ApprovalRiskTranslator, type CommandPolicyEvaluation, type FileChangePolicyEvaluation } from './approval-risk.js';
import type { ConversationRequest } from '../conversation/index.js';
export { TOOL_CALL_REQUEST_METHOD, TOOL_USER_INPUT_REQUEST_METHOD };
export declare const GLOBAL_SERVER_REQUEST_SCOPE = "__global__";
export type NormalizedServerRequest = {
    id: number;
    method: string;
    threadId: string;
    turnId: string;
    itemId: string;
    receivedAtIso: string;
    params: unknown;
    commandPolicy?: CommandPolicyEvaluation | null;
    fileChangePolicy?: FileChangePolicyEvaluation | null;
};
export type ServerRequestReply = {
    id: number;
    approvalScope?: ApprovalDecisionScope;
    result?: unknown;
    error?: {
        code?: number;
        message: string;
    };
};
export type ServerRequestKind = 'command_approval' | 'file_change_approval' | 'tool_user_input' | 'tool_call' | 'unknown';
export type ServerRequestCard<TRequest extends NormalizedServerRequest = NormalizedServerRequest> = {
    request: TRequest;
    summary: ApprovalRiskSummary;
    kind: ServerRequestKind;
    isApprovalRequest: boolean;
};
export type ServerRequestRiskCounts = {
    high: number;
    medium: number;
};
export type ServerRequestBadgeTone = 'high' | 'medium' | 'low';
export type ServerRequestsByThreadId<TRequest extends NormalizedServerRequest = NormalizedServerRequest> = Record<string, TRequest[]>;
export declare function normalizeServerRequest(value: unknown, options?: {
    receivedAtIso?: string;
}): NormalizedServerRequest | null;
/**
 * Projects an approval/question already owned by the conversation reducer into
 * the UI card contract. Products must not rebuild a second pending-request
 * store from a separate polling endpoint: the request in ConversationState is
 * the one that is ordered and cleared with its Turn.
 */
export declare function normalizeConversationRequest(request: ConversationRequest): NormalizedServerRequest | null;
export declare function readResolvedServerRequestId(value: unknown): number | null;
export declare function upsertServerRequest<TRequest extends NormalizedServerRequest>(requestsByThreadId: ServerRequestsByThreadId<TRequest>, request: TRequest): ServerRequestsByThreadId<TRequest>;
export declare function removeServerRequestById<TRequest extends NormalizedServerRequest>(requestsByThreadId: ServerRequestsByThreadId<TRequest>, requestId: number): ServerRequestsByThreadId<TRequest>;
export declare function pruneServerRequestsToThreads<TRequest extends NormalizedServerRequest>(requestsByThreadId: ServerRequestsByThreadId<TRequest>, activeThreadIds: ReadonlySet<string>): ServerRequestsByThreadId<TRequest>;
export declare function selectServerRequestsForThread<TRequest extends NormalizedServerRequest>(requestsByThreadId: ServerRequestsByThreadId<TRequest>, threadId: string): TRequest[];
export declare function flattenServerRequests<TRequest extends NormalizedServerRequest>(requestsByThreadId: ServerRequestsByThreadId<TRequest>): TRequest[];
export declare function serverRequestKind(method: string): ServerRequestKind;
export declare function isServerApprovalRequestKind(kind: ServerRequestKind): boolean;
export declare function isServerApprovalRequest(request: Pick<NormalizedServerRequest, 'method'>): boolean;
export declare function serverRequestActionKeyPrefix(kind: ServerRequestKind): string;
export declare function buildServerRequestCards<TRequest extends NormalizedServerRequest>(requests: readonly TRequest[], translator?: ApprovalRiskTranslator): Array<ServerRequestCard<TRequest>>;
export declare function formatServerRequestTime(value: string, format?: 'short' | 'long'): string;
export declare function serverRequestMetaLabel(input: {
    request: Pick<NormalizedServerRequest, 'id' | 'threadId' | 'receivedAtIso'>;
    idPrefix?: string;
    includeThread?: boolean;
    timeFormat?: 'short' | 'long';
}): string;
export declare function serverRequestRiskCounts(cards: ReadonlyArray<Pick<ServerRequestCard, 'summary'>>): ServerRequestRiskCounts;
export declare function serverRequestBadgeTone(cards: ReadonlyArray<Pick<ServerRequestCard, 'summary'>>): ServerRequestBadgeTone;
export declare function serverRequestApprovalCenterSummary(cards: ReadonlyArray<Pick<ServerRequestCard, 'summary'>>): string;
export declare function approvalGrantSummaryText(cwd: string, grants: ReadonlyArray<{
    scope: ApprovalDecisionScope;
}>): string;
export declare function buildApprovalDecisionReply(requestId: number, decision: ApprovalDecision): ServerRequestReply;
export declare function buildApprovalScopeReply(requestId: number, scope: ApprovalDecisionScope): ServerRequestReply;
export declare function buildEmptyServerRequestReply(requestId: number): ServerRequestReply;
export declare function buildRejectedServerRequestReply(requestId: number, message: string): ServerRequestReply;
//# sourceMappingURL=server-requests.d.ts.map