import { describe, expect, it, vi } from 'vitest'
import { CodexThreadCommands } from '../src/session/commands.js'

function fixture() {
  const call = vi.fn(async (method: string): Promise<unknown> => {
    if (method === 'thread/start' || method === 'thread/fork') return { thread: { id: ' thread-1 ' } }
    if (method === 'turn/start') return { turn: { id: ' turn-1 ' } }
    return {}
  })
  return { commands: new CodexThreadCommands({ call }), call }
}

describe('CodexThreadCommands', () => {
  it('owns normalized thread lifecycle payloads', async () => {
    const { commands, call } = fixture()
    await expect(commands.startThread({ cwd: '/repo' })).resolves.toBe('thread-1')
    await commands.resumeThread(' thread-1 ', { cwd: '/next' })
    await commands.renameThread(' thread-1 ', ' Review ')
    await expect(commands.forkThread(' thread-1 ')).resolves.toBe('thread-1')
    await commands.compactThread(' thread-1 ')

    expect(call).toHaveBeenNthCalledWith(1, 'thread/start', { cwd: '/repo' }, undefined)
    expect(call).toHaveBeenNthCalledWith(2, 'thread/resume', { cwd: '/next', threadId: 'thread-1' }, undefined)
    expect(call).toHaveBeenNthCalledWith(3, 'thread/name/set', { threadId: 'thread-1', name: 'Review' }, undefined)
    expect(call).toHaveBeenNthCalledWith(4, 'thread/fork', { threadId: 'thread-1' }, undefined)
    expect(call).toHaveBeenNthCalledWith(5, 'thread/compact/start', { threadId: 'thread-1' }, undefined)
  })

  it('owns exact turn payloads and rejects missing identifiers', async () => {
    const { commands, call } = fixture()
    await expect(commands.startTurn(' thread-1 ', { input: [{ type: 'text', text: 'hello', text_elements: [] }], model: 'gpt-5.6-sol' })).resolves.toBe('turn-1')
    await commands.steerTurn('thread-1', ' turn-1 ', [{ type: 'text', text: 'next', text_elements: [] }])
    await commands.interruptTurn('thread-1', 'turn-1')

    expect(call).toHaveBeenNthCalledWith(1, 'turn/start', { input: [{ type: 'text', text: 'hello', text_elements: [] }], model: 'gpt-5.6-sol', threadId: 'thread-1' }, undefined)
    expect(call).toHaveBeenNthCalledWith(2, 'turn/steer', { threadId: 'thread-1', expectedTurnId: 'turn-1', input: [{ type: 'text', text: 'next', text_elements: [] }] }, undefined)
    expect(call).toHaveBeenNthCalledWith(3, 'turn/interrupt', { threadId: 'thread-1', turnId: 'turn-1' }, undefined)
    await expect(commands.interruptTurn('thread-1', ' ')).rejects.toThrow('turnId is required')
  })

  it('rejects malformed successful responses', async () => {
    const commands = new CodexThreadCommands({ call: vi.fn(async () => ({ thread: { id: '' } })) })
    await expect(commands.startThread()).rejects.toThrow('result thread id')
  })
})
