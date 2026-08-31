import { asRecord, readItemId, readString, readThreadId, readTurnId } from '../protocol/index.js';
import { codexTokenUsageFromPayload } from './token-usage.js';
export function textFromError(value) {
    if (typeof value === 'string')
        return value;
    const record = asRecord(value);
    if (!record)
        return '';
    return readString(record.message) || textFromError(record.error) || readString(record.additionalDetails);
}
function optionalBoolean(value) {
    return typeof value === 'boolean' ? value : undefined;
}
function retryAttemptFromText(text) {
    const match = /(?:reconnect(?:ing)?|retry(?:ing)?)\D{0,32}(\d+)\s*\/\s*(\d+)/iu.exec(text);
    if (!match)
        return null;
    const attempt = Number(match[1]);
    const limit = Number(match[2]);
    return Number.isFinite(attempt) && Number.isFinite(limit) && attempt >= 0 && limit > 0 ? { attempt, limit } : null;
}
function upstreamRetryState(params) {
    const error = asRecord(params.error);
    const errorInfo = asRecord(error?.codexErrorInfo ?? error?.codex_error_info);
    const message = textFromError(params.error ?? params);
    const retry = retryAttemptFromText(message);
    const willRetry = optionalBoolean(params.willRetry ?? params.will_retry);
    const terminalError = Boolean(errorInfo && (Object.hasOwn(errorInfo, 'responseTooManyFailedAttempts') || Object.hasOwn(errorInfo, 'response_too_many_failed_attempts')))
        || /\b(responseTooManyFailedAttempts|retry(?:ing)?\s+(?:has\s+)?(?:been\s+)?exhausted)\b/iu.test(message);
    // A reported bounded attempt is a terminal signal even when an older App
    // Server incorrectly leaves `willRetry: true` in the same payload. Without
    // this precedence a turn can remain "recovering" forever after 5/5.
    const exhausted = terminalError || willRetry === false || (retry !== null && retry.attempt >= retry.limit);
    return { willRetry, attempt: retry?.attempt ?? null, limit: retry?.limit ?? null, exhausted };
}
function isExplicitResponseStreamRecoveryWarning(message) {
    const transport = /response stream|websocket|web socket|https transport|network/iu.test(message);
    const recovery = /reconnect|re-connect|recover|fallback|falling back|interrupted/iu.test(message);
    return transport && recovery;
}
function readDelta(params) {
    return readString(params.delta) || readString(params.textDelta) || readString(params.text_delta)
        || readString(params.content) || readString(params.text);
}
function readNonNegativeNumber(value) {
    const numeric = typeof value === 'bigint' ? Number(value) : typeof value === 'string' ? Number(value.trim()) : value;
    return typeof numeric === 'number' && Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}
