import type { AppDisabledReason } from "./AppDisabledReason";
export type AppsConfig = {
    [key in string]?: {
        enabled: boolean;
        disabled_reason: AppDisabledReason | null;
    };
};
//# sourceMappingURL=AppsConfig.d.ts.map