import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { createAppServerHost, type RuntimeNotification, type SpawnAppServer } from '../src/runtime/index.js'

function fakeAppServer(mode: 'normal' | 'hang-initialize' | 'hang-read' = 'normal'): SpawnAppServer {
  return () => {
    const child = new EventEmitter() as ChildProcessWithoutNullStreams
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    let input = ''
    let initialized = 0
    let waitingCallId: number | null = null
    const write = (payload: unknown): void => { stdout.write(`${JSON.stringify(payload)}\n`) }
    Object.assign(child, { pid: 4242, stdin, stdout, stderr, kill: (signal: NodeJS.Signals) => { queueMicrotask(() => child.emit('exit', null, signal)); return true } })
    stdin.setEncoding('utf8')
    stdin.on('data', (chunk: string) => {
      input += chunk
      let end = input.indexOf('\n')
      while (end >= 0) {
        const line = input.slice(0, end); input = input.slice(end + 1); end = input.indexOf('\n')
        if (!line) continue
        const message = JSON.parse(line) as { id: number; method?: string; result?: unknown }
        if (message.method === 'initialize') { initialized += 1; if (mode !== 'hang-initialize') write({ jsonrpc: '2.0', id: message.id, result: {} }); continue }
        if (message.method === 'thread/read' && mode === 'hang-read') continue
        if (message.method === 'stats') { write({ jsonrpc: '2.0', id: message.id, result: { initialized } }); continue }
        if (message.method === 'hang') continue
        if (message.method === 'sensitive-logs') {
          for (let index = 0; index < 90; index += 1) stderr.write(`safe diagnostic ${index}\n`)
          stderr.write('Authorization: Bearer top-secret-token\n"api_key":"super-secret-value" password=hunter2\n')
          stderr.write('-----BEGIN RSA PRIVATE KEY-----\nprivate-key-material\n-----END RSA PRIVATE KEY-----\n')
          write({ jsonrpc: '2.0', id: message.id, result: { ok: true } }); continue
        }
        if (message.method === 'malformed') {
          stdout.write('not json\n'); write({ jsonrpc: '2.0', method: 'item/agentMessage/delta', params: { delta: 'ok' } }); write({ jsonrpc: '2.0', id: message.id, result: { ok: true } }); continue
        }
        if (message.method === 'ask') {
          waitingCallId = message.id; write({ jsonrpc: '2.0', id: 900, method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', reason: 'fixture' } }); continue
        }
        if (message.id === 900 && waitingCallId !== null) {
          write({ jsonrpc: '2.0', id: waitingCallId, result: { approved: true, reply: message.result ?? null } }); waitingCallId = null; continue
        }
        if (message.method === 'pipe-error') { queueMicrotask(() => stdin.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))); continue }
        if (message.method === 'exit') {
          write({ jsonrpc: '2.0', id: 901, method: 'fixture/pending', params: { secret: 'server-payload-secret' } })
          queueMicrotask(() => child.emit('exit', 1, null)); continue
        }
      }
    })
    stdin.on('finish', () => queueMicrotask(() => child.emit('exit', 0, null)))
    return child
  }
}

