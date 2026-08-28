import type { NewConversationParams } from "./NewConversationParams";
import type { ThreadId } from "./ThreadId";
export type ForkConversationParams = {
    path: string | null;
    conversationId: ThreadId | null;
    overrides: NewConversationParams | null;
};
//# sourceMappingURL=ForkConversationParams.d.ts.map