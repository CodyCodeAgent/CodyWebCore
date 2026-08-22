/** Stable, framework-neutral boundary for the Codex App Server JSON-RPC protocol. */
export type JsonRecord = Record<string, unknown>;
export type RpcRequest = {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params?: unknown;
};
export type RpcError = {
    code: number;
    message: string;
    data?: unknown;
};
export type RpcResponse = {
    jsonrpc?: '2.0';
    id?: number | string | null;
    result?: unknown;
    error?: RpcError;
    method?: string;
    params?: unknown;
};
export type RuntimeNotification = {
    method: string;
    params: unknown;
    receivedAtIso: string;
};
export type ServerRequest = RuntimeNotification & {
    id: number;
};
export type CapabilitySet = {
    protocolVersion: string;
    supports: ReadonlySet<string>;
};
export type ProtocolMethod = 'initialize' | 'thread/start' | 'thread/resume' | 'thread/read' | 'thread/settings/update' | 'turn/start' | 'turn/steer' | 'turn/interrupt' | 'model/list' | 'skills/list';
export declare const READ_RECOVERY_METHODS: Set<string>;
export declare function asRecord(value: unknown): JsonRecord | null;
export declare function readString(value: unknown): string;
export declare function readNestedString(value: unknown, paths: readonly string[][]): string;
export declare function readThreadId(params: unknown): string;
export declare function readTurnId(params: unknown): string;
export declare function readItemId(params: unknown): string;
export declare function normalizeRpcResponse(value: unknown): RpcResponse | null;
export declare function isServerRequest(response: RpcResponse): response is RpcResponse & {
    id: number;
    method: string;
};
export declare function isNotification(response: RpcResponse): response is RpcResponse & {
    method: string;
};
export declare function capabilitySet(methods: Iterable<string>, protocolVersion?: string): CapabilitySet;
export declare function hasCapability(capabilities: CapabilitySet | undefined, method: string): boolean;
//# sourceMappingURL=index.d.ts.map