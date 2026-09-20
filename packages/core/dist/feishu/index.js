import * as Lark from '@larksuiteoapi/node-sdk';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
/** Message kinds whose content and resources are normalized by this adapter. */
export const FEISHU_MESSAGE_TYPES = ['text', 'post', 'image', 'file', 'audio', 'media', 'interactive'];
function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function string(value) {
    return typeof value === 'string' ? value : '';
}
function parseJson(value) {
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
function cleanText(value) {
    return value.replace(/[ \t]+/gu, ' ').replace(/ *\n */gu, '\n').replace(/\n{3,}/gu, '\n\n').trim();
}
function normalizeMentions(value) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap(item => {
        const row = record(item);
        const id = record(row?.id);
        if (!row)
            return [];
        return [{
                key: string(row.key), name: string(row.name),
                openId: string(id?.open_id || id?.openId || (row.id_type === 'open_id' ? row.id : '')),
                appId: string(id?.app_id || id?.appId || (row.id_type === 'app_id' ? row.id : '')),
            }];
    });
}
function inlinePostMentions(value) {
    const row = record(value);
    if (!row)
        return [];
    const localized = Array.isArray(row.content) ? row : Object.values(row).map(record).find(candidate => Array.isArray(candidate?.content));
    if (!localized)
        return [];
    return localized.content.flatMap(line => Array.isArray(line) ? line.flatMap(element => {
        const item = record(element);
        if (item?.tag !== 'at')
            return [];
        const id = string(item.user_id);
        return [{
                key: '', name: string(item.user_name) || id,
                openId: id.startsWith('ou_') ? id : '', appId: id.startsWith('cli_') ? id : '',
            }];
    }) : []);
}
function richContent(value) {
    const row = record(value);
    if (!row)
        return { text: '', title: '', attachments: [] };
    const localized = Array.isArray(row.content) ? row : Object.values(row).map(record).find(candidate => Array.isArray(candidate?.content));
    if (!localized)
        return { text: '', title: '', attachments: [] };
    const title = string(localized.title);
    const attachments = [];
    const lines = localized.content.map(line => Array.isArray(line) ? line.map(element => {
        const item = record(element);
        if (!item)
            return '';
        if (item.tag === 'a')
            return `${string(item.text)}${item.href ? ` (${string(item.href)})` : ''}`;
        if (item.tag === 'at')
            return `@${string(item.user_name || item.user_id)}`;
        if (item.tag === 'img' || item.tag === 'media') {
            const id = string(item.image_key || item.imageKey);
            if (id)
                attachments.push({ id, type: 'image', name: `${id}.jpg` });
            return '[图片]';
        }
        if (item.tag === 'file') {
            const id = string(item.file_key);
            const name = string(item.file_name) || id;
            if (id)
                attachments.push({ id, type: 'file', name });
            return name ? `[文件：${name}]` : '[文件]';
        }
        return string(item.text);
    }).join('') : '').filter(Boolean);
    const files = Array.isArray(row.files) ? row.files : [];
    for (const value of files) {
        const file = record(value);
        const id = string(file?.file_key);
        const name = string(file?.file_name) || id;
        if (id)
            attachments.push({ id, type: 'file', name });
    }
    return {
        title,
        text: cleanText([title, ...lines].filter(Boolean).join('\n')),
        attachments: [...new Map(attachments.map(attachment => [`${attachment.type}:${attachment.id}`, attachment])).values()],
    };
}
function cardContent(value) {
    const root = record(value);
    if (!root)
        return { text: '', title: '', attachments: [] };
    const header = record(root.header);
    const title = string(record(header?.title)?.content || root.title);
    const text = [];
    const attachments = [];
    const fields = [];
    const actions = [];
    const visibleText = (value) => {
        if (typeof value === 'string')
            return cleanText(value);
        if (Array.isArray(value))
            return cleanText(value.map(visibleText).filter(Boolean).join(' '));
        const item = record(value);
        if (!item)
            return '';
        return cleanText([string(item.content), string(item.text), string(item.label), string(item.name)].filter(Boolean).join(' '));
    };
    const visit = (value) => {
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        const item = record(value);
        if (!item)
            return;
        const tag = string(item.tag);
        if (tag === 'img' || tag === 'image') {
            const id = string(item.image_key || item.img_key);
            if (id)
                attachments.push({ id, type: 'image', name: `${id}.jpg` });
        }
        if (tag === 'file') {
            const id = string(item.file_key);
            const name = string(item.file_name) || id;
            if (id)
                attachments.push({ id, type: 'file', name });
        }
        const fieldItems = Array.isArray(item.fields) ? item.fields : [];
        for (const fieldValue of fieldItems) {
            const field = record(fieldValue);
            if (!field)
                continue;
            const label = visibleText(field.label || field.name || field.title);
            const fieldContent = visibleText(field.value || field.content || field.text);
            if (label || fieldContent)
                fields.push({ label, value: fieldContent });
        }
        const actionLabel = visibleText(item.text || item.content || item.label || item.name) || '打开链接';
        const actionUrls = [string(item.url || item.href || item.default_url || item.defaultUrl)];
        if (Array.isArray(item.behaviors))
            actionUrls.push(...item.behaviors.map(value => {
                const behavior = record(value);
                return string(behavior?.default_url || behavior?.defaultUrl || behavior?.url || behavior?.href);
            }));
        for (const url of [...new Set(actionUrls.filter(Boolean))]) {
            actions.push({ label: actionLabel, url });
            text.push(`${actionLabel} (${url})`);
        }
        const direct = string(item.content || item.text);
        if (direct)
            text.push(direct);
        for (const [key, child] of Object.entries(item)) {
            if (!['content', 'text', 'behaviors'].includes(key) && (Array.isArray(child) || record(child)))
                visit(child);
        }
    };
    visit(root.body || root.elements);
    const body = cleanText(text.join('\n'));
    return {
        title, text: cleanText([title, body].filter(Boolean).join('\n')),
        attachments: [...new Map(attachments.map(attachment => [`${attachment.type}:${attachment.id}`, attachment])).values()],
        ...(fields.length ? { fields: [...new Map(fields.map(field => [`${field.label}\n${field.value}`, field])).values()] } : {}),
        ...(actions.length ? { actions: [...new Map(actions.map(action => [`${action.label}\n${action.url ?? ''}`, action])).values()] } : {}),
    };
}
function safeAttachmentName(name, id, type) {
    const original = basename(name.trim());
    const rawExtension = extname(original).replace(/[^A-Za-z0-9.]+/gu, '').slice(0, 16);
    const extension = rawExtension || (type === 'image' ? '.jpg' : type === 'audio' ? '.opus' : type === 'video' ? '.mp4' : '');
    const stem = original.slice(0, Math.max(0, original.length - extname(original).length)).normalize('NFKC')
        .replace(/[^A-Za-z0-9._-]+/gu, '_').replace(/\.\.+/gu, '_').replace(/^\.+/u, '').slice(0, 96) || type;
    return `${stem}-${createHash('sha256').update(id).digest('hex').slice(0, 12)}${extension}`;
}
function parseContent(messageType, content) {
    const parsed = record(parseJson(content));
    if (!parsed)
        return { text: '', title: '', attachments: [] };
    if (messageType === 'text')
        return { text: cleanText(string(parsed.text)), title: '', attachments: [] };
    if (messageType === 'post')
        return richContent(parsed);
    if (messageType === 'image') {
        const id = string(parsed.image_key);
        return { text: '[图片]', title: '', attachments: id ? [{ id, type: 'image', name: `${id}.jpg` }] : [] };
    }
    if (messageType === 'file') {
        const id = string(parsed.file_key);
        const name = string(parsed.file_name) || id;
        return { text: name ? `[文件：${name}]` : '', title: name, attachments: id ? [{ id, type: 'file', name }] : [] };
    }
    if (messageType === 'audio') {
        const id = string(parsed.file_key);
        return { text: '[音频]', title: '', attachments: id ? [{ id, type: 'audio', name: `${id}.opus` }] : [] };
    }
    if (messageType === 'media') {
        const id = string(parsed.file_key);
        const name = string(parsed.file_name) || `${id}.mp4`;
        return { text: `[视频：${name}]`, title: name, attachments: id ? [{ id, type: 'video', name }] : [] };
    }
    if (messageType === 'interactive')
        return cardContent(parsed);
    return { text: cleanText(string(parsed.text || parsed.content)), title: '', attachments: [] };
}
/** Converts Feishu wire data into the provider-neutral Core envelope. */
export function normalizeFeishuMessage(config, payload) {
    const envelope = record(payload);
    const event = record(envelope?.event) ?? envelope;
    const message = record(event?.message);
    const sender = record(event?.sender);
    if (!message || !sender)
        return null;
    const messageId = string(message.message_id || message.messageId);
    const chatId = string(message.chat_id || message.chatId);
    if (!messageId || !chatId)
        return null;
    const messageType = string(message.message_type || message.messageType || message.msg_type);
    const rawContent = parseJson(message.content);
    const parsed = parseContent(messageType, rawContent);
    const mentions = [...normalizeMentions(message.mentions), ...(messageType === 'post' ? inlinePostMentions(rawContent) : [])];
    const senderId = record(sender.sender_id || sender.senderId);
    const senderTypeRaw = string(sender.sender_type || sender.senderType);
    const senderType = senderTypeRaw === 'app' || senderTypeRaw === 'bot' ? senderTypeRaw : 'user';
    // Card-action callbacks identify their operator by open_id. Prefer the same
    // identity for message events so binding ownership and later interactive
    // approvals compare values from one stable namespace.
    const senderIdentity = string(senderId?.open_id || senderId?.openId || senderId?.union_id || senderId?.unionId || senderId?.user_id || senderId?.userId || senderId?.app_id || senderId?.appId);
    let text = parsed.text;
    let addressedToAgent = false;
    let mentionsOtherRecipient = false;
    for (const mention of mentions) {
        const own = Boolean(config.botOpenId && mention.openId === config.botOpenId) || mention.appId === config.appId;
        addressedToAgent ||= own;
        mentionsOtherRecipient ||= !own && Boolean(mention.openId || mention.appId);
        if (mention.key)
            text = text.split(mention.key).join(own ? ' ' : `@${mention.name || '用户'}`);
        else if (own && mention.name)
            text = text.split(`@${mention.name}`).join(' ');
    }
    text = cleanText(text.replace(/@_user_\d+/gu, ' '));
    const chatType = string(message.chat_type || message.chatType) === 'p2p' ? 'p2p' : 'group';
    const rootId = string(message.root_id || message.rootId);
    const threadId = string(message.thread_id || message.threadId);
    const declaredChatMode = string(message.chat_mode || message.chatMode || event?.chat_mode || event?.chatMode);
    const inTopic = declaredChatMode === 'topic' || Boolean(rootId && threadId);
    // `scope` is an authorization boundary, not only a UI grouping hint. Keep
    // p2p messages private even when product policy isolates each root message;
    // the optional root id still gives those messages independent bindings.
    const scope = chatType === 'p2p' ? 'private' : inTopic ? 'topic' : 'group';
    const bindingRoot = chatType === 'p2p'
        ? (config.privateConversationMode === 'topic' ? (rootId || messageId) : undefined)
        : scope === 'topic' ? (rootId || messageId) : undefined;
    const parentId = string(message.parent_id || message.parentId);
    const replyTo = parentId && parentId !== messageId && (!inTopic || (parentId !== rootId && parentId !== threadId)) ? parentId : undefined;
    const eventId = string(envelope?.event_id || envelope?.eventId || record(envelope?.header)?.event_id) || messageId;
    return {
        provider: 'feishu', accountId: config.accountId, eventId, messageId,
        conversation: { id: chatId, scope, ...(bindingRoot ? { rootId: bindingRoot } : {}) },
        sender: { id: senderIdentity, type: senderType },
        content: {
            type: messageType,
            ...(parsed.title ? { title: parsed.title } : {}),
            ...(parsed.fields?.length ? { fields: parsed.fields } : {}),
            ...(parsed.actions?.length ? { actions: parsed.actions } : {}),
            ...(rawContent !== null && rawContent !== undefined ? { raw: rawContent } : {}),
        },
        text, ...(replyTo ? { replyTo } : {}), attachments: parsed.attachments,
        addressedToAgent: chatType === 'p2p' || addressedToAgent,
        mentionsOtherRecipient,
        createdAtIso: new Date(Number(message.create_time || message.createTime) || Date.now()).toISOString(),
    };
}
/** Merge the authoritative REST message body into a realtime event. Feishu can
 * emit `nonsupport` or a reduced interactive-card fallback over WebSocket. */
