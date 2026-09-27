import { describe, expect, it, vi } from 'vitest'
import { createTaskSnapshot, TaskEventBus, taskIsTerminal, transitionTask } from './index.js'

describe('task lifecycle', () => {
  it('moves a task through progress to a terminal result', () => {
    const queued = createTaskSnapshot({
      id: 'task-1', kind: 'answer', origin: 'mcp', principal: 'dot', idempotencyKey: 'request-1', input: { prompt: 'hello' },
      now: new Date('2026-01-01T00:00:00.000Z'),
    })
    const running = transitionTask(queued, { type: 'start', at: new Date('2026-01-01T00:00:01.000Z') })
    const progressing = transitionTask(running, { type: 'progress', progress: { phase: 'answering', percent: 50 } })
    const completed = transitionTask(progressing, { type: 'complete', result: { text: 'done' } })

    expect(completed.status).toBe('completed')
    expect(completed.result).toEqual({ text: 'done' })
    expect(completed.revision).toBe(3)
    expect(taskIsTerminal(completed.status)).toBe(true)
  })

  it('rejects updates after a terminal state', () => {
    const running = transitionTask(createTaskSnapshot({ kind: 'answer', origin: 'mcp', principal: 'dot', idempotencyKey: '1', input: null }), { type: 'start' })
    const failed = transitionTask(running, { type: 'fail', error: 'boom' })
    expect(() => transitionTask(failed, { type: 'progress', progress: { phase: 'late' } })).toThrow('Invalid task transition')
  })
})

describe('TaskEventBus', () => {
  it('resolves waiters when a matching snapshot is published', async () => {
    vi.useFakeTimers()
    const bus = new TaskEventBus<{ id: string; status: string }>()
    let current = { id: 'task-1', status: 'running' }
    const waiting = bus.waitFor('task-1', () => current, (task) => task.status === 'completed', 30_000)
    await vi.runAllTicks()
    current = { id: 'task-1', status: 'completed' }
    bus.publish(current)
    await expect(waiting).resolves.toEqual(current)
    vi.useRealTimers()
  })
})
