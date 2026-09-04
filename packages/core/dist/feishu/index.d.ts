import type { ChannelAttachment, ChannelDeliveryError, ChannelInboundMessage } from '../channel/index.js';
export type FeishuDomain = 'feishu' | 'lark';
export type FeishuConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
export type FeishuCard = Record<string, unknown>;
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
    onState(state: FeishuConnectionState, error?: Error): void;
};
/** Converts Feishu wire data into the provider-neutral Core envelope. */
export declare function normalizeFeishuMessage(config: FeishuAccountConfig, payload: unknown): ChannelInboundMessage | null;
export declare function normalizeFeishuAction(payload: unknown): FeishuCardAction;
/** Node-only Feishu transport. It does not interpret Codex events or product targets. */
export declare class FeishuProvider {
    private readonly config;
    private readonly client;
    private ws;
    private state;
    constructor(config: FeishuAccountConfig);
    identity(): Promise<{
        id: string;
        name: string;
    }>;
    start(handlers: FeishuProviderHandlers): Promise<void>;
    stop(): void;
    getState(): FeishuConnectionState;
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
    actions?: Array<{
        text: string;
        value: Record<string, unknown>;
        type?: 'primary' | 'default' | 'danger';
    }>;
    note?: string;
}): FeishuCard;
/** Selection card for product target pickers. Static selects avoid Feishu's
 * small per-row button limit and keep large Workspace/Demand lists usable. */
export declare function feishuSelectionCard(title: string, markdown: string, options: Array<{
    text: string;
    value: Record<string, unknown>;
}>, note?: string): FeishuCard;
//# sourceMappingURL=index.d.ts.map