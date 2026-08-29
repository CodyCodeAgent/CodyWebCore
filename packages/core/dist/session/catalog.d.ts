import { type CodexRpcCaller } from '../protocol/methods.js';
import type { CollaborationMode } from '../protocol/generated/CollaborationMode.js';
import type { ReasoningEffort } from '../protocol/generated/ReasoningEffort.js';
import type { CodexEvent } from '../conversation/index.js';
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
    listModels(): Promise<CodexModelOption[]>;
    listCollaborationModes(): Promise<CodexCollaborationModeOption[]>;
    setCollaborationMode(threadId: string, collaborationMode: CollaborationMode): Promise<void>;
    setGoal(threadId: string, objective: string, status?: 'active' | 'complete'): Promise<void>;
    clearGoal(threadId: string): Promise<void>;
}
//# sourceMappingURL=catalog.d.ts.map