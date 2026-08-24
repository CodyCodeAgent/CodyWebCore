<template>
  <div ref="rootRef" class="cody-markdown cody-markdown-renderer" v-html="renderedHtml" @click="onMarkdownClick" />
  <dialog ref="imageDialogRef" class="cody-markdown-image-dialog" @click="closeImagePreview">
    <button type="button" aria-label="关闭图片预览" @click="closeImagePreview">×</button>
    <img :src="previewImageUrl" alt="Markdown 图片预览">
  </dialog>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DEFAULT_CODY_MARKDOWN_LABELS, renderCodyMarkdown, stabilizeStreamingMarkdown, type CodyMarkdownLabels } from './markdown.js'

type DiagramInput = { engine: 'mermaid' | 'plantuml'; source: string; dark: boolean }
const props = withDefaults(defineProps<{
  text: string
  cwd?: string
  labels?: CodyMarkdownLabels
  dark?: boolean
  renderDelay?: number
  resolveAssetUrl?: (href: string) => string | undefined
  renderDiagram?: (input: DiagramInput) => Promise<string | undefined>
}>(), { dark: false, renderDelay: 75 })
const emit = defineEmits<{ openFile: [{ path: string; line: number }] }>()

const labels = computed(() => props.labels ?? DEFAULT_CODY_MARKDOWN_LABELS)
const rootRef = ref<HTMLElement | null>(null)
const imageDialogRef = ref<HTMLDialogElement | null>(null)
const renderedHtml = ref(renderCodyMarkdown(stabilizeStreamingMarkdown(props.text), labels.value))
const previewImageUrl = ref('')
const expandedCodeBlockIndexes = new Set<number>()
let renderTimer = 0
let diagramSequence = 0

const languageLoaders: Record<string, () => Promise<{ default: unknown }>> = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  python: () => import('highlight.js/lib/languages/python'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  json: () => import('highlight.js/lib/languages/json'),
  bash: () => import('highlight.js/lib/languages/bash'),
  sql: () => import('highlight.js/lib/languages/sql'),
}

async function renderNext(value: string): Promise<void> {
  window.clearTimeout(renderTimer)
  renderTimer = window.setTimeout(async () => {
    renderedHtml.value = renderCodyMarkdown(stabilizeStreamingMarkdown(value), labels.value)
    await nextTick()
    void enhanceMarkup()
  }, props.renderDelay)
}

async function enhanceMarkup(): Promise<void> {
  for (const cell of Array.from(rootRef.value?.querySelectorAll<HTMLTableCellElement>('td') ?? [])) {
    if (/^-?[\d,.]+%?$/u.test(cell.textContent?.trim() ?? '')) cell.dataset.numeric = 'true'
  }
  for (const image of Array.from(rootRef.value?.querySelectorAll<HTMLImageElement>('img') ?? [])) {
    image.addEventListener('error', () => { image.alt = image.alt || '图片加载失败'; image.classList.add('is-load-error') }, { once: true })
  }
  rewriteAssetLinks()
  for (const [index, shell] of Array.from(rootRef.value?.querySelectorAll<HTMLElement>('.markdown-code-shell') ?? []).entries()) {
    shell.dataset.codeIndex = String(index)
    if (shell.classList.contains('is-collapsible') && expandedCodeBlockIndexes.has(index)) shell.classList.remove('is-collapsed')
    for (const toggle of Array.from(shell.querySelectorAll<HTMLButtonElement>('[data-markdown-action="toggle-code"]'))) {
      toggle.setAttribute('aria-expanded', String(!shell.classList.contains('is-collapsed')))
    }
    const pre = shell.querySelector('pre')
    const wrapButton = shell.querySelector<HTMLButtonElement>('[data-markdown-action="wrap-code"]')
    if (pre && wrapButton) {
      wrapButton.hidden = pre.scrollWidth <= pre.clientWidth + 2
      wrapButton.setAttribute('aria-pressed', String(shell.classList.contains('is-wrapped')))
    }
  }
  await renderDiagrams()
  const blocks = Array.from(rootRef.value?.querySelectorAll<HTMLElement>('pre code[class*="language-"]') ?? [])
  if (blocks.length === 0) return
  const hljs = (await import('highlight.js/lib/core')).default as unknown as {
    getLanguage: (language: string) => unknown
    registerLanguage: (language: string, definition: never) => void
    highlight: (value: string, options: { language: string }) => { value: string }
  }
  for (const block of blocks) {
    const language = Array.from(block.classList).find((name) => name.startsWith('language-'))?.slice(9) ?? ''
    const loader = languageLoaders[language]
    if (!loader || block.dataset.highlighted === 'yes') continue
    const module = await loader()
    if (!hljs.getLanguage(language)) hljs.registerLanguage(language, module.default as never)
    block.innerHTML = hljs.highlight(block.textContent ?? '', { language }).value
    block.dataset.highlighted = 'yes'
  }
}

