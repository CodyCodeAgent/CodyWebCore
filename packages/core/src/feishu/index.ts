import * as Lark from '@larksuiteoapi/node-sdk'
import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, stat, unlink } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ChannelAttachment, ChannelDeliveryError, ChannelIdentityType, ChannelInboundMessage, ChannelMention, ChannelQuotedMessage } from '../channel/index.js'

export type FeishuDomain = 'feishu' | 'lark'
export type FeishuConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed'
export type FeishuCard = Record<string, unknown>
export type FeishuStreamState = 'received' | 'thinking' | 'answering' | 'completed' | 'failed'

const feishuMarkdownParser = new MarkdownIt({ html: false, linkify: false, breaks: false })
const FEISHU_CARD_CONTENT_LIMIT = 28_000
const FEISHU_CARD_ELEMENT_BUDGET = 26_000

export type FeishuApplicationAdministrators = {
  /** The current application's owner in this application's Open ID namespace. */
  ownerId: string
  /** Owner first, followed by the remaining application administrators. */
  administratorIds: string[]
}

export type FeishuConnectionDiagnostic = {
  state: FeishuConnectionState
  atIso: string
  reconnectAttempts: number
  lastConnectAtIso: string | null
  nextConnectAtIso: string | null
  /** The current SDK does not expose WebSocket close frames. Keep this null
   * instead of inventing a close code; products can render it as unavailable. */
  closeCode: number | null
  closeReason: string
}

export type FeishuCardButton =
  | { text: string; value: Record<string, unknown>; type?: 'primary' | 'default' | 'danger'; url?: never }
  | { text: string; url: string; type?: 'primary' | 'default' | 'danger'; value?: never }

export type FeishuAccountConfig = {
  accountId: string
  appId: string
  appSecret: string
  domain?: FeishuDomain
  botOpenId?: string
  privateConversationMode?: 'topic' | 'chat'
}

export type FeishuCardAction = {
  eventId: string
  actorId: string
  remoteMessageId: string
  value: Record<string, unknown>
  option: string
}

export type FeishuProviderHandlers = {
  onMessage(message: ChannelInboundMessage): void | Promise<void>
  onAction(action: FeishuCardAction): unknown | Promise<unknown>
  onState(state: FeishuConnectionState, error?: Error, diagnostic?: FeishuConnectionDiagnostic): void
}

export type FeishuChatMode = 'group' | 'p2p' | 'topic'
export type FeishuChatMetadata = { id: string; name: string; mode: FeishuChatMode }
export type FeishuChatBotMetadata = { id: string; name: string }
export type FeishuUserMetadata = { id: string; name: string }

/** Message kinds whose content and resources are normalized by this adapter. */
export const FEISHU_MESSAGE_TYPES = ['text', 'post', 'image', 'file', 'audio', 'media', 'interactive'] as const

type JsonRecord = Record<string, unknown>
type ParsedContent = {
  text: string
  title: string
  attachments: ChannelAttachment[]
  fields?: Array<{ label: string; value: string }>
  actions?: Array<{ label: string; url?: string }>
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) as unknown } catch { return null }
}

/** Normalize the observer-scoped bot handles returned by Feishu's current-chat
 * bot roster endpoint. These Open IDs are the only safe identities for a Bot
 * to use when it wants to mention a peer Bot in the same chat. */
export function normalizeFeishuChatBots(value: unknown): FeishuChatBotMetadata[] {
  const payload = record(value)
  const data = record(payload?.data)
  const items = Array.isArray(data?.items) ? data.items : []
  const seen = new Set<string>()
  return items.flatMap(item => {
    const row = record(item)
    const id = string(row?.bot_id || row?.botId).trim()
    if (!id.startsWith('ou_') || seen.has(id)) return []
    seen.add(id)
    return [{ id, name: string(row?.bot_name || row?.botName).trim() }]
  })
}

function cleanText(value: string): string {
  return value.replace(/[ \t]+/gu, ' ').replace(/ *\n */gu, '\n').replace(/\n{3,}/gu, '\n\n').trim()
}

function normalizeMentions(value: unknown): Array<{ key: string; name: string; openId: string; appId: string }> {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    const row = record(item)
    const id = record(row?.id)
    if (!row) return []
    return [{
      key: string(row.key), name: string(row.name),
      openId: string(id?.open_id || id?.openId || (row.id_type === 'open_id' ? row.id : '')),
      appId: string(id?.app_id || id?.appId || (row.id_type === 'app_id' ? row.id : '')),
    }]
  })
}

function identityType(identity: Record<string, unknown> | null, value: string): ChannelIdentityType {
  if (!value) return 'unknown'
  if (string(identity?.open_id || identity?.openId) === value) return 'open_id'
  if (string(identity?.app_id || identity?.appId) === value) return 'app_id'
  if (string(identity?.user_id || identity?.userId) === value) return 'user_id'
  if (string(identity?.union_id || identity?.unionId) === value) return 'union_id'
  if (value.startsWith('ou_')) return 'open_id'
  if (value.startsWith('cli_')) return 'app_id'
  return 'unknown'
}

function inlinePostMentions(value: unknown): Array<{ key: string; name: string; openId: string; appId: string }> {
  const row = record(value)
  if (!row) return []
  const localized = Array.isArray(row.content) ? row : Object.values(row).map(record).find(candidate => Array.isArray(candidate?.content))
  if (!localized) return []
  return (localized.content as unknown[]).flatMap(line => Array.isArray(line) ? line.flatMap(element => {
    const item = record(element)
    if (item?.tag !== 'at') return []
    const id = string(item.user_id)
    return [{
      key: '', name: string(item.user_name) || id,
      openId: id.startsWith('ou_') ? id : '', appId: id.startsWith('cli_') ? id : '',
    }]
  }) : [])
}

function richContent(value: unknown): ParsedContent {
  const row = record(value)
  if (!row) return { text: '', title: '', attachments: [] }
  const localized = Array.isArray(row.content) ? row : Object.values(row).map(record).find(candidate => Array.isArray(candidate?.content))
  if (!localized) return { text: '', title: '', attachments: [] }
  const title = string(localized.title)
  const attachments: ChannelAttachment[] = []
  const lines = (localized.content as unknown[]).map(line => Array.isArray(line) ? line.map(element => {
    const item = record(element)
    if (!item) return ''
    if (item.tag === 'a') return `${string(item.text)}${item.href ? ` (${string(item.href)})` : ''}`
    if (item.tag === 'at') return `@${string(item.user_name || item.user_id)}`
    if (item.tag === 'img' || item.tag === 'media') {
      const id = string(item.image_key || item.imageKey)
      if (id) attachments.push({ id, type: 'image', name: `${id}.jpg` })
      return '[图片]'
    }
    if (item.tag === 'file') {
      const id = string(item.file_key)
      const name = string(item.file_name) || id
      if (id) attachments.push({ id, type: 'file', name })
      return name ? `[文件：${name}]` : '[文件]'
    }
    return string(item.text)
  }).join('') : '').filter(Boolean)
  const files = Array.isArray(row.files) ? row.files : []
  for (const value of files) {
    const file = record(value)
    const id = string(file?.file_key)
    const name = string(file?.file_name) || id
    if (id) attachments.push({ id, type: 'file', name })
  }
  return {
    title,
    text: cleanText([title, ...lines].filter(Boolean).join('\n')),
    attachments: [...new Map(attachments.map(attachment => [`${attachment.type}:${attachment.id}`, attachment])).values()],
  }
}

