import { describe, expect, it } from 'vitest'
import type { PresentationMessage, PresentationTool } from '../src/presentation/index.js'
import {
  buildFileChangeMessageGroups,
  buildToolOutputPreview,
  fileChangeCountLabel,
  fileChangeMessageDetails,
  fileChangeUpdateLabel,
  formatToolStatus,
  isToolFailureStatus,
  isToolOutputTruncated,
  isToolTimelineExpandedByDefault,
  toolOutputToggleLabel,
  toolStatusTone,
} from '../src/presentation/index.js'

function tool(overrides: Partial<PresentationTool> = {}): PresentationTool {
  return { kind: 'command', title: 'Command', status: 'completed', summary: 'Done', details: [], ...overrides }
}

function fileChangeMessage(id: string, count: number, status = 'completed'): PresentationMessage {
  return {
    id,
    text: '',
    tool: {
      kind: 'fileChange',
      title: 'File changes',
      status,
      summary: `${String(count)} file${count === 1 ? '' : 's'} changed`,
      details: [`status: ${status}`, ...Array.from({ length: count }, (_, index) => `update: src/file-${String(index + 1)}.ts`)],
      output: `diff-${id}`,
      outputLabel: 'Diff',
    },
  }
}

describe('presentation tool timeline', () => {
  it('formats and classifies tool statuses', () => {
    expect(formatToolStatus('')).toBe('unknown')
    expect(formatToolStatus('in_progress')).toBe('In Progress')
    expect(isToolFailureStatus('tool failed')).toBe(true)
    expect(isToolFailureStatus('completed')).toBe(false)
    expect(toolStatusTone('running')).toBe('working')
    expect(toolStatusTone('applied')).toBe('success')
    expect(toolStatusTone('queued')).toBe('neutral')
  })

  it('owns expansion and bounded output rules', () => {
    expect(isToolTimelineExpandedByDefault(tool())).toBe(true)
    expect(isToolTimelineExpandedByDefault(tool({ kind: 'fileChange' }))).toBe(false)
    expect(isToolOutputTruncated('one\ntwo\nthree\nfour', 3, 100)).toBe(true)
    expect(buildToolOutputPreview('one\ntwo\nthree\nfour', 2, 100)).toBe('one\ntwo')
    expect(toolOutputToggleLabel(false)).toBe('Show full output')
  })

  it('groups only consecutive standalone file changes and preserves failures', () => {
    const first = fileChangeMessage('change-1', 4)
    const second = fileChangeMessage('change-2', 3, 'failed')
    const groups = buildFileChangeMessageGroups([
      first,
      second,
      { id: 'reply', text: 'Validation complete' },
      fileChangeMessage('change-3', 1),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ messageIds: ['change-1', 'change-2'], fileCount: 7, updateCount: 2, status: 'failed' })
    expect(fileChangeMessageDetails(first)).toHaveLength(4)
    expect(fileChangeCountLabel(1)).toBe('1 file')
    expect(fileChangeUpdateLabel(2)).toBe('2 updates')
  })
})
