import type { ConversationState } from '../conversation/index.js';
export type ChannelConversationScope = 'private' | 'group' | 'topic';
export type ChannelAttachment = {
    id: string;
    type: 'image' | 'file' | 'audio' | 'video';
    name: string;
    mimeType?: string;
    sizeBytes?: number;
};
/** Normalized message metadata that product routers may match without reading
 * provider wire payloads. `type` keeps the provider's stable message-kind
 * identifier while `title` exposes a human-visible post/card title. */
export type ChannelMessageContent = {
    type: string;
    title?: string;
    /** Provider-normalized label/value pairs from structured messages such as cards. */
    fields?: Array<{
        label: string;
        value: string;
    }>;
    /** Provider-normalized actions. URLs are preserved so an agent can follow the same evidence links as a person. */
    actions?: Array<{
        label: string;
        url?: string;
    }>;
    /** Original decoded provider content retained for privileged audit and replay. */
    raw?: unknown;
};
export type ChannelIdentityType = 'open_id' | 'app_id' | 'user_id' | 'union_id' | 'unknown';
/** A provider mention kept as structured data so products can make routing
 * decisions without parsing display text, and can render a native reply
 * mention when the provider supplies a usable identity. */
export type ChannelMention = {
    id: string;
    idType: ChannelIdentityType;
    type: 'user' | 'bot' | 'app';
    name: string;
    isAgent: boolean;
};
/** One explicitly quoted provider message, resolved by the transport before
 * product routing. Quotes are intentionally one level deep so a reply cannot
 * recursively expand an unbounded provider history. */
export type ChannelQuotedMessage = {
    messageId: string;
    conversationId: string;
    sender: {
        id: string;
        type: 'user' | 'bot' | 'app';
        idType?: ChannelIdentityType;
        name?: string;
    };
    content?: ChannelMessageContent;
    text: string;
    attachments: ChannelAttachment[];
    createdAtIso: string;
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
        name?: string;
    };
    sender: {
        id: string;
        type: 'user' | 'bot' | 'app';
        idType?: ChannelIdentityType;
        identities?: Array<{
            id: string;
            idType: ChannelIdentityType;
        }>;
        name?: string;
    };
    content?: ChannelMessageContent;
    text: string;
    replyTo?: string;
    quotedMessage?: ChannelQuotedMessage;
    attachments: ChannelAttachment[];
    addressedToAgent: boolean;
    mentionsOtherRecipient: boolean;
    mentions?: ChannelMention[];
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
export type ChannelOutboxStatus = 'pending' | 'leased' | 'sending' | 'retry_wait' | 'sent' | 'dead_letter' | 'superseded';
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
    markSending(id: string): Promise<void>;
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
    /** Ordered, deduplicated image references from structured messages and Markdown output. */
    assistantImages: string[];
    error: string;
    terminal: boolean;
    revision: number;
};
export type MarkdownImageReference = {
    alt: string;
    source: string;
};
/** Extract image destinations without making provider or filesystem policy decisions. */
export declare function extractMarkdownImageReferences(text: string): MarkdownImageReference[];
/** Remove Markdown image syntax before projecting text into providers that require uploaded image keys. */
export declare function stripMarkdownImages(text: string, replacement?: (reference: MarkdownImageReference) => string): string;
/** Providers consume this projection and never interpret native wire events. */
export declare function projectChannelTurn(state: ConversationState, turnId: string, revision: number): ChannelTurnProjection;
/** Stable across provider redelivery and process restart. */
export declare function channelCommandId(message: Pick<ChannelInboundMessage, 'provider' | 'accountId' | 'eventId' | 'messageId'>): string;
export declare function channelConversationKey(message: Pick<ChannelInboundMessage, 'provider' | 'accountId' | 'conversation'>): string;
//# sourceMappingURL=index.d.ts.map