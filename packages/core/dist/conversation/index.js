export function dataAuthorityFor(method) {
    if (method === 'turn/plan/updated')
        return 'replace-snapshot';
    if (method === 'thread/tokenUsage/updated')
        return 'apply-delta-then-reconcile';
    if (method === 'account/rateLimits/updated' || method === 'thread/started')
        return 'invalidate';
    if (/^item\/(agentMessage|reasoning|plan)\/(delta|textDelta|summaryTextDelta)$/u.test(method))
        return 'overlay';
    if (/^(turn|item)\//u.test(method))
        return 'invalidate';
    return 'ignore';
}
export function normalizeMessageText(value) {
    return value.replace(/\s+/gu, ' ').trim();
}
function skillIdentity(message) {
    return (message.skills ?? []).map((skill) => `${skill.name}\u0000${skill.path}`).join('\u0001');
}
function imageIdentity(message) {
    return (message.images ?? []).map((image) => image.trim()).join('\u0001');
}
function userIdentity(message) {
    return `${normalizeMessageText(message.text)}\u0000${imageIdentity(message)}\u0000${skillIdentity(message)}`;
}
function isOptimistic(message) {
    return message.role === 'user' && message.messageType === 'userMessage.optimistic';
}
function isLiveAssistant(message) {
    return message.role === 'assistant'
        && (message.messageType === 'agentMessage.live' || message.messageType === 'plan.live');
}
function reconcilesLiveAssistant(live, persisted) {
    if (!isLiveAssistant(live) || persisted.role !== 'assistant')
        return false;
    if (!live.turnId || live.turnId !== persisted.turnId)
        return false;
    const liveText = normalizeMessageText(live.text);
    const persistedText = normalizeMessageText(persisted.text);
    if (!liveText || !persistedText)
        return false;
    return liveText === persistedText || persistedText.startsWith(liveText);
}
function isSameUserMessage(first, second) {
    return first.role === 'user' && second.role === 'user' && userIdentity(first) === userIdentity(second);
}
function sameMessage(first, second) {
    return first.id === second.id && first.turnId === second.turnId && first.role === second.role && first.text === second.text
        && first.messageType === second.messageType && imageIdentity(first) === imageIdentity(second) && skillIdentity(first) === skillIdentity(second)
        && JSON.stringify(first.tool ?? null) === JSON.stringify(second.tool ?? null);
}
export function mergeMessages(previous, incoming, options = {}) {
    const dedupedIncoming = incoming.filter((message, index, rows) => rows.findIndex((row) => row.id === message.id) === index);
    const byIncomingId = new Map(dedupedIncoming.map((message) => [message.id, message]));
    const consumed = new Set();
    const merged = previous.map((oldMessage) => {
        const exact = byIncomingId.get(oldMessage.id);
        if (exact) {
            consumed.add(exact.id);
            return sameMessage(oldMessage, exact) ? oldMessage : exact;
        }
        if (isOptimistic(oldMessage)) {
            const persisted = dedupedIncoming.find((message) => !consumed.has(message.id) && !isOptimistic(message) && isSameUserMessage(oldMessage, message));
            if (persisted) {
                consumed.add(persisted.id);
                return persisted;
            }
        }
        if (oldMessage.role === 'user' && oldMessage.turnId) {
            const replay = dedupedIncoming.find((message) => !consumed.has(message.id) && message.turnId === oldMessage.turnId && isSameUserMessage(oldMessage, message));
            if (replay) {
                consumed.add(replay.id);
                return replay;
            }
        }
        if (isLiveAssistant(oldMessage)) {
            const persisted = dedupedIncoming.find((message) => !consumed.has(message.id) && reconcilesLiveAssistant(oldMessage, message));
            if (persisted) {
                consumed.add(persisted.id);
                return persisted;
            }
        }
        return oldMessage;
    });
    const appended = dedupedIncoming.filter((message) => {
        if (consumed.has(message.id) || previous.some((previousMessage) => previousMessage.id === message.id))
            return false;
        if (message.role === 'user' && merged.some((existing) => existing.turnId === message.turnId && isSameUserMessage(existing, message)))
            return false;
        return true;
    });
    const next = options.preserveMissing ? [...merged, ...appended] : dedupedIncoming;
    const result = [];
    for (const message of next) {
        const previousMessage = result.at(-1);
        if (previousMessage && isSameUserMessage(previousMessage, message)) {
            if (isOptimistic(previousMessage) && !isOptimistic(message))
                result[result.length - 1] = message;
            continue;
        }
        result.push(message);
    }
    return result;
}
export function upsertLiveDelta(messages, input) {
    if (!input.messageId || !input.textDelta)
        return messages;
    const index = messages.findIndex((message) => message.id === input.messageId);
    if (index >= 0) {
        const next = [...messages];
        next[index] = {
            ...next[index],
            ...(input.turnId ? { turnId: input.turnId } : {}),
            text: `${next[index].text}${input.textDelta}`,
            messageType: input.messageType,
        };
        return next;
    }
    return [...messages, {
            id: input.messageId, turnId: input.turnId, role: 'assistant', text: input.textDelta, messageType: input.messageType,
        }];
}
export function reconcilePersistedMessages(messages, persisted) {
    const withoutRedundantLive = messages.filter((message) => {
        if (message.messageType !== 'agentMessage.live' && message.messageType !== 'plan.live')
            return true;
        return !persisted.some((item) => item.id === message.id || (item.role === 'assistant' && normalizeMessageText(item.text) === normalizeMessageText(message.text)));
    });
    return mergeMessages(withoutRedundantLive, persisted, { preserveMissing: true });
}
export function toolStatusTone(status) {
    if (/fail|error|cancel|reject/iu.test(status))
        return 'danger';
    if (/complete|success|done|approved/iu.test(status))
        return 'success';
    if (/run|start|pending|wait/iu.test(status))
        return 'running';
    return 'neutral';
}
export function previewToolOutput(output, maxLines = 80, maxChars = 12_000) {
    const lines = output.split(/\r?\n/u);
    const constrained = lines.slice(0, maxLines).join('\n').slice(0, maxChars);
    return { text: constrained, truncated: constrained.length < output.length || lines.length > maxLines };
}
export function formatTurnDuration(durationMs) {
    if (!Number.isFinite(durationMs) || durationMs <= 0)
        return '<1s';
    const totalSeconds = Math.max(1, Math.round(durationMs / 1_000));
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours > 0)
        parts.push(`${String(hours)}h`);
    if (minutes > 0 || hours > 0)
        parts.push(`${String(minutes)}m`);
    parts.push(`${String(seconds > 0 || parts.length === 0 ? seconds : 0)}s`);
    return parts.join(' ');
}
export function groupConsecutiveFileChanges(messages) {
    const groups = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        if (message?.tool?.kind !== 'fileChange')
            continue;
        const group = [message];
        for (let cursor = index + 1; messages[cursor]?.tool?.kind === 'fileChange'; cursor += 1)
            group.push(messages[cursor]);
        groups.push({ firstIndex: index, messages: group });
        index += group.length - 1;
    }
    return groups;
}
export const DEFAULT_VISIBLE_MESSAGE_COUNT = 80;
export const MESSAGE_HISTORY_PAGE_SIZE = 80;
export function normalizedVisibleMessageCount(messageCount, requestedCount) {
    const normalizedMessageCount = Math.max(Math.trunc(messageCount), 0);
    const normalizedRequestedCount = Math.max(Math.trunc(requestedCount), DEFAULT_VISIBLE_MESSAGE_COUNT);
    return Math.min(normalizedRequestedCount, normalizedMessageCount);
}
export function visibleMessageStartIndex(messageCount, visibleCount) {
    return Math.max(Math.trunc(messageCount) - Math.max(Math.trunc(visibleCount), 0), 0);
}
export function hiddenMessageCount(messageCount, visibleCount) {
    return visibleMessageStartIndex(messageCount, visibleCount);
}
export function nextVisibleMessageCount(messageCount, visibleCount, pageSize = MESSAGE_HISTORY_PAGE_SIZE) {
    const nextCount = Math.max(Math.trunc(visibleCount), 0) + Math.max(Math.trunc(pageSize), 1);
    return normalizedVisibleMessageCount(messageCount, nextCount);
}
export function buildConversationScrollMetrics(params) {
    const maxScrollTop = Math.max(params.scrollHeight - params.clientHeight, 0);
    const scrollRatio = maxScrollTop > 0
        ? Math.min(Math.max(params.scrollTop / maxScrollTop, 0), 1)
        : 1;
    const distanceFromBottom = params.scrollHeight - (params.scrollTop + params.clientHeight);
    return {
        maxScrollTop,
        scrollRatio,
        isAtBottom: distanceFromBottom <= params.bottomThresholdPx,
    };
}
export function buildConversationScrollState(params) {
    const metrics = buildConversationScrollMetrics(params);
    return {
        scrollTop: params.scrollTop,
        isAtBottom: metrics.isAtBottom,
        scrollRatio: metrics.scrollRatio,
    };
}
export function restoredConversationScrollTop(savedState, maxScrollTop) {
    const targetScrollTop = typeof savedState.scrollRatio === 'number'
        ? savedState.scrollRatio * maxScrollTop
        : savedState.scrollTop;
    return Math.min(Math.max(targetScrollTop, 0), maxScrollTop);
}
export function preservedConversationScrollTop(savedState, maxScrollTop) {
    return Math.min(Math.max(savedState.scrollTop, 0), maxScrollTop);
}
export function shouldRestoreConversationToBottom(scrollState) {
    return !scrollState || scrollState.isAtBottom;
}
export function shouldPreserveConversationViewport(scrollState) {
    return scrollState?.isAtBottom === false;
}
export function normalizedConversationBottomLockFrames(frames) {
    return Math.max(Math.trunc(frames), 1);
}
export function shouldLockConversationToBottom(scrollState) {
    return shouldRestoreConversationToBottom(scrollState);
}
const MAX_APPLIED_EVENT_IDS = 10_000;
function eventText(data, fallback = '') {
    const value = data.text ?? data.error ?? data.message;
    return typeof value === 'string' ? value : fallback;
}
function eventTool(data) {
    const value = data.tool;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const tool = value;
        return {
            kind: typeof tool.kind === 'string' ? tool.kind : 'tool',
            title: typeof tool.title === 'string' ? tool.title : 'Agent tool',
            status: typeof tool.status === 'string' ? tool.status : 'unknown',
            summary: typeof tool.summary === 'string' ? tool.summary : '',
            details: Array.isArray(tool.details) ? tool.details.filter((row) => typeof row === 'string') : [],
            ...(typeof tool.output === 'string' ? { output: tool.output } : {}),
            ...(typeof tool.outputLabel === 'string' ? { outputLabel: tool.outputLabel } : {}),
        };
    }
    return { kind: 'tool', title: 'Agent tool', status: 'unknown', summary: '', details: [] };
}
function appendUniqueOutput(previous, incoming) {
    if (!incoming)
        return previous;
    if (!previous)
        return incoming;
    if (previous.includes(incoming))
        return previous;
    return `${previous}${previous.endsWith('\n') ? '' : '\n'}${incoming}`;
}
function upsertTimelineTool(timeline, event, phase) {
    const incoming = eventTool(event.data);
    const key = toolTimelineId(event, incoming);
    const index = timeline.findIndex((entry) => entry.kind === 'tool' && entry.id === key);
    const status = incoming.status && incoming.status !== 'unknown'
        ? incoming.status
        : phase === 'started' ? 'running' : phase === 'completed' ? 'completed' : 'running';
    if (index < 0) {
        return [...timeline, { id: key, kind: 'tool', turnId: event.turnId, itemId: event.itemId, tool: { ...incoming, status } }];
    }
    const current = timeline[index];
    if (!current || current.kind !== 'tool')
        return timeline;
    const next = [...timeline];
    next[index] = {
        ...current,
        tool: {
            ...current.tool,
            ...incoming,
            status,
            details: [...new Set([...current.tool.details, ...incoming.details])],
            output: appendUniqueOutput(current.tool.output, incoming.output),
        },
    };
    return next;
}
function toolTimelineId(event, tool = eventTool(event.data)) {
    // Codex emits both item/fileChange/* and turn/diff/updated for the same turn.
    // They are two views of one operation, not two user-facing tools.
    if (tool.kind === 'fileChange' && event.turnId)
        return `tool:fileChange:${event.turnId}`;
    return `tool:${event.itemId || event.id}`;
}
function terminalizeTurnTools(timeline, turnId, status) {
    let changed = false;
    const next = timeline.map((entry) => {
        if (entry.kind !== 'tool' || entry.turnId !== turnId || !/run|start|pending|wait|unknown/iu.test(entry.tool.status))
            return entry;
        changed = true;
        return { ...entry, tool: { ...entry.tool, status } };
    });
    return changed ? next : timeline;
}
function updateTurn(state, event, lifecycle) {
    const turnId = event.turnId || state.activeTurnId;
    if (!turnId)
        return state;
    const current = state.turns[turnId];
    if ((current?.lifecycle === 'completed' || current?.lifecycle === 'failed' || current?.lifecycle === 'interrupted')
        && (lifecycle === 'completed' || lifecycle === 'failed' || lifecycle === 'interrupted'))
        return state;
    const terminal = lifecycle === 'completed' || lifecycle === 'failed' || lifecycle === 'interrupted';
    const error = lifecycle === 'failed' ? eventText(event.data, 'Codex failed to complete this turn.') : undefined;
    const retryMessage = lifecycle === 'retrying' ? eventText(event.data, 'Reconnecting…') : undefined;
    return {
        ...state,
        activeTurnId: terminal
            ? (state.activeTurnId === turnId ? '' : state.activeTurnId)
            : turnId,
        turns: {
            ...state.turns,
            [turnId]: {
                id: turnId,
                lifecycle,
                startedAtIso: current?.startedAtIso ?? (lifecycle === 'running' ? event.atIso : undefined),
                ...(terminal ? { completedAtIso: event.atIso } : {}),
                ...(retryMessage ? { retryMessage } : {}),
                ...(error ? { error } : {}),
            },
        },
    };
}
export function createConversationState(threadId = '') {
    return {
        threadId,
        activeTurnId: '',
        turns: {},
        messages: [],
        timeline: [],
        reasoningText: '',
        plan: null,
        pendingRequests: [],
        connection: { status: 'connected', message: '', updatedAtIso: new Date(0).toISOString() },
        history: {
            loading: false,
            hasMore: false,
            cursor: null,
            requestRevision: 0,
            error: '',
            loadedAtIso: '',
        },
        presentation: [],
        appliedEventIds: [],
    };
}
function appendPresentation(presentation, ref, replace) {
    const replacementIndex = replace ? presentation.findIndex(replace) : -1;
    if (replacementIndex >= 0) {
        const next = [...presentation];
        next[replacementIndex] = ref;
        return next.filter((row, index) => row.id !== ref.id || index === replacementIndex);
    }
    if (presentation.some((row) => row.kind === ref.kind && row.id === ref.id))
        return presentation;
    return [...presentation, ref];
}
/** Applies normalized live and history events through the same deterministic state transition path. */
export function reduceConversationEvent(previous, event) {
    if (!event.id || previous.appliedEventIds.includes(event.id))
        return previous;
    let state = {
        ...previous,
        threadId: event.threadId || previous.threadId,
        appliedEventIds: [...previous.appliedEventIds, event.id].slice(-MAX_APPLIED_EVENT_IDS),
    };
    if (event.type === 'thread.attached' || event.type === 'runtime.connected') {
        return { ...state, connection: { status: 'connected', message: '', updatedAtIso: event.atIso } };
    }
    if (event.type === 'runtime.disconnected') {
        return { ...state, activeTurnId: '', connection: { status: 'disconnected', message: eventText(event.data), updatedAtIso: event.atIso } };
    }
    if (event.type === 'turn.started')
        return updateTurn(state, event, 'running');
    if (event.type === 'turn.retrying')
        return updateTurn(state, event, 'retrying');
    if (event.type === 'turn.completed') {
        const updated = updateTurn(state, event, 'completed');
        const turnId = event.turnId || state.activeTurnId;
        if (!turnId)
            return updated;
        const timeline = terminalizeTurnTools(updated.timeline, turnId, 'completed');
        const presentation = event.data.durationKnown === false
            ? updated.presentation
            : appendPresentation(updated.presentation, { id: `worked:${turnId}`, kind: 'worked', turnId });
        return { ...updated, timeline, presentation };
    }
    if (event.type === 'turn.failed') {
        const updated = updateTurn(state, event, 'failed');
        const turnId = event.turnId || state.activeTurnId;
        return turnId
            ? { ...updated, timeline: terminalizeTurnTools(updated.timeline, turnId, 'failed'), presentation: appendPresentation(updated.presentation, { id: `failure:${turnId}`, kind: 'failure', turnId }) }
            : updated;
    }
    if (event.type === 'turn.interrupted') {
        const updated = updateTurn(state, event, 'interrupted');
        const turnId = event.turnId || state.activeTurnId;
        return turnId
            ? { ...updated, timeline: terminalizeTurnTools(updated.timeline, turnId, 'cancelled'), presentation: appendPresentation(updated.presentation, { id: `interrupted:${turnId}`, kind: 'interrupted', turnId }) }
            : updated;
    }
    if (event.type === 'user.completed') {
        const text = eventText(event.data);
        const images = Array.isArray(event.data.images) ? event.data.images.filter((value) => typeof value === 'string') : [];
        const skills = Array.isArray(event.data.skills)
            ? event.data.skills.filter((value) => {
                if (!value || typeof value !== 'object')
                    return false;
                const row = value;
                return typeof row.name === 'string' && typeof row.path === 'string';
            })
            : [];
        const messageId = `user:${event.itemId || event.id}`;
        return {
            ...state,
            messages: mergeMessages(state.messages, [{
                    id: messageId,
                    turnId: event.turnId,
                    role: 'user',
                    text,
                    ...(images.length ? { images } : {}),
                    ...(skills.length ? { skills } : {}),
                    ...(event.data.optimistic === true ? { messageType: 'userMessage.optimistic' } : {}),
                }], { preserveMissing: true }),
            presentation: appendPresentation(state.presentation, { id: messageId, kind: 'message', turnId: event.turnId }, (row) => row.kind === 'message' && row.turnId === event.turnId && row.id.startsWith('user:')),
        };
    }
    if (event.type === 'assistant.delta') {
        const messageId = `live:${event.itemId || event.turnId || event.id}`;
        return {
            ...state,
            messages: upsertLiveDelta(state.messages, {
                messageId,
                textDelta: eventText(event.data),
                turnId: event.turnId,
                messageType: 'agentMessage.live',
            }),
            presentation: appendPresentation(state.presentation, { id: messageId, kind: 'message', turnId: event.turnId }),
        };
    }
    if (event.type === 'assistant.completed') {
        const text = eventText(event.data);
        if (!text)
            return state;
        const messageId = `agent:${event.itemId || event.id}`;
        return {
            ...state,
            messages: mergeMessages(state.messages, [{
                    id: messageId,
                    turnId: event.turnId,
                    role: 'assistant',
                    text,
                }], { preserveMissing: true }),
            presentation: appendPresentation(state.presentation, { id: messageId, kind: 'message', turnId: event.turnId }, (row) => row.kind === 'message' && row.turnId === event.turnId && row.id.startsWith('live:')),
        };
    }
    if (event.type === 'reasoning.delta') {
        const delta = eventText(event.data);
        const itemId = event.itemId || event.id;
        const index = state.timeline.findIndex((entry) => entry.kind === 'reasoning' && entry.itemId === itemId);
        const timeline = [...state.timeline];
        if (index < 0)
            timeline.push({ id: `reasoning:${itemId}`, kind: 'reasoning', turnId: event.turnId, itemId, text: delta });
        else {
            const current = timeline[index];
            if (current?.kind === 'reasoning')
                timeline[index] = { ...current, text: `${current.text}${delta}` };
        }
        return {
            ...state,
            reasoningText: `${state.reasoningText}${delta}`,
            timeline,
            presentation: appendPresentation(state.presentation, { id: `reasoning:${itemId}`, kind: 'timeline', turnId: event.turnId }),
        };
    }
    if (event.type === 'reasoning.break') {
        return state.reasoningText && !state.reasoningText.endsWith('\n\n')
            ? { ...state, reasoningText: `${state.reasoningText}\n\n` }
            : state;
    }
    if (event.type === 'plan.delta' || event.type === 'plan.replaced') {
        const text = eventText(event.data);
        const planId = `plan:${event.turnId || 'current'}`;
        return {
            ...state,
            plan: {
                turnId: event.turnId,
                text: event.type === 'plan.delta' ? `${state.plan?.text ?? ''}${text}` : text,
                raw: event.data.raw ?? event.data,
                updatedAtIso: event.atIso,
            },
            presentation: appendPresentation(state.presentation, { id: planId, kind: 'plan', turnId: event.turnId }, (row) => row.kind === 'plan' && row.turnId === event.turnId),
        };
    }
    if (event.type === 'tool.started' || event.type === 'tool.updated' || event.type === 'fileChange.updated' || event.type === 'tool.completed') {
        const phase = event.type === 'tool.started' ? 'started' : event.type === 'tool.completed' ? 'completed' : 'updated';
        const toolId = toolTimelineId(event);
        return {
            ...state,
            timeline: upsertTimelineTool(state.timeline, event, phase),
            presentation: appendPresentation(state.presentation, { id: toolId, kind: 'timeline', turnId: event.turnId }),
        };
    }
    if (event.type === 'approval.requested' || event.type === 'question.requested') {
        const id = String(event.data.requestId ?? event.data.approvalId ?? event.id);
        if (state.pendingRequests.some((request) => request.id === id))
            return state;
        return {
            ...state,
            pendingRequests: [...state.pendingRequests, {
                    id,
                    kind: event.type === 'approval.requested' ? 'approval' : 'question',
                    threadId: event.threadId,
                    turnId: event.turnId,
                    itemId: event.itemId,
                    method: typeof event.data.method === 'string' ? event.data.method : '',
                    params: event.data.params ?? event.data,
                    requestedAtIso: event.atIso,
                }],
            presentation: appendPresentation(state.presentation, { id: `request:${id}`, kind: 'request', turnId: event.turnId }),
        };
    }
    if (event.type === 'approval.resolved' || event.type === 'question.resolved') {
        const id = String(event.data.requestId ?? event.data.approvalId ?? '');
        return id ? { ...state, pendingRequests: state.pendingRequests.filter((request) => request.id !== id) } : state;
    }
    return state;
}
export function reduceConversationEvents(initial, events) {
    return events.reduce(reduceConversationEvent, initial);
}
//# sourceMappingURL=index.js.map