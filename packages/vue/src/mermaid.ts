type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  render: (id: string, source: string, container?: Element) => Promise<{ svg: string }>
}

type MermaidLoader = () => Promise<{ default: MermaidApi }>

let diagramSequence = 0
let renderQueue: Promise<void> = Promise.resolve()

const defaultLoader: MermaidLoader = async () => import('mermaid') as Promise<{ default: MermaidApi }>

/**
 * Mermaid keeps global configuration and uses temporary DOM nodes while it
 * renders. Serialize those operations so concurrent message components cannot
 * overwrite one another, and contain every temporary node inside the caller.
 */
export async function renderMermaidDiagram(source: string, stage: HTMLElement, loadMermaid: MermaidLoader = defaultLoader): Promise<string> {
  const renderId = `cody-diagram-${String(++diagramSequence)}`
  const task = renderQueue.then(async () => {
    try {
      const { default: mermaid } = await loadMermaid()
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: 'default',
        themeVariables: { background: '#ffffff' },
        htmlLabels: false,
        flowchart: { htmlLabels: false, useMaxWidth: false },
      })
      return (await mermaid.render(renderId, source, stage)).svg
    } finally {
      // Mermaid versions before suppressErrorRendering was consistently
      // honored can leave an error SVG attached to document.body.
      document.getElementById(renderId)?.remove()
      document.getElementById(`d${renderId}`)?.remove()
      document.getElementById(`i${renderId}`)?.remove()
    }
  })
  renderQueue = task.then(() => undefined, () => undefined)
  return task
}
