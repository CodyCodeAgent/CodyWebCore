import { describe, expect, it, vi } from 'vitest'
import { methods } from '@agentclientprotocol/sdk'
import {
  AcpSessionHost,
  createAntigravityAcpHostOptions,
  createGeminiAcpHostOptions,
  DEFAULT_ANTIGRAVITY_ACP_COMMAND,
  DEFAULT_GEMINI_ACP_COMMAND,
  splitAcpCommand,
  type AcpSession,
} from './index.js'

describe('ACP runtime primitives', () => {
  it('parses a configured command without a shell', () => {
    expect(splitAcpCommand('agent --serve "stdio transport"')).toEqual({ command: 'agent', args: ['--serve', 'stdio transport'] })
    expect(() => splitAcpCommand('   ')).toThrow('ACP 启动命令不能为空')
  })

  it('builds default and overridden Antigravity / Gemini ACP host options', () => {
    expect(DEFAULT_ANTIGRAVITY_ACP_COMMAND).toBe('agy acp')
    expect(DEFAULT_GEMINI_ACP_COMMAND).toBe('agy acp')
    expect(createAntigravityAcpHostOptions()).toMatchObject({
      command: 'agy acp',
      clientName: 'cody-web-core',
    })
    expect(createGeminiAcpHostOptions({ command: 'agy acp --model gemini-3.1-pro', clientName: 'codywork', authMethodId: 'gemini-api-key' })).toEqual({
      command: 'agy acp --model gemini-3.1-pro',
      clientName: 'codywork',
      authMethodId: 'gemini-api-key',
    })
  })

  it('sends cancellation as the ACP notification defined by the protocol', async () => {
    const notify = vi.fn().mockResolvedValue(undefined)
    const host = new AcpSessionHost({ command: 'fixture acp serve' })
    const session = {
      bindingId: 'binding', sessionId: 'native-session', closed: false,
      connection: { agent: { notify } },
    } as unknown as AcpSession
    ;(host as unknown as { sessions: Map<string, AcpSession> }).sessions.set(session.bindingId, session)

    await host.cancel(session)

    expect(notify).toHaveBeenCalledWith(methods.agent.session.cancel, { sessionId: 'native-session' })
  })
})
