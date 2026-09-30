import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { client, methods, ndJsonStream, PROTOCOL_VERSION, } from '@agentclientprotocol/sdk';
export function splitAcpCommand(value) {
    const parts = value.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^("|')|("|')$/g, '')) ?? [];
    if (!parts[0])
        throw new Error('ACP 启动命令不能为空');
    return { command: parts[0], args: parts.slice(1) };
}
/** Provider-neutral ACP process/session owner. Core owns transport and native
 * Session lifecycle; products map updates into their own presentation model. */
export class AcpSessionHost {
    options;
    sessions = new Map();
    constructor(options) {
        this.options = options;
    }
    get size() { return this.sessions.size; }
    async probe() { const opened = await this.openConnection(); await this.closeConnection(opened); }
    async open(options) {
        const existing = this.sessions.get(options.bindingId);
        if (existing) {
            if (options.sessionId && existing.sessionId !== options.sessionId)
                throw new Error('ACP 会话绑定与请求的原生 Session 不一致');
            return existing;
        }
        const opened = await this.openConnection();
        try {
            const response = options.sessionId
                ? await this.loadOrResume(opened, options.sessionId, options.cwd)
                : await opened.connection.agent.request(methods.agent.session.new, { cwd: options.cwd, mcpServers: [] });
            const sessionId = options.sessionId ?? response.sessionId;
            const session = {
                bindingId: options.bindingId, sessionId, process: opened.process, connection: opened.connection,
                capabilities: opened.capabilities, configOptions: response.configOptions ?? [],
                closed: false, updateListeners: new Set(), permissionHandler: null,
            };
            opened.attach(session);
            this.sessions.set(options.bindingId, session);
            return session;
        }
        catch (error) {
            await this.closeConnection(opened);
            throw error;
        }
    }
    require(bindingId) {
        const session = this.sessions.get(bindingId);
        if (!session || session.closed)
            throw new Error('ACP conversation runtime is not available');
        return session;
    }
    subscribe(session, listener) {
        this.assertOwned(session);
        session.updateListeners.add(listener);
        return () => session.updateListeners.delete(listener);
    }
    setPermissionHandler(session, handler) { this.assertOwned(session); session.permissionHandler = handler; }
    async prompt(session, prompt) {
        this.assertOwned(session);
        return await session.connection.agent.request(methods.agent.session.prompt, { sessionId: session.sessionId, prompt });
    }
    async cancel(session) { this.assertOwned(session); await session.connection.agent.notify(methods.agent.session.cancel, { sessionId: session.sessionId }); }
    async setConfigOption(session, configId, value) {
        this.assertOwned(session);
        const response = await session.connection.agent.request(methods.agent.session.setConfigOption, { sessionId: session.sessionId, configId, value });
        if (response.configOptions)
            session.configOptions = response.configOptions;
    }
    async list(cwd) {
        const opened = await this.openConnection();
        try {
            if (!opened.capabilities.sessionCapabilities?.list)
                throw new Error('当前 ACP 未声明 session/list 能力');
            const response = await opened.connection.agent.request(methods.agent.session.list, { cwd });
            return response.sessions.map((item) => ({ sessionId: item.sessionId, ...(item.title ? { title: item.title } : {}), ...(item.cwd ? { cwd: item.cwd } : {}) }));
        }
        finally {
            await this.closeConnection(opened);
        }
    }
    async close(session) { this.terminate(session); }
    terminate(session) {
        if (session.closed)
            return;
        session.closed = true;
        this.sessions.delete(session.bindingId);
        session.permissionHandler = null;
        session.updateListeners.clear();
        session.connection.close();
        if (!session.process.killed)
            session.process.kill();
    }
    async closeAll() { await Promise.all([...this.sessions.values()].map((session) => this.close(session))); }
    static supportsImage(session) { return session.capabilities.promptCapabilities?.image === true; }
    async openConnection() {
        const { command, args } = splitAcpCommand(this.options.command);
        const process = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...globalThis.process.env, ...this.options.env } });
        const app = client({ name: this.options.clientName ?? 'cody-web-core' });
        let session;
        app.onNotification(methods.client.session.update, ({ params }) => { if (session && params.sessionId === session.sessionId)
            for (const listener of session.updateListeners)
                listener(params.update); });
        app.onRequest(methods.client.session.requestPermission, async ({ params }) => {
            if (!session || params.sessionId !== session.sessionId)
                return { outcome: { outcome: 'cancelled' } };
            const optionId = await session.permissionHandler?.({ options: params.options, toolCall: params.toolCall });
            return optionId ? { outcome: { outcome: 'selected', optionId } } : { outcome: { outcome: 'cancelled' } };
        });
        const connection = app.connect(ndJsonStream(Writable.toWeb(process.stdin), Readable.toWeb(process.stdout)));
        try {
            const initialized = await connection.agent.request(methods.agent.initialize, { protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} });
            return { process, connection, capabilities: initialized.agentCapabilities ?? {}, attach: (value) => { session = value; } };
        }
        catch (error) {
            connection.close(error);
            process.kill();
            throw new Error('ACP 初始化失败');
        }
    }
    async loadOrResume(opened, sessionId, cwd) {
        if (opened.capabilities.loadSession)
            return await opened.connection.agent.request(methods.agent.session.load, { sessionId, cwd, mcpServers: [] });
        if (opened.capabilities.sessionCapabilities?.resume)
            return await opened.connection.agent.request(methods.agent.session.resume, { sessionId, cwd });
        throw new Error('当前 ACP 未声明恢复原生 Session 的能力');
    }
    async closeConnection(opened) { opened.connection.close(); if (!opened.process.killed)
        opened.process.kill(); }
    assertOwned(session) { if (this.sessions.get(session.bindingId) !== session || session.closed)
        throw new Error('ACP conversation runtime is not available'); }
}
//# sourceMappingURL=index.js.map