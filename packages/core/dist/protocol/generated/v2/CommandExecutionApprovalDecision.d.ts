import type { ExecPolicyAmendment } from "./ExecPolicyAmendment";
export type CommandExecutionApprovalDecision = "accept" | "acceptForSession" | {
    "acceptWithExecpolicyAmendment": {
        execpolicy_amendment: ExecPolicyAmendment;
    };
} | "decline" | "cancel";
//# sourceMappingURL=CommandExecutionApprovalDecision.d.ts.map