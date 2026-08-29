export { COMMAND_APPROVAL_REQUEST_METHOD, FILE_CHANGE_APPROVAL_REQUEST_METHOD, isApprovalRequestMethod, isCommandApprovalRequestMethod, isFileChangeApprovalRequestMethod, } from '../protocol/index.js';
export type ApprovalDecisionScope = 'single' | 'session' | 'workspace' | 'permanent';
export type CommandPolicyEvaluation = {
    status: 'allowed' | 'denied' | 'not_configured' | 'not_git_workspace';
    reason: string;
    cwd?: string;
    repoRoot?: string;
    command?: string;
    checkedValues?: string[];
    allowPatterns?: string[];
    denyPatterns?: string[];
    matchedPattern?: string;
    [key: string]: unknown;
};
export type FileChangePolicyEvaluation = {
    status: 'allowed' | 'denied' | 'not_git_workspace';
    category: 'workspace' | 'outside_workspace' | 'sensitive' | 'ignored' | 'read_only' | 'missing_grant_root' | 'not_git_workspace';
    reason: string;
    cwd?: string;
    repoRoot?: string;
    grantRoot?: string;
    relativePath?: string;
    sandboxMode?: string;
    matchedPattern?: string;
    [key: string]: unknown;
};
/** Structural approval input. Product adapters may attach additional audit evidence. */
export type ApprovalRequest = {
    method: string;
    params: unknown;
    commandPolicy?: CommandPolicyEvaluation | null;
    fileChangePolicy?: FileChangePolicyEvaluation | null;
};
export type ApprovalRiskLevel = 'low' | 'medium' | 'high';
export type ApprovalDecision = 'accept' | 'acceptForSession' | 'decline' | 'cancel';
export type ApprovalRiskSummary = {
    title: string;
    level: ApprovalRiskLevel;
    description: string;
    subject: string;
    riskLabels: string[];
    impacts: string[];
    recommendation: string;
};
export type ApprovalRiskTranslator = (key: string, replacements?: Record<string, string>) => string;
export type ApprovalScopeOption = {
    scope: ApprovalDecisionScope;
    label: string;
    enabled: boolean;
    description: string;
};
export declare const APPROVAL_SCOPE_OPTIONS: ApprovalScopeOption[];
export declare function translateApprovalRiskMessage(key: string, replacements?: Record<string, string>): string;
export declare function approvalScopeForDecision(decision: ApprovalDecision): ApprovalDecisionScope;
export declare function approvalDecisionForScope(scope: ApprovalDecisionScope): ApprovalDecision;
export declare function buildApprovalRiskSummary(request: ApprovalRequest, t?: ApprovalRiskTranslator): ApprovalRiskSummary;
//# sourceMappingURL=approval-risk.d.ts.map