function cardContent(value: unknown): ParsedContent {
  const root = record(value)
  if (!root) return { text: '', title: '', attachments: [] }
  const header = record(root.header)
  const title = string(record(header?.title)?.content || root.title)
  const text: string[] = []
  const attachments: ChannelAttachment[] = []
  const fields: Array<{ label: string; value: string }> = []
  const actions: Array<{ label: string; url?: string }> = []
  const visibleText = (value: unknown): string => {
    if (typeof value === 'string') return cleanText(value)
    if (Array.isArray(value)) return cleanText(value.map(visibleText).filter(Boolean).join(' '))
    const item = record(value)
    if (!item) return ''
    return cleanText([string(item.content), string(item.text), string(item.label), string(item.name)].filter(Boolean).join(' '))
  }
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return }
    const item = record(value)
    if (!item) return
    const tag = string(item.tag)
    if (tag === 'img' || tag === 'image') {
      const id = string(item.image_key || item.img_key)
      if (id) attachments.push({ id, type: 'image', name: `${id}.jpg` })
    }
    if (tag === 'file') {
      const id = string(item.file_key)
      const name = string(item.file_name) || id
      if (id) attachments.push({ id, type: 'file', name })
    }
    const fieldItems = Array.isArray(item.fields) ? item.fields : []
    for (const fieldValue of fieldItems) {
      const field = record(fieldValue)
      if (!field) continue
      const label = visibleText(field.label || field.name || field.title)
      const fieldContent = visibleText(field.value || field.content || field.text)
      if (label || fieldContent) fields.push({ label, value: fieldContent })
    }
    const actionLabel = visibleText(item.text || item.content || item.label || item.name) || '打开链接'
    const actionUrls = [string(item.url || item.href || item.default_url || item.defaultUrl)]
    if (Array.isArray(item.behaviors)) actionUrls.push(...item.behaviors.map(value => {
      const behavior = record(value)
      return string(behavior?.default_url || behavior?.defaultUrl || behavior?.url || behavior?.href)
    }))
    for (const url of [...new Set(actionUrls.filter(Boolean))]) {
      actions.push({ label: actionLabel, url })
      text.push(`${actionLabel} (${url})`)
    }
    const direct = string(item.content || item.text)
    if (direct) text.push(direct)
    for (const [key, child] of Object.entries(item)) {
      if (!['content', 'text', 'behaviors'].includes(key) && (Array.isArray(child) || record(child))) visit(child)
    }
  }
  visit(root.body || root.elements)
  const body = cleanText(text.join('\n'))
  return {
    title, text: cleanText([title, body].filter(Boolean).join('\n')),
    attachments: [...new Map(attachments.map(attachment => [`${attachment.type}:${attachment.id}`, attachment])).values()],
    ...(fields.length ? { fields: [...new Map(fields.map(field => [`${field.label}\n${field.value}`, field])).values()] } : {}),
    ...(actions.length ? { actions: [...new Map(actions.map(action => [`${action.label}\n${action.url ?? ''}`, action])).values()] } : {}),
  }
}

function safeAttachmentName(name: string, id: string, type: ChannelAttachment['type']): string {
  const original = basename(name.trim())
  const rawExtension = extname(original).replace(/[^A-Za-z0-9.]+/gu, '').slice(0, 16)
  const extension = rawExtension || (type === 'image' ? '.jpg' : type === 'audio' ? '.opus' : type === 'video' ? '.mp4' : '')
  const stem = original.slice(0, Math.max(0, original.length - extname(original).length)).normalize('NFKC')
    .replace(/[^A-Za-z0-9._-]+/gu, '_').replace(/\.\.+/gu, '_').replace(/^\.+/u, '').slice(0, 96) || type
  return `${stem}-${createHash('sha256').update(id).digest('hex').slice(0, 12)}${extension}`
}

function parseContent(messageType: string, content: unknown): ParsedContent {
  const parsed = record(parseJson(content))
  if (!parsed) return { text: '', title: '', attachments: [] }
  if (messageType === 'text') return { text: cleanText(string(parsed.text)), title: '', attachments: [] }
  if (messageType === 'post') return richContent(parsed)
  if (messageType === 'image') {
    const id = string(parsed.image_key)
    return { text: '[图片]', title: '', attachments: id ? [{ id, type: 'image', name: `${id}.jpg` }] : [] }
  }
  if (messageType === 'file') {
    const id = string(parsed.file_key)
    const name = string(parsed.file_name) || id
    return { text: name ? `[文件：${name}]` : '', title: name, attachments: id ? [{ id, type: 'file', name }] : [] }
  }
  if (messageType === 'audio') {
    const id = string(parsed.file_key)
    return { text: '[音频]', title: '', attachments: id ? [{ id, type: 'audio', name: `${id}.opus` }] : [] }
  }
  if (messageType === 'media') {
    const id = string(parsed.file_key)
    const name = string(parsed.file_name) || `${id}.mp4`
    return { text: `[视频：${name}]`, title: name, attachments: id ? [{ id, type: 'video', name }] : [] }
  }
  if (messageType === 'interactive') return cardContent(parsed)
  return { text: cleanText(string(parsed.text || parsed.content)), title: '', attachments: [] }
}

