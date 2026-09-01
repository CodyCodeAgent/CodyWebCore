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
  failTurnStart = ''
  failTurnInterrupt = ''
  threadReadTurns: Array<Record<string, unknown>> = []
  threadReadTurnSequence: Array<Array<Record<string, unknown>>> = []

  async ensureInitialized(): Promise<void> { this.initialized += 1 }
  async call<T>(method: string, params?: unknown): Promise<T> {
    this.calls.push({ method, params })
    if (method === 'thread/start') return { thread: { id: 'thread-1' }, model: 'gpt', modelProvider: 'openai', cwd: '/repo', approvalPolicy: 'on-request', sandbox: { type: 'workspaceWrite', writableRoots: ['/repo'], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }, reasoningEffort: null } as T
    if (method === 'thread/fork') return { thread: { id: 'thread-fork' } } as T
    if (method === 'thread/list') return {
      data: [{
        id: 'thread-1', preview: 'Existing thread', name: 'Existing thread', cwd: '/repo', createdAt: 1,
        updatedAt: 2, source: 'appServer', canAcceptDirectInput: true, sessionId: 'session-1',
        parentThreadId: null, forkedFromId: null, status: { type: 'idle' }, ephemeral: false,
      }],
      nextCursor: null,
    } as T
    if (method === 'skills/list') return { data: [{
      cwd: '/repo',
      skills: [{ name: 'docs', path: '/repo/.agents/docs/SKILL.md', description: 'Read the docs', scope: 'repo', enabled: true }],
      errors: [],
    }] } as T
    if (method === 'thread/resume') return { thread: { id: 'thread-1' } } as T
    if (method === 'thread/read') return { thread: {
      id: 'thread-1', extra: null, sessionId: 'session-1', forkedFromId: null, parentThreadId: null,
      preview: '', ephemeral: false, section: null, sectionEnteredAt: null, historyMode: 'paginated',
      modelProvider: 'openai', createdAt: 0, updatedAt: 0, recencyAt: null, status: { type: 'idle' },
      path: null, cwd: '/repo', cliVersion: 'test', source: 'appServer', canAcceptDirectInput: true,
      threadSource: null, agentNickname: null, agentRole: null, gitInfo: null, name: null,
      turns: this.threadReadTurnSequence.shift() ?? this.threadReadTurns,
    } } as T
    if (method === 'turn/start') {
      if (this.failTurnStart) throw new Error(this.failTurnStart)
      return { turn: { id: `turn-${String(this.nextTurn++)}`, items: [], status: 'inProgress', error: null } } as T
    }
    if (method === 'turn/interrupt' && this.failTurnInterrupt) throw new Error(this.failTurnInterrupt)
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

  it('normalizes an exhausted upstream error as operational disconnect, never a native terminal', () => {
    expect(normalizeCodexNotification({
      method: 'error',
      params: {
        threadId: 'thread-1',
        turnId: 'turn-1',
        error: {
          message: 'request timed out',
          codexErrorInfo: { responseTooManyFailedAttempts: { httpStatusCode: null } },
        },
      },
      atIso: '2026-01-01T00:00:00.000Z',
    }, options)).toEqual([expect.objectContaining({
      type: 'turn.disconnected',
      data: expect.objectContaining({ cause: 'upstream_response_stream_unrecoverable', error: expect.stringContaining('未自动重发') }),
    })])
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
  it('owns native thread creation, catalog reads and thread mutations behind one manager', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })

    await expect(manager.startThread(context)).resolves.toEqual({ id: 'thread-1', threadId: 'thread-1' })
    await expect(manager.listThreads()).resolves.toEqual([
      expect.objectContaining({ threadId: 'thread-1', name: 'Existing thread' }),
    ])
    await expect(manager.listSkills(['/repo'])).resolves.toEqual([
      expect.objectContaining({ name: 'docs', path: '/repo/.agents/docs/SKILL.md' }),
    ])
    await expect(manager.listSkillCatalog(['/repo'])).resolves.toEqual([
      expect.objectContaining({ cwd: '/repo', skills: [expect.objectContaining({ name: 'docs' })] }),
    ])
    await manager.setSkillEnabled(' /repo/.agents/docs/SKILL.md ', false)
    await manager.renameThread(' thread-1 ', ' Renamed ')
    await expect(manager.forkThread(' thread-1 ')).resolves.toBe('thread-fork')
    await manager.compactThread(' thread-1 ')
    await manager.archiveThread(' thread-1 ')

    expect(host.calls.map(({ method }) => method)).toEqual([
      'thread/start', 'thread/list', 'skills/list', 'skills/list', 'skills/config/write',
      'thread/name/set', 'thread/fork', 'thread/compact/start', 'thread/archive',
    ])
    expect(manager.snapshot('thread-1')).toMatchObject({ bindingId: 'thread-1', threadId: 'thread-1', attached: true })
    await manager.dispose()
  })

  it('accepts a client command immediately and binds it to the native turn without inventing a turn id', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    expect(manager.snapshot('conversation-1')).toMatchObject({
      bindingId: 'conversation-1', threadId: 'thread-1', activeTurnId: '',
      pendingRequestCount: 0, attached: true, runtimeAvailable: true,
    })
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))

    const submission = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'inspect branch', text_elements: [] }] },
      'queue',
      'client-command-1',
    )

    expect(submission.clientCommandId).toBe('client-command-1')
    expect(events).toContainEqual(expect.objectContaining({ type: 'command.queued', itemId: 'client-command-1' }))
    expect(events.find((event) => event.type === 'command.queued')).not.toHaveProperty('turnId')
    const handle = await submission.started
    expect(manager.snapshot('conversation-1')?.activeTurnId).toBe(handle.turnId)
    expect(handle.turnId).toBe('turn-1')
    expect(events).toContainEqual(expect.objectContaining({ type: 'command.bound', itemId: 'client-command-1', turnId: 'turn-1' }))

    host.emit('turn/completed', {
      threadId: 'thread-1',
      turn: {
        id: handle.turnId,
        status: 'completed',
        items: [{ id: 'agent-1', type: 'agentMessage', text: 'Core owns the final answer.' }],
      },
    })
    await expect(submission.completed).resolves.toMatchObject({
      handle,
      terminalEvent: { type: 'turn.completed' },
      assistantText: 'Core owns the final answer.',
      events: expect.arrayContaining([expect.objectContaining({ type: 'assistant.completed', data: expect.objectContaining({ text: 'Core owns the final answer.' }) })]),
    })
    expect(manager.snapshot('conversation-1')?.activeTurnId).toBe('')
    await manager.dispose()
  })

  it('exposes the active owner Turn to a newly attached browser projection', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const submission = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'long running task', text_elements: [] }] },
      'queue',
      'client-command-1',
    )
    const handle = await submission.started

    expect(manager.listAttachmentEvents('conversation-1')).toEqual([
      expect.objectContaining({ type: 'command.queued', itemId: 'client-command-1' }),
      expect.objectContaining({ type: 'command.bound', itemId: 'client-command-1', turnId: handle.turnId }),
      expect.objectContaining({
        type: 'turn.started', threadId: 'thread-1', turnId: handle.turnId,
        data: expect.objectContaining({ attachment: true }),
      }),
    ])

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed' } })
    await submission.completed
    expect(manager.listAttachmentEvents('conversation-1')).toEqual([])
    await manager.dispose()
  })

  it('retains an operational terminal correction in every owner attachment snapshot', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, turnStopReconcileDelayMs: 0 })
    await manager.create('conversation-1', context)
    const submission = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'retryable task', text_elements: [] }] },
      'queue',
      'client-command-1',
    )
    const handle = await submission.started
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      host.emit('error', {
        threadId: 'thread-1', turnId: handle.turnId,
        error: { message: `Reconnecting... ${String(attempt)}/5`, codexErrorInfo: { responseStreamDisconnected: {} } },
        willRetry: true,
      })
    }
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'interrupted' } })
    await expect(submission.completed).resolves.toMatchObject({ terminalEvent: { type: 'turn.failed' } })

    const corrections = manager.listAttachmentEvents('conversation-1')
      .filter(event => event.data.terminalCorrection === true)
    expect(corrections).toEqual([expect.objectContaining({
      type: 'turn.failed', turnId: handle.turnId,
      data: expect.objectContaining({ retainOutboxForRetry: true, terminalCorrection: true }),
    })])
    expect(corrections[0]?.id).toContain('owner:terminal-correction')
    await manager.dispose()
  })

  it('replays one active command followed by queued commands in owner order to every tab', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const first = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'first command', text_elements: [] }] },
      'queue',
      'command-a',
    )
    const firstHandle = await first.started
    const second = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'second command', text_elements: [] }] },
      'queue',
      'command-b',
    )
    await Promise.resolve()

    const attachment = manager.listAttachmentEvents('conversation-1')
    expect(attachment.map((event) => [event.type, event.itemId ?? '', event.turnId ?? ''])).toEqual([
      ['command.queued', 'command-a', ''],
      ['command.bound', 'command-a', firstHandle.turnId],
      ['command.queued', 'command-b', ''],
      ['turn.started', '', firstHandle.turnId],
    ])
    expect(host.calls.filter((call) => call.method === 'turn/start')).toHaveLength(1)

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: firstHandle.turnId, status: 'completed' } })
    const secondHandle = await second.started
    expect(manager.listAttachmentEvents('conversation-1')).toEqual([
      expect.objectContaining({ type: 'command.queued', itemId: 'command-b' }),
      expect.objectContaining({ type: 'command.bound', itemId: 'command-b', turnId: secondHandle.turnId }),
      expect.objectContaining({ type: 'turn.started', turnId: secondHandle.turnId }),
    ])
    await manager.dispose()
  })

  it('makes a newly admitted command visible to an attachment triggered by its queued event', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    let attachment: CodexEvent[] = []
    manager.subscribe((event) => {
      if (event.type === 'command.queued') attachment = manager.listAttachmentEvents('conversation-1')
    })

    manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'race-free command', text_elements: [] }] },
      'queue',
      'command-race',
    )

    expect(attachment).toContainEqual(expect.objectContaining({ type: 'command.queued', itemId: 'command-race' }))
    await manager.dispose()
  })

  it('treats repeated client command ids as one idempotent submission', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const input = { input: [{ type: 'text' as const, text: 'run once', text_elements: [] }] }

    const first = manager.submit('conversation-1', input, 'queue', 'same-command')
    const second = manager.submit('conversation-1', input, 'queue', 'same-command')

    expect(second).toBe(first)
    await first.started
    expect(host.calls.filter(call => call.method === 'turn/start')).toHaveLength(1)
    expect(() => manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'different', text_elements: [] }],
    }, 'queue', 'same-command')).toThrow('already submitted with different content')
    await manager.dispose()
  })

  it('restores the queue barrier for an active Turn discovered during resume', async () => {
    const host = new FakeHost()
    host.threadReadTurns = [{ id: 'turn-active', status: 'inProgress', items: [], error: null }]
    const manager = new CodexSessionManager({ host })
    await manager.resume({ id: 'conversation-1', threadId: 'thread-1' }, context)

    const queued = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'wait for the active turn', text_elements: [] }],
    }, 'queue', 'queued-after-resume')
    await Promise.resolve()
    expect(host.calls.filter(call => call.method === 'turn/start')).toHaveLength(0)

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-active', status: 'completed' } })
    await expect(queued.started).resolves.toMatchObject({ threadId: 'thread-1', turnId: 'turn-1' })
    expect(host.calls.filter(call => call.method === 'turn/start')).toHaveLength(1)
    await manager.dispose()
  })

  it('preserves one queue chain when the same binding is resumed by another client', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const first = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'first', text_elements: [] }],
    }, 'queue', 'first')
    const firstHandle = await first.started

    host.threadReadTurns = [{ id: firstHandle.turnId, status: 'inProgress', items: [], error: null }]
    await manager.resume({ id: 'conversation-1', threadId: 'thread-1' }, context)
    const second = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'second', text_elements: [] }],
    }, 'queue', 'second')
    await Promise.resolve()
    expect(host.calls.filter(call => call.method === 'turn/start')).toHaveLength(1)

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: firstHandle.turnId, status: 'completed' } })
    await second.started
    expect(host.calls.filter(call => call.method === 'turn/start')).toHaveLength(2)
    await manager.dispose()
  })

  it('scopes command idempotency to the native thread after a binding moves', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const first = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'same', text_elements: [] }],
    }, 'queue', 'same-command')
    const firstHandle = await first.started
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: firstHandle.turnId, status: 'completed' } })
    await first.completed

    host.threadReadTurns = []
    await manager.resume({ id: 'conversation-1', threadId: 'thread-2' }, context)
    const second = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'same', text_elements: [] }],
    }, 'queue', 'same-command')
    expect(second).not.toBe(first)
    await second.started
    expect(host.calls.filter(call => call.method === 'turn/start')).toHaveLength(2)
    await manager.dispose()
  })

  it('fails the outbox command without fabricating a terminal turn when turn/start is rejected', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    host.failTurnStart = 'turn start rejected'

    const submission = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'inspect branch', text_elements: [] }] },
      'queue',
      'client-command-2',
    )
    await expect(submission.started).rejects.toThrow('turn start rejected')
    expect(events).toContainEqual(expect.objectContaining({ type: 'command.failed', itemId: 'client-command-2' }))
    expect(events.some((event) => event.type === 'turn.failed' || event.type === 'turn.interrupted' || event.type === 'turn.completed')).toBe(false)
    await manager.dispose()
  })

  it('steers the active native turn immediately instead of waiting for its terminal event', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const first = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'start work', text_elements: [] }] },
      'queue',
      'client-command-1',
    )
    const handle = await first.started

    const steering = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'also check tests', text_elements: [] }] },
      'steer',
      'client-command-2',
    )
    await expect(steering.started).resolves.toEqual(handle)
    expect(host.calls).toContainEqual({
      method: 'turn/steer',
      params: {
        threadId: 'thread-1',
        expectedTurnId: handle.turnId,
        input: [{ type: 'text', text: 'also check tests', text_elements: [] }],
      },
    })

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed' } })
    await expect(first.completed).resolves.toMatchObject({ terminalEvent: { type: 'turn.completed' } })
    await expect(steering.completed).resolves.toMatchObject({ terminalEvent: { type: 'turn.completed' } })
    await manager.dispose()
  })

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
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      host.emit('error', {
        threadId: 'thread-1',
        turnId: handle.turnId,
        ...(attempt % 2 === 0 ? { willRetry: true } : {}),
        error: { message: `Reconnecting... ${String(attempt)}/5` },
      })
    }
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed', items: [], error: null } })
    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed', items: [], error: null } })
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.completed' })
    expect(events.filter((event) => event.type === 'turn.retrying')).toHaveLength(5)
    expect(events.find((event) => event.type === 'turn.retrying')?.data.error).toContain('reconnecting')
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(0)
    expect(events.filter((event) => event.type === 'turn.completed')).toHaveLength(1)
    const state = reduceConversationEvents(createConversationState('thread-1'), events)
    expect(state.turns[handle.turnId]).toMatchObject({ lifecycle: 'completed' })
    await manager.dispose()
  })

  it('keeps ordinary turn warnings out of the upstream retry lifecycle', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })

    host.emit('warning', { threadId: 'thread-1', turnId: handle.turnId, message: 'The requested model setting was adjusted.' })

    expect(events.filter((event) => event.type === 'turn.retrying')).toEqual([])
    expect(events).toContainEqual(expect.objectContaining({
      type: 'provider.extension',
      data: expect.objectContaining({ method: 'warning' }),
    }))
    await manager.dispose()
  })

  it('waits for an authoritative terminal notification after a turn-scoped error', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })
    host.emit('turn/started', { threadId: 'thread-1', turn: { id: handle.turnId } })
    host.emit('error', {
      threadId: 'thread-1',
      turnId: handle.turnId,
      error: { message: 'Reconnecting... 2/5' },
    })
    expect(events.at(-1)).toMatchObject({ type: 'turn.retrying', turnId: handle.turnId })
    expect(events.some((event) => event.type === 'turn.failed')).toBe(false)
    host.emit('turn/failed', {
      threadId: 'thread-1',
      turnId: handle.turnId,
      error: { message: 'request timed out' },
    })
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({
      type: 'turn.failed',
      data: expect.objectContaining({ error: 'request timed out' }),
    })
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(1)
    await manager.dispose()
  })

  it('fails an upstream response stream when App Server explicitly will not retry', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })
    host.threadReadTurns = [{ id: handle.turnId, status: 'failed', items: [], error: { message: 'response stream disconnected' } }]

    host.emit('error', {
      threadId: 'thread-1',
      turnId: handle.turnId,
      willRetry: false,
      error: { message: 'response stream disconnected' },
    })

    expect(events).toContainEqual(expect.objectContaining({
      type: 'turn.disconnected',
      data: expect.objectContaining({ cause: 'upstream_response_stream_unrecoverable', willRetry: false }),
    }))
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.failed' })
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toEqual([
      { method: 'turn/interrupt', params: handle },
    ])
    // A late native terminal belongs to the same Turn and cannot create a
    // second receipt or replace the owner's already-published outcome.
    host.emit('turn/failed', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'response stream disconnected' } })
    expect(events.some((event) => event.type === 'turn.retrying')).toBe(false)
    expect(events.filter((event) => event.type === 'turn.disconnected')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(1)
    await manager.dispose()
  })

  it('coalesces duplicate exhausted errors and preserves their failure cause after native stop settlement', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, turnStopReconcileAttempts: 2, turnStopReconcileDelayMs: 0 })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const first = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'first', text_elements: [] }],
    }, 'queue', 'first')
    const firstHandle = await first.started
    const second = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'second', text_elements: [] }],
    }, 'queue', 'second')
    host.threadReadTurnSequence = [
      [{ id: firstHandle.turnId, status: 'inProgress', items: [], error: null }],
      [{ id: firstHandle.turnId, status: 'interrupted', items: [], error: null }],
    ]

    const exhausted = {
      threadId: 'thread-1', turnId: firstHandle.turnId, willRetry: false,
      error: { message: 'response stream disconnected' },
    }
    host.emit('error', exhausted)
    host.emit('error', exhausted)

    expect(host.calls.filter((call) => call.method === 'turn/start')).toHaveLength(1)
    const secondHandle = await second.started
    await expect(first.completed).resolves.toMatchObject({
      terminalEvent: {
        type: 'turn.failed',
        data: expect.objectContaining({
          cause: 'upstream_response_stream_unrecoverable',
          retainOutboxForRetry: true,
          interruptedAfterOperationalFailure: true,
        }),
      },
    })
    expect(secondHandle.turnId).not.toBe(firstHandle.turnId)
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toHaveLength(1)
    expect(host.calls.filter((call) => call.method === 'turn/start')).toHaveLength(2)
    expect(events.filter((event) => event.type === 'turn.disconnected')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'turn.interrupted')).toHaveLength(0)

    host.emit('error', exhausted)
    expect(events.filter((event) => event.type === 'turn.disconnected')).toHaveLength(1)
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toHaveLength(1)
    await manager.dispose()
  })

  it('uses native read terminal authority even when the interrupt RPC fails', async () => {
    const host = new FakeHost()
    host.failTurnInterrupt = 'interrupt transport failed'
    const manager = new CodexSessionManager({ host, turnStopReconcileAttempts: 1, turnStopReconcileDelayMs: 0 })
    await manager.create('conversation-1', context)
    const submission = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'stop through reconciliation', text_elements: [] }],
    })
    const handle = await submission.started
    host.threadReadTurns = [{ id: handle.turnId, status: 'failed', items: [], error: { message: 'native failure' } }]

    await expect(manager.interrupt('conversation-1')).resolves.toBe(true)
    await expect(submission.completed).resolves.toMatchObject({ terminalEvent: { type: 'turn.failed' } })
    expect(manager.snapshot('conversation-1')?.quarantinedReason).toBe('')
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toHaveLength(1)
    await manager.dispose()
  })

  it('coalesces repeated explicit interrupts for the same native Turn', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, turnStopReconcileAttempts: 1, turnStopReconcileDelayMs: 0 })
    await manager.create('conversation-1', context)
    const submission = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'stop once', text_elements: [] }],
    })
    const handle = await submission.started
    host.threadReadTurns = [{ id: handle.turnId, status: 'interrupted', items: [], error: null }]

    await expect(Promise.all([
      manager.interrupt('conversation-1'),
      manager.interrupt('conversation-1'),
    ])).resolves.toEqual([true, true])
    await expect(submission.completed).resolves.toMatchObject({ terminalEvent: { type: 'turn.interrupted' } })
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toHaveLength(1)
    await manager.dispose()
  })

  it('fails a legacy upstream stream when its bounded reconnect attempts are exhausted', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })

    host.emit('error', {
      threadId: 'thread-1',
      turnId: handle.turnId,
      error: { message: 'Reconnecting... 5/5' },
    })

    host.emit('turn/failed', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'retry exhausted' } })
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.failed' })
    await manager.dispose()
  })

  it('honors a bounded reconnect count even when legacy App Server marks it retryable', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })

    host.emit('error', {
      threadId: 'thread-1',
      turnId: handle.turnId,
      willRetry: true,
      error: { message: 'Reconnecting... 5/5' },
    })

    host.emit('turn/failed', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'retry exhausted' } })
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.failed' })
    await manager.dispose()
  })

  it('bounds legacy upstream retries even when no retry metadata is supplied', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, maxUpstreamRetryAttempts: 3 })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })

    host.emit('error', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'response stream disconnected' } })
    host.emit('error', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'response stream disconnected' } })
    host.emit('error', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'response stream disconnected' } })

    host.emit('turn/failed', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'retry exhausted' } })
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.failed' })
    expect(events.filter((event) => event.type === 'turn.retrying')).toHaveLength(2)
    expect(events.filter((event) => event.type === 'turn.disconnected')).toHaveLength(1)
    await manager.dispose()
  })

  it('bounds retryable stream errors that never report a reconnect counter', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, maxUpstreamRetryAttempts: 3 })
    await manager.create('conversation-1', context)
    const events: CodexEvent[] = []
    manager.subscribe((event) => events.push(event))
    const handle = await manager.send('conversation-1', { input: [{ type: 'text', text: 'hello', text_elements: [] }] })

    for (let attempt = 0; attempt < 3; attempt += 1) {
      host.emit('error', {
        threadId: 'thread-1',
        turnId: handle.turnId,
        willRetry: true,
        error: { message: 'Falling back from WebSockets to HTTPS transport. request timed out' },
      })
    }

    host.emit('turn/failed', { threadId: 'thread-1', turnId: handle.turnId, error: { message: 'retry exhausted' } })
    await expect(manager.waitForTurn(handle)).resolves.toMatchObject({ type: 'turn.failed' })
    expect(events.filter((event) => event.type === 'turn.retrying')).toHaveLength(2)
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

  it('replays unresolved approval events after a product view reconnects', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    host.emit('server/request', { id: 43, method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1', command: 'pnpm test' }, receivedAtIso: '2026-01-01T00:00:00.000Z' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(manager.listPendingEvents('conversation-1')).toEqual([
      expect.objectContaining({
        type: 'approval.requested',
        threadId: 'thread-1',
        data: expect.objectContaining({ requestId: '43', approvalId: '43' }),
      }),
    ])

    await manager.respondApproval('conversation-1', '43', 'decline')
    await manager.respondApproval('conversation-1', '43', 'decline')
    expect(manager.listPendingEvents('conversation-1')).toEqual([])
    expect(host.replies.filter((reply) => reply.id === 43)).toHaveLength(1)
    await manager.dispose()
  })

  it('routes generic product replies through the Core pending-request owner', async () => {
    const host = new FakeHost()
    const onResolved = vi.fn()
    const manager = new CodexSessionManager({ host, policy: { evaluate: () => ({ action: 'ask' }), onResolved } })
    await manager.create('conversation-1', context)
    host.emit('server/request', { id: 431, method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1', command: 'pnpm test' }, receivedAtIso: '2026-01-01T00:00:00.000Z' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(manager.isServerRequestPending('431')).toBe(true)
    await manager.respondServerRequest('431', { result: { decision: 'acceptForSession' } })

    expect(manager.isServerRequestPending('431')).toBe(false)
    expect(host.replies).toContainEqual({ id: 431, reply: { result: { decision: 'acceptForSession' } } })
    expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({
      automatic: false,
      operation: expect.objectContaining({ requestId: 431, threadId: 'thread-1' }),
      reply: { result: { decision: 'acceptForSession' } },
    }))
    await manager.dispose()
  })

  it('forgets unresolved requests when their turn terminates', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    host.emit('server/request', { id: 44, method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1', command: 'sleep 30' }, receivedAtIso: '2026-01-01T00:00:00.000Z' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(manager.listPendingEvents('conversation-1')).toHaveLength(1)

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'interrupted' } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(manager.listPendingEvents('conversation-1')).toEqual([])
    await manager.dispose()
  })

  it('never resumes or restarts the owner process after a host disconnect', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    host.emit('runtime/disconnected', { error: 'process exited' })
    await expect(manager.read('conversation-1')).rejects.toThrow('Restart the product service')
    expect(host.calls.map(call => call.method)).toEqual(['thread/start'])
    await manager.dispose()
  })

  it('terminalizes an active command when the owner process disconnects without resending it', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    const events: CodexEvent[] = []
    manager.subscribe(event => events.push(event))
    await manager.create('conversation-1', context)
    const submission = manager.submit(
      'conversation-1',
      { input: [{ type: 'text', text: 'one command only', text_elements: [] }] },
      'queue',
      'client-command-1',
    )
    const handle = await submission.started

    host.emit('runtime/disconnected', { error: 'process exited' })

    await expect(submission.completed).resolves.toMatchObject({
      handle,
      terminalEvent: {
        type: 'turn.failed',
        data: expect.objectContaining({ retainOutboxForRetry: true, cause: 'runtime_unavailable' }),
      },
    })
    expect(events.filter(event => event.type === 'turn.failed')).toHaveLength(1)
    expect(host.calls.filter(call => call.method === 'turn/start')).toHaveLength(1)
    expect(manager.listAttachmentEvents('conversation-1')).toContainEqual(expect.objectContaining({
      type: 'turn.failed', turnId: handle.turnId,
    }))
    await manager.dispose()
  })

  it('rejects commands queued after disposal before they can reach App Server', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host })
    await manager.create('conversation-1', context)
    await manager.dispose()

    expect(() => manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'must not run', text_elements: [] }],
    })).toThrow('disposed')
    expect(host.calls.map(call => call.method)).toEqual(['thread/start'])
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

  it('shares one native stop flight while keeping an inactivity stop classified as failed', async () => {
    vi.useFakeTimers()
    const host = new FakeHost()
    const manager = new CodexSessionManager({
      host,
      turnInactivityTimeoutMs: 1_000,
      turnStopReconcileAttempts: 1,
      turnStopReconcileDelayMs: 0,
    })
    await manager.create('conversation-1', context)
    const submission = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'silent task', text_elements: [] }],
    })
    const handle = await submission.started
    host.threadReadTurns = [{ id: handle.turnId, status: 'interrupted', items: [], error: null }]

    vi.advanceTimersByTime(1_001)
    await expect(manager.interrupt('conversation-1')).resolves.toBe(true)
    await expect(submission.completed).resolves.toMatchObject({
      terminalEvent: {
        type: 'turn.failed',
        data: expect.objectContaining({
          cause: 'inactivity_timeout',
          retainOutboxForRetry: true,
          interruptedAfterOperationalFailure: true,
        }),
      },
    })
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toHaveLength(1)
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
    host.threadReadTurns = [{ id: handle.turnId, status: 'failed', items: [], error: { message: 'inactive turn interrupted' } }]

    await vi.advanceTimersByTimeAsync(1_001)
    expect(events).toContainEqual(expect.objectContaining({
      type: 'turn.disconnected',
      data: expect.objectContaining({ cause: 'inactivity_timeout', error: expect.stringContaining('had no progress') }),
    }))
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toEqual([
      { method: 'turn/interrupt', params: handle },
    ])
    expect(await manager.interrupt('conversation-1')).toBe(false)

    host.emit('turn/completed', { threadId: 'thread-1', turn: { id: handle.turnId, status: 'completed' } })
    await expect(terminal).resolves.toMatchObject({ type: 'turn.failed' })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(events.filter((event) => event.type === 'turn.disconnected' || event.type === 'turn.failed')).toHaveLength(2)
    expect(events.filter((event) => event.type === 'turn.disconnected')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'turn.failed')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'turn.completed')).toHaveLength(0)
    await manager.dispose()
  })

  it('quarantines a session instead of starting another native Turn when stop cannot be confirmed', async () => {
    const host = new FakeHost()
    const manager = new CodexSessionManager({ host, turnStopReconcileAttempts: 1, turnStopReconcileDelayMs: 0 })
    await manager.create('conversation-1', context)
    const first = manager.submit('conversation-1', { input: [{ type: 'text', text: 'first', text_elements: [] }] })
    const handle = await first.started
    const alreadyQueued = manager.submit('conversation-1', {
      input: [{ type: 'text', text: 'already queued', text_elements: [] }],
    }, 'queue', 'already-queued')

    host.emit('error', {
      threadId: 'thread-1', turnId: handle.turnId, willRetry: false,
      error: { message: 'response stream disconnected' },
    })

    await expect(first.completed).rejects.toThrow('could not be confirmed stopped')
    await expect(alreadyQueued.started).rejects.toThrow('quarantined')
    expect(manager.snapshot('conversation-1')?.quarantinedReason).toContain('quarantined')
    await expect(manager.send('conversation-1', { input: [{ type: 'text', text: 'second', text_elements: [] }] })).rejects.toThrow('quarantined')
    expect(host.calls.filter((call) => call.method === 'turn/start')).toHaveLength(1)
    expect(host.calls.filter((call) => call.method === 'turn/interrupt')).toHaveLength(1)
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
