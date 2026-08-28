import type { AskForApproval } from "./AskForApproval";
import type { ReasoningEffort } from "./ReasoningEffort";
import type { ReasoningSummary } from "./ReasoningSummary";
import type { Verbosity } from "./Verbosity";
export type Profile = {
    model: string | null;
    modelProvider: string | null;
    approvalPolicy: AskForApproval | null;
    modelReasoningEffort: ReasoningEffort | null;
    modelReasoningSummary: ReasoningSummary | null;
    modelVerbosity: Verbosity | null;
    chatgptBaseUrl: string | null;
};
//# sourceMappingURL=Profile.d.ts.map