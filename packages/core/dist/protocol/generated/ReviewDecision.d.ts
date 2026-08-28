import type { ExecPolicyAmendment } from "./ExecPolicyAmendment";
/**
 * User's decision in response to an ExecApprovalRequest.
 */
export type ReviewDecision = "approved" | {
    "approved_execpolicy_amendment": {
        proposed_execpolicy_amendment: ExecPolicyAmendment;
    };
} | "approved_for_session" | "denied" | "abort";
//# sourceMappingURL=ReviewDecision.d.ts.map