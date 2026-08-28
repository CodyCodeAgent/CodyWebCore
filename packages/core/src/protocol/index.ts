/** Stable, framework-neutral boundary for the Codex App Server JSON-RPC protocol. */
export type JsonRecord = Record<string, unknown>

export type RpcRequest = {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

export type RpcError = { code: number; message: string; data?: unknown }

export type RpcResponse = {
  jsonrpc?: '2.0'
  id?: number | string | null
  result?: unknown
  error?: RpcError
  method?: string
  params?: unknown
}

export type RuntimeNotification = {
  method: string
  params: unknown
  receivedAtIso: string
}

export type ServerRequest = RuntimeNotification & {
  id: number
}

export type CapabilitySet = {
  protocolVersion: string
  supports: ReadonlySet<string>
}

export type ProtocolMethod =
  | 'initialize'
  | 'thread/start'
  | 'thread/resume'
  | 'thread/read'
  | 'thread/settings/update'
  | 'turn/start'
  | 'turn/steer'
  | 'turn/interrupt'
  | 'model/list'
  | 'skills/list'

export type { ClientRequest } from './generated/ClientRequest.js'
export type { ServerNotification } from './generated/ServerNotification.js'
export type { ServerRequest as GeneratedServerRequest } from './generated/ServerRequest.js'
export type { Thread } from './generated/v2/Thread.js'
export type { ThreadItem } from './generated/v2/ThreadItem.js'
export type { Turn } from './generated/v2/Turn.js'
export type { UserInput } from './generated/v2/UserInput.js'
export type { ReasoningEffort } from './generated/ReasoningEffort.js'
export type { CollaborationMode } from './generated/CollaborationMode.js'

export * from './methods.js'
export * from './permission-profile.js'

export const READ_RECOVERY_METHODS = new Set(['thread/read', 'thread/loaded/list'])

export function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null
}

export function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function readIsoTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 10_000_000_000 ? value * 1000 : value
  if (typeof value !== 'string' || value.length === 0) return null
  const milliseconds = new Date(value).getTime()
  return Number.isNaN(milliseconds) ? null : milliseconds
}

export function readIsoTimestampString(value: unknown): string {
  if (typeof value === 'string') return value
  const milliseconds = readIsoTimestampMs(value)
  return milliseconds === null ? '' : new Date(milliseconds).toISOString()
}

export function toRawPayload(value: unknown): string {
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

export function readNestedString(value: unknown, paths: readonly string[][]): string {
  for (const path of paths) {
    let cursor: unknown = value
    for (const key of path) {
      const record = asRecord(cursor)
      if (!record) { cursor = null; break }
      cursor = record[key]
    }
    const text = readString(cursor).trim()
    if (text) return text
  }
  return ''
}

export function readThreadId(params: unknown): string {
  return readNestedString(params, [
    ['threadId'], ['thread_id'], ['thread', 'id'], ['turn', 'threadId'], ['turn', 'thread_id'], ['request', 'threadId'],
  ])
}

export function readTurnId(params: unknown): string {
  return readNestedString(params, [
    ['turnId'], ['turn_id'], ['turn', 'id'], ['request', 'turnId'], ['request', 'turn_id'],
  ])
}

export function readItemId(params: unknown): string {
  return readNestedString(params, [
    ['itemId'], ['item_id'], ['item', 'id'], ['request', 'itemId'], ['request', 'item_id'],
  ])
}

export function normalizeRpcResponse(value: unknown): RpcResponse | null {
  const record = asRecord(value)
  if (!record) return null
  const id = typeof record.id === 'number' || typeof record.id === 'string' || record.id === null ? record.id : undefined
  const method = typeof record.method === 'string' ? record.method : undefined
  const errorValue = asRecord(record.error)
  const error = errorValue && typeof errorValue.code === 'number' && typeof errorValue.message === 'string'
    ? { code: errorValue.code, message: errorValue.message, ...(errorValue.data === undefined ? {} : { data: errorValue.data }) }
    : undefined
  if (id === undefined && !method) return null
  return {
    ...(record.jsonrpc === '2.0' ? { jsonrpc: '2.0' as const } : {}),
    ...(id === undefined ? {} : { id }),
    ...(method ? { method } : {}),
    ...(record.params === undefined ? {} : { params: record.params }),
    ...(record.result === undefined ? {} : { result: record.result }),
    ...(error ? { error } : {}),
  }
}

export function isServerRequest(response: RpcResponse): response is RpcResponse & { id: number; method: string } {
  return typeof response.id === 'number' && typeof response.method === 'string'
}

export function isNotification(response: RpcResponse): response is RpcResponse & { method: string } {
  return response.id === undefined && typeof response.method === 'string'
}

export function capabilitySet(methods: Iterable<string>, protocolVersion = 'unknown'): CapabilitySet {
  return { protocolVersion, supports: new Set(methods) }
}

export function hasCapability(capabilities: CapabilitySet | undefined, method: string): boolean {
  return !capabilities || capabilities.supports.size === 0 || capabilities.supports.has(method)
}
