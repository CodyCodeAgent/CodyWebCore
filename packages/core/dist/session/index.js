import { asRecord, isApprovalRequestMethod, isToolUserInputRequestMethod, readItemId, readString, readThreadId, readTurnId, } from '../protocol/index.js';
import { latestAssistantTextFromEvents } from '../conversation/index.js';
import { contentFromUserItem, normalizeCodexNotification, outputText, textFromError, } from './normalization.js';
import { CodexThreadCommands } from './commands.js';
import { CodexSessionCatalog, } from './catalog.js';
export * from './token-usage.js';
export * from './turn-input.js';
export * from './catalog.js';
export * from './commands.js';
export { conversationToolFromItem, normalizeCodexNotification, normalizeThreadHistory, readCodexStatus, } from './normalization.js';
const DEFAULT_TURN_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_UPSTREAM_RETRY_ATTEMPTS = 5;
const DEFAULT_TURN_STOP_RECONCILE_ATTEMPTS = 5;
const DEFAULT_TURN_STOP_RECONCILE_DELAY_MS = 1_000;
/**
 * A Turn outcome is an in-process handoff for product adapters, never a
 * history cache. Retain only a bounded tail so one very chatty tool cannot
 * make the shared owner grow without bound while a Turn is running.
 */
const MAX_TURN_OUTCOME_EVENTS = 256;
const MAX_OWNER_JOURNAL_EVENTS = 10_000;
export class CodexSessionManager {
    options;
    sessions = new Map();
    sessionIdByThreadId = new Map();
    listeners = new Set();
    waiters = new Map();
    turnWatchdogs = new Map();
    upstreamRetries = new Map();
    operationalStops = new Map();
    terminalEvents = new Map();
    ownerJournalByBindingId = new Map();
    turnEvents = new Map();
    operationalFailures = new Map();
    submissions = new Map();
    pendingRequests = new Map();
    requestResolutions = new Map();
    resolvedRequests = new Set();
    commands;
    catalog;
    nowIso;
    eventSequence = 0;
    ownerRevision = 0;
    commandSequence = 0;
    runtimeUnavailable = false;
    disposed = false;
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
    /** Returns the volatile owner state needed to attach a browser projection.
     * Native thread/read can lag an active Turn, so attach must explicitly
     * publish that Turn instead of making the browser infer activity. */
    listAttachmentEvents(bindingId) {
        const session = this.require(bindingId);
        const events = [];
        for (const record of this.submissions.values()) {
            if (record.bindingId !== bindingId || (record.state !== 'queued' && record.state !== 'bound'))
                continue;
            events.push({
                id: this.eventId('attachment:command.queued', record.threadId, '', record.commandId),
                type: 'command.queued',
                threadId: record.threadId,
                itemId: record.commandId,
                atIso: this.nowIso(),
                data: { ...record.content, clientCommandId: record.commandId, attachment: true },
            });
            if (record.state === 'bound' && record.turnId) {
                events.push({
                    id: this.eventId('attachment:command.bound', record.threadId, record.turnId, record.commandId),
                    type: 'command.bound',
                    threadId: record.threadId,
                    turnId: record.turnId,
                    itemId: record.commandId,
                    atIso: this.nowIso(),
                    data: { clientCommandId: record.commandId, attachment: true },
                });
            }
        }
        if (session.activeTurnId) {
            const key = this.turnKey(session.binding.threadId, session.activeTurnId);
            const operationalFailure = this.operationalFailures.get(key);
            events.push(operationalFailure ?? {
                id: this.eventId('attachment:turn.started', session.binding.threadId, session.activeTurnId),
                type: 'turn.started',
                threadId: session.binding.threadId,
                turnId: session.activeTurnId,
                atIso: new Date().toISOString(),
                data: { status: 'running', attachment: true },
            });
        }
        // Native history can only report the safety interrupt used to stop an
        // unrecoverable response stream. The process owner knows that the actual
        // outcome is a retryable operational failure, so that correction remains
        // part of every attachment snapshot for the lifetime of this owner.
        for (const event of this.terminalEvents.values()) {
            if (event.threadId === session.binding.threadId && event.data.terminalCorrection === true)
                events.push(event);
        }
        events.push(...this.listPendingEvents(bindingId));
        return events;
    }
    snapshot(bindingId) {
        const session = this.sessions.get(bindingId);
        if (!session)
            return null;
        let pendingRequestCount = 0;
        for (const pending of this.pendingRequests.values()) {
            if (pending.bindingId === bindingId)
                pendingRequestCount += 1;
        }
        return {
            bindingId,
            threadId: session.binding.threadId,
            activeTurnId: session.activeTurnId,
            pendingRequestCount,
            attached: session.attached,
            runtimeAvailable: !this.runtimeUnavailable && !this.disposed,
            quarantinedReason: session.quarantinedReason,
        };
    }
    async create(bindingId, context) {
        this.requireUsable();
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
    /**
     * Starts a native thread and binds it to itself in one owner operation.
     *
     * Browser clients never receive a window in which a new native thread exists
     * without a Core binding.  Product navigation may use the returned id, but
     * future read/submit/interrupt operations must come back through this
     * manager.
     */
    async startThread(context) {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        const threadId = await this.commands.startThread({
            ...context.thread,
            experimentalRawEvents: context.thread.experimentalRawEvents ?? false,
        });
        const binding = { id: threadId, threadId };
        this.attachLocal(binding, context);
        this.emit({ type: 'thread.attached', threadId, data: { bindingId: binding.id, mode: 'created' } });
        return binding;
    }
    /** Catalog and thread mutations are owner operations too.  Keeping them
     * here prevents product browsers from using a generic RPC tunnel for the
     * same native threads that this manager serializes. */
    async listThreads(options = {}) {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        return this.catalog.listThreads(options);
    }
    async listModels() {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        return this.catalog.listModels();
    }
    async listCollaborationModes() {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        return this.catalog.listCollaborationModes();
    }
    async renameThread(threadId, name) {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        await this.commands.renameThread(threadId, name);
    }
    async forkThread(threadId) {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        return this.commands.forkThread(threadId);
    }
    async compactThread(threadId) {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        await this.commands.compactThread(threadId);
    }
    async archiveThread(threadId) {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        await this.commands.archiveThread(threadId);
    }
    async resume(binding, context) {
        this.requireUsable();
        await this.options.host.ensureInitialized();
        await this.commands.resumeThread(binding.threadId, context.thread);
        const snapshot = await this.catalog.readThreadSnapshot(binding.threadId);
        this.forgetTerminalEvents(binding.threadId);
        const session = this.attachLocal(binding, context);
        const activeTurn = [...snapshot.turns].reverse().find((turn) => /progress|running|active|started/iu.test(turn.status));
        if (activeTurn && session.activeTurnId !== activeTurn.turnId) {
            session.activeTurnId = activeTurn.turnId;
            session.queueTail = this.waitForTurn({ threadId: binding.threadId, turnId: activeTurn.turnId })
                .then(() => undefined);
        }
        this.emit({ type: 'thread.attached', threadId: binding.threadId, data: { bindingId: binding.id, mode: 'resumed' } });
    }
    detach(bindingId) {
        const session = this.sessions.get(bindingId);
        if (!session)
            return;
        this.sessions.delete(bindingId);
        this.sessionIdByThreadId.delete(session.binding.threadId);
        this.ownerJournalByBindingId.delete(bindingId);
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
    /**
     * The only safe reconnect cut: durable native history and the owner's live
     * journal are captured with a monotonically increasing watermark. A browser
     * subscribes first and replays only owner events newer than this watermark.
     */
    async readSnapshot(bindingId) {
        const session = this.require(bindingId);
        await this.ensureSessionReady(session);
        const history = await this.catalog.readThread(session.binding.threadId);
        const watermark = this.ownerRevision;
        const journal = this.ownerJournalByBindingId.get(bindingId) ?? [];
        return { events: [...history, ...journal.filter(event => (event.ownerRevision ?? 0) <= watermark)], watermark };
    }
    submit(bindingId, input, mode = 'queue', clientCommandId) {
        this.requireUsable();
        const session = this.require(bindingId);
        const commandId = clientCommandId?.trim() || `command:${bindingId}:${String(++this.commandSequence)}`;
        const submissionKey = `${bindingId}\u0000${session.binding.threadId}\u0000${commandId}`;
        const fingerprint = JSON.stringify({ mode, input });
        const existingSubmission = this.submissions.get(submissionKey);
        if (existingSubmission) {
            if (existingSubmission.fingerprint !== fingerprint) {
                throw new Error(`Client command ${commandId} was already submitted with different content`);
            }
            return existingSubmission.submission;
        }
        const content = contentFromInputs(input.input);
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
        const submission = { clientCommandId: commandId, started, completed };
        const record = {
            fingerprint,
            submission,
            bindingId,
            threadId: session.binding.threadId,
            commandId,
            content,
            state: 'queued',
        };
        this.submissions.set(submissionKey, record);
        // Publish only after the owner record exists. A second browser can attach
        // synchronously from an event listener; emitting first creates a gap where
        // that tab sees neither the realtime event nor the attachment replay.
        this.emit({
            type: 'command.queued',
            threadId: session.binding.threadId,
            itemId: commandId,
            data: { ...content, clientCommandId: commandId },
        });
        // Bound memory without sacrificing idempotency for any realistic active
        // browser outbox. The oldest command is the least useful replay.
        if (this.submissions.size > 10_000) {
            const oldestKey = this.submissions.keys().next().value;
            if (oldestKey)
                this.submissions.delete(oldestKey);
        }
        const execute = async () => {
            let handle = null;
            try {
                this.requireUsable();
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
                record.state = 'bound';
                record.turnId = handle.turnId;
                this.emit({
                    type: 'command.bound',
                    threadId: handle.threadId,
                    turnId: handle.turnId,
                    itemId: commandId,
                    data: { clientCommandId: commandId },
                });
                resolveStarted(handle);
                const terminalEvent = await this.waitForTurn(handle);
                const outcomeKey = this.turnKey(handle.threadId, handle.turnId);
                const events = this.turnEvents.get(outcomeKey) ?? [];
                // No attachment or reconnect path reads this transient outcome buffer;
                // native thread/read plus owner snapshots remain authoritative. Release
                // it as soon as the submitter has received its immutable result.
                this.turnEvents.delete(outcomeKey);
                resolveCompleted({
                    handle,
                    terminalEvent,
                    assistantText: latestAssistantTextFromEvents(events),
                    events: [...events],
                });
            }
            catch (error) {
                if (handle)
                    this.turnEvents.delete(this.turnKey(handle.threadId, handle.turnId));
                if (!handle) {
                    record.state = 'failed';
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
        // Queue mode is serialized behind the authoritative terminal event of the
        // previous Turn. Steering is different: it targets the currently active
        // native Turn and must run immediately. Putting steer on queueTail makes it
        // wait until that Turn has already finished, at which point there is no
        // active Turn left to steer.
        const scheduled = mode === 'steer'
            ? execute()
            : session.queueTail.catch(() => undefined).then(execute);
        if (mode === 'queue')
            session.queueTail = scheduled.catch(() => undefined);
        else
            void scheduled.catch(() => undefined);
        return submission;
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
        void this.requestNativeStop({ threadId: session.binding.threadId, turnId: session.activeTurnId }, 'Codex Turn interruption could not be confirmed.');
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
        await this.resolveRequestOnce(bindingId, requestId, 'approval', async (pending) => {
            await this.options.host.resolveServerRequest(pending.request.id, { result: { decision } });
            this.pendingRequests.delete(requestId);
            this.emit({ type: 'approval.resolved', threadId: this.require(bindingId).binding.threadId, data: { requestId, decision } });
        });
    }
    async respondQuestion(bindingId, requestId, answer) {
        await this.resolveRequestOnce(bindingId, requestId, 'question', async (pending) => {
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
        });
    }
    async dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.unlisten?.();
        this.unlisten = null;
        for (const watchdog of this.turnWatchdogs.values())
            clearTimeout(watchdog.timer);
        this.turnWatchdogs.clear();
        this.upstreamRetries.clear();
        this.operationalStops.clear();
        this.operationalFailures.clear();
        this.turnEvents.clear();
        this.submissions.clear();
        for (const rows of this.waiters.values())
            for (const waiter of rows)
                waiter.reject(new Error('Codex session manager disposed'));
        this.waiters.clear();
        this.pendingRequests.clear();
        this.requestResolutions.clear();
        this.resolvedRequests.clear();
        this.sessions.clear();
        this.sessionIdByThreadId.clear();
        this.ownerJournalByBindingId.clear();
    }
    attachLocal(binding, context) {
        const existingBindingId = this.sessionIdByThreadId.get(binding.threadId);
        if (existingBindingId && existingBindingId !== binding.id)
            throw new Error(`Codex thread ${binding.threadId} is already attached to ${existingBindingId}`);
        const previous = this.sessions.get(binding.id);
        if (previous?.binding.threadId === binding.threadId) {
            previous.context = context;
            previous.attached = true;
            this.sessionIdByThreadId.set(binding.threadId, binding.id);
            return previous;
        }
        if (previous && previous.binding.threadId !== binding.threadId) {
            this.sessionIdByThreadId.delete(previous.binding.threadId);
        }
        const session = { binding, context, activeTurnId: '', queueTail: Promise.resolve(), attached: true, quarantinedReason: '' };
        this.sessions.set(binding.id, session);
        this.sessionIdByThreadId.set(binding.threadId, binding.id);
        return session;
    }
    requireUsable() {
        if (this.disposed)
            throw new Error('Codex session manager is disposed');
        if (this.runtimeUnavailable)
            throw new Error('Codex App Server is unavailable. Restart the product service to create a new owner process.');
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
        if (session.quarantinedReason)
            throw new Error(session.quarantinedReason);
        if (session.attached)
            return;
        if (this.runtimeUnavailable)
            throw new Error('Codex App Server is unavailable. Restart the product service to create a new owner process.');
        throw new Error(`Codex thread binding ${session.binding.id} is detached`);
    }
    forgetTerminalEvents(threadId) {
        const prefix = `${threadId}\u0000`;
        for (const key of this.terminalEvents.keys())
            if (key.startsWith(prefix))
                this.terminalEvents.delete(key);
        for (const key of this.turnEvents.keys())
            if (key.startsWith(prefix))
                this.turnEvents.delete(key);
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
    async resolveRequestOnce(bindingId, requestId, kind, resolve) {
        const key = `${bindingId}\u0000${kind}\u0000${requestId}`;
        if (this.resolvedRequests.has(key))
            return;
        const inFlight = this.requestResolutions.get(key);
        if (inFlight)
            return inFlight;
        const operation = (async () => {
            const pending = this.requirePending(bindingId, requestId, kind);
            await resolve(pending);
            this.resolvedRequests.add(key);
            if (this.resolvedRequests.size > 2_048)
                this.resolvedRequests.delete(this.resolvedRequests.values().next().value);
        })();
        this.requestResolutions.set(key, operation);
        try {
            await operation;
        }
        finally {
            this.requestResolutions.delete(key);
        }
    }
    eventId(method, threadId, turnId = '', itemId = '') {
        this.eventSequence += 1;
        return `live:${String(this.eventSequence)}:${method}:${threadId}:${turnId}:${itemId}`;
    }
    emit(input) {
        // An interrupt requested by the owner after an operational response-stream
        // failure is a safety mechanism, not a user cancellation. Codex reports the
        // resulting native terminal as `interrupted`; preserve the actual failure
        // cause so products render one retryable failure instead of a misleading
        // Stopped receipt. Explicit user interrupts have no operational failure and
        // remain `turn.interrupted`.
        const operationalFailure = input.turnId
            ? this.operationalFailures.get(this.turnKey(input.threadId, input.turnId))
            : undefined;
        const normalizedInput = input.type === 'turn.interrupted' && operationalFailure
            ? {
                ...input,
                id: this.eventId('owner:terminal-correction', input.threadId, input.turnId, input.itemId),
                type: 'turn.failed',
                data: {
                    ...input.data,
                    nativeEventId: input.id ?? '',
                    terminalCorrection: true,
                    error: textFromError(operationalFailure.data.error)
                        || textFromError(input.data.error)
                        || 'Codex upstream response stream failed.',
                    cause: operationalFailure.data.cause ?? 'operational_failure',
                    retainOutboxForRetry: true,
                    interruptedAfterOperationalFailure: true,
                },
            }
            : input;
        if ((normalizedInput.type === 'turn.completed' || normalizedInput.type === 'turn.failed' || normalizedInput.type === 'turn.interrupted') && normalizedInput.turnId) {
            const existing = this.terminalEvents.get(this.turnKey(normalizedInput.threadId, normalizedInput.turnId));
            if (existing)
                return existing;
        }
        if (normalizedInput.type === 'turn.disconnected' && normalizedInput.turnId) {
            const key = this.turnKey(normalizedInput.threadId, normalizedInput.turnId);
            const terminal = this.terminalEvents.get(key);
            if (terminal)
                return terminal;
            const existing = this.operationalFailures.get(key);
            if (existing)
                return existing;
        }
        const event = {
            ...normalizedInput,
            id: normalizedInput.id ?? this.eventId(normalizedInput.type, normalizedInput.threadId, normalizedInput.turnId, normalizedInput.itemId),
            atIso: normalizedInput.atIso ?? this.nowIso(),
            ownerRevision: ++this.ownerRevision,
        };
        const bindingId = this.sessionIdByThreadId.get(event.threadId);
        if (bindingId) {
            const journal = this.ownerJournalByBindingId.get(bindingId) ?? [];
            journal.push(event);
            if (journal.length > MAX_OWNER_JOURNAL_EVENTS)
                journal.splice(0, journal.length - MAX_OWNER_JOURNAL_EVENTS);
            this.ownerJournalByBindingId.set(bindingId, journal);
        }
        if (event.turnId) {
            const key = this.turnKey(event.threadId, event.turnId);
            const events = this.turnEvents.get(key) ?? [];
            events.push(event);
            if (events.length > MAX_TURN_OUTCOME_EVENTS)
                events.splice(0, events.length - MAX_TURN_OUTCOME_EVENTS);
            this.turnEvents.set(key, events);
            if (this.turnEvents.size > 10_000) {
                const oldestKey = this.turnEvents.keys().next().value;
                if (oldestKey)
                    this.turnEvents.delete(oldestKey);
            }
        }
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
        if (this.terminalEvents.size > 10_000) {
            const oldestKey = this.terminalEvents.keys().next().value;
            if (oldestKey)
                this.terminalEvents.delete(oldestKey);
        }
        this.operationalFailures.delete(key);
        this.upstreamRetries.delete(key);
        const bindingId = this.sessionIdByThreadId.get(event.threadId);
        const session = bindingId ? this.sessions.get(bindingId) : undefined;
        if (session?.activeTurnId === event.turnId) {
            session.activeTurnId = '';
            session.quarantinedReason = '';
        }
        for (const record of this.submissions.values()) {
            if (record.threadId === event.threadId && record.turnId === event.turnId)
                record.state = 'terminal';
        }
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
        // App Server versions do not consistently follow a response-stream
        // failure with a native terminal notification. Request one stop, then use
        // native thread/read as the only fallback terminal authority. If native
        // state cannot prove that the Turn stopped, quarantine this conversation
        // instead of releasing its queue into a potentially overlapping Turn.
        void this.stopOperationallyFailedTurn(event);
    }
    async stopOperationallyFailedTurn(event) {
        if (!event.turnId)
            return;
        return this.requestNativeStop({ threadId: event.threadId, turnId: event.turnId }, textFromError(event.data.error) || 'Codex upstream response stream failed.');
    }
    requestNativeStop(handle, reason) {
        const key = this.turnKey(handle.threadId, handle.turnId);
        if (this.terminalEvents.has(key))
            return Promise.resolve();
        const existing = this.operationalStops.get(key);
        if (existing)
            return existing;
        const operation = this.reconcileStoppedTurn(handle, reason).finally(() => {
            if (this.operationalStops.get(key) === operation)
                this.operationalStops.delete(key);
        });
        this.operationalStops.set(key, operation);
        return operation;
    }
    async reconcileStoppedTurn(handle, reason) {
        const key = this.turnKey(handle.threadId, handle.turnId);
        let interruptError = '';
        try {
            await this.commands.interruptTurn(handle.threadId, handle.turnId);
        }
        catch (error) {
            interruptError = textFromError(error) || 'unknown error';
            this.options.onDiagnostic?.({ level: 'warning', message: `Failed to request Codex Turn interruption: ${interruptError}`, method: 'turn/interrupt' });
        }
        const attempts = Math.max(1, this.options.turnStopReconcileAttempts ?? DEFAULT_TURN_STOP_RECONCILE_ATTEMPTS);
        const delayMs = Math.max(0, this.options.turnStopReconcileDelayMs ?? DEFAULT_TURN_STOP_RECONCILE_DELAY_MS);
        let readError = '';
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            if (this.disposed || this.runtimeUnavailable || this.terminalEvents.has(key))
                return;
            try {
                const events = await this.catalog.readThread(handle.threadId);
                const terminal = [...events].reverse().find((candidate) => candidate.turnId === handle.turnId && (candidate.type === 'turn.completed' || candidate.type === 'turn.failed' || candidate.type === 'turn.interrupted'));
                if (terminal) {
                    this.emit(terminal);
                    return;
                }
            }
            catch (error) {
                readError = textFromError(error) || 'unknown error';
            }
            if (attempt + 1 < attempts && delayMs > 0)
                await new Promise((resolve) => {
                    const timer = setTimeout(resolve, delayMs);
                    timer.unref?.();
                });
        }
        if (this.disposed || this.runtimeUnavailable || this.terminalEvents.has(key))
            return;
        const bindingId = this.sessionIdByThreadId.get(handle.threadId);
        const session = bindingId ? this.sessions.get(bindingId) : undefined;
        const detail = [interruptError && `interrupt: ${interruptError}`, readError && `thread/read: ${readError}`].filter(Boolean).join('; ');
        const quarantineReason = `Codex Turn ${handle.turnId} could not be confirmed stopped. This conversation is quarantined; restart the product service before sending another command.${detail ? ` ${detail}` : ''}`;
        if (session)
            session.quarantinedReason = quarantineReason;
        this.clearTurnWatchdog(key);
        for (const waiter of this.waiters.get(key) ?? [])
            waiter.reject(new Error(quarantineReason));
        this.waiters.delete(key);
        const existingFailure = this.operationalFailures.get(key);
        if (existingFailure) {
            this.operationalFailures.set(key, { ...existingFailure, data: { ...existingFailure.data, error: reason, quarantined: true, quarantineReason } });
        }
        else {
            this.emit({ type: 'turn.disconnected', threadId: handle.threadId, turnId: handle.turnId, data: { error: reason, cause: 'stop_confirmation_timeout', quarantined: true, quarantineReason } });
        }
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
        if (notification.method === 'server/request/expired') {
            const requestId = String(asRecord(notification.params)?.id ?? '');
            if (requestId)
                this.pendingRequests.delete(requestId);
            return;
        }
        if (notification.method === 'server/request') {
            const request = notification.params;
            if (typeof request?.id === 'number')
                await this.handleServerRequest(request);
            return;
        }
        if (notification.method === 'runtime/disconnected') {
            this.runtimeUnavailable = true;
            this.pendingRequests.clear();
            const error = textFromError(asRecord(notification.params)?.error ?? notification.params) || 'Codex App Server disconnected.';
            for (const session of this.sessions.values()) {
                const activeTurnId = session.activeTurnId;
                const [event] = normalizeCodexNotification(notification, {
                    fallbackThreadId: session.binding.threadId,
                    fallbackTurnId: activeTurnId,
                    eventId: ({ method, suffix, threadId, turnId, itemId }) => this.eventId(`${method}:${suffix}`, threadId, turnId, itemId),
                });
                if (event)
                    this.emit(event);
                if (activeTurnId) {
                    this.emit({
                        id: this.eventId('owner:runtime-terminal', session.binding.threadId, activeTurnId),
                        type: 'turn.failed',
                        threadId: session.binding.threadId,
                        turnId: activeTurnId,
                        data: {
                            error,
                            cause: 'runtime_unavailable',
                            retainOutboxForRetry: true,
                            terminalCorrection: true,
                        },
                    });
                    const key = this.turnKey(session.binding.threadId, activeTurnId);
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
        const isQuestion = isToolUserInputRequestMethod(request.method);
        if (!isApprovalRequestMethod(request.method) && !isQuestion) {
            const reason = `Unsupported Codex server request method: ${request.method}`;
            this.options.onDiagnostic?.({ level: 'error', message: reason, method: request.method, params });
            await this.options.host.resolveServerRequest(request.id, { error: { code: -32601, message: reason } });
            return;
        }
        const kind = isQuestion ? 'question' : 'approval';
        const requestId = String(request.id);
        // Register before asynchronous policy evaluation. Expiry, terminal cleanup,
        // runtime disconnect, or dispose can now invalidate this exact entry and
        // prevent a late policy result from creating a ghost approval.
        const pending = { request, bindingId, kind };
        this.pendingRequests.set(requestId, pending);
        const decision = await this.options.policy?.evaluate(operation, session.binding, session.context) ?? { action: 'ask' };
        if (this.pendingRequests.get(requestId) !== pending)
            return;
        if (decision.action === 'allow') {
            await this.options.host.resolveServerRequest(request.id, decision.reply ?? { result: { decision: 'accept' } });
            this.pendingRequests.delete(requestId);
            this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'accept', automatic: true, reason: decision.reason } });
            return;
        }
        if (decision.action === 'deny') {
            await this.options.host.resolveServerRequest(request.id, decision.reply ?? { error: { code: -32000, message: decision.reason } });
            this.pendingRequests.delete(requestId);
            this.emit({ type: 'approval.resolved', threadId, turnId: operation.turnId, itemId: operation.itemId, data: { requestId: String(request.id), decision: 'decline', automatic: true, reason: decision.reason } });
            return;
        }
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