import { describe, expect, it } from 'vitest'
import type { NormalizedServerRequest } from '../src/presentation/index.js'
import {
  GLOBAL_SERVER_REQUEST_SCOPE,
  TOOL_CALL_REQUEST_METHOD,
  TOOL_USER_INPUT_REQUEST_METHOD,
  approvalGrantSummaryText,
  buildApprovalDecisionReply,
  buildApprovalScopeReply,
  buildEmptyServerRequestReply,
  buildRejectedServerRequestReply,
  buildServerRequestCards,
  flattenServerRequests,
  formatServerRequestTime,
  isServerApprovalRequest,
  isServerApprovalRequestKind,
  normalizeServerRequest,
  pruneServerRequestsToThreads,
  readResolvedServerRequestId,
  removeServerRequestById,
  selectServerRequestsForThread,
  serverRequestActionKeyPrefix,
  serverRequestApprovalCenterSummary,
  serverRequestBadgeTone,
  serverRequestKind,
  serverRequestMetaLabel,
  serverRequestRiskCounts,
  upsertServerRequest,
} from '../src/presentation/index.js'

function request(overrides: Partial<NormalizedServerRequest> = {}): NormalizedServerRequest {
  return {
    id: 1,
    method: 'item/commandExecution/requestApproval',
    threadId: 'thread-1',
    turnId: 'turn-1',
    itemId: 'item-1',
    receivedAtIso: '2026-07-07T12:00:00.000Z',
    params: { command: 'npm test' },
    ...overrides,
  }
}

describe('server request normalization and store', () => {
  it('normalizes camel- and snake-case protocol fields and preserves policy evidence', () => {
    const commandPolicy = { status: 'blocked' as const, reason: 'outside writable roots' }
    expect(normalizeServerRequest({
      id: 5,
      method: 'approval',
      received_at_iso: '2026-07-07T01:00:00.000Z',
      params: { turn_id: 'turn-1', item_id: 'item-1' },
      commandPolicy,
    })).toEqual({
      id: 5,
      method: 'approval',
      threadId: GLOBAL_SERVER_REQUEST_SCOPE,
      turnId: 'turn-1',
      itemId: 'item-1',
      receivedAtIso: '2026-07-07T01:00:00.000Z',
      params: { turn_id: 'turn-1', item_id: 'item-1' },
      commandPolicy,
    })

    expect(normalizeServerRequest({
      id: 6,
      method: TOOL_USER_INPUT_REQUEST_METHOD,
      params: { threadId: 'thread-2', turnId: 'turn-2', itemId: 'item-2' },
    }, { receivedAtIso: '2026-07-07T02:00:00.000Z' })).toMatchObject({
      threadId: 'thread-2',
      turnId: 'turn-2',
      itemId: 'item-2',
      receivedAtIso: '2026-07-07T02:00:00.000Z',
    })
    expect(normalizeServerRequest({ id: 'bad', method: 'approval' })).toBeNull()
    expect(normalizeServerRequest({ id: 1, method: '' })).toBeNull()
  })

  it('reads only integer request identities', () => {
    expect(readResolvedServerRequestId({ id: 42 })).toBe(42)
    expect(readResolvedServerRequestId({ requestId: 43 })).toBe(43)
    expect(readResolvedServerRequestId({ request_id: 44 })).toBe(44)
    expect(readResolvedServerRequestId({ id: 1.5 })).toBeNull()
    expect(readResolvedServerRequestId({ id: '42' })).toBeNull()
  })

  it('owns immutable upsert, ordering, removal, pruning and selection', () => {
    const late = request({ id: 2, receivedAtIso: '2026-07-07T02:00:00.000Z' })
    const early = request({ id: 1, receivedAtIso: '2026-07-07T01:00:00.000Z' })
    const global = request({ id: 3, threadId: GLOBAL_SERVER_REQUEST_SCOPE, receivedAtIso: '2026-07-07T03:00:00.000Z' })
    const other = request({ id: 4, threadId: 'thread-2', receivedAtIso: '2026-07-07T00:00:00.000Z' })
    let state = upsertServerRequest({}, late)
    state = upsertServerRequest(state, early)
    state = upsertServerRequest(state, global)
    state = upsertServerRequest(state, other)

    expect(state['thread-1'].map(row => row.id)).toEqual([1, 2])
    expect(upsertServerRequest(state, other)).toBe(state)
    expect(selectServerRequestsForThread(state, 'thread-1').map(row => row.id)).toEqual([1, 2, 3])
    expect(flattenServerRequests(state).map(row => row.id)).toEqual([4, 1, 2, 3])

    const pruned = pruneServerRequestsToThreads(state, new Set(['thread-1']))
    expect(Object.keys(pruned).sort()).toEqual([GLOBAL_SERVER_REQUEST_SCOPE, 'thread-1'].sort())
    expect(pruneServerRequestsToThreads(state, new Set(['thread-1', 'thread-2']))).toBe(state)
    expect(removeServerRequestById(state, 99)).toBe(state)
    expect(flattenServerRequests(removeServerRequestById(state, 2)).map(row => row.id)).toEqual([4, 1, 3])
  })
})

