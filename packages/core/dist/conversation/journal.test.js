import { describe, expect, it } from 'vitest';
import { ConversationEventJournalCoordinator, conversationHandoffTranscript, createConversationHandoffReplay, mergeConversationSnapshotWithJournal, } from './index.js';
const event = (id, atIso, type = 'assistant.completed', text = id) => ({
    id, type, threadId: 'thread-1', atIso, data: { text },
});
describe('conversation event journal', () => {
    it('replays a durable provider journal when the native snapshot is empty after restart', () => {
        const journal = {
            events: [event('user-1', '2026-01-01T00:00:00.000Z', 'user.completed', 'remember this')],
            nativeEventsAfterIso: null,
            compactedAtIso: null,
        };
        const snapshot = mergeConversationSnapshotWithJournal({ events: [], watermark: 0 }, journal);
        expect(snapshot).toEqual({ events: journal.events, watermark: 0 });
    });
    it('deduplicates native/live overlap by event identity and preserves a provider watermark', () => {
        const replay = event('replay-1', '2026-01-01T00:00:01.000Z');
        const native = event('native-1', '2026-01-01T00:00:02.000Z');
        const snapshot = mergeConversationSnapshotWithJournal({ events: [replay, native], watermark: 7 }, {
            events: [replay], nativeEventsAfterIso: null, compactedAtIso: null,
        });
        expect(snapshot.watermark).toBe(7);
        expect(snapshot.events.map((item) => item.id)).toEqual(['replay-1', 'native-1']);
    });
    it('does not resurrect events excluded by a product clear cut', () => {
        const old = event('old', '2026-01-01T00:00:00.000Z');
        const fresh = event('fresh', '2026-01-01T00:01:00.000Z');
        const snapshot = mergeConversationSnapshotWithJournal({ events: [old, fresh], watermark: 3 }, {
            events: [], nativeEventsAfterIso: '2026-01-01T00:00:30.000Z', compactedAtIso: '2026-01-01T00:00:30.000Z',
        });
        expect(snapshot.events.map((item) => item.id)).toEqual(['fresh']);
    });
    it('provides a bounded handoff transcript and a minimal replay record', () => {
        const transcript = conversationHandoffTranscript([
            event('u', '2026-01-01T00:00:00.000Z', 'user.completed', 'build the journal'),
            event('a', '2026-01-01T00:00:01.000Z', 'assistant.completed', 'the journal is ready'),
        ]);
        expect(transcript).toContain('User: build the journal');
        expect(transcript).toContain('Assistant: the journal is ready');
        const replay = createConversationHandoffReplay({ threadId: 'thread-1', turnId: 'handoff-1', atIso: '2026-01-01T00:02:00.000Z', summary: 'ready' });
        expect(replay.map((item) => item.type)).toEqual(['user.completed', 'assistant.completed', 'turn.completed']);
    });
    it('keeps durability behind a product storage port', async () => {
        let journal = { events: [], nativeEventsAfterIso: null, compactedAtIso: null };
        const coordinator = new ConversationEventJournalCoordinator({
            append: (_id, incoming) => { journal = { ...journal, events: [...journal.events, incoming] }; },
            read: () => journal,
            replace: (_id, next) => { journal = next; },
        });
        await coordinator.append('conversation-1', event('first', '2026-01-01T00:00:00.000Z'));
        await expect(coordinator.snapshot('conversation-1', { events: [], watermark: 0 })).resolves.toMatchObject({ events: [expect.objectContaining({ id: 'first' })] });
        await coordinator.clear('conversation-1', '2026-01-01T00:01:00.000Z');
        await expect(coordinator.snapshot('conversation-1', { events: [event('first', '2026-01-01T00:00:00.000Z')], watermark: 0 })).resolves.toEqual({ events: [], watermark: 0 });
    });
});
//# sourceMappingURL=journal.test.js.map