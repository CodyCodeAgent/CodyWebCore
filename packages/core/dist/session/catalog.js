import { asRecord } from '../protocol/index.js';
import { createTypedCodexClient } from '../protocol/methods.js';
import { normalizeThreadHistory } from './normalization.js';
function timestampIso(seconds) {
    return Number.isFinite(seconds) ? new Date(seconds * 1_000).toISOString() : '';
}
function sourceLabel(value) {
    if (typeof value === 'string')
        return value;
    const row = asRecord(value);
    if (!row)
        return '';
    const kind = typeof row.type === 'string' ? row.type : typeof row.kind === 'string' ? row.kind : Object.keys(row)[0];
    return kind ?? '';
}
export class CodexSessionCatalog {
    client;
    constructor(rpc) {
        this.client = createTypedCodexClient(rpc);
    }
    async listThreads(options = {}) {
        const rows = [];
        const limit = Math.max(1, Math.min(options.limit ?? 100, 100));
        const maxPages = Math.max(1, Math.min(options.maxPages ?? 10, 100));
        let cursor = null;
        for (let page = 0; page < maxPages; page += 1) {
            const result = await this.client.call('thread/list', {
                archived: options.archived ?? false,
                limit,
                sortKey: 'updated_at',
                sortDirection: 'desc',
                ...(cursor ? { cursor } : {}),
                ...(options.cwd ? { cwd: options.cwd } : {}),
                ...(options.searchTerm?.trim() ? { searchTerm: options.searchTerm.trim() } : {}),
            });
            rows.push(...result.data.map(thread => ({
                threadId: thread.id,
                preview: thread.preview.trim(),
                name: thread.name?.trim() ?? '',
                cwd: thread.cwd.trim(),
                createdAtIso: timestampIso(thread.createdAt),
                updatedAtIso: timestampIso(thread.updatedAt),
                source: sourceLabel(thread.source),
                canAcceptDirectInput: thread.canAcceptDirectInput,
            })));
            cursor = result.nextCursor;
            if (!cursor)
                break;
        }
        return rows;
    }
    async readThread(threadId) {
        const normalized = threadId.trim();
        if (!normalized)
            throw new Error('threadId is required');
        const result = await this.client.call('thread/read', { threadId: normalized, includeTurns: true });
        return normalizeThreadHistory(result, normalized);
    }
    async listModels() {
        const rows = [];
        let cursor = null;
        do {
            const result = await this.client.call('model/list', { limit: 100, ...(cursor ? { cursor } : {}) });
            rows.push(...result.data.map(model => ({
                id: model.id,
                model: model.model,
                label: model.displayName || model.id,
                description: model.description,
                hidden: model.hidden,
                isDefault: model.isDefault,
                defaultReasoningEffort: model.defaultReasoningEffort,
                supportedReasoningEfforts: model.supportedReasoningEfforts.map(option => option.reasoningEffort),
            })));
            cursor = result.nextCursor;
        } while (cursor);
        return rows;
    }
    async listCollaborationModes() {
        const result = await this.client.call('collaborationMode/list', {});
        return result.data.map(mode => ({
            name: mode.name,
            mode: mode.mode ?? 'default',
            model: mode.model ?? '',
            reasoningEffort: mode.reasoning_effort ?? '',
        }));
    }
    async setCollaborationMode(threadId, collaborationMode) {
        await this.client.call('thread/settings/update', { threadId, collaborationMode });
    }
    async setGoal(threadId, objective, status = 'active') {
        await this.client.call('thread/goal/set', { threadId, objective, status });
    }
    async clearGoal(threadId) {
        await this.client.call('thread/goal/clear', { threadId });
    }
}
//# sourceMappingURL=catalog.js.map