export function hydrateFeishuMessagePayload(payload, detail) {
    const envelope = record(payload);
    const event = record(envelope?.event) ?? envelope;
    const message = record(event?.message);
    const detailRoot = record(detail);
    const data = record(detailRoot?.data) ?? detailRoot;
    const item = Array.isArray(data?.items) ? record(data.items[0]) : record(data?.item);
    const body = record(item?.body);
    const content = body?.content;
    const messageType = string(item?.msg_type || item?.message_type);
    if (!envelope || !event || !message || !item || !messageType || typeof content !== 'string')
        return payload;
    const hydratedEvent = { ...event, message: { ...message, message_type: messageType, content } };
    return envelope.event ? { ...envelope, event: hydratedEvent } : hydratedEvent;
}
/**
 * Topic-group root events may omit both root_id and thread_id. The provider can
 * resolve the chat mode once and apply it without leaking Feishu chat metadata
 * into the provider-neutral envelope.
 */
export function applyFeishuChatMode(message, chatMode) {
    if (message.conversation.scope !== 'group' || chatMode !== 'topic')
        return message;
    return {
        ...message,
        conversation: { ...message.conversation, scope: 'topic', rootId: message.conversation.rootId || message.messageId },
    };
}
export function normalizeFeishuAction(payload) {
    const body = record(payload);
    const action = record(body?.action);
    let value = record(action?.value) ?? {};
    if (typeof action?.value === 'string')
        value = record(parseJson(action.value)) ?? {};
    const selectedOption = string(action?.option || action?.selected_option);
    const optionValue = record(parseJson(selectedOption));
    if (optionValue)
        value = { ...value, ...optionValue };
    const operator = record(body?.operator);
    const operatorId = record(operator?.operator_id);
    const context = record(body?.context);
    return {
        eventId: string(body?.event_id || record(body?.header)?.event_id),
        actorId: string(operatorId?.open_id || operator?.open_id),
        remoteMessageId: string(context?.open_message_id || body?.open_message_id),
        value,
        option: selectedOption || string(value.option),
    };
}
function redactError(value, secret) {
    const row = record(value);
    const response = record(row?.response);
    const data = record(response?.data);
    const message = string(data?.msg || data?.message || row?.message) || String(value);
    return message.split(secret).join('[REDACTED]').replace(/\bBearer\s+\S+/giu, 'Bearer [REDACTED]').slice(0, 1_000);
}
/** Node-only Feishu transport. It does not interpret Codex events or product targets. */
export class FeishuProvider {
    config;
    client;
    ws = null;
    state = 'idle';
    reviveTimer = null;
    chatMetadataCache = new Map();
    userMetadataCache = new Map();
    applicationAdministratorsCache = null;
    constructor(config) {
        this.config = config;
        this.client = new Lark.Client({
            appId: config.appId,
            appSecret: config.appSecret,
            domain: config.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
            logger: {
                error: (...values) => console.error('[feishu-sdk]', values.map(value => redactError(value, config.appSecret)).join(' ')),
                warn: (...values) => console.warn('[feishu-sdk]', values.map(value => redactError(value, config.appSecret)).join(' ')),
                info: () => undefined, debug: () => undefined, trace: () => undefined,
            },
        });
    }
    async identity() {
        const response = await this.client.request({ method: 'GET', url: '/open-apis/bot/v3/info/' });
        if (response.code !== 0 || !response.bot?.open_id)
            throw new Error(`Feishu bot identity failed: ${response.msg ?? 'missing bot identity'} (${response.code ?? 'unknown'})`);
        this.config.botOpenId = response.bot.open_id;
        return { id: response.bot.open_id, name: response.bot.app_name?.trim() ?? '' };
    }
    /** Resolve approval administrators from the currently authenticated app.
     * Open IDs returned here are guaranteed to belong to this app's namespace. */
    async applicationAdministrators() {
        const nowMs = Date.now();
        if (this.applicationAdministratorsCache && this.applicationAdministratorsCache.expiresAtMs > nowMs) {
            return this.applicationAdministratorsCache.value;
        }
        const value = this.loadApplicationAdministrators();
        this.applicationAdministratorsCache = { expiresAtMs: nowMs + 5 * 60_000, value };
        try {
            return await value;
        }
        catch (error) {
            if (this.applicationAdministratorsCache?.value === value)
                this.applicationAdministratorsCache = null;
            throw error;
        }
    }
    async loadApplicationAdministrators() {
        const [application, collaborators] = await Promise.all([
            this.client.application.v6.application.get({
                path: { app_id: this.config.appId },
                params: { lang: 'zh_cn', user_id_type: 'open_id' },
            }),
            this.client.application.v6.applicationCollaborators.get({
                path: { app_id: this.config.appId },
                params: { user_id_type: 'open_id' },
            }),
        ]);
        if (application.code !== 0) {
            throw new Error(`Feishu application owner lookup failed: ${application.msg ?? 'unknown'} (${application.code ?? 'unknown'})`);
        }
        if (collaborators.code !== 0) {
            throw new Error(`Feishu application collaborator lookup failed: ${collaborators.msg ?? 'unknown'} (${collaborators.code ?? 'unknown'})`);
        }
        const ownerId = string(application.data?.app?.creator_id || application.data?.app?.owner?.owner_id);
        const administratorIds = [...new Set([
                ownerId,
                ...(collaborators.data?.collaborators ?? [])
                    .filter(collaborator => collaborator.type === 'administrator')
                    .map(collaborator => collaborator.user_id),
            ].map(value => value.trim()).filter(value => /^ou_[A-Za-z0-9_-]+$/u.test(value)))];
        if (administratorIds.length === 0)
            throw new Error('Feishu application administrator lookup returned no valid Open ID');
        return { ownerId: administratorIds.includes(ownerId) ? ownerId : '', administratorIds };
    }
    async start(handlers) {
        if (this.ws)
            return;
        this.setState('connecting', handlers);
        const dispatcher = new Lark.EventDispatcher({}).register({
            'im.message.receive_v1': (payload) => {
                void this.normalizeInbound(payload)
                    .then(message => message ? this.resolveChatMode(message) : null)
                    .then(message => message ? handlers.onMessage(message) : undefined)
                    .catch(error => handlers.onState(this.state, error instanceof Error ? error : new Error(String(error))));
            },
            'card.action.trigger': (payload) => handlers.onAction(normalizeFeishuAction(payload)),
        });
        this.ws = new Lark.WSClient({
            appId: this.config.appId,
            appSecret: this.config.appSecret,
            domain: this.config.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
            loggerLevel: Lark.LoggerLevel.warn,
            wsConfig: { pingTimeout: 30 }, handshakeTimeoutMs: 15_000,
            onReady: () => this.setState('connected', handlers),
            onReconnecting: () => this.setState('reconnecting', handlers),
            onReconnected: () => this.setState('connected', handlers),
            onError: error => this.setState('failed', handlers, error),
        });
        await this.ws.start({ eventDispatcher: dispatcher });
        this.reviveTimer = setInterval(() => {
            if (!this.ws || this.ws.getConnectionStatus().state !== 'failed')
                return;
            this.setState('connecting', handlers);
            void this.ws.start({ eventDispatcher: dispatcher })
                .catch(error => this.setState('failed', handlers, error instanceof Error ? error : new Error(String(error))));
        }, 60_000);
        this.reviveTimer.unref?.();
    }
    stop() {
        if (this.reviveTimer)
            clearInterval(this.reviveTimer);
        this.reviveTimer = null;
        this.ws?.close({ force: true });
        this.ws = null;
        this.state = 'idle';
    }
    getState() { return this.state; }
    isOwnSenderId(senderId) {
        return Boolean(senderId) && (senderId === this.config.appId || senderId === this.config.botOpenId);
    }
    getConnectionDiagnostic(error) {
        const status = this.ws?.getConnectionStatus();
        const closeReason = this.state === 'reconnecting'
            ? 'Feishu WebSocket 已关闭，SDK 正在自动重连'
            : this.state === 'failed'
                ? error?.message || 'Feishu WebSocket 重连已停止'
                : '';
        return {
            state: this.state,
            atIso: new Date().toISOString(),
            reconnectAttempts: status?.reconnectAttempts ?? 0,
            lastConnectAtIso: status?.lastConnectTime ? new Date(status.lastConnectTime).toISOString() : null,
            nextConnectAtIso: status?.nextConnectTime ? new Date(status.nextConnectTime).toISOString() : null,
            closeCode: null,
            closeReason,
        };
    }
    /** Resolve user-facing chat metadata through the authenticated Bot. Results
     * are short-lived so renamed groups become visible without an API call for
     * every inbound message. */
    async chatMetadata(chatId, refresh = false) {
        const cached = this.chatMetadataCache.get(chatId);
        if (!refresh && cached && cached.expiresAtMs > Date.now())
            return cached.value;
        const value = this.client.im.v1.chat.get({ path: { chat_id: chatId } }).then(response => {
            if (response.code !== 0)
                throw new Error(`Feishu chat identity failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`);
            const rawMode = response.data?.chat_mode;
            const mode = rawMode === 'topic' || rawMode === 'p2p' ? rawMode : 'group';
            return { id: chatId, name: response.data?.name?.trim() ?? '', mode };
        });
        this.chatMetadataCache.set(chatId, { expiresAtMs: Date.now() + 5 * 60_000, value });
        try {
            return await value;
        }
        catch (error) {
            if (this.chatMetadataCache.get(chatId)?.value === value)
                this.chatMetadataCache.delete(chatId);
            throw error;
        }
    }
    /** Resolve a user display name in the current application's Open ID
     * namespace. The name field requires contact:user.base:readonly and may be
     * empty when the app has not received or published that permission. */
    async userMetadata(openId, refresh = false) {
        const cached = this.userMetadataCache.get(openId);
        if (!refresh && cached && cached.expiresAtMs > Date.now())
            return cached.value;
        const value = this.client.contact.v3.user.get({
            path: { user_id: openId },
            params: { user_id_type: 'open_id' },
        }).then(response => {
            if (response.code !== 0)
                throw new Error(`Feishu user identity failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`);
            return { id: openId, name: response.data?.user?.name?.trim() ?? '' };
        });
        this.userMetadataCache.set(openId, { expiresAtMs: Date.now() + 5 * 60_000, value });
        try {
            return await value;
        }
        catch (error) {
            if (this.userMetadataCache.get(openId)?.value === value)
                this.userMetadataCache.delete(openId);
            throw error;
        }
    }
    async resolveChatMode(message) {
        if (message.conversation.scope !== 'group')
            return message;
        try {
            const metadata = await this.chatMetadata(message.conversation.id);
            const resolved = applyFeishuChatMode(message, metadata.mode);
            return metadata.name ? { ...resolved, conversation: { ...resolved.conversation, name: metadata.name } } : resolved;
        }
        catch {
            // Chat metadata is enrichment only. Authorization remains group-scoped
            // and deny-by-default when Feishu cannot return chat details.
            return message;
        }
    }
    async normalizeInbound(payload) {
        const envelope = record(payload);
        const event = record(envelope?.event) ?? envelope;
        const message = record(event?.message);
        const messageType = string(message?.message_type || message?.messageType || message?.msg_type);
        const messageId = string(message?.message_id || message?.messageId);
        if (!messageId || (messageType !== 'nonsupport' && messageType !== 'interactive')) {
            return normalizeFeishuMessage(this.config, payload);
        }
        let lastError;
        for (const delay of [0, 200, 800]) {
            if (delay)
                await new Promise(resolve => setTimeout(resolve, delay));
            try {
                const detail = await this.client.request({
                    method: 'GET', url: `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}`,
                    params: { card_msg_content_type: 'user_card_content' },
                });
                const hydrated = normalizeFeishuMessage(this.config, hydrateFeishuMessagePayload(payload, detail));
                if (hydrated && hydrated.content?.type !== 'nonsupport')
                    return hydrated;
                lastError = new Error('message detail did not contain supported card content');
            }
            catch (error) {
                lastError = error;
            }
        }
        console.warn(`[feishu] message detail hydration failed for ${messageId}: ${redactError(lastError, this.config.appSecret)}`);
        return normalizeFeishuMessage(this.config, payload);
    }
    async sendText(chatId, text, uuid) {
        const response = await this.client.im.v1.message.create({ params: { receive_id_type: 'chat_id' }, data: { receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }), ...(uuid ? { uuid } : {}) } });
        return this.messageId(response);
    }
    async replyText(messageId, text, replyInThread = false, uuid) {
        const response = await this.client.im.v1.message.reply({ path: { message_id: messageId }, data: { msg_type: 'text', content: JSON.stringify({ text }), ...(replyInThread ? { reply_in_thread: true } : {}), ...(uuid ? { uuid } : {}) } });
        return this.messageId(response);
    }
    async sendCard(chatId, card, uuid) {
        const response = await this.client.im.v1.message.create({ params: { receive_id_type: 'chat_id' }, data: { receive_id: chatId, msg_type: 'interactive', content: JSON.stringify(card), ...(uuid ? { uuid } : {}) } });
        return this.messageId(response);
    }
    async replyCard(messageId, card, replyInThread = false, uuid) {
        const response = await this.client.im.v1.message.reply({ path: { message_id: messageId }, data: { msg_type: 'interactive', content: JSON.stringify(card), ...(replyInThread ? { reply_in_thread: true } : {}), ...(uuid ? { uuid } : {}) } });
        return this.messageId(response);
    }
    async sendUserCard(openId, card, uuid) {
        const response = await this.client.im.v1.message.create({ params: { receive_id_type: 'open_id' }, data: { receive_id: openId, msg_type: 'interactive', content: JSON.stringify(card), ...(uuid ? { uuid } : {}) } });
        return this.messageId(response);
    }
    async sendImage(chatId, imageKey, uuid) {
        const response = await this.client.im.v1.message.create({
            params: { receive_id_type: 'chat_id' },
            data: { receive_id: chatId, msg_type: 'image', content: JSON.stringify({ image_key: imageKey }), ...(uuid ? { uuid } : {}) },
        });
        return this.messageId(response);
    }
    async replyImage(messageId, imageKey, replyInThread = false, uuid) {
        const response = await this.client.im.v1.message.reply({
            path: { message_id: messageId },
            data: { msg_type: 'image', content: JSON.stringify({ image_key: imageKey }), ...(replyInThread ? { reply_in_thread: true } : {}), ...(uuid ? { uuid } : {}) },
        });
        return this.messageId(response);
    }
    async updateCard(messageId, card) {
        const response = await this.client.im.v1.message.patch({ path: { message_id: messageId }, data: { content: JSON.stringify(card) } });
        if (response.code !== 0)
            throw new Error(`Feishu card patch failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`);
    }
    /** Adds a native Feishu reaction to an existing message. Products can use
     * this as a lightweight receipt before a longer streamed response begins. */
    async addReaction(messageId, emojiType = 'GoGoGo') {
        const response = await this.client.im.v1.messageReaction.create({
            path: { message_id: messageId },
            data: { reaction_type: { emoji_type: emojiType } },
        });
        if (response.code !== 0)
            throw new Error(`Feishu reaction failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`);
        return response.data?.reaction_id ?? '';
    }
    /** Removes one reaction record previously returned by addReaction. */
    async removeReaction(messageId, reactionId) {
        const response = await this.client.im.v1.messageReaction.delete({
            path: { message_id: messageId, reaction_id: reactionId },
        });
        if (response.code !== 0)
            throw new Error(`Feishu reaction removal failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`);
    }
    async uploadImage(buffer) {
        const response = await this.client.im.v1.image.create({ data: { image_type: 'message', image: buffer } });
        if (!response?.image_key)
            throw new Error('Feishu image upload did not include image_key');
        return response.image_key;
    }
    async downloadAttachment(messageId, attachment, rootDir, maxBytes = 100 * 1024 * 1024) {
        const root = resolve(rootDir);
        await mkdir(root, { recursive: true });
        const target = join(root, safeAttachmentName(attachment.name, attachment.id, attachment.type));
        const partial = `${target}.part`;
        const response = await this.client.request({
            method: 'GET', url: `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/resources/${encodeURIComponent(attachment.id)}`,
            params: { type: attachment.type === 'image' ? 'image' : 'file' }, responseType: 'stream',
        });
        let bytes = 0;
        const limiter = new (await import('node:stream')).Transform({ transform(chunk, _encoding, callback) {
                bytes += chunk.length;
                callback(bytes > maxBytes ? new Error(`Feishu attachment exceeds ${maxBytes} bytes`) : null, chunk);
            } });
        try {
            await pipeline(response, limiter, createWriteStream(partial, { flags: 'wx', mode: 0o600 }));
            await rename(partial, target);
            const metadata = await stat(target);
            return { path: target, sizeBytes: metadata.size };
        }
        catch (error) {
            await unlink(partial).catch(() => undefined);
            throw error;
        }
    }
    classifyError(error) {
        const message = redactError(error, this.config.appSecret);
        const row = record(error);
        const response = record(row?.response);
        const data = record(response?.data);
        const status = Number(response?.status ?? row?.status);
        const code = Number(data?.code ?? row?.code);
        const retryable = status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
            || [99991663, 99991400].includes(code) || /timeout|network|socket|ECONN|rate.?limit/iu.test(message);
        return { message, retryable: retryable || (!Number.isFinite(status) && !Number.isFinite(code)) };
    }
    setState(state, handlers, error) {
        this.state = state;
        handlers.onState(state, error, this.getConnectionDiagnostic(error));
    }
    messageId(response) {
        if (response.code !== 0 || !response.data?.message_id)
            throw new Error(`Feishu message failed: ${response.msg ?? 'missing message id'} (${response.code ?? 'unknown'})`);
        return response.data.message_id;
    }
}
export function feishuTextCard(title, markdown, options = {}) {
    const elements = [{ tag: 'markdown', content: feishuCardMarkdown(markdown) }];
    if (options.actions?.length)
        elements.push({ tag: 'action', actions: options.actions.map(action => ({
                tag: 'button', text: { tag: 'plain_text', content: action.text.slice(0, 80) }, type: action.type ?? 'default',
                ...('url' in action ? { url: action.url } : { value: action.value }),
            })) });
    if (options.note)
        elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: options.note.slice(0, 500) }] });
    return {
        config: { wide_screen_mode: true },
        header: { template: options.color ?? 'blue', title: { tag: 'plain_text', content: title.slice(0, 80) } },
        elements,
    };
}
/** Renders an assistant response as native Feishu card Markdown without adding
 * product-specific chrome. Products retain control over reply/thread routing. */
