import { spawn } from 'node:child_process';
import { READ_RECOVERY_METHODS, isNotification, isServerRequest, normalizeRpcResponse, } from '../protocol/index.js';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RESTART_COOLDOWN_MS = 1_750;
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
    let sent = 0;
    let completed = 0;
    let failed = 0;
    let notifications = 0;
    let serverRequests = 0;
    let startedAtIso = null;
    let exitedAtIso = null;
    let exitCode = null;
    let exitSignal = null;
    const notificationCountsByMethod = new Map();
    const pushLog = (level, source, raw) => {
        const message = raw.replace(/\s+/gu, ' ').trim();
        if (!message)
            return;
        logs.push({ atIso: new Date().toISOString(), level, source, message: message.slice(0, 500) });
        if (logs.length > 80)
            logs.splice(0, logs.length - 80);
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
        const message = normalizeRpcResponse(JSON.parse(line));
        if (!message) {
            pushLog('warning', 'stdout', 'Ignored invalid app-server JSON-RPC payload.');
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
                if (line) {
                    try {
                        onLine(line);
                    }
                    catch {
                        pushLog('warning', 'stdout', 'Ignored malformed app-server JSON-RPC line.');
                    }
                }
                end = buffer.indexOf('\n');
            }
        });
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => chunk.split(/\r?\n/u).forEach((line) => pushLog('warning', 'stderr', line)));
        child.stdin.on('error', (error) => pushLog('error', 'bridge', `stdin: ${error.message}`));
        child.on('error', (error) => pushLog('error', 'bridge', error.message));
        child.on('exit', (code, signal) => {
            const reason = new Error(stopping ? 'Codex App Server stopped' : `Codex App Server exited (${String(code ?? signal ?? 'unknown')})`);
            rejectPending(reason);
            exitedAtIso = new Date().toISOString();
            exitCode = typeof code === 'number' ? code : null;
            exitSignal = signal ?? null;
            if (!stopping) {
                for (const request of pendingServerRequests.values())
                    emit('server/request/expired', { ...request, error: reason.message });
                emit('runtime/disconnected', { error: reason.message });
            }
            pendingServerRequests.clear();
            process = null;
            initialized = false;
            initializePromise = null;
            buffer = '';
            pushLog(stopping ? 'info' : 'error', 'bridge', reason.message);
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
        if (!READ_RECOVERY_METHODS.has(method) || pending.size > 0 || pendingServerRequests.size > 0 || Date.now() < restartAt)
            return;
        restartAt = Date.now() + (options.restartCooldownMs ?? DEFAULT_RESTART_COOLDOWN_MS);
        pushLog('warning', 'bridge', `Restarting App Server after timed out ${method}.`);
        void dispose();
    };
    const call = (method, params = {}, rpcOptions = {}) => {
        start();
        const id = sequence++;
        const timeoutMs = Math.max(250, rpcOptions.timeoutMs ?? options.rpcTimeoutMs ?? DEFAULT_TIMEOUT_MS);
        sent += 1;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (!pending.delete(id))
                    return;
                failed += 1;
                const error = new Error(`codex app-server RPC ${method} timed out after ${String(timeoutMs)}ms`);
                pushLog('error', 'bridge', error.message);
                recover(method);
                reject(error);
            }, timeoutMs);
            timer.unref?.();
            pending.set(id, { method, timer, resolve: (value) => resolve(value), reject });
            try {
                send({ jsonrpc: '2.0', id, method, params });
            }
            catch (error) {
                clearTimeout(timer);
                pending.delete(id);
                failed += 1;
                reject(error);
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
        if (initialized)
            return;
        if (initializePromise)
            return initializePromise;
        initializePromise = (async () => {
            if (Date.now() < restartAt)
                await new Promise((resolve) => setTimeout(resolve, restartAt - Date.now()));
            try {
                await call('initialize', options.initializeParams ?? {
                    clientInfo: { name: 'cody-web-core', title: 'Cody Web Core', version: '0.5.0' },
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
    const dispose = async () => {
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
    return {
        ensureInitialized,
        call,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        listPendingRequests() { return [...pendingServerRequests.values()]; },
        resolveServerRequest,
        diagnostics() {
            return {
                status: process ? 'running' : 'stopped', initialized, pid: process?.pid ?? null,
                startedAtIso, exitedAtIso, exitCode, exitSignal,
                pendingClientRequestCount: pending.size, pendingServerRequestCount: pendingServerRequests.size,
                sentClientRequestCount: sent, completedClientRequestCount: completed, failedClientRequestCount: failed,
                notificationCount: notifications, serverRequestCount: serverRequests,
                notificationCountsByMethod: Object.fromEntries(notificationCountsByMethod), recentLogs: [...logs],
            };
        },
        dispose,
    };
}
//# sourceMappingURL=index.js.map