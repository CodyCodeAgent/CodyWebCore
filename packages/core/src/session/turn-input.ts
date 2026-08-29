import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js'
import type { TurnStartParams } from '../protocol/generated/v2/TurnStartParams.js'
import type { UserInput } from '../protocol/generated/v2/UserInput.js'

export type ExecutionContext = {
  /** Exact schema-bound overrides. Product policy code owns these values. */
  thread: Partial<ThreadStartParams>
  turn?: Omit<Partial<TurnStartParams>, 'threadId' | 'input'>
}

export type TurnInput = {
  input: UserInput[]
  model?: TurnStartParams['model']
  effort?: TurnStartParams['effort']
  collaborationMode?: TurnStartParams['collaborationMode']
  approvalPolicy?: TurnStartParams['approvalPolicy']
  approvalsReviewer?: TurnStartParams['approvalsReviewer']
  permissions?: TurnStartParams['permissions']
  runtimeWorkspaceRoots?: TurnStartParams['runtimeWorkspaceRoots']
  sandboxPolicy?: TurnStartParams['sandboxPolicy']
}

export type TurnInputSkill = { name: string; path: string }
export type TurnInputLocalImage = { path: string; detail?: Extract<UserInput, { type: 'localImage' }>['detail'] }

/** Builds the canonical Codex turn input sequence for every CodyWeb product. */
export function buildTurnUserInput(input: {
  text?: string
  skills?: TurnInputSkill[]
  localImages?: TurnInputLocalImage[]
}): UserInput[] {
  const result: UserInput[] = []
  // The App Server attaches native Skill context in input order. Keep Skills
  // ahead of the user message so execution starts with that context available.
  for (const skill of input.skills ?? []) {
    const name = skill.name.trim()
    const path = skill.path.trim()
    if (name && path) result.push({ type: 'skill', name, path })
  }
  const text = input.text?.trim() ?? ''
  if (text) result.push({ type: 'text', text, text_elements: [] })
  for (const image of input.localImages ?? []) {
    const path = image.path.trim()
    if (path) result.push({ type: 'localImage', path, ...(image.detail ? { detail: image.detail } : {}) })
  }
  return result
}
