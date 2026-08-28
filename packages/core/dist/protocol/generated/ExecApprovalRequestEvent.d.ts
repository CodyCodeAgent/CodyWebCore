import type { ExecPolicyAmendment } from "./ExecPolicyAmendment";
import type { NetworkApprovalContext } from "./NetworkApprovalContext";
import type { ParsedCommand } from "./ParsedCommand";
export type ExecApprovalRequestEvent = {
    /**
     * Identifier for the associated exec call, if available.
     */
    call_id: string;
    /**
     * Turn ID that this command belongs to.
     * Uses `#[serde(default)]` for backwards compatibility.
     */
    turn_id: string;
    /**
     * The command to be executed.
     */
    command: Array<string>;
    /**
     * The command's working directory.
     */
    cwd: string;
    /**
     * Optional human-readable reason for the approval (e.g. retry without sandbox).
     */
    reason: string | null;
    /**
     * Optional network context for a blocked request that can be approved.
     */
    network_approval_context?: NetworkApprovalContext;
    /**
     * Proposed execpolicy amendment that can be applied to allow future runs.
     */
    proposed_execpolicy_amendment?: ExecPolicyAmendment;
    parsed_cmd: Array<ParsedCommand>;
};
//# sourceMappingURL=ExecApprovalRequestEvent.d.ts.map