export const KNOWN_REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const

export type KnownReasoningEffort = typeof KNOWN_REASONING_EFFORTS[number]
export type ComposerSubmitMode = 'queue' | 'steer'
export type ComposerCollaborationModeKind = 'default' | 'plan'

export type ComposerImage = { id: string; name: string; path: string; url: string; mimeType: string }
export type ComposerSkill = { name: string; path: string; description: string; displayName: string }
export type ComposerContextAttachment<Kind extends string = string> = {
  id: string
  kind: Kind
  label: string
  description: string
  content: string
  createdAtIso: string
  metadata: Record<string, string | number | boolean>
}
export type ComposerSubmission<Kind extends string = string> = {
  text: string
  images: ComposerImage[]
  skills: ComposerSkill[]
  contexts?: ComposerContextAttachment<Kind>[]
}
export type NormalizedComposerSubmission<Kind extends string = string> = {
  text: string
  images: ComposerImage[]
  skills: ComposerSkill[]
  contexts: ComposerContextAttachment<Kind>[]
  hasContent: boolean
}

export type ComposerCollaborationModeOption = {
  name: string
  mode: ComposerCollaborationModeKind
  label: string
  model: string
  reasoningEffort: KnownReasoningEffort | ''
  developerInstructions: string | null
}
export type CurrentModelPreference = { model: string; reasoningEffort: KnownReasoningEffort | '' }
export type TurnCollaborationModePayload = {
  mode: ComposerCollaborationModeKind
  settings: { model: string; reasoning_effort: KnownReasoningEffort | null; developer_instructions: string | null }
}
export type ComposerTrigger = { query: string; start: number; end: number }
export type ComposerFileCandidate = { name?: string; type: string; size: number }
export type ComposerImageValidation = { accepted: true } | { accepted: false; reason: 'unsupported_type' | 'too_large' }

export const DEFAULT_COLLABORATION_MODE: ComposerCollaborationModeOption = {
  name: 'default', mode: 'default', label: 'Default', model: '', reasoningEffort: '', developerInstructions: null,
}
export const FALLBACK_PLAN_COLLABORATION_MODE: ComposerCollaborationModeOption = {
  name: 'plan', mode: 'plan', label: 'Plan', model: '', reasoningEffort: '', developerInstructions: null,
}
export const DEFAULT_COMPOSER_IMAGE_POLICY = {
  maxCount: 8,
  maxBytes: 20 * 1024 * 1024,
  supportedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as readonly string[],
} as const

