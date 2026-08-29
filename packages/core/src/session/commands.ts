import { createTypedCodexClient, type CodexRpcCaller, type TypedCodexClient } from '../protocol/methods.js'
import type { ThreadForkParams } from '../protocol/generated/v2/ThreadForkParams.js'
import type { ThreadResumeParams } from '../protocol/generated/v2/ThreadResumeParams.js'
import type { ThreadStartParams } from '../protocol/generated/v2/ThreadStartParams.js'
import type { TurnStartParams } from '../protocol/generated/v2/TurnStartParams.js'
import type { UserInput } from '../protocol/generated/v2/UserInput.js'

export type ThreadResumeOverrides = Omit<ThreadResumeParams, 'threadId'>
export type ThreadForkOverrides = Omit<ThreadForkParams, 'threadId'>
export type TurnStartInput = Omit<TurnStartParams, 'threadId'>

function requiredId(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required`)
  return normalized
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
    return requiredId(result.thread.id, 'thread/start result thread id')
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
    return requiredId(result.thread.id, 'thread/fork result thread id')
  }

  async compactThread(threadId: string): Promise<void> {
    await this.client.call('thread/compact/start', { threadId: requiredId(threadId, 'threadId') })
  }

  async startTurn(threadId: string, input: TurnStartInput): Promise<string> {
    const result = await this.client.call('turn/start', { ...input, threadId: requiredId(threadId, 'threadId') })
    return requiredId(result.turn.id, 'turn/start result turn id')
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
