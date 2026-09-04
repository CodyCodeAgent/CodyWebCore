export declare const KNOWN_REASONING_EFFORTS: readonly ["none", "minimal", "low", "medium", "high", "xhigh"];
export type KnownReasoningEffort = typeof KNOWN_REASONING_EFFORTS[number];
export type ComposerSubmitMode = 'queue' | 'steer';
export type ComposerCollaborationModeKind = 'default' | 'plan';
/**
 * A Composer preview is product-neutral. Native products may keep a local
 * filesystem `path`, while browser products intentionally expose only a
 * scoped preview URL and an opaque id.
 */
export type ComposerImage = {
    id: string;
    name: string;
    path?: string;
    url: string;
    mimeType: string;
};
export type ComposerSkill = {
    name: string;
    path: string;
    description: string;
    displayName: string;
};
export type ComposerContextAttachment<Kind extends string = string> = {
    id: string;
    kind: Kind;
    label: string;
    description: string;
    content: string;
    createdAtIso: string;
    metadata: Record<string, string | number | boolean>;
};
export type ComposerSubmission<Kind extends string = string> = {
    text: string;
    images: ComposerImage[];
    skills: ComposerSkill[];
    contexts?: ComposerContextAttachment<Kind>[];
};
export type NormalizedComposerSubmission<Kind extends string = string> = {
    text: string;
    images: ComposerImage[];
    skills: ComposerSkill[];
    contexts: ComposerContextAttachment<Kind>[];
    hasContent: boolean;
};
export type ComposerCollaborationModeOption = {
    name: string;
    mode: ComposerCollaborationModeKind;
    label: string;
    model: string;
    reasoningEffort: KnownReasoningEffort | '';
    developerInstructions: string | null;
};
export type CurrentModelPreference = {
    model: string;
    reasoningEffort: KnownReasoningEffort | '';
};
export type TurnCollaborationModePayload = {
    mode: ComposerCollaborationModeKind;
    settings: {
        model: string;
        reasoning_effort: KnownReasoningEffort | null;
        developer_instructions: string | null;
    };
};
export type ComposerTrigger = {
    query: string;
    start: number;
    end: number;
};
export type ComposerFileCandidate = {
    name?: string;
    type: string;
    size: number;
};
export type ComposerImageValidation = {
    accepted: true;
} | {
    accepted: false;
    reason: 'unsupported_type' | 'too_large';
};
export declare const DEFAULT_COLLABORATION_MODE: ComposerCollaborationModeOption;
export declare const FALLBACK_PLAN_COLLABORATION_MODE: ComposerCollaborationModeOption;
export declare const DEFAULT_COMPOSER_IMAGE_POLICY: {
    readonly maxCount: 8;
    readonly maxBytes: number;
    readonly supportedMimeTypes: readonly string[];
};
export declare function isKnownReasoningEffort(value: string): value is KnownReasoningEffort;
export declare function normalizeSelectedReasoningEffort(effort: string): KnownReasoningEffort | '' | null;
export declare function mergeCollaborationModeOptions(remoteOptions: readonly ComposerCollaborationModeOption[]): ComposerCollaborationModeOption[];
export declare function selectCollaborationModeName(requestedName: string, options: readonly ComposerCollaborationModeOption[]): string;
export declare function reconcileSelectedCollaborationModeName(selectedName: string, options: readonly ComposerCollaborationModeOption[]): string;
export declare function buildTurnCollaborationMode(option: ComposerCollaborationModeOption, fallbackModel: string, fallbackEffort: KnownReasoningEffort | ''): TurnCollaborationModePayload;
export declare function mergeAvailableModelsWithCurrent(modelIds: readonly string[], currentModel: string): string[];
export declare function selectModelId(currentSelectedModelId: string, modelIds: readonly string[], currentModel: string): string;
export declare function selectReasoningEffortFromPreference(currentSelectedEffort: KnownReasoningEffort | '', currentConfig: CurrentModelPreference): KnownReasoningEffort | '';
export declare function composerHasContent(input: {
    text?: string;
    images?: readonly unknown[];
    skills?: readonly unknown[];
    contexts?: readonly unknown[];
}): boolean;
export declare function normalizeComposerSubmission<Kind extends string>(submission: ComposerSubmission<Kind>): NormalizedComposerSubmission<Kind>;
export declare function resolveComposerSubmitMode(isTurnRunning: boolean, selectedMode: ComposerSubmitMode): ComposerSubmitMode;
export declare function materializeComposerContextText(text: string, contexts: readonly ComposerContextAttachment[], heading?: string): string;
export declare function findComposerTrigger(text: string, cursor: number, prefix: '$' | '@'): ComposerTrigger | null;
export declare function removeComposerTrigger(text: string, trigger: ComposerTrigger): {
    text: string;
    cursor: number;
};
export declare function validateComposerImage(file: ComposerFileCandidate, policy?: {
    maxBytes: number;
    supportedMimeTypes: readonly string[];
}): ComposerImageValidation;
//# sourceMappingURL=index.d.ts.map