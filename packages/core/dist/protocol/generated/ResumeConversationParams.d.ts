import type { NewConversationParams } from "./NewConversationParams";
import type { ResponseItem } from "./ResponseItem";
import type { ThreadId } from "./ThreadId";
export type ResumeConversationParams = {
    path: string | null;
    conversationId: ThreadId | null;
    history: Array<ResponseItem> | null;
    overrides: NewConversationParams | null;
};
//# sourceMappingURL=ResumeConversationParams.d.ts.map