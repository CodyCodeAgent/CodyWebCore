import { asRecord } from '../protocol/index.js'
import { createTypedCodexClient, type CodexRpcCaller, type TypedCodexClient } from '../protocol/methods.js'
import type { CollaborationMode } from '../protocol/generated/CollaborationMode.js'
import type { ReasoningEffort } from '../protocol/generated/ReasoningEffort.js'
import type { ConfigReadResponse } from '../protocol/generated/v2/ConfigReadResponse.js'
import type { GetAccountRateLimitsResponse } from '../protocol/generated/v2/GetAccountRateLimitsResponse.js'
import type { McpServerRefreshResponse } from '../protocol/generated/v2/McpServerRefreshResponse.js'
import type { ModelListResponse } from '../protocol/generated/v2/ModelListResponse.js'
import type { ThreadListResponse } from '../protocol/generated/v2/ThreadListResponse.js'
import type { Thread } from '../protocol/generated/v2/Thread.js'
import type { SkillScope } from '../protocol/generated/v2/SkillScope.js'
import type { ThreadGoalStatus } from '../protocol/generated/v2/ThreadGoalStatus.js'
import { normalizeThreadHistory, textFromError } from './normalization.js'
import { latestAssistantTextFromEvents, type CodexEvent } from '../conversation/index.js'

