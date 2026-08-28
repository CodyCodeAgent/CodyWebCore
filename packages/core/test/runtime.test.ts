import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createAppServerHost } from '../src/runtime/index.js'

const fixture = fileURLToPath(new URL('./fixtures/app-server.mjs', import.meta.url))
const command = `${process.execPath} ${fixture}`

describe('AppServerHost', () => {
  it('deduplicates initialization and retains malformed stdout diagnostics', async () => {
    const host = createAppServerHost({ command })
    await Promise.all([host.ensureInitialized(), host.ensureInitialized(), host.ensureInitialized()])
    await expect(host.call<{ initialized: number }>('stats')).resolves.toEqual({ initialized: 1 })
    await expect(host.call<{ ok: boolean }>('malformed')).resolves.toEqual({ ok: true })
    expect(host.diagnostics().notificationCount).toBe(1)
    expect(host.diagnostics().recentLogs.some(log => log.message.includes('malformed'))).toBe(true)
    await host.dispose()
  })

  it('brokers server initiated requests and rejects calls when the process exits', async () => {
    const host = createAppServerHost({ command })
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
      command,
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
    const host = createAppServerHost({ command, onDisconnected: error => disconnected.push(error.message) })
    await host.ensureInitialized()
    await host.dispose()
    expect(disconnected).toEqual([])
    expect(host.diagnostics()).toEqual(expect.objectContaining({ status: 'stopped', initialized: false }))
  })
})