export function isKnownReasoningEffort(value: string): value is KnownReasoningEffort {
  return KNOWN_REASONING_EFFORTS.includes(value as KnownReasoningEffort)
}
export function normalizeSelectedReasoningEffort(effort: string): KnownReasoningEffort | '' | null {
  if (!effort) return ''
  return isKnownReasoningEffort(effort) ? effort : null
}
export function mergeCollaborationModeOptions(remoteOptions: readonly ComposerCollaborationModeOption[]): ComposerCollaborationModeOption[] {
  const nextOptions: ComposerCollaborationModeOption[] = [DEFAULT_COLLABORATION_MODE]
  const seenModes = new Set<string>([DEFAULT_COLLABORATION_MODE.mode])
  const seenNames = new Set<string>([DEFAULT_COLLABORATION_MODE.name])
  for (const option of remoteOptions) {
    if (option.mode === 'default' || seenNames.has(option.name)) continue
    seenNames.add(option.name); seenModes.add(option.mode); nextOptions.push(option)
  }
  if (!seenModes.has('plan')) nextOptions.push(FALLBACK_PLAN_COLLABORATION_MODE)
  return nextOptions
}
export function selectCollaborationModeName(requestedName: string, options: readonly ComposerCollaborationModeOption[]): string {
  const normalizedName = requestedName.trim()
  if (!normalizedName) return DEFAULT_COLLABORATION_MODE.name
  return options.find((candidate) => candidate.name.toLowerCase() === normalizedName.toLowerCase())?.name ?? ''
}
export function reconcileSelectedCollaborationModeName(selectedName: string, options: readonly ComposerCollaborationModeOption[]): string {
  const exact = selectCollaborationModeName(selectedName, options)
  if (exact) return exact
  const modeAlias = selectedName.trim().toLowerCase()
  if (modeAlias === 'plan' || modeAlias === 'default') return options.find((candidate) => candidate.mode === modeAlias)?.name ?? DEFAULT_COLLABORATION_MODE.name
  return DEFAULT_COLLABORATION_MODE.name
}
export function buildTurnCollaborationMode(option: ComposerCollaborationModeOption, fallbackModel: string, fallbackEffort: KnownReasoningEffort | ''): TurnCollaborationModePayload {
  return { mode: option.mode, settings: { model: option.model.trim() || fallbackModel.trim(), reasoning_effort: option.reasoningEffort || fallbackEffort || null, developer_instructions: option.developerInstructions } }
}
export function mergeAvailableModelsWithCurrent(modelIds: readonly string[], currentModel: string): string[] {
  const unique = [...new Set(modelIds.map((model) => model.trim()).filter(Boolean))]
  const normalizedCurrent = currentModel.trim()
  return normalizedCurrent && !unique.includes(normalizedCurrent) ? [normalizedCurrent, ...unique] : unique
}
export function selectModelId(currentSelectedModelId: string, modelIds: readonly string[], currentModel: string): string {
  const normalizedSelected = currentSelectedModelId.trim()
  if (normalizedSelected && modelIds.includes(normalizedSelected)) return normalizedSelected
  return currentModel.trim() || modelIds[0] || ''
}
export function selectReasoningEffortFromPreference(currentSelectedEffort: KnownReasoningEffort | '', currentConfig: CurrentModelPreference): KnownReasoningEffort | '' {
  return currentConfig.reasoningEffort && isKnownReasoningEffort(currentConfig.reasoningEffort) ? currentConfig.reasoningEffort : currentSelectedEffort
}
export function composerHasContent(input: { text?: string; images?: readonly unknown[]; skills?: readonly unknown[]; contexts?: readonly unknown[] }): boolean {
  return Boolean(input.text?.trim()) || Boolean(input.images?.length) || Boolean(input.skills?.length) || Boolean(input.contexts?.length)
}
export function normalizeComposerSubmission<Kind extends string>(submission: ComposerSubmission<Kind>): NormalizedComposerSubmission<Kind> {
  const normalized = {
    text: submission.text.trim(),
    images: submission.images.map((image) => ({ ...image })),
    skills: submission.skills.map((skill) => ({ ...skill, name: skill.name.trim(), path: skill.path.trim() })).filter((skill) => skill.name && skill.path),
    contexts: (submission.contexts ?? []).map((context) => ({ ...context, metadata: { ...context.metadata } })),
  }
  return { ...normalized, hasContent: composerHasContent(normalized) }
}
export function resolveComposerSubmitMode(isTurnRunning: boolean, selectedMode: ComposerSubmitMode): ComposerSubmitMode {
  return isTurnRunning && selectedMode === 'steer' ? 'steer' : 'queue'
}
export function materializeComposerContextText(text: string, contexts: readonly ComposerContextAttachment[], heading = 'Attached Workspace Context'): string {
  const trimmedText = text.trim()
  if (contexts.length === 0) return trimmedText
  const blocks = contexts.map((context) => [`### ${context.label}`, context.description, '', context.content.trim()].filter(Boolean).join('\n'))
  return [trimmedText, `## ${heading}`, ...blocks].filter(Boolean).join('\n\n')
}
export function findComposerTrigger(text: string, cursor: number, prefix: '$' | '@'): ComposerTrigger | null {
  const beforeCursor = text.slice(0, Math.max(0, Math.min(cursor, text.length)))
  const escapedPrefix = prefix === '$' ? '\\$' : '@'
  const match = beforeCursor.match(new RegExp(`(^|\\s)${escapedPrefix}([^\\s${escapedPrefix}]*)$`, 'u'))
  if (!match || typeof match.index !== 'number') return null
  return { query: (match[2] ?? '').toLowerCase(), start: match.index + (match[1]?.length ?? 0), end: beforeCursor.length }
}
export function removeComposerTrigger(text: string, trigger: ComposerTrigger): { text: string; cursor: number } {
  const before = text.slice(0, trigger.start)
  const after = text.slice(trigger.end)
  const needsSpace = before.length > 0 && !/\s$/u.test(before) && after.length > 0 && !/^\s/u.test(after)
  const nextText = `${before}${needsSpace ? ' ' : ''}${after}`.replace(/[ \t]{2,}/gu, ' ')
  return { text: nextText, cursor: Math.min(before.length + (needsSpace ? 1 : 0), nextText.length) }
}
export function validateComposerImage(file: ComposerFileCandidate, policy: { maxBytes: number; supportedMimeTypes: readonly string[] } = DEFAULT_COMPOSER_IMAGE_POLICY): ComposerImageValidation {
  if (!policy.supportedMimeTypes.includes(file.type)) return { accepted: false, reason: 'unsupported_type' }
  if (file.size > policy.maxBytes) return { accepted: false, reason: 'too_large' }
  return { accepted: true }
}
