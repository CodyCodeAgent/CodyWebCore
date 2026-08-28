import type { EnvironmentStatusKind } from "./EnvironmentStatusKind";
/**
 * Current status for the requested environment.
 */
export type EnvironmentStatusResponse = {
    /**
     * Current status observed without starting or recovering the environment.
     */
    status: EnvironmentStatusKind;
    /**
     * Human-readable detail for `disconnected` and `unknown`; omitted for other statuses.
     */
    error?: string;
};
//# sourceMappingURL=EnvironmentStatusResponse.d.ts.map