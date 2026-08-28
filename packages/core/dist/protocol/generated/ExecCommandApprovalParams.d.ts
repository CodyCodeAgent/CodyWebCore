import type { ParsedCommand } from "./ParsedCommand";
import type { ThreadId } from "./ThreadId";
export type ExecCommandApprovalParams = {
    conversationId: ThreadId;
    /**
     * Use to correlate this with [codex_core::protocol::ExecCommandBeginEvent]
     * and [codex_core::protocol::ExecCommandEndEvent].
     */
    callId: string;
    command: Array<string>;
    cwd: string;
    reason: string | null;
    parsedCmd: Array<ParsedCommand>;
};
//# sourceMappingURL=ExecCommandApprovalParams.d.ts.map