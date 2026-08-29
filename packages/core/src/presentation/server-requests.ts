import {
  TOOL_CALL_REQUEST_METHOD,
  TOOL_USER_INPUT_REQUEST_METHOD,
  asRecord,
  isCommandApprovalRequestMethod,
  isFileChangeApprovalRequestMethod,
  isToolCallRequestMethod,
  isToolUserInputRequestMethod,
  readString,
} from '../protocol/index.js'
import {
  approvalDecisionForScope,
  approvalScopeForDecision,
  buildApprovalRiskSummary,
  type ApprovalDecision,
  type ApprovalDecisionScope,
  type ApprovalRiskSummary,
  type ApprovalRiskTranslator,
  type CommandPolicyEvaluation,
  type FileChangePolicyEvaluation,
} from './approval-risk.js'

export { TOOL_CALL_REQUEST_METHOD, TOOL_USER_INPUT_REQUEST_METHOD }

export const GLOBAL_SERVER_REQUEST_SCOPE = '__global__'

export type NormalizedServerRequest = {
  id: number
  method: string
  threadId: string
  turnId: string
  itemId: string
  receivedAtIso: string
  params: unknown
  commandPolicy?: CommandPolicyEvaluation | null
  fileChangePolicy?: FileChangePolicyEvaluation | null
}

export type ServerRequestReply = {
  id: number
  approvalScope?: ApprovalDecisionScope
  result?: unknown
  error?: { code?: number; message: string }
}

export type ServerRequestKind =
  | 'command_approval'
  | 'file_change_approval'
  | 'tool_user_input'
  | 'tool_call'
  | 'unknown'

export type ServerRequestCard<TRequest extends NormalizedServerRequest = NormalizedServerRequest> = {
  request: TRequest
  summary: ApprovalRiskSummary
  kind: ServerRequestKind
  isApprovalRequest: boolean
}

export type ServerRequestRiskCounts = { high: number; medium: number }
export type ServerRequestBadgeTone = 'high' | 'medium' | 'low'
export type ServerRequestsByThreadId<TRequest extends NormalizedServerRequest = NormalizedServerRequest> = Record<string, TRequest[]>

function protocolString(record: Record<string, unknown> | null | undefined, camelKey: string, snakeKey: string): string {
  return readString(record?.[camelKey]) || readString(record?.[snakeKey])
}

export function normalizeServerRequest(
  value: unknown,
  options: { receivedAtIso?: string } = {},
): NormalizedServerRequest | null {
  const row = asRecord(value)
  if (!row) return null
  const id = row.id
  const method = readString(row.method)
  if (typeof id !== 'number' || !Number.isInteger(id) || !method) return null

  const params = row.params ?? null
  const requestParams = asRecord(params)
  const commandPolicy = asRecord(row.commandPolicy) as CommandPolicyEvaluation | null
  const fileChangePolicy = asRecord(row.fileChangePolicy) as FileChangePolicyEvaluation | null
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
  }
}

export function readResolvedServerRequestId(value: unknown): number | null {
  const row = asRecord(value)
  const id = row?.id ?? row?.requestId ?? row?.request_id
  return typeof id === 'number' && Number.isInteger(id) ? id : null
}

function requestsEqual(first: NormalizedServerRequest, second: NormalizedServerRequest): boolean {
  return first.id === second.id
    && first.method === second.method
    && first.threadId === second.threadId
    && first.turnId === second.turnId
    && first.itemId === second.itemId
    && first.receivedAtIso === second.receivedAtIso
    && first.params === second.params
    && first.commandPolicy === second.commandPolicy
    && first.fileChangePolicy === second.fileChangePolicy
}

function sortedRequests<TRequest extends NormalizedServerRequest>(requests: readonly TRequest[]): TRequest[] {
  return [...requests].sort((first, second) => first.receivedAtIso.localeCompare(second.receivedAtIso))
}

export function upsertServerRequest<TRequest extends NormalizedServerRequest>(
  requestsByThreadId: ServerRequestsByThreadId<TRequest>,
  request: TRequest,
): ServerRequestsByThreadId<TRequest> {
  const scope = request.threadId || GLOBAL_SERVER_REQUEST_SCOPE
  const current = requestsByThreadId[scope] ?? []
  const index = current.findIndex(row => row.id === request.id)
  if (index >= 0 && requestsEqual(current[index]!, request)) return requestsByThreadId
  const next = [...current]
  if (index >= 0) next.splice(index, 1, request)
  else next.push(request)
  return { ...requestsByThreadId, [scope]: sortedRequests(next) }
}

export function removeServerRequestById<TRequest extends NormalizedServerRequest>(
  requestsByThreadId: ServerRequestsByThreadId<TRequest>,
  requestId: number,
): ServerRequestsByThreadId<TRequest> {
  const next: ServerRequestsByThreadId<TRequest> = {}
  let changed = false
  for (const [threadId, requests] of Object.entries(requestsByThreadId)) {
    const filtered = requests.filter(request => request.id !== requestId)
    if (filtered.length !== requests.length) changed = true
    if (filtered.length > 0) next[threadId] = filtered
  }
  return changed ? next : requestsByThreadId
}

