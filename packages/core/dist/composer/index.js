export const KNOWN_REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];
export const DEFAULT_COLLABORATION_MODE = {
    name: 'default', mode: 'default', label: 'Default', model: '', reasoningEffort: '', developerInstructions: null,
};
export const FALLBACK_PLAN_COLLABORATION_MODE = {
    name: 'plan', mode: 'plan', label: 'Plan', model: '', reasoningEffort: '', developerInstructions: null,
};
export const DEFAULT_COMPOSER_IMAGE_POLICY = {
    maxCount: 8,
    maxBytes: 20 * 1024 * 1024,
    supportedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
};
export function isKnownReasoningEffort(value) {
    return KNOWN_REASONING_EFFORTS.includes(value);
}
export function normalizeSelectedReasoningEffort(effort) {
    if (!effort)
        return '';
    return isKnownReasoningEffort(effort) ? effort : null;
}
export function mergeCollaborationModeOptions(remoteOptions) {
    const nextOptions = [DEFAULT_COLLABORATION_MODE];
    const seenModes = new Set([DEFAULT_COLLABORATION_MODE.mode]);
    const seenNames = new Set([DEFAULT_COLLABORATION_MODE.name.toLowerCase()]);
    for (const rawOption of remoteOptions) {
        const name = rawOption.name.trim();
        const label = rawOption.label.trim() || name;
        const normalizedName = name.toLowerCase();
        // The UI has exactly one option for each semantic mode. The canonical
        // Default belongs to the shared composer, while a product may customise
        // the first available Plan option with its own label/settings.
        if (!name || seenModes.has(rawOption.mode) || seenNames.has(normalizedName))
            continue;
        seenModes.add(rawOption.mode);
        seenNames.add(normalizedName);
        nextOptions.push({ ...rawOption, name, label });
    }
    if (!seenModes.has('plan'))
        nextOptions.push(FALLBACK_PLAN_COLLABORATION_MODE);
    return nextOptions;
}
export function selectCollaborationModeName(requestedName, options) {
    const normalizedName = requestedName.trim();
    if (!normalizedName)
        return DEFAULT_COLLABORATION_MODE.name;
    return options.find((candidate) => candidate.name.toLowerCase() === normalizedName.toLowerCase())?.name ?? '';
}
export function reconcileSelectedCollaborationModeName(selectedName, options) {
    const exact = selectCollaborationModeName(selectedName, options);
    if (exact)
        return exact;
    const modeAlias = selectedName.trim().toLowerCase();
    if (modeAlias === 'plan' || modeAlias === 'default')
        return options.find((candidate) => candidate.mode === modeAlias)?.name ?? DEFAULT_COLLABORATION_MODE.name;
    return DEFAULT_COLLABORATION_MODE.name;
}
export function buildTurnCollaborationMode(option, fallbackModel, fallbackEffort) {
    return { mode: option.mode, settings: { model: option.model.trim() || fallbackModel.trim(), reasoning_effort: option.reasoningEffort || fallbackEffort || null, developer_instructions: option.developerInstructions } };
}
export function mergeAvailableModelsWithCurrent(modelIds, currentModel) {
    const unique = [...new Set(modelIds.map((model) => model.trim()).filter(Boolean))];
    const normalizedCurrent = currentModel.trim();
    return normalizedCurrent && !unique.includes(normalizedCurrent) ? [normalizedCurrent, ...unique] : unique;
}
export function selectModelId(currentSelectedModelId, modelIds, currentModel) {
    const normalizedSelected = currentSelectedModelId.trim();
    if (normalizedSelected && modelIds.includes(normalizedSelected))
        return normalizedSelected;
    return currentModel.trim() || modelIds[0] || '';
}
export function selectReasoningEffortFromPreference(currentSelectedEffort, currentConfig) {
    return currentConfig.reasoningEffort && isKnownReasoningEffort(currentConfig.reasoningEffort) ? currentConfig.reasoningEffort : currentSelectedEffort;
}
export function composerHasContent(input) {
    return Boolean(input.text?.trim()) || Boolean(input.images?.length) || Boolean(input.skills?.length) || Boolean(input.contexts?.length);
}
export function normalizeComposerSubmission(submission) {
    const normalized = {
        text: submission.text.trim(),
        images: submission.images.map((image) => ({ ...image })),
        skills: submission.skills.map((skill) => ({ ...skill, name: skill.name.trim(), path: skill.path.trim() })).filter((skill) => skill.name && skill.path),
        contexts: (submission.contexts ?? []).map((context) => ({ ...context, metadata: { ...context.metadata } })),
    };
    return { ...normalized, hasContent: composerHasContent(normalized) };
}
export function resolveComposerSubmitMode(isTurnRunning, selectedMode) {
    return isTurnRunning && selectedMode === 'steer' ? 'steer' : 'queue';
}
export function materializeComposerContextText(text, contexts, heading = 'Attached Workspace Context') {
    const trimmedText = text.trim();
    if (contexts.length === 0)
        return trimmedText;
    const blocks = contexts.map((context) => [`### ${context.label}`, context.description, '', context.content.trim()].filter(Boolean).join('\n'));
    return [trimmedText, `## ${heading}`, ...blocks].filter(Boolean).join('\n\n');
}
export function findComposerTrigger(text, cursor, prefix) {
    const beforeCursor = text.slice(0, Math.max(0, Math.min(cursor, text.length)));
    const escapedPrefix = prefix === '$' ? '\\$' : '@';
    const match = beforeCursor.match(new RegExp(`(^|\\s)${escapedPrefix}([^\\s${escapedPrefix}]*)$`, 'u'));
    if (!match || typeof match.index !== 'number')
        return null;
    return { query: (match[2] ?? '').toLowerCase(), start: match.index + (match[1]?.length ?? 0), end: beforeCursor.length };
}
export function removeComposerTrigger(text, trigger) {
    const before = text.slice(0, trigger.start);
    const after = text.slice(trigger.end);
    const needsSpace = before.length > 0 && !/\s$/u.test(before) && after.length > 0 && !/^\s/u.test(after);
    const nextText = `${before}${needsSpace ? ' ' : ''}${after}`.replace(/[ \t]{2,}/gu, ' ');
    return { text: nextText, cursor: Math.min(before.length + (needsSpace ? 1 : 0), nextText.length) };
}
export function validateComposerImage(file, policy = DEFAULT_COMPOSER_IMAGE_POLICY) {
    if (!policy.supportedMimeTypes.includes(file.type))
        return { accepted: false, reason: 'unsupported_type' };
    if (file.size > policy.maxBytes)
        return { accepted: false, reason: 'too_large' };
    return { accepted: true };
}
//# sourceMappingURL=index.js.map