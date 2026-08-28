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
//# sourceMappingURL=methods.js.map