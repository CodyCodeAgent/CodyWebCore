import { asRecord } from '../protocol/index.js'
import { createTypedCodexClient, type CodexRpcCaller, type TypedCodexClient } from '../protocol/methods.js'
import type { CollaborationMode } from '../protocol/generated/CollaborationMode.js'
import type { ReasoningEffort } from '../protocol/generated/ReasoningEffort.js'
import type { ModelListResponse } from '../protocol/generated/v2/ModelListResponse.js'
import type { ThreadListResponse } from '../protocol/generated/v2/ThreadListResponse.js'
import { normalizeThreadHistory } from './normalization.js'
import type { CodexEvent } from '../conversation/index.js'

export interface CodexThreadSummary {
  threadId: string
  preview: string
  name: string
  cwd: string
  createdAtIso: string
  updatedAtIso: string
  source: string
  canAcceptDirectInput: boolean | null
}

export interface CodexModelOption {
  id: string
  model: string
  label: string
  description: string
  hidden: boolean
  isDefault: boolean
  defaultReasoningEffort: ReasoningEffort
  supportedReasoningEfforts: ReasoningEffort[]
}

export interface CodexCollaborationModeOption {
  name: string
  mode: string
  model: string
  reasoningEffort: ReasoningEffort | ''
}

export interface ListCodexThreadsOptions {
  archived?: boolean
  limit?: number
  maxPages?: number
  cwd?: string | string[]
  searchTerm?: string
}

function timestampIso(seconds: number): string {
  return Number.isFinite(seconds) ? new Date(seconds * 1_000).toISOString() : ''
}

function sourceLabel(value: unknown): string {
  if (typeof value === 'string') return value
  const row = asRecord(value)
  if (!row) return ''
  const kind = typeof row.type === 'string' ? row.type : typeof row.kind === 'string' ? row.kind : Object.keys(row)[0]
  return kind ?? ''
}

export class CodexSessionCatalog {
  private readonly client: TypedCodexClient

  constructor(rpc: CodexRpcCaller) {
    this.client = createTypedCodexClient(rpc)
  }

  async listThreads(options: ListCodexThreadsOptions = {}): Promise<CodexThreadSummary[]> {
    const rows: CodexThreadSummary[] = []
    const limit = Math.max(1, Math.min(options.limit ?? 100, 100))
    const maxPages = Math.max(1, Math.min(options.maxPages ?? 10, 100))
    let cursor: string | null = null
    for (let page = 0; page < maxPages; page += 1) {
      const result: ThreadListResponse = await this.client.call('thread/list', {
        archived: options.archived ?? false,
        limit,
        sortKey: 'updated_at',
        sortDirection: 'desc',
        ...(cursor ? { cursor } : {}),
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(options.searchTerm?.trim() ? { searchTerm: options.searchTerm.trim() } : {}),
      })
      rows.push(...result.data.map(thread => ({
        threadId: thread.id,
        preview: thread.preview.trim(),
        name: thread.name?.trim() ?? '',
        cwd: thread.cwd.trim(),
        createdAtIso: timestampIso(thread.createdAt),
        updatedAtIso: timestampIso(thread.updatedAt),
        source: sourceLabel(thread.source),
        canAcceptDirectInput: thread.canAcceptDirectInput,
      })))
      cursor = result.nextCursor
      if (!cursor) break
    }
    return rows
  }

  async readThread(threadId: string): Promise<CodexEvent[]> {
    const normalized = threadId.trim()
    if (!normalized) throw new Error('threadId is required')
    const result = await this.client.call('thread/read', { threadId: normalized, includeTurns: true })
    return normalizeThreadHistory(result, normalized)
  }

  async listModels(): Promise<CodexModelOption[]> {
    const rows: CodexModelOption[] = []
    let cursor: string | null = null
    do {
      const result: ModelListResponse = await this.client.call('model/list', { limit: 100, ...(cursor ? { cursor } : {}) })
      rows.push(...result.data.map(model => ({
        id: model.id,
        model: model.model,
        label: model.displayName || model.id,
        description: model.description,
        hidden: model.hidden,
        isDefault: model.isDefault,
        defaultReasoningEffort: model.defaultReasoningEffort,
        supportedReasoningEfforts: model.supportedReasoningEfforts.map(option => option.reasoningEffort),
      })))
      cursor = result.nextCursor
    } while (cursor)
    return rows
  }

  async listCollaborationModes(): Promise<CodexCollaborationModeOption[]> {
    const result = await this.client.call('collaborationMode/list', {})
    return result.data.map(mode => ({
      name: mode.name,
      mode: mode.mode ?? 'default',
      model: mode.model ?? '',
      reasoningEffort: mode.reasoning_effort ?? '',
    }))
  }

  async setCollaborationMode(threadId: string, collaborationMode: CollaborationMode): Promise<void> {
    await this.client.call('thread/settings/update', { threadId, collaborationMode })
  }

  async setGoal(threadId: string, objective: string, status: 'active' | 'complete' = 'active'): Promise<void> {
    await this.client.call('thread/goal/set', { threadId, objective, status })
  }

  async clearGoal(threadId: string): Promise<void> {
    await this.client.call('thread/goal/clear', { threadId })
  }
}
