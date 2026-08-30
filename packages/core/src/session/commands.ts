import { createTypedCodexClient, type CodexRpcCaller, type TypedCodexClient } from '../protocol/methods.js'
import { asRecord } from '../protocol/index.js'
import type { ThreadForkParams } from '../protocol/generated/v2/ThreadForkParams.js'
import type { ThreadResumeParams } from '../protocol/generated/v2/ThreadResumeParams.js'
import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js'
import type { TurnStartParams } from '../protocol/generated/v2/TurnStartParams.js'
import type { UserInput } from '../protocol/generated/v2/UserInput.js'

export type ThreadResumeOverrides = Omit<ThreadResumeParams, 'threadId'>
export type ThreadForkOverrides = Omit<ThreadForkParams, 'threadId'>
export type TurnStartInput = Omit<TurnStartParams, 'threadId'>

/**
 * A thread may be present in durable history while a freshly started App
 * Server has not materialized it yet.  Only this explicit error is safe to
 * retry: any other turn/start failure may have reached the server already.
 */
export function isThreadNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /\bthread\s+(?:was\s+)?not\s+found\b/i.test(message)
}

function requiredId(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`)
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required`)
  return normalized
}

function responseId(value: unknown, objectKey: 'thread' | 'turn', label: string): string {
  const nested = asRecord(asRecord(value)?.[objectKey])
  return requiredId(nested?.id, label)
}

/**
 * Stateless, schema-bound Codex thread and turn commands.
 *
 * Products own navigation, policy selection, queue UX, and error localization;
 * this class owns exact RPC names, wire payloads, identifier normalization, and
 * malformed-success rejection.
 */
export class CodexThreadCommands {
  private readonly client: TypedCodexClient

  constructor(rpc: CodexRpcCaller) {
    this.client = createTypedCodexClient(rpc)
  }

  async startThread(params: ThreadStartParams = {}): Promise<string> {
    const result = await this.client.call('thread/start', params)
    return responseId(result, 'thread', 'thread/start result thread id')
  }

  async resumeThread(threadId: string, overrides: ThreadResumeOverrides = {}): Promise<void> {
    await this.client.call('thread/resume', { ...overrides, threadId: requiredId(threadId, 'threadId') })
  }

  async renameThread(threadId: string, name: string): Promise<void> {
    await this.client.call('thread/name/set', {
      threadId: requiredId(threadId, 'threadId'),
      name: requiredId(name, 'thread name'),
    })
  }

  async forkThread(threadId: string, overrides: ThreadForkOverrides = {}): Promise<string> {
    const result = await this.client.call('thread/fork', { ...overrides, threadId: requiredId(threadId, 'threadId') })
    return responseId(result, 'thread', 'thread/fork result thread id')
  }

  async compactThread(threadId: string): Promise<void> {
    await this.client.call('thread/compact/start', { threadId: requiredId(threadId, 'threadId') })
  }

  async archiveThread(threadId: string): Promise<void> {
    await this.client.call('thread/archive', { threadId: requiredId(threadId, 'threadId') })
  }

  async startTurn(threadId: string, input: TurnStartInput): Promise<string> {
    const result = await this.client.call('turn/start', { ...input, threadId: requiredId(threadId, 'threadId') })
    return responseId(result, 'turn', 'turn/start result turn id')
  }

  /**
   * Starts a turn and self-heals one stale App Server materialization.
   *
   * `thread/resume` is deliberately attempted only after the server has
   * explicitly said that the thread is missing.  Retrying on transport,
   * timeout, or generic RPC failures could duplicate a mutating turn.
   */
  async startTurnWithResumeRecovery(
    threadId: string,
    input: TurnStartInput,
    resumeOverrides: ThreadResumeOverrides = {},
  ): Promise<string> {
    const normalizedThreadId = requiredId(threadId, 'threadId')
    try {
      return await this.startTurn(normalizedThreadId, input)
    } catch (error) {
      if (!isThreadNotFoundError(error)) throw error
      await this.resumeThread(normalizedThreadId, resumeOverrides)
      return this.startTurn(normalizedThreadId, input)
    }
  }

  async steerTurn(threadId: string, expectedTurnId: string, input: UserInput[]): Promise<void> {
    await this.client.call('turn/steer', {
      threadId: requiredId(threadId, 'threadId'),
      expectedTurnId: requiredId(expectedTurnId, 'expectedTurnId'),
      input,
    })
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    await this.client.call('turn/interrupt', {
      threadId: requiredId(threadId, 'threadId'),
      turnId: requiredId(turnId, 'turnId'),
    })
  }
}
