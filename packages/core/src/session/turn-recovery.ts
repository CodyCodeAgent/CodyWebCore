import type { CodexEvent } from '../conversation/index.js'
import type { RuntimeNotification } from '../runtime/index.js'
import { normalizeCodexNotification, textFromError } from './normalization.js'

export type TurnRecoveryHandle = { threadId: string; turnId: string }

export type TurnRecoveryMonitorOptions = {
  /** Maximum silence after a successful turn/start acknowledgement. */
  inactivityTimeoutMs?: number
  maxUpstreamRetryAttempts?: number
  nowIso?: () => string
  onInactive?: (handle: TurnRecoveryHandle) => void | Promise<void>
  /** Timers cannot return events, so inactivity failures are delivered here. */
  onTerminal?: (event: CodexEvent) => void
}

type TrackedTurn = { handle: TurnRecoveryHandle; timer: ReturnType<typeof setTimeout>; retries: number; limit: number }

const DEFAULT_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000
const DEFAULT_RETRY_LIMIT = 5

/**
 * Product-neutral lifecycle supervision for products that dispatch raw RPC
 * commands instead of using CodexSessionManager. It turns terminal retry
 * exhaustion and silent response streams into the same normalized failures.
 */
export class CodexTurnRecoveryMonitor {
  private readonly tracked = new Map<string, TrackedTurn>()
  constructor(private readonly options: TurnRecoveryMonitorOptions = {}) {}

  track(handle: TurnRecoveryHandle): void {
    const key = this.key(handle)
    const previous = this.tracked.get(key)
    if (previous) clearTimeout(previous.timer)
    const tracked: TrackedTurn = { handle, timer: undefined as unknown as ReturnType<typeof setTimeout>, retries: previous?.retries ?? 0, limit: previous?.limit ?? this.options.maxUpstreamRetryAttempts ?? DEFAULT_RETRY_LIMIT }
    this.tracked.set(key, tracked)
    this.arm(tracked)
  }

  untrack(handle: TurnRecoveryHandle): void { this.finish(this.key(handle)) }

  observe(notification: RuntimeNotification): CodexEvent[] {
    const synthetic: CodexEvent[] = []
    for (const event of normalizeCodexNotification(notification)) {
      if (!event.turnId) continue
      const key = this.key({ threadId: event.threadId, turnId: event.turnId })
      const tracked = this.tracked.get(key)
      if (!tracked) continue
      if (event.type === 'turn.completed' || event.type === 'turn.failed' || event.type === 'turn.interrupted') {
        this.finish(key)
        continue
      }
      if (event.type === 'turn.retrying') {
        const reportedAttempt = typeof event.data.retryAttempt === 'number' ? event.data.retryAttempt : 0
        const reportedLimit = typeof event.data.retryLimit === 'number' ? event.data.retryLimit : 0
        tracked.retries = Math.max(tracked.retries + 1, reportedAttempt)
        if (reportedLimit > 0) tracked.limit = reportedLimit
        const data = { ...event.data, retryAttempt: tracked.retries, retryLimit: tracked.limit }
        if (tracked.retries >= tracked.limit || event.data.willRetry === false) {
          this.finish(key)
          synthetic.push({ ...event, id: `core:turn.failed:recovery:${key}:${String(tracked.retries)}`, type: 'turn.failed', data: {
            ...data,
            cause: 'upstream_response_stream_unrecoverable',
            error: `Codex 上游响应流恢复失败，未自动重发。${textFromError(event.data.error) || '重试次数已耗尽。'}`,
          } })
          continue
        }
      }
      this.arm(tracked)
    }
    return synthetic
  }

  dispose(): void { for (const key of this.tracked.keys()) this.finish(key) }

  private arm(tracked: TrackedTurn): void {
    clearTimeout(tracked.timer)
    tracked.timer = setTimeout(() => {
      const key = this.key(tracked.handle)
      if (this.tracked.get(key) !== tracked) return
      this.finish(key)
      void this.options.onInactive?.(tracked.handle)
      this.options.onTerminal?.({
        id: `core:turn.failed:inactivity:${key}`,
        type: 'turn.failed',
        threadId: tracked.handle.threadId,
        turnId: tracked.handle.turnId,
        atIso: (this.options.nowIso ?? (() => new Date().toISOString()))(),
        data: {
          cause: 'inactivity_timeout',
          error: `Codex turn ${tracked.handle.turnId} had no progress for ${String(Math.max(250, this.options.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS))}ms`,
        },
      })
    }, Math.max(250, this.options.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS))
    tracked.timer.unref?.()
  }
  private finish(key: string): void { const tracked = this.tracked.get(key); if (!tracked) return; clearTimeout(tracked.timer); this.tracked.delete(key) }
  private key(handle: TurnRecoveryHandle): string { return `${handle.threadId}\u0000${handle.turnId}` }
}
