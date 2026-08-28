import type { ReasoningEffort } from "../ReasoningEffort";
import type { AskForApproval } from "./AskForApproval";
import type { SandboxPolicy } from "./SandboxPolicy";
import type { Thread } from "./Thread";
export type ThreadForkResponse = {
    thread: Thread;
    model: string;
    modelProvider: string;
    cwd: string;
    approvalPolicy: AskForApproval;
    sandbox: SandboxPolicy;
    reasoningEffort: ReasoningEffort | null;
};
//# sourceMappingURL=ThreadForkResponse.d.ts.map