/** Converts Feishu wire data into the provider-neutral Core envelope. */
export function normalizeFeishuMessage(config: FeishuAccountConfig, payload: unknown): ChannelInboundMessage | null {
  const envelope = record(payload)
  const event = record(envelope?.event) ?? envelope
  const message = record(event?.message)
  const sender = record(event?.sender)
  if (!message || !sender) return null
  const messageId = string(message.message_id || message.messageId)
  const chatId = string(message.chat_id || message.chatId)
  if (!messageId || !chatId) return null
  const messageType = string(message.message_type || message.messageType || message.msg_type)
  const rawContent = parseJson(message.content)
  const parsed = parseContent(messageType, rawContent)
  const mentions = [...normalizeMentions(message.mentions), ...(messageType === 'post' ? inlinePostMentions(rawContent) : [])]
  const senderId = record(sender.sender_id || sender.senderId)
  const senderTypeRaw = string(sender.sender_type || sender.senderType)
  const senderType: ChannelInboundMessage['sender']['type'] = senderTypeRaw === 'app' || senderTypeRaw === 'bot' ? senderTypeRaw : 'user'
  // Card-action callbacks identify their operator by open_id. Prefer the same
  // identity for message events so binding ownership and later interactive
  // approvals compare values from one stable namespace.
  const senderIdentity = string(senderId?.open_id || senderId?.openId || senderId?.union_id || senderId?.unionId || senderId?.user_id || senderId?.userId || senderId?.app_id || senderId?.appId)
  const senderIdentityType = identityType(senderId, senderIdentity)
  const senderName = string(sender.sender_name || sender.senderName || sender.name).trim()
  const senderIdentities = [...new Map([
    ['open_id', string(senderId?.open_id || senderId?.openId)],
    ['app_id', string(senderId?.app_id || senderId?.appId)],
    ['user_id', string(senderId?.user_id || senderId?.userId)],
    ['union_id', string(senderId?.union_id || senderId?.unionId)],
  ].filter((entry): entry is [ChannelIdentityType, string] => Boolean(entry[1])).map(([idType, id]) => [id, { id, idType }])).values()]
  let text = parsed.text
  let addressedToAgent = false
  let mentionsOtherRecipient = false
  const structuredMentions: ChannelMention[] = []
  for (const mention of mentions) {
    const own = Boolean(config.botOpenId && mention.openId === config.botOpenId) || mention.appId === config.appId
    const id = mention.openId || mention.appId
    if (id && !structuredMentions.some(item => item.id === id)) structuredMentions.push({
      id,
      idType: mention.openId ? 'open_id' : 'app_id',
      type: mention.appId ? 'app' : 'user',
      name: mention.name,
      isAgent: own,
    })
    addressedToAgent ||= own
    mentionsOtherRecipient ||= !own && Boolean(mention.openId || mention.appId)
    if (mention.key) text = text.split(mention.key).join(own ? ' ' : `@${mention.name || '用户'}`)
    else if (own && mention.name) text = text.split(`@${mention.name}`).join(' ')
  }
  text = cleanText(text.replace(/@_user_\d+/gu, ' '))
  const chatType = string(message.chat_type || message.chatType) === 'p2p' ? 'p2p' : 'group'
  const rootId = string(message.root_id || message.rootId)
  const threadId = string(message.thread_id || message.threadId)
  const declaredChatMode = string(message.chat_mode || message.chatMode || event?.chat_mode || event?.chatMode)
  const inTopic = declaredChatMode === 'topic' || Boolean(rootId && threadId)
  // `scope` is an authorization boundary, not only a UI grouping hint. Keep
  // p2p messages private even when product policy isolates each root message;
  // the optional root id still gives those messages independent bindings.
  const scope = chatType === 'p2p' ? 'private' : inTopic ? 'topic' : 'group'
  const bindingRoot = chatType === 'p2p'
    ? (config.privateConversationMode === 'topic' ? (rootId || messageId) : undefined)
    : scope === 'topic' ? (rootId || messageId) : undefined
  const parentId = string(message.parent_id || message.parentId)
  const replyTo = parentId && parentId !== messageId && (!inTopic || (parentId !== rootId && parentId !== threadId)) ? parentId : undefined
  const eventId = string(envelope?.event_id || envelope?.eventId || record(envelope?.header)?.event_id) || messageId
  return {
    provider: 'feishu', accountId: config.accountId, eventId, messageId,
    conversation: { id: chatId, scope, ...(bindingRoot ? { rootId: bindingRoot } : {}) },
    sender: { id: senderIdentity, type: senderType, idType: senderIdentityType, identities: senderIdentities, ...(senderName ? { name: senderName } : {}) },
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
    mentions: structuredMentions,
    createdAtIso: new Date(Number(message.create_time || message.createTime) || Date.now()).toISOString(),
  }
}

/** Converts the REST `GET /im/v1/messages/:id` response into the same
 * provider-neutral envelope used for realtime messages. The caller supplies a
 * scope hint because Feishu message detail does not include chat_type. */
export function normalizeFeishuMessageDetail(
  config: FeishuAccountConfig,
  detail: unknown,
  scopeHint: ChannelInboundMessage['conversation']['scope'] = 'group',
): ChannelInboundMessage | null {
  const root = record(detail)
  const data = record(root?.data) ?? root
  const item = Array.isArray(data?.items) ? record(data.items[0]) : record(data?.item)
  const body = record(item?.body)
  const sender = record(item?.sender)
  const messageId = string(item?.message_id || item?.messageId)
  const chatId = string(item?.chat_id || item?.chatId)
  const messageType = string(item?.msg_type || item?.message_type || item?.messageType)
  const content = body?.content
  const senderId = string(sender?.id)
  const senderIdType = string(sender?.id_type || sender?.idType)
  if (!item || !sender || !messageId || !chatId || !messageType || typeof content !== 'string' || !senderId) return null
  const senderIdentity = ['open_id', 'app_id', 'user_id', 'union_id'].includes(senderIdType)
    ? { [senderIdType]: senderId }
    : senderId.startsWith('ou_') ? { open_id: senderId }
      : senderId.startsWith('cli_') ? { app_id: senderId }
        : { user_id: senderId }
  const mentions = Array.isArray(item.mentions) ? item.mentions.flatMap(value => {
    const mention = record(value)
    const id = string(mention?.id)
    const idType = string(mention?.id_type || mention?.idType)
    if (!mention || !id) return []
    return [{
      key: string(mention.key), name: string(mention.name), id_type: idType,
      id: ['open_id', 'app_id'].includes(idType) ? { [idType]: id } : { open_id: id },
    }]
  }) : []
  return normalizeFeishuMessage(config, { event_id: messageId, event: {
    sender: {
      sender_type: string(sender.sender_type || sender.senderType).toLowerCase(),
      sender_id: senderIdentity,
      sender_name: string(sender.sender_name || sender.senderName),
    },
    message: {
      message_id: messageId,
      chat_id: chatId,
      chat_type: scopeHint === 'private' ? 'p2p' : 'group',
      ...(scopeHint === 'topic' ? { chat_mode: 'topic' } : {}),
      message_type: messageType,
      content,
      mentions,
      root_id: string(item.root_id || item.rootId),
      parent_id: string(item.parent_id || item.parentId),
      thread_id: string(item.thread_id || item.threadId),
      create_time: string(item.create_time || item.createTime),
    },
  } })
}

/** Native interactive-card mention syntax. Feishu only guarantees card
 * mentions for a user's open_id, so invalid or provider-incompatible values
 * deliberately produce an empty prefix instead of a broken card. */
export function feishuCardMention(openId: string): string {
  return /^ou_[A-Za-z0-9_-]+$/u.test(openId) ? `<at id=${openId}></at>` : ''
}

