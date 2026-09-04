import { previewToolOutput, toolStatusTone as conversationToolStatusTone } from '../conversation/index.js'

export type ToolStatusTone = 'success' | 'danger' | 'working' | 'neutral'

export const TOOL_OUTPUT_PREVIEW_LINE_COUNT = 80
export const TOOL_OUTPUT_PREVIEW_MAX_CHARS = 12_000

/** Product-neutral shape required to present a Codex tool invocation. */
export type PresentationTool = {
  kind: string
  title: string
  status: string
  summary: string
  details: string[]
  output?: string
  outputLabel?: string
}

/** Minimal message contract used by timeline grouping. Product message types may add fields. */
export type PresentationMessage<TTool extends PresentationTool = PresentationTool> = {
  id: string
  text: string
  images?: string[]
  skills?: Array<{ name: string; path: string }>
  tool?: TTool | null
}

export type FileChangeMessageGroup<TMessage extends PresentationMessage = PresentationMessage> = {
  headId: string
  messages: TMessage[]
  messageIds: string[]
  fileCount: number
  updateCount: number
  status: string
}

function fileChangeCountFromSummary(summary: string): number | null {
  const match = summary.match(/\b(\d+)\s+files?\s+changed\b/iu)
  if (!match?.[1]) return null
  const count = Number(match[1])
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : null
}

export function isGroupableFileChangeMessage(message: PresentationMessage): boolean {
  return message.tool?.kind === 'fileChange'
    && message.text.trim().length === 0
    && (message.images?.length ?? 0) === 0
    && (message.skills?.length ?? 0) === 0
}

export function fileChangeMessageCount(message: PresentationMessage): number {
  if (message.tool?.kind !== 'fileChange') return 0
  const summaryCount = fileChangeCountFromSummary(message.tool.summary)
  if (summaryCount !== null) return summaryCount
  return message.tool.details.filter((detail) => !/^status\s*:/iu.test(detail.trim())).length
}

export function fileChangeMessageDetails(message: PresentationMessage): string[] {
  if (message.tool?.kind !== 'fileChange') return []
  return message.tool.details.filter((detail) => !/^status\s*:/iu.test(detail.trim()))
}

function fileChangeGroupStatus(messages: PresentationMessage[]): string {
  const statuses = messages
    .map((message) => message.tool?.status.trim() ?? '')
    .filter((status) => status.length > 0)
  const failed = statuses.find((status) => isToolFailureStatus(status))
  if (failed) return failed
  const working = statuses.find((status) => toolStatusTone(status) === 'working')
  if (working) return working
  return statuses.at(-1) ?? 'unknown'
}

function toFileChangeMessageGroup<TMessage extends PresentationMessage>(
  messages: TMessage[],
): FileChangeMessageGroup<TMessage> {
  return {
    headId: messages[0]?.id ?? '',
    messages,
    messageIds: messages.map((message) => message.id),
    fileCount: messages.reduce((total, message) => total + fileChangeMessageCount(message), 0),
    updateCount: messages.length,
    status: fileChangeGroupStatus(messages),
  }
}

export function buildFileChangeMessageGroups<TMessage extends PresentationMessage>(
  messages: TMessage[],
): Array<FileChangeMessageGroup<TMessage>> {
  const groups: Array<FileChangeMessageGroup<TMessage>> = []
  let pending: TMessage[] = []

  const flush = () => {
    if (pending.length === 0) return
    groups.push(toFileChangeMessageGroup(pending))
    pending = []
  }

  for (const message of messages) {
    if (isGroupableFileChangeMessage(message)) {
      pending.push(message)
      continue
    }
    flush()
  }
  flush()
  return groups
}

export function fileChangeCountLabel(count: number): string {
  const normalized = Math.max(0, Math.trunc(count))
  return `${String(normalized)} file${normalized === 1 ? '' : 's'}`
}

export function fileChangeUpdateLabel(count: number): string {
  const normalized = Math.max(0, Math.trunc(count))
  return `${String(normalized)} update${normalized === 1 ? '' : 's'}`
}

export function isToolFailureStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase()
  return normalized.includes('fail')
    || normalized.includes('error')
    || normalized.includes('decline')
    || normalized.includes('cancel')
}

export function formatToolStatus(status: string): string {
  const normalized = status.trim()
  if (!normalized) return 'unknown'
  return normalized
    .replace(/[-_]+/gu, ' ')
    .replace(/\b\w/gu, (letter) => letter.toUpperCase())
}

export function toolStatusTone(status: string): ToolStatusTone {
  const coreTone = conversationToolStatusTone(status)
  if (coreTone === 'running') return 'working'
  if (coreTone === 'success' || coreTone === 'danger') return coreTone
  const normalized = status.trim().toLowerCase()
  if (!normalized) return 'neutral'
  if (isToolFailureStatus(normalized)) return 'danger'
  if (/running|progress|pending|started/u.test(normalized)) return 'working'
  if (/success|complete|done|applied/u.test(normalized)) return 'success'
  return 'neutral'
}

export function isToolTimelineExpandedByDefault(tool: PresentationTool): boolean {
  // Command output is useful while it is changing, but becomes noisy once the
  // process reaches a terminal state. Keep that distinction in the shared
  // presentation layer so every client starts from the same compact timeline.
  if (tool.kind === 'command') return toolStatusTone(tool.status) === 'working'
  return tool.kind !== 'fileChange'
}

export function isToolOutputTruncated(
  output: string,
  lineLimit = TOOL_OUTPUT_PREVIEW_LINE_COUNT,
  charLimit = TOOL_OUTPUT_PREVIEW_MAX_CHARS,
): boolean {
  if (output.length > Math.max(Math.trunc(charLimit), 1)) return true
  const normalizedLineLimit = Math.max(Math.trunc(lineLimit), 1)
  return output.split(/\r\n|\r|\n/u).length > normalizedLineLimit
}

export function buildToolOutputPreview(
  output: string,
  lineLimit = TOOL_OUTPUT_PREVIEW_LINE_COUNT,
  charLimit = TOOL_OUTPUT_PREVIEW_MAX_CHARS,
): string {
  return previewToolOutput(output, lineLimit, charLimit).text
}

export function toolOutputToggleLabel(isExpanded: boolean): string {
  return isExpanded ? 'Show preview' : 'Show full output'
}
