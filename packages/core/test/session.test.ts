import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppServerDiagnostics, AppServerHost, RuntimeNotification, RuntimeNotificationListener, ServerRequestReply } from '../src/runtime/index.js'
import { buildTurnUserInput, codexTokenUsageFromPayload, CodexSessionManager, conversationToolFromItem, normalizeCodexNotification, normalizeThreadHistory } from '../src/session/index.js'
import { createConversationState, latestAssistantTextFromEvents, reduceConversationEvents, type CodexEvent } from '../src/conversation/index.js'

class FakeHost implements AppServerHost {
  readonly listeners = new Set<RuntimeNotificationListener>()
  readonly calls: Array<{ method: string; params: unknown }> = []
  readonly replies: Array<{ id: number; reply: ServerRequestReply }> = []
  nextTurn = 1
  initialized = 0

  async ensureInitialized(): Promise<void> { this.initialized += 1 }
  async call<T>(method: string, params?: unknown): Promise<T> {
    this.calls.push({ method, params })
    if (method === 'thread/start') return { thread: { id: 'thread-1' }, model: 'gpt', modelProvider: 'openai', cwd: '/repo', approvalPolicy: 'on-request', sandbox: { type: 'workspaceWrite', writableRoots: ['/repo'], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }, reasoningEffort: null } as T
    if (method === 'thread/resume') return { thread: { id: 'thread-1' } } as T
    if (method === 'thread/read') return { thread: { id: 'thread-1', turns: [] } } as T
    if (method === 'turn/start') return { turn: { id: `turn-${String(this.nextTurn++)}`, items: [], status: 'inProgress', error: null } } as T
    return {} as T
  }
  subscribe(listener: RuntimeNotificationListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  listPendingRequests() { return [] }
  async resolveServerRequest(id: number, reply: ServerRequestReply): Promise<void> { this.replies.push({ id, reply }) }
  diagnostics(): AppServerDiagnostics {
    return { status: 'running', initialized: true, pid: 1, startedAtIso: '', exitedAtIso: null, exitCode: null, exitSignal: null, pendingClientRequestCount: 0, pendingServerRequestCount: 0, sentClientRequestCount: 0, completedClientRequestCount: 0, failedClientRequestCount: 0, notificationCount: 0, serverRequestCount: 0, notificationCountsByMethod: {}, recentLogs: [] }
  }
  failureReport() { return null }
  async dispose(): Promise<void> {}
  emit(method: string, params: unknown): void {
    const value: RuntimeNotification = { method, params, receivedAtIso: '2026-01-01T00:00:00.000Z' }
    for (const listener of this.listeners) listener(value)
  }
}

describe('buildTurnUserInput', () => {
  it('puts Skills before text and local images', () => {
    expect(buildTurnUserInput({
      text: '  inspect this  ',
      skills: [{ name: ' docs ', path: ' /skills/docs/SKILL.md ' }, { name: '', path: '/ignored' }],
      localImages: [{ path: ' /tmp/screenshot.png ' }],
    })).toEqual([
      { type: 'skill', name: 'docs', path: '/skills/docs/SKILL.md' },
      { type: 'text', text: 'inspect this', text_elements: [] },
      { type: 'localImage', path: '/tmp/screenshot.png' },
    ])
  })
})

describe('normalizeCodexNotification', () => {
  const options = {
    eventId: ({ suffix }: { suffix: string }) => `event:${suffix}`,
  }

  it('normalizes live deltas, completed items and terminal turns through one event vocabulary', () => {
    expect(normalizeCodexNotification({
      method: 'item/agentMessage/delta',
      params: { thread_id: 'thread-1', turn_id: 'turn-1', item_id: 'agent-1', delta: 'Hello' },
      atIso: '2026-01-01T00:00:00.000Z',
    }, options)).toContainEqual(expect.objectContaining({
      id: 'event:assistant-delta',
      type: 'assistant.delta',
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId: 'agent-1',
      data: { text: 'Hello' },
    }))

    expect(normalizeCodexNotification({
      method: 'item/completed',
      params: { threadId: 'thread-1', turnId: 'turn-1', item: { id: 'agent-1', type: 'agentMessage', text: 'Hello world' } },
      atIso: '2026-01-01T00:00:01.000Z',
    }, options)).toEqual([expect.objectContaining({
      type: 'assistant.completed',
      itemId: 'agent-1',
      data: { text: 'Hello world' },
    })])

    expect(normalizeCodexNotification({
      method: 'turn/completed',
      params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed', completedAt: '2026-01-01T00:00:02.500Z', durationMs: 2_500, items: [{ id: 'agent-1', type: 'agentMessage', text: 'Final answer' }] } },
      atIso: '2026-01-01T00:00:02.000Z',
    }, options)).toEqual([
      expect.objectContaining({ type: 'assistant.completed', itemId: 'agent-1', atIso: '2026-01-01T00:00:02.500Z' }),
      expect.objectContaining({ type: 'turn.completed', turnId: 'turn-1', atIso: '2026-01-01T00:00:02.500Z', data: expect.objectContaining({ durationMs: 2_500 }) }),
    ])
  })

  it('selects the final assistant response from normalized item or terminal payloads', () => {
    const events = normalizeCodexNotification({
      method: 'turn/completed',
      params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed', items: [
        { id: 'agent-1', type: 'agentMessage', text: 'First' },
        { id: 'tool-1', type: 'commandExecution', status: 'completed' },
        { id: 'agent-2', type: 'agentMessage', text: 'Final' },
      ] } },
      atIso: '2026-01-01T00:00:02.000Z',
    }, options)
    expect(latestAssistantTextFromEvents(events)).toBe('Final')
  })

  it('normalizes token usage from both live and terminal payload shapes', () => {
    expect(codexTokenUsageFromPayload({ turn: { token_usage: { last: {
      input_tokens: 10, output_tokens: 5, total_tokens: 15,
    } } } })).toEqual({
      inputTokens: 10, outputTokens: 5, totalTokens: 15,
      contextWindow: null, autoCompactTokenLimit: null,
    })
  })

  it('keeps structured plan steps when replacing the live plan snapshot', () => {
    const [event] = normalizeCodexNotification({
      method: 'turn/plan/updated',
      params: {
        threadId: 'thread-1', turnId: 'turn-1', explanation: 'Implementation plan',
        plan: [{ step: 'Inspect', status: 'completed' }, { step: 'Refactor', status: 'inProgress' }],
      },
      atIso: '2026-01-01T00:00:00.000Z',
    }, options)
    expect(event).toMatchObject({
      type: 'plan.replaced',
      data: {
        text: 'Implementation plan\n\n1. [done] Inspect\n2. [doing] Refactor',
        explanation: 'Implementation plan',
        steps: [{ step: 'Inspect', status: 'completed' }, { step: 'Refactor', status: 'inProgress' }],
      },
    })
    expect(normalizeCodexNotification({
      method: 'turn/plan/updated',
      params: { threadId: 'thread-1', turnId: 'turn-1', plan: [] },
      atIso: '2026-01-01T00:00:01.000Z',
    }, options)).toContainEqual(expect.objectContaining({ type: 'turn.activity', data: { label: 'Writing plan', details: [] } }))
  })

  it('normalizes context usage, compaction and activity without product protocol readers', () => {
    expect(normalizeCodexNotification({
      method: 'thread/tokenUsage/updated',
      params: {
        thread_id: 'thread-1', turn_id: 'turn-1',
        token_usage: { last: { total_tokens: '1200', input_tokens: 900 }, model_context_window: 128_000 },
      },
      atIso: '2026-01-01T00:00:00.000Z',
    }, options)).toEqual([expect.objectContaining({
      type: 'thread.context.updated',
      data: {
        turnId: 'turn-1', usedTokens: 1200, inputTokens: 900, outputTokens: 0, totalTokens: 1200,
        contextWindow: 128_000, autoCompactTokenLimit: null,
      },
    })])
    expect(normalizeCodexNotification({
      method: 'thread/compacted', params: { threadId: 'thread-1' }, atIso: '2026-01-01T00:00:01.000Z',
    }, options)).toEqual([expect.objectContaining({ type: 'thread.compacted' })])
    expect(normalizeCodexNotification({
      method: 'item/started',
      params: { threadId: 'thread-1', turnId: 'turn-1', item: { id: 'reasoning-1', type: 'reasoning' } },
      atIso: '2026-01-01T00:00:02.000Z',
    }, options)).toContainEqual(expect.objectContaining({ type: 'turn.activity', data: { label: 'Thinking', details: [] } }))
  })

  it('does not invent events for global notifications or unknown methods unless requested', () => {
    expect(normalizeCodexNotification({ method: 'account/rateLimits/updated', params: {} }, options)).toEqual([])
    expect(normalizeCodexNotification({
      method: 'vendor/custom', params: { threadId: 'thread-1' }, atIso: '2026-01-01T00:00:00.000Z',
    }, options)).toEqual([])
    expect(normalizeCodexNotification({
      method: 'vendor/custom', params: { threadId: 'thread-1' }, atIso: '2026-01-01T00:00:00.000Z',
    }, { ...options, includeProviderExtensions: true })).toEqual([
      expect.objectContaining({ type: 'provider.extension', data: { method: 'vendor/custom', params: { threadId: 'thread-1' } } }),
    ])
  })
})

