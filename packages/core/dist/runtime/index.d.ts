import { type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { type RuntimeNotification, type ServerRequest } from '../protocol/index.js';
export declare const CODY_WEB_CORE_VERSION = "0.35.1";
export type { RuntimeNotification, ServerRequest } from '../protocol/index.js';
export type RpcOptions = {
    timeoutMs?: number;
};
export type ServerRequestReply = {
    result?: unknown;
    error?: {
        code: number;
        message: string;
    };
};
export type RuntimeNotificationListener = (notification: RuntimeNotification) => void;
export type AppServerLog = {
    atIso: string;
    level: 'info' | 'warning' | 'error';
    source: 'bridge' | 'stdout' | 'stderr';
    message: string;
};
export type PendingServerRequest = ServerRequest;
export type AppServerFailurePhase = 'initialize' | 'rpc' | 'process' | 'transport' | 'protocol';
export type AppServerFailureCause = 'initialize_timeout' | 'rpc_timeout' | 'process_exit' | 'stdin_error' | 'malformed_json';
export type PendingClientRequestDiagnostic = Readonly<{
    id: number;
    method: string;
    startedAtIso: string;
    deadlineAtIso: string;
    durationMs: number;
}>;
export type PendingServerRequestDiagnostic = Readonly<{
    id: number;
    method: string;
    receivedAtIso: string;
    durationMs: number;
}>;
export type AppServerFailureDiagnostic = Readonly<{
    schemaVersion: 1;
    capturedAtIso: string;
    phase: AppServerFailurePhase;
    cause: AppServerFailureCause;
    failedMethod: string | null;
    message: string;
    process: Readonly<{
        status: 'running' | 'stopped';
        lifecycle: 'not_started' | 'running' | 'unavailable' | 'disposed';
        startCount: number;
        unavailableReason: string | null;
        initialized: boolean;
        pid: number | null;
        startedAtIso: string | null;
        exitedAtIso: string | null;
        exitCode: number | null;
        exitSignal: string | null;
    }>;
    pendingClientRequests: readonly PendingClientRequestDiagnostic[];
    pendingServerRequests: readonly PendingServerRequestDiagnostic[];
    recentLogs: readonly Readonly<AppServerLog>[];
    counts: Readonly<{
        sentClientRequests: number;
        completedClientRequests: number;
        failedClientRequests: number;
        notifications: number;
        serverRequests: number;
        notificationsByMethod: Readonly<Record<string, number>>;
    }>;
    hints: readonly string[];
}>;
export type AppServerDiagnostics = {
    status: 'running' | 'stopped';
    lifecycle: 'not_started' | 'running' | 'unavailable' | 'disposed';
    startCount: number;
    unavailableReason: string | null;
    initialized: boolean;
    pid: number | null;
    startedAtIso: string | null;
    exitedAtIso: string | null;
    exitCode: number | null;
    exitSignal: string | null;
    pendingClientRequestCount: number;
    pendingServerRequestCount: number;
    sentClientRequestCount: number;
    completedClientRequestCount: number;
    failedClientRequestCount: number;
    notificationCount: number;
    serverRequestCount: number;
    notificationCountsByMethod: Record<string, number>;
    recentLogs: AppServerLog[];
};
export type SpawnAppServer = (command: string, args: string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams;
export type AppServerHostOptions = {
    command?: string;
    args?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    initializeParams?: unknown;
    rpcTimeoutMs?: number;
    spawn?: SpawnAppServer;
    onServerRequest?: (request: ServerRequest) => Promise<ServerRequestReply | null> | ServerRequestReply | null;
    onDisconnected?: (reason: Error) => void;
};
export interface AppServerHost {
    ensureInitialized(): Promise<void>;
    call<T>(method: string, params?: unknown, options?: RpcOptions): Promise<T>;
    subscribe(listener: RuntimeNotificationListener): () => void;
    listPendingRequests(): PendingServerRequest[];
    resolveServerRequest(id: number, reply: ServerRequestReply): Promise<void>;
    diagnostics(): AppServerDiagnostics;
    /** Returns the most recent content-free failure snapshot, or null before a runtime failure. */
    failureReport(): AppServerFailureDiagnostic | null;
    dispose(): Promise<void>;
}
export declare function createAppServerHost(options?: AppServerHostOptions): AppServerHost;
//# sourceMappingURL=index.d.ts.map