/** Merge the authoritative REST message body into a realtime event. Feishu can
 * emit `nonsupport` or a reduced interactive-card fallback over WebSocket. */
export function hydrateFeishuMessagePayload(payload: unknown, detail: unknown): unknown {
  const envelope = record(payload)
  const event = record(envelope?.event) ?? envelope
  const message = record(event?.message)
  const detailRoot = record(detail)
  const data = record(detailRoot?.data) ?? detailRoot
  const item = Array.isArray(data?.items) ? record(data.items[0]) : record(data?.item)
  const body = record(item?.body)
  const content = body?.content
  const messageType = string(item?.msg_type || item?.message_type)
  if (!envelope || !event || !message || !item || !messageType || typeof content !== 'string') return payload
  const hydratedEvent = { ...event, message: { ...message, message_type: messageType, content } }
  return envelope.event ? { ...envelope, event: hydratedEvent } : hydratedEvent
}

/**
 * Topic-group root events may omit both root_id and thread_id. The provider can
 * resolve the chat mode once and apply it without leaking Feishu chat metadata
 * into the provider-neutral envelope.
 */
export function applyFeishuChatMode(message: ChannelInboundMessage, chatMode: FeishuChatMode): ChannelInboundMessage {
  if (message.conversation.scope !== 'group' || chatMode !== 'topic') return message
  return {
    ...message,
    conversation: { ...message.conversation, scope: 'topic', rootId: message.conversation.rootId || message.messageId },
  }
}

export function normalizeFeishuAction(payload: unknown): FeishuCardAction {
  const body = record(payload)
  const action = record(body?.action)
  let value = record(action?.value) ?? {}
  if (typeof action?.value === 'string') value = record(parseJson(action.value)) ?? {}
  const selectedOption = string(action?.option || action?.selected_option)
  const optionValue = record(parseJson(selectedOption))
  if (optionValue) value = { ...value, ...optionValue }
  const operator = record(body?.operator)
  const operatorId = record(operator?.operator_id)
  const context = record(body?.context)
  return {
    eventId: string(body?.event_id || record(body?.header)?.event_id),
    actorId: string(operatorId?.open_id || operator?.open_id),
    remoteMessageId: string(context?.open_message_id || body?.open_message_id),
    value,
    option: selectedOption || string(value.option),
  }
}

function redactError(value: unknown, secret: string): string {
  const row = record(value)
  const response = record(row?.response)
  const data = record(response?.data)
  const message = string(data?.msg || data?.message || row?.message) || String(value)
  return message.split(secret).join('[REDACTED]').replace(/\bBearer\s+\S+/giu, 'Bearer [REDACTED]').slice(0, 1_000)
}

/** Node-only Feishu transport. It does not interpret Codex events or product targets. */
export class FeishuProvider {
  private readonly client: Lark.Client
  private ws: Lark.WSClient | null = null
  private state: FeishuConnectionState = 'idle'
  private reviveTimer: ReturnType<typeof setInterval> | null = null
  private readonly chatMetadataCache = new Map<string, { expiresAtMs: number; value: Promise<FeishuChatMetadata> }>()
  private readonly chatBotsCache = new Map<string, { expiresAtMs: number; value: Promise<FeishuChatBotMetadata[]> }>()
  private readonly userMetadataCache = new Map<string, { expiresAtMs: number; value: Promise<FeishuUserMetadata> }>()
  private applicationAdministratorsCache: { expiresAtMs: number; value: Promise<FeishuApplicationAdministrators> } | null = null

