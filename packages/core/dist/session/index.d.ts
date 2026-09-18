import type { AppServerHost, ServerRequest, ServerRequestReply } from '../runtime/index.js';
import type { ConfigReadResponse } from '../protocol/generated/v2/ConfigReadResponse.js';
import type { GetAccountRateLimitsResponse } from '../protocol/generated/v2/GetAccountRateLimitsResponse.js';
import type { McpServerRefreshResponse } from '../protocol/generated/v2/McpServerRefreshResponse.js';
import { type CodexEvent } from '../conversation/index.js';
import type { ExecutionContext, TurnInput } from './turn-input.js';
import { type CodexCollaborationModeOption, type CodexModelOption, type CodexSkillCatalogGroup, type CodexSkillOption, type CodexThreadSummary, type ListCodexThreadsOptions } from './catalog.js';
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
export type CodexConversationSnapshot = {
    events: CodexEvent[];
    watermark: number;
};
/**
 * The process owner owns the complete normalized outcome for one native Turn.
 * Products may render or persist this value, but must not replay a second
 * reducer to guess a terminal state or extract a final answer.
 */
export type TurnOutcome = {
    handle: TurnHandle;
    terminalEvent: CodexEvent;
    assistantText: string;
    events: readonly CodexEvent[];
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
    quarantinedReason: string;
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
/** A reply that has been accepted by the one Core request broker. Product
 * adapters may audit or persist a scoped grant from this record, but must not
 * issue a second App Server reply. */
export type ServerRequestResolution = {
    operation: ProtectedOperation;
    binding: ThreadBinding;
    context: ExecutionContext;
    request: ServerRequest;
    kind: 'approval' | 'question';
    reply: ServerRequestReply;
    automatic: boolean;
    policyDecision?: PolicyDecision;
};
export interface ExecutionPolicyProvider {
    evaluate(operation: ProtectedOperation, binding: ThreadBinding, context: ExecutionContext): Promise<PolicyDecision> | PolicyDecision;
    onResolved?(resolution: ServerRequestResolution): Promise<void> | void;
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
    /** Number of native thread/read checks after requesting a Turn stop. */
    turnStopReconcileAttempts?: number;
    /** Delay between native stop reconciliation reads. */
    turnStopReconcileDelayMs?: number;
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
    private readonly operationalStops;
    private readonly terminalEvents;
    private readonly ownerJournalByBindingId;
    private readonly turnEvents;
    private readonly operationalFailures;
    private readonly submissions;
    private readonly pendingRequests;
    private readonly requestResolutions;
    private readonly resolvedRequests;
    private readonly commands;
    private readonly catalog;
    private readonly nowIso;
    private eventSequence;
    private ownerRevision;
    private commandSequence;
    private runtimeUnavailable;
    private disposed;
    private unlisten;
    constructor(options: CodexSessionManagerOptions);
    subscribe(listener: (event: CodexEvent) => void): () => void;
    /** Returns stable live events for unresolved approvals/questions after a product view reconnects. */
    listPendingEvents(bindingId: string): CodexEvent[];
    /** A product may expose a pending-request badge, but Core remains the
     * authority for whether that request can still be resolved. */
    isServerRequestPending(requestId: string): boolean;
    /** Returns the volatile owner state needed to attach a browser projection.
     * Native thread/read can lag an active Turn, so attach must explicitly
     * publish that Turn instead of making the browser infer activity. */
    listAttachmentEvents(bindingId: string): CodexEvent[];
    snapshot(bindingId: string): CodexSessionSnapshot | null;
    create(bindingId: string, context: ExecutionContext): Promise<ThreadBinding>;
    /**
     * Starts a native thread and binds it to itself in one owner operation.
     *
     * Browser clients never receive a window in which a new native thread exists
     * without a Core binding.  Product navigation may use the returned id, but
     * future read/submit/interrupt operations must come back through this
     * manager.
     */
    startThread(context: ExecutionContext): Promise<ThreadBinding>;
    /** Catalog and thread mutations are owner operations too.  Keeping them
     * here prevents product browsers from using a generic RPC tunnel for the
     * same native threads that this manager serializes. */
    listThreads(options?: ListCodexThreadsOptions): Promise<CodexThreadSummary[]>;
    listModels(): Promise<CodexModelOption[]>;
    listCollaborationModes(): Promise<CodexCollaborationModeOption[]>;
    readConfig(): Promise<ConfigReadResponse>;
    reloadMcpServers(): Promise<McpServerRefreshResponse>;
    readAccountRateLimits(): Promise<GetAccountRateLimitsResponse>;
    listSkills(cwds: string[], forceReload?: boolean): Promise<CodexSkillOption[]>;
    listSkillCatalog(cwds: string[]): Promise<CodexSkillCatalogGroup[]>;
    setSkillEnabled(path: string, enabled: boolean): Promise<void>;
    renameThread(threadId: string, name: string): Promise<void>;
    forkThread(threadId: string): Promise<string>;
    compactThread(threadId: string): Promise<void>;
    archiveThread(threadId: string): Promise<void>;
    resume(binding: ThreadBinding, context: ExecutionContext): Promise<void>;
    detach(bindingId: string): void;
    /** Updates product policy/settings for future turns without rebinding the native thread. */
    setContext(bindingId: string, context: ExecutionContext): void;
    read(bindingId: string): Promise<CodexEvent[]>;
    /**
     * The only safe reconnect cut: durable native history and the owner's live
     * journal are captured with a monotonically increasing watermark. A browser
     * subscribes first and replays only owner events newer than this watermark.
     */
    readSnapshot(bindingId: string): Promise<CodexConversationSnapshot>;
    submit(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer', clientCommandId?: string): TurnSubmission;
    send(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer', clientCommandId?: string): Promise<TurnHandle>;
    run(bindingId: string, input: TurnInput, mode?: 'queue' | 'steer', clientCommandId?: string): Promise<TurnOutcome>;
    interrupt(bindingId: string): Promise<boolean>;
    waitForTurn(handle: TurnHandle): Promise<CodexEvent>;
    respondApproval(bindingId: string, requestId: string, decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel'): Promise<void>;
    respondQuestion(bindingId: string, requestId: string, answer: unknown): Promise<void>;
    /**
     * Resolves a pending server request through the same manager that registered
     * it.  Product adapters may decide *what* a user chose (including their own
     * audit/grant scope), but they must not call AppServerHost directly: doing so
     * races the manager's pending-request and terminal cleanup state.
     */
    respondServerRequest(requestId: string, reply: ServerRequestReply): Promise<void>;
    dispose(): Promise<void>;
    private attachLocal;
    private requireUsable;
    private require;
    private steerSubmission;
    private ensureSessionReady;
    private forgetTerminalEvents;
    private requirePending;
    private resolveRequestOnce;
    private eventId;
    private emit;
    private finishTurn;
    private finishOperationalFailure;
    private stopOperationallyFailedTurn;
    private requestNativeStop;
    private reconcileStoppedTurn;
    private ensureTurnWatchdog;
    private armTurnWatchdog;
    private refreshTurnInactivity;
    private clearTurnWatchdog;
    private trackUpstreamRetry;
    private turnKey;
    private handleNotification;
    private handleServerRequest;
    private notifyServerRequestResolved;
}
//# sourceMappingURL=index.d.ts.map