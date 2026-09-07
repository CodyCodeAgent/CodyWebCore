import type { ChannelAttachment, ChannelDeliveryError, ChannelInboundMessage } from '../channel/index.js';
export type FeishuDomain = 'feishu' | 'lark';
export type FeishuConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
export type FeishuCard = Record<string, unknown>;
export type FeishuApplicationAdministrators = {
    /** The current application's owner in this application's Open ID namespace. */
    ownerId: string;
    /** Owner first, followed by the remaining application administrators. */
    administratorIds: string[];
};
export type FeishuConnectionDiagnostic = {
    state: FeishuConnectionState;
    atIso: string;
    reconnectAttempts: number;
    lastConnectAtIso: string | null;
    nextConnectAtIso: string | null;
    /** The current SDK does not expose WebSocket close frames. Keep this null
     * instead of inventing a close code; products can render it as unavailable. */
    closeCode: number | null;
    closeReason: string;
};
export type FeishuCardButton = {
    text: string;
    value: Record<string, unknown>;
    type?: 'primary' | 'default' | 'danger';
    url?: never;
} | {
    text: string;
    url: string;
    type?: 'primary' | 'default' | 'danger';
    value?: never;
};
export type FeishuAccountConfig = {
    accountId: string;
    appId: string;
    appSecret: string;
    domain?: FeishuDomain;
    botOpenId?: string;
    privateConversationMode?: 'topic' | 'chat';
};
export type FeishuCardAction = {
    eventId: string;
    actorId: string;
    remoteMessageId: string;
    value: Record<string, unknown>;
    option: string;
};
export type FeishuProviderHandlers = {
    onMessage(message: ChannelInboundMessage): void | Promise<void>;
    onAction(action: FeishuCardAction): unknown | Promise<unknown>;
    onState(state: FeishuConnectionState, error?: Error, diagnostic?: FeishuConnectionDiagnostic): void;
};
export type FeishuChatMode = 'group' | 'p2p' | 'topic';
/** Converts Feishu wire data into the provider-neutral Core envelope. */
export declare function normalizeFeishuMessage(config: FeishuAccountConfig, payload: unknown): ChannelInboundMessage | null;
/**
 * Topic-group root events may omit both root_id and thread_id. The provider can
 * resolve the chat mode once and apply it without leaking Feishu chat metadata
 * into the provider-neutral envelope.
 */
export declare function applyFeishuChatMode(message: ChannelInboundMessage, chatMode: FeishuChatMode): ChannelInboundMessage;
export declare function normalizeFeishuAction(payload: unknown): FeishuCardAction;
/** Node-only Feishu transport. It does not interpret Codex events or product targets. */
export declare class FeishuProvider {
    private readonly config;
    private readonly client;
    private ws;
    private state;
    private readonly chatModes;
    private applicationAdministratorsCache;
    constructor(config: FeishuAccountConfig);
    identity(): Promise<{
        id: string;
        name: string;
    }>;
    /** Resolve approval administrators from the currently authenticated app.
     * Open IDs returned here are guaranteed to belong to this app's namespace. */
    applicationAdministrators(): Promise<FeishuApplicationAdministrators>;
    private loadApplicationAdministrators;
    start(handlers: FeishuProviderHandlers): Promise<void>;
    stop(): void;
    getState(): FeishuConnectionState;
    getConnectionDiagnostic(error?: Error): FeishuConnectionDiagnostic;
    private resolveChatMode;
    sendText(chatId: string, text: string, uuid?: string): Promise<string>;
    replyText(messageId: string, text: string, replyInThread?: boolean, uuid?: string): Promise<string>;
    sendCard(chatId: string, card: FeishuCard, uuid?: string): Promise<string>;
    replyCard(messageId: string, card: FeishuCard, replyInThread?: boolean, uuid?: string): Promise<string>;
    sendUserCard(openId: string, card: FeishuCard, uuid?: string): Promise<string>;
    sendImage(chatId: string, imageKey: string, uuid?: string): Promise<string>;
    replyImage(messageId: string, imageKey: string, replyInThread?: boolean, uuid?: string): Promise<string>;
    updateCard(messageId: string, card: FeishuCard): Promise<void>;
    uploadImage(buffer: Buffer): Promise<string>;
    downloadAttachment(messageId: string, attachment: ChannelAttachment, rootDir: string, maxBytes?: number): Promise<{
        path: string;
        sizeBytes: number;
    }>;
    classifyError(error: unknown): ChannelDeliveryError;
    private setState;
    private messageId;
}
export declare function feishuTextCard(title: string, markdown: string, options?: {
    color?: string;
    actions?: FeishuCardButton[];
    note?: string;
}): FeishuCard;
/** Selection card for product target pickers. Static selects avoid Feishu's
 * small per-row button limit and keep large Workspace/Demand lists usable. */
export declare function feishuSelectionCard(title: string, markdown: string, options: Array<{
    text: string;
    value: Record<string, unknown>;
}>, note?: string): FeishuCard;
//# sourceMappingURL=index.d.ts.map