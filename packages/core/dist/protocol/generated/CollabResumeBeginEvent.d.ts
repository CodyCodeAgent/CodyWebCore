import type { ThreadId } from "./ThreadId";
export type CollabResumeBeginEvent = {
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
};
//# sourceMappingURL=CollabResumeBeginEvent.d.ts.map