import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import {
  client,
  methods,
  ndJsonStream,
  PROTOCOL_VERSION,
  type ClientConnection,
  type InitializeResponse,
  type PermissionOption,
  type SessionConfigOption,
  type SessionUpdate,
} from '@agentclientprotocol/sdk'

export type AcpSession = {
  readonly bindingId: string
  readonly sessionId: string
  readonly process: ChildProcessWithoutNullStreams
  readonly connection: ClientConnection
  readonly capabilities: NonNullable<InitializeResponse['agentCapabilities']>
  configOptions: SessionConfigOption[]
  closed: boolean
  updateListeners: Set<(update: SessionUpdate) => void>
  permissionHandler: ((request: AcpPermissionRequest) => Promise<string | null> | string | null) | null
}

export type AcpPermissionRequest = { options: PermissionOption[]; toolCall: unknown }

export type {
  PermissionOption as AcpPermissionOption,
  SessionConfigOption as AcpSessionConfigOption,
  SessionUpdate as AcpSessionUpdate,
} from '@agentclientprotocol/sdk'

export type AcpSessionHostOptions = { command: string; env?: NodeJS.ProcessEnv; clientName?: string }
export type AcpSessionOpenOptions = { bindingId: string; cwd: string; sessionId?: string }
export type AcpNativeSessionSummary = { sessionId: string; title?: string; cwd?: string }

