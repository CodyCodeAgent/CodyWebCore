import type { SandboxPolicy } from "./SandboxPolicy";
export type ExecOneOffCommandParams = {
    command: Array<string>;
    timeoutMs: bigint | null;
    cwd: string | null;
    sandboxPolicy: SandboxPolicy | null;
};
//# sourceMappingURL=ExecOneOffCommandParams.d.ts.map