function timestampValueIso(value) {
    const numeric = typeof value === 'bigint' ? Number(value) : typeof value === 'string' && /^\d+(?:\.\d+)?$/u.test(value.trim()) ? Number(value) : null;
    if (typeof value === 'number' || numeric !== null) {
        const epoch = typeof value === 'number' ? value : numeric;
        if (!Number.isFinite(epoch) || epoch <= 0)
            return null;
        return new Date(epoch > 10_000_000_000 ? epoch : epoch * 1_000).toISOString();
    }
    if (typeof value !== 'string')
        return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
function payloadTimestampIso(row, camelKey, snakeKey) {
    return timestampValueIso(row?.[camelKey] ?? row?.[snakeKey]);
}
function itemId(item) {
    return readString(asRecord(item)?.id);
}
function itemType(item) {
    return readString(asRecord(item)?.type);
}
export function contentFromUserItem(item) {
    const content = Array.isArray(asRecord(item)?.content) ? asRecord(item).content : [];
    const texts = [];
    const images = [];
    const skills = [];
    for (const value of content) {
        const row = asRecord(value);
        const type = readString(row?.type);
        if (type === 'text')
            texts.push(readString(row?.text));
        else if (type === 'localImage')
            images.push(readString(row?.path));
        else if (type === 'image')
            images.push(readString(row?.url));
        else if (type === 'skill') {
            const name = readString(row?.name);
            const path = readString(row?.path);
            if (name && path)
                skills.push({ name, path });
        }
    }
    return { text: texts.filter(Boolean).join('\n'), images: images.filter(Boolean), skills };
}
export function outputText(value) {
    if (typeof value === 'string')
        return value;
    if (value == null)
        return '';
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
export function readCodexStatus(value) {
    if (typeof value === 'string')
        return value;
    return readString(asRecord(value)?.type);
}
function detailDuration(durationMs) {
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0)
        return '';
    if (durationMs < 1_000)
        return `${String(Math.round(durationMs))}ms`;
    const seconds = durationMs / 1_000;
    if (seconds < 60)
        return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
    return `${String(Math.floor(seconds / 60))}m ${String(Math.round(seconds % 60))}s`;
}
/** Canonical history/realtime tool view model for native Codex items. */
export function conversationToolFromItem(item, phase = 'completed') {
    const row = asRecord(item);
    const type = readString(row?.type);
    if (!row || !type)
        return null;
    const rawStatus = readCodexStatus(row.status);
    const failed = /fail|error|cancel|reject|declin/iu.test(rawStatus) || Boolean(row.error);
    const status = failed ? 'failed' : rawStatus || (phase === 'completed' ? 'completed' : 'running');
    if (type === 'commandExecution') {
        const command = readString(row.command);
        const output = readString(row.aggregatedOutput);
        const details = [readString(row.cwd) ? `cwd: ${readString(row.cwd)}` : '', `status: ${status}`];
        if (typeof row.exitCode === 'number')
            details.push(`exit: ${String(row.exitCode)}`);
        const duration = detailDuration(row.durationMs);
        if (duration)
            details.push(`duration: ${duration}`);
        return {
            kind: 'command', title: 'Command execution', status, summary: command,
            details: details.filter(Boolean), ...(output ? { output, outputLabel: 'Output' } : {}),
        };
    }
    if (type === 'fileChange') {
        const changes = Array.isArray(row.changes) ? row.changes : [];
        const details = changes.flatMap((change) => {
            const changeRow = asRecord(change);
            const path = readString(changeRow?.path);
            if (!path)
                return [];
            const kindRow = asRecord(changeRow?.kind);
            const kind = readCodexStatus(changeRow?.kind) || 'update';
            const movePath = readString(kindRow?.move_path) || readString(kindRow?.movePath);
            return [`${kind}: ${path}${movePath ? ` -> ${movePath}` : ''}`];
        });
        const output = changes.map((change) => readString(asRecord(change)?.diff)).filter(Boolean).join('\n\n');
        return {
            kind: 'fileChange', title: details.length > 1 ? `File changes · ${String(details.length)} files` : 'File changes',
            status, summary: `${String(changes.length)} file${changes.length === 1 ? '' : 's'} changed`, details: [`status: ${status}`, ...details],
            ...(output ? { output, outputLabel: 'Diff' } : {}),
        };
    }
    if (type === 'mcpToolCall') {
        const server = readString(row.server);
        const tool = readString(row.tool);
        const error = readString(asRecord(row.error)?.message);
        const output = error || outputText(row.result ?? row.arguments);
        const details = [`server: ${server || 'unknown'}`, `tool: ${tool || 'unknown'}`, `status: ${status}`];
        const duration = detailDuration(row.durationMs);
        if (duration)
            details.push(`duration: ${duration}`);
        if (error)
            details.push(`error: ${error}`);
        return {
            kind: 'mcp', title: 'MCP tool call', status: error ? 'failed' : status, summary: [server, tool].filter(Boolean).join('.'),
            details, ...(output ? { output, outputLabel: error ? 'Error' : 'Result' } : {}),
        };
    }
    if (type === 'dynamicToolCall') {
        const namespace = readString(row.namespace);
        const tool = readString(row.tool);
        const output = outputText(row.contentItems ?? row.arguments);
        const duration = detailDuration(row.durationMs);
        return {
            kind: 'dynamicTool', title: 'Dynamic tool call', status: row.success === false ? 'failed' : status,
            summary: [namespace, tool].filter(Boolean).join('.') || tool,
            details: [`tool: ${tool || 'unknown'}`, `status: ${status}`, ...(duration ? [`duration: ${duration}`] : [])],
            ...(output ? { output, outputLabel: 'Result' } : {}),
        };
    }
    if (type === 'collabAgentToolCall') {
        const tool = readCodexStatus(row.tool) || outputText(row.tool);
        const receivers = Array.isArray(row.receiverThreadIds) ? row.receiverThreadIds.map(String) : [];
        return {
            kind: 'collabAgent', title: 'Agent orchestration', status, summary: readString(row.prompt) || tool || 'Collaboration tool call',
            details: [`tool: ${tool || 'unknown'}`, `status: ${status}`, `sender: ${readString(row.senderThreadId) || 'unknown'}`, `receivers: ${receivers.join(', ') || 'none'}`],
            ...(row.agentsStates ? { output: outputText(row.agentsStates), outputLabel: 'Agent states' } : {}),
        };
    }
    if (type === 'subAgentActivity')
        return {
            kind: 'subAgent', title: 'Sub-agent activity', status: 'recorded', summary: readCodexStatus(row.kind),
            details: [`thread: ${readString(row.agentThreadId) || 'unknown'}`, `path: ${readString(row.agentPath) || 'unknown'}`],
        };
    if (type === 'webSearch') {
        const action = readCodexStatus(row.action) || outputText(row.action);
        return {
            kind: 'webSearch', title: 'Web search', status: action || 'recorded', summary: readString(row.query),
            details: action ? [`action: ${action}`] : [], ...(row.action ? { output: outputText(row.action), outputLabel: 'Search metadata' } : {}),
        };
    }
    if (type === 'imageView')
        return { kind: 'imageView', title: 'Image viewed', status: 'recorded', summary: readString(row.path), details: [`path: ${readString(row.path)}`] };
    if (type === 'imageGeneration')
        return {
            kind: 'imageGeneration', title: 'Image generation', status, summary: readString(row.prompt) || 'Generated image',
            details: [], ...(row.result ?? row.failure ? { output: outputText(row.result ?? row.failure), outputLabel: row.failure ? 'Error' : 'Result' } : {}),
        };
    if (type === 'sleep')
        return { kind: 'sleep', title: 'Wait', status, summary: readString(row.reason) || 'Waiting', details: [] };
    if (type === 'enteredReviewMode' || type === 'exitedReviewMode')
        return {
            kind: 'review', title: type === 'enteredReviewMode' ? 'Entered review mode' : 'Exited review mode',
            status: 'recorded', summary: readString(row.review), details: [`review: ${readString(row.review)}`],
        };
    if (type === 'contextCompaction')
        return { kind: 'context', title: 'Context compaction', status: 'recorded', summary: 'Context was compacted', details: [] };
    return null;
}
function itemEvents(input) {
    const type = itemType(input.item);
    const id = itemId(input.item);
    const common = { threadId: input.threadId, turnId: input.turnId, ...(id ? { itemId: id } : {}), atIso: input.atIso };
    if (type === 'userMessage' && input.phase === 'completed') {
        return [{ id: input.id('user'), type: 'user.completed', ...common, data: contentFromUserItem(input.item) }];
    }
    if (type === 'agentMessage' && input.phase === 'completed') {
        return [{ id: input.id('assistant'), type: 'assistant.completed', ...common, data: { text: readString(asRecord(input.item)?.text) } }];
    }
    if (type === 'plan' && input.phase === 'completed') {
        return [{ id: input.id('plan'), type: 'plan.replaced', ...common, data: { text: readString(asRecord(input.item)?.text), raw: input.item } }];
    }
    if (type === 'reasoning' && input.phase === 'completed') {
        const row = asRecord(input.item);
        const parts = [...(Array.isArray(row?.summary) ? row.summary : []), ...(Array.isArray(row?.content) ? row.content : [])].filter((value) => typeof value === 'string');
        return parts.length ? [{ id: input.id('reasoning'), type: 'reasoning.delta', ...common, data: { text: parts.join('\n\n') } }] : [];
    }
    const tool = conversationToolFromItem(input.item, input.phase);
    if (!tool)
        return [];
    return [{ id: input.id(`tool:${input.phase}`), type: input.phase === 'started' ? 'tool.started' : 'tool.completed', ...common, data: { tool, item: input.item } }];
}
function structuredPlan(params) {
    const parts = [];
    const explanation = readString(params.explanation);
    if (explanation)
        parts.push(explanation);
    const plan = Array.isArray(params.plan) ? params.plan : [];
    const steps = plan.flatMap((value) => {
        const row = asRecord(value);
        const step = readString(row?.step);
        if (!step)
            return [];
        const status = readString(row?.status);
        if (status !== 'pending' && status !== 'inProgress' && status !== 'completed')
            return [];
        return [{ step, status: status }];
    });
    if (steps.length)
        parts.push(steps.map((row, index) => {
            const marker = row.status === 'completed' ? '[done]' : row.status === 'inProgress' ? '[doing]' : '[todo]';
            return `${String(index + 1)}. ${marker} ${row.step}`;
        }).join('\n'));
    return { text: parts.join('\n\n'), explanation, steps };
}
function activityEvent(common, id, label) {
    return { id, type: 'turn.activity', ...common, data: { label, details: [] } };
}
/**
 * Converts one raw App Server notification into framework- and product-neutral
 * conversation events. This is the sole native notification interpretation
 * path used by the shared session manager and product adapters.
 */
export function normalizeCodexNotification(notification, options = {}) {
    const params = asRecord(notification.params) ?? {};
    const threadId = readThreadId(params) || options.fallbackThreadId || '';
    if (!threadId)
        return [];
    const turnId = readTurnId(params) || options.fallbackTurnId || '';
    const nativeItemId = readItemId(params);
    const atIso = notification.receivedAtIso || notification.atIso || options.nowIso?.() || new Date(0).toISOString();
    const id = (suffix, itemIdOverride = nativeItemId) => options.eventId?.({
        method: notification.method,
        suffix,
        threadId,
        turnId,
        itemId: itemIdOverride,
        atIso,
    }) ?? `notification:${notification.method}:${threadId}:${turnId}:${itemIdOverride}:${atIso}:${suffix}`;
    const common = {
        threadId,
        ...(turnId ? { turnId } : {}),
        ...(nativeItemId ? { itemId: nativeItemId } : {}),
        atIso,
    };
    if (notification.method === 'runtime/disconnected') {
        return [{ id: id('disconnected'), type: 'runtime.disconnected', ...common, data: {
                    error: textFromError(params.error ?? notification.params) || 'Codex App Server disconnected.',
                } }];
    }
    if (notification.method === 'turn/started') {
        const turn = asRecord(params.turn);
        const startedAtIso = payloadTimestampIso(turn, 'startedAt', 'started_at')
            ?? payloadTimestampIso(params, 'startedAt', 'started_at')
            ?? atIso;
        const startedCommon = { ...common, atIso: startedAtIso };
        return [
            { id: id('started'), type: 'turn.started', ...startedCommon, data: params },
            activityEvent(startedCommon, id('activity'), 'Thinking'),
        ];
    }
    if (notification.method === 'turn/completed') {
        const turn = asRecord(params.turn);
        const status = readString(turn?.status);
        const completedTurnId = readString(turn?.id) || turnId;
        const type = status === 'failed' ? 'turn.failed' : status === 'interrupted' || status === 'cancelled' ? 'turn.interrupted' : 'turn.completed';
        const completedAtIso = payloadTimestampIso(turn, 'completedAt', 'completed_at')
            ?? payloadTimestampIso(params, 'completedAt', 'completed_at')
            ?? atIso;
        const durationMs = readNonNegativeNumber(turn?.durationMs ?? turn?.duration_ms ?? params.durationMs ?? params.duration_ms);
        const items = Array.isArray(turn?.items) ? turn.items : [];
        const completedItems = items.flatMap((item, index) => itemEvents({
            id: (suffix) => id(`turn-item:${String(index)}:${suffix}`, itemId(item)),
            phase: 'completed',
            threadId,
            turnId: completedTurnId,
            item,
            atIso: completedAtIso,
        }));
        const usage = codexTokenUsageFromPayload(params);
        const usageEvents = usage ? [{
                id: id('context-usage'), type: 'thread.context.updated', ...common, atIso: completedAtIso,
                data: { turnId: completedTurnId, usedTokens: usage.totalTokens, ...usage },
            }] : [];
        return [...completedItems, ...usageEvents, {
                id: id('terminal'), type, ...common, atIso: completedAtIso, ...(completedTurnId ? { turnId: completedTurnId } : {}),
                data: type === 'turn.failed'
                    ? { error: textFromError(turn?.error), status, ...(durationMs !== null ? { durationMs } : {}), raw: params }
                    : { status, ...(durationMs !== null ? { durationMs } : {}), raw: params },
            }];
    }
    if (notification.method === 'turn/failed' || notification.method === 'turn/interrupted') {
        return [{
                id: id('terminal'),
                type: notification.method === 'turn/failed' ? 'turn.failed' : 'turn.interrupted',
                ...common,
                data: { error: textFromError(params.error ?? params), raw: params },
            }];
    }
    if (notification.method === 'error') {
        const error = textFromError(params.error ?? params) || 'Codex response stream failed.';
        const retry = upstreamRetryState(params);
        const retryData = {
            ...(retry.willRetry !== undefined ? { willRetry: retry.willRetry } : {}),
            ...(retry.attempt !== null ? { retryAttempt: retry.attempt } : {}),
            ...(retry.limit !== null ? { retryLimit: retry.limit } : {}),
            raw: params,
        };
        if (retry.exhausted) {
            return [{ id: id('disconnected'), type: 'turn.disconnected', ...common, data: {
                        error: `Codex 上游响应流恢复失败，未自动重发。${error}`,
                        cause: 'upstream_response_stream_unrecoverable',
                        ...retryData,
                    } }];
        }
        return [{ id: id('retrying'), type: 'turn.retrying', ...common, data: { error, ...retryData } }];
    }
    if (notification.method === 'warning' && turnId) {
        const warning = textFromError(params.message ?? params.error ?? params);
        if (isExplicitResponseStreamRecoveryWarning(warning)) {
            return [{ id: id('retrying'), type: 'turn.retrying', ...common, data: {
                        error: warning || 'Codex is retrying the response stream.',
                        willRetry: true,
                        raw: params,
                    } }];
        }
    }
    if (notification.method === 'item/agentMessage/delta') {
        return [
            { id: id('assistant-delta'), type: 'assistant.delta', ...common, data: { text: readDelta(params) } },
            activityEvent(common, id('activity'), 'Writing response'),
        ];
    }
    if (notification.method === 'item/reasoning/summaryTextDelta' || notification.method === 'item/reasoning/textDelta') {
        return [
            { id: id('reasoning-delta'), type: 'reasoning.delta', ...common, data: { text: readDelta(params) } },
            activityEvent(common, id('activity'), 'Thinking'),
        ];
    }
    if (notification.method === 'item/reasoning/summaryPartAdded') {
        return [
            { id: id('reasoning-break'), type: 'reasoning.break', ...common, data: {} },
            activityEvent(common, id('activity'), 'Thinking'),
        ];
    }
    if (notification.method === 'item/plan/delta') {
        return [
            { id: id('plan-delta'), type: 'plan.delta', ...common, data: { text: readDelta(params) } },
            activityEvent(common, id('activity'), 'Writing plan'),
        ];
    }
    if (notification.method === 'turn/plan/updated') {
        const plan = structuredPlan(params);
        return [
            { id: id('plan-replaced'), type: 'plan.replaced', ...common, data: { ...plan, raw: params } },
            activityEvent(common, id('activity'), 'Writing plan'),
        ];
    }
    if (notification.method === 'thread/tokenUsage/updated') {
        const usage = codexTokenUsageFromPayload(params);
        if (!usage)
            return [];
        return [{ id: id('context-usage'), type: 'thread.context.updated', ...common, data: {
                    turnId,
                    usedTokens: usage.totalTokens,
                    ...usage,
                } }];
    }
    if (notification.method === 'thread/compacted') {
        return [{ id: id('compacted'), type: 'thread.compacted', ...common, data: {} }];
    }
    if (notification.method === 'turn/diff/updated' || notification.method === 'item/fileChange/patchUpdated') {
        return [{ id: id('file-change'), type: 'fileChange.updated', ...common, data: {
                    tool: { kind: 'fileChange', title: 'File changes', status: 'running', summary: 'Diff updated', details: [], output: outputText(params.diff ?? params.patch) },
                    raw: params,
                } }];
    }
    if (notification.method === 'item/commandExecution/outputDelta' || notification.method === 'command/exec/outputDelta' || notification.method === 'process/outputDelta') {
        return [{ id: id('tool-output'), type: 'tool.updated', ...common, data: {
                    tool: { kind: 'command', title: 'Command execution', status: 'running', summary: '', details: [], output: readDelta(params) },
                    raw: params,
                } }];
    }
    if (notification.method === 'item/fileChange/outputDelta') {
        return [{ id: id('file-output'), type: 'fileChange.updated', ...common, data: {
                    tool: { kind: 'fileChange', title: 'File changes', status: 'running', summary: '', details: [], output: readDelta(params) },
                    raw: params,
                } }];
    }
    if (notification.method === 'item/started' || notification.method === 'item/completed') {
        const phase = notification.method === 'item/started' ? 'started' : 'completed';
        const item = params.item;
        const events = itemEvents({ id: (suffix) => id(suffix, itemId(item)), phase, threadId, turnId, item, atIso });
        if (phase !== 'started')
            return events;
        const itemType = readString(asRecord(item)?.type).toLowerCase();
        const label = itemType === 'reasoning' ? 'Thinking' : itemType === 'agentmessage' ? 'Writing response' : itemType === 'plan' ? 'Writing plan' : '';
        return label ? [...events, activityEvent(common, id('activity'), label)] : events;
    }
    return options.includeProviderExtensions
        ? [{ id: id('extension'), type: 'provider.extension', ...common, data: { method: notification.method, params } }]
        : [];
}
export function normalizeThreadHistory(payload, fallbackThreadId = '') {
    const thread = asRecord(asRecord(payload)?.thread) ?? asRecord(payload);
    const threadId = readString(thread?.id) || fallbackThreadId;
    const turns = Array.isArray(thread?.turns) ? thread.turns : [];
    const events = [];
    for (let turnIndex = 0; turnIndex < turns.length; turnIndex += 1) {
        const turn = asRecord(turns[turnIndex]);
        const turnId = readString(turn?.id) || `turn-${String(turnIndex)}`;
        const startedAtIso = timestampIso(turn?.startedAt);
        const completedAtIso = timestampIso(turn?.completedAt);
        const atIso = startedAtIso ?? completedAtIso ?? new Date(0).toISOString();
        const durationKnown = Boolean(startedAtIso && completedAtIso);
        events.push({ id: `history:${threadId}:${turnId}:started`, type: 'turn.started', threadId, turnId, atIso, data: { history: true, durationKnown } });
        const items = Array.isArray(turn?.items) ? turn.items : [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
            const item = items[itemIndex];
            const nativeItemId = itemId(item) || String(itemIndex);
            events.push(...itemEvents({
                id: (suffix) => `history:${threadId}:${turnId}:${nativeItemId}:${suffix}`,
                phase: 'completed', threadId, turnId, item, atIso,
            }));
        }
        const status = readString(turn?.status);
        if (status === 'failed' || status === 'interrupted' || status === 'completed') {
            const type = status === 'completed' ? 'turn.completed' : status === 'interrupted' ? 'turn.interrupted' : 'turn.failed';
            events.push({
                id: `history:${threadId}:${turnId}:terminal`, type, threadId, turnId, atIso: completedAtIso ?? atIso,
                data: type === 'turn.failed'
                    ? { error: textFromError(turn?.error) || 'Codex failed to complete this turn.', status, history: true, durationKnown }
                    : { status, history: true, durationKnown },
            });
        }
    }
    return events;
}
function timestampIso(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
        return undefined;
    return new Date(value * 1_000).toISOString();
}
//# sourceMappingURL=normalization.js.map