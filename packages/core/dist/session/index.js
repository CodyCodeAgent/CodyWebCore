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
    return readString(params.delta) || readString(params.textDelta) || readString(params.text_delta);
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
function toolFromItem(item, phase) {
    const row = asRecord(item);
    const type = readString(row?.type);
    if (!row || !type)
        return null;
    const rawStatus = readString(row.status);
    const failed = /fail|error|cancel|reject|declin/iu.test(rawStatus) || Boolean(row.error);
    const status = failed ? 'failed' : rawStatus || (phase === 'completed' ? 'completed' : 'running');
    if (type === 'commandExecution') {
        const command = readString(row.command);
        const output = readString(row.aggregatedOutput);
        return {
            kind: 'command', title: 'Command execution', status, summary: command,
            details: [readString(row.cwd) ? `cwd: ${readString(row.cwd)}` : '', `status: ${status}`].filter(Boolean),
            ...(output ? { output } : {}),
        };
    }
    if (type === 'fileChange') {
        const changes = Array.isArray(row.changes) ? row.changes : [];
        const details = changes.map((change) => readString(asRecord(change)?.path)).filter(Boolean);
        const output = changes.map((change) => readString(asRecord(change)?.diff)).filter(Boolean).join('\n\n');
        return {
            kind: 'fileChange', title: details.length > 1 ? `File changes · ${String(details.length)} files` : 'File change',
            status, summary: details.length ? `${String(details.length)} files changed` : 'Files changed', details,
            ...(output ? { output } : {}),
        };
    }
    if (type === 'mcpToolCall') {
        const server = readString(row.server);
        const tool = readString(row.tool);
        const output = outputText(row.error ?? row.result);
        return {
            kind: 'mcp', title: 'MCP tool', status, summary: [server, tool].filter(Boolean).join('.'),
            details: [`server: ${server || 'unknown'}`, `tool: ${tool || 'unknown'}`], ...(output ? { output } : {}),
        };
    }
    if (type === 'collabAgentToolCall') {
        return {
            kind: 'collabAgent', title: 'Collaboration agent', status, summary: readString(row.tool),
            details: Array.isArray(row.receiverThreadIds) ? row.receiverThreadIds.map(String) : [],
        };
    }
    if (type === 'webSearch')
        return { kind: 'webSearch', title: 'Web search', status, summary: readString(row.query), details: [] };
    if (type === 'imageView')
        return { kind: 'imageView', title: 'Image view', status, summary: readString(row.path), details: [] };
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
    const tool = toolFromItem(input.item, input.phase);
    if (!tool)
        return [];
    return [{ id: input.id(`tool:${input.phase}`), type: input.phase === 'started' ? 'tool.started' : 'tool.completed', ...common, data: { tool, item: input.item } }];
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
        const type = status === 'failed' ? 'turn.failed' : 'turn.completed';
        events.push({
            id: `history:${threadId}:${turnId}:terminal`, type, threadId, turnId, atIso: completedAtIso ?? atIso,
            data: status === 'failed'
                ? { error: textFromError(turn?.error) || 'Codex failed to complete this turn.', history: true, durationKnown }
                : { status, history: true, durationKnown },
        });
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
        if ((input.type === 'turn.completed' || input.type === 'turn.failed') && input.turnId) {
            const existing = this.terminalEvents.get(this.turnKey(input.threadId, input.turnId));
            if (existing)
                return existing;
        }
        const event = {
            ...input,
            id: input.id ?? this.eventId(input.type, input.threadId, input.turnId, input.itemId),
            atIso: input.atIso ?? this.nowIso(),
        };
        if (event.turnId && event.type !== 'turn.completed' && event.type !== 'turn.failed')
            this.refreshTurnInactivity(event.threadId, event.turnId);
        if (event.type === 'turn.completed' || event.type === 'turn.failed')
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
                this.emit({ type: 'runtime.disconnected', threadId: session.binding.threadId, ...(session.activeTurnId ? { turnId: session.activeTurnId } : {}), atIso: notification.receivedAtIso, data: { error } });
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
        const turnId = readTurnId(params) || session.activeTurnId;
        const nativeItemId = readItemId(params);
        const common = { threadId, ...(turnId ? { turnId } : {}), ...(nativeItemId ? { itemId: nativeItemId } : {}), atIso: notification.receivedAtIso };
        if (notification.method === 'turn/started') {
            session.activeTurnId = turnId;
            this.emit({ type: 'turn.started', ...common, data: params });
            return;
        }
        if (notification.method === 'turn/completed') {
            const turn = asRecord(params.turn);
            const status = readString(turn?.status);
            const completedTurnId = readString(turn?.id) || turnId;
            const eventType = status === 'failed' || status === 'interrupted' ? 'turn.failed' : 'turn.completed';
            this.emit({ type: eventType, ...common, ...(completedTurnId ? { turnId: completedTurnId } : {}), data: status === 'failed' ? { error: textFromError(turn?.error), status, raw: params } : { status, raw: params } });
            return;
        }
        if (notification.method === 'error') {
            const willRetry = params.willRetry === true || params.will_retry === true;
            this.emit({ type: willRetry ? 'turn.retrying' : 'turn.failed', ...common, data: { error: textFromError(params.error ?? params), willRetry, raw: params } });
            return;
        }
        if (notification.method === 'item/agentMessage/delta') {
            this.emit({ type: 'assistant.delta', ...common, data: { text: readDelta(params) } });
            return;
        }
        if (notification.method === 'item/reasoning/summaryTextDelta' || notification.method === 'item/reasoning/textDelta') {
            this.emit({ type: 'reasoning.delta', ...common, data: { text: readDelta(params) } });
            return;
        }
        if (notification.method === 'item/reasoning/summaryPartAdded') {
            this.emit({ type: 'reasoning.break', ...common, data: {} });
            return;
        }
        if (notification.method === 'item/plan/delta') {
            this.emit({ type: 'plan.delta', ...common, data: { text: readDelta(params) } });
            return;
        }
        if (notification.method === 'turn/plan/updated') {
            this.emit({ type: 'plan.replaced', ...common, data: { text: readString(params.explanation), raw: params } });
            return;
        }
        if (notification.method === 'turn/diff/updated' || notification.method === 'item/fileChange/patchUpdated') {
            this.emit({ type: 'fileChange.updated', ...common, data: { tool: { kind: 'fileChange', title: 'File changes', status: 'running', summary: 'Diff updated', details: [], output: outputText(params.diff ?? params.patch) }, raw: params } });
            return;
        }
        if (notification.method === 'item/commandExecution/outputDelta' || notification.method === 'command/exec/outputDelta' || notification.method === 'process/outputDelta') {
            this.emit({ type: 'tool.updated', ...common, data: { tool: { kind: 'command', title: 'Command execution', status: 'running', summary: '', details: [], output: readDelta(params) }, raw: params } });
            return;
        }
        if (notification.method === 'item/fileChange/outputDelta') {
            this.emit({ type: 'fileChange.updated', ...common, data: { tool: { kind: 'fileChange', title: 'File changes', status: 'running', summary: '', details: [], output: readDelta(params) }, raw: params } });
            return;
        }
        if (notification.method === 'item/started' || notification.method === 'item/completed') {
            const phase = notification.method === 'item/started' ? 'started' : 'completed';
            for (const event of itemEvents({ id: (suffix) => this.eventId(`${notification.method}:${suffix}`, threadId, turnId, itemId(params.item)), phase, threadId, turnId, item: params.item, atIso: notification.receivedAtIso }))
                this.emit(event);
            return;
        }
        this.emit({ type: 'provider.extension', ...common, data: { method: notification.method, params } });
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