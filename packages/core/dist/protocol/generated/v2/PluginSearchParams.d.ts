import type { AbsolutePathBuf } from "../AbsolutePathBuf";
import type { PluginSearchScope } from "./PluginSearchScope";
export type PluginSearchParams = {
    searchTerm: string;
    scope?: PluginSearchScope | null;
    cwds?: Array<AbsolutePathBuf> | null;
    cursor?: string | null;
    limit?: number | null;
};
//# sourceMappingURL=PluginSearchParams.d.ts.map