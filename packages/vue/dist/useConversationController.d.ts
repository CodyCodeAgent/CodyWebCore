import { type ComputedRef } from 'vue';
import { type ConversationState } from '@codycodeagent/cody-web-core/conversation';
import { type ConversationController, type ConversationTransport } from '@codycodeagent/cody-web-core/client';
export interface UseConversationController {
    readonly state: ComputedRef<ConversationState>;
    connect(threadId: string, transport: ConversationTransport): Promise<void>;
    submitUserMessage(input: {
        text: string;
        images?: string[];
        skills?: Array<{
            name: string;
            path: string;
            displayName?: string;
        }>;
    }, command: Parameters<ConversationController['submitUserMessage']>[1]): Promise<{
        clientCommandId: string;
    }>;
    retryFailedUserMessage(messageId: string, command: Parameters<ConversationController['retryFailedUserMessage']>[1]): Promise<{
        clientCommandId: string;
    }>;
    discardFailedUserMessage(messageId: string): void;
    interrupt(): Promise<void>;
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