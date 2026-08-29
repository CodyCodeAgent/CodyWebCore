import { describe, expect, it } from 'vitest'
import {
  buildConversationScrollMetrics,
  conversationFeedFromState,
  conversationLiveOverlayFromState,
  conversationOverlayMessagesFromState,
  latestTerminalTurnEvent,
  conversationStateFromRegistry,
  conversationTranscriptFromState,
  createConversationState,
  dataAuthorityFor,
  hiddenMessageCount,
  mergeMessages,
  nextVisibleMessageCount,
  previewToolOutput,
  reduceConversationEvents,
  reduceConversationRegistryEvents,
  pruneConversationStateRegistry,
  restoredConversationScrollTop,
  shouldPreserveConversationViewport,
  upsertLiveDelta,
} from '../src/conversation/index.js'

describe('conversation core', () => {
  it('selects the last terminal transition from a normalized event batch', () => {
    const events = [
      { id: 'answer', type: 'assistant.completed', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z', data: { text: 'done' } },
      { id: 'done', type: 'turn.completed', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:01.000Z', data: {} },
    ] as const
    expect(latestTerminalTurnEvent(events)).toMatchObject({ id: 'done', type: 'turn.completed' })
  })

  it('replaces an optimistic user message without duplicating it', () => {
    const output = mergeMessages(
      [{ id: 'optimistic', turnId: 't1', role: 'user' as const, text: 'hello', messageType: 'userMessage.optimistic' }],
      [{ id: 'persisted', turnId: 't1', role: 'user' as const, text: 'hello' }],
      { preserveMissing: true },
    )
    expect(output).toEqual([{ id: 'persisted', turnId: 't1', role: 'user', text: 'hello' }])
  })

  it('replaces an assistant realtime overlay with the durable item', () => {
    const output = mergeMessages(
      [{ id: 'live:item-1', turnId: 'turn-1', role: 'assistant' as const, text: 'Hello ', messageType: 'agentMessage.live' }],
      [{ id: 'item-1', turnId: 'turn-1', role: 'assistant' as const, text: 'Hello world' }],
      { preserveMissing: true },
    )
    expect(output).toEqual([{ id: 'item-1', turnId: 'turn-1', role: 'assistant', text: 'Hello world' }])
  })

  it('keeps historical protocol order while preserving a live suffix', () => {
    const oldAnswer = { id: 'old-answer', turnId: 'old', role: 'assistant' as const, text: 'old answer' }
    const receipt = { id: 'worked:old', turnId: 'old', role: 'system' as const, text: 'Answered', messageType: 'worked' }
    const currentUser = { id: 'current-user', turnId: 'current', role: 'user' as const, text: 'new question' }
    const liveAnswer = { id: 'live:current', turnId: 'current', role: 'assistant' as const, text: 'streaming', messageType: 'agentMessage.live' }
    const missingOldUser = { id: 'old-user', turnId: 'old', role: 'user' as const, text: 'old question' }

    const output = mergeMessages(
      [oldAnswer, receipt, currentUser, liveAnswer],
      [missingOldUser, oldAnswer, receipt, currentUser],
      { preserveMissing: true },
    )

    expect(output.map((message) => message.id)).toEqual(['old-user', 'old-answer', 'worked:old', 'current-user', 'live:current'])
  })

  it('reconciles outbox users and normalized local-image identities', () => {
    const output = mergeMessages(
      [{
        id: 'outbox', role: 'user' as const, text: 'inspect', messageType: 'userMessage.outbox.sending',
        images: ['/codex-api/local-image?path=%2Ftmp%2Fshot.png'], outbox: { status: 'sending' as const },
      }],
      [{ id: 'native', role: 'user' as const, text: ' inspect ', images: ['/tmp/shot.png'] }],
      { preserveMissing: true },
    )
    expect(output.map((message) => message.id)).toEqual(['native'])
  })

  it('preserves intentionally repeated prompts across worked turn boundaries', () => {
    const first = { id: 'first', turnId: 'one', role: 'user' as const, text: 'retry' }
    const receipt = { id: 'worked:one', turnId: 'one', role: 'system' as const, text: 'Answered', messageType: 'worked' }
    const second = { id: 'second', turnId: 'two', role: 'user' as const, text: 'retry' }
    expect(mergeMessages([first, receipt], [first, receipt, second], { preserveMissing: true })).toEqual([first, receipt, second])
  })

  it('keeps realtime deltas in one row', () => {
    const once = upsertLiveDelta([], { messageId: 'a', textDelta: 'one', messageType: 'agentMessage.live' })
    const twice = upsertLiveDelta(once, { messageId: 'a', textDelta: ' two', messageType: 'plan.live', turnId: 'turn-1' })
    expect(twice).toHaveLength(1)
    expect(twice[0]?.text).toBe('one two')
    expect(twice[0]).toMatchObject({ messageType: 'plan.live', turnId: 'turn-1' })
  })

  it('classifies authority and bounds tool previews', () => {
    expect(dataAuthorityFor('item/agentMessage/delta')).toBe('overlay')
    expect(dataAuthorityFor('turn/plan/updated')).toBe('replace-snapshot')
    expect(previewToolOutput('a\nb\nc', 2).truncated).toBe(true)
  })

  it('keeps retry notices as overlay state and accepts only one terminal transition', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'started', type: 'turn.started', data: {} },
      { ...base, id: 'retry-1', type: 'turn.retrying', data: { error: 'Reconnecting 1/5' } },
      { ...base, id: 'retry-2', type: 'turn.retrying', data: { error: 'Reconnecting 2/5' } },
      { ...base, id: 'done', type: 'turn.completed', data: {} },
      { ...base, id: 'late-failure', type: 'turn.failed', data: { error: 'late duplicate' } },
    ])
    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'completed' })
    expect(state.activeTurnId).toBe('')
  })

  it('owns transient activity, structured plans and context compaction state', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'activity', type: 'turn.activity', data: { label: 'Writing plan', details: [] } },
      { ...base, id: 'plan', type: 'plan.replaced', data: {
        text: '1. Inspect', explanation: 'Plan', steps: [{ step: 'Inspect', status: 'inProgress' }], raw: {},
      } },
      { ...base, id: 'usage', type: 'thread.context.updated', data: {
        turnId: 'turn-1', usedTokens: 1200, inputTokens: 900, contextWindow: 128_000, autoCompactTokenLimit: 100_000,
      } },
      { ...base, id: 'compacting', type: 'thread.compaction.started', data: {} },
      { ...base, id: 'compacted', type: 'thread.compacted', data: {} },
    ])

    expect(state.activity).toBeNull()
    expect(state.plan).toMatchObject({ explanation: 'Plan', steps: [{ step: 'Inspect', status: 'inProgress' }] })
    expect(state.contextUsage).toEqual({
      turnId: 'turn-1', usedTokens: 1200, inputTokens: 900, contextWindow: 128_000,
      autoCompactTokenLimit: 100_000, compactionState: 'compacted', updatedAtIso: base.atIso,
    })
  })

  it('prefers a native turn duration over transport arrival latency', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z', data: {} },
      { id: 'done', type: 'turn.completed', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:09.000Z', data: { durationMs: 1_250 } },
    ])
    expect(conversationFeedFromState(state).at(-1)).toMatchObject({ kind: 'turn', durationMs: 1_250 })
  })

  it('never promotes a terminal-only diagnostic turn to active', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [{
      id: 'local-failure',
      type: 'turn.failed',
      threadId: 'thread-1',
      turnId: 'local-turn',
      atIso: '2026-01-01T00:00:00.000Z',
      data: { error: 'runtime disconnected' },
    }])

    expect(state.turns['local-turn']).toMatchObject({ lifecycle: 'failed' })
    expect(state.activeTurnId).toBe('')
  })

  it('keeps a user interruption distinct from a failed turn', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z', data: {} },
      { id: 'interrupt', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:01.000Z', data: { status: 'interrupted' } },
    ])

    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'interrupted' })
    expect(state.activeTurnId).toBe('')
    expect(state.presentation).toContainEqual(expect.objectContaining({ kind: 'interrupted', turnId: 'turn-1' }))
    expect(state.presentation).not.toContainEqual(expect.objectContaining({ kind: 'failure' }))
  })

  it('does not clear a newer active turn when an older turn finishes late', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'old-start', type: 'turn.started', threadId: 'thread-1', turnId: 'old-turn', atIso: '2026-01-01T00:00:00.000Z', data: {} },
      { id: 'new-start', type: 'turn.started', threadId: 'thread-1', turnId: 'new-turn', atIso: '2026-01-01T00:00:01.000Z', data: {} },
      { id: 'old-done', type: 'turn.completed', threadId: 'thread-1', turnId: 'old-turn', atIso: '2026-01-01T00:00:02.000Z', data: {} },
    ])

    expect(state.activeTurnId).toBe('new-turn')
    expect(state.turns['old-turn']).toMatchObject({ lifecycle: 'completed' })
    expect(state.turns['new-turn']).toMatchObject({ lifecycle: 'running' })
  })

  it('coalesces item and turn diff notifications into one file-change row and closes it with the turn', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'file-item', itemId: 'file-1', type: 'tool.started', data: { tool: { kind: 'fileChange', title: 'File change', status: 'running', summary: '1 file', details: ['a.ts'] } } },
      { ...base, id: 'turn-diff', type: 'fileChange.updated', data: { tool: { kind: 'fileChange', title: 'File changes', status: 'running', summary: 'Diff updated', details: [], output: '+hello' } } },
      { ...base, id: 'done', type: 'turn.completed', atIso: '2026-01-01T00:00:02.000Z', data: {} },
    ])

    expect(state.timeline).toEqual([expect.objectContaining({
      id: 'tool:fileChange:turn-1',
      tool: expect.objectContaining({ status: 'completed', details: ['a.ts'], output: '+hello' }),
    })])
    expect(state.presentation.filter((row) => row.id === 'tool:fileChange:turn-1')).toHaveLength(1)
  })

  it('does not fabricate a worked-duration receipt when native history has no timestamps', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '1970-01-01T00:00:00.000Z', data: { history: true, durationKnown: false } },
      { id: 'done', type: 'turn.completed', threadId: 'thread-1', turnId: 'turn-1', atIso: '1970-01-01T00:00:00.000Z', data: { history: true, durationKnown: false } },
    ])
    expect(state.presentation).not.toContainEqual(expect.objectContaining({ kind: 'worked' }))
  })

  it('keeps completed reasoning in the timeline but clears the transient reasoning overlay', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', itemId: 'reasoning-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'reasoning', type: 'reasoning.delta', data: { text: 'Inspecting' } },
      { ...base, id: 'answer', itemId: 'agent-1', type: 'assistant.delta', data: { text: 'Done' } },
      { ...base, id: 'complete', type: 'turn.completed', data: {} },
    ])
    expect(state.reasoningText).toBe('')
    expect(state.timeline).toContainEqual(expect.objectContaining({ kind: 'reasoning', text: 'Inspecting' }))
  })

  it('owns plan lifecycle and live overlay presentation state', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const active = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'reasoning', itemId: 'reasoning-1', type: 'reasoning.delta', data: { text: 'Inspecting' } },
      { ...base, id: 'plan', type: 'plan.replaced', data: { text: 'Plan', steps: [{ step: 'Inspect', status: 'inProgress' }] } },
      { ...base, id: 'activity', type: 'turn.activity', data: { label: 'Writing plan', details: [] } },
    ])
    expect(active.plan).toMatchObject({ revision: 1, lifecycle: 'active', possiblyStale: false })
    expect(conversationLiveOverlayFromState(active)).toMatchObject({
      activityLabel: 'Writing plan',
      reasoningText: '',
      errorText: '',
    })

    const failed = reduceConversationEvents(active, [{
      ...base, id: 'failed', type: 'turn.failed', atIso: '2026-01-01T00:00:02.000Z', data: { error: 'network failed' },
    }])
    expect(failed.plan).toMatchObject({ lifecycle: 'ended', possiblyStale: true })
    expect(conversationLiveOverlayFromState(failed)).toMatchObject({ errorText: 'network failed' })
  })

  it('selects assistant and plan overlays with stable native item identities', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'answer-delta', itemId: 'agent-1', type: 'assistant.delta', data: { text: 'Draft' } },
      { ...base, id: 'answer-completed', itemId: 'agent-1', type: 'assistant.completed', data: { text: 'Done' } },
      { ...base, id: 'plan-delta', itemId: 'plan-1', type: 'plan.delta', data: { text: 'Inspect' } },
      { ...base, id: 'plan-snapshot', type: 'plan.replaced', data: { text: 'Inspect\nTest' } },
    ])

    expect(conversationOverlayMessagesFromState(state)).toEqual([
      expect.objectContaining({ id: 'agent-1', text: 'Done', messageType: 'agentMessage.live' }),
      expect.objectContaining({ id: 'plan-1', text: 'Inspect\nTest', messageType: 'plan.live' }),
    ])

    const completed = reduceConversationEvents(state, [{
      ...base, id: 'done', type: 'turn.completed', atIso: '2026-01-01T00:00:02.000Z', data: {},
    }])
    expect(conversationOverlayMessagesFromState(completed)).toEqual([
      expect.objectContaining({ id: 'agent-1', text: 'Done', messageType: 'agentMessage' }),
    ])
  })

  it('selects one protocol-ordered feed for every renderer', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'user', itemId: 'user-1', type: 'user.completed', data: { text: 'Inspect' } },
      { ...base, id: 'tool', itemId: 'tool-1', type: 'tool.completed', data: { tool: { kind: 'command', title: 'Command', status: 'completed', summary: 'pnpm test', details: [] } } },
      { ...base, id: 'answer', itemId: 'agent-1', type: 'assistant.completed', data: { text: 'Done' } },
      { ...base, id: 'done', type: 'turn.completed', atIso: '2026-01-01T00:00:03.000Z', data: {} },
    ])

    expect(conversationFeedFromState(state).map((entry) => [entry.kind, entry.id])).toEqual([
      ['message', 'user:user-1'],
      ['timeline', 'tool:tool-1'],
      ['message', 'agent:agent-1'],
      ['turn', 'worked:turn-1'],
    ])
    expect(conversationFeedFromState(state).at(-1)).toMatchObject({
      kind: 'turn', status: 'completed', durationMs: 3_000,
    })
    expect(conversationTranscriptFromState(state).map((message) => [message.messageType, message.text])).toEqual([
      [undefined, 'Inspect'],
      ['tool.command', ''],
      [undefined, 'Done'],
      ['worked', 'Worked for 3s'],
    ])
  })

  it('reduces a shared notification stream into isolated thread states', () => {
    const registry = reduceConversationRegistryEvents({}, [
      { id: 'a-start', type: 'turn.started', threadId: 'thread-a', turnId: 'turn-a', atIso: '2026-01-01T00:00:00.000Z', data: {} },
      { id: 'b-start', type: 'turn.started', threadId: 'thread-b', turnId: 'turn-b', atIso: '2026-01-01T00:00:01.000Z', data: {} },
      { id: 'a-answer', type: 'assistant.completed', threadId: 'thread-a', turnId: 'turn-a', itemId: 'agent-a', atIso: '2026-01-01T00:00:02.000Z', data: { text: 'A' } },
    ])

    expect(conversationStateFromRegistry(registry, 'thread-a')).toMatchObject({
      activeTurnId: 'turn-a',
      messages: [expect.objectContaining({ text: 'A' })],
    })
    expect(conversationStateFromRegistry(registry, 'thread-b')).toMatchObject({ activeTurnId: 'turn-b', messages: [] })
    expect(reduceConversationRegistryEvents(registry, [{
      id: 'a-answer', type: 'assistant.completed', threadId: 'thread-a', turnId: 'turn-a', itemId: 'agent-a', atIso: '2026-01-01T00:00:02.000Z', data: { text: 'A' },
    }])).toBe(registry)
    expect(pruneConversationStateRegistry(registry, new Set(['thread-b']))).toEqual({ 'thread-b': registry['thread-b'] })
  })

  it('keeps history windows and scroll restoration deterministic', () => {
    expect(hiddenMessageCount(200, 80)).toBe(120)
    expect(nextVisibleMessageCount(200, 80)).toBe(160)
    expect(nextVisibleMessageCount(100, 80)).toBe(100)
    expect(buildConversationScrollMetrics({
      scrollTop: 780,
      scrollHeight: 1_000,
      clientHeight: 200,
      bottomThresholdPx: 16,
    })).toEqual({ maxScrollTop: 800, scrollRatio: 0.975, isAtBottom: false })
    expect(restoredConversationScrollTop({ scrollTop: 20, scrollRatio: 0.5, isAtBottom: false }, 800)).toBe(400)
    expect(shouldPreserveConversationViewport({ scrollTop: 20, isAtBottom: false })).toBe(true)
  })
})