export function feishuMarkdownCard(markdown, options = {}) {
    const elements = [{ tag: 'markdown', content: feishuCardMarkdown(markdown) }];
    if (options.note)
        elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: options.note.slice(0, 500) }] });
    return {
        config: { wide_screen_mode: true },
        elements,
    };
}
/** Split long assistant output into Feishu-safe cards without silently dropping
 * the tail. Products can reply each card with a stable per-part UUID. */
export function feishuMarkdownCards(markdown, options = {}) {
    const normalized = normalizeFeishuCardMarkdown(markdown) || ' ';
    const chunks = [];
    let remaining = normalized;
    while (remaining.length > 28_000) {
        const boundary = remaining.lastIndexOf('\n', 28_000);
        const end = boundary > 14_000 ? boundary : 28_000;
        chunks.push(remaining.slice(0, end));
        remaining = remaining.slice(end).replace(/^\n/u, '');
    }
    chunks.push(remaining || ' ');
    return chunks.map((content, index) => feishuMarkdownCard(content, {
        ...(options.note ? { note: chunks.length > 1 ? `${options.note}  |  ${index + 1}/${chunks.length}` : options.note } : {}),
    }));
}
/** A single patchable card for a live Codex turn. `reasoning` is intended for
 * the App Server's reasoning summary stream, never raw hidden reasoning. */