  constructor(private readonly config: FeishuAccountConfig) {
    this.client = new Lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
      domain: config.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
      logger: {
        error: (...values: unknown[]) => console.error('[feishu-sdk]', values.map(value => redactError(value, config.appSecret)).join(' ')),
        warn: (...values: unknown[]) => console.warn('[feishu-sdk]', values.map(value => redactError(value, config.appSecret)).join(' ')),
        info: () => undefined, debug: () => undefined, trace: () => undefined,
      },
    })
  }

  async identity(): Promise<{ id: string; name: string }> {
    const response = await this.client.request<{ code?: number; msg?: string; bot?: { open_id?: string; app_name?: string } }>({ method: 'GET', url: '/open-apis/bot/v3/info/' })
    if (response.code !== 0 || !response.bot?.open_id) throw new Error(`Feishu bot identity failed: ${response.msg ?? 'missing bot identity'} (${response.code ?? 'unknown'})`)
    this.config.botOpenId = response.bot.open_id
    return { id: response.bot.open_id, name: response.bot.app_name?.trim() ?? '' }
  }

  /** Resolve approval administrators from the currently authenticated app.
   * Open IDs returned here are guaranteed to belong to this app's namespace. */
  async applicationAdministrators(): Promise<FeishuApplicationAdministrators> {
    const nowMs = Date.now()
    if (this.applicationAdministratorsCache && this.applicationAdministratorsCache.expiresAtMs > nowMs) {
      return this.applicationAdministratorsCache.value
    }
    const value = this.loadApplicationAdministrators()
    this.applicationAdministratorsCache = { expiresAtMs: nowMs + 5 * 60_000, value }
    try {
      return await value
    } catch (error) {
      if (this.applicationAdministratorsCache?.value === value) this.applicationAdministratorsCache = null
      throw error
    }
  }

  private async loadApplicationAdministrators(): Promise<FeishuApplicationAdministrators> {
    const [application, collaborators] = await Promise.all([
      this.client.application.v6.application.get({
        path: { app_id: this.config.appId },
        params: { lang: 'zh_cn', user_id_type: 'open_id' },
      }),
      this.client.application.v6.applicationCollaborators.get({
        path: { app_id: this.config.appId },
        params: { user_id_type: 'open_id' },
      }),
    ])
    if (application.code !== 0) {
      throw new Error(`Feishu application owner lookup failed: ${application.msg ?? 'unknown'} (${application.code ?? 'unknown'})`)
    }
    if (collaborators.code !== 0) {
      throw new Error(`Feishu application collaborator lookup failed: ${collaborators.msg ?? 'unknown'} (${collaborators.code ?? 'unknown'})`)
    }
    const ownerId = string(application.data?.app?.creator_id || application.data?.app?.owner?.owner_id)
    const administratorIds = [...new Set([
      ownerId,
      ...(collaborators.data?.collaborators ?? [])
        .filter(collaborator => collaborator.type === 'administrator')
        .map(collaborator => collaborator.user_id),
    ].map(value => value.trim()).filter(value => /^ou_[A-Za-z0-9_-]+$/u.test(value)))]
    if (administratorIds.length === 0) throw new Error('Feishu application administrator lookup returned no valid Open ID')
    return { ownerId: administratorIds.includes(ownerId) ? ownerId : '', administratorIds }
  }

  async start(handlers: FeishuProviderHandlers): Promise<void> {
    if (this.ws) return
    this.setState('connecting', handlers)
    const dispatcher = new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': (payload: unknown) => {
        void this.normalizeInbound(payload)
          .then(message => message ? this.resolveChatMode(message) : null)
          .then(message => message ? this.resolveQuotedMessage(message) : null)
          .then(message => message ? handlers.onMessage(message) : undefined)
          .catch(error => handlers.onState(this.state, error instanceof Error ? error : new Error(String(error))))
      },
      'card.action.trigger': (payload: unknown) => handlers.onAction(normalizeFeishuAction(payload)),
    } as never)
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
    })
    await this.ws.start({ eventDispatcher: dispatcher })
    this.reviveTimer = setInterval(() => {
      if (!this.ws || this.ws.getConnectionStatus().state !== 'failed') return
      this.setState('connecting', handlers)
      void this.ws.start({ eventDispatcher: dispatcher })
        .catch(error => this.setState('failed', handlers, error instanceof Error ? error : new Error(String(error))))
    }, 60_000)
    this.reviveTimer.unref?.()
  }

  stop(): void {
    if (this.reviveTimer) clearInterval(this.reviveTimer)
    this.reviveTimer = null
    this.ws?.close({ force: true }); this.ws = null; this.state = 'idle'
  }

  getState(): FeishuConnectionState { return this.state }

  isOwnSenderId(senderId: string): boolean {
    return Boolean(senderId) && (senderId === this.config.appId || senderId === this.config.botOpenId)
  }

  getConnectionDiagnostic(error?: Error): FeishuConnectionDiagnostic {
    const status = this.ws?.getConnectionStatus()
    const closeReason = this.state === 'reconnecting'
      ? 'Feishu WebSocket 已关闭，SDK 正在自动重连'
      : this.state === 'failed'
        ? error?.message || 'Feishu WebSocket 重连已停止'
        : ''
    return {
      state: this.state,
      atIso: new Date().toISOString(),
      reconnectAttempts: status?.reconnectAttempts ?? 0,
      lastConnectAtIso: status?.lastConnectTime ? new Date(status.lastConnectTime).toISOString() : null,
      nextConnectAtIso: status?.nextConnectTime ? new Date(status.nextConnectTime).toISOString() : null,
      closeCode: null,
      closeReason,
    }
  }

  /** Resolve user-facing chat metadata through the authenticated Bot. Results
   * are short-lived so renamed groups become visible without an API call for
   * every inbound message. */
  async chatMetadata(chatId: string, refresh = false): Promise<FeishuChatMetadata> {
    const cached = this.chatMetadataCache.get(chatId)
    if (!refresh && cached && cached.expiresAtMs > Date.now()) return cached.value
    const value = this.client.im.v1.chat.get({ path: { chat_id: chatId } }).then(response => {
      if (response.code !== 0) throw new Error(`Feishu chat identity failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`)
      const rawMode = response.data?.chat_mode
      const mode: FeishuChatMode = rawMode === 'topic' || rawMode === 'p2p' ? rawMode : 'group'
      return { id: chatId, name: response.data?.name?.trim() ?? '', mode }
    })
    this.chatMetadataCache.set(chatId, { expiresAtMs: Date.now() + 5 * 60_000, value })
    try { return await value }
    catch (error) {
      if (this.chatMetadataCache.get(chatId)?.value === value) this.chatMetadataCache.delete(chatId)
      throw error
    }
  }

  /** Return the Bots currently visible in a chat using receiver-scoped Open
   * IDs. Feishu mention Open IDs are application-scoped, so products must not
   * substitute identities discovered under another application. */
  async chatBots(chatId: string, refresh = false): Promise<FeishuChatBotMetadata[]> {
    const cached = this.chatBotsCache.get(chatId)
    if (!refresh && cached && cached.expiresAtMs > Date.now()) return cached.value
    const value = this.client.request<JsonRecord>({
      method: 'GET', url: `/open-apis/im/v1/chats/${encodeURIComponent(chatId)}/members/bots`,
    }).then(response => {
      const code = Number(response.code ?? -1)
      if (code !== 0) throw new Error(`Feishu chat Bot roster failed: ${string(response.msg) || 'unknown'} (${code})`)
      return normalizeFeishuChatBots(response)
    })
    this.chatBotsCache.set(chatId, { expiresAtMs: Date.now() + 5 * 60_000, value })
    try { return await value }
    catch (error) {
      if (this.chatBotsCache.get(chatId)?.value === value) this.chatBotsCache.delete(chatId)
      throw error
    }
  }

  /** Resolve a user display name in the current application's Open ID
   * namespace. The name field requires contact:user.base:readonly and may be
   * empty when the app has not received or published that permission. */
  async userMetadata(openId: string, refresh = false): Promise<FeishuUserMetadata> {
    const cached = this.userMetadataCache.get(openId)
    if (!refresh && cached && cached.expiresAtMs > Date.now()) return cached.value
    const value = this.client.contact.v3.user.get({
      path: { user_id: openId },
      params: { user_id_type: 'open_id' },
    }).then(response => {
      if (response.code !== 0) throw new Error(`Feishu user identity failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`)
      return { id: openId, name: response.data?.user?.name?.trim() ?? '' }
    })
    this.userMetadataCache.set(openId, { expiresAtMs: Date.now() + 5 * 60_000, value })
    try { return await value }
    catch (error) {
      if (this.userMetadataCache.get(openId)?.value === value) this.userMetadataCache.delete(openId)
      throw error
    }
  }

  private async resolveChatMode(message: ChannelInboundMessage): Promise<ChannelInboundMessage> {
    if (message.conversation.scope !== 'group') return message
    try {
      const metadata = await this.chatMetadata(message.conversation.id)
      const resolved = applyFeishuChatMode(message, metadata.mode)
      return metadata.name ? { ...resolved, conversation: { ...resolved.conversation, name: metadata.name } } : resolved
    } catch {
      // Chat metadata is enrichment only. Authorization remains group-scoped
      // and deny-by-default when Feishu cannot return chat details.
      return message
    }
  }

  private async normalizeInbound(payload: unknown): Promise<ChannelInboundMessage | null> {
    const envelope = record(payload)
    const event = record(envelope?.event) ?? envelope
    const message = record(event?.message)
    const messageType = string(message?.message_type || message?.messageType || message?.msg_type)
    const messageId = string(message?.message_id || message?.messageId)
    if (!messageId || (messageType !== 'nonsupport' && messageType !== 'interactive')) {
      return normalizeFeishuMessage(this.config, payload)
    }
    let lastError: unknown
    for (const delay of [0, 200, 800]) {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay))
      try {
        const detail = await this.client.request({
          method: 'GET', url: `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}`,
          params: { card_msg_content_type: 'user_card_content' },
        })
        const hydrated = normalizeFeishuMessage(this.config, hydrateFeishuMessagePayload(payload, detail))
        if (hydrated && hydrated.content?.type !== 'nonsupport') return hydrated
        lastError = new Error('message detail did not contain supported card content')
      } catch (error) {
        lastError = error
      }
    }
    console.warn(`[feishu] message detail hydration failed for ${messageId}: ${redactError(lastError, this.config.appSecret)}`)
    return normalizeFeishuMessage(this.config, payload)
  }

  /** Fetch and normalize one message through the authenticated Bot. */
  async messageDetail(
    messageId: string,
    scopeHint: ChannelInboundMessage['conversation']['scope'] = 'group',
  ): Promise<ChannelInboundMessage> {
    const detail = await this.client.im.v1.message.get({
      path: { message_id: messageId },
      params: { user_id_type: 'open_id', card_msg_content_type: 'user_card_content', with_sender_name: true },
    })
    if (detail.code !== 0) throw new Error(`Feishu message detail failed: ${detail.msg ?? 'unknown'} (${detail.code ?? 'unknown'})`)
    const message = normalizeFeishuMessageDetail(this.config, detail, scopeHint)
    if (!message) throw new Error('Feishu message detail did not contain a readable message')
    return message
  }

  private async resolveQuotedMessage(message: ChannelInboundMessage): Promise<ChannelInboundMessage> {
    if (!message.replyTo) return message
    try {
      const quoted = await this.messageDetail(message.replyTo, message.conversation.scope)
      if (quoted.conversation.id !== message.conversation.id) {
        throw new Error('quoted message belongs to another conversation')
      }
      const quotedMessage: ChannelQuotedMessage = {
        messageId: quoted.messageId,
        conversationId: quoted.conversation.id,
        sender: {
          id: quoted.sender.id, type: quoted.sender.type,
          ...(quoted.sender.idType ? { idType: quoted.sender.idType } : {}),
          ...(quoted.sender.name ? { name: quoted.sender.name } : {}),
        },
        ...(quoted.content ? { content: quoted.content } : {}),
        text: quoted.text,
        attachments: quoted.attachments,
        createdAtIso: quoted.createdAtIso,
      }
      return { ...message, quotedMessage }
    } catch (error) {
      console.warn(`[feishu] quoted message hydration failed for ${message.replyTo}: ${redactError(error, this.config.appSecret)}`)
      return message
    }
  }

  async sendText(chatId: string, text: string, uuid?: string): Promise<string> {
    const response = await this.client.im.v1.message.create({ params: { receive_id_type: 'chat_id' }, data: { receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }), ...(uuid ? { uuid } : {}) } })
    return this.messageId(response)
  }

  async replyText(messageId: string, text: string, replyInThread = false, uuid?: string): Promise<string> {
    const response = await this.client.im.v1.message.reply({ path: { message_id: messageId }, data: { msg_type: 'text', content: JSON.stringify({ text }), ...(replyInThread ? { reply_in_thread: true } : {}), ...(uuid ? { uuid } : {}) } })
    return this.messageId(response)
  }

  async sendCard(chatId: string, card: FeishuCard, uuid?: string): Promise<string> {
    const response = await this.client.im.v1.message.create({ params: { receive_id_type: 'chat_id' }, data: { receive_id: chatId, msg_type: 'interactive', content: JSON.stringify(card), ...(uuid ? { uuid } : {}) } })
    return this.messageId(response)
  }

  async replyCard(messageId: string, card: FeishuCard, replyInThread = false, uuid?: string): Promise<string> {
    const response = await this.client.im.v1.message.reply({ path: { message_id: messageId }, data: { msg_type: 'interactive', content: JSON.stringify(card), ...(replyInThread ? { reply_in_thread: true } : {}), ...(uuid ? { uuid } : {}) } })
    return this.messageId(response)
  }

  async sendUserCard(openId: string, card: FeishuCard, uuid?: string): Promise<string> {
    const response = await this.client.im.v1.message.create({ params: { receive_id_type: 'open_id' }, data: { receive_id: openId, msg_type: 'interactive', content: JSON.stringify(card), ...(uuid ? { uuid } : {}) } })
    return this.messageId(response)
  }

  async sendImage(chatId: string, imageKey: string, uuid?: string): Promise<string> {
    const response = await this.client.im.v1.message.create({
      params: { receive_id_type: 'chat_id' },
      data: { receive_id: chatId, msg_type: 'image', content: JSON.stringify({ image_key: imageKey }), ...(uuid ? { uuid } : {}) },
    })
    return this.messageId(response)
  }

  async replyImage(messageId: string, imageKey: string, replyInThread = false, uuid?: string): Promise<string> {
    const response = await this.client.im.v1.message.reply({
      path: { message_id: messageId },
      data: { msg_type: 'image', content: JSON.stringify({ image_key: imageKey }), ...(replyInThread ? { reply_in_thread: true } : {}), ...(uuid ? { uuid } : {}) },
    })
    return this.messageId(response)
  }

  async updateCard(messageId: string, card: FeishuCard): Promise<void> {
    const response = await this.client.im.v1.message.patch({ path: { message_id: messageId }, data: { content: JSON.stringify(card) } })
    if (response.code !== 0) throw new Error(`Feishu card patch failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`)
  }

  /** Adds a native Feishu reaction to an existing message. Products can use
   * this as a lightweight receipt before a longer streamed response begins. */
  async addReaction(messageId: string, emojiType = 'GoGoGo'): Promise<string> {
    const response = await (this.client as any).im.v1.messageReaction.create({
      path: { message_id: messageId },
      data: { reaction_type: { emoji_type: emojiType } },
    }) as { code?: number; msg?: string; data?: { reaction_id?: string } }
    if (response.code !== 0) throw new Error(`Feishu reaction failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`)
    return response.data?.reaction_id ?? ''
  }

  /** Removes one reaction record previously returned by addReaction. */
  async removeReaction(messageId: string, reactionId: string): Promise<void> {
    const response = await (this.client as any).im.v1.messageReaction.delete({
      path: { message_id: messageId, reaction_id: reactionId },
    }) as { code?: number; msg?: string }
    if (response.code !== 0) throw new Error(`Feishu reaction removal failed: ${response.msg ?? 'unknown'} (${response.code ?? 'unknown'})`)
  }

  async uploadImage(buffer: Buffer): Promise<string> {
    const response = await this.client.im.v1.image.create({ data: { image_type: 'message', image: buffer } })
    if (!response?.image_key) throw new Error('Feishu image upload did not include image_key')
    return response.image_key
  }

  async downloadAttachment(messageId: string, attachment: ChannelAttachment, rootDir: string, maxBytes = 100 * 1024 * 1024): Promise<{ path: string; sizeBytes: number }> {
    const root = resolve(rootDir)
    await mkdir(root, { recursive: true })
    const target = join(root, safeAttachmentName(attachment.name, attachment.id, attachment.type))
    const partial = `${target}.part`
    const response = await this.client.request<Readable>({
      method: 'GET', url: `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/resources/${encodeURIComponent(attachment.id)}`,
      params: { type: attachment.type === 'image' ? 'image' : 'file' }, responseType: 'stream',
    })
    let bytes = 0
    const limiter = new (await import('node:stream')).Transform({ transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length
      callback(bytes > maxBytes ? new Error(`Feishu attachment exceeds ${maxBytes} bytes`) : null, chunk)
    } })
    try {
      await pipeline(response, limiter, createWriteStream(partial, { flags: 'wx', mode: 0o600 }))
      await rename(partial, target)
      const metadata = await stat(target)
      return { path: target, sizeBytes: metadata.size }
    } catch (error) {
      await unlink(partial).catch(() => undefined)
      throw error
    }
  }

  classifyError(error: unknown): ChannelDeliveryError {
    const message = redactError(error, this.config.appSecret)
    const row = record(error)
    const response = record(row?.response)
    const data = record(response?.data)
    const status = Number(response?.status ?? row?.status)
    const code = Number(data?.code ?? row?.code)
    const retryable = status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
      || [99991663, 99991400].includes(code) || /timeout|network|socket|ECONN|rate.?limit/iu.test(message)
    return { message, retryable: retryable || (!Number.isFinite(status) && !Number.isFinite(code)) }
  }

  private setState(state: FeishuConnectionState, handlers: FeishuProviderHandlers, error?: Error): void {
    this.state = state; handlers.onState(state, error, this.getConnectionDiagnostic(error))
  }

  private messageId(response: { code?: number; msg?: string; data?: { message_id?: string } | null }): string {
    if (response.code !== 0 || !response.data?.message_id) throw new Error(`Feishu message failed: ${response.msg ?? 'missing message id'} (${response.code ?? 'unknown'})`)
    return response.data.message_id
  }
}

