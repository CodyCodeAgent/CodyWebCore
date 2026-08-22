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
        next[index] = { ...next[index], text: `${next[index].text}${input.textDelta}` };
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
//# sourceMappingURL=index.js.map