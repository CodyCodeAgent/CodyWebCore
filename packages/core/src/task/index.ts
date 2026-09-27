export type TaskStatus = 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled'

export type TaskProgress = {
  phase: string
  message?: string
  percent?: number
  details?: unknown
}

export type TaskSnapshot<TInput = unknown, TProgress = TaskProgress, TResult = unknown> = {
  id: string
  kind: string
  origin: string
  principal: string
  idempotencyKey: string
  status: TaskStatus
  input: TInput
  progress: TProgress | null
  result: TResult | null
  error: string | null
  revision: number
  createdAtIso: string
  updatedAtIso: string
  startedAtIso?: string
  completedAtIso?: string
}

export type CreateTaskInput<TInput> = {
  id?: string
  kind: string
  origin: string
  principal: string
  idempotencyKey: string
  input: TInput
  now?: Date
}

export type TaskEvent<TProgress = TaskProgress, TResult = unknown> =
  | { type: 'start'; at?: Date }
  | { type: 'progress'; progress: TProgress; at?: Date }
  | { type: 'await_approval'; progress?: TProgress; at?: Date }
  | { type: 'resume'; at?: Date }
  | { type: 'complete'; result: TResult; at?: Date }
  | { type: 'fail'; error: string; at?: Date }
  | { type: 'cancel'; error?: string; at?: Date }

const transitions: Record<TaskStatus, ReadonlySet<TaskEvent['type']>> = {
  queued: new Set(['start', 'fail', 'cancel']),
  running: new Set(['progress', 'await_approval', 'complete', 'fail', 'cancel']),
  awaiting_approval: new Set(['progress', 'resume', 'fail', 'cancel']),
  completed: new Set(),
  failed: new Set(),
  cancelled: new Set(),
}

export function createTaskSnapshot<TInput>(input: CreateTaskInput<TInput>): TaskSnapshot<TInput> {
  const nowIso = (input.now ?? new Date()).toISOString()
  return {
    id: input.id ?? globalThis.crypto.randomUUID(),
    kind: input.kind,
    origin: input.origin,
    principal: input.principal,
    idempotencyKey: input.idempotencyKey,
    status: 'queued',
    input: input.input,
    progress: null,
    result: null,
    error: null,
    revision: 0,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  }
}

export function taskIsTerminal(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

export function transitionTask<TInput, TProgress, TResult>(
  task: TaskSnapshot<TInput, TProgress, TResult>,
  event: TaskEvent<TProgress, TResult>,
): TaskSnapshot<TInput, TProgress, TResult> {
  if (!transitions[task.status].has(event.type)) {
    throw new Error(`Invalid task transition: ${task.status} -> ${event.type}`)
  }

  const atIso = (event.at ?? new Date()).toISOString()
  const next = { ...task, revision: task.revision + 1, updatedAtIso: atIso }
  switch (event.type) {
    case 'start':
      return { ...next, status: 'running', startedAtIso: task.startedAtIso ?? atIso }
    case 'progress':
      return { ...next, progress: event.progress }
    case 'await_approval':
      return { ...next, status: 'awaiting_approval', progress: event.progress ?? task.progress }
    case 'resume':
      return { ...next, status: 'running' }
    case 'complete':
      return { ...next, status: 'completed', result: event.result, error: null, completedAtIso: atIso }
    case 'fail':
      return { ...next, status: 'failed', error: event.error, completedAtIso: atIso }
    case 'cancel':
      return { ...next, status: 'cancelled', error: event.error ?? null, completedAtIso: atIso }
  }
}

export type TaskListener<TTask> = (task: TTask) => void

/** In-process task notifications. Durable state and recovery remain product-owned. */
export class TaskEventBus<TTask extends { id: string }> {
  private readonly listeners = new Map<string, Set<TaskListener<TTask>>>()

  subscribe(taskId: string, listener: TaskListener<TTask>): () => void {
    const listeners = this.listeners.get(taskId) ?? new Set<TaskListener<TTask>>()
    listeners.add(listener)
    this.listeners.set(taskId, listeners)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.listeners.delete(taskId)
    }
  }

  publish(task: TTask): void {
    for (const listener of this.listeners.get(task.id) ?? []) listener(task)
  }

  waitFor(
    taskId: string,
    current: () => TTask | Promise<TTask>,
    predicate: (task: TTask) => boolean,
    timeoutMs: number,
  ): Promise<TTask> {
    const boundedTimeoutMs = Math.max(0, timeoutMs)
    return new Promise<TTask>((resolve, reject) => {
      let settled = false
      let unsubscribe = () => {}
      const finish = (task: TTask) => {
        if (settled || !predicate(task)) return
        settled = true
        clearTimeout(timer)
        unsubscribe()
        resolve(task)
      }
      const timer = setTimeout(async () => {
        if (settled) return
        try {
          settled = true
          unsubscribe()
          resolve(await current())
        } catch (error) {
          reject(error)
        }
      }, boundedTimeoutMs)
      unsubscribe = this.subscribe(taskId, finish)
      void Promise.resolve(current()).then(finish, (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        unsubscribe()
        reject(error)
      })
    })
  }
}
