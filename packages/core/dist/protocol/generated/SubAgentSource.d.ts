import type { ThreadId } from "./ThreadId";
export type SubAgentSource = "review" | "compact" | {
    "thread_spawn": {
        parent_thread_id: ThreadId;
        depth: number;
    };
} | "memory_consolidation" | {
    "other": string;
};
//# sourceMappingURL=SubAgentSource.d.ts.map