export function feishuTextCard(title: string, markdown: string, options: { color?: string; actions?: FeishuCardButton[]; note?: string } = {}): FeishuCard {
  const elements: unknown[] = [{ tag: 'markdown', content: feishuCardMarkdown(markdown) }]
  if (options.actions?.length) elements.push({ tag: 'action', actions: options.actions.map(action => ({
    tag: 'button', text: { tag: 'plain_text', content: action.text.slice(0, 80) }, type: action.type ?? 'default',
    ...('url' in action ? { url: action.url } : { value: action.value }),
  })) })
  if (options.note) elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: options.note.slice(0, 500) }] })
  return {
    config: { wide_screen_mode: true },
    header: { template: options.color ?? 'blue', title: { tag: 'plain_text', content: title.slice(0, 80) } },
    elements,
  }
}

/** Renders an assistant response as native Feishu card Markdown without adding
 * product-specific chrome. Products retain control over reply/thread routing. */
export function feishuMarkdownCard(markdown: string, options: { note?: string } = {}): FeishuCard {
  return feishuMarkdownCardFromElements(feishuMarkdownElements(markdown), options.note)
}

/** Split long assistant output into Feishu-safe cards without silently dropping
 * the tail. Products can reply each card with a stable per-part UUID. */
export function feishuMarkdownCards(markdown: string, options: { note?: string } = {}): FeishuCard[] {
  const groups: unknown[][] = []
  let current: unknown[] = []
  let currentSize = 0
  for (const element of feishuMarkdownElements(markdown)) {
    for (const part of splitOversizedFeishuElement(element)) {
      const size = JSON.stringify(part).length
      if (current.length && currentSize + size > FEISHU_CARD_ELEMENT_BUDGET) {
        groups.push(current)
        current = []
        currentSize = 0
      }
      current.push(part)
      currentSize += size
    }
  }
  if (current.length || groups.length === 0) groups.push(current.length ? current : [{ tag: 'markdown', content: ' ' }])
  return groups.map((elements, index) => feishuMarkdownCardFromElements(
    elements,
    options.note ? (groups.length > 1 ? `${options.note}  |  ${index + 1}/${groups.length}` : options.note) : undefined,
  ))
}

