import type { ThreadSearchTextRange } from "./ThreadSearchTextRange";
/**
 * One visible message occurrence returned by [`ThreadSearchOccurrencesResponse`].
 */
export type ThreadSearchOccurrence = {
    turnId: string;
    itemId: string;
    snippet: string;
    /**
     * Match range within `snippet`, in UTF-16 code units.
     */
    snippetMatchRange: ThreadSearchTextRange;
    /**
     * Opaque inclusive cursor accepted by `thread/turns/list` for this turn.
     */
    turnCursor: string;
};
//# sourceMappingURL=ThreadSearchOccurrence.d.ts.map