describe('conversationToolFromItem', () => {
  it('builds one rich tool view model for history and realtime items', () => {
    expect(conversationToolFromItem({
      type: 'commandExecution', command: 'pnpm test', cwd: '/repo', status: 'completed',
      exitCode: 0, durationMs: 1_500, aggregatedOutput: 'all green',
    })).toEqual({
      kind: 'command', title: 'Command execution', status: 'completed', summary: 'pnpm test',
      details: ['cwd: /repo', 'status: completed', 'exit: 0', 'duration: 1.5s'],
      output: 'all green', outputLabel: 'Output',
    })
    expect(conversationToolFromItem({
      type: 'fileChange', status: { type: 'completed' }, changes: [{
        path: 'src/old.ts', kind: { type: 'update', move_path: 'src/new.ts' }, diff: '-old\n+new',
      }],
    })).toMatchObject({
      kind: 'fileChange', status: 'completed', summary: '1 file changed',
      details: ['status: completed', 'update: src/old.ts -> src/new.ts'], outputLabel: 'Diff',
    })
    expect(conversationToolFromItem({
      type: 'dynamicToolCall', namespace: 'browser', tool: 'open', status: 'completed', success: true,
      contentItems: [{ type: 'text', text: 'opened' }],
    })).toMatchObject({ kind: 'dynamicTool', status: 'completed', summary: 'browser.open', outputLabel: 'Result' })
  })
})

