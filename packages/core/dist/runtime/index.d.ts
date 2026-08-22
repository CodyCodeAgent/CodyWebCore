import { type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { type RuntimeNotification, type ServerRequest } from '../protocol/index.js';
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
export type AppServerDiagnostics = {
    status: 'running' | 'stopped';
    initialized: boolean;
    pid: number | null;
    pendingClientRequestCount: number;
    pendingServerRequestCount: number;
    sentClientRequestCount: number;
    completedClientRequestCount: number;
    failedClientRequestCount: number;
    notificationCount: number;
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
    restartCooldownMs?: number;
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
    dispose(): Promise<void>;
}
export declare function createAppServerHost(options?: AppServerHostOptions): AppServerHost;
//# sourceMappingURL=index.d.ts.map