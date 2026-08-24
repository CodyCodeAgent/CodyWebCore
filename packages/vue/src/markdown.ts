function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

/** Small, dependency-free safe renderer for the shared surface. Products can replace it through the markdown slot. */
export function renderCodyMarkdown(value: string): string {
  const escaped = escapeHtml(value)
  const fenced = escaped.replace(/```([^\n]*)\n([\s\S]*?)```/gu, (_match, language: string, code: string) => `<pre><code data-language="${language.trim()}">${code.trimEnd()}</code></pre>`)
  return fenced
    .replace(/`([^`]+)`/gu, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}
