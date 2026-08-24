import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'

export type CodyMarkdownLabels = {
  zoomOut: string; fit: string; zoomIn: string; source: string; fullscreen: string
  rendering: (engine: string) => string; diagramAria: (engine: string) => string
  wrap: string; scroll?: string; copy: string; save: string; dataTable: string; copyCsv: string
  openFile: (path: string) => string
  lineCount: (count: number) => string; expandCode: (count: number) => string; collapseCode: string
}

export const DEFAULT_CODY_MARKDOWN_LABELS: CodyMarkdownLabels = {
  zoomOut: '缩小', fit: '适应', zoomIn: '放大', source: '源码', fullscreen: '全屏',
  rendering: (engine) => `正在渲染 ${engine}…`, diagramAria: (engine) => `${engine} 技术图`,
  wrap: '换行', scroll: '滚动', copy: '复制', save: '保存', dataTable: '数据表格', copyCsv: '复制 CSV',
  openFile: (path) => `打开 ${path}`,
  lineCount: (count) => `${String(count)} 行`, expandCode: (count) => `展开全部 · 共 ${String(count)} 行`, collapseCode: '收起代码',
}

const markdown = new MarkdownIt({ breaks: true, html: false, linkify: true, typographer: false })
markdown.use(taskLists, { enabled: false, label: true, labelAfter: true })
markdown.use(footnote)

function toolbarButton(action: string, label: string): string {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${action}" aria-label="${label}" title="${label}">${label}</button>`
}

function codeBlockHtml(content: string, language = '', labels = DEFAULT_CODY_MARKDOWN_LABELS): string {
  const normalizedLanguage = language.toLowerCase()
  if (normalizedLanguage === 'mermaid' || normalizedLanguage === 'plantuml' || normalizedLanguage === 'puml') {
    const engine = normalizedLanguage === 'mermaid' ? 'mermaid' : 'plantuml'
    return `<div class="markdown-diagram-shell" data-diagram-engine="${engine}"><header class="markdown-diagram-toolbar"><span>${engine}</span><span class="markdown-diagram-actions">${toolbarButton('diagram-zoom-out', labels.zoomOut)}${toolbarButton('diagram-fit', labels.fit)}${toolbarButton('diagram-zoom-in', labels.zoomIn)}${toolbarButton('diagram-source', labels.source)}${toolbarButton('diagram-fullscreen', labels.fullscreen)}${toolbarButton('diagram-export-svg', 'SVG')}${toolbarButton('diagram-export-png', 'PNG')}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${labels.diagramAria(engine)}"><p class="markdown-diagram-status">${labels.rendering(engine)}</p></div><pre class="markdown-diagram-source" hidden><code>${markdown.utils.escapeHtml(content)}</code></pre></div>\n`
  }
  const lines = content.replace(/\n$/u, '').split('\n')
  const isCompact = lines.length <= 2 && lines.every((line) => line.length <= 96)
  const isCollapsible = lines.length > 10
  const languageLabel = language || 'text'
  const codeClasses = [isCompact ? 'is-compact-code' : '', /^[A-Za-z0-9_-]+$/u.test(language) ? `language-${language}` : ''].filter(Boolean).join(' ')
  const codeClass = codeClasses ? ` class="${codeClasses}"` : ''
  const shellClasses = [isCompact ? 'is-compact' : '', isCollapsible ? 'is-collapsible is-collapsed' : ''].filter(Boolean).join(' ')
  const languageMeta = isCollapsible ? `${languageLabel} · ${labels.lineCount(lines.length)}` : languageLabel
  const collapseButton = isCollapsible ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${labels.collapseCode}" title="${labels.collapseCode}" aria-expanded="false">${labels.collapseCode}</button>` : ''
  const expandControl = isCollapsible ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${labels.expandCode(lines.length)}</button></div>` : ''
  return `<div class="markdown-code-host"><div class="markdown-code-shell${shellClasses ? ` ${shellClasses}` : ''}" data-language="${languageLabel}" data-code-lines="${String(lines.length)}"><header class="markdown-code-toolbar"><span>${languageMeta}</span><span class="markdown-code-actions">${collapseButton}${toolbarButton('wrap-code', labels.wrap)}${toolbarButton('copy-code', labels.copy)}${toolbarButton('save-code', labels.save)}</span></header><pre class="markdown-code-block${isCompact ? ' is-compact' : ''}"><code${codeClass}>${markdown.utils.escapeHtml(content)}</code></pre>${expandControl}</div></div>\n`
}

markdown.renderer.rules.fence = (tokens, index, _options, env) => {
  const token = tokens[index]
  return codeBlockHtml(token.content, token.info.trim().split(/\s+/u)[0] ?? '', env.labels as CodyMarkdownLabels | undefined)
}
markdown.renderer.rules.code_block = (tokens, index, _options, env) => codeBlockHtml(tokens[index].content, '', env.labels as CodyMarkdownLabels | undefined)
markdown.renderer.rules.table_open = (_tokens, _index, _options, env) => {
  const labels = (env.labels as CodyMarkdownLabels | undefined) ?? DEFAULT_CODY_MARKDOWN_LABELS
  return `<section class="markdown-table-shell" role="region" aria-label="${labels.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${toolbarButton('copy-table', labels.copyCsv)}</header><div class="markdown-table-scroll"><table>\n`
}
markdown.renderer.rules.table_close = () => '</table></div></section>\n'

const defaultCodeInline = markdown.renderer.rules.code_inline
markdown.renderer.rules.code_inline = (tokens, index, options, env, self) => {
  const value = tokens[index].content
  const match = value.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u)
  if (!match || /\s/u.test(value)) return defaultCodeInline ? defaultCodeInline(tokens, index, options, env, self) : self.renderToken(tokens, index, options)
  const path = markdown.utils.escapeHtml(match[1])
  const line = match[2] ?? ''
  const labels = (env.labels as CodyMarkdownLabels | undefined) ?? DEFAULT_CODY_MARKDOWN_LABELS
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${path}" data-file-line="${line}" title="${labels.openFile(path)}"><code>${markdown.utils.escapeHtml(value)}</code></button>`
}

const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  if (/^https?:\/\//u.test(token.attrGet('href') ?? '')) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen ? defaultLinkOpen(tokens, index, options, env, self) : self.renderToken(tokens, index, options)
}

/** Renders safe, product-neutral Markdown. Raw HTML is intentionally disabled before sanitization. */
export function renderCodyMarkdown(source: string, labels = DEFAULT_CODY_MARKDOWN_LABELS): string {
  return DOMPurify.sanitize(markdown.render(source, { labels }), {
    ADD_ATTR: ['target'],
    ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  })
}

export function stabilizeStreamingMarkdown(value: string): string {
  return (value.match(/^\s*```/gmu)?.length ?? 0) % 2 === 1 ? `${value}\n\n\`\`\`` : value
}
