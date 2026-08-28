import type { EventMsg } from "./EventMsg";
import type { ThreadId } from "./ThreadId";
export type ResumeConversationResponse = {
    conversationId: ThreadId;
    model: string;
    initialMessages: Array<EventMsg> | null;
    rolloutPath: string;
};
//# sourceMappingURL=ResumeConversationResponse.d.ts.map