export interface CodexThreadSummary {
  threadId: string
  sessionId: string
  parentThreadId: string
  forkedFromThreadId: string
  preview: string
  name: string
  cwd: string
  createdAtIso: string
  updatedAtIso: string
  source: string
  status: 'notLoaded' | 'idle' | 'systemError' | 'active'
  activeFlags: string[]
  ephemeral: boolean
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

export interface CodexTurnSnapshot {
  turnId: string
  status: string
  error: string
  assistantText: string
  startedAtIso: string
  completedAtIso: string
  durationMs: number | null
  events: CodexEvent[]
}

export interface CodexThreadSnapshot {
  summary: CodexThreadSummary
  turns: CodexTurnSnapshot[]
  events: CodexEvent[]
}

export interface CodexSkillOption {
  name: string
  path: string
  displayName: string
  description: string
  scope: SkillScope
  enabled: boolean
  brandColor: string
  iconSmall: string
  iconLarge: string
  defaultPrompt: string
  dependencies: CodexSkillToolDependency[]
}

export interface CodexSkillToolDependency {
  type: string
  value: string
  description: string
  transport: string
  command: string
  url: string
}

export interface CodexSkillCatalogGroup {
  cwd: string
  skills: CodexSkillOption[]
  errors: Array<{ path: string; message: string }>
}

export interface CodexThreadGoalSnapshot {
  threadId: string
  objective: string
  status: ThreadGoalStatus
  tokenBudget: number | null
  tokensUsed: number
  timeUsedSeconds: number
  createdAtIso: string
  updatedAtIso: string
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

function protocolString(value: unknown, label: string, required = true): string {
  if (value === null || value === undefined) {
    if (required) throw new Error(`${label} must be a string`)
    return ''
  }
  if (typeof value !== 'string') throw new Error(`${label} must be a string`)
  return value.trim()
}

function protocolNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`)
  return value
}

function threadSummary(thread: Thread): CodexThreadSummary {
  const row = asRecord(thread)
  if (!row) throw new Error('Codex thread payload must be an object')
  const status = asRecord(row.status)
  const statusType = protocolString(status?.type, 'Codex thread.status.type')
  if (!['notLoaded', 'idle', 'systemError', 'active'].includes(statusType)) {
    throw new Error(`Codex thread.status.type is invalid: ${statusType}`)
  }
  const ephemeral = row.ephemeral
  if (typeof ephemeral !== 'boolean') throw new Error('Codex thread.ephemeral must be a boolean')
  const canAcceptDirectInput = row.canAcceptDirectInput
  if (canAcceptDirectInput !== null && typeof canAcceptDirectInput !== 'boolean') {
    throw new Error('Codex thread.canAcceptDirectInput must be a boolean or null')
  }
  const activeFlags = statusType === 'active'
    ? (Array.isArray(status?.activeFlags) ? status.activeFlags.map(sourceLabel).filter(Boolean) : (() => { throw new Error('Codex active thread.status.activeFlags must be an array') })())
    : []
  return {
    threadId: protocolString(row.id, 'Codex thread.id'),
    sessionId: protocolString(row.sessionId, 'Codex thread.sessionId'),
    parentThreadId: protocolString(row.parentThreadId, 'Codex thread.parentThreadId', false),
    forkedFromThreadId: protocolString(row.forkedFromId, 'Codex thread.forkedFromId', false),
    preview: protocolString(row.preview, 'Codex thread.preview'),
    name: protocolString(row.name, 'Codex thread.name', false),
    cwd: protocolString(row.cwd, 'Codex thread.cwd'),
    createdAtIso: timestampIso(protocolNumber(row.createdAt, 'Codex thread.createdAt')),
    updatedAtIso: timestampIso(protocolNumber(row.updatedAt, 'Codex thread.updatedAt')),
    source: sourceLabel(row.source),
    status: statusType as CodexThreadSummary['status'],
    activeFlags,
    ephemeral,
    canAcceptDirectInput,
  }
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
      if (!Array.isArray(result.data)) throw new Error('thread/list result.data must be an array')
      rows.push(...result.data.map(threadSummary))
      cursor = result.nextCursor
      if (!cursor) break
    }
    return rows
  }

  async readThread(threadId: string): Promise<CodexEvent[]> {
    return (await this.readThreadSnapshot(threadId)).events
  }

  async readThreadSnapshot(threadId: string, includeTurns = true): Promise<CodexThreadSnapshot> {
    const normalized = threadId.trim()
    if (!normalized) throw new Error('threadId is required')
    const result = await this.client.call('thread/read', { threadId: normalized, includeTurns })
    const events = includeTurns ? normalizeThreadHistory(result, normalized) : []
    return {
      summary: threadSummary(result.thread),
      events,
      turns: includeTurns ? result.thread.turns.map(turn => {
        const turnEvents = events.filter(event => event.turnId === turn.id)
        return {
          turnId: turn.id,
          status: turn.status,
          error: textFromError(turn.error),
          assistantText: latestAssistantTextFromEvents(turnEvents),
          startedAtIso: turn.startedAt === null ? '' : timestampIso(turn.startedAt),
          completedAtIso: turn.completedAt === null ? '' : timestampIso(turn.completedAt),
          durationMs: turn.durationMs,
          events: turnEvents,
        }
      }) : [],
    }
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

  /** Reads runtime defaults through the typed Core protocol boundary. */
  async readConfig(): Promise<ConfigReadResponse> {
    return this.client.call('config/read', {})
  }

  async reloadMcpServers(): Promise<McpServerRefreshResponse> {
    return this.client.call('config/mcpServer/reload', undefined)
  }

  async readAccountRateLimits(): Promise<GetAccountRateLimitsResponse> {
    return this.client.call('account/rateLimits/read', undefined)
  }

  async listSkillCatalog(cwds: string[] = [], forceReload = false): Promise<CodexSkillCatalogGroup[]> {
    const normalizedCwds = [...new Set(cwds.map(cwd => cwd.trim()).filter(Boolean))]
    const result = await this.client.call('skills/list', {
      ...(normalizedCwds.length ? { cwds: normalizedCwds } : {}),
      ...(forceReload ? { forceReload: true } : {}),
    })
    return result.data.map(group => ({
      cwd: group.cwd.trim(),
      skills: group.skills.map(skill => ({
        name: skill.name.trim(),
        path: skill.path.trim(),
        displayName: skill.interface?.displayName?.trim() || skill.name.trim(),
        description: skill.interface?.shortDescription?.trim() || skill.shortDescription?.trim() || skill.description.trim(),
        scope: skill.scope,
        enabled: skill.enabled,
        brandColor: skill.interface?.brandColor?.trim() ?? '',
        iconSmall: skill.interface?.iconSmall?.trim() || skill.interface?.iconSmallUrl?.trim() || '',
        iconLarge: skill.interface?.iconLarge?.trim() || skill.interface?.iconLargeUrl?.trim() || '',
        defaultPrompt: skill.interface?.defaultPrompt?.trim() ?? '',
        dependencies: (skill.dependencies?.tools ?? []).map(dependency => ({
          type: dependency.type.trim(),
          value: dependency.value.trim(),
          description: dependency.description?.trim() ?? '',
          transport: dependency.transport?.trim() ?? '',
          command: dependency.command?.trim() ?? '',
          url: dependency.url?.trim() ?? '',
        })),
      })),
      errors: group.errors.map(error => ({ path: error.path.trim(), message: error.message.trim() })),
    }))
  }

  async listSkills(cwds: string[] = [], forceReload = false): Promise<CodexSkillOption[]> {
    const byIdentity = new Map<string, CodexSkillOption>()
    for (const group of await this.listSkillCatalog(cwds, forceReload)) {
      for (const skill of group.skills) {
        if (!skill.name || !skill.path) continue
        byIdentity.set(`${skill.name}\n${skill.path}`, skill)
      }
    }
    return [...byIdentity.values()].sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path))
  }

  async setSkillEnabled(path: string, enabled: boolean): Promise<void> {
    const normalized = path.trim()
    if (!normalized) throw new Error('skill path is required')
    await this.client.call('skills/config/write', { path: normalized, enabled })
  }

  async setCollaborationMode(threadId: string, collaborationMode: CollaborationMode): Promise<void> {
    await this.client.call('thread/settings/update', { threadId, collaborationMode })
  }

  async getGoal(threadId: string): Promise<CodexThreadGoalSnapshot | null> {
    const normalized = threadId.trim()
    if (!normalized) throw new Error('threadId is required')
    const result = await this.client.call('thread/goal/get', { threadId: normalized })
    const goal = result.goal
    return goal ? {
      threadId: goal.threadId.trim(),
      objective: goal.objective.trim(),
      status: goal.status,
      tokenBudget: goal.tokenBudget,
      tokensUsed: goal.tokensUsed,
      timeUsedSeconds: goal.timeUsedSeconds,
      createdAtIso: timestampIso(goal.createdAt),
      updatedAtIso: timestampIso(goal.updatedAt),
    } : null
  }

  async setGoal(threadId: string, input: { objective?: string | null; status?: ThreadGoalStatus | null; tokenBudget?: number | null }): Promise<void> {
    const normalized = threadId.trim()
    if (!normalized) throw new Error('threadId is required')
    await this.client.call('thread/goal/set', {
      threadId: normalized,
      ...(input.objective !== undefined ? { objective: input.objective?.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.tokenBudget !== undefined ? { tokenBudget: input.tokenBudget } : {}),
    })
  }

  async clearGoal(threadId: string): Promise<void> {
    await this.client.call('thread/goal/clear', { threadId })
  }
}
