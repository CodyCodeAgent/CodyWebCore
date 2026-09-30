// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { renderCodyMarkdown, stabilizeStreamingMarkdown } from './markdown.js'

describe('renderCodyMarkdown', () => {
  it('renders rich Markdown and keeps generated controls', () => {
    const html = renderCodyMarkdown(['## 状态', '', '| 项目 | 状态 |', '| --- | --- |', '| `src/app.ts:42` | ready |', '', '- [x] done', '', '```ts', 'const ready = true', '```'].join('\n'))
    expect(html).toContain('状态')
    expect(html).toContain('<table>')
    expect(html).toContain('data-markdown-action="open-file"')
    expect(html).toContain('data-markdown-action="copy-table"')
    expect(html).toContain('data-markdown-action="copy-code"')
  })

  it('does not execute raw HTML or javascript URLs', () => {
    const html = renderCodyMarkdown('<script>alert(1)</script>\n[bad](javascript:alert(1))')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('href="javascript:')
  })

  it('turns local Markdown file links into file-preview actions and keeps web links as anchors', () => {
    const html = renderCodyMarkdown([
      '[自测报告](/workspace/specs/test/report.md#L42)',
      '[走查](../specs/code-review.md)',
      '[官网](https://example.com/docs/report.md)',
      '[章节](/workspace/specs/test/report.md#overview)',
    ].join('\n\n'))
    expect(html).toContain('data-markdown-action="open-file"')
    expect(html).toContain('data-file-path="/workspace/specs/test/report.md"')
    expect(html).toContain('data-file-line="42"')
    expect(html).toContain('data-file-path="../specs/code-review.md"')
    expect(html).toContain('href="https://example.com/docs/report.md"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('href="/workspace/specs/test/report.md#overview"')
  })

  it('makes a partial streaming code fence renderable', () => {
    expect(stabilizeStreamingMarkdown('```ts\nconst answer = 42')).toMatch(/```$/u)
  })
})
