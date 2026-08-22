import { spawn, type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process'
import {
  READ_RECOVERY_METHODS,
  type RpcRequest,
  type RpcResponse,
  type RuntimeNotification,
  type ServerRequest,
  isNotification,
  isServerRequest,
  normalizeRpcResponse,
} from '../protocol/index.js'

export type RpcOptions = { timeoutMs?: number }
export type ServerRequestReply = { result?: unknown; error?: { code: number; message: string } }
export type RuntimeNotificationListener = (notification: RuntimeNotification) => void
export type AppServerLog = { atIso: string; level: 'info' | 'warning' | 'error'; source: 'bridge' | 'stdout' | 'stderr'; message: string }
export type PendingServerRequest = ServerRequest
export type AppServerDiagnostics = {
  status: 'running' | 'stopped'
  initialized: boolean
  pid: number | null
  pendingClientRequestCount: number
  pendingServerRequestCount: number
  sentClientRequestCount: number
  completedClientRequestCount: number
  failedClientRequestCount: number
  notificationCount: number
  recentLogs: AppServerLog[]
}

export type SpawnAppServer = (command: string, args: string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams

export type AppServerHostOptions = {
  command?: string
  args?: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  initializeParams?: unknown
  rpcTimeoutMs?: number
  restartCooldownMs?: number
  spawn?: SpawnAppServer
  onServerRequest?: (request: ServerRequest) => Promise<ServerRequestReply | null> | ServerRequestReply | null
  onDisconnected?: (reason: Error) => void
}

export interface AppServerHost {
  ensureInitialized(): Promise<void>
  call<T>(method: string, params?: unknown, options?: RpcOptions): Promise<T>
  subscribe(listener: RuntimeNotificationListener): () => void
  listPendingRequests(): PendingServerRequest[]
  resolveServerRequest(id: number, reply: ServerRequestReply): Promise<void>
  diagnostics(): AppServerDiagnostics
  dispose(): Promise<void>
}

type PendingCall = { method: string; resolve: (value: unknown) => void; reject: (reason?: unknown) => void; timer: ReturnType<typeof setTimeout> }

const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_RESTART_COOLDOWN_MS = 1_750

function splitCommand(command: string): [string, ...string[]] {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/gu)?.map((part) => part.replace(/^"|"$/gu, '')) ?? []
  if (parts.length === 0) throw new Error('App Server command cannot be empty')
  return parts as [string, ...string[]]
}

export function createAppServerHost(options: AppServerHostOptions = {}): AppServerHost {
  const pending = new Map<number, PendingCall>()
  const pendingServerRequests = new Map<number, PendingServerRequest>()
  const listeners = new Set<RuntimeNotificationListener>()
  const logs: AppServerLog[] = []
  const spawnAppServer = options.spawn ?? spawn
  let process: ChildProcessWithoutNullStreams | null = null
  let initialized = false
  let initializePromise: Promise<void> | null = null
  let buffer = ''
  let sequence = 1
  let stopping = false
  let restartAt = 0
  let sent = 0
  let completed = 0
  let failed = 0
  let notifications = 0

  const pushLog = (level: AppServerLog['level'], source: AppServerLog['source'], raw: string): void => {
    const message = raw.replace(/\s+/gu, ' ').trim()
    if (!message) return
    logs.push({ atIso: new Date().toISOString(), level, source, message: message.slice(0, 500) })
    if (logs.length > 80) logs.splice(0, logs.length - 80)
  }

  const emit = (method: string, params: unknown): void => {
    notifications += 1
    const notification = { method, params, receivedAtIso: new Date().toISOString() }
    for (const listener of listeners) listener(notification)
  }

  const rejectPending = (reason: Error): void => {
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(reason) }
    failed += pending.size
    pending.clear()
  }

  const onLine = (line: string): void => {
    const message = normalizeRpcResponse(JSON.parse(line))
    if (!message) { pushLog('warning', 'stdout', 'Ignored invalid app-server JSON-RPC payload.'); return }
    if (typeof message.id === 'number' && pending.has(message.id) && !message.method) {
      const entry = pending.get(message.id)!
      pending.delete(message.id)
      clearTimeout(entry.timer)
      if (message.error) { failed += 1; entry.reject(new Error(message.error.message)) } else { completed += 1; entry.resolve(message.result) }
      return
    }
    if (isNotification(message)) { emit(message.method, message.params ?? null); return }
    if (isServerRequest(message)) {
      const request: ServerRequest = { id: message.id, method: message.method, params: message.params ?? null, receivedAtIso: new Date().toISOString() }
      void Promise.resolve(options.onServerRequest?.(request)).then(async (reply) => {
        if (reply) await resolveServerRequest(request.id, reply)
        else { pendingServerRequests.set(request.id, request); emit('server/request', request) }
      }).catch((error) => { pushLog('error', 'bridge', error instanceof Error ? error.message : String(error)); pendingServerRequests.set(request.id, request); emit('server/request', request) })
    }
  }

  const start = (): void => {
    if (process) return
    const [command, ...fromCommand] = splitCommand(options.command ?? 'codex app-server --stdio')
    const args = options.args ?? fromCommand
    stopping = false
    process = spawnAppServer(command, args, { cwd: options.cwd, env: { ...globalThis.process.env, ...options.env }, stdio: ['pipe', 'pipe', 'pipe'] })
    const child = process
    pushLog('info', 'bridge', `App Server started${child.pid ? ` (pid ${String(child.pid)})` : ''}.`)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk
      let end = buffer.indexOf('\n')
      while (end >= 0) {
        const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1)
        if (line) { try { onLine(line) } catch { pushLog('warning', 'stdout', 'Ignored malformed app-server JSON-RPC line.') } }
        end = buffer.indexOf('\n')
      }
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => chunk.split(/\r?\n/u).forEach((line) => pushLog('warning', 'stderr', line)))
    child.on('error', (error) => pushLog('error', 'bridge', error.message))
    child.on('exit', (code, signal) => {
      const reason = new Error(stopping ? 'Codex App Server stopped' : `Codex App Server exited (${String(code ?? signal ?? 'unknown')})`)
      rejectPending(reason)
      pendingServerRequests.clear()
      process = null; initialized = false; initializePromise = null; buffer = ''
      pushLog(stopping ? 'info' : 'error', 'bridge', reason.message)
      options.onDisconnected?.(reason)
    })
  }

  const send = (payload: RpcRequest | { jsonrpc: '2.0'; id: number; result?: unknown; error?: unknown }): void => {
    if (!process) throw new Error('Codex App Server is not running')
    process.stdin.write(`${JSON.stringify(payload)}\n`)
  }

  const recover = (method: string): void => {
    if (!READ_RECOVERY_METHODS.has(method) || pending.size > 0 || pendingServerRequests.size > 0 || Date.now() < restartAt) return
    restartAt = Date.now() + (options.restartCooldownMs ?? DEFAULT_RESTART_COOLDOWN_MS)
    pushLog('warning', 'bridge', `Restarting App Server after timed out ${method}.`)
    void dispose()
  }

  const call = <T>(method: string, params: unknown = {}, rpcOptions: RpcOptions = {}): Promise<T> => {
    start()
    const id = sequence++
    const timeoutMs = Math.max(250, rpcOptions.timeoutMs ?? options.rpcTimeoutMs ?? DEFAULT_TIMEOUT_MS)
    sent += 1
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending.delete(id)) return
        failed += 1
        const error = new Error(`codex app-server RPC ${method} timed out after ${String(timeoutMs)}ms`)
        pushLog('error', 'bridge', error.message)
        recover(method)
        reject(error)
      }, timeoutMs)
      timer.unref?.()
      pending.set(id, { method, timer, resolve: (value) => resolve(value as T), reject })
      try { send({ jsonrpc: '2.0', id, method, params }) } catch (error) { clearTimeout(timer); pending.delete(id); failed += 1; reject(error) }
    })
  }

  const resolveServerRequest = async (id: number, reply: ServerRequestReply): Promise<void> => {
    const request = pendingServerRequests.get(id)
    if (!request) throw new Error(`No pending server request found for id ${String(id)}`)
    pendingServerRequests.delete(id)
    if (reply.error) send({ jsonrpc: '2.0', id, error: reply.error })
    else send({ jsonrpc: '2.0', id, result: reply.result ?? {} })
    emit('server/request/resolved', { id, method: request.method, threadId: request.params && typeof request.params === 'object' ? (request.params as { threadId?: unknown }).threadId : undefined })
  }

  const ensureInitialized = async (): Promise<void> => {
    if (initialized) return
    if (initializePromise) return initializePromise
    initializePromise = (async () => {
      if (Date.now() < restartAt) await new Promise<void>((resolve) => setTimeout(resolve, restartAt - Date.now()))
      await call('initialize', options.initializeParams ?? {
        clientInfo: { name: 'cody-web-core', title: 'Cody Web Core', version: '0.1.0' },
        capabilities: { experimentalApi: true, requestAttestation: false },
      })
      initialized = true
    })().finally(() => { initializePromise = null })
    return initializePromise
  }

  const dispose = async (): Promise<void> => {
    const child = process
    if (!child) return
    stopping = true
    child.stdin.end()
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGTERM'); resolve() }, 1_000)
      child.once('exit', () => { clearTimeout(timer); resolve() })
    })
  }

  return {
    ensureInitialized,
    call,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    listPendingRequests() { return [...pendingServerRequests.values()] },
    resolveServerRequest,
    diagnostics() {
      return { status: process ? 'running' : 'stopped', initialized, pid: process?.pid ?? null, pendingClientRequestCount: pending.size, pendingServerRequestCount: pendingServerRequests.size, sentClientRequestCount: sent, completedClientRequestCount: completed, failedClientRequestCount: failed, notificationCount: notifications, recentLogs: [...logs] }
    },
    dispose,
  }
}
