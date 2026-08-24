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

  it('makes a partial streaming code fence renderable', () => {
    expect(stabilizeStreamingMarkdown('```ts\nconst answer = 42')).toMatch(/```$/u)
  })
})
