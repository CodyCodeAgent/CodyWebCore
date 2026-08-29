import { spawn } from 'node:child_process';
import { READ_RECOVERY_METHODS, isNotification, isServerRequest, normalizeRpcResponse, } from '../protocol/index.js';
export const CODY_WEB_CORE_VERSION = '0.33.2';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RESTART_COOLDOWN_MS = 1_750;
const MAX_LOGS = 80;
const MAX_LOG_LENGTH = 500;
function redactDiagnosticText(raw) {
    return raw
        .replace(/(authorization\s*:\s*(?:bearer|basic)\s+)[^\s,;]+/giu, '$1[REDACTED]')
        .replace(/\b(bearer\s+)[A-Za-z0-9._~+\/-]+=*/giu, '$1[REDACTED]')
        .replace(/(["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?token|client[_-]?secret|aws[_-]?secret[_-]?access[_-]?key|token|secret|password)["']?\s*[:=]\s*)["']?[^\s,"';}]+["']?/giu, '$1[REDACTED]')
        .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/giu, '$1[REDACTED]@')
        .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/giu, '[REDACTED PRIVATE KEY]');
}
function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value))
            deepFreeze(child);
    }
    return value;
}
function hintsFor(cause) {
    switch (cause) {
        case 'initialize_timeout': return ['Verify the Codex App Server command starts successfully and is compatible with this Core version.', 'Initialization may be slow; inspect the redacted logs before considering a larger RPC timeout.'];
        case 'rpc_timeout': return ['Check whether the reported method is still making progress before retrying.', 'If slow requests are expected, consider a method-level timeout after ruling out a stalled App Server.'];
        case 'process_exit': return ['Inspect the exit code, signal, and redacted stderr for a likely cause.', 'Restarting the App Server may help, but repeated exits should be investigated before automatic retries.'];
        case 'stdin_error': return ['The App Server input pipe may have closed; check process state before retrying.', 'Recreate the host if the process is no longer accepting RPC input.'];
        case 'malformed_json': return ['Check App Server compatibility and ensure stdout contains only JSON-RPC lines.', 'Use stderr for diagnostic text; repeated malformed stdout can indicate a wrapper or protocol mismatch.'];
    }
}
function splitCommand(command) {
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/gu)?.map((part) => part.replace(/^"|"$/gu, '')) ?? [];
    if (parts.length === 0)
        throw new Error('App Server command cannot be empty');
    return parts;
}
export function createAppServerHost(options = {}) {
    const pending = new Map();
    const pendingServerRequests = new Map();
    const listeners = new Set();
    const logs = [];
    const spawnAppServer = options.spawn ?? spawn;
    let process = null;
    let initialized = false;
    let initializePromise = null;
    let buffer = '';
    let sequence = 1;
    let stopping = false;
    let restartAt = 0;
    let recoveryPromise = null;
    let sent = 0;
    let completed = 0;
    let failed = 0;
    let notifications = 0;
    let serverRequests = 0;
    let startedAtIso = null;
    let exitedAtIso = null;
    let exitCode = null;
    let exitSignal = null;
    let lastFailure = null;
    let processGeneration = 0;
    let stdinFailureGeneration = -1;
    let insidePrivateKey = false;
    const notificationCountsByMethod = new Map();
    const pushLog = (level, source, raw) => {
        if (insidePrivateKey) {
            if (/-----END [^-]+ PRIVATE KEY-----/iu.test(raw))
                insidePrivateKey = false;
            return;
        }
        if (/-----BEGIN [^-]+ PRIVATE KEY-----/iu.test(raw) && !/-----END [^-]+ PRIVATE KEY-----/iu.test(raw)) {
            insidePrivateKey = true;
            raw = raw.replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*/iu, '[REDACTED PRIVATE KEY]');
        }
        const message = redactDiagnosticText(raw).replace(/\s+/gu, ' ').trim();
        if (!message)
            return;
        logs.push({ atIso: new Date().toISOString(), level, source, message: message.slice(0, MAX_LOG_LENGTH) });
        if (logs.length > MAX_LOGS)
            logs.splice(0, logs.length - MAX_LOGS);
    };
    const clientSummary = (id, entry, nowMs) => ({
        id, method: entry.method, startedAtIso: new Date(entry.startedAtMs).toISOString(),
        deadlineAtIso: new Date(entry.deadlineAtMs).toISOString(), durationMs: Math.max(0, nowMs - entry.startedAtMs),
    });
    const captureFailure = (phase, cause, failedMethod, message, pendingClientOverride) => {
        const nowMs = Date.now();
        const report = {
            schemaVersion: 1,
            capturedAtIso: new Date(nowMs).toISOString(),
            phase,
            cause,
            failedMethod,
            message: redactDiagnosticText(message).slice(0, MAX_LOG_LENGTH),
            process: {
                status: process ? 'running' : 'stopped', initialized, pid: process?.pid ?? null,
                startedAtIso, exitedAtIso, exitCode, exitSignal,
            },
            pendingClientRequests: pendingClientOverride ?? [...pending].map(([id, entry]) => clientSummary(id, entry, nowMs)),
            pendingServerRequests: [...pendingServerRequests.values()].map(request => ({
                id: request.id, method: request.method, receivedAtIso: request.receivedAtIso,
                durationMs: Math.max(0, nowMs - Date.parse(request.receivedAtIso)),
            })),
            recentLogs: logs.map(log => ({ ...log })),
            counts: {
                sentClientRequests: sent, completedClientRequests: completed, failedClientRequests: failed,
                notifications, serverRequests, notificationsByMethod: Object.fromEntries(notificationCountsByMethod),
            },
            hints: [...hintsFor(cause)],
        };
        lastFailure = deepFreeze(report);
        return lastFailure;
    };
    const emit = (method, params) => {
        notifications += 1;
        notificationCountsByMethod.set(method, (notificationCountsByMethod.get(method) ?? 0) + 1);
        const notification = { method, params, receivedAtIso: new Date().toISOString() };
        for (const listener of listeners)
            listener(notification);
    };
    const rejectPending = (reason) => {
        for (const entry of pending.values()) {
            clearTimeout(entry.timer);
            entry.reject(reason);
        }
        failed += pending.size;
        pending.clear();
    };
    const onLine = (line) => {
        let parsed;
        try {
            parsed = JSON.parse(line);
        }
        catch {
            pushLog('warning', 'stdout', 'Ignored malformed app-server JSON-RPC line.');
            captureFailure('protocol', 'malformed_json', null, 'App Server stdout contained malformed JSON.');
            return;
        }
        const message = normalizeRpcResponse(parsed);
        if (!message) {
            pushLog('warning', 'stdout', 'Ignored invalid app-server JSON-RPC payload.');
            captureFailure('protocol', 'malformed_json', null, 'App Server stdout contained an invalid JSON-RPC payload.');
            return;
        }
        if (typeof message.id === 'number' && pending.has(message.id) && !message.method) {
            const entry = pending.get(message.id);
            pending.delete(message.id);
            clearTimeout(entry.timer);
            if (message.error) {
                failed += 1;
                entry.reject(new Error(message.error.message));
            }
            else {
                completed += 1;
                entry.resolve(message.result);
            }
            return;
        }
        if (isNotification(message)) {
            emit(message.method, message.params ?? null);
            return;
        }
        if (isServerRequest(message)) {
            const request = { id: message.id, method: message.method, params: message.params ?? null, receivedAtIso: new Date().toISOString() };
            serverRequests += 1;
            pendingServerRequests.set(request.id, request);
            void Promise.resolve(options.onServerRequest?.(request)).then(async (reply) => {
                if (reply)
                    await resolveServerRequest(request.id, reply);
                else
                    emit('server/request', request);
            }).catch((error) => { pushLog('error', 'bridge', error instanceof Error ? error.message : String(error)); emit('server/request', request); });
        }
    };
    const start = () => {
        if (process)
            return;
        const [command, ...fromCommand] = splitCommand(options.command ?? 'codex app-server --stdio');
        const args = options.args ?? fromCommand;
        stopping = false;
        processGeneration += 1;
        process = spawnAppServer(command, args, { cwd: options.cwd, env: { ...globalThis.process.env, ...options.env }, stdio: ['pipe', 'pipe', 'pipe'] });
        const child = process;
        startedAtIso = new Date().toISOString();
        exitedAtIso = null;
        exitCode = null;
        exitSignal = null;
        pushLog('info', 'bridge', `App Server started${child.pid ? ` (pid ${String(child.pid)})` : ''}.`);
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            buffer += chunk;
            let end = buffer.indexOf('\n');
            while (end >= 0) {
                const line = buffer.slice(0, end).trim();
                buffer = buffer.slice(end + 1);
                if (line)
                    onLine(line);
                end = buffer.indexOf('\n');
            }
        });
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => chunk.split(/\r?\n/u).forEach((line) => pushLog('warning', 'stderr', line)));
        child.stdin.on('error', (error) => {
            const entries = [...pending].map(([id, entry]) => clientSummary(id, entry, Date.now()));
            const failedMethod = entries.length === 1 ? entries[0].method : null;
            pushLog('error', 'bridge', `stdin: ${error.message}`);
            rejectPending(new Error(`Codex App Server stdin failed: ${error.message}`));
            captureFailure('transport', 'stdin_error', failedMethod, 'The Codex App Server input pipe failed.', entries);
            stdinFailureGeneration = processGeneration;
        });
        child.on('error', (error) => pushLog('error', 'bridge', error.message));
        child.on('exit', (code, signal) => {
            const reason = new Error(stopping ? 'Codex App Server stopped' : `Codex App Server exited (${String(code ?? signal ?? 'unknown')})`);
            const entries = [...pending].map(([id, entry]) => clientSummary(id, entry, Date.now()));
            const failedMethod = entries.length === 1 ? entries[0].method : null;
            rejectPending(reason);
            exitedAtIso = new Date().toISOString();
            exitCode = typeof code === 'number' ? code : null;
            exitSignal = signal ?? null;
            if (!stopping) {
                for (const request of pendingServerRequests.values())
                    emit('server/request/expired', { ...request, error: reason.message });
                emit('runtime/disconnected', { error: reason.message });
            }
            process = null;
            initialized = false;
            initializePromise = null;
            buffer = '';
            pushLog(stopping ? 'info' : 'error', 'bridge', reason.message);
            if (!stopping && stdinFailureGeneration !== processGeneration)
                captureFailure('process', 'process_exit', failedMethod, reason.message, entries);
            pendingServerRequests.clear();
            if (!stopping)
                options.onDisconnected?.(reason);
        });
    };
    const send = (payload) => {
        if (!process)
            throw new Error('Codex App Server is not running');
        process.stdin.write(`${JSON.stringify(payload)}\n`);
    };
    const recover = (method) => {
        const canRecoverTimedOutMethod = method === 'initialize' || READ_RECOVERY_METHODS.has(method);
        if (!canRecoverTimedOutMethod || pending.size > 0 || pendingServerRequests.size > 0 || Date.now() < restartAt)
            return;
        restartAt = Date.now() + (options.restartCooldownMs ?? DEFAULT_RESTART_COOLDOWN_MS);
        pushLog('warning', 'bridge', `Restarting App Server after timed out ${method}.`);
        const recovery = stopProcess();
        const trackedRecovery = recovery.finally(() => {
            if (recoveryPromise === trackedRecovery)
                recoveryPromise = null;
        });
        recoveryPromise = trackedRecovery;
    };
    const call = (method, params = {}, rpcOptions = {}) => {
        start();
        const id = sequence++;
        const timeoutMs = Math.max(250, rpcOptions.timeoutMs ?? options.rpcTimeoutMs ?? DEFAULT_TIMEOUT_MS);
        sent += 1;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const timedOut = pending.get(id);
                if (!timedOut || !pending.delete(id))
                    return;
                failed += 1;
                const error = new Error(`codex app-server RPC ${method} timed out after ${String(timeoutMs)}ms`);
                pushLog('error', 'bridge', error.message);
                const nowMs = Date.now();
                captureFailure(method === 'initialize' ? 'initialize' : 'rpc', method === 'initialize' ? 'initialize_timeout' : 'rpc_timeout', method, error.message, [clientSummary(id, timedOut, nowMs), ...[...pending].map(([pendingId, entry]) => clientSummary(pendingId, entry, nowMs))]);
                recover(method);
                reject(error);
            }, timeoutMs);
            timer.unref?.();
            const startedAtMs = Date.now();
            pending.set(id, { method, startedAtMs, deadlineAtMs: startedAtMs + timeoutMs, timer, resolve: (value) => resolve(value), reject });
            try {
                send({ jsonrpc: '2.0', id, method, params });
            }
            catch (error) {
                const failedEntry = pending.get(id);
                clearTimeout(timer);
                pending.delete(id);
                failed += 1;
                const reason = error instanceof Error ? error : new Error(String(error));
                pushLog('error', 'bridge', `stdin: ${reason.message}`);
                captureFailure('transport', 'stdin_error', method, 'The Codex App Server input pipe failed.', failedEntry ? [clientSummary(id, failedEntry, Date.now())] : []);
                reject(reason);
            }
        });
    };
    const resolveServerRequest = async (id, reply) => {
        const request = pendingServerRequests.get(id);
        if (!request)
            throw new Error(`No pending server request found for id ${String(id)}`);
        pendingServerRequests.delete(id);
        if (reply.error)
            send({ jsonrpc: '2.0', id, error: reply.error });
        else
            send({ jsonrpc: '2.0', id, result: reply.result ?? {} });
        emit('server/request/resolved', { id, method: request.method, threadId: request.params && typeof request.params === 'object' ? request.params.threadId : undefined });
    };
    const ensureInitialized = async () => {
        if (recoveryPromise)
            await recoveryPromise;
        if (initialized)
            return;
        if (initializePromise)
            return initializePromise;
        initializePromise = (async () => {
            if (Date.now() < restartAt)
                await new Promise((resolve) => setTimeout(resolve, restartAt - Date.now()));
            try {
                await call('initialize', options.initializeParams ?? {
                    clientInfo: { name: 'cody-web-core', title: 'Cody Web Core', version: CODY_WEB_CORE_VERSION },
                    capabilities: { experimentalApi: true, requestAttestation: false },
                });
            }
            catch (error) {
                if (!(error instanceof Error) || !/already initialized/iu.test(error.message))
                    throw error;
                pushLog('warning', 'bridge', 'App Server was already initialized; reusing the current process.');
            }
            initialized = true;
        })().finally(() => { initializePromise = null; });
        return initializePromise;
    };
    const stopProcess = async () => {
        const child = process;
        if (!child)
            return;
        stopping = true;
        child.stdin.end();
        await new Promise((resolve) => {
            const timer = setTimeout(() => { child.kill('SIGTERM'); resolve(); }, 1_000);
            child.once('exit', () => { clearTimeout(timer); resolve(); });
        });
    };
    const dispose = async () => {
        if (recoveryPromise)
            await recoveryPromise;
        await stopProcess();
    };
    return {
        ensureInitialized,
        call,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        listPendingRequests() { return [...pendingServerRequests.values()]; },
        resolveServerRequest,
        diagnostics() {
            return {
                status: process ? 'running' : 'stopped', recovering: recoveryPromise !== null, initialized, pid: process?.pid ?? null,
                startedAtIso, exitedAtIso, exitCode, exitSignal,
                pendingClientRequestCount: pending.size, pendingServerRequestCount: pendingServerRequests.size,
                sentClientRequestCount: sent, completedClientRequestCount: completed, failedClientRequestCount: failed,
                notificationCount: notifications, serverRequestCount: serverRequests,
                notificationCountsByMethod: Object.fromEntries(notificationCountsByMethod), recentLogs: [...logs],
            };
        },
        failureReport() { return lastFailure; },
        dispose,
    };
}
//# sourceMappingURL=index.js.map