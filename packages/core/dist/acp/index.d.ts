import { type ChildProcessWithoutNullStreams } from 'node:child_process';
import { type ClientConnection, type InitializeResponse, type PermissionOption, type SessionConfigOption, type SessionUpdate } from '@agentclientprotocol/sdk';
export type AcpSession = {
    readonly bindingId: string;
    readonly sessionId: string;
    readonly process: ChildProcessWithoutNullStreams;
    readonly connection: ClientConnection;
    readonly capabilities: NonNullable<InitializeResponse['agentCapabilities']>;
    configOptions: SessionConfigOption[];
    closed: boolean;
    updateListeners: Set<(update: SessionUpdate) => void>;
    permissionHandler: ((request: AcpPermissionRequest) => Promise<string | null> | string | null) | null;
};
export type AcpPermissionRequest = {
    options: PermissionOption[];
    toolCall: unknown;
};
export type { PermissionOption as AcpPermissionOption, SessionConfigOption as AcpSessionConfigOption, SessionUpdate as AcpSessionUpdate, } from '@agentclientprotocol/sdk';
export type AcpSessionHostOptions = {
    command: string;
    env?: NodeJS.ProcessEnv;
    clientName?: string;
};
export type AcpSessionOpenOptions = {
    bindingId: string;
    cwd: string;
    sessionId?: string;
};
export type AcpNativeSessionSummary = {
    sessionId: string;
    title?: string;
    cwd?: string;
};
export declare function splitAcpCommand(value: string): {
    command: string;
    args: string[];
};
/** Provider-neutral ACP process/session owner. Core owns transport and native
 * Session lifecycle; products map updates into their own presentation model. */
export declare class AcpSessionHost {
    private readonly options;
    private readonly sessions;
    constructor(options: AcpSessionHostOptions);
    get size(): number;
    probe(): Promise<void>;
    open(options: AcpSessionOpenOptions): Promise<AcpSession>;
    require(bindingId: string): AcpSession;
    subscribe(session: AcpSession, listener: (update: SessionUpdate) => void): () => void;
    setPermissionHandler(session: AcpSession, handler: AcpSession['permissionHandler']): void;
    prompt(session: AcpSession, prompt: Array<{
        type: 'text';
        text: string;
    } | {
        type: 'image';
        data: string;
        mimeType: string;
    }>): Promise<{
        stopReason?: string;
    }>;
    cancel(session: AcpSession): Promise<void>;
    setConfigOption(session: AcpSession, configId: string, value: string): Promise<void>;
    list(cwd: string): Promise<AcpNativeSessionSummary[]>;
    close(session: AcpSession): Promise<void>;
    terminate(session: AcpSession): void;
    closeAll(): Promise<void>;
    static supportsImage(session: AcpSession): boolean;
    private openConnection;
    private loadOrResume;
    private closeConnection;
    private assertOwned;
}
//# sourceMappingURL=index.d.ts.map