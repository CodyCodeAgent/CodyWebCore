import { createHash, randomUUID } from 'node:crypto';
/** Provider-neutral durable delivery pump. Storage and SDK calls stay injected. */
export class ReliableChannelOutbox {
    identity;
    store;
    dispatcher;
    retryBaseMs;
    retryMaxMs;
    maxAttempts;
    leaseMs;
    batchSize;
    now;
    randomId;
    logger;
    flushing = null;
    constructor(identity, store, dispatcher, options = {}) {
        this.identity = identity;
        this.store = store;
        this.dispatcher = dispatcher;
        this.retryBaseMs = Math.max(100, options.retryBaseMs ?? 1_000);
        this.retryMaxMs = Math.max(this.retryBaseMs, options.retryMaxMs ?? 5 * 60_000);
        this.maxAttempts = Math.max(1, options.maxAttempts ?? 10);
        this.leaseMs = Math.max(1_000, options.leaseMs ?? 60_000);
        this.batchSize = Math.min(100, Math.max(1, options.batchSize ?? 20));
        this.now = options.now ?? (() => new Date());
        this.randomId = options.randomId ?? randomUUID;
        this.logger = options.logger ?? console;
    }
    async enqueue(input) {
        const item = await this.store.enqueue({
            id: this.randomId(), ...this.identity, kind: input.kind, targetId: input.targetId,
            payload: input.payload, dedupeKey: input.dedupeKey,
            ...(input.revision === undefined ? {} : { revision: input.revision }),
            ...(input.terminal === undefined ? {} : { terminal: input.terminal }),
        });
        if (input.revision !== undefined && this.store.markSuperseded) {
            await this.store.markSuperseded({ ...this.identity, kind: input.kind, targetId: input.targetId, keepId: item.id, revision: input.revision });
        }
        return item;
    }
    flush() {
        if (this.flushing)
            return this.flushing;
        this.flushing = this.drain().finally(() => { this.flushing = null; });
        return this.flushing;
    }
    async drain() {
        for (;;) {
            const now = this.now();
            const items = await this.store.claim({ ...this.identity, limit: this.batchSize, leaseMs: this.leaseMs, nowIso: now.toISOString() });
            if (items.length === 0)
                return;
            for (const item of items)
                await this.dispatch(item);
            if (items.length < this.batchSize)
                return;
        }
    }
    async dispatch(item) {
        try {
            const result = await this.dispatcher.deliver(item);
            await this.store.markSent(item.id, result.remoteMessageId);
        }
        catch (error) {
            const classified = this.dispatcher.classifyError(error);
            if (!classified.retryable || item.attempts >= this.maxAttempts) {
                await this.store.markDeadLetter(item.id, classified.message);
                return;
            }
            const availableAtIso = new Date(this.now().getTime() + this.retryDelayMs(item.attempts)).toISOString();
            try {
                await this.store.markRetry(item.id, classified.message, availableAtIso);
            }
            catch (storeError) {
                this.logger.error(`Could not persist channel delivery retry for ${item.id}: ${String(storeError)}`);
                throw storeError;
            }
        }
    }
    retryDelayMs(attempts) {
        return Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** Math.max(0, Math.min(20, attempts - 1)));
    }
}
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|((?:\\.|[^)\s])+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
/** Extract image destinations without making provider or filesystem policy decisions. */
export function extractMarkdownImageReferences(text) {
    const references = [];
    for (const match of text.matchAll(MARKDOWN_IMAGE)) {
        const source = (match[2] || match[3] || '').replaceAll('\\)', ')').trim();
        if (source)
            references.push({ alt: (match[1] || '').trim(), source });
    }
    return references;
}
/** Remove Markdown image syntax before projecting text into providers that require uploaded image keys. */
export function stripMarkdownImages(text, replacement) {
    return text.replace(MARKDOWN_IMAGE, (_value, alt, angleSource, bareSource) => {
        const reference = { alt: (alt || '').trim(), source: (angleSource || bareSource || '').replaceAll('\\)', ')').trim() };
        return replacement?.(reference) ?? '';
    }).replace(/\n{3,}/g, '\n\n').trim();
}
function projectionStatus(lifecycle) {
    if (!lifecycle || lifecycle === 'idle')
        return 'queued';
    return lifecycle;
}
/** Providers consume this projection and never interpret native wire events. */
export function projectChannelTurn(state, turnId, revision) {
    const turn = state.turns[turnId];
    const status = projectionStatus(turn?.lifecycle);
    const terminal = status === 'completed' || status === 'failed' || status === 'interrupted';
    const assistantMessages = state.messages.filter(message => message.role === 'assistant' && message.turnId === turnId);
    const authoritativeMessages = terminal
        ? assistantMessages.filter(message => message.messageType !== 'agentMessage.live' && message.messageType !== 'plan.live')
        : assistantMessages;
    const assistantText = authoritativeMessages.map(message => message.text).filter(Boolean).join('\n\n').trim();
    const assistantImages = [...new Set(authoritativeMessages.flatMap(message => [
            ...(message.images ?? []),
            ...extractMarkdownImageReferences(message.text).map(reference => reference.source),
        ]).filter(Boolean))];
    return { threadId: state.threadId, turnId, status, assistantText, assistantImages, error: turn?.error ?? turn?.retryMessage ?? '', terminal, revision };
}
/** Stable across provider redelivery and process restart. */
export function channelCommandId(message) {
    const identity = [message.provider, message.accountId, message.eventId || message.messageId].join('\u0000');
    return `channel_${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`;
}
export function channelConversationKey(message) {
    const { provider, accountId, conversation } = message;
    return [provider, accountId, conversation.scope, conversation.id, conversation.rootId ?? ''].join(':');
}
//# sourceMappingURL=index.js.map