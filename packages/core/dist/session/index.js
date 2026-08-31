import { asRecord, isApprovalRequestMethod, isToolUserInputRequestMethod, readItemId, readString, readThreadId, readTurnId, } from '../protocol/index.js';
import { contentFromUserItem, normalizeCodexNotification, outputText, textFromError, } from './normalization.js';
import { CodexThreadCommands } from './commands.js';
import { CodexSessionCatalog } from './catalog.js';
export * from './token-usage.js';
export * from './turn-input.js';
export * from './catalog.js';
export * from './commands.js';
export * from './turn-recovery.js';
export { conversationToolFromItem, normalizeCodexNotification, normalizeThreadHistory, readCodexStatus, } from './normalization.js';
const DEFAULT_TURN_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_UPSTREAM_RETRY_ATTEMPTS = 5;
export class CodexSessionManager {
    options;
    sessions = new Map();
    sessionIdByThreadId = new Map();
    listeners = new Set();
    waiters = new Map();
    turnWatchdogs = new Map();
    upstreamRetries = new Map();
    terminalEvents = new Map();
    operationalFailures = new Map();
    pendingRequests = new Map();
    commands;
    catalog;
    nowIso;
    eventSequence = 0;
    commandSequence = 0;
    unlisten = null;
    constructor(options) {
        this.options = options;
        this.commands = new CodexThreadCommands(options.host);
        this.catalog = new CodexSessionCatalog(options.host);
        this.nowIso = options.nowIso ?? (() => new Date().toISOString());
        this.unlisten = options.host.subscribe((notification) => { void this.handleNotification(notification); });
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    /** Returns stable live events for unresolved approvals/questions after a product view reconnects. */
    listPendingEvents(bindingId) {
        return [...this.pendingRequests.values()]
            .filter((pending) => pending.bindingId === bindingId && pending.event)
            .map((pending) => pending.event);
    }
    async create(bindingId, context) {
        await this.options.host.ensureInitialized();
        const threadId = await this.commands.startThread({
            ...context.thread,
            experimentalRawEvents: context.thread.experimentalRawEvents ?? false,
        });
        const binding = { id: bindingId, threadId };
        this.attachLocal(binding, context);
        this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId, mode: 'created' } });
        return binding;
    }
    async resume(binding, context) {
        await this.options.host.ensureInitialized();
        await this.commands.resumeThread(binding.threadId, context.thread);
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
        return this.catalog.readThread(session.binding.threadId);
    }
    submit(bindingId, input, mode = 'queue', clientCommandId) {
        const session = this.require(bindingId);
        const commandId = clientCommandId?.trim() || `command:${bindingId}:${String(++this.commandSequence)}`;
        const content = contentFromInputs(input.input);
        this.emit({
            type: 'command.queued',
            threadId: session.binding.threadId,
            itemId: commandId,
            data: { ...content, clientCommandId: commandId },
        });
        let resolveStarted;
        let rejectStarted;
        const started = new Promise((resolve, reject) => { resolveStarted = resolve; rejectStarted = reject; });
        let resolveCompleted;
        let rejectCompleted;
        const completed = new Promise((resolve, reject) => { resolveCompleted = resolve; rejectCompleted = reject; });
        // A product may only need the immediate command id. Keep background failures
        // observable through events without producing an unhandled rejection.
        void started.catch(() => undefined);
        void completed.catch(() => undefined);
        const execute = async () => {
            let handle = null;
            try {
                await this.ensureSessionReady(session);
                const turnId = mode === 'steer'
                    ? await this.steerSubmission(session, input)
                    : await this.commands.startTurn(session.binding.threadId, {
                        ...(session.context.turn ?? {}),
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
                handle = { threadId: session.binding.threadId, turnId };
                session.activeTurnId = handle.turnId;
                this.emit({
                    type: 'command.bound',
                    threadId: handle.threadId,
                    turnId: handle.turnId,
                    itemId: commandId,
                    data: { clientCommandId: commandId },
                });
                resolveStarted(handle);
                const terminalEvent = await this.waitForTurn(handle);
                resolveCompleted({ handle, terminalEvent });
            }
            catch (error) {
                if (!handle) {
                    this.emit({
                        type: 'command.failed',
                        threadId: session.binding.threadId,
                        itemId: commandId,
                        data: { clientCommandId: commandId, error: textFromError(error) || 'Codex failed to start this command.' },
                    });
                }
                rejectStarted(error);
                rejectCompleted(error);
                throw error;
            }
        };
        const scheduled = session.queueTail.catch(() => undefined).then(execute);
        session.queueTail = scheduled.catch(() => undefined);
        return { clientCommandId: commandId, started, completed };
    }
    async send(bindingId, input, mode = 'queue', clientCommandId) {
        return this.submit(bindingId, input, mode, clientCommandId).started;
    }
    async run(bindingId, input, mode = 'queue', clientCommandId) {
        return this.submit(bindingId, input, mode, clientCommandId).completed;
    }
    async interrupt(bindingId) {
        const session = this.require(bindingId);
        await this.ensureSessionReady(session);
        if (!session.activeTurnId)
            return false;
        await this.commands.interruptTurn(session.binding.threadId, session.activeTurnId);
        return true;
    }
    waitForTurn(handle) {
        const key = this.turnKey(handle.threadId, handle.turnId);
        const terminal = this.terminalEvents.get(key);
        if (terminal)
            return Promise.resolve(terminal);
        const operationalFailure = this.operationalFailures.get(key);
        if (operationalFailure)
            return Promise.resolve(operationalFailure);
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
        this.upstreamRetries.clear();
        this.operationalFailures.clear();
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
    async steerSubmission(session, input) {
        if (!session.activeTurnId)
            throw new Error('turn/steer requires an active turn');
        await this.commands.steerTurn(session.binding.threadId, session.activeTurnId, input.input);
        return session.activeTurnId;
    }
    async ensureSessionReady(session) {
        if (session.attached)
            return;
        await this.options.host.ensureInitialized();
        await this.commands.resumeThread(session.binding.threadId, session.context.thread);
        this.forgetTerminalEvents(session.binding.threadId);
        session.attached = true;
        this.emit({ type: 'runtime.connected', threadId: session.binding.threadId, data: { resumed: true } });
    }
    forgetTerminalEvents(threadId) {
        const prefix = `${threadId}\u0000`;
        for (const key of this.terminalEvents.keys())
            if (key.startsWith(prefix))
                this.terminalEvents.delete(key);
        for (const key of this.operationalFailures.keys())
            if (key.startsWith(prefix))
                this.operationalFailures.delete(key);
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
        if (event.type === 'turn.disconnected')
            this.finishOperationalFailure(event);
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
        this.operationalFailures.delete(key);
        this.upstreamRetries.delete(key);
        const bindingId = this.sessionIdByThreadId.get(event.threadId);
        const session = bindingId ? this.sessions.get(bindingId) : undefined;
        if (session?.activeTurnId === event.turnId)
            session.activeTurnId = '';
        for (const [requestId, pending] of this.pendingRequests) {
            if (pending.event?.threadId === event.threadId && pending.event.turnId === event.turnId) {
                this.pendingRequests.delete(requestId);
            }
        }
        const rows = this.waiters.get(key) ?? [];
        this.waiters.delete(key);
        this.clearTurnWatchdog(key);
        for (const waiter of rows)
            waiter.resolve(event);
    }
    finishOperationalFailure(event) {
        if (!event.turnId)
            return;
        const key = this.turnKey(event.threadId, event.turnId);
        if (this.terminalEvents.has(key) || this.operationalFailures.has(key))
            return;
        this.operationalFailures.set(key, event);
        this.upstreamRetries.delete(key);
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
            void this.commands.interruptTurn(watchdog.handle.threadId, watchdog.handle.turnId).catch((error) => {
                this.options.onDiagnostic?.({
                    level: 'warning',
                    message: `Failed to interrupt inactive Codex turn: ${textFromError(error) || 'unknown error'}`,
                    method: 'turn/interrupt',
                });
            });
            this.emit({
                type: 'turn.disconnected',
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
    trackUpstreamRetry(event) {
        if (event.type !== 'turn.retrying' || !event.turnId)
            return null;
        const key = this.turnKey(event.threadId, event.turnId);
        const previous = this.upstreamRetries.get(key);
        const reportedAttempt = nonNegativeInteger(event.data.retryAttempt);
        const reportedLimit = positiveInteger(event.data.retryLimit);
        const defaultLimit = positiveInteger(this.options.maxUpstreamRetryAttempts) ?? DEFAULT_MAX_UPSTREAM_RETRY_ATTEMPTS;
        const limit = reportedLimit ?? previous?.limit ?? defaultLimit;
        const attempts = Math.max((previous?.attempts ?? 0) + 1, reportedAttempt ?? 0);
        this.upstreamRetries.set(key, { attempts, limit });
        const data = { ...event.data, retryAttempt: attempts, retryLimit: limit };
        // `willRetry` is advisory. It must not extend an explicitly configured
        // retry budget indefinitely: some App Server versions keep reporting it
        // as true after their response stream has already become unrecoverable.
        if (attempts < limit && event.data.willRetry !== false) {
            Object.assign(event.data, data);
            return null;
        }
        return {
            ...event,
            id: this.eventId('turn.disconnected:upstream-retries', event.threadId, event.turnId),
            type: 'turn.disconnected',
            data: {
                ...data,
                cause: 'upstream_response_stream_unrecoverable',
                error: `Codex 上游响应流恢复失败，未自动重发。${textFromError(event.data.error) || '重试次数已耗尽。'}`,
            },
        };
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
                    this.upstreamRetries.delete(key);
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
            if (notification.method === 'error' && event.type === 'turn.failed' && event.data.cause === 'upstream_response_stream_unrecoverable') {
                this.emit({ ...event, type: 'turn.disconnected' });
                continue;
            }
            // Only App Server `error` notifications represent a concrete response
            // stream retry attempt. Generic warnings are activity updates and must
            // not consume the retry budget.
            const upstreamRetryFailure = notification.method === 'error' ? this.trackUpstreamRetry(event) : null;
            if (upstreamRetryFailure) {
                this.emit(upstreamRetryFailure);
                continue;
            }
            if (event.turnId && event.type !== 'turn.retrying')
                this.upstreamRetries.delete(this.turnKey(event.threadId, event.turnId));
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
        const isQuestion = isToolUserInputRequestMethod(request.method);
        const kind = isQuestion ? 'question' : 'approval';
        if (!isApprovalRequestMethod(request.method) && !isQuestion) {
            this.options.onDiagnostic?.({ level: 'warning', message: 'Unsupported server request is pending for explicit product handling.', method: request.method, params });
        }
        const requestId = String(request.id);
        const pending = { request, bindingId, kind };
        this.pendingRequests.set(requestId, pending);
        const event = this.emit({
            type: kind === 'approval' ? 'approval.requested' : 'question.requested',
            threadId, turnId: operation.turnId, itemId: operation.itemId,
            data: { requestId, approvalId: requestId, method: request.method, params },
        });
        if (this.pendingRequests.get(requestId) === pending)
            pending.event = event;
    }
}
function contentFromInputs(input) {
    return contentFromUserItem({ content: input });
}
function nonNegativeInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}
function positiveInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}
//# sourceMappingURL=index.js.map