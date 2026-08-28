import type { ReasoningEffort } from "./ReasoningEffort";
import type { ThreadId } from "./ThreadId";
export type NewConversationResponse = {
    conversationId: ThreadId;
    model: string;
    reasoningEffort: ReasoningEffort | null;
    rolloutPath: string;
};
//# sourceMappingURL=NewConversationResponse.d.ts.map