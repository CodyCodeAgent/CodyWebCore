export function createTypedCodexClient(rpc) {
    return {
        call(method, params, options) {
            return rpc.call(method, params, options);
        },
        callExtension(method, params, options) {
            return rpc.call(method, params, options);
        },
    };
}
export const COMMAND_APPROVAL_REQUEST_METHOD = 'item/commandExecution/requestApproval';
export const FILE_CHANGE_APPROVAL_REQUEST_METHOD = 'item/fileChange/requestApproval';
export const TOOL_USER_INPUT_REQUEST_METHOD = 'item/tool/requestUserInput';
export const TOOL_CALL_REQUEST_METHOD = 'item/tool/call';
export const PERMISSIONS_APPROVAL_REQUEST_METHOD = 'item/permissions/requestApproval';
export const LEGACY_APPLY_PATCH_APPROVAL_REQUEST_METHOD = 'applyPatchApproval';
export const LEGACY_EXEC_COMMAND_APPROVAL_REQUEST_METHOD = 'execCommandApproval';
export function isCommandApprovalRequestMethod(method) {
    return method === COMMAND_APPROVAL_REQUEST_METHOD;
}
export function isFileChangeApprovalRequestMethod(method) {
    return method === FILE_CHANGE_APPROVAL_REQUEST_METHOD;
}
export function isApprovalRequestMethod(method) {
    return isCommandApprovalRequestMethod(method)
        || isFileChangeApprovalRequestMethod(method)
        || method === PERMISSIONS_APPROVAL_REQUEST_METHOD
        || method === LEGACY_APPLY_PATCH_APPROVAL_REQUEST_METHOD
        || method === LEGACY_EXEC_COMMAND_APPROVAL_REQUEST_METHOD;
}
export function isToolUserInputRequestMethod(method) {
    return method === TOOL_USER_INPUT_REQUEST_METHOD;
}
export function isToolCallRequestMethod(method) {
    return method === TOOL_CALL_REQUEST_METHOD;
}
//# sourceMappingURL=methods.js.map