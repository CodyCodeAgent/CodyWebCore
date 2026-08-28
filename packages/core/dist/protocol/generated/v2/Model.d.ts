import type { InputModality } from "../InputModality";
import type { ReasoningEffort } from "../ReasoningEffort";
import type { ReasoningEffortOption } from "./ReasoningEffortOption";
export type Model = {
    id: string;
    model: string;
    upgrade: string | null;
    displayName: string;
    description: string;
    hidden: boolean;
    supportedReasoningEfforts: Array<ReasoningEffortOption>;
    defaultReasoningEffort: ReasoningEffort;
    inputModalities: Array<InputModality>;
    supportsPersonality: boolean;
    isDefault: boolean;
};
//# sourceMappingURL=Model.d.ts.map