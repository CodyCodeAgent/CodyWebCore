import { createHash, randomUUID } from 'node:crypto'
import type { ConversationState, TurnLifecycle } from '../conversation/index.js'

export type ChannelConversationScope = 'private' | 'group' | 'topic'

export type ChannelAttachment = {
  id: string
  type: 'image' | 'file' | 'audio' | 'video'
  name: string
  mimeType?: string
  sizeBytes?: number
}

/** Provider-neutral input accepted by a remote channel runtime. */
export type ChannelInboundMessage = {
  provider: string
  accountId: string
  eventId: string
  messageId: string
  conversation: { id: string; scope: ChannelConversationScope; rootId?: string }
  sender: { id: string; type: 'user' | 'bot' | 'app' }
  text: string
  replyTo?: string
  attachments: ChannelAttachment[]
  addressedToAgent: boolean
  mentionsOtherRecipient: boolean
  createdAtIso: string
}

export type ChannelBinding = {
  id: string
  provider: string
  accountId: string
  conversationKey: string
  targetType: string
  targetId: string
  threadId: string
  ownerIdentity: string
  createdAtIso: string
  updatedAtIso: string
}

export type ChannelInboxStatus = 'received' | 'waiting_binding' | 'ready' | 'submitting' | 'submitted' | 'completed' | 'failed' | 'ignored'

export type ChannelInboxItem = {
  id: string
  message: ChannelInboundMessage
  conversationKey: string
  status: ChannelInboxStatus
  bindingId?: string
  clientCommandId?: string
  turnId?: string
  lastError?: string
  createdAtIso: string
  updatedAtIso: string
}

export type ChannelOutboxStatus = 'pending' | 'leased' | 'sending' | 'retry_wait' | 'sent' | 'dead_letter' | 'superseded'

export type ChannelOutboxItem = {
  id: string
  provider: string
  accountId: string
  kind: string
  targetId: string
  payload: unknown
  dedupeKey: string
  status: ChannelOutboxStatus
  attempts: number
  availableAtIso: string
  leaseExpiresAtIso?: string
  remoteMessageId?: string
  revision?: number
  terminal?: boolean
  lastError?: string
}

export type ChannelDeliveryError = { message: string; retryable: boolean }

export interface ChannelOutboxStore {
  enqueue(input: Omit<ChannelOutboxItem, 'status' | 'attempts' | 'availableAtIso'> & { availableAtIso?: string }): Promise<ChannelOutboxItem>
  claim(input: { provider: string; accountId: string; limit: number; leaseMs: number; nowIso: string }): Promise<ChannelOutboxItem[]>
  markSending(id: string): Promise<void>
  markSent(id: string, remoteMessageId?: string): Promise<void>
  markRetry(id: string, error: string, availableAtIso: string): Promise<void>
  markDeadLetter(id: string, error: string): Promise<void>
  markSuperseded?(input: { provider: string; accountId: string; kind: string; targetId: string; keepId: string; revision: number }): Promise<string[]>
}

export interface ChannelDeliveryDispatcher {
  deliver(item: ChannelOutboxItem): Promise<{ remoteMessageId?: string }>
  classifyError(error: unknown): ChannelDeliveryError
}

export type ReliableChannelOutboxOptions = {
  retryBaseMs?: number
  retryMaxMs?: number
  maxAttempts?: number
  leaseMs?: number
  batchSize?: number
  now?: () => Date
  randomId?: () => string
  logger?: Pick<Console, 'warn' | 'error'>
}

/** Provider-neutral durable delivery pump. Storage and SDK calls stay injected. */
export class ReliableChannelOutbox {
  private readonly retryBaseMs: number
  private readonly retryMaxMs: number
  private readonly maxAttempts: number
  private readonly leaseMs: number
  private readonly batchSize: number
  private readonly now: () => Date
  private readonly randomId: () => string
  private readonly logger: Pick<Console, 'warn' | 'error'>
  private flushing: Promise<void> | null = null