const context = { thread: { cwd: '/repo', experimentalRawEvents: false } }

afterEach(() => { vi.useRealTimers() })

describe('CodexSessionManager', () => {
  it('sends current permission-profile fields without legacy readOnlyAccess', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', {
      thread: {
        cwd: '/repo',
        permissions: 'codywork-write',
        runtimeWorkspaceRoots: ['/repo'],
        config: {
          permissions: {
            'codywork-write': {
              filesystem: { ':minimal': 'read', '/repo': 'write' },
            },
          },
        },
      },
    })
    const handle = await manager.send('conversation-1', {
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
      permissions: 'codywork-write',
      runtimeWorkspaceRoots: ['/repo'],
    })
    expect(host.calls[0]).toEqual(expect.objectContaining({
      method: 'thread/start',
      params: expect.objectContaining({ permissions: 'codywork-write', runtimeWorkspaceRoots: ['/repo'] }),
    }))
    expect(host.calls[1]).toEqual({
      method: 'turn/start',
      params: {
        threadId: 'thread-1',
        input: [{ type: 'text', text: 'hello', text_elements: [] }],
        permissions: 'codywork-write',
        runtimeWorkspaceRoots: ['/repo'],
      },
    })
    expect(JSON.stringify(host.calls)).not.toContain('readOnlyAccess')
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed' } })
    await manager.dispose()
  })

  it('classifies reconnect errors as one retrying turn and emits one terminal event', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })
    host.emit('turn/started', { threadId: 'thread-1', turn: { id: handle.turnId } })
    host.emit('warning', { threadId: 'thread-1', turnId: handle.turnId, message: 'Response stream interrupted; reconnecting.' })
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      host.emit('error', { threadId: 'thread-1', turnId: handle.turnId, willRetry: true, error: { message: `Reconnecting... ${String(attempt)}/5` } })
    }
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed', items: [], error: null } })
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed', items: [], error: null } })
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.completed' })
    expect(events.filter((event) => event.type === 'turn.retrying')).toHaveLength(6)
    expect(events.find((event) => event.type === 'turn.retrying')?.data.error).toContain('reconnecting')
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(0)
    expect(events.filter((event) => event.type === 'turn.completed')).toHaveLength(1)
    const state = reduceConversationEvents(createConversationState('thread-1'), events)
    expect(state.turns[handle.turnId]).toMatchObject({ lifecycle: 'completed' })
    await manager.dispose()
  })

  it('routes approvals by native thread and leaves policy decisions injectable', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, policy: { evaluate: () => ({ action: 'deny', reason: 'outside worktree' }) } })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    host.emit('server/request', { id: 42, method: 'item/fileChange/requestApproval', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1', grantRoot: '/service' }, receivedAtIso: '2026-01-01T00:00:00.000Z' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(host.replies).toEqual([{ id: 42, reply: { error: { code: -32000, message: 'outside worktree' } } }])
    expect(events).toContainEqual(expect.objectContaining({ type: 'approval.resolved', threadId: 'thread-1', data: expect.objectContaining({ automatic: true, decision: 'decline' }) }))
    await manager.dispose()
  })

  it('resumes the native thread before the next operation after a host disconnect', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    host.emit('runtime/disconnected', { error: 'process exited' })
    await manager.read('conversation-1')
    expect(host.calls.map(call => call.method)).toEqual(['thread/start', 'thread/resume', 'thread/read'])
    await manager.dispose()
  })

  it('does not reuse a stale terminal result when a restarted provider reuses a turn id', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const first = await manager.send('conversation-1', { input: [{ type: 'text', text: 'first', text_elements: [] }] })
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: first.turnId, status: 'completed' } })
    await manager.waitForTurn(first)
    host.nextTurn = 1
    await manager.resume({ id: 'conversation-1', threadId: 'thread-1' }, context)
    const second = await manager.send('conversation-1', { input: [{ type: 'text', text: 'second', text_elements: [] }] })
    let settled = false
    void manager.waitForTurn(second).then(() => { settled = true })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(second.turnId).toBe(first.turnId)
    expect(settled).toBe(false)
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: second.turnId, status: 'completed' } })
    await expect(manager.waitForTurn(second)).resolves.toMatchObject({ type: 'turn.completed' })
    await manager.dispose()
  })

  it('keeps a long turn alive while events continue to make progress', async () => {
    vi.useFakeTimers()
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, turnInactivityTimeoutMs: 1_000 })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'long task', text_elements: [] }] })
    const terminal = manager.waitForTurn(handle)

    for (let minute = 0; minute < 12; minute += 1) {
      await vi.advanceTimersByTimeAsync(900)
      host.emit('item/reasoning/textDelta', { threadId: 'thread-1', turnId: handle.turnId, delta: `progress-${String(minute)}` })
    }
    expect(events.some((event) => event.type === 'turn.failed')).toBe(false)

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed' } })
    await expect(terminal).resolves.toMatchObject({ type: 'turn.completed' })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(events.filter((event) => event.type === 'turn.completed')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(0)
    await manager.dispose()
  })

  it('emits one authoritative terminal failure after true turn inactivity', async () => {
    vi.useFakeTimers()
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, turnInactivityTimeoutMs: 1_000 })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'silent task', text_elements: [] }] })
    const terminal = manager.waitForTurn(handle)

    await vi.advanceTimersByTimeAsync(1_001)
    await expect(terminal).resolves.toMatchObject({
      type: 'turn.failed',
      data: expect.objectContaining({ cause: 'inactivity_timeout', error: expect.stringContaining('had no progress') }),
    })
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toEqual([
      { method: 'turn/interrupt', params: handle },
    ])
    expect(await manager.interrupt('conversation-1')).toBe(false)

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed' } })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(events.filter((event) => event.type === 'turn.failed' || event.type === 'turn.completed')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(1)
    await manager.dispose()
  })

  it('normalizes an interrupted native turn without reporting a failure', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'stop me', text_elements: [] }] })

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'interrupted' } })

    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.interrupted' })
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(0)
    await manager.dispose()
  })
})

