import { describe, expect, it, vi } from 'vitest'
import { CodexSessionCatalog } from '../src/session/catalog.js'

function rpcWith(handler: (method: string, params: unknown) => unknown) {
  return {
    call: vi.fn(async <T>(method: string, params?: unknown): Promise<T> => handler(method, params) as T),
  }
}

describe('CodexSessionCatalog', () => {
  it('owns paginated thread listing and stable product summaries', async () => {
    const rpc = rpcWith((_method, params) => ({
      data: [{
        id: 'thread-1', preview: ' Inspect code ', name: 'Review', cwd: '/repo', createdAt: 1_700_000_000,
        updatedAt: 1_700_000_100, source: { vscode: {} }, canAcceptDirectInput: true,
      }],
      nextCursor: (params as { cursor?: string }).cursor ? null : 'next',
    }))
    const catalog = new CodexSessionCatalog(rpc)

    const threads = await catalog.listThreads({ cwd: '/repo', limit: 20 })
    expect(threads).toHaveLength(2)
    expect(threads[0]).toMatchObject({
      threadId: 'thread-1', preview: 'Inspect code', name: 'Review', cwd: '/repo', source: 'vscode', canAcceptDirectInput: true,
    })
    expect(rpc.call).toHaveBeenNthCalledWith(1, 'thread/list', {
      archived: false, limit: 20, sortKey: 'updated_at', sortDirection: 'desc', cwd: '/repo',
    }, undefined)
    expect(rpc.call).toHaveBeenNthCalledWith(2, 'thread/list', expect.objectContaining({ cursor: 'next' }), undefined)
  })

  it('normalizes current model and collaboration-mode schema', async () => {
    const rpc = rpcWith((method) => {
      if (method === 'model/list') return {
        data: [{
          id: 'gpt-5.6-sol', model: 'gpt-5.6-sol', displayName: 'GPT 5.6 Sol', description: 'frontier', hidden: false,
          isDefault: true, defaultReasoningEffort: 'high', supportedReasoningEfforts: [{ reasoningEffort: 'medium', description: '' }, { reasoningEffort: 'high', description: '' }],
        }],
        nextCursor: null,
      }
      return { data: [{ name: 'plan', mode: 'plan', model: 'gpt-5.6-sol', reasoning_effort: 'high' }] }
    })
    const catalog = new CodexSessionCatalog(rpc)

    expect(await catalog.listModels()).toEqual([expect.objectContaining({
      id: 'gpt-5.6-sol', label: 'GPT 5.6 Sol', defaultReasoningEffort: 'high', supportedReasoningEfforts: ['medium', 'high'],
    })])
    expect(await catalog.listCollaborationModes()).toEqual([
      { name: 'plan', mode: 'plan', model: 'gpt-5.6-sol', reasoningEffort: 'high' },
    ])
  })

  it('owns settings and goal RPC payloads', async () => {
    const rpc = rpcWith(() => ({}))
    const catalog = new CodexSessionCatalog(rpc)
    const collaborationMode = { mode: 'plan' as const, settings: { model: 'gpt-5.6-sol', reasoning_effort: 'high', developer_instructions: null } }

    await catalog.setCollaborationMode('thread-1', collaborationMode)
    await catalog.setGoal('thread-1', 'Ship it')
    await catalog.clearGoal('thread-1')

    expect(rpc.call).toHaveBeenNthCalledWith(1, 'thread/settings/update', { threadId: 'thread-1', collaborationMode }, undefined)
    expect(rpc.call).toHaveBeenNthCalledWith(2, 'thread/goal/set', { threadId: 'thread-1', objective: 'Ship it', status: 'active' }, undefined)
    expect(rpc.call).toHaveBeenNthCalledWith(3, 'thread/goal/clear', { threadId: 'thread-1' }, undefined)
  })
})