/** A single patchable card for a live Codex turn. `reasoning` is intended for
 * the App Server's reasoning summary stream, never raw hidden reasoning. */
export function feishuStreamingCard(input: {
  state: FeishuStreamState
  answer?: string
  reasoning?: string
  error?: string
  note?: string
}): FeishuCard {
  const presentation = {
    received: { icon: '⏳', label: '已收到', color: 'blue' },
    thinking: { icon: '🧠', label: 'Codex 正在思考', color: 'turquoise' },
    answering: { icon: '✍️', label: '正在生成回复', color: 'turquoise' },
    completed: { icon: '✅', label: '已完成', color: 'green' },
    failed: { icon: '⚠️', label: '执行失败', color: 'red' },
  }[input.state]
  const elements: unknown[] = []
  const reasoning = input.reasoning?.trim().slice(-4_000)
  if (reasoning && input.state !== 'completed') {
    elements.push({ tag: 'markdown', content: feishuCardMarkdown(`**思考摘要**\n${reasoning}`) })
    elements.push({ tag: 'hr' })
  }
  const body = input.error?.trim()
    ? `**错误**\n${input.error}`
    : input.answer?.trim() || (input.state === 'received' ? '消息已进入处理队列…' : '正在思考…')
  elements.push({ tag: 'markdown', content: feishuCardMarkdown(body) })
  if (input.note) elements.push(feishuV2Note(input.note))
  return {
    schema: '2.0',
    config: { update_multi: true },
    header: { template: presentation.color, title: { tag: 'plain_text', content: `${presentation.icon} ${presentation.label}` } },
    body: { direction: 'vertical', elements },
  }
}

function feishuCardMarkdown(markdown: string): string {
  return normalizeFeishuCardMarkdown(markdown).slice(0, FEISHU_CARD_CONTENT_LIMIT) || ' '
}

