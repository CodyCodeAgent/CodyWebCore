import * as Lark from '@larksuiteoapi/node-sdk';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
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
function richText(value) {
    const row = record(value);
    if (!row)
        return '';
    const localized = Array.isArray(row.content) ? row : Object.values(row).map(record).find(candidate => Array.isArray(candidate?.content));
    if (!localized)
        return '';
    const title = string(localized.title);
    const lines = localized.content.map(line => Array.isArray(line) ? line.map(element => {
        const item = record(element);
        if (!item)
            return '';
        if (item.tag === 'a')
            return `${string(item.text)}${item.href ? ` (${string(item.href)})` : ''}`;
        if (item.tag === 'at')
            return `@${string(item.user_name || item.user_id)}`;
        if (item.tag === 'img')
            return '[图片]';
        return string(item.text);
    }).join('') : '').filter(Boolean);
    return cleanText([title, ...lines].filter(Boolean).join('\n'));
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
        return { text: '', attachments: [] };
    if (messageType === 'text')
        return { text: cleanText(string(parsed.text)), attachments: [] };
    if (messageType === 'post')
        return { text: richText(parsed), attachments: [] };
    if (messageType === 'image') {
        const id = string(parsed.image_key);
        return { text: '[图片]', attachments: id ? [{ id, type: 'image', name: `${id}.jpg` }] : [] };
    }
    if (messageType === 'file') {
        const id = string(parsed.file_key);
        const name = string(parsed.file_name) || id;
        return { text: name ? `[文件：${name}]` : '', attachments: id ? [{ id, type: 'file', name }] : [] };
    }
    if (messageType === 'audio') {
        const id = string(parsed.file_key);
        return { text: '[音频]', attachments: id ? [{ id, type: 'audio', name: `${id}.opus` }] : [] };
    }
    if (messageType === 'media') {
        const id = string(parsed.file_key);
        const name = string(parsed.file_name) || `${id}.mp4`;
        return { text: `[视频：${name}]`, attachments: id ? [{ id, type: 'video', name }] : [] };
    }
    return { text: cleanText(string(parsed.text || parsed.content)), attachments: [] };
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
    const parsed = parseContent(messageType, message.content);
    const mentions = normalizeMentions(message.mentions);
    const senderId = record(sender.sender_id || sender.senderId);
    const senderTypeRaw = string(sender.sender_type || sender.senderType);
    const senderType = senderTypeRaw === 'app' || senderTypeRaw === 'bot' ? senderTypeRaw : 'user';
    const senderIdentity = string(senderId?.union_id || senderId?.unionId || senderId?.open_id || senderId?.openId || senderId?.user_id || senderId?.userId || senderId?.app_id || senderId?.appId);
    let text = parsed.text;
    let addressedToAgent = false;
    let mentionsOtherRecipient = false;
    for (const mention of mentions) {
        const own = Boolean(config.botOpenId && mention.openId === config.botOpenId) || mention.appId === config.appId;
        addressedToAgent ||= own;
        mentionsOtherRecipient ||= !own && Boolean(mention.openId || mention.appId);
        if (mention.key)
            text = text.split(mention.key).join(own ? ' ' : `@${mention.name || '用户'}`);
    }
    text = cleanText(text.replace(/@_user_\d+/gu, ' '));
    const chatType = string(message.chat_type || message.chatType) === 'p2p' ? 'p2p' : 'group';
    const rootId = string(message.root_id || message.rootId);
    const threadId = string(message.thread_id || message.threadId);
    const inTopic = Boolean(rootId && threadId);
    // `scope` is an authorization boundary, not only a UI grouping hint. Keep
    // p2p messages private even when product policy isolates each root message;
    // the optional root id still gives those messages independent bindings.
    const scope = chatType === 'p2p' ? 'private' : inTopic ? 'topic' : 'group';
    const bindingRoot = chatType === 'p2p'
        ? (config.privateConversationMode === 'topic' ? (rootId || messageId) : undefined)
        : scope === 'topic' ? rootId : undefined;
    const parentId = string(message.parent_id || message.parentId);
    const replyTo = parentId && parentId !== messageId && (!inTopic || (parentId !== rootId && parentId !== threadId)) ? parentId : undefined;
    const eventId = string(envelope?.event_id || envelope?.eventId || record(envelope?.header)?.event_id) || messageId;
    return {
        provider: 'feishu', accountId: config.accountId, eventId, messageId,
        conversation: { id: chatId, scope, ...(bindingRoot ? { rootId: bindingRoot } : {}) },
        sender: { id: senderIdentity, type: senderType }, text, ...(replyTo ? { replyTo } : {}), attachments: parsed.attachments,
        addressedToAgent: chatType === 'p2p' || addressedToAgent,
        mentionsOtherRecipient,
        createdAtIso: new Date(Number(message.create_time || message.createTime) || Date.now()).toISOString(),
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
    async start(handlers) {
        if (this.ws)
            return;
        this.setState('connecting', handlers);
        const dispatcher = new Lark.EventDispatcher({}).register({
            'im.message.receive_v1': (payload) => {
                const message = normalizeFeishuMessage(this.config, payload);
                if (message)
                    void Promise.resolve(handlers.onMessage(message)).catch(error => handlers.onState(this.state, error instanceof Error ? error : new Error(String(error))));
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
    }
    stop() {
        this.ws?.close({ force: true });
        this.ws = null;
        this.state = 'idle';
    }
    getState() { return this.state; }
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
        handlers.onState(state, error);
    }
    messageId(response) {
        if (response.code !== 0 || !response.data?.message_id)
            throw new Error(`Feishu message failed: ${response.msg ?? 'missing message id'} (${response.code ?? 'unknown'})`);
        return response.data.message_id;
    }
}
export function feishuTextCard(title, markdown, options = {}) {
    const elements = [{ tag: 'markdown', content: markdown.slice(0, 28_000) || ' ' }];
    if (options.actions?.length)
        elements.push({ tag: 'action', actions: options.actions.map(action => ({ tag: 'button', text: { tag: 'plain_text', content: action.text }, type: action.type ?? 'default', value: action.value })) });
    if (options.note)
        elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: options.note.slice(0, 500) }] });
    return {
        config: { wide_screen_mode: true },
        header: { template: options.color ?? 'blue', title: { tag: 'plain_text', content: title.slice(0, 80) } },
        elements,
    };
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