import type { CommandAction } from "./CommandAction";
import type { ExecPolicyAmendment } from "./ExecPolicyAmendment";
export type CommandExecutionRequestApprovalParams = {
    threadId: string;
    turnId: string;
    itemId: string;
    /**
     * Optional explanatory reason (e.g. request for network access).
     */
    reason?: string | null;
    /**
     * The command to be executed.
     */
    command?: string | null;
    /**
     * The command's working directory.
     */
    cwd?: string | null;
    /**
     * Best-effort parsed command actions for friendly display.
     */
    commandActions?: Array<CommandAction> | null;
    /**
     * Optional proposed execpolicy amendment to allow similar commands without prompting.
     */
    proposedExecpolicyAmendment?: ExecPolicyAmendment | null;
};
//# sourceMappingURL=CommandExecutionRequestApprovalParams.d.ts.map