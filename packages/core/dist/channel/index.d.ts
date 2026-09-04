import type { ConversationState } from '../conversation/index.js';
export type ChannelConversationScope = 'private' | 'group' | 'topic';
export type ChannelAttachment = {
    id: string;
    type: 'image' | 'file' | 'audio' | 'video';
    name: string;
    mimeType?: string;
    sizeBytes?: number;
};
/** Provider-neutral input accepted by a remote channel runtime. */
export type ChannelInboundMessage = {
    provider: string;
    accountId: string;
    eventId: string;
    messageId: string;
    conversation: {
        id: string;
        scope: ChannelConversationScope;
        rootId?: string;
    };
    sender: {
        id: string;
        type: 'user' | 'bot' | 'app';
    };
    text: string;
    replyTo?: string;
    attachments: ChannelAttachment[];
    addressedToAgent: boolean;
    mentionsOtherRecipient: boolean;
    createdAtIso: string;
};
export type ChannelBinding = {
    id: string;
    provider: string;
    accountId: string;
    conversationKey: string;
    targetType: string;
    targetId: string;
    threadId: string;
    ownerIdentity: string;
    createdAtIso: string;
    updatedAtIso: string;
};
export type ChannelInboxStatus = 'received' | 'waiting_binding' | 'ready' | 'submitting' | 'submitted' | 'completed' | 'failed' | 'ignored';
export type ChannelInboxItem = {
    id: string;
    message: ChannelInboundMessage;
    conversationKey: string;
    status: ChannelInboxStatus;
    bindingId?: string;
    clientCommandId?: string;
    turnId?: string;
    lastError?: string;
    createdAtIso: string;
    updatedAtIso: string;
};
export type ChannelOutboxStatus = 'pending' | 'leased' | 'retry_wait' | 'sent' | 'dead_letter' | 'superseded';
export type ChannelOutboxItem = {
    id: string;
    provider: string;
    accountId: string;
    kind: string;
    targetId: string;
    payload: unknown;
    dedupeKey: string;
    status: ChannelOutboxStatus;
    attempts: number;
    availableAtIso: string;
    leaseExpiresAtIso?: string;
    remoteMessageId?: string;
    revision?: number;
    terminal?: boolean;
    lastError?: string;
};
export type ChannelDeliveryError = {
    message: string;
    retryable: boolean;
};
export interface ChannelOutboxStore {
    enqueue(input: Omit<ChannelOutboxItem, 'status' | 'attempts' | 'availableAtIso'> & {
        availableAtIso?: string;
    }): Promise<ChannelOutboxItem>;
    claim(input: {
        provider: string;
        accountId: string;
        limit: number;
        leaseMs: number;
        nowIso: string;
    }): Promise<ChannelOutboxItem[]>;
    markSent(id: string, remoteMessageId?: string): Promise<void>;
    markRetry(id: string, error: string, availableAtIso: string): Promise<void>;
    markDeadLetter(id: string, error: string): Promise<void>;
    markSuperseded?(input: {
        provider: string;
        accountId: string;
        kind: string;
        targetId: string;
        keepId: string;
        revision: number;
    }): Promise<string[]>;
}
export interface ChannelDeliveryDispatcher {
    deliver(item: ChannelOutboxItem): Promise<{
        remoteMessageId?: string;
    }>;
    classifyError(error: unknown): ChannelDeliveryError;
}
export type ReliableChannelOutboxOptions = {
    retryBaseMs?: number;
    retryMaxMs?: number;
    maxAttempts?: number;
    leaseMs?: number;
    batchSize?: number;
    now?: () => Date;
    randomId?: () => string;
    logger?: Pick<Console, 'warn' | 'error'>;
};
/** Provider-neutral durable delivery pump. Storage and SDK calls stay injected. */
export declare class ReliableChannelOutbox {
    private readonly identity;
    private readonly store;
    private readonly dispatcher;
    private readonly retryBaseMs;
    private readonly retryMaxMs;
    private readonly maxAttempts;
    private readonly leaseMs;
    private readonly batchSize;
    private readonly now;
    private readonly randomId;
    private readonly logger;
    private flushing;
    constructor(identity: {
        provider: string;
        accountId: string;
    }, store: ChannelOutboxStore, dispatcher: ChannelDeliveryDispatcher, options?: ReliableChannelOutboxOptions);
    enqueue(input: {
        kind: string;
        targetId: string;
        payload: unknown;
        dedupeKey: string;
        revision?: number;
        terminal?: boolean;
    }): Promise<ChannelOutboxItem>;
    flush(): Promise<void>;
    private drain;
    private dispatch;
    private retryDelayMs;
}
export type ChannelTurnProjection = {
    threadId: string;
    turnId: string;
    status: 'queued' | 'running' | 'retrying' | 'disconnected' | 'completed' | 'failed' | 'interrupted';
    assistantText: string;
    error: string;
    terminal: boolean;
    revision: number;
};
/** Providers consume this projection and never interpret native wire events. */
export declare function projectChannelTurn(state: ConversationState, turnId: string, revision: number): ChannelTurnProjection;
/** Stable across provider redelivery and process restart. */
export declare function channelCommandId(message: Pick<ChannelInboundMessage, 'provider' | 'accountId' | 'eventId' | 'messageId'>): string;
export declare function channelConversationKey(message: Pick<ChannelInboundMessage, 'provider' | 'accountId' | 'conversation'>): string;
//# sourceMappingURL=index.d.ts.map