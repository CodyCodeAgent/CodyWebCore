import type { ConversationMessage, ConversationRequest, ConversationState, ConversationTool } from '@codycodeagent/cody-web-core/conversation';
export type CodyMessageRole = 'user' | 'assistant' | 'system';
/** A product supplies these choices; the shared component owns interaction and presentation. */
export type CodyComposerOption = {
    value: string;
    label: string;
    description?: string;
};
export type CodyQuestionField = {
    id: string;
    header: string;
    question: string;
    isOther: boolean;
    isSecret: boolean;
    options: Array<{
        label: string;
        description: string;
    }>;
};
export declare function questionFieldsFromParams(value: unknown): CodyQuestionField[];
export declare function requestSummary(value: unknown): string;
export type CodyTool = ConversationTool;
export type CodyMessage = ConversationMessage;
export type CodyConversationEntry = {
    id: string;
    kind: 'message';
    message: CodyMessage;
} | {
    id: string;
    kind: 'tool';
    tool: CodyTool;
} | {
    id: string;
    kind: 'reasoning';
    text: string;
    title?: string;
} | {
    id: string;
    kind: 'plan';
    text: string;
} | {
    id: string;
    kind: 'request';
    request: ConversationRequest;
} | {
    id: string;
    kind: 'failure';
    text: string;
} | {
    id: string;
    kind: 'interrupted';
    text: string;
} | {
    id: string;
    kind: 'worked';
    label: string;
} | {
    id: string;
    kind: 'activity';
    title: string;
    detail: string;
    tone: 'running' | 'retrying' | 'waiting' | 'disconnected';
};
/** Converts shared reducer state into the shared Vue presentation model. */
export declare function conversationEntriesFromState(state: ConversationState): CodyConversationEntry[];
//# sourceMappingURL=types.d.ts.map