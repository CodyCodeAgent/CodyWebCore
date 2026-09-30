import { type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { type RuntimeNotification, type ServerRequest } from '../protocol/index.js';
export declare const CODY_WEB_CORE_VERSION = "0.43.0";
export type AppServerRuntimeKind = 'codex' | 'traex';
/**
 * Product-owned definition of an installed AI Runtime.
 *
 * Core deliberately does not define a concrete adapter, configuration shape, or
 * product capability set. A Runtime can therefore represent an App Server, ACP
 * client, or another provider without leaking product policy into Core.
 */
export type RuntimeDescriptor<TAdapter, TConfig = void, TCapabilities = undefined> = Readonly<{
    /** Stable persistence and routing identifier, for example `codex` or `trae`. */
    id: string;
    /** Human-readable name safe to render in product selectors and channel cards. */
    label: string;
    /** Optional product-facing help text. */
    description?: string;
    /** Optional product-defined capabilities such as model, cache, or reporting support. */
    capabilities?: TCapabilities;
    /** Creates a product adapter from its product-owned configuration. */
    create: (config: TConfig) => TAdapter;
}>;
export type RuntimeRegistryOptions<TAdapter, TConfig = void, TCapabilities = undefined> = Readonly<{
    descriptors: readonly RuntimeDescriptor<TAdapter, TConfig, TCapabilities>[];
    /** The installed Runtime selected when a caller has not made an explicit choice. */
    defaultId: string;
}>;
/**
 * Immutable, framework-neutral catalog of installed AI Runtimes.
 *
 * It provides the common validation and lookup contract shared by products,
 * while each product owns concrete adapters, persistence, and UI policy.
 */
export declare class RuntimeRegistry<TAdapter, TConfig = void, TCapabilities = undefined> {
    private readonly descriptorsById;
    readonly defaultId: string;
    constructor(options: RuntimeRegistryOptions<TAdapter, TConfig, TCapabilities>);
    list(): readonly RuntimeDescriptor<TAdapter, TConfig, TCapabilities>[];
    has(id: string | null | undefined): id is string;
    get(id: string): RuntimeDescriptor<TAdapter, TConfig, TCapabilities> | undefined;
    require(id: string): RuntimeDescriptor<TAdapter, TConfig, TCapabilities>;
    create(id: string, config: TConfig): TAdapter;
}
export type AppServerRuntimeProfile = Readonly<{
    kind: AppServerRuntimeKind;
    label: string;
    command: string;
    args: readonly string[];
    skillDirectoryName: '.codex' | '.trae';
}>;
export declare function appServerRuntimeProfile(kind: AppServerRuntimeKind, command?: string): AppServerRuntimeProfile;
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
    runtimeLabel?: string;
};
export type RuntimeAppServerHostOptions = Omit<AppServerHostOptions, 'command' | 'args' | 'runtimeLabel'> & {
    command?: string;
    args?: string[];
};
export declare function createRuntimeAppServerHost(kind: AppServerRuntimeKind, options?: RuntimeAppServerHostOptions): AppServerHost;
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