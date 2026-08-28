import type { ReasoningEffort } from "../ReasoningEffort";
import type { AskForApproval } from "./AskForApproval";
import type { SandboxPolicy } from "./SandboxPolicy";
import type { Thread } from "./Thread";
export type ThreadResumeResponse = {
    thread: Thread;
    model: string;
    modelProvider: string;
    cwd: string;
    approvalPolicy: AskForApproval;
    sandbox: SandboxPolicy;
    reasoningEffort: ReasoningEffort | null;
};
//# sourceMappingURL=ThreadResumeResponse.d.ts.map