function rewriteAssetLinks(): void {
  if (!props.resolveAssetUrl) return
  const assetPattern = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu
  for (const anchor of Array.from(rootRef.value?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])) {
    const href = anchor.getAttribute('href') ?? ''
    if (!assetPattern.test(href) || /^(?:data|blob):/iu.test(href)) continue
    const resolved = props.resolveAssetUrl(href)
    if (!resolved) continue
    anchor.href = resolved
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
  }
}

async function renderDiagrams(): Promise<void> {
  const shells = Array.from(rootRef.value?.querySelectorAll<HTMLElement>('.markdown-diagram-shell:not([data-rendered])') ?? [])
  for (const shell of shells) {
    shell.dataset.rendered = 'loading'
    const engine = (shell.dataset.diagramEngine === 'plantuml' ? 'plantuml' : 'mermaid') as DiagramInput['engine']
    const source = shell.querySelector('code')?.textContent ?? ''
    const stage = shell.querySelector<HTMLElement>('.markdown-diagram-stage')
    if (!stage) continue
    try {
      let svg = await props.renderDiagram?.({ engine, source, dark: props.dark })
      if (!svg && engine === 'mermaid') {
        const { default: mermaid } = await import('mermaid')
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: props.dark ? 'dark' : 'default', htmlLabels: false, flowchart: { htmlLabels: false, useMaxWidth: false } })
        svg = (await mermaid.render(`cody-diagram-${String(++diagramSequence)}`, source)).svg
      }
      if (!svg) throw new Error(engine === 'plantuml' ? '当前环境未配置 PlantUML 渲染器' : '图表渲染失败')
      stage.innerHTML = sanitizeDiagramSvg(svg)
      enableDiagramPan(stage)
      shell.dataset.rendered = 'yes'
      shell.style.setProperty('--diagram-scale', '1')
    } catch (error) {
      stage.textContent = error instanceof Error ? error.message : '图表渲染失败'
      stage.classList.add('markdown-diagram-error')
      shell.querySelector<HTMLElement>('.markdown-diagram-source')?.removeAttribute('hidden')
      shell.dataset.rendered = 'error'
    }
  }
}

function sanitizeDiagramSvg(svg: string): string {
  const sanitized = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true, html: true }, ADD_TAGS: ['foreignObject'], ADD_ATTR: ['xmlns'] })
  const wrapped = sanitized.trimStart().startsWith('<svg') ? sanitized : `<svg xmlns="http://www.w3.org/2000/svg">${sanitized}</svg>`
  const documentNode = new DOMParser().parseFromString(wrapped, 'image/svg+xml')
  if (documentNode.querySelector('parsererror')) return ''
  for (const element of documentNode.querySelectorAll('*')) for (const attribute of Array.from(element.attributes)) if (/^on/iu.test(attribute.name)) element.removeAttribute(attribute.name)
  documentNode.querySelectorAll('script').forEach((script) => script.remove())
  return new XMLSerializer().serializeToString(documentNode.documentElement)
}

function enableDiagramPan(stage: HTMLElement): void {
  if (stage.dataset.panReady === 'true') return
  stage.dataset.panReady = 'true'
  let startX = 0; let startY = 0; let startLeft = 0; let startTop = 0
  stage.addEventListener('pointerdown', (event) => { if (event.button === 0) { startX = event.clientX; startY = event.clientY; startLeft = stage.scrollLeft; startTop = stage.scrollTop; stage.setPointerCapture(event.pointerId); stage.classList.add('is-panning') } })
  stage.addEventListener('pointermove', (event) => { if (stage.hasPointerCapture(event.pointerId)) { stage.scrollLeft = startLeft - (event.clientX - startX); stage.scrollTop = startTop - (event.clientY - startY) } })
  const stop = (event: PointerEvent) => { if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId); stage.classList.remove('is-panning') }
  stage.addEventListener('pointerup', stop); stage.addEventListener('pointercancel', stop)
}

