import { describe, expect, it } from 'vitest';
import { applyCollaborationEvent, collaborationCanRun, collaborationEventFromContent, createCollaborationState, parseCollaborationDecision } from './collaboration.js';
import { normalizeFeishuMessage, normalizeFeishuV2Card } from '../feishu/index.js';
const now = Date.parse('2026-11-15T00:00:00Z');
const event = (slot, patch = {}) => ({ version: 1, batch: 'human-1', topic: 'topic-1', slot, size: 2, kind: 'join', round: 1, maxRounds: 3, deadline: new Date(now + 900000).toISOString(), ...patch });
const initial = () => createCollaborationState(event(0));
const ready = () => [event(0), event(1)].reduce((state, item) => applyCollaborationEvent(state, item, now), initial());
const decision = (slot, action, round = 1) => event(slot, { kind: 'decision', round, decision: { action, reply: action === 'reply' ? '具体建议' : '', pendingIssues: action === 'reply' ? ['有待验证'] : [], reason: '判断理由' } });
describe('decentralized collaboration', () => {
    it('waits for every participant and chooses the stricter limits', () => {
        const a = applyCollaborationEvent(initial(), event(0), now);
        expect(collaborationCanRun(a, 0, now)).toBe(false);
        const b = applyCollaborationEvent(a, event(1, { maxRounds: 1, deadline: new Date(now + 60000).toISOString() }), now);
        expect(b).toMatchObject({ status: 'active', maxRounds: 1 });
        expect(collaborationCanRun(b, 0, now + 60000)).toBe(false);
    });
    it('counts a round only after every live participant has judged', () => {
        let state = applyCollaborationEvent(ready(), decision(0, 'reply'), now);
        expect(state.round).toBe(1);
        expect(collaborationCanRun(state, 0, now)).toBe(false);
        state = applyCollaborationEvent(state, decision(1, 'reply'), now);
        expect(state.round).toBe(2);
        expect(collaborationCanRun(state, 0, now)).toBe(true);
        expect(applyCollaborationEvent(state, decision(1, 'reply'), now)).toBe(state);
    });
    it('reconsiders a done judgment when a peer raises an issue, and stops when all agree', () => {
        let state = applyCollaborationEvent(ready(), decision(0, 'done'), now);
        state = applyCollaborationEvent(state, decision(1, 'reply'), now);
        expect(state.round).toBe(2);
        expect(collaborationCanRun(state, 0, now)).toBe(true);
        state = applyCollaborationEvent(state, decision(1, 'done', 2), now);
        expect(state.status).toBe('active');
        state = applyCollaborationEvent(state, decision(0, 'done', 2), now);
        expect(state.status).toBe('completed');
        expect(applyCollaborationEvent(state, event(1), now)).toBe(state);
    });
    it('hard-stops at limits and rejects stale batches, future rounds and duplicate decisions', () => {
        const one = { ...ready(), maxRounds: 1 };
        const a = applyCollaborationEvent(one, decision(0, 'reply'), now);
        expect(applyCollaborationEvent(a, decision(0, 'done'), now)).toBe(a);
        expect(applyCollaborationEvent(a, decision(1, 'reply', 2), now)).toBe(a);
        expect(applyCollaborationEvent(a, { ...decision(1, 'reply'), batch: 'old' }, now)).toBe(a);
        expect(applyCollaborationEvent(a, decision(1, 'reply'), now).status).toBe('round_limit');
        expect(applyCollaborationEvent(a, event(1), now + 900000).status).toBe('expired');
    });
    it('stops for human input, malformed output and pending issues cannot claim done', () => {
        expect(applyCollaborationEvent(ready(), decision(1, 'needs_human'), now).status).toBe('needs_human');
        expect(parseCollaborationDecision('好的，明白了')).toBeNull();
        expect(parseCollaborationDecision({ action: 'reply', reply: '长'.repeat(4000), reason: '', pendingIssues: [] })).toBeNull();
        expect(parseCollaborationDecision({ action: 'done', reply: '', reason: '', pendingIssues: ['未解决'] })).toBeNull();
    });
    it('keeps protocol data through actual Feishu v2 conversion and inbound hydration', () => {
        const card = normalizeFeishuV2Card({ elements: [{ tag: 'action', actions: [{ tag: 'button', text: { tag: 'plain_text', content: '协作状态' }, value: { action: 'collaboration.status', codywork_collaboration: event(1) } }] }] });
        const inbound = normalizeFeishuMessage({ accountId: 'a', appId: 'cli_a', appSecret: 'test' }, { event: { sender: { sender_type: 'app', sender_id: { open_id: 'ou_peer' } }, message: { message_id: 'wire', chat_id: 'oc_group', message_type: 'interactive', content: JSON.stringify(card) } } });
        expect(collaborationEventFromContent(inbound?.content?.raw)).toEqual(event(1));
        expect(inbound?.sender.type).toBe('app');
    });
});
//# sourceMappingURL=collaboration.test.js.map