import { computed, getCurrentScope, onScopeDispose, shallowRef, type ComputedRef } from 'vue'
import { createConversationState, type ConversationState } from '@codycodeagent/cody-web-core/conversation'
import {
  createConversationController,
  type ConversationController,
  type ConversationTransport,
} from '@codycodeagent/cody-web-core/client'

export interface UseConversationController {
  readonly state: ComputedRef<ConversationState>
  connect(threadId: string, transport: ConversationTransport): Promise<void>
  enqueueUserMessage(input: { id: string; text: string; images?: string[]; skills?: Array<{ name: string; path: string; displayName?: string }> }): void
  submitUserMessage(
    input: { id: string; text: string; images?: string[]; skills?: Array<{ name: string; path: string; displayName?: string }> },
    command: Parameters<ConversationController['submitUserMessage']>[1],
  ): Promise<{ clientCommandId: string }>
  bindQueuedUserMessage(id: string, turnId: string): void
  failQueuedUserMessage(id: string, error: string): void
  refresh(): Promise<void>
  reset(threadId?: string): void
  dispose(): void
}

/**
 * Owns one product-neutral conversation controller for a Vue view.
 * Switching conversations is atomic: late state from a disposed controller can
 * never overwrite the newly selected thread.
 */
export function useConversationController(): UseConversationController {
  const state = shallowRef(createConversationState())
  let controller: ConversationController | null = null
  let unsubscribe: (() => void) | null = null
  let generation = 0

  const release = (): void => {
    generation += 1
    unsubscribe?.()
    unsubscribe = null
    controller?.dispose()
    controller = null
  }

  const connect = async (threadId: string, transport: ConversationTransport): Promise<void> => {
    release()
    state.value = createConversationState(threadId)
    const currentGeneration = generation
    const nextController = createConversationController(threadId, transport)
    controller = nextController
    unsubscribe = nextController.subscribe((nextState) => {
      if (controller === nextController && generation === currentGeneration) state.value = nextState
    })
    await nextController.start()
  }

  const refresh = async (): Promise<void> => {
    await controller?.refresh()
  }

  const enqueueUserMessage: UseConversationController['enqueueUserMessage'] = (input) => controller?.enqueueUserMessage(input)
  const submitUserMessage: UseConversationController['submitUserMessage'] = async (input, command) => {
    if (!controller) throw new Error('Conversation controller is not connected.')
    return controller.submitUserMessage(input, command)
  }
  const bindQueuedUserMessage: UseConversationController['bindQueuedUserMessage'] = (id, turnId) => controller?.bindQueuedUserMessage(id, turnId)
  const failQueuedUserMessage: UseConversationController['failQueuedUserMessage'] = (id, error) => controller?.failQueuedUserMessage(id, error)

  const reset = (threadId = ''): void => {
    release()
    state.value = createConversationState(threadId)
  }

  const dispose = (): void => {
    release()
  }

  if (getCurrentScope()) onScopeDispose(dispose)

  return {
    state: computed(() => state.value),
    connect,
    enqueueUserMessage,
    submitUserMessage,
    bindQueuedUserMessage,
    failQueuedUserMessage,
    refresh,
    reset,
    dispose,
  }
}
