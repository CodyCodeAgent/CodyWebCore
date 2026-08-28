import type { QueuedSubmission } from "./QueuedSubmission";
export type ThreadQueueListResponse = {
    data: Array<QueuedSubmission>;
    /**
     * Opaque cursor for the next page, or `null` when no submissions remain.
     */
    nextCursor: string | null;
};
//# sourceMappingURL=ThreadQueueListResponse.d.ts.map