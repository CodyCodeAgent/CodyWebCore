import type { ThreadSearchOccurrence } from "./ThreadSearchOccurrence";
export type ThreadSearchOccurrencesResponse = {
    /**
     * Occurrences in chronological message order.
     */
    data: Array<ThreadSearchOccurrence>;
    /**
     * Opaque cursor to continue after the last returned occurrence.
     */
    nextCursor: string | null;
};
//# sourceMappingURL=ThreadSearchOccurrencesResponse.d.ts.map