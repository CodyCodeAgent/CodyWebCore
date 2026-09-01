import type { CollaborationModeListParams } from './generated/v2/CollaborationModeListParams.js';
import type { CollaborationModeListResponse } from './generated/v2/CollaborationModeListResponse.js';
import type { ConfigReadParams } from './generated/v2/ConfigReadParams.js';
import type { ConfigReadResponse } from './generated/v2/ConfigReadResponse.js';
import type { GetAccountRateLimitsResponse } from './generated/v2/GetAccountRateLimitsResponse.js';
import type { McpServerRefreshResponse } from './generated/v2/McpServerRefreshResponse.js';
import type { ModelListParams } from './generated/v2/ModelListParams.js';
import type { ModelListResponse } from './generated/v2/ModelListResponse.js';
import type { SkillsListParams } from './generated/v2/SkillsListParams.js';
import type { SkillsListResponse } from './generated/v2/SkillsListResponse.js';
import type { ThreadListParams } from './generated/v2/ThreadListParams.js';
import type { ThreadListResponse } from './generated/v2/ThreadListResponse.js';
import type { ThreadLoadedListParams } from './generated/v2/ThreadLoadedListParams.js';
import type { ThreadLoadedListResponse } from './generated/v2/ThreadLoadedListResponse.js';
import type { ThreadReadParams } from './generated/v2/ThreadReadParams.js';
import type { ThreadReadResponse } from './generated/v2/ThreadReadResponse.js';
import type { ThreadResumeParams } from './generated/v2/ThreadResumeParams.js';
import type { ThreadResumeResponse } from './generated/v2/ThreadResumeResponse.js';
import type { ThreadStartParams } from './generated/v2/ThreadStartParams.js';
import type { ThreadStartResponse } from './generated/v2/ThreadStartResponse.js';
import type { ThreadGoalClearParams } from './generated/v2/ThreadGoalClearParams.js';
import type { ThreadGoalClearResponse } from './generated/v2/ThreadGoalClearResponse.js';
import type { ThreadGoalSetParams } from './generated/v2/ThreadGoalSetParams.js';
import type { ThreadGoalSetResponse } from './generated/v2/ThreadGoalSetResponse.js';
import type { ThreadGoalGetParams } from './generated/v2/ThreadGoalGetParams.js';
import type { ThreadGoalGetResponse } from './generated/v2/ThreadGoalGetResponse.js';
import type { ThreadSettingsUpdateParams } from './generated/v2/ThreadSettingsUpdateParams.js';
import type { ThreadSettingsUpdateResponse } from './generated/v2/ThreadSettingsUpdateResponse.js';
import type { ThreadForkParams } from './generated/v2/ThreadForkParams.js';
import type { ThreadForkResponse } from './generated/v2/ThreadForkResponse.js';
import type { ThreadSetNameParams } from './generated/v2/ThreadSetNameParams.js';
import type { ThreadSetNameResponse } from './generated/v2/ThreadSetNameResponse.js';
import type { ThreadCompactStartParams } from './generated/v2/ThreadCompactStartParams.js';
import type { ThreadCompactStartResponse } from './generated/v2/ThreadCompactStartResponse.js';
import type { ThreadArchiveParams } from './generated/v2/ThreadArchiveParams.js';
import type { ThreadArchiveResponse } from './generated/v2/ThreadArchiveResponse.js';
import type { SkillsConfigWriteParams } from './generated/v2/SkillsConfigWriteParams.js';
import type { SkillsConfigWriteResponse } from './generated/v2/SkillsConfigWriteResponse.js';
import type { TurnInterruptParams } from './generated/v2/TurnInterruptParams.js';
import type { TurnInterruptResponse } from './generated/v2/TurnInterruptResponse.js';
import type { TurnStartParams } from './generated/v2/TurnStartParams.js';
import type { TurnStartResponse } from './generated/v2/TurnStartResponse.js';
import type { TurnSteerParams } from './generated/v2/TurnSteerParams.js';
import type { TurnSteerResponse } from './generated/v2/TurnSteerResponse.js';
/** Methods whose wire shapes are generated from the bundled App Server schema. */
export interface CodexMethodMap {
    'thread/start': {
        params: ThreadStartParams;
        result: ThreadStartResponse;
    };
    'thread/resume': {
        params: ThreadResumeParams;
        result: ThreadResumeResponse;
    };
    'thread/fork': {
        params: ThreadForkParams;
        result: ThreadForkResponse;
    };
    'thread/name/set': {
        params: ThreadSetNameParams;
        result: ThreadSetNameResponse;
    };
    'thread/compact/start': {
        params: ThreadCompactStartParams;
        result: ThreadCompactStartResponse;
    };
    'thread/archive': {
        params: ThreadArchiveParams;
        result: ThreadArchiveResponse;
    };
    'thread/list': {
        params: ThreadListParams;
        result: ThreadListResponse;
    };
    'thread/loaded/list': {
        params: ThreadLoadedListParams;
        result: ThreadLoadedListResponse;
    };
    'thread/read': {
        params: ThreadReadParams;
        result: ThreadReadResponse;
    };
    'thread/settings/update': {
        params: ThreadSettingsUpdateParams;
        result: ThreadSettingsUpdateResponse;
    };
    'thread/goal/set': {
        params: ThreadGoalSetParams;
        result: ThreadGoalSetResponse;
    };
    'thread/goal/get': {
        params: ThreadGoalGetParams;
        result: ThreadGoalGetResponse;
    };
    'thread/goal/clear': {
        params: ThreadGoalClearParams;
        result: ThreadGoalClearResponse;
    };
    'turn/start': {
        params: TurnStartParams;
        result: TurnStartResponse;
    };
    'turn/steer': {
        params: TurnSteerParams;
        result: TurnSteerResponse;
    };
    'turn/interrupt': {
        params: TurnInterruptParams;
        result: TurnInterruptResponse;
    };
    'model/list': {
        params: ModelListParams;
        result: ModelListResponse;
    };
    'skills/list': {
        params: SkillsListParams;
        result: SkillsListResponse;
    };
    'skills/config/write': {
        params: SkillsConfigWriteParams;
        result: SkillsConfigWriteResponse;
    };
    'collaborationMode/list': {
        params: CollaborationModeListParams;
        result: CollaborationModeListResponse;
    };
    'config/read': {
        params: ConfigReadParams;
        result: ConfigReadResponse;
    };
    'config/mcpServer/reload': {
        params: undefined;
        result: McpServerRefreshResponse;
    };
    'account/rateLimits/read': {
        params: undefined;
        result: GetAccountRateLimitsResponse;
    };
}
export type CodexMethod = keyof CodexMethodMap;
export type CodexMethodParams<M extends CodexMethod> = CodexMethodMap[M]['params'];
export type CodexMethodResult<M extends CodexMethod> = CodexMethodMap[M]['result'];
/** Structural interface implemented by the process host and by deterministic test fixtures. */
export interface CodexRpcCaller {
    call<T>(method: string, params?: unknown, options?: {
        timeoutMs?: number;
    }): Promise<T>;
}
export interface TypedCodexClient {
    call<M extends CodexMethod>(method: M, params: CodexMethodParams<M>, options?: {
        timeoutMs?: number;
    }): Promise<CodexMethodResult<M>>;
    callExtension<T>(method: string, params?: unknown, options?: {
        timeoutMs?: number;
    }): Promise<T>;
}
export declare function createTypedCodexClient(rpc: CodexRpcCaller): TypedCodexClient;
export declare const COMMAND_APPROVAL_REQUEST_METHOD = "item/commandExecution/requestApproval";
export declare const FILE_CHANGE_APPROVAL_REQUEST_METHOD = "item/fileChange/requestApproval";
export declare const TOOL_USER_INPUT_REQUEST_METHOD = "item/tool/requestUserInput";
export declare const TOOL_CALL_REQUEST_METHOD = "item/tool/call";
export declare const PERMISSIONS_APPROVAL_REQUEST_METHOD = "item/permissions/requestApproval";
export declare const LEGACY_APPLY_PATCH_APPROVAL_REQUEST_METHOD = "applyPatchApproval";
export declare const LEGACY_EXEC_COMMAND_APPROVAL_REQUEST_METHOD = "execCommandApproval";
export declare function isCommandApprovalRequestMethod(method: string): boolean;
export declare function isFileChangeApprovalRequestMethod(method: string): boolean;
export declare function isApprovalRequestMethod(method: string): boolean;
export declare function isToolUserInputRequestMethod(method: string): boolean;
export declare function isToolCallRequestMethod(method: string): boolean;
//# sourceMappingURL=methods.d.ts.map