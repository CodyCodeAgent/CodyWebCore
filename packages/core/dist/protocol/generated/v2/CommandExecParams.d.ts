import type { SandboxPolicy } from "./SandboxPolicy";
export type CommandExecParams = {
    command: Array<string>;
    timeoutMs?: number | null;
    cwd?: string | null;
    sandboxPolicy?: SandboxPolicy | null;
};
//# sourceMappingURL=CommandExecParams.d.ts.map