import { type CodexRpcCaller } from '../protocol/methods.js';
import type { CollaborationMode } from '../protocol/generated/CollaborationMode.js';
import type { ReasoningEffort } from '../protocol/generated/ReasoningEffort.js';
import type { SkillScope } from '../protocol/generated/v2/SkillScope.js';
import { type CodexEvent } from '../conversation/index.js';
export interface CodexThreadSummary {
    threadId: string;
    preview: string;
    name: string;
    cwd: string;
    createdAtIso: string;
    updatedAtIso: string;
    source: string;
    canAcceptDirectInput: boolean | null;
}
export interface CodexModelOption {
    id: string;
    model: string;
    label: string;
    description: string;
    hidden: boolean;
    isDefault: boolean;
    defaultReasoningEffort: ReasoningEffort;
    supportedReasoningEfforts: ReasoningEffort[];
}
export interface CodexCollaborationModeOption {
    name: string;
    mode: string;
    model: string;
    reasoningEffort: ReasoningEffort | '';
}
export interface CodexTurnSnapshot {
    turnId: string;
    status: string;
    error: string;
    assistantText: string;
    startedAtIso: string;
    completedAtIso: string;
    durationMs: number | null;
    events: CodexEvent[];
}
export interface CodexThreadSnapshot {
    summary: CodexThreadSummary;
    turns: CodexTurnSnapshot[];
    events: CodexEvent[];
}
export interface CodexSkillOption {
    name: string;
    path: string;
    displayName: string;
    description: string;
    scope: SkillScope;
    enabled: boolean;
}
export interface CodexSkillCatalogGroup {
    cwd: string;
    skills: CodexSkillOption[];
    errors: Array<{
        path: string;
        message: string;
    }>;
}
export interface ListCodexThreadsOptions {
    archived?: boolean;
    limit?: number;
    maxPages?: number;
    cwd?: string | string[];
    searchTerm?: string;
}
export declare class CodexSessionCatalog {
    private readonly client;
    constructor(rpc: CodexRpcCaller);
    listThreads(options?: ListCodexThreadsOptions): Promise<CodexThreadSummary[]>;
    readThread(threadId: string): Promise<CodexEvent[]>;
    readThreadSnapshot(threadId: string, includeTurns?: boolean): Promise<CodexThreadSnapshot>;
    listModels(): Promise<CodexModelOption[]>;
    listCollaborationModes(): Promise<CodexCollaborationModeOption[]>;
    listSkillCatalog(cwds?: string[], forceReload?: boolean): Promise<CodexSkillCatalogGroup[]>;
    listSkills(cwds?: string[], forceReload?: boolean): Promise<CodexSkillOption[]>;
    setSkillEnabled(path: string, enabled: boolean): Promise<void>;
    setCollaborationMode(threadId: string, collaborationMode: CollaborationMode): Promise<void>;
    setGoal(threadId: string, objective: string, status?: 'active' | 'complete'): Promise<void>;
    clearGoal(threadId: string): Promise<void>;
}
//# sourceMappingURL=catalog.d.ts.map