function normalizeFeishuCardMarkdown(markdown: string): string {
  let inFence = false
  return markdown.split('\n').map(line => {
    if (/^\s*(```|~~~)/u.test(line)) { inFence = !inFence; return line }
    if (inFence) return line
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/u)
    return heading ? `**${heading[1]}**` : line
  }).join('\n')
}

function feishuMarkdownCardFromElements(elements: unknown[], note?: string): FeishuCard {
  const bodyElements = elements.length ? [...elements] : [{ tag: 'markdown', content: ' ' }]
  if (note) bodyElements.push(feishuV2Note(note))
  return {
    schema: '2.0',
    config: { update_multi: true },
    body: { direction: 'vertical', elements: bodyElements },
  }
}

/** Card schema 2.0 removed the legacy `note` component. Keep product metadata
 * in a regular Markdown element so both initial sends and later patches remain
 * valid card-v2 payloads. */
function feishuV2Note(note: string): Record<string, unknown> {
  return { tag: 'markdown', content: feishuCardMarkdown(`---\n${note.slice(0, 500)}`) }
}

function sourceLines(lines: string[], map: [number, number]): string {
  return lines.slice(map[0], map[1]).join('\n')
}

function matchingClose(tokens: Token[], openIndex: number): number {
  const open = tokens[openIndex]
  const closeType = open.type.replace(/_open$/u, '_close')
  let depth = 1
  for (let index = openIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index].type === open.type) depth += 1
    else if (tokens[index].type === closeType && --depth === 0) return index
  }
  return tokens.length - 1
}

function feishuTableElement(tokens: Token[]): Record<string, unknown> | null {
  const headers: string[] = []
  const rows: string[][] = []
  let inHeader = false
  let inBody = false
  let inCell = false
  let currentRow: string[] | null = null
  for (const token of tokens) {
    switch (token.type) {
      case 'thead_open': inHeader = true; break
      case 'thead_close': inHeader = false; break
      case 'tbody_open': inBody = true; break
      case 'tbody_close': inBody = false; break
      case 'tr_open': currentRow = []; break
      case 'tr_close':
        if (inBody && currentRow) rows.push(currentRow)
        currentRow = null
        break
      case 'th_open':
      case 'td_open': inCell = true; break
      case 'th_close':
      case 'td_close': inCell = false; break
      case 'inline':
        if (inCell) {
          if (inHeader) headers.push(token.content)
          else if (currentRow) currentRow.push(token.content)
        }
        break
    }
  }
  if (!headers.length) return null
  return {
    tag: 'table',
    page_size: Math.min(10, Math.max(1, rows.length || 1)),
    row_height: 'low',
    header_style: {
      text_align: 'left', text_size: 'normal', background_style: 'grey',
      text_color: 'default', bold: true, lines: 1,
    },
    columns: headers.map((header, index) => ({
      name: `c${index}`, display_name: header || ' ', data_type: 'lark_md', width: 'auto',
    })),
    rows: rows.map(row => Object.fromEntries(headers.map((_, index) => [`c${index}`, row[index] ?? '']))),
  }
}

/** Convert CommonMark/GFM blocks into Feishu card-v2 elements. Feishu's
 * Markdown element intentionally does not implement pipe tables, so tables
 * become native components while prose, lists and code keep their source. */
function feishuMarkdownElements(markdown: string): unknown[] {
  if (!markdown.trim()) return [{ tag: 'markdown', content: ' ' }]
  const tokens = feishuMarkdownParser.parse(markdown, {})
  const lines = markdown.split('\n')
  const elements: unknown[] = []
  const buffer: string[] = []
  const flush = () => {
    const content = normalizeFeishuCardMarkdown(buffer.join('\n\n')).replace(/\n{3,}/gu, '\n\n').trim()
    if (content) elements.push({ tag: 'markdown', content })
    buffer.length = 0
  }
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index]
    if (token.level !== 0) { index += 1; continue }
    if (token.type === 'table_open') {
      flush()
      const closeIndex = matchingClose(tokens, index)
      const table = feishuTableElement(tokens.slice(index, closeIndex + 1))
      if (table) elements.push(table)
      else if (token.map) buffer.push(sourceLines(lines, token.map as [number, number]))
      index = closeIndex + 1
      continue
    }
    if (token.type.endsWith('_open') && token.map) {
      buffer.push(sourceLines(lines, token.map as [number, number]))
      index = matchingClose(tokens, index) + 1
      continue
    }
    if ((token.type === 'fence' || token.type === 'code_block') && token.map) {
      buffer.push(sourceLines(lines, token.map as [number, number]))
      index += 1
      continue
    }
    if (token.type === 'hr') buffer.push('---')
    index += 1
  }
  flush()
  return elements.length ? elements : [{ tag: 'markdown', content: normalizeFeishuCardMarkdown(markdown) || ' ' }]
}

function splitMarkdownContent(content: string): string[] {
  const chunks: string[] = []
  let remaining = content
  while (remaining.length > FEISHU_CARD_ELEMENT_BUDGET) {
    const boundary = remaining.lastIndexOf('\n', FEISHU_CARD_ELEMENT_BUDGET)
    const end = boundary > FEISHU_CARD_ELEMENT_BUDGET / 2 ? boundary : FEISHU_CARD_ELEMENT_BUDGET
    chunks.push(remaining.slice(0, end))
    remaining = remaining.slice(end).replace(/^\n/u, '')
  }
  chunks.push(remaining || ' ')
  return chunks
}

function splitOversizedFeishuElement(element: unknown): unknown[] {
  if (!element || typeof element !== 'object') return [element]
  const value = element as Record<string, unknown>
  if (value.tag === 'markdown' && typeof value.content === 'string') {
    return splitMarkdownContent(value.content).map(content => ({ ...value, content }))
  }
  if (value.tag !== 'table' || !Array.isArray(value.rows) || JSON.stringify(value).length <= FEISHU_CARD_ELEMENT_BUDGET) return [value]
  const rows = value.rows as unknown[]
  const parts: unknown[] = []
  let group: unknown[] = []
  for (const row of rows) {
    const candidate = { ...value, rows: [...group, row], page_size: Math.min(10, Math.max(1, group.length + 1)) }
    if (group.length && JSON.stringify(candidate).length > FEISHU_CARD_ELEMENT_BUDGET) {
      parts.push({ ...value, rows: group, page_size: Math.min(10, group.length) })
      group = []
    }
    group.push(row)
  }
  if (group.length) parts.push({ ...value, rows: group, page_size: Math.min(10, group.length) })
  return parts.length ? parts : [value]
}

/** Selection card for product target pickers. Static selects avoid Feishu's
 * small per-row button limit and keep large Workspace/Demand lists usable. */
export function feishuSelectionCard(title: string, markdown: string, options: Array<{ text: string; value: Record<string, unknown> }>, note = ''): FeishuCard {
  const elements: unknown[] = [
    { tag: 'markdown', content: markdown.slice(0, 28_000) || ' ' },
    { tag: 'action', actions: [{
      tag: 'select_static', placeholder: { tag: 'plain_text', content: '请选择' },
      options: options.slice(0, 100).map(option => ({ text: { tag: 'plain_text', content: option.text.slice(0, 80) }, value: JSON.stringify(option.value) })),
    }] },
  ]
  if (note || options.length > 100) elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: (note || '选项超过 100 个，请先在 CodyWork 中整理。').slice(0, 500) }] })
  return {
    config: { wide_screen_mode: true },
    header: { template: 'blue', title: { tag: 'plain_text', content: title.slice(0, 80) } },
    elements,
  }
}
