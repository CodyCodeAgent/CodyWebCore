import type { AppServerHost, ServerRequestReply } from '../runtime/index.js';
import type { CodexEvent } from '../conversation/index.js';
import type { ExecutionContext, TurnInput } from './turn-input.js';
export * from './token-usage.js';
export * from './turn-input.js';
export * from './catalog.js';
export * from './commands.js';
export { conversationToolFromItem, normalizeCodexNotification, normalizeThreadHistory, readCodexStatus, } from './normalization.js';
export type { CodexNotificationEventIdentity, CodexNotificationInput, NormalizeCodexNotificationOptions, } from './normalization.js';
export type ThreadBinding = {
    /** Product-owned stable identifier (conversation id, task id, etc.). */
    id: string;
    threadId: string;
};
export type TurnHandle = {
    threadId: string;
    turnId: string;
};
export type TurnOutcome = {
    handle: TurnHandle;
    terminalEvent: CodexEvent;
};
export type TurnSubmission = {
    /** Product-generated id for the local outbox row. It never masquerades as a native Turn id. */
    clientCommandId: string;
    /** Resolves only after App Server acknowledges turn/start (or turn/steer). */
    started: Promise<TurnHandle>;
    /** Resolves with the one authoritative terminal event for the native Turn. */
    completed: Promise<TurnOutcome>;
};
/** Authoritative process-owner state for a product binding. Products may use
 * this for guards and diagnostics, but must never persist or independently
 * advance it. */
export type CodexSessionSnapshot = {
    bindingId: string;
    threadId: string;
    activeTurnId: string;
    pendingRequestCount: number;
    attached: boolean;
    runtimeAvailable: boolean;
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
    /** Maximum silence between events for an active turn. Progress resets this watchdog. */
    turnInactivityTimeoutMs?: number;
    /** Fallback ceiling for legacy upstream response-stream errors that omit retry metadata. */
    maxUpstreamRetryAttempts?: number;
    onDiagnostic?: (diagnostic: CodexSessionDiagnostic) => void;
};
export declare class CodexSessionManager {
    private readonly options;
    private readonly sessions;
    private readonly sessionIdByThreadId;
    private readonly listeners;
    private readonly waiters;
    private readonly turnWatchdogs;
    private readonly upstreamRetries;
    private readonly terminalEvents;
    private readonly operationalFailures;
    private readonly submissions;
    private readonly pendingRequests;
    private readonly commands;
    private readonly catalog;
    private readonly nowIso;
    private eventSequence;
    private commandSequence;
    private runtimeUnavailable;
    private disposed;
    private unlisten;
    constructor(options: CodexSessionManagerOptions);
    subscribe(listener: (event: CodexEvent) => void): () => void;
    /** Returns stable live events for unresolved approvals/questions after a product view reconnects. */
    listPendingEvents(bindingId: string): CodexEvent[];
    snapshot(bindingId: string): CodexSessionSnapshot | null;
    create(bindingId: string, context: ExecutionContext): Promise<ThreadBinding>;
    resume(binding: ThreadBinding, context: ExecutionContext): Promise<void>;
    detach(bindingId: string): void;
    /** Updates product policy/settings for future turns without rebinding the native thread. */
    setContext(bindingId: string, context: ExecutionContext): void;
    read(bindingId: string): Promise<CodexEvent[]>;
    submit(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer', clientCommandId?: string): TurnSubmission;
    send(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer', clientCommandId?: string): Promise<TurnHandle>;
    run(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer', clientCommandId?: string): Promise<TurnOutcome>;
    interrupt(bindingId: string): Promise<boolean>;
    waitForTurn(handle: TurnHandle): Promise<CodexEvent>;
    respondApproval(bindingId: string, requestId: string, decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel'): Promise<void>;
    respondQuestion(bindingId: string, requestId: string, answer: unknown): Promise<void>;
    dispose(): Promise<void>;
    private attachLocal;
    private requireUsable;
    private require;
    private steerSubmission;
    private ensureSessionReady;
    private forgetTerminalEvents;
    private requirePending;
    private eventId;
    private emit;
    private finishTurn;
    private finishOperationalFailure;
    private ensureTurnWatchdog;
    private armTurnWatchdog;
    private refreshTurnInactivity;
    private clearTurnWatchdog;
    private trackUpstreamRetry;
    private turnKey;
    private handleNotification;
    private handleServerRequest;
}
//# sourceMappingURL=index.d.ts.map