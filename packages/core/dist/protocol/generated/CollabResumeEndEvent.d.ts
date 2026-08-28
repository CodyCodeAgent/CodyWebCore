import type { AgentStatus } from "./AgentStatus";
import type { ThreadId } from "./ThreadId";
export type CollabResumeEndEvent = {
    /**
     * Identifier for the collab tool call.
     */
    call_id: string;
    /**
     * Thread ID of the sender.
     */
    sender_thread_id: ThreadId;
    /**
     * Thread ID of the receiver.
     */
    receiver_thread_id: ThreadId;
    /**
     * Last known status of the receiver agent reported to the sender agent after
     * resume.
     */
    status: AgentStatus;
};
//# sourceMappingURL=CollabResumeEndEvent.d.ts.map