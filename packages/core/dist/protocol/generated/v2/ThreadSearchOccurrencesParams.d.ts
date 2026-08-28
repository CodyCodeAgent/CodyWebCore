/**
 * Parameters for searching visible message occurrences within one paginated thread.
 */
export type ThreadSearchOccurrencesParams = {
    threadId: string;
    /**
     * Case-insensitive literal substring to find in visible user messages and final assistant
     * messages.
     */
    searchTerm: string;
    /**
     * Opaque cursor returned by a previous call for the same thread and search term.
     */
    cursor?: string | null;
    /**
     * Optional occurrence page size.
     */
    limit?: number | null;
};
//# sourceMappingURL=ThreadSearchOccurrencesParams.d.ts.map