function diagramScale(shell: HTMLElement, delta = 0): void {
  const current = Number(shell.style.getPropertyValue('--diagram-scale') || '1')
  shell.style.setProperty('--diagram-scale', String(delta === 0 ? 1 : Math.min(2.5, Math.max(0.4, current + delta))))
}

function downloadBlob(blob: Blob, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob); anchor.download = filename; anchor.click(); URL.revokeObjectURL(anchor.href)
}

async function copyText(text: string, button: HTMLButtonElement): Promise<void> {
  const original = button.textContent
  try {
    await navigator.clipboard.writeText(text)
    button.textContent = '已复制'
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select()
    const copied = document.execCommand('copy'); textarea.remove()
    button.textContent = copied ? '已复制' : '复制失败'
  }
  window.setTimeout(() => { button.textContent = original }, 1_200)
}

function tableCsv(table: HTMLTableElement | null): string {
  return Array.from(table?.rows ?? []).map((row) => Array.from(row.cells).map((cell) => `"${cell.textContent?.trim().replace(/"/gu, '""') ?? ''}"`).join(',')).join('\n')
}

function onMarkdownClick(event: MouseEvent): void {
  const target = event.target as HTMLElement
  const image = target.closest<HTMLImageElement>('img')
  if (image) { previewImageUrl.value = image.currentSrc || image.src; imageDialogRef.value?.showModal(); return }
  const button = target.closest<HTMLButtonElement>('[data-markdown-action]')
  if (!button) return
  const shell = button.closest<HTMLElement>('.markdown-code-shell, .markdown-table-shell')
  const action = button.dataset.markdownAction
  if (action === 'copy-code') void copyText(shell?.querySelector('code')?.textContent ?? '', button)
  if (action === 'wrap-code') { const wrapped = shell?.classList.toggle('is-wrapped') ?? false; button.textContent = wrapped ? (labels.value.scroll || labels.value.wrap) : labels.value.wrap; button.setAttribute('aria-pressed', String(wrapped)) }
  if (action === 'save-code') downloadBlob(new Blob([shell?.querySelector('code')?.textContent ?? ''], { type: 'text/plain' }), `snippet.${shell?.dataset.language || 'txt'}`)
  if (action === 'toggle-code' && shell?.classList.contains('is-collapsible')) {
    const index = Number(shell.dataset.codeIndex ?? -1); const expanded = !shell.classList.toggle('is-collapsed')
    if (index >= 0) expanded ? expandedCodeBlockIndexes.add(index) : expandedCodeBlockIndexes.delete(index)
    for (const toggle of Array.from(shell.querySelectorAll<HTMLButtonElement>('[data-markdown-action="toggle-code"]'))) toggle.setAttribute('aria-expanded', String(expanded))
  }
  if (action === 'copy-table') void copyText(tableCsv(shell?.querySelector('table') ?? null), button)
  if (action === 'open-file') {
    const rawPath = button.dataset.filePath ?? ''; const cwd = props.cwd?.replace(/\/$/u, '') ?? ''
    const path = rawPath.startsWith('/') && cwd && rawPath.startsWith(`${cwd}/`) ? rawPath.slice(cwd.length + 1) : rawPath.replace(/^\.\//u, '')
    emit('openFile', { path, line: Number(button.dataset.fileLine || 0) || 1 })
  }
  const diagram = button.closest<HTMLElement>('.markdown-diagram-shell')
  if (diagram && action === 'diagram-zoom-in') diagramScale(diagram, 0.2)
  if (diagram && action === 'diagram-zoom-out') diagramScale(diagram, -0.2)
  if (diagram && action === 'diagram-fit') diagramScale(diagram)
  if (diagram && action === 'diagram-source') { const source = diagram.querySelector<HTMLElement>('.markdown-diagram-source'); if (source) source.hidden = !source.hidden }
  if (diagram && action === 'diagram-fullscreen') void diagram.requestFullscreen?.()
  if (diagram && action === 'diagram-export-svg') { const svg = diagram.querySelector('svg'); if (svg) downloadBlob(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), 'diagram.svg') }
}

function closeImagePreview(): void { imageDialogRef.value?.close() }
watch(() => [props.text, props.labels] as const, ([value]) => { void renderNext(value) }, { deep: true })
onMounted(() => { void enhanceMarkup() })
onBeforeUnmount(() => window.clearTimeout(renderTimer))
</script>
