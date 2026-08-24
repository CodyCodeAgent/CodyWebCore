declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  const taskLists: (markdown: MarkdownIt, options?: { enabled?: boolean; label?: boolean; labelAfter?: boolean }) => void
  export default taskLists
}

declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it'
  const footnote: (markdown: MarkdownIt) => void
  export default footnote
}