export function splitAcpCommand(value: string): { command: string; args: string[] } {
  const parts = value.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^("|')|("|')$/g, '')) ?? []
  if (!parts[0]) throw new Error('ACP 启动命令不能为空')
  return { command: parts[0], args: parts.slice(1) }
}

/** Provider-neutral ACP process/session owner. Core owns transport and native
 * Session lifecycle; products map updates into their own presentation model. */
export class AcpSessionHost {
  private readonly sessions = new Map<string, AcpSession>()
  constructor(private readonly options: AcpSessionHostOptions) {}
  get size(): number { return this.sessions.size }

  async probe(): Promise<void> { const opened = await this.openConnection(); await this.closeConnection(opened) }

  async open(options: AcpSessionOpenOptions): Promise<AcpSession> {
    const existing = this.sessions.get(options.bindingId)
    if (existing) {
      if (options.sessionId && existing.sessionId !== options.sessionId) throw new Error('ACP 会话绑定与请求的原生 Session 不一致')
      return existing
    }
    const opened = await this.openConnection()
    try {
      const response = options.sessionId
        ? await this.loadOrResume(opened, options.sessionId, options.cwd)
        : await opened.connection.agent.request(methods.agent.session.new, { cwd: options.cwd, mcpServers: [] })
      const sessionId = options.sessionId ?? (response as { sessionId: string }).sessionId
      const session: AcpSession = {
        bindingId: options.bindingId, sessionId, process: opened.process, connection: opened.connection,
        capabilities: opened.capabilities, configOptions: (response as { configOptions?: SessionConfigOption[] }).configOptions ?? [],
        closed: false, updateListeners: new Set(), permissionHandler: null,
      }
      opened.attach(session)
      this.sessions.set(options.bindingId, session)
      return session
    } catch (error) { await this.closeConnection(opened); throw error }
  }

  require(bindingId: string): AcpSession {
    const session = this.sessions.get(bindingId)
    if (!session || session.closed) throw new Error('ACP conversation runtime is not available')
    return session
  }

  subscribe(session: AcpSession, listener: (update: SessionUpdate) => void): () => void {
    this.assertOwned(session); session.updateListeners.add(listener); return () => session.updateListeners.delete(listener)
  }
  setPermissionHandler(session: AcpSession, handler: AcpSession['permissionHandler']): void { this.assertOwned(session); session.permissionHandler = handler }
  async prompt(session: AcpSession, prompt: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>): Promise<{ stopReason?: string }> {
    this.assertOwned(session)
    return await session.connection.agent.request(methods.agent.session.prompt, { sessionId: session.sessionId, prompt }) as { stopReason?: string }
  }
  async cancel(session: AcpSession): Promise<void> { this.assertOwned(session); await session.connection.agent.notify(methods.agent.session.cancel, { sessionId: session.sessionId }) }
  async setConfigOption(session: AcpSession, configId: string, value: string): Promise<void> {
    this.assertOwned(session)
    const response = await session.connection.agent.request(methods.agent.session.setConfigOption, { sessionId: session.sessionId, configId, value }) as { configOptions?: SessionConfigOption[] }
    if (response.configOptions) session.configOptions = response.configOptions
  }
  async list(cwd: string): Promise<AcpNativeSessionSummary[]> {
    const opened = await this.openConnection()
    try {
      if (!opened.capabilities.sessionCapabilities?.list) throw new Error('当前 ACP 未声明 session/list 能力')
      const response = await opened.connection.agent.request(methods.agent.session.list, { cwd })
      return response.sessions.map((item) => ({ sessionId: item.sessionId, ...(item.title ? { title: item.title } : {}), ...(item.cwd ? { cwd: item.cwd } : {}) }))
    } finally { await this.closeConnection(opened) }
  }
  async close(session: AcpSession): Promise<void> { this.terminate(session) }
  terminate(session: AcpSession): void {
    if (session.closed) return
    session.closed = true; this.sessions.delete(session.bindingId); session.permissionHandler = null; session.updateListeners.clear(); session.connection.close()
    if (!session.process.killed) session.process.kill()
  }
  async closeAll(): Promise<void> { await Promise.all([...this.sessions.values()].map((session) => this.close(session))) }
  static supportsImage(session: AcpSession): boolean { return session.capabilities.promptCapabilities?.image === true }

  private async openConnection(): Promise<{ process: ChildProcessWithoutNullStreams; connection: ClientConnection; capabilities: NonNullable<InitializeResponse['agentCapabilities']>; attach: (session: AcpSession) => void }> {
    const { command, args } = splitAcpCommand(this.options.command)
    const process = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...globalThis.process.env, ...this.options.env } })
    const app = client({ name: this.options.clientName ?? 'cody-web-core' })
    let session: AcpSession | undefined
    app.onNotification(methods.client.session.update, ({ params }) => { if (session && params.sessionId === session.sessionId) for (const listener of session.updateListeners) listener(params.update) })
    app.onRequest(methods.client.session.requestPermission, async ({ params }) => {
      if (!session || params.sessionId !== session.sessionId) return { outcome: { outcome: 'cancelled' } }
      const optionId = await session.permissionHandler?.({ options: params.options, toolCall: params.toolCall })
      return optionId ? { outcome: { outcome: 'selected', optionId } } : { outcome: { outcome: 'cancelled' } }
    })
    const connection = app.connect(ndJsonStream(Writable.toWeb(process.stdin), Readable.toWeb(process.stdout) as unknown as ReadableStream<Uint8Array>))
    try {
      const initialized = await connection.agent.request(methods.agent.initialize, { protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} })
      return { process, connection, capabilities: initialized.agentCapabilities ?? {}, attach: (value) => { session = value } }
    } catch (error) { connection.close(error); process.kill(); throw new Error('ACP 初始化失败') }
  }
  private async loadOrResume(opened: Awaited<ReturnType<AcpSessionHost['openConnection']>>, sessionId: string, cwd: string): Promise<unknown> {
    if (opened.capabilities.loadSession) return await opened.connection.agent.request(methods.agent.session.load, { sessionId, cwd, mcpServers: [] })
    if (opened.capabilities.sessionCapabilities?.resume) return await opened.connection.agent.request(methods.agent.session.resume, { sessionId, cwd })
    throw new Error('当前 ACP 未声明恢复原生 Session 的能力')
  }
  private async closeConnection(opened: { process: ChildProcessWithoutNullStreams; connection: ClientConnection }): Promise<void> { opened.connection.close(); if (!opened.process.killed) opened.process.kill() }
  private assertOwned(session: AcpSession): void { if (this.sessions.get(session.bindingId) !== session || session.closed) throw new Error('ACP conversation runtime is not available') }
}
