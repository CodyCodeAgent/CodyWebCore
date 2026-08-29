import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js';
import type { TurnStartParams } from '../protocol/generated/v2/TurnStartParams.js';
import type { UserInput } from '../protocol/generated/v2/UserInput.js';
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
    approvalsReviewer?: TurnStartParams['approvalsReviewer'];
    permissions?: TurnStartParams['permissions'];
    runtimeWorkspaceRoots?: TurnStartParams['runtimeWorkspaceRoots'];
    sandboxPolicy?: TurnStartParams['sandboxPolicy'];
};
export type TurnInputSkill = {
    name: string;
    path: string;
};
export type TurnInputLocalImage = {
    path: string;
    detail?: Extract<UserInput, {
        type: 'localImage';
    }>['detail'];
};
/** Builds the canonical Codex turn input sequence for every CodyWeb product. */
export declare function buildTurnUserInput(input: {
    text?: string;
    skills?: TurnInputSkill[];
    localImages?: TurnInputLocalImage[];
}): UserInput[];
//# sourceMappingURL=turn-input.d.ts.map