describe('normalizeThreadHistory', () => {
  it('materializes user, assistant, command and one terminal event from native history', () => {
    const events = normalizeThreadHistory({ thread: { id: 'thread-1', turns: [{
      id: 'turn-1', status: 'completed', error: null, items: [
        { type: 'userMessage', id: 'u1', content: [{ type: 'text', text: 'inspect', text_elements: [] }] },
        { type: 'commandExecution', id: 'c1', command: 'git status', cwd: '/repo', status: 'completed', aggregatedOutput: 'clean' },
        { type: 'agentMessage', id: 'a1', text: 'Done' },
      ],
    }] } })
    expect(events.map((event) => event.type)).toEqual(['turn.started', 'user.completed', 'tool.completed', 'assistant.completed', 'turn.completed'])
    const state = reduceConversationEvents(createConversationState('thread-1'), events)
    expect(state.messages.map((message) => message.text)).toEqual(['inspect', 'Done'])
    expect(state.timeline).toEqual([expect.objectContaining({ kind: 'tool', tool: expect.objectContaining({ summary: 'git status', output: 'clean' }) })])
  })

  it('uses native turn timestamps and marks missing duration as unknown', () => {
    const known = normalizeThreadHistory({ thread: { id: 'thread-1', turns: [{
      id: 'turn-known', status: 'completed', items: [], startedAt: 1_700_000_000, completedAt: 1_700_000_002,
    }] } })
    expect(known[0]?.atIso).toBe('2023-11-14T22:13:20.000Z')
    expect(known.at(-1)).toMatchObject({ atIso: '2023-11-14T22:13:22.000Z', data: { durationKnown: true } })

    const unknown = normalizeThreadHistory({ thread: { id: 'thread-1', turns: [{ id: 'turn-unknown', status: 'completed', items: [] }] } })
    expect(unknown.at(-1)).toMatchObject({ data: { durationKnown: false } })
  })

  it('does not invent a terminal event for an in-progress native turn', () => {
    const events = normalizeThreadHistory({ thread: { id: 'thread-1', turns: [{
      id: 'turn-running', status: 'inProgress', items: [
        { type: 'userMessage', id: 'u1', content: [{ type: 'text', text: 'still running', text_elements: [] }] },
      ],
    }] } })
    expect(events.map((event) => event.type)).toEqual(['turn.started', 'user.completed'])
  })

  it('preserves an interrupted native history turn without inventing a failure', () => {
    const events = normalizeThreadHistory({ thread: { id: 'thread-1', turns: [{
      id: 'turn-stopped', status: 'interrupted', items: [], startedAt: 1_700_000_000, completedAt: 1_700_000_001,
    }] } })

    expect(events.at(-1)).toMatchObject({ type: 'turn.interrupted', data: { status: 'interrupted', history: true } })
    expect(events.some((event) => event.type === 'turn.failed')).toBe(false)
  })
})
