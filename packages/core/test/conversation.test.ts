import { describe, expect, it } from 'vitest'
import {
  buildConversationScrollMetrics,
  conversationFeedFromState,
  conversationLiveOverlayFromState,
  conversationOverlayMessagesFromState,
  latestTerminalTurnEvent,
  conversationStateFromRegistry,
  conversationTranscriptFromState,
  compactConversationMessages,
  createConversationState,
  dataAuthorityFor,
  hiddenMessageCount,
  mergeMessages,
  nextVisibleMessageCount,
  orderConversationMessagesByTurn,
  previewToolOutput,
  reduceConversationEvents,
  reduceConversationRegistryEvents,
  pruneConversationStateRegistry,
  reconcilePersistedMessages,
  removeRedundantLiveAssistantMessages,
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

  it('replaces a legacy terminal overlay whose id lost the agent prefix', () => {
    const output = mergeMessages(
      [{ id: 'item-1', turnId: 'turn-1', role: 'assistant' as const, text: 'Done', messageType: 'agentMessage' }],
      [{ id: 'agent:item-1', turnId: 'turn-1', role: 'assistant' as const, text: 'Done' }],
      { preserveMissing: true },
    )
    expect(output).toEqual([{ id: 'agent:item-1', turnId: 'turn-1', role: 'assistant', text: 'Done' }])
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

  it('keeps the active Turn response ahead of future optimistic Turns', () => {
    const activeUser = { id: 'user-a', turnId: 'turn-a', role: 'user' as const, text: 'First question' }
    const pendingB = { id: 'pending-b', role: 'user' as const, text: 'Second question', messageType: 'userMessage.optimistic' }
    const pendingC = { id: 'pending-c', role: 'user' as const, text: 'Third question', messageType: 'userMessage.optimistic' }
    const liveAnswer = { id: 'live:answer-a', turnId: 'turn-a', role: 'assistant' as const, text: 'First answer', messageType: 'agentMessage.live' }

    expect(orderConversationMessagesByTurn(
      [activeUser, pendingB, pendingC],
      [liveAnswer],
    ).map((message) => message.id)).toEqual([
      'user-a',
      'live:answer-a',
      'pending-b',
      'pending-c',
    ])
  })

  it('upgrades a bound optimistic user into its accepted Turn', () => {
    const previousUser = { id: 'user-a', turnId: 'turn-a', role: 'user' as const, text: 'First question' }
    const previousAnswer = { id: 'answer-a', turnId: 'turn-a', role: 'assistant' as const, text: 'First answer' }
    const acceptedUser = {
      id: 'pending-b', turnId: 'turn-b', role: 'user' as const, text: 'Second question', messageType: 'userMessage.optimistic',
    }
    const acceptedAnswer = {
      id: 'live:answer-b', turnId: 'turn-b', role: 'assistant' as const, text: 'Second answer', messageType: 'agentMessage.live',
    }

    expect(orderConversationMessagesByTurn(
      [previousUser, previousAnswer, acceptedUser],
      [acceptedAnswer],
    ).map((message) => message.id)).toEqual([
      'user-a',
      'answer-a',
      'pending-b',
      'live:answer-b',
    ])
  })

  it('places a Turn receipt inside its Turn before future queued prompts', () => {
    const user = { id: 'user-a', turnId: 'turn-a', role: 'user' as const, text: 'First question' }
    const answer = { id: 'answer-a', turnId: 'turn-a', role: 'assistant' as const, text: 'First answer' }
    const pending = { id: 'pending-b', role: 'user' as const, text: 'Second question', messageType: 'userMessage.optimistic' }
    const receipt = { id: 'worked:turn-a', turnId: 'turn-a', role: 'system' as const, text: 'Worked for 1s', messageType: 'worked' }

    expect(orderConversationMessagesByTurn(
      [user, answer, pending],
      [],
      [receipt],
    ).map((message) => message.id)).toEqual([
      'user-a',
      'answer-a',
      'worked:turn-a',
      'pending-b',
    ])
  })

  it('keeps the shared feed Turn-contiguous when a follow-up is queued before the active answer completes', () => {
    const base = { threadId: 'thread-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'turn-a-start', type: 'turn.started', turnId: 'turn-a', data: {} },
      { ...base, id: 'user-a', type: 'user.completed', turnId: 'turn-a', itemId: 'user-a', data: { text: 'first' } },
      { ...base, id: 'queued-b', type: 'command.queued', itemId: 'command-b', data: { text: 'second' } },
      { ...base, id: 'answer-a', type: 'assistant.completed', turnId: 'turn-a', itemId: 'answer-a', data: { text: 'first answer' } },
      { ...base, id: 'turn-a-done', type: 'turn.completed', turnId: 'turn-a', atIso: '2026-01-01T00:00:01.000Z', data: { durationMs: 1_000 } },
    ])

    expect(conversationTranscriptFromState(state).map((message) => [message.text, message.messageType])).toEqual([
      ['first', undefined],
      ['first answer', 'agentMessage'],
      ['Worked for 1s', 'worked'],
      ['second', 'userMessage.optimistic'],
    ])
  })

  it('orders a later bound Turn after the earlier Turn even when its optimistic ref arrived first', () => {
    const base = { threadId: 'thread-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'turn-a-start', type: 'turn.started', turnId: 'turn-a', data: {} },
      { ...base, id: 'user-a', type: 'user.completed', turnId: 'turn-a', itemId: 'user-a', data: { text: 'first' } },
      { ...base, id: 'queued-b', type: 'command.queued', itemId: 'command-b', data: { text: 'second' } },
      { ...base, id: 'answer-a', type: 'assistant.completed', turnId: 'turn-a', itemId: 'answer-a', data: { text: 'first answer' } },
      { ...base, id: 'turn-a-done', type: 'turn.completed', turnId: 'turn-a', atIso: '2026-01-01T00:00:01.000Z', data: { durationMs: 1_000 } },
      { ...base, id: 'turn-b-start', type: 'turn.started', turnId: 'turn-b', atIso: '2026-01-01T00:00:02.000Z', data: {} },
      { ...base, id: 'bound-b', type: 'command.bound', turnId: 'turn-b', itemId: 'command-b', data: { clientCommandId: 'command-b' } },
      { ...base, id: 'answer-b', type: 'assistant.completed', turnId: 'turn-b', itemId: 'answer-b', data: { text: 'second answer' } },
    ])

    expect(conversationTranscriptFromState(state).map((message) => message.text)).toEqual([
      'first', 'first answer', 'Worked for 1s', 'second', 'second answer',
    ])
  })

  it('renders one terminal receipt per Turn when durable history and realtime completion overlap', () => {
    const user = { id: 'user-a', turnId: 'turn-a', role: 'user' as const, text: 'First question' }
    const answer = { id: 'answer-a', turnId: 'turn-a', role: 'assistant' as const, text: 'First answer' }
    const durableReceipt = {
      id: 'worked:turn-a', turnId: 'turn-a', role: 'system' as const, text: 'Worked for 1m 6s', messageType: 'worked',
    }
    const realtimeReceipt = {
      id: 'turn-summary:turn-a', turnId: 'turn-a', role: 'system' as const, text: 'Worked for 1m 6s', messageType: 'worked',
    }
    const nextTurnReceipt = {
      id: 'worked:turn-b', turnId: 'turn-b', role: 'system' as const, text: 'Worked for 2s', messageType: 'worked',
    }

    const output = orderConversationMessagesByTurn(
      [user, answer, durableReceipt, nextTurnReceipt],
      [],
      [realtimeReceipt],
    )

    expect(output.filter((message) => message.turnId === 'turn-a' && message.messageType === 'worked'))
      .toEqual([durableReceipt])
    expect(output.filter((message) => message.messageType === 'worked').map((message) => message.id))
      .toEqual(['worked:turn-a', 'worked:turn-b'])
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

  it('preserves identical persisted prompts in distinct native Turns without relying on receipt rows in messages', () => {
    const base = { threadId: 'thread-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'turn-1-start', type: 'turn.started', turnId: 'turn-1', data: {} },
      { ...base, id: 'user-1', type: 'user.completed', turnId: 'turn-1', itemId: 'user-1', data: { text: 'retry' } },
      { ...base, id: 'turn-1-done', type: 'turn.completed', turnId: 'turn-1', data: { durationMs: 1_000 } },
      { ...base, id: 'turn-2-start', type: 'turn.started', turnId: 'turn-2', data: {} },
      { ...base, id: 'user-2', type: 'user.completed', turnId: 'turn-2', itemId: 'user-2', data: { text: 'retry' } },
      { ...base, id: 'turn-2-done', type: 'turn.completed', turnId: 'turn-2', data: { durationMs: 1_000 } },
    ])
    expect(state.messages.filter(message => message.role === 'user')).toHaveLength(2)
    expect(conversationTranscriptFromState(state).filter(message => message.text === 'retry')).toHaveLength(2)
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
      { ...base, id: 'user', itemId: 'user-1', type: 'user.completed', data: { text: 'Run the task' } },
      { ...base, id: 'retry-1', type: 'turn.retrying', data: { error: 'Reconnecting 1/5' } },
      { ...base, id: 'retry-2', type: 'turn.retrying', data: { error: 'Reconnecting 2/5' } },
      { ...base, id: 'done', type: 'turn.completed', data: {} },
      { ...base, id: 'late-failure', type: 'turn.failed', data: { error: 'late duplicate' } },
    ])
    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'completed' })
    expect(state.activeTurnId).toBe('')
    expect(conversationTranscriptFromState(state).filter(message => message.messageType === 'turn.failed')).toEqual([])
    expect(conversationTranscriptFromState(state).filter(message => message.messageType === 'worked')).toHaveLength(1)
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
      { id: 'user', type: 'user.completed', threadId: 'thread-1', turnId: 'turn-1', itemId: 'user-1', atIso: '2026-01-01T00:00:00.100Z', data: { text: 'Run the task' } },
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
      { id: 'approval', type: 'approval.requested', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.500Z', data: { requestId: 'approval-1' } },
      { id: 'interrupt', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:01.000Z', data: { status: 'interrupted' } },
    ])

    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'interrupted' })
    expect(state.activeTurnId).toBe('')
    expect(state.presentation).toContainEqual(expect.objectContaining({ kind: 'interrupted', turnId: 'turn-1' }))
    expect(state.presentation).not.toContainEqual(expect.objectContaining({ kind: 'failure' }))
    expect(state.pendingRequests).toEqual([])
  })

  it('settles a bound optimistic user message when its native Turn terminates', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'queued', type: 'command.queued', threadId: 'thread-1', itemId: 'command-1', atIso: '2026-01-01T00:00:00.000Z', data: { text: 'run it' } },
      { id: 'bound', type: 'command.bound', threadId: 'thread-1', turnId: 'turn-1', itemId: 'command-1', atIso: '2026-01-01T00:00:00.100Z', data: { clientCommandId: 'command-1' } },
      { id: 'interrupted', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:01.000Z', data: {} },
    ])

    expect(state.messages).toMatchObject([
      { id: 'user:command-1', turnId: 'turn-1', text: 'run it', messageType: 'userMessage.settled' },
    ])
    expect(state.messages[0]?.outbox).toBeUndefined()
  })

  it('clears interactive requests without fabricating a terminal receipt when runtime disconnects', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z', data: {} },
      { id: 'approval', type: 'approval.requested', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.500Z', data: { requestId: 'approval-1' } },
      { id: 'disconnect', type: 'runtime.disconnected', threadId: 'thread-1', atIso: '2026-01-01T00:00:01.000Z', data: { error: 'owner unavailable' } },
    ])

    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'disconnected' })
    expect(state.pendingRequests).toEqual([])
    expect(state.activeTurnId).toBe('')
    expect(state.presentation).not.toContainEqual(expect.objectContaining({ kind: 'failure' }))
  })

  it('keeps an upstream-disconnected Turn active until an explicit native terminal arrives', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'started', type: 'turn.started', data: {} },
      { ...base, id: 'disconnected', type: 'turn.disconnected', data: { error: 'response stream timed out' } },
    ])

    expect(state.activeTurnId).toBe('turn-1')
    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'disconnected', error: 'response stream timed out' })
    expect(conversationFeedFromState(state)).toContainEqual(expect.objectContaining({
      kind: 'activity', turnId: 'turn-1', status: 'disconnected',
    }))
    expect(conversationLiveOverlayFromState(state)?.errorText).toBe('response stream timed out')
  })

  it('keeps an operationally failed command retryable after its native terminal is reconciled', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'queued', type: 'command.queued', itemId: 'command-1', turnId: undefined, data: { text: 'run it' } },
      { ...base, id: 'bound', type: 'command.bound', itemId: 'command-1', data: { clientCommandId: 'command-1' } },
      { ...base, id: 'started', type: 'turn.started', data: {} },
      { ...base, id: 'native-user', type: 'user.completed', itemId: 'native-user-1', data: { text: 'run it' } },
      { ...base, id: 'disconnected', type: 'turn.disconnected', data: { error: 'response stream timed out' } },
      { ...base, id: 'failed', type: 'turn.failed', data: { error: 'response stream timed out' } },
    ])

    expect(state.activeTurnId).toBe('')
    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'failed', error: 'response stream timed out' })
    expect(state.messages).toMatchObject([{
      id: 'user:native-user-1', turnId: 'turn-1',
      outbox: { status: 'failed', lastError: 'response stream timed out' },
    }])
    expect(state.presentation.filter((row) => row.kind === 'failure')).toHaveLength(1)
  })

  it('allows an owner terminal correction to replace native interrupted history exactly once', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'user', type: 'user.completed', itemId: 'user-1', data: { text: 'run it' } },
      { ...base, id: 'history:terminal', type: 'turn.interrupted', data: {} },
      { ...base, id: 'owner:correction', type: 'turn.failed', data: { error: 'stream failed', retainOutboxForRetry: true, terminalCorrection: true } },
      { ...base, id: 'late-retry', type: 'turn.retrying', data: { error: 'late event' } },
    ])

    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'failed', error: 'stream failed' })
    expect(state.messages[0]).toMatchObject({ outbox: { status: 'failed' } })
    expect(state.presentation.filter(row => row.turnId === 'turn-1' && ['worked', 'failure', 'interrupted'].includes(row.kind)))
      .toEqual([expect.objectContaining({ kind: 'failure' })])
  })

  it('keeps an explicit same-text retry as a distinct user message and Turn', () => {
    const base = { threadId: 'thread-1', atIso: '2026-01-01T00:00:00.000Z' }
    const firstAttempt = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'turn-1-start', type: 'turn.started', turnId: 'turn-1', data: {} },
      { ...base, id: 'user-1', type: 'user.completed', turnId: 'turn-1', itemId: 'native-user-1', data: { text: 'retry me' } },
      { ...base, id: 'turn-1-failed', type: 'turn.failed', turnId: 'turn-1', data: { error: 'timed out', retainOutboxForRetry: true } },
    ])
    const retried = reduceConversationEvents(firstAttempt, [
      { ...base, id: 'command-2', type: 'command.queued', itemId: 'command-2', data: { text: 'retry me' } },
      { ...base, id: 'command-2-bound', type: 'command.bound', itemId: 'command-2', turnId: 'turn-2', data: { clientCommandId: 'command-2' } },
      { ...base, id: 'turn-2-start', type: 'turn.started', turnId: 'turn-2', data: {} },
      { ...base, id: 'user-2', type: 'user.completed', turnId: 'turn-2', itemId: 'native-user-2', data: { text: 'retry me' } },
    ])

    expect(retried.messages.filter(message => message.role === 'user')).toMatchObject([
      { id: 'user:native-user-1', turnId: 'turn-1', outbox: { status: 'failed' } },
      { id: 'user:native-user-2', turnId: 'turn-2' },
    ])
  })

  it('does not offer retry while an upstream response stream is still recovering', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'started', type: 'turn.started', data: {} },
      { ...base, id: 'native-user', type: 'user.completed', itemId: 'native-user-1', data: { text: 'run it' } },
      { ...base, id: 'disconnected', type: 'turn.disconnected', data: { error: 'response stream timed out' } },
    ])

    expect(state.messages[0]).toMatchObject({ id: 'user:native-user-1', text: 'run it' })
    expect(state.messages[0]?.outbox).toBeUndefined()
    expect(state.turns['turn-1']).toMatchObject({ lifecycle: 'disconnected' })
  })

  it('keeps an empty interrupted Turn diagnostic out of the visible transcript', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'empty-turn', atIso: '2026-01-01T00:00:00.000Z', data: {} },
      { id: 'interrupt', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'empty-turn', atIso: '2026-01-01T00:00:01.000Z', data: {} },
    ])

    expect(state.turns['empty-turn']).toMatchObject({ lifecycle: 'interrupted' })
    expect(conversationFeedFromState(state)).not.toContainEqual(expect.objectContaining({
      kind: 'turn',
      turnId: 'empty-turn',
      status: 'interrupted',
    }))
    expect(conversationTranscriptFromState(state)).not.toContainEqual(expect.objectContaining({
      messageType: 'turn.interrupted',
      turnId: 'empty-turn',
    }))
  })

  it('renders one Stopped receipt when a visible interrupted Turn is followed by an empty one', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'first-start', type: 'turn.started', threadId: 'thread-1', turnId: 'visible-turn', atIso: '2026-01-01T00:00:00.000Z', data: {} },
      { id: 'first-user', type: 'user.completed', threadId: 'thread-1', turnId: 'visible-turn', itemId: 'user-1', atIso: '2026-01-01T00:00:00.100Z', data: { text: 'Continue' } },
      { id: 'first-answer', type: 'assistant.completed', threadId: 'thread-1', turnId: 'visible-turn', itemId: 'answer-1', atIso: '2026-01-01T00:00:00.200Z', data: { text: 'Working on it' } },
      { id: 'first-interrupt', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'visible-turn', atIso: '2026-01-01T00:00:01.000Z', data: {} },
      { id: 'empty-start', type: 'turn.started', threadId: 'thread-1', turnId: 'empty-turn', atIso: '2026-01-01T00:00:02.000Z', data: {} },
      { id: 'empty-interrupt', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'empty-turn', atIso: '2026-01-01T00:00:03.000Z', data: {} },
    ])

    const stopped = conversationTranscriptFromState(state).filter((message) => message.messageType === 'turn.interrupted')
    expect(stopped).toEqual([expect.objectContaining({ turnId: 'visible-turn', text: 'Stopped' })])
    expect(state.turns['empty-turn']).toMatchObject({ lifecycle: 'interrupted' })
  })

  it('keeps orphaned maintenance terminals in diagnostics but out of the transcript', () => {
    const base = { threadId: 'thread-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'completed-start', type: 'turn.started', turnId: 'completed-turn', data: {} },
      { ...base, id: 'completed', type: 'turn.completed', turnId: 'completed-turn', atIso: '2026-01-01T00:00:01.000Z', data: { durationMs: 1_000 } },
      { ...base, id: 'failed-start', type: 'turn.started', turnId: 'failed-turn', atIso: '2026-01-01T00:00:02.000Z', data: {} },
      { ...base, id: 'failed', type: 'turn.failed', turnId: 'failed-turn', atIso: '2026-01-01T00:00:03.000Z', data: { error: 'maintenance failed' } },
    ])

    expect(state.turns['completed-turn']).toMatchObject({ lifecycle: 'completed' })
    expect(state.turns['failed-turn']).toMatchObject({ lifecycle: 'failed', error: 'maintenance failed' })
    expect(conversationTranscriptFromState(state)).not.toContainEqual(expect.objectContaining({ turnId: 'completed-turn' }))
    expect(conversationTranscriptFromState(state)).not.toContainEqual(expect.objectContaining({ turnId: 'failed-turn' }))
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

  it('uses the timeline as the single visible owner of live reasoning', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', itemId: 'reasoning-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'reasoning', type: 'reasoning.delta', data: { text: 'Inspecting' } },
    ])

    expect(state.timeline).toContainEqual(expect.objectContaining({ kind: 'reasoning', text: 'Inspecting' }))
    expect(conversationLiveOverlayFromState(state)?.reasoningText).toBeUndefined()
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
    expect(conversationLiveOverlayFromState(failed)).toBeNull()
    expect(conversationTranscriptFromState(failed)).toContainEqual(expect.objectContaining({
      turnId: 'turn-1',
      messageType: 'turn.failed',
      text: 'network failed',
    }))
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

  it('reconciles a completed assistant overlay with its durable transcript row', () => {
    const base = { threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-01-01T00:00:00.000Z' }
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { ...base, id: 'start', type: 'turn.started', data: {} },
      { ...base, id: 'answer', itemId: 'agent-1', type: 'assistant.completed', data: { text: 'Same answer' } },
      { ...base, id: 'done', type: 'turn.completed', atIso: '2026-01-01T00:00:02.000Z', data: {} },
    ])
    const persisted = conversationTranscriptFromState(state)
    const overlay = conversationOverlayMessagesFromState(state)
    const displayed = compactConversationMessages([
      ...persisted,
      ...removeRedundantLiveAssistantMessages(overlay, persisted),
    ])

    expect(displayed.filter((message) => message.role === 'assistant')).toEqual([
      expect.objectContaining({ id: 'agent:agent-1', turnId: 'turn-1', text: 'Same answer' }),
    ])
    expect(displayed.filter((message) => message.messageType === 'worked')).toHaveLength(1)
  })

  it('reconciles terminal overlays with a differently named durable item in the same turn', () => {
    const persisted = [{ id: 'msg_9', turnId: 'turn-1', role: 'assistant' as const, text: 'Same answer' }]
    const overlay = [{ id: 'agent:item-9', turnId: 'turn-1', role: 'assistant' as const, text: 'Same answer', messageType: 'agentMessage' }]

    expect(removeRedundantLiveAssistantMessages(overlay, persisted)).toEqual([])
    expect(reconcilePersistedMessages(overlay, persisted)).toEqual(persisted)
  })

  it('reconciles a terminal realtime assistant arriving after durable history', () => {
    const persisted = [{ id: 'msg_9', turnId: 'turn-1', role: 'assistant' as const, text: 'Same answer' }]
    const terminalRealtime = [{ id: 'agent:item-9', turnId: 'turn-1', role: 'assistant' as const, text: 'Same answer', messageType: 'agentMessage' }]

    expect(mergeMessages(persisted, terminalRealtime, { preserveMissing: true })).toEqual(persisted)
  })

  it('reconciles repeated terminal text one-to-one within a turn', () => {
    const persisted = [
      { id: 'msg_1', turnId: 'turn-1', role: 'assistant' as const, text: 'Repeated answer' },
      { id: 'msg_2', turnId: 'turn-1', role: 'assistant' as const, text: 'Repeated answer' },
    ]
    const overlays = [
      { id: 'agent:item-1', turnId: 'turn-1', role: 'assistant' as const, text: 'Repeated answer', messageType: 'agentMessage' },
      { id: 'agent:item-2', turnId: 'turn-1', role: 'assistant' as const, text: 'Repeated answer', messageType: 'agentMessage' },
      { id: 'agent:item-3', turnId: 'turn-1', role: 'assistant' as const, text: 'Repeated answer', messageType: 'agentMessage' },
    ]

    expect(removeRedundantLiveAssistantMessages(overlays, persisted)).toEqual([overlays[2]])
  })

  it('preserves identical assistant text when it belongs to different turns', () => {
    const persisted = [{ id: 'agent:old', turnId: 'turn-old', role: 'assistant' as const, text: 'Same answer' }]
    const overlay = [{
      id: 'live:new', turnId: 'turn-new', role: 'assistant' as const, text: 'Same answer', messageType: 'agentMessage.live',
    }]

    expect(removeRedundantLiveAssistantMessages(overlay, persisted)).toEqual(overlay)
  })

  it('preserves a terminal overlay when only another turn has the same text', () => {
    const persisted = [{ id: 'msg_old', turnId: 'turn-old', role: 'assistant' as const, text: 'Same answer' }]
    const overlay = [{
      id: 'agent:item-new', turnId: 'turn-new', role: 'assistant' as const, text: 'Same answer', messageType: 'agentMessage',
    }]

    expect(removeRedundantLiveAssistantMessages(overlay, persisted)).toEqual(overlay)
    expect(reconcilePersistedMessages(overlay, persisted)).toEqual([...overlay, ...persisted])
  })

  it('reconciles replayed terminal overlays against a multi-turn history snapshot', () => {
    const persisted = [
      { id: 'msg_older', turnId: 'turn-older', role: 'assistant' as const, text: 'Repeated answer' },
      { id: 'msg_latest', turnId: 'turn-latest', role: 'assistant' as const, text: 'Repeated answer' },
    ]
    const replayedOverlays = [
      { id: 'agent:item-older', turnId: 'turn-older', role: 'assistant' as const, text: 'Repeated answer', messageType: 'agentMessage' },
      { id: 'agent:item-latest', turnId: 'turn-latest', role: 'assistant' as const, text: 'Repeated answer', messageType: 'agentMessage' },
    ]

    expect(reconcilePersistedMessages(replayedOverlays, persisted)).toEqual(persisted)
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
      ['agentMessage', 'Done'],
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
