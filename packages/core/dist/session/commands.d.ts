import { type CodexRpcCaller } from '../protocol/methods.js';
import type { ThreadForkParams } from '../protocol/generated/v2/ThreadForkParams.js';
import type { ThreadResumeParams } from '../protocol/generated/v2/ThreadResumeParams.js';
import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js';
import type { TurnStartParams } from '../protocol/generated/v2/TurnStartParams.js';
import type { UserInput } from '../protocol/generated/v2/UserInput.js';
export type ThreadResumeOverrides = Omit<ThreadResumeParams, 'threadId'>;
export type ThreadForkOverrides = Omit<ThreadForkParams, 'threadId'>;
export type TurnStartInput = Omit<TurnStartParams, 'threadId'>;
/**
 * Stateless, schema-bound Codex thread and turn commands.
 *
 * Products own navigation, policy selection, queue UX, and error localization;
 * this class owns exact RPC names, wire payloads, identifier normalization, and
 * malformed-success rejection.
 */
export declare class CodexThreadCommands {
    private readonly client;
    constructor(rpc: CodexRpcCaller);
    startThread(params?: ThreadStartParams): Promise<string>;
    resumeThread(threadId: string, overrides?: ThreadResumeOverrides): Promise<void>;
    renameThread(threadId: string, name: string): Promise<void>;
    forkThread(threadId: string, overrides?: ThreadForkOverrides): Promise<string>;
    compactThread(threadId: string): Promise<void>;
    archiveThread(threadId: string): Promise<void>;
    startTurn(threadId: string, input: TurnStartInput): Promise<string>;
    steerTurn(threadId: string, expectedTurnId: string, input: UserInput[]): Promise<void>;
    interruptTurn(threadId: string, turnId: string): Promise<void>;
}
//# sourceMappingURL=commands.d.ts.map