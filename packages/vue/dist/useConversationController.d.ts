import { type ComputedRef } from 'vue';
import { type ConversationState } from '@codycodeagent/cody-web-core/conversation';
import { type ConversationTransport } from '@codycodeagent/cody-web-core/client';
export interface UseConversationController {
    readonly state: ComputedRef<ConversationState>;
    connect(threadId: string, transport: ConversationTransport): Promise<void>;
    refresh(): Promise<void>;
    reset(threadId?: string): void;
    dispose(): void;
}
/**
 * Owns one product-neutral conversation controller for a Vue view.
 * Switching conversations is atomic: late state from a disposed controller can
 * never overwrite the newly selected thread.
 */
export declare function useConversationController(): UseConversationController;
//# sourceMappingURL=useConversationController.d.ts.map