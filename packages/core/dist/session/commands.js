import { createTypedCodexClient } from '../protocol/methods.js';
import { asRecord } from '../protocol/index.js';
/**
 * A thread may be present in durable history while a freshly started App
 * Server has not materialized it yet.  Only this explicit error is safe to
 * retry: any other turn/start failure may have reached the server already.
 */
export function isThreadNotFoundError(error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /\bthread\s+(?:was\s+)?not\s+found\b/i.test(message);
}
function requiredId(value, label) {
    if (typeof value !== 'string')
        throw new Error(`${label} must be a string`);
    const normalized = value.trim();
    if (!normalized)
        throw new Error(`${label} is required`);
    return normalized;
}
function responseId(value, objectKey, label) {
    const nested = asRecord(asRecord(value)?.[objectKey]);
    return requiredId(nested?.id, label);
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
        return responseId(result, 'thread', 'thread/start result thread id');
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
        return responseId(result, 'thread', 'thread/fork result thread id');
    }
    async compactThread(threadId) {
        await this.client.call('thread/compact/start', { threadId: requiredId(threadId, 'threadId') });
    }
    async archiveThread(threadId) {
        await this.client.call('thread/archive', { threadId: requiredId(threadId, 'threadId') });
    }
    async startTurn(threadId, input) {
        const result = await this.client.call('turn/start', { ...input, threadId: requiredId(threadId, 'threadId') });
        return responseId(result, 'turn', 'turn/start result turn id');
    }
    /**
     * Starts a turn and self-heals one stale App Server materialization.
     *
     * `thread/resume` is deliberately attempted only after the server has
     * explicitly said that the thread is missing.  Retrying on transport,
     * timeout, or generic RPC failures could duplicate a mutating turn.
     */
    async startTurnWithResumeRecovery(threadId, input, resumeOverrides = {}) {
        const normalizedThreadId = requiredId(threadId, 'threadId');
        try {
            return await this.startTurn(normalizedThreadId, input);
        }
        catch (error) {
            if (!isThreadNotFoundError(error))
                throw error;
            await this.resumeThread(normalizedThreadId, resumeOverrides);
            return this.startTurn(normalizedThreadId, input);
        }
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