import { asRecord, readItemId, readString, readThreadId, readTurnId } from '../protocol/index.js';
import { createTypedCodexClient } from '../protocol/methods.js';
/** Builds the canonical Codex turn input sequence for every CodyWeb product. */
export function buildTurnUserInput(input) {
    const result = [];
    // The App Server attaches native Skill context in input order. Keep Skills
    // ahead of the user message so execution starts with that context available.
    for (const skill of input.skills ?? []) {
        const name = skill.name.trim();
        const path = skill.path.trim();
        if (name && path)
            result.push({ type: 'skill', name, path });
    }
    const text = input.text?.trim() ?? '';
    if (text)
        result.push({ type: 'text', text, text_elements: [] });
    for (const image of input.localImages ?? []) {
        const path = image.path.trim();
        if (path)
            result.push({ type: 'localImage', path, ...(image.detail ? { detail: image.detail } : {}) });
    }
    return result;
}
const DEFAULT_TURN_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const APPROVAL_METHODS = new Set([
    'item/commandExecution/requestApproval',
    'item/fileChange/requestApproval',
    'item/permissions/requestApproval',
    'applyPatchApproval',
    'execCommandApproval',
]);
const QUESTION_METHODS = new Set(['item/tool/requestUserInput']);
function textFromError(value) {
    if (typeof value === 'string')
        return value;
    const record = asRecord(value);
    if (!record)
        return '';
    return readString(record.message) || textFromError(record.error) || readString(record.additionalDetails);
}
function readDelta(params) {
    return readString(params.delta) || readString(params.textDelta) || readString(params.text_delta)
        || readString(params.content) || readString(params.text);
}
function readNonNegativeInteger(value) {
    if (typeof value === 'bigint') {
        const numeric = Number(value);
        return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
    }
    if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
        const numeric = Number(value);
        return Number.isSafeInteger(numeric) ? numeric : null;
    }
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function itemId(item) {
    return readString(asRecord(item)?.id);
}
function itemType(item) {
    return readString(asRecord(item)?.type);
}
function contentFromUserItem(item) {
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
function outputText(value) {
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
        return [
            { id: id('started'), type: 'turn.started', ...common, data: params },
            activityEvent(common, id('activity'), 'Thinking'),
        ];
    }
    if (notification.method === 'turn/completed') {
        const turn = asRecord(params.turn);
        const status = readString(turn?.status);
        const completedTurnId = readString(turn?.id) || turnId;
        const type = status === 'failed' ? 'turn.failed' : status === 'interrupted' || status === 'cancelled' ? 'turn.interrupted' : 'turn.completed';
        return [{
                id: id('terminal'), type, ...common, ...(completedTurnId ? { turnId: completedTurnId } : {}),
                data: type === 'turn.failed'
                    ? { error: textFromError(turn?.error), status, raw: params }
                    : { status, raw: params },
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
        const willRetry = params.willRetry === true || params.will_retry === true;
        return [{ id: id(willRetry ? 'retrying' : 'failed'), type: willRetry ? 'turn.retrying' : 'turn.failed', ...common, data: {
                    error: textFromError(params.error ?? params), willRetry, raw: params,
                } }];
    }
    if (notification.method === 'warning' && turnId) {
        return [{ id: id('retrying'), type: 'turn.retrying', ...common, data: {
                    error: textFromError(params.message ?? params.error ?? params) || 'Codex is retrying the response stream.',
                    willRetry: true,
                    raw: params,
                } }];
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
        const usage = asRecord(params.tokenUsage) ?? asRecord(params.token_usage);
        const last = asRecord(usage?.last);
        const usedTokens = readNonNegativeInteger(last?.totalTokens) ?? readNonNegativeInteger(last?.total_tokens);
        if (usedTokens === null)
            return [];
        return [{ id: id('context-usage'), type: 'thread.context.updated', ...common, data: {
                    turnId,
                    usedTokens,
                    inputTokens: readNonNegativeInteger(last?.inputTokens) ?? readNonNegativeInteger(last?.input_tokens) ?? 0,
                    contextWindow: readNonNegativeInteger(usage?.modelContextWindow) ?? readNonNegativeInteger(usage?.model_context_window),
                    autoCompactTokenLimit: readNonNegativeInteger(usage?.autoCompactTokenLimit) ?? readNonNegativeInteger(usage?.auto_compact_token_limit),
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
export class CodexSessionManager {
    options;
    sessions = new Map();
    sessionIdByThreadId = new Map();
    listeners = new Set();
    waiters = new Map();
    turnWatchdogs = new Map();
    terminalEvents = new Map();
    pendingRequests = new Map();
    client;
    nowIso;
    eventSequence = 0;
    unlisten = null;
    constructor(options) {
        this.options = options;
        this.client = createTypedCodexClient(options.host);
        this.nowIso = options.nowIso ?? (() => new Date().toISOString());
        this.unlisten = options.host.subscribe((notification) => { void this.handleNotification(notification); });
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    async create(bindingId, context) {
        await this.options.host.ensureInitialized();
        const result = await this.client.call('thread/start', {
            ...context.thread,
            experimentalRawEvents: context.thread.experimentalRawEvents ?? false,
        });
        const binding = { id: bindingId, threadId: result.thread.id };
        this.attachLocal(binding, context);
        this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId, mode: 'created' } });
        return binding;
    }
    async resume(binding, context) {
        await this.options.host.ensureInitialized();
        const params = {
            ...context.thread,
            threadId: binding.threadId,
        };
        await this.client.call('thread/resume', params);
        this.forgetTerminalEvents(binding.threadId);
        this.attachLocal(binding, context);
        this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId: binding.id, mode: 'resumed' } });
    }
    detach(bindingId) {
        const session = this.sessions.get(bindingId);
        if (!session)
            return;
        this.sessions.delete(bindingId);
        this.sessionIdByThreadId.delete(session.binding.threadId);
    }
    /** Updates product policy/settings for future turns without rebinding the native thread. */
    setContext(bindingId, context) {
        this.require(bindingId).context = context;
    }
    async read(bindingId) {
        const session = this.require(bindingId);
        await this.ensureSessionReady(session);
        const result = await this.client.call('thread/read', { threadId: session.binding.threadId, includeTurns: true });
        return normalizeThreadHistory(result, session.binding.threadId);
    }
    async send(bindingId, input, mode = 'queue') {
        const session = this.require(bindingId);
        await this.ensureSessionReady(session);
        if (mode === 'steer') {
            if (!session.activeTurnId)
                throw new Error('turn/steer requires an active turn');
            await this.client.call('turn/steer', { threadId: session.binding.threadId, expectedTurnId: session.activeTurnId, input: input.input });
            return { threadId: session.binding.threadId, turnId: session.activeTurnId };
        }
        let resolveStarted;
        let rejectStarted;
        const started = new Promise((resolve, reject) => { resolveStarted = resolve; rejectStarted = reject; });
        const execute = async () => {
            try {
                const result = await this.client.call('turn/start', {
                    ...(session.context.turn ?? {}),
                    threadId: session.binding.threadId,
                    input: input.input,
                    ...(input.model !== undefined ? { model: input.model } : {}),
                    ...(input.effort !== undefined ? { effort: input.effort } : {}),
                    ...(input.collaborationMode !== undefined ? { collaborationMode: input.collaborationMode } : {}),
                    ...(input.approvalPolicy !== undefined ? { approvalPolicy: input.approvalPolicy } : {}),
                    ...(input.approvalsReviewer !== undefined ? { approvalsReviewer: input.approvalsReviewer } : {}),
                    ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
                    ...(input.runtimeWorkspaceRoots !== undefined ? { runtimeWorkspaceRoots: input.runtimeWorkspaceRoots } : {}),
                    ...(input.sandboxPolicy !== undefined ? { sandboxPolicy: input.sandboxPolicy } : {}),
                });
                const handle = { threadId: session.binding.threadId, turnId: result.turn.id };
                session.activeTurnId = handle.turnId;
                this.emit({ type: 'user.completed', threadId: handle.threadId, turnId: handle.turnId, data: { ...contentFromInputs(input.input), optimistic: true } });
                resolveStarted(handle);
                await this.waitForTurn(handle);
            }
            catch (error) {
                rejectStarted(error);
                throw error;
            }
        };
        const scheduled = session.queueTail.catch(() => undefined).then(execute);
        session.queueTail = scheduled.catch(() => undefined);
        return started;
    }
    async run(bindingId, input, mode = 'queue') {
        const handle = await this.send(bindingId, input, mode);
        return { handle, terminalEvent: await this.waitForTurn(handle) };
    }
    async interrupt(bindingId) {
        const session = this.require(bindingId);
        await this.ensureSessionReady(session);
        if (!session.activeTurnId)
            return false;
        await this.client.call('turn/interrupt', { threadId: session.binding.threadId, turnId: session.activeTurnId });
        return true;
    }
    waitForTurn(handle) {
        const key = this.turnKey(handle.threadId, handle.turnId);
        const terminal = this.terminalEvents.get(key);
        if (terminal)
            return Promise.resolve(terminal);
        this.ensureTurnWatchdog(handle);
        return new Promise((resolve, reject) => {
            const rows = this.waiters.get(key) ?? [];
            rows.push({ resolve, reject });
            this.waiters.set(key, rows);
        });
    }
    async respondApproval(bindingId, requestId, decision) {
        const pending = this.requirePending(bindingId, requestId, 'approval');
        await this.options.host.resolveServerRequest(pending.request.id, { result: { decision } });
        this.pendingRequests.delete(requestId);
        this.emit({ type: 'approval.resolved', threadId: this.require(bindingId).binding.threadId, data: { requestId, decision } });
    }
    async respondQuestion(bindingId, requestId, answer) {
        const pending = this.requirePending(bindingId, requestId, 'question');
        const supplied = asRecord(answer);
        let answers;
        if (supplied && Object.values(supplied).every(value => Array.isArray(asRecord(value)?.answers))) {
            answers = supplied;
        }
        else {
            const params = asRecord(asRecord(pending.request.params)?.params ?? pending.request.params);
            const questions = Array.isArray(params?.questions) ? params.questions : [];
            const text = typeof answer === 'string' ? answer : outputText(answer);
            answers = Object.fromEntries(questions.flatMap((question, index) => {
                const id = readString(asRecord(question)?.id) || `question-${String(index + 1)}`;
                return [[id, { answers: [text] }]];
            }));
            if (Object.keys(answers).length === 0)
                answers = { answer: { answers: [text] } };
        }
        await this.options.host.resolveServerRequest(pending.request.id, { result: { answers } });
        this.pendingRequests.delete(requestId);
        this.emit({ type: 'question.resolved', threadId: this.require(bindingId).binding.threadId, data: { requestId } });
    }
    async dispose() {
        this.unlisten?.();
        this.unlisten = null;
        for (const watchdog of this.turnWatchdogs.values())
            clearTimeout(watchdog.timer);
        this.turnWatchdogs.clear();
        for (const rows of this.waiters.values())
            for (const waiter of rows)
                waiter.reject(new Error('Codex session manager disposed'));
        this.waiters.clear();
        this.sessions.clear();
        this.sessionIdByThreadId.clear();
    }
    attachLocal(binding, context) {
        const existingBindingId = this.sessionIdByThreadId.get(binding.threadId);
        if (existingBindingId && existingBindingId !== binding.id)
            throw new Error(`Codex thread ${binding.threadId} is already attached to ${existingBindingId}`);
        this.sessions.set(binding.id, { binding, context, activeTurnId: '', queueTail: Promise.resolve(), attached: true });
        this.sessionIdByThreadId.set(binding.threadId, binding.id);
    }
    require(bindingId) {
        const session = this.sessions.get(bindingId);
        if (!session)
            throw new Error(`Codex thread binding ${bindingId} is not attached`);
        return session;
    }
    async ensureSessionReady(session) {
        if (session.attached)
            return;
        await this.options.host.ensureInitialized();
        await this.client.call('thread/resume', {
            ...session.context.thread,
            threadId: session.binding.threadId,
        });
        this.forgetTerminalEvents(session.binding.threadId);
        session.attached = true;
        this.emit({ type: 'runtime.connected', threadId: session.binding.threadId, data: { resumed: true } });
    }
    forgetTerminalEvents(threadId) {
        const prefix = `${threadId}\u0000`;
        for (const key of this.terminalEvents.keys())
            if (key.startsWith(prefix))
                this.terminalEvents.delete(key);
    }
    requirePending(bindingId, requestId, kind) {
        const pending = this.pendingRequests.get(requestId);
        if (!pending || pending.bindingId !== bindingId || pending.kind !== kind)
            throw new Error(`No pending ${kind} request ${requestId}`);
        return pending;
    }
    eventId(method, threadId, turnId = '', itemId = '') {
        this.eventSequence += 1;
        return `live:${String(this.eventSequence)}:${method}:${threadId}:${turnId}:${itemId}`;
    }
    emit(input) {
        if ((input.type === 'turn.completed' || input.type === 'turn.failed' || input.type === 'turn.interrupted') && input.turnId) {
            const existing = this.terminalEvents.get(this.turnKey(input.threadId, input.turnId));
            if (existing)
                return existing;
        }
        const event = {
            ...input,
            id: input.id ?? this.eventId(input.type, input.threadId, input.turnId, input.itemId),
            atIso: input.atIso ?? this.nowIso(),
        };
        if (event.turnId && event.type !== 'turn.completed' && event.type !== 'turn.failed' && event.type !== 'turn.interrupted')
            this.refreshTurnInactivity(event.threadId, event.turnId);
        if (event.type === 'turn.completed' || event.type === 'turn.failed' || event.type === 'turn.interrupted')
            this.finishTurn(event);
        for (const listener of this.listeners)
            listener(event);
        return event;
    }
    finishTurn(event) {
        if (!event.turnId)
            return;
        const key = this.turnKey(event.threadId, event.turnId);
        if (this.terminalEvents.has(key))
            return;
        this.terminalEvents.set(key, event);
        const bindingId = this.sessionIdByThreadId.get(event.threadId);
        const session = bindingId ? this.sessions.get(bindingId) : undefined;
        if (session?.activeTurnId === event.turnId)
            session.activeTurnId = '';
        const rows = this.waiters.get(key) ?? [];
        this.waiters.delete(key);
        this.clearTurnWatchdog(key);
        for (const waiter of rows)
            waiter.resolve(event);
    }
    ensureTurnWatchdog(handle) {
        const key = this.turnKey(handle.threadId, handle.turnId);
        if (this.turnWatchdogs.has(key))
            return;
        const watchdog = {
            handle,
            timer: undefined,
            inactivityTimeoutMs: Math.max(250, this.options.turnInactivityTimeoutMs ?? DEFAULT_TURN_INACTIVITY_TIMEOUT_MS),
        };
        this.turnWatchdogs.set(key, watchdog);
        this.armTurnWatchdog(watchdog);
    }
    armTurnWatchdog(watchdog) {
        clearTimeout(watchdog.timer);
        watchdog.timer = setTimeout(() => {
            const key = this.turnKey(watchdog.handle.threadId, watchdog.handle.turnId);
            if (this.turnWatchdogs.get(key) !== watchdog)
                return;
            void this.client.call('turn/interrupt', watchdog.handle).catch((error) => {
                this.options.onDiagnostic?.({
                    level: 'warning',
                    message: `Failed to interrupt inactive Codex turn: ${textFromError(error) || 'unknown error'}`,
                    method: 'turn/interrupt',
                });
            });
            this.emit({
                type: 'turn.failed',
                threadId: watchdog.handle.threadId,
                turnId: watchdog.handle.turnId,
                data: { error: `Codex turn ${watchdog.handle.turnId} had no progress for ${String(watchdog.inactivityTimeoutMs)}ms`, cause: 'inactivity_timeout' },
            });
        }, watchdog.inactivityTimeoutMs);
        watchdog.timer.unref?.();
    }
    refreshTurnInactivity(threadId, turnId) {
        const watchdog = this.turnWatchdogs.get(this.turnKey(threadId, turnId));
        if (watchdog)
            this.armTurnWatchdog(watchdog);
    }
    clearTurnWatchdog(key) {
        const watchdog = this.turnWatchdogs.get(key);
        if (!watchdog)
            return;
        clearTimeout(watchdog.timer);
        this.turnWatchdogs.delete(key);
    }
    turnKey(threadId, turnId) { return `${threadId}\u0000${turnId}`; }
    async handleNotification(notification) {
        if (notification.method === 'server/request') {
            const request = notification.params;
            if (typeof request?.id === 'number')
                await this.handleServerRequest(request);
            return;
        }
        if (notification.method === 'runtime/disconnected') {
            const error = textFromError(asRecord(notification.params)?.error ?? notification.params) || 'Codex App Server disconnected.';
            for (const session of this.sessions.values()) {
                const [event] = normalizeCodexNotification(notification, {
                    fallbackThreadId: session.binding.threadId,
                    fallbackTurnId: session.activeTurnId,
                    eventId: ({ method, suffix, threadId, turnId, itemId }) => this.eventId(`${method}:${suffix}`, threadId, turnId, itemId),
                });
                if (event)
                    this.emit(event);
                if (session.activeTurnId) {
                    const key = this.turnKey(session.binding.threadId, session.activeTurnId);
                    this.clearTurnWatchdog(key);
                    for (const waiter of this.waiters.get(key) ?? [])
                        waiter.reject(new Error(error));
                    this.waiters.delete(key);
                }
                session.activeTurnId = '';
                session.attached = false;
            }
            return;
        }
        const params = asRecord(notification.params) ?? {};
        const threadId = readThreadId(params);
        const bindingId = this.sessionIdByThreadId.get(threadId);
        if (!threadId || !bindingId) {
            this.options.onDiagnostic?.({ level: 'warning', message: 'Ignored Codex notification without an attached thread.', method: notification.method, params: notification.params });
            return;
        }
        const session = this.sessions.get(bindingId);
        const events = normalizeCodexNotification(notification, {
            fallbackTurnId: session.activeTurnId,
            includeProviderExtensions: true,
            eventId: ({ method, suffix, threadId: eventThreadId, turnId, itemId: eventItemId }) => this.eventId(`${method}:${suffix}`, eventThreadId, turnId, eventItemId),
        });
        for (const event of events) {
            if (event.type === 'turn.started' && event.turnId)
                session.activeTurnId = event.turnId;
            this.emit(event);
        }
    }
    async handleServerRequest(request) {
        const outer = asRecord(request.params);
        const params = outer?.params ?? request.params;
        const threadId = readThreadId(params);
        const bindingId = this.sessionIdByThreadId.get(threadId);
        if (!threadId || !bindingId) {
            this.options.onDiagnostic?.({ level: 'error', message: 'Cannot route Codex server request to an attached thread.', method: request.method, params: request.params });
            return;
        }
        const session = this.sessions.get(bindingId);
        const operation = {
            requestId: request.id,
            method: request.method,
            threadId,
            turnId: readTurnId(params) || session.activeTurnId,
            itemId: readItemId(params),
            params,
        };
        const decision = await this.options.policy?.evaluate(operation, session.binding, session.context) ?? { action: 'ask' };
        if (decision.action === 'allow') {
            await this.options.host.resolveServerRequest(request.id, decision.reply ?? { result: { decision: 'accept' } });
            this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'accept', automatic: true, reason: decision.reason } });
            return;
        }
        if (decision.action === 'deny') {
            await this.options.host.resolveServerRequest(request.id, decision.reply ?? { error: { code: -32000, message: decision.reason } });
            this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'decline', automatic: true, reason: decision.reason } });
            return;
        }
        const kind = QUESTION_METHODS.has(request.method) ? 'question' : 'approval';
        if (!APPROVAL_METHODS.has(request.method) && !QUESTION_METHODS.has(request.method)) {
            this.options.onDiagnostic?.({ level: 'warning', message: 'Unsupported server request is pending for explicit product handling.', method: request.method, params });
        }
        const requestId = String(request.id);
        this.pendingRequests.set(requestId, { request, bindingId, kind });
        this.emit({
            type: kind === 'approval' ? 'approval.requested' : 'question.requested',
            threadId, turnId: operation.turnId, itemId: operation.itemId,
            data: { requestId, approvalId: requestId, method: request.method, params },
        });
    }
}
function contentFromInputs(input) {
    return contentFromUserItem({ content: input });
}
//# sourceMappingURL=index.js.map