import { asRecord } from '../protocol/index.js';
import { createTypedCodexClient } from '../protocol/methods.js';
import { normalizeThreadHistory, textFromError } from './normalization.js';
import { latestAssistantTextFromEvents } from '../conversation/index.js';
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
function threadSummary(thread) {
    return {
        threadId: thread.id.trim(),
        sessionId: thread.sessionId.trim(),
        parentThreadId: thread.parentThreadId?.trim() ?? '',
        forkedFromThreadId: thread.forkedFromId?.trim() ?? '',
        preview: thread.preview.trim(),
        name: thread.name?.trim() ?? '',
        cwd: thread.cwd.trim(),
        createdAtIso: timestampIso(thread.createdAt),
        updatedAtIso: timestampIso(thread.updatedAt),
        source: sourceLabel(thread.source),
        status: thread.status.type,
        activeFlags: thread.status.type === 'active' ? thread.status.activeFlags.map(sourceLabel).filter(Boolean) : [],
        ephemeral: thread.ephemeral,
        canAcceptDirectInput: thread.canAcceptDirectInput,
    };
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
            rows.push(...result.data.map(threadSummary));
            cursor = result.nextCursor;
            if (!cursor)
                break;
        }
        return rows;
    }
    async readThread(threadId) {
        return (await this.readThreadSnapshot(threadId)).events;
    }
    async readThreadSnapshot(threadId, includeTurns = true) {
        const normalized = threadId.trim();
        if (!normalized)
            throw new Error('threadId is required');
        const result = await this.client.call('thread/read', { threadId: normalized, includeTurns });
        const events = includeTurns ? normalizeThreadHistory(result, normalized) : [];
        return {
            summary: threadSummary(result.thread),
            events,
            turns: includeTurns ? result.thread.turns.map(turn => {
                const turnEvents = events.filter(event => event.turnId === turn.id);
                return {
                    turnId: turn.id,
                    status: turn.status,
                    error: textFromError(turn.error),
                    assistantText: latestAssistantTextFromEvents(turnEvents),
                    startedAtIso: turn.startedAt === null ? '' : timestampIso(turn.startedAt),
                    completedAtIso: turn.completedAt === null ? '' : timestampIso(turn.completedAt),
                    durationMs: turn.durationMs,
                    events: turnEvents,
                };
            }) : [],
        };
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
    async listSkillCatalog(cwds = [], forceReload = false) {
        const normalizedCwds = [...new Set(cwds.map(cwd => cwd.trim()).filter(Boolean))];
        const result = await this.client.call('skills/list', {
            ...(normalizedCwds.length ? { cwds: normalizedCwds } : {}),
            ...(forceReload ? { forceReload: true } : {}),
        });
        return result.data.map(group => ({
            cwd: group.cwd.trim(),
            skills: group.skills.map(skill => ({
                name: skill.name.trim(),
                path: skill.path.trim(),
                displayName: skill.interface?.displayName?.trim() || skill.name.trim(),
                description: skill.interface?.shortDescription?.trim() || skill.shortDescription?.trim() || skill.description.trim(),
                scope: skill.scope,
                enabled: skill.enabled,
                brandColor: skill.interface?.brandColor?.trim() ?? '',
                iconSmall: skill.interface?.iconSmall?.trim() || skill.interface?.iconSmallUrl?.trim() || '',
                iconLarge: skill.interface?.iconLarge?.trim() || skill.interface?.iconLargeUrl?.trim() || '',
                defaultPrompt: skill.interface?.defaultPrompt?.trim() ?? '',
                dependencies: (skill.dependencies?.tools ?? []).map(dependency => ({
                    type: dependency.type.trim(),
                    value: dependency.value.trim(),
                    description: dependency.description?.trim() ?? '',
                    transport: dependency.transport?.trim() ?? '',
                    command: dependency.command?.trim() ?? '',
                    url: dependency.url?.trim() ?? '',
                })),
            })),
            errors: group.errors.map(error => ({ path: error.path.trim(), message: error.message.trim() })),
        }));
    }
    async listSkills(cwds = [], forceReload = false) {
        const byIdentity = new Map();
        for (const group of await this.listSkillCatalog(cwds, forceReload)) {
            for (const skill of group.skills) {
                if (!skill.name || !skill.path)
                    continue;
                byIdentity.set(`${skill.name}\n${skill.path}`, skill);
            }
        }
        return [...byIdentity.values()].sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path));
    }
    async setSkillEnabled(path, enabled) {
        const normalized = path.trim();
        if (!normalized)
            throw new Error('skill path is required');
        await this.client.call('skills/config/write', { path: normalized, enabled });
    }
    async setCollaborationMode(threadId, collaborationMode) {
        await this.client.call('thread/settings/update', { threadId, collaborationMode });
    }
    async getGoal(threadId) {
        const normalized = threadId.trim();
        if (!normalized)
            throw new Error('threadId is required');
        const result = await this.client.call('thread/goal/get', { threadId: normalized });
        const goal = result.goal;
        return goal ? {
            threadId: goal.threadId.trim(),
            objective: goal.objective.trim(),
            status: goal.status,
            tokenBudget: goal.tokenBudget,
            tokensUsed: goal.tokensUsed,
            timeUsedSeconds: goal.timeUsedSeconds,
            createdAtIso: timestampIso(goal.createdAt),
            updatedAtIso: timestampIso(goal.updatedAt),
        } : null;
    }
    async setGoal(threadId, input) {
        const normalized = threadId.trim();
        if (!normalized)
            throw new Error('threadId is required');
        await this.client.call('thread/goal/set', {
            threadId: normalized,
            ...(input.objective !== undefined ? { objective: input.objective?.trim() || null } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.tokenBudget !== undefined ? { tokenBudget: input.tokenBudget } : {}),
        });
    }
    async clearGoal(threadId) {
        await this.client.call('thread/goal/clear', { threadId });
    }
}
//# sourceMappingURL=catalog.js.map