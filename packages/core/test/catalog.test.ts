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

  it('normalizes durable snapshots without leaking generated thread records', async () => {
    const rpc = rpcWith(() => ({ thread: {
      id: 'thread-1', preview: ' Review ', name: 'Code review', cwd: '/repo', createdAt: 10, updatedAt: 20,
      extra: null, sessionId: 'session-1', forkedFromId: null, parentThreadId: null, ephemeral: false,
      section: null, sectionEnteredAt: null, historyMode: 'paginated', recencyAt: 20, status: { type: 'idle' },
      source: 'appServer', canAcceptDirectInput: false, path: null, modelProvider: 'openai', cliVersion: 'test', gitInfo: null,
      threadSource: null, agentNickname: null, agentRole: null,
      turns: [{ id: 'turn-1', status: 'completed', error: null, startedAt: 11, completedAt: 12, durationMs: 1_000, itemsView: 'full', items: [
        { id: 'assistant-1', type: 'agentMessage', text: 'done' },
      ] }],
    } }))
    const catalog = new CodexSessionCatalog(rpc)

    await expect(catalog.readThreadSnapshot(' thread-1 ')).resolves.toMatchObject({
      summary: { threadId: 'thread-1', name: 'Code review', updatedAtIso: '1970-01-01T00:00:20.000Z' },
      turns: [{ turnId: 'turn-1', status: 'completed', assistantText: 'done', durationMs: 1_000 }],
    })
  })

  it('owns skill discovery, normalization, dedupe and enablement', async () => {
    const rpc = rpcWith((method) => method === 'skills/list' ? { data: [{ cwd: '/repo', skills: [
      { name: ' docs ', path: ' /skills/docs ', description: 'long', shortDescription: 'short', interface: { displayName: 'Docs', shortDescription: 'Use docs', iconSmallUrl: null, iconLargeUrl: null }, scope: 'repo', enabled: true },
      { name: ' docs ', path: ' /skills/docs ', description: 'duplicate', scope: 'repo', enabled: true },
    ], errors: [{ path: ' /bad ', message: ' invalid ' }] }] } : {})
    const catalog = new CodexSessionCatalog(rpc)

    await expect(catalog.listSkillCatalog([' /repo ', '/repo'])).resolves.toEqual([{
      cwd: '/repo',
      skills: [
        { name: 'docs', path: '/skills/docs', displayName: 'Docs', description: 'Use docs', scope: 'repo', enabled: true },
        { name: 'docs', path: '/skills/docs', displayName: 'docs', description: 'duplicate', scope: 'repo', enabled: true },
      ],
      errors: [{ path: '/bad', message: 'invalid' }],
    }])
    await expect(catalog.listSkills(['/repo'])).resolves.toEqual([
      { name: 'docs', path: '/skills/docs', displayName: 'docs', description: 'duplicate', scope: 'repo', enabled: true },
    ])
    await catalog.setSkillEnabled(' /skills/docs ', false)
    expect(rpc.call).toHaveBeenLastCalledWith('skills/config/write', { path: '/skills/docs', enabled: false }, undefined)
  })
})
