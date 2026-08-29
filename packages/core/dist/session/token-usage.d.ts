export type CodexTokenUsage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    contextWindow: number | null;
    autoCompactTokenLimit: number | null;
};
/** Reads token usage compatibility fields at the protocol boundary. */
export declare function codexTokenUsageFromPayload(payload: unknown): CodexTokenUsage | null;
//# sourceMappingURL=token-usage.d.ts.map