export function pruneServerRequestsToThreads<TRequest extends NormalizedServerRequest>(
  requestsByThreadId: ServerRequestsByThreadId<TRequest>,
  activeThreadIds: ReadonlySet<string>,
): ServerRequestsByThreadId<TRequest> {
  const next: ServerRequestsByThreadId<TRequest> = {}
  let changed = false
  for (const [threadId, requests] of Object.entries(requestsByThreadId)) {
    if (threadId === GLOBAL_SERVER_REQUEST_SCOPE || activeThreadIds.has(threadId)) next[threadId] = requests
    else changed = true
  }
  return changed ? next : requestsByThreadId
}

export function selectServerRequestsForThread<TRequest extends NormalizedServerRequest>(
  requestsByThreadId: ServerRequestsByThreadId<TRequest>,
  threadId: string,
): TRequest[] {
  return sortedRequests([
    ...(threadId ? requestsByThreadId[threadId] ?? [] : []),
    ...(requestsByThreadId[GLOBAL_SERVER_REQUEST_SCOPE] ?? []),
  ])
}

export function flattenServerRequests<TRequest extends NormalizedServerRequest>(
  requestsByThreadId: ServerRequestsByThreadId<TRequest>,
): TRequest[] {
  return sortedRequests(Object.values(requestsByThreadId).flat())
}

export function serverRequestKind(method: string): ServerRequestKind {
  if (isCommandApprovalRequestMethod(method)) return 'command_approval'
  if (isFileChangeApprovalRequestMethod(method)) return 'file_change_approval'
  if (isToolUserInputRequestMethod(method)) return 'tool_user_input'
  if (isToolCallRequestMethod(method)) return 'tool_call'
  return 'unknown'
}

export function isServerApprovalRequestKind(kind: ServerRequestKind): boolean {
  return kind === 'command_approval' || kind === 'file_change_approval'
}

export function isServerApprovalRequest(request: Pick<NormalizedServerRequest, 'method'>): boolean {
  return isServerApprovalRequestKind(serverRequestKind(request.method))
}

export function serverRequestActionKeyPrefix(kind: ServerRequestKind): string {
  if (kind === 'command_approval') return 'command'
  if (kind === 'file_change_approval') return 'file'
  return 'request'
}

export function buildServerRequestCards<TRequest extends NormalizedServerRequest>(
  requests: readonly TRequest[],
  translator?: ApprovalRiskTranslator,
): Array<ServerRequestCard<TRequest>> {
  return requests.map(request => ({
    request,
    summary: buildApprovalRiskSummary(request, translator),
    kind: serverRequestKind(request.method),
    isApprovalRequest: isServerApprovalRequest(request),
  }))
}

export function formatServerRequestTime(value: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return format === 'long' ? date.toLocaleString() : date.toLocaleTimeString()
}

export function serverRequestMetaLabel(input: {
  request: Pick<NormalizedServerRequest, 'id' | 'threadId' | 'receivedAtIso'>
  idPrefix?: string
  includeThread?: boolean
  timeFormat?: 'short' | 'long'
}): string {
  const parts = [`${input.idPrefix ?? '#'}${String(input.request.id)}`]
  if (input.includeThread) parts.push(input.request.threadId || 'global')
  parts.push(formatServerRequestTime(input.request.receivedAtIso, input.timeFormat ?? 'short'))
  return parts.join(' · ')
}

export function serverRequestRiskCounts(cards: ReadonlyArray<Pick<ServerRequestCard, 'summary'>>): ServerRequestRiskCounts {
  return {
    high: cards.filter(card => card.summary.level === 'high').length,
    medium: cards.filter(card => card.summary.level === 'medium').length,
  }
}

export function serverRequestBadgeTone(cards: ReadonlyArray<Pick<ServerRequestCard, 'summary'>>): ServerRequestBadgeTone {
  const counts = serverRequestRiskCounts(cards)
  if (counts.high > 0) return 'high'
  return cards.length > 0 ? 'medium' : 'low'
}

export function serverRequestApprovalCenterSummary(cards: ReadonlyArray<Pick<ServerRequestCard, 'summary'>>): string {
  if (cards.length === 0) return 'No local command, file, or tool approvals are waiting.'
  const counts = serverRequestRiskCounts(cards)
  return `${String(counts.high)} high risk · ${String(counts.medium)} medium · respond without leaving the workspace`
}

export function approvalGrantSummaryText(
  cwd: string,
  grants: ReadonlyArray<{ scope: ApprovalDecisionScope }>,
): string {
  if (!cwd) return 'Choose a workspace to inspect reusable approvals.'
  if (grants.length === 0) return 'Exact-match workspace and permanent grants will appear here.'
  const permanentCount = grants.filter(grant => grant.scope === 'permanent').length
  return `${String(grants.length)} active · ${String(permanentCount)} permanent`
}

export function buildApprovalDecisionReply(requestId: number, decision: ApprovalDecision): ServerRequestReply {
  return { id: requestId, approvalScope: approvalScopeForDecision(decision), result: { decision } }
}

export function buildApprovalScopeReply(requestId: number, scope: ApprovalDecisionScope): ServerRequestReply {
  return { id: requestId, approvalScope: scope, result: { decision: approvalDecisionForScope(scope) } }
}

export function buildEmptyServerRequestReply(requestId: number): ServerRequestReply {
  return { id: requestId, result: {} }
}

export function buildRejectedServerRequestReply(requestId: number, message: string): ServerRequestReply {
  return { id: requestId, error: { code: -32000, message } }
}
