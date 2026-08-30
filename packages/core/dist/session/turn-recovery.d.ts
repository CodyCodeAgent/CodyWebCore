import type { CodexEvent } from '../conversation/index.js';
import type { RuntimeNotification } from '../runtime/index.js';
export type TurnRecoveryHandle = {
    threadId: string;
    turnId: string;
};
export type TurnRecoveryMonitorOptions = {
    /** Maximum silence after a successful turn/start acknowledgement. */
    inactivityTimeoutMs?: number;
    maxUpstreamRetryAttempts?: number;
    nowIso?: () => string;
    onInactive?: (handle: TurnRecoveryHandle) => void | Promise<void>;
    /** Timers cannot return events, so inactivity failures are delivered here. */
    onTerminal?: (event: CodexEvent) => void;
};
/**
 * Product-neutral lifecycle supervision for products that dispatch raw RPC
 * commands instead of using CodexSessionManager. It turns terminal retry
 * exhaustion and silent response streams into the same normalized failures.
 */
export declare class CodexTurnRecoveryMonitor {
    private readonly options;
    private readonly tracked;
    constructor(options?: TurnRecoveryMonitorOptions);
    track(handle: TurnRecoveryHandle): void;
    untrack(handle: TurnRecoveryHandle): void;
    observe(notification: RuntimeNotification): CodexEvent[];
    dispose(): void;
    private arm;
    private finish;
    private key;
}
//# sourceMappingURL=turn-recovery.d.ts.map