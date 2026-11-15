/** Bounded, coordinator-free discussion protocol. Identity authentication and
 * persistence belong to the host; the model never chooses counters or peers. */
export type CollaborationDecision = {
    action: 'reply' | 'done' | 'needs_human';
    reply: string;
    pendingIssues: string[];
    reason: string;
};
export type CollaborationEvent = {
    version: 1;
    batch: string;
    topic: string;
    kind: 'join' | 'decision' | 'stop';
    slot: number;
    size: number;
    round: number;
    maxRounds: number;
    deadline: string;
    decision?: CollaborationDecision;
};
export type CollaborationState = {
    batch: string;
    topic: string;
    size: number;
    round: number;
    maxRounds: number;
    deadline: string;
    joined: number[];
    decisions: Record<string, {
        round: number;
        decision: CollaborationDecision;
    }>;
    status: 'joining' | 'active' | 'completed' | 'needs_human' | 'round_limit' | 'expired' | 'stopped';
};
export declare function parseCollaborationDecision(value: unknown): CollaborationDecision | null;
export declare function parseCollaborationEvent(value: unknown): CollaborationEvent | null;
export declare function collaborationTerminal(state: CollaborationState): boolean;
export declare function createCollaborationState(input: Pick<CollaborationState, 'batch' | 'topic' | 'size' | 'maxRounds' | 'deadline'>): CollaborationState;
/** Apply only after authenticating sender -> slot against the initiating human
 * message. At most one immutable decision per participant per round. */
export declare function applyCollaborationEvent(state: CollaborationState, event: CollaborationEvent, now: number): CollaborationState;
export declare function collaborationCanRun(state: CollaborationState, slot: number, now: number): boolean;
/** Card callbacks carry protocol data without adding a machine JSON block to
 * the visible answer. Input is untrusted until the host verifies the sender. */
export declare function collaborationEventFromContent(value: unknown): CollaborationEvent | null;
//# sourceMappingURL=collaboration.d.ts.map