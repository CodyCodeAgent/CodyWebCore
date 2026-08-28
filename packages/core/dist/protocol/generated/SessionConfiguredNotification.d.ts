import type { EventMsg } from "./EventMsg";
import type { ReasoningEffort } from "./ReasoningEffort";
import type { ThreadId } from "./ThreadId";
export type SessionConfiguredNotification = {
    sessionId: ThreadId;
    model: string;
    reasoningEffort: ReasoningEffort | null;
    historyLogId: bigint;
    historyEntryCount: number;
    initialMessages: Array<EventMsg> | null;
    rolloutPath: string;
};
//# sourceMappingURL=SessionConfiguredNotification.d.ts.map