describe('server request presentation and replies', () => {
  it('classifies request kinds and action identities', () => {
    expect(serverRequestKind('item/commandExecution/requestApproval')).toBe('command_approval')
    expect(serverRequestKind('item/fileChange/requestApproval')).toBe('file_change_approval')
    expect(serverRequestKind(TOOL_USER_INPUT_REQUEST_METHOD)).toBe('tool_user_input')
    expect(serverRequestKind(TOOL_CALL_REQUEST_METHOD)).toBe('tool_call')
    expect(serverRequestKind('custom/request')).toBe('unknown')
    expect(isServerApprovalRequestKind('command_approval')).toBe(true)
    expect(isServerApprovalRequest(request())).toBe(true)
    expect(isServerApprovalRequest(request({ method: TOOL_CALL_REQUEST_METHOD }))).toBe(false)
    expect(serverRequestActionKeyPrefix('command_approval')).toBe('command')
    expect(serverRequestActionKeyPrefix('file_change_approval')).toBe('file')
    expect(serverRequestActionKeyPrefix('tool_call')).toBe('request')
  })

  it('builds risk cards, counts and compact approval-center copy', () => {
    const cards = buildServerRequestCards([
      request({ params: { command: 'rm -rf dist' } }),
      request({ id: 2, method: 'item/fileChange/requestApproval', params: { grantRoot: '/repo' } }),
    ])
    expect(cards[0]).toMatchObject({ kind: 'command_approval', isApprovalRequest: true })
    expect(serverRequestRiskCounts(cards)).toEqual({ high: 1, medium: 1 })
    expect(serverRequestBadgeTone(cards)).toBe('high')
    expect(serverRequestBadgeTone([])).toBe('low')
    expect(serverRequestApprovalCenterSummary([])).toBe('No local command, file, or tool approvals are waiting.')
    expect(serverRequestApprovalCenterSummary(cards)).toBe('1 high risk · 1 medium · respond without leaving the workspace')
  })

  it('formats metadata and reusable approval grants', () => {
    const row = request({ id: 7, threadId: '', receivedAtIso: 'not-a-date' })
    expect(formatServerRequestTime('not-a-date')).toBe('not-a-date')
    expect(serverRequestMetaLabel({ request: row })).toBe('#7 · not-a-date')
    expect(serverRequestMetaLabel({ request: row, idPrefix: 'Request #', includeThread: true })).toBe('Request #7 · global · not-a-date')
    expect(approvalGrantSummaryText('', [])).toBe('Choose a workspace to inspect reusable approvals.')
    expect(approvalGrantSummaryText('/repo', [])).toBe('Exact-match workspace and permanent grants will appear here.')
    expect(approvalGrantSummaryText('/repo', [{ scope: 'workspace' }, { scope: 'permanent' }])).toBe('2 active · 1 permanent')
  })

  it('builds canonical protocol replies', () => {
    expect(buildApprovalDecisionReply(7, 'acceptForSession')).toEqual({
      id: 7,
      approvalScope: 'session',
      result: { decision: 'acceptForSession' },
    })
    expect(buildApprovalScopeReply(7, 'workspace')).toEqual({
      id: 7,
      approvalScope: 'workspace',
      result: { decision: 'accept' },
    })
    expect(buildEmptyServerRequestReply(9)).toEqual({ id: 9, result: {} })
    expect(buildRejectedServerRequestReply(9, 'Nope')).toEqual({
      id: 9,
      error: { code: -32000, message: 'Nope' },
    })
  })
})
