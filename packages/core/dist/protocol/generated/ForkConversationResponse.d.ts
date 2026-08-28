import type { EventMsg } from "./EventMsg";
import type { ThreadId } from "./ThreadId";
export type ForkConversationResponse = {
    conversationId: ThreadId;
    model: string;
    initialMessages: Array<EventMsg> | null;
    rolloutPath: string;
};
//# sourceMappingURL=ForkConversationResponse.d.ts.map