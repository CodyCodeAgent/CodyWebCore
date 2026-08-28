import type { AbsolutePathBuf } from "./AbsolutePathBuf";
export type SandboxSettings = {
    writableRoots: Array<AbsolutePathBuf>;
    networkAccess: boolean | null;
    excludeTmpdirEnvVar: boolean | null;
    excludeSlashTmp: boolean | null;
};
//# sourceMappingURL=SandboxSettings.d.ts.map