export function feishuStreamingCard(input) {
    const presentation = {
        received: { icon: '⏳', label: '已收到', color: 'blue' },
        thinking: { icon: '🧠', label: 'Codex 正在思考', color: 'turquoise' },
        answering: { icon: '✍️', label: '正在生成回复', color: 'turquoise' },
        completed: { icon: '✅', label: '已完成', color: 'green' },
        failed: { icon: '⚠️', label: '执行失败', color: 'red' },
    }[input.state];
    const elements = [];
    const reasoning = input.reasoning?.trim().slice(-4_000);
    if (reasoning && input.state !== 'completed') {
        elements.push({ tag: 'markdown', content: feishuCardMarkdown(`**思考摘要**\n${reasoning}`) });
        elements.push({ tag: 'hr' });
    }
    const body = input.error?.trim()
        ? `**错误**\n${input.error}`
        : input.answer?.trim() || (input.state === 'received' ? '消息已进入处理队列…' : '正在思考…');
    elements.push({ tag: 'markdown', content: feishuCardMarkdown(body) });
    if (input.note)
        elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: input.note.slice(0, 500) }] });
    return {
        config: { wide_screen_mode: true, update_multi: true },
        header: { template: presentation.color, title: { tag: 'plain_text', content: `${presentation.icon} ${presentation.label}` } },
        elements,
    };
}
function feishuCardMarkdown(markdown) {
    return normalizeFeishuCardMarkdown(markdown).slice(0, 28_000) || ' ';
}
function normalizeFeishuCardMarkdown(markdown) {
    let inFence = false;
    return markdown.split('\n').map(line => {
        if (/^\s*(```|~~~)/u.test(line)) {
            inFence = !inFence;
            return line;
        }
        if (inFence)
            return line;
        const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/u);
        return heading ? `**${heading[1]}**` : line;
    }).join('\n');
}
/** Selection card for product target pickers. Static selects avoid Feishu's
 * small per-row button limit and keep large Workspace/Demand lists usable. */
export function feishuSelectionCard(title, markdown, options, note = '') {
    const elements = [
        { tag: 'markdown', content: markdown.slice(0, 28_000) || ' ' },
        { tag: 'action', actions: [{
                    tag: 'select_static', placeholder: { tag: 'plain_text', content: '请选择' },
                    options: options.slice(0, 100).map(option => ({ text: { tag: 'plain_text', content: option.text.slice(0, 80) }, value: JSON.stringify(option.value) })),
                }] },
    ];
    if (note || options.length > 100)
        elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: (note || '选项超过 100 个，请先在 CodyWork 中整理。').slice(0, 500) }] });
    return {
        config: { wide_screen_mode: true },
        header: { template: 'blue', title: { tag: 'plain_text', content: title.slice(0, 80) } },
        elements,
    };
}
//# sourceMappingURL=index.js.map