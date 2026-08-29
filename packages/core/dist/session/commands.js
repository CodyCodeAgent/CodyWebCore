import { createTypedCodexClient } from '../protocol/methods.js';
function requiredId(value, label) {
    const normalized = value.trim();
    if (!normalized)
        throw new Error(`${label} is required`);
    return normalized;
}
/**
 * Stateless, schema-bound Codex thread and turn commands.
 *
 * Products own navigation, policy selection, queue UX, and error localization;
 * this class owns exact RPC names, wire payloads, identifier normalization, and
 * malformed-success rejection.
 */
export class CodexThreadCommands {
    client;
    constructor(rpc) {
        this.client = createTypedCodexClient(rpc);
    }
    async startThread(params = {}) {
        const result = await this.client.call('thread/start', params);
        return requiredId(result.thread.id, 'thread/start result thread id');
    }
    async resumeThread(threadId, overrides = {}) {
        await this.client.call('thread/resume', { ...overrides, threadId: requiredId(threadId, 'threadId') });
    }
    async renameThread(threadId, name) {
        await this.client.call('thread/name/set', {
            threadId: requiredId(threadId, 'threadId'),
            name: requiredId(name, 'thread name'),
        });
    }
    async forkThread(threadId, overrides = {}) {
        const result = await this.client.call('thread/fork', { ...overrides, threadId: requiredId(threadId, 'threadId') });
        return requiredId(result.thread.id, 'thread/fork result thread id');
    }
    async compactThread(threadId) {
        await this.client.call('thread/compact/start', { threadId: requiredId(threadId, 'threadId') });
    }
    async archiveThread(threadId) {
        await this.client.call('thread/archive', { threadId: requiredId(threadId, 'threadId') });
    }
    async startTurn(threadId, input) {
        const result = await this.client.call('turn/start', { ...input, threadId: requiredId(threadId, 'threadId') });
        return requiredId(result.turn.id, 'turn/start result turn id');
    }
    async steerTurn(threadId, expectedTurnId, input) {
        await this.client.call('turn/steer', {
            threadId: requiredId(threadId, 'threadId'),
            expectedTurnId: requiredId(expectedTurnId, 'expectedTurnId'),
            input,
        });
    }
    async interruptTurn(threadId, turnId) {
        await this.client.call('turn/interrupt', {
            threadId: requiredId(threadId, 'threadId'),
            turnId: requiredId(turnId, 'turnId'),
        });
    }
}
//# sourceMappingURL=commands.js.map