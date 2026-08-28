import type { LegacyAppPathString } from "../LegacyAppPathString";
export type ThreadBackgroundTerminal = {
    itemId: string;
    processId: string;
    command: string;
    cwd: LegacyAppPathString;
    osPid: number | null;
    cpuPercent: number | null;
    rssKb: bigint | null;
};
//# sourceMappingURL=ThreadBackgroundTerminal.d.ts.map