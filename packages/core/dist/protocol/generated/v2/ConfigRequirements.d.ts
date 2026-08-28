import type { WebSearchMode } from "../WebSearchMode";
import type { AskForApproval } from "./AskForApproval";
import type { NetworkRequirements } from "./NetworkRequirements";
import type { ResidencyRequirement } from "./ResidencyRequirement";
import type { SandboxMode } from "./SandboxMode";
export type ConfigRequirements = {
    allowedApprovalPolicies: Array<AskForApproval> | null;
    allowedSandboxModes: Array<SandboxMode> | null;
    allowedWebSearchModes: Array<WebSearchMode> | null;
    enforceResidency: ResidencyRequirement | null;
    network: NetworkRequirements | null;
};
//# sourceMappingURL=ConfigRequirements.d.ts.map