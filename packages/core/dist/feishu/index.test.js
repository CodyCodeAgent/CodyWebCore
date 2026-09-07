import { describe, expect, it } from 'vitest';
import { applyFeishuChatMode, FeishuProvider, feishuSelectionCard, feishuTextCard, normalizeFeishuAction, normalizeFeishuMessage } from './index.js';
describe('normalizeFeishuMessage', () => {
    const config = { accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret', botOpenId: 'ou_bot', privateConversationMode: 'topic' };
    it('maps a private top-level message to a stable topic envelope', () => {
        const message = normalizeFeishuMessage(config, { event_id: 'event-1', event: {
                sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
                message: { message_id: 'om_1', chat_id: 'oc_1', chat_type: 'p2p', message_type: 'text', content: JSON.stringify({ text: 'hello' }) },
            } });
        expect(message).toMatchObject({
            provider: 'feishu', eventId: 'event-1', messageId: 'om_1', text: 'hello', addressedToAgent: true,
            conversation: { id: 'oc_1', scope: 'private', rootId: 'om_1' }, sender: { id: 'ou_user', type: 'user' },
        });
    });
    it('uses open_id consistently when the event also contains a union_id', () => {
        const message = normalizeFeishuMessage(config, { event: {
                sender: { sender_type: 'user', sender_id: { open_id: 'ou_user', union_id: 'on_user' } },
                message: { message_id: 'om_identity', chat_id: 'oc_identity', chat_type: 'p2p', message_type: 'text', content: JSON.stringify({ text: 'hello' }) },
            } });
        expect(message?.sender.id).toBe('ou_user');
    });
    it('removes the bot mention and preserves image resource identity', () => {
        const message = normalizeFeishuMessage(config, { event: {
                sender: { sender_type: 'user', sender_id: { union_id: 'on_user' } },
                message: { message_id: 'om_2', chat_id: 'oc_2', chat_type: 'group', message_type: 'text', content: JSON.stringify({ text: '@_user_1 inspect' }), mentions: [{ key: '@_user_1', name: 'CodyWork', id: { open_id: 'ou_bot' } }] },
            } });
        expect(message).toMatchObject({ text: 'inspect', addressedToAgent: true, conversation: { scope: 'group' } });
    });
    it('promotes a topic-group root event to a stable topic binding after chat lookup', () => {
        const message = normalizeFeishuMessage(config, { event: {
                sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
                message: { message_id: 'om_topic_root', chat_id: 'oc_topic', chat_type: 'group', message_type: 'text', content: JSON.stringify({ text: 'root' }) },
            } });
        expect(message?.conversation).toEqual({ id: 'oc_topic', scope: 'group' });
        expect(applyFeishuChatMode(message, 'topic').conversation).toEqual({ id: 'oc_topic', scope: 'topic', rootId: 'om_topic_root' });
    });
    it('maps file resources without leaking provider fields into the envelope shape', () => {
        const message = normalizeFeishuMessage(config, { event: {
                sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
                message: { message_id: 'om_3', chat_id: 'oc_1', chat_type: 'p2p', message_type: 'file', content: JSON.stringify({ file_key: 'file_1', file_name: '../report.txt' }) },
            } });
        expect(message?.attachments).toEqual([{ id: 'file_1', type: 'file', name: '../report.txt' }]);
    });
    it('preserves inline images from rich-text posts as downloadable attachments', () => {
        const message = normalizeFeishuMessage(config, { event: {
                sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
                message: {
                    message_id: 'om_post', chat_id: 'oc_1', chat_type: 'p2p', message_type: 'post',
                    content: JSON.stringify({ zh_cn: { title: '', content: [[
                                    { tag: 'img', image_key: 'img_1' },
                                    { tag: 'text', text: '[E2E-IMAGE] inspect this image' },
                                    { tag: 'img', image_key: 'img_1' },
                                ]] } }),
                },
            } });
        expect(message).toMatchObject({
            text: '[图片][E2E-IMAGE] inspect this image[图片]',
            attachments: [{ id: 'img_1', type: 'image', name: 'img_1.jpg' }],
        });
    });
});
describe('Feishu interactive cards', () => {
    it('renders external URL buttons without creating a callback payload', () => {
        const card = feishuTextCard('Done', 'Result', { actions: [{ text: 'Open', url: 'https://work.example/session/1', type: 'primary' }] });
        expect(card).toMatchObject({ elements: [
                { tag: 'markdown' },
                { tag: 'action', actions: [{ tag: 'button', type: 'primary', url: 'https://work.example/session/1' }] },
            ] });
        expect(JSON.stringify(card)).not.toContain('"value"');
    });
    it('round-trips structured selection values through the selected option', () => {
        const card = feishuSelectionCard('Bind', 'Choose', [{ text: 'Workspace', value: { action: 'pick', workspaceId: 'ws-1' } }]);
        expect(JSON.stringify(card)).toContain('ws-1');
        expect(normalizeFeishuAction({
            event_id: 'action-1', operator: { operator_id: { open_id: 'user-1' } }, context: { open_message_id: 'message-1' },
            action: { option: JSON.stringify({ action: 'pick', workspaceId: 'ws-1' }) },
        })).toMatchObject({ actorId: 'user-1', remoteMessageId: 'message-1', value: { action: 'pick', workspaceId: 'ws-1' } });
    });
});
describe('Feishu application administration', () => {
    it('returns the current-app owner first and deduplicates administrators', async () => {
        const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret' });
        const applicationGet = async () => ({ code: 0, data: { app: { creator_id: 'ou_owner' } } });
        const collaboratorsGet = async () => ({ code: 0, data: { collaborators: [
                    { type: 'administrator', user_id: 'ou_admin' },
                    { type: 'administrator', user_id: 'ou_owner' },
                    { type: 'developer', user_id: 'ou_developer' },
                ] } });
        Object.assign(provider, { client: {
                application: { v6: { application: { get: applicationGet }, applicationCollaborators: { get: collaboratorsGet } } },
            } });
        await expect(provider.applicationAdministrators()).resolves.toEqual({
            ownerId: 'ou_owner', administratorIds: ['ou_owner', 'ou_admin'],
        });
    });
    it('rejects an empty or malformed administrator response', async () => {
        const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret' });
        Object.assign(provider, { client: {
                application: { v6: {
                        application: { get: async () => ({ code: 0, data: { app: {} } }) },
                        applicationCollaborators: { get: async () => ({ code: 0, data: { collaborators: [{ type: 'administrator', user_id: 'from-another-namespace' }] } }) },
                    } },
            } });
        await expect(provider.applicationAdministrators()).rejects.toThrow('no valid Open ID');
    });
});
//# sourceMappingURL=index.test.js.map