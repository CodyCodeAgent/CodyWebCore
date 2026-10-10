// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { renderMermaidDiagram } from './mermaid.js'

describe('renderMermaidDiagram', () => {
  it('serializes renders, uses unique ids, and forces the light theme', async () => {
    const initialize = vi.fn()
    const render = vi.fn(async (id: string) => ({ svg: `<svg id="${id}" />` }))
    const loader = async () => ({ default: { initialize, render } })
    const firstStage = document.createElement('div')
    const secondStage = document.createElement('div')

    await Promise.all([
      renderMermaidDiagram('graph TD; A-->B', firstStage, loader),
      renderMermaidDiagram('graph TD; C-->D', secondStage, loader),
    ])

    expect(render).toHaveBeenCalledTimes(2)
    expect(render.mock.calls[0]?.[0]).not.toBe(render.mock.calls[1]?.[0])
    expect(render.mock.calls[0]?.[2]).toBe(firstStage)
    expect(render.mock.calls[1]?.[2]).toBe(secondStage)
    expect(initialize).toHaveBeenLastCalledWith(expect.objectContaining({
      suppressErrorRendering: true,
      theme: 'default',
      themeVariables: { background: '#ffffff' },
    }))
  })

  it('removes a Mermaid error artifact left outside the component', async () => {
    let renderId = ''
    const loader = async () => ({
      default: {
        initialize: vi.fn(),
        render: async (id: string) => {
          renderId = id
          const orphan = document.createElement('div')
          orphan.id = `d${id}`
          document.body.append(orphan)
          throw new Error('Parse error')
        },
      },
    })

    await expect(renderMermaidDiagram('broken', document.createElement('div'), loader)).rejects.toThrow('Parse error')
    expect(renderId).not.toBe('')
    expect(document.getElementById(`d${renderId}`)).toBeNull()
  })
})
