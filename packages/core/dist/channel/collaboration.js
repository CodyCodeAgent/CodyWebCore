const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
const integer = (value, min, max) => Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
export function parseCollaborationDecision(value) {
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, ''));
        }
        catch {
            return null;
        }
    }
    const row = object(value);
    if (row && new TextEncoder().encode(JSON.stringify(row)).byteLength > 10000)
        return null;
    if (!row || !['reply', 'done', 'needs_human'].includes(String(row.action)) || typeof row.reply !== 'string' || row.reply.length > 12000 || typeof row.reason !== 'string' || row.reason.length > 1000)
        return null;
    if (!Array.isArray(row.pendingIssues) || row.pendingIssues.length > 20 || row.pendingIssues.some(item => typeof item !== 'string' || item.length > 1000))
        return null;
    if (row.action === 'reply' && !row.reply.trim())
        return null;
    if (row.action === 'done' && row.pendingIssues.length)
        return null;
    return { action: row.action, reply: row.reply.trim(), pendingIssues: row.pendingIssues, reason: row.reason };
}
export function parseCollaborationEvent(value) {
    const row = object(value);
    if (!row || row.version !== 1 || typeof row.batch !== 'string' || !row.batch || row.batch.length > 200 || typeof row.topic !== 'string' || !row.topic || row.topic.length > 200)
        return null;
    if (!['join', 'decision', 'stop'].includes(String(row.kind)) || !integer(row.size, 2, 8) || !integer(row.slot, 0, row.size - 1) || !integer(row.round, 1, 30) || !integer(row.maxRounds, 1, 30))
        return null;
    if (typeof row.deadline !== 'string' || !Number.isFinite(Date.parse(row.deadline)))
        return null;
    const decision = row.kind === 'decision' ? parseCollaborationDecision(row.decision) : null;
    if (row.kind === 'decision' && !decision)
        return null;
    return { version: 1, batch: row.batch, topic: row.topic, kind: row.kind, slot: row.slot, size: row.size, round: row.round, maxRounds: row.maxRounds, deadline: row.deadline, ...(decision ? { decision } : {}) };
}
export function collaborationTerminal(state) {
    return state.status !== 'joining' && state.status !== 'active';
}
export function createCollaborationState(input) {
    if (!parseCollaborationEvent({ ...input, version: 1, kind: 'join', slot: 0, round: 1 }))
        throw new Error('Invalid collaboration limits');
    return { ...input, round: 1, joined: [], decisions: {}, status: 'joining' };
}
/** Apply only after authenticating sender -> slot against the initiating human
 * message. At most one immutable decision per participant per round. */
export function applyCollaborationEvent(state, event, now) {
    if (collaborationTerminal(state))
        return state;
    if (now >= Date.parse(state.deadline))
        return { ...state, status: 'expired' };
    if (!parseCollaborationEvent(event) || event.batch !== state.batch || event.topic !== state.topic || event.size !== state.size)
        return state;
    if (event.kind === 'stop')
        return { ...state, status: 'stopped' };
    if (event.kind === 'join') {
        if (state.joined.includes(event.slot))
            return state;
        const joined = [...state.joined, event.slot].sort((a, b) => a - b);
        const deadline = new Date(Math.min(Date.parse(state.deadline), Date.parse(event.deadline))).toISOString();
        return { ...state, joined, deadline, maxRounds: Math.min(state.maxRounds, event.maxRounds), status: now >= Date.parse(deadline) ? 'expired' : joined.length === state.size ? 'active' : 'joining' };
    }
    if (state.status !== 'active' || !state.joined.includes(event.slot) || event.round !== state.round || !event.decision)
        return state;
    const prior = state.decisions[event.slot];
    if (prior?.round === event.round)
        return state;
    const decisions = { ...state.decisions, [event.slot]: { round: event.round, decision: event.decision } };
    const next = { ...state, decisions };
    if (event.decision.action === 'needs_human')
        return { ...next, status: 'needs_human' };
    const all = Array.from({ length: state.size }, (_, slot) => decisions[slot]);
    if (!all.every(item => item && item.round === state.round))
        return next;
    if (all.every(item => item.decision.action === 'done'))
        return { ...next, status: 'completed' };
    if (state.round >= state.maxRounds)
        return { ...next, status: 'round_limit' };
    return { ...next, round: state.round + 1 };
}
export function collaborationCanRun(state, slot, now) {
    const previous = state.decisions[slot];
    return state.status === 'active' && now < Date.parse(state.deadline) && state.joined.includes(slot) && previous?.round !== state.round;
}
/** Card callbacks carry protocol data without adding a machine JSON block to
 * the visible answer. Input is untrusted until the host verifies the sender. */
export function collaborationEventFromContent(value) {
    let visited = 0;
    const walk = (node, depth) => {
        if (depth > 12 || ++visited > 2000)
            return null;
        if (Array.isArray(node)) {
            for (const item of node) {
                const found = walk(item, depth + 1);
                if (found)
                    return found;
            }
            return null;
        }
        const row = object(node);
        if (!row)
            return null;
        const event = parseCollaborationEvent(row.codywork_collaboration);
        if (event)
            return event;
        for (const item of Object.values(row)) {
            const found = walk(item, depth + 1);
            if (found)
                return found;
        }
        return null;
    };
    return walk(value, 0);
}
//# sourceMappingURL=collaboration.js.map