describe('AppServerHost', () => {
  it('deduplicates concurrent initialization', async () => {
    const host = createAppServerHost({ spawn: fakeAppServer() })
    await Promise.all([host.ensureInitialized(), host.ensureInitialized(), host.ensureInitialized()])
    await expect(host.call<{ initialized: number }>('stats')).resolves.toEqual({ initialized: 1 })
    await host.dispose()
  })

  it('reports initialize timeouts separately from ordinary RPC timeouts', async () => {
    const initializing = createAppServerHost({ spawn: fakeAppServer('hang-initialize'), rpcTimeoutMs: 250 })
    await expect(initializing.ensureInitialized()).rejects.toThrow('initialize timed out')
    expect(initializing.failureReport()).toEqual(expect.objectContaining({
      phase: 'initialize', cause: 'initialize_timeout', failedMethod: 'initialize',
      process: expect.objectContaining({ status: 'running' }),
      counts: expect.objectContaining({ failedClientRequests: 1 }),
    }))
    await initializing.dispose()

    const running = createAppServerHost({ spawn: fakeAppServer(), rpcTimeoutMs: 250 })
    await running.ensureInitialized()
    await expect(running.call('hang')).rejects.toThrow('hang timed out')
    const report = running.failureReport()
    expect(report).toEqual(expect.objectContaining({ phase: 'rpc', cause: 'rpc_timeout', failedMethod: 'hang' }))
    expect(report?.pendingClientRequests).toEqual([expect.objectContaining({
      method: 'hang', startedAtIso: expect.any(String), deadlineAtIso: expect.any(String), durationMs: expect.any(Number),
    })])
    expect(JSON.parse(JSON.stringify(report))).toEqual(report)
    await running.dispose()
  })

  it('never replaces an App Server that hangs during initialization', async () => {
    let spawnCount = 0
    const spawn: SpawnAppServer = (...args) => { spawnCount += 1; return fakeAppServer('hang-initialize')(...args) }
    const host = createAppServerHost({ spawn, rpcTimeoutMs: 250 })

    await expect(host.ensureInitialized()).rejects.toThrow('initialize timed out')
    await expect(host.ensureInitialized()).rejects.toThrow('initialize timed out')
    expect(spawnCount).toBe(1)
    expect(host.diagnostics()).toMatchObject({ status: 'running', lifecycle: 'running', startCount: 1, initialized: false })
    await host.dispose()
  })

  it('does not restart the App Server when a read RPC times out', async () => {
    let spawnCount = 0
    const spawn: SpawnAppServer = (...args) => { spawnCount += 1; return fakeAppServer('hang-read')(...args) }
    const host = createAppServerHost({ spawn, rpcTimeoutMs: 250 })
    await host.ensureInitialized()
    await expect(host.call('thread/read')).rejects.toThrow('thread/read timed out')

    await host.ensureInitialized()
    await expect(host.call<{ initialized: number }>('stats')).resolves.toEqual({ initialized: 1 })
    expect(spawnCount).toBe(1)
    expect(host.diagnostics()).toMatchObject({ status: 'running', lifecycle: 'running', startCount: 1, initialized: true })
    await host.dispose()
  })

  it('does not implicitly start before initialization or restart after an unexpected exit', async () => {
    let spawnCount = 0
    const spawn: SpawnAppServer = (...args) => { spawnCount += 1; return fakeAppServer()(...args) }
    const host = createAppServerHost({ spawn })

    await expect(host.call('stats')).rejects.toThrow('has not been initialized')
    expect(spawnCount).toBe(0)

    await host.ensureInitialized()
    await expect(host.call('exit')).rejects.toThrow('exited')
    await expect(host.ensureInitialized()).rejects.toThrow('will not be restarted automatically')
    await expect(host.call('stats')).rejects.toThrow('will not be restarted automatically')
    expect(spawnCount).toBe(1)
    expect(host.diagnostics()).toMatchObject({ status: 'stopped', lifecycle: 'unavailable', startCount: 1, initialized: false })
  })

  it('reports process exits with pending request timing but without payloads', async () => {
    const host = createAppServerHost({ spawn: fakeAppServer() })
    await host.ensureInitialized()
    const call = host.call('exit', { token: 'must-never-appear' })
    await expect(call).rejects.toThrow('exited')
    const report = host.failureReport()
    expect(report).toEqual(expect.objectContaining({
      phase: 'process', cause: 'process_exit', failedMethod: 'exit',
      process: expect.objectContaining({ status: 'stopped', exitCode: 1 }),
    }))
    expect(report?.pendingClientRequests[0]).toEqual(expect.objectContaining({
      method: 'exit', startedAtIso: expect.any(String), deadlineAtIso: expect.any(String), durationMs: expect.any(Number),
    }))
    expect(report?.pendingServerRequests[0]).toEqual(expect.objectContaining({
      method: 'fixture/pending', receivedAtIso: expect.any(String), durationMs: expect.any(Number),
    }))
    expect(JSON.stringify(report)).not.toMatch(/must-never-appear|server-payload-secret/u)
  })

  it('reports malformed stdout and returns deeply immutable redacted bounded logs', async () => {
    const host = createAppServerHost({ spawn: fakeAppServer() })
    await host.ensureInitialized()
    await expect(host.call('sensitive-logs')).resolves.toEqual({ ok: true })
    await expect(host.call<{ ok: boolean }>('malformed')).resolves.toEqual({ ok: true })
    const report = host.failureReport()
    expect(report).toEqual(expect.objectContaining({ phase: 'protocol', cause: 'malformed_json' }))
    expect(report?.recentLogs.length).toBeLessThanOrEqual(80)
    expect(JSON.stringify(report)).not.toMatch(/top-secret-token|super-secret-value|hunter2|private-key-material/u)
    expect(JSON.stringify(report)).toContain('[REDACTED]')
    expect(Object.isFrozen(report)).toBe(true)
    expect(Object.isFrozen(report?.process)).toBe(true)
    expect(Object.isFrozen(report?.recentLogs)).toBe(true)
    expect(Object.isFrozen(report?.recentLogs[0])).toBe(true)
    expect(() => { (report!.hints as string[]).push('mutate') }).toThrow()
    await host.dispose()
  })

  it('reports stdin EPIPE failures without waiting for the RPC timeout', async () => {
    const host = createAppServerHost({ spawn: fakeAppServer(), rpcTimeoutMs: 5_000 })
    const disconnects: RuntimeNotification[] = []
    host.subscribe((notification) => {
      if (notification.method === 'runtime/disconnected') disconnects.push(notification)
    })
    await host.ensureInitialized()
    await expect(host.call('pipe-error')).rejects.toThrow('stdin failed')
    expect(host.failureReport()).toEqual(expect.objectContaining({
      phase: 'transport', cause: 'stdin_error', failedMethod: 'pipe-error',
    }))
    await expect(host.call('stats')).rejects.toThrow('will not be restarted automatically')
    expect(host.diagnostics()).toMatchObject({ lifecycle: 'unavailable', startCount: 1 })
    expect(disconnects).toHaveLength(1)
    await host.dispose()
  })

  it('brokers server initiated requests and rejects calls when the process exits', async () => {
    const host = createAppServerHost({ spawn: fakeAppServer() })
    await host.ensureInitialized()
    const pending = host.call<{ approved: boolean }>('ask')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(host.listPendingRequests()).toEqual([expect.objectContaining({ id: 900, method: 'item/commandExecution/requestApproval' })])
    await host.resolveServerRequest(900, { result: { decision: 'approved' } })
    await expect(pending).resolves.toEqual(expect.objectContaining({ approved: true }))
    await expect(host.call('exit')).rejects.toThrow('exited')
  })

  it('can resolve a server request synchronously from the policy callback', async () => {
    const host = createAppServerHost({
      spawn: fakeAppServer(),
      onServerRequest: () => ({ result: { decision: 'decline' } }),
    })
    await host.ensureInitialized()
    await expect(host.call<{ approved: boolean; reply: unknown }>('ask')).resolves.toEqual({
      approved: true,
      reply: { decision: 'decline' },
    })
    expect(host.listPendingRequests()).toEqual([])
    await host.dispose()
  })

  it('does not report an intentional dispose as a disconnect', async () => {
    const disconnected: string[] = []
    const host = createAppServerHost({ spawn: fakeAppServer(), onDisconnected: error => disconnected.push(error.message) })
    await host.ensureInitialized()
    await host.dispose()
    expect(disconnected).toEqual([])
    expect(host.diagnostics()).toEqual(expect.objectContaining({ status: 'stopped', lifecycle: 'disposed', startCount: 1, initialized: false }))
  })
})