  constructor(
    private readonly identity: { provider: string; accountId: string },
    private readonly store: ChannelOutboxStore,
    private readonly dispatcher: ChannelDeliveryDispatcher,
    options: ReliableChannelOutboxOptions = {},
  ) {
    this.retryBaseMs = Math.max(100, options.retryBaseMs ?? 1_000)
    this.retryMaxMs = Math.max(this.retryBaseMs, options.retryMaxMs ?? 5 * 60_000)
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 10)
    this.leaseMs = Math.max(1_000, options.leaseMs ?? 60_000)
    this.batchSize = Math.min(100, Math.max(1, options.batchSize ?? 20))
    this.now = options.now ?? (() => new Date())
    this.randomId = options.randomId ?? randomUUID
    this.logger = options.logger ?? console
  }

  async enqueue(input: { kind: string; targetId: string; payload: unknown; dedupeKey: string; revision?: number; terminal?: boolean }): Promise<ChannelOutboxItem> {
    const item = await this.store.enqueue({
      id: this.randomId(), ...this.identity, kind: input.kind, targetId: input.targetId,
      payload: input.payload, dedupeKey: input.dedupeKey,
      ...(input.revision === undefined ? {} : { revision: input.revision }),
      ...(input.terminal === undefined ? {} : { terminal: input.terminal }),
    })
    if (input.revision !== undefined && this.store.markSuperseded) {
      await this.store.markSuperseded({ ...this.identity, kind: input.kind, targetId: input.targetId, keepId: item.id, revision: input.revision })
    }
    return item
  }

  flush(): Promise<void> {
    if (this.flushing) return this.flushing
    this.flushing = this.drain().finally(() => { this.flushing = null })
    return this.flushing
  }

  private async drain(): Promise<void> {
    for (;;) {
      const now = this.now()
      const items = await this.store.claim({ ...this.identity, limit: this.batchSize, leaseMs: this.leaseMs, nowIso: now.toISOString() })
      if (items.length === 0) return
      for (const item of items) await this.dispatch(item)
      if (items.length < this.batchSize) return
    }
  }

  private async dispatch(item: ChannelOutboxItem): Promise<void> {
    try {
      // Persist the network side-effect boundary. If the process exits after
      // this point, the same lease is recovered instead of pretending that the
      // delivery was never attempted.
      await this.store.markSending(item.id)
      const result = await this.dispatcher.deliver(item)
      await this.store.markSent(item.id, result.remoteMessageId)
    } catch (error) {
      const classified = this.dispatcher.classifyError(error)
      if (!classified.retryable || item.attempts >= this.maxAttempts) {
        await this.store.markDeadLetter(item.id, classified.message)
        return
      }
      const availableAtIso = new Date(this.now().getTime() + this.retryDelayMs(item.attempts)).toISOString()
      try {
        await this.store.markRetry(item.id, classified.message, availableAtIso)
      } catch (storeError) {
        this.logger.error(`Could not persist channel delivery retry for ${item.id}: ${String(storeError)}`)
        throw storeError
      }
    }
  }

  private retryDelayMs(attempts: number): number {
    return Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** Math.max(0, Math.min(20, attempts - 1)))
  }
}

export type ChannelTurnProjection = {
  threadId: string
  turnId: string
  status: 'queued' | 'running' | 'retrying' | 'disconnected' | 'completed' | 'failed' | 'interrupted'
  assistantText: string
  /** Ordered, deduplicated image references from structured messages and Markdown output. */
  assistantImages: string[]
  error: string
  terminal: boolean
  revision: number
}

export type MarkdownImageReference = {
  alt: string
  source: string
}

const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|((?:\\.|[^)\s])+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g

/** Extract image destinations without making provider or filesystem policy decisions. */
export function extractMarkdownImageReferences(text: string): MarkdownImageReference[] {
  const references: MarkdownImageReference[] = []
  for (const match of text.matchAll(MARKDOWN_IMAGE)) {
    const source = (match[2] || match[3] || '').replaceAll('\\)', ')').trim()
    if (source) references.push({ alt: (match[1] || '').trim(), source })
  }
  return references
}

/** Remove Markdown image syntax before projecting text into providers that require uploaded image keys. */
export function stripMarkdownImages(text: string, replacement?: (reference: MarkdownImageReference) => string): string {
  return text.replace(MARKDOWN_IMAGE, (_value, alt: string, angleSource: string, bareSource: string) => {
    const reference = { alt: (alt || '').trim(), source: (angleSource || bareSource || '').replaceAll('\\)', ')').trim() }
    return replacement?.(reference) ?? ''
  }).replace(/\n{3,}/g, '\n\n').trim()
}

function projectionStatus(lifecycle: TurnLifecycle | undefined): ChannelTurnProjection['status'] {
  if (!lifecycle || lifecycle === 'idle') return 'queued'
  return lifecycle
}

/** Providers consume this projection and never interpret native wire events. */
export function projectChannelTurn(state: ConversationState, turnId: string, revision: number): ChannelTurnProjection {
  const turn = state.turns[turnId]
  const status = projectionStatus(turn?.lifecycle)
  const terminal = status === 'completed' || status === 'failed' || status === 'interrupted'
  const assistantMessages = state.messages.filter(message => message.role === 'assistant' && message.turnId === turnId)
  const authoritativeMessages = terminal
    ? assistantMessages.filter(message => message.messageType !== 'agentMessage.live' && message.messageType !== 'plan.live')
    : assistantMessages
  const assistantText = authoritativeMessages.map(message => message.text).filter(Boolean).join('\n\n').trim()
  const assistantImages = [...new Set(authoritativeMessages.flatMap(message => [
    ...(message.images ?? []),
    ...extractMarkdownImageReferences(message.text).map(reference => reference.source),
  ]).filter(Boolean))]
  return { threadId: state.threadId, turnId, status, assistantText, assistantImages, error: turn?.error ?? turn?.retryMessage ?? '', terminal, revision }
}

/** Stable across provider redelivery and process restart. */
export function channelCommandId(message: Pick<ChannelInboundMessage, 'provider' | 'accountId' | 'eventId' | 'messageId'>): string {
  const identity = [message.provider, message.accountId, message.eventId || message.messageId].join('\u0000')
  return `channel_${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`
}

export function channelConversationKey(message: Pick<ChannelInboundMessage, 'provider' | 'accountId' | 'conversation'>): string {
  const { provider, accountId, conversation } = message
  return [provider, accountId, conversation.scope, conversation.id, conversation.rootId ?? ''].join(':')
}
