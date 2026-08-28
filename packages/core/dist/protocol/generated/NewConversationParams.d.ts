import type { AskForApproval } from "./AskForApproval";
import type { SandboxMode } from "./SandboxMode";
import type { JsonValue } from "./serde_json/JsonValue";
export type NewConversationParams = {
    model: string | null;
    modelProvider: string | null;
    profile: string | null;
    cwd: string | null;
    approvalPolicy: AskForApproval | null;
    sandbox: SandboxMode | null;
    config: {
        [key in string]?: JsonValue;
    } | null;
    baseInstructions: string | null;
    developerInstructions: string | null;
    compactPrompt: string | null;
    includeApplyPatchTool: boolean | null;
};
//# sourceMappingURL=NewConversationParams.d.ts.map