import type { AppServerHost, ServerRequestReply } from '../runtime/index.js';
import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js';
import type { TurnStartParams } from '../protocol/generated/v2/TurnStartParams.js';
import type { UserInput } from '../protocol/generated/v2/UserInput.js';
import type { CodexEvent } from '../conversation/index.js';
export type ThreadBinding = {
    /** Product-owned stable identifier (conversation id, task id, etc.). */
    id: string;
    threadId: string;
};
export type ExecutionContext = {
    /** Exact schema-bound overrides. Product policy code owns these values. */
    thread: Partial<ThreadStartParams>;
    turn?: Omit<Partial<TurnStartParams>, 'threadId' | 'input'>;
};
export type TurnInput = {
    input: UserInput[];
    model?: TurnStartParams['model'];
    effort?: TurnStartParams['effort'];
    collaborationMode?: TurnStartParams['collaborationMode'];
    approvalPolicy?: TurnStartParams['approvalPolicy'];
    sandboxPolicy?: TurnStartParams['sandboxPolicy'];
};
export type TurnHandle = {
    threadId: string;
    turnId: string;
};
export type TurnOutcome = {
    handle: TurnHandle;
    terminalEvent: CodexEvent;
};
export type ProtectedOperation = {
    requestId: number;
    method: string;
    threadId: string;
    turnId: string;
    itemId: string;
    params: unknown;
};
export type PolicyDecision = {
    action: 'ask';
} | {
    action: 'allow';
    reply?: ServerRequestReply;
    reason?: string;
} | {
    action: 'deny';
    reply?: ServerRequestReply;
    reason: string;
};
export interface ExecutionPolicyProvider {
    evaluate(operation: ProtectedOperation, binding: ThreadBinding, context: ExecutionContext): Promise<PolicyDecision> | PolicyDecision;
}
export type CodexSessionDiagnostic = {
    level: 'info' | 'warning' | 'error';
    message: string;
    method?: string;
    params?: unknown;
};
export type CodexSessionManagerOptions = {
    host: AppServerHost;
    policy?: ExecutionPolicyProvider;
    nowIso?: () => string;
    onDiagnostic?: (diagnostic: CodexSessionDiagnostic) => void;
};
export declare function normalizeThreadHistory(payload: unknown, fallbackThreadId?: string): CodexEvent[];
export declare class CodexSessionManager {
    private readonly options;
    private readonly sessions;
    private readonly sessionIdByThreadId;
    private readonly listeners;
    private readonly waiters;
    private readonly terminalEvents;
    private readonly pendingRequests;
    private readonly client;
    private readonly nowIso;
    private eventSequence;
    private unlisten;
    constructor(options: CodexSessionManagerOptions);
    subscribe(listener: (event: CodexEvent) => void): () => void;
    create(bindingId: string, context: ExecutionContext): Promise<ThreadBinding>;
    resume(binding: ThreadBinding, context: ExecutionContext): Promise<void>;
    detach(bindingId: string): void;
    /** Updates product policy/settings for future turns without rebinding the native thread. */
    setContext(bindingId: string, context: ExecutionContext): void;
    read(bindingId: string): Promise<CodexEvent[]>;
    send(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer'): Promise<TurnHandle>;
    run(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer'): Promise<TurnOutcome>;
    interrupt(bindingId: string): Promise<boolean>;
    waitForTurn(handle: TurnHandle, timeoutMs?: number): Promise<CodexEvent>;
    respondApproval(bindingId: string, requestId: string, decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel'): Promise<void>;
    respondQuestion(bindingId: string, requestId: string, answer: unknown): Promise<void>;
    dispose(): Promise<void>;
    private attachLocal;
    private require;
    private ensureSessionReady;
    private forgetTerminalEvents;
    private requirePending;
    private eventId;
    private emit;
    private finishTurn;
    private turnKey;
    private handleNotification;
    private handleServerRequest;
}
//# sourceMappingURL=index.d.ts.map