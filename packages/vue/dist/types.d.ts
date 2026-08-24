export type CodyMessageRole = 'user' | 'assistant' | 'system';
export type CodyTool = {
    kind: string;
    title: string;
    status: string;
    summary: string;
    details: string[];
    output?: string;
    outputLabel?: string;
};
export type CodyMessage = {
    id: string;
    role: CodyMessageRole;
    text: string;
    messageType?: string;
    images?: string[];
    skills?: Array<{
        name: string;
        path: string;
        displayName?: string;
    }>;
    tool?: CodyTool | null;
};
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
    kind: 'worked';
    label: string;
};
//# sourceMappingURL=types.d.ts.map