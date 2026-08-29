import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLLABORATION_MODE, FALLBACK_PLAN_COLLABORATION_MODE, buildTurnCollaborationMode,
  findComposerTrigger, materializeComposerContextText, mergeAvailableModelsWithCurrent,
  mergeCollaborationModeOptions, normalizeComposerSubmission, removeComposerTrigger,
  resolveComposerSubmitMode, validateComposerImage,
} from '../src/composer/index.js'

describe('composer core', () => {
  it('normalizes submissions without mutating caller-owned attachments', () => {
    const submission = { text: '  inspect this  ', images: [], skills: [{ name: ' review ', path: ' /skills/review/SKILL.md ', displayName: 'Review', description: '' }], contexts: [{ id: 'diff', kind: 'diff', label: '@diff', description: 'Current diff', content: ' patch ', createdAtIso: '2026-08-29T00:00:00Z', metadata: { dirty: true } }] }
    const normalized = normalizeComposerSubmission(submission)
    expect(normalized).toMatchObject({ text: 'inspect this', hasContent: true, skills: [{ name: 'review', path: '/skills/review/SKILL.md' }] })
    expect(normalized.contexts[0]).not.toBe(submission.contexts[0])
    expect(normalized.contexts[0]?.metadata).not.toBe(submission.contexts[0]?.metadata)
  })
  it('uses canonical queue and steer semantics', () => {
    expect(resolveComposerSubmitMode(true, 'steer')).toBe('steer')
    expect(resolveComposerSubmitMode(false, 'steer')).toBe('queue')
    expect(resolveComposerSubmitMode(true, 'queue')).toBe('queue')
  })
  it('detects and removes skill and context triggers at the cursor', () => {
    const skillText = 'inspect $rev'
    const skill = findComposerTrigger(skillText, skillText.length, '$')
    expect(skill).toEqual({ query: 'rev', start: 8, end: 12 })
    expect(removeComposerTrigger(skillText, skill!)).toEqual({ text: 'inspect ', cursor: 8 })
    expect(findComposerTrigger('email@example.com', 17, '@')).toBeNull()
    expect(findComposerTrigger('attach @diff', 12, '@')?.query).toBe('diff')
  })
  it('materializes product-provided context after the user prompt', () => {
    expect(materializeComposerContextText(' review ', [{ id: '1', kind: 'diff', label: '@diff', description: 'Current diff', content: 'patch', createdAtIso: '', metadata: {} }]))
      .toBe('review\n\n## Attached Workspace Context\n\n### @diff\nCurrent diff\npatch')
  })
  it('reconciles models and collaboration modes deterministically', () => {
    expect(mergeAvailableModelsWithCurrent(['gpt-5', 'gpt-5'], 'gpt-6')).toEqual(['gpt-6', 'gpt-5'])
    expect(mergeCollaborationModeOptions([])).toEqual([DEFAULT_COLLABORATION_MODE, FALLBACK_PLAN_COLLABORATION_MODE])
    expect(buildTurnCollaborationMode(FALLBACK_PLAN_COLLABORATION_MODE, 'gpt-6', 'high')).toEqual({ mode: 'plan', settings: { model: 'gpt-6', reasoning_effort: 'high', developer_instructions: null } })
  })
  it('validates image MIME type and size independently from upload transport', () => {
    expect(validateComposerImage({ type: 'image/png', size: 10 })).toEqual({ accepted: true })
    expect(validateComposerImage({ type: 'text/plain', size: 10 })).toEqual({ accepted: false, reason: 'unsupported_type' })
    expect(validateComposerImage({ type: 'image/png', size: 21 * 1024 * 1024 })).toEqual({ accepted: false, reason: 'too_large' })
  })
})
