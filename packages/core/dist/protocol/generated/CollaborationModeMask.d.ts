import type { ModeKind } from "./ModeKind";
import type { ReasoningEffort } from "./ReasoningEffort";
/**
 * A mask for collaboration mode settings, allowing partial updates.
 * All fields except `name` are optional, enabling selective updates.
 */
export type CollaborationModeMask = {
    name: string;
    mode: ModeKind | null;
    model: string | null;
    reasoning_effort: ReasoningEffort | null | null;
    developer_instructions: string | null | null;
};
//# sourceMappingURL=CollaborationModeMask.d.ts.map