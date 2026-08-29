import type { CollaborationModeListParams } from './generated/v2/CollaborationModeListParams.js'
import type { CollaborationModeListResponse } from './generated/v2/CollaborationModeListResponse.js'
import type { ModelListParams } from './generated/v2/ModelListParams.js'
import type { ModelListResponse } from './generated/v2/ModelListResponse.js'
import type { SkillsListParams } from './generated/v2/SkillsListParams.js'
import type { SkillsListResponse } from './generated/v2/SkillsListResponse.js'
import type { ThreadListParams } from './generated/v2/ThreadListParams.js'
import type { ThreadListResponse } from './generated/v2/ThreadListResponse.js'
import type { ThreadLoadedListParams } from './generated/v2/ThreadLoadedListParams.js'
import type { ThreadLoadedListResponse } from './generated/v2/ThreadLoadedListResponse.js'
import type { ThreadReadParams } from './generated/v2/ThreadReadParams.js'
import type { ThreadReadResponse } from './generated/v2/ThreadReadResponse.js'
import type { ThreadResumeParams } from './generated/v2/ThreadResumeParams.js'
import type { ThreadResumeResponse } from './generated/v2/ThreadResumeResponse.js'
import type { ThreadStartParams } from './generated/v2/ThreadStartParams.js'
import type { ThreadStartResponse } from './generated/v2/ThreadStartResponse.js'
import type { ThreadGoalClearParams } from './generated/v2/ThreadGoalClearParams.js'
import type { ThreadGoalClearResponse } from './generated/v2/ThreadGoalClearResponse.js'
import type { ThreadGoalSetParams } from './generated/v2/ThreadGoalSetParams.js'
import type { ThreadGoalSetResponse } from './generated/v2/ThreadGoalSetResponse.js'
import type { ThreadSettingsUpdateParams } from './generated/v2/ThreadSettingsUpdateParams.js'
import type { ThreadSettingsUpdateResponse } from './generated/v2/ThreadSettingsUpdateResponse.js'
import type { ThreadForkParams } from './generated/v2/ThreadForkParams.js'
import type { ThreadForkResponse } from './generated/v2/ThreadForkResponse.js'
import type { ThreadSetNameParams } from './generated/v2/ThreadSetNameParams.js'
import type { ThreadSetNameResponse } from './generated/v2/ThreadSetNameResponse.js'
import type { ThreadCompactStartParams } from './generated/v2/ThreadCompactStartParams.js'
import type { ThreadCompactStartResponse } from './generated/v2/ThreadCompactStartResponse.js'
import type { TurnInterruptParams } from './generated/v2/TurnInterruptParams.js'
import type { TurnInterruptResponse } from './generated/v2/TurnInterruptResponse.js'
import type { TurnStartParams } from './generated/v2/TurnStartParams.js'
import type { TurnStartResponse } from './generated/v2/TurnStartResponse.js'
import type { TurnSteerParams } from './generated/v2/TurnSteerParams.js'
import type { TurnSteerResponse } from './generated/v2/TurnSteerResponse.js'

/** Methods whose wire shapes are generated from the bundled App Server schema. */
export interface CodexMethodMap {
  'thread/start': { params: ThreadStartParams; result: ThreadStartResponse }
  'thread/resume': { params: ThreadResumeParams; result: ThreadResumeResponse }
  'thread/fork': { params: ThreadForkParams; result: ThreadForkResponse }
  'thread/name/set': { params: ThreadSetNameParams; result: ThreadSetNameResponse }
  'thread/compact/start': { params: ThreadCompactStartParams; result: ThreadCompactStartResponse }
  'thread/list': { params: ThreadListParams; result: ThreadListResponse }
  'thread/loaded/list': { params: ThreadLoadedListParams; result: ThreadLoadedListResponse }
  'thread/read': { params: ThreadReadParams; result: ThreadReadResponse }
  'thread/settings/update': { params: ThreadSettingsUpdateParams; result: ThreadSettingsUpdateResponse }
  'thread/goal/set': { params: ThreadGoalSetParams; result: ThreadGoalSetResponse }
  'thread/goal/clear': { params: ThreadGoalClearParams; result: ThreadGoalClearResponse }
  'turn/start': { params: TurnStartParams; result: TurnStartResponse }
  'turn/steer': { params: TurnSteerParams; result: TurnSteerResponse }
  'turn/interrupt': { params: TurnInterruptParams; result: TurnInterruptResponse }
  'model/list': { params: ModelListParams; result: ModelListResponse }
  'skills/list': { params: SkillsListParams; result: SkillsListResponse }
  'collaborationMode/list': { params: CollaborationModeListParams; result: CollaborationModeListResponse }
}

export type CodexMethod = keyof CodexMethodMap
export type CodexMethodParams<M extends CodexMethod> = CodexMethodMap[M]['params']
export type CodexMethodResult<M extends CodexMethod> = CodexMethodMap[M]['result']

/** Structural interface implemented by the process host and by deterministic test fixtures. */
export interface CodexRpcCaller {
  call<T>(method: string, params?: unknown, options?: { timeoutMs?: number }): Promise<T>
}

export interface TypedCodexClient {
  call<M extends CodexMethod>(method: M, params: CodexMethodParams<M>, options?: { timeoutMs?: number }): Promise<CodexMethodResult<M>>
  callExtension<T>(method: string, params?: unknown, options?: { timeoutMs?: number }): Promise<T>
}

export function createTypedCodexClient(rpc: CodexRpcCaller): TypedCodexClient {
  return {
    call(method, params, options) {
      return rpc.call(method, params, options)
    },
    callExtension(method, params, options) {
      return rpc.call(method, params, options)
    },
  }
}

export const COMMAND_APPROVAL_REQUEST_METHOD = 'item/commandExecution/requestApproval'
export const FILE_CHANGE_APPROVAL_REQUEST_METHOD = 'item/fileChange/requestApproval'
export const TOOL_USER_INPUT_REQUEST_METHOD = 'item/tool/requestUserInput'
export const TOOL_CALL_REQUEST_METHOD = 'item/tool/call'
export const PERMISSIONS_APPROVAL_REQUEST_METHOD = 'item/permissions/requestApproval'
export const LEGACY_APPLY_PATCH_APPROVAL_REQUEST_METHOD = 'applyPatchApproval'
export const LEGACY_EXEC_COMMAND_APPROVAL_REQUEST_METHOD = 'execCommandApproval'

export function isCommandApprovalRequestMethod(method: string): boolean {
  return method === COMMAND_APPROVAL_REQUEST_METHOD
}

export function isFileChangeApprovalRequestMethod(method: string): boolean {
  return method === FILE_CHANGE_APPROVAL_REQUEST_METHOD
}

export function isApprovalRequestMethod(method: string): boolean {
  return isCommandApprovalRequestMethod(method)
    || isFileChangeApprovalRequestMethod(method)
    || method === PERMISSIONS_APPROVAL_REQUEST_METHOD
    || method === LEGACY_APPLY_PATCH_APPROVAL_REQUEST_METHOD
    || method === LEGACY_EXEC_COMMAND_APPROVAL_REQUEST_METHOD
}

export function isToolUserInputRequestMethod(method: string): boolean {
  return method === TOOL_USER_INPUT_REQUEST_METHOD
}

export function isToolCallRequestMethod(method: string): boolean {
  return method === TOOL_CALL_REQUEST_METHOD
}
