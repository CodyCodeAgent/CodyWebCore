import { describe, expect, it } from 'vitest'
import { applyFeishuChatMode, FEISHU_MESSAGE_TYPES, FeishuProvider, feishuCardMention, feishuMarkdownCard, feishuMarkdownCards, feishuSelectionCard, feishuStreamingCard, feishuTextCard, hydrateFeishuMessagePayload, normalizeFeishuAction, normalizeFeishuMessage } from './index.js'

describe('normalizeFeishuMessage', () => {
  const config = { accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret', botOpenId: 'ou_bot', privateConversationMode: 'topic' as const }

  it('maps a private top-level message to a stable topic envelope', () => {
    const message = normalizeFeishuMessage(config, { event_id: 'event-1', event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
      message: { message_id: 'om_1', chat_id: 'oc_1', chat_type: 'p2p', message_type: 'text', content: JSON.stringify({ text: 'hello' }) },
    } })
    expect(message).toMatchObject({
      provider: 'feishu', eventId: 'event-1', messageId: 'om_1', text: 'hello', addressedToAgent: true,
      content: { type: 'text' },
      conversation: { id: 'oc_1', scope: 'private', rootId: 'om_1' }, sender: { id: 'ou_user', type: 'user' },
    })
  })

  it('uses open_id consistently when the event also contains a union_id', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user', union_id: 'on_user' } },
      message: { message_id: 'om_identity', chat_id: 'oc_identity', chat_type: 'p2p', message_type: 'text', content: JSON.stringify({ text: 'hello' }) },
    } })
    expect(message?.sender.id).toBe('ou_user')
  })

  it('removes the bot mention and preserves image resource identity', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { union_id: 'on_user' } },
      message: { message_id: 'om_2', chat_id: 'oc_2', chat_type: 'group', message_type: 'text', content: JSON.stringify({ text: '@_user_1 inspect' }), mentions: [{ key: '@_user_1', name: 'CodyWork', id: { open_id: 'ou_bot' } }] },
    } })
    expect(message).toMatchObject({
      text: 'inspect', addressedToAgent: true, conversation: { scope: 'group' },
      sender: { id: 'on_user', idType: 'union_id' },
      mentions: [{ id: 'ou_bot', idType: 'open_id', type: 'user', name: 'CodyWork', isAgent: true }],
    })
  })

  it('keeps app mentions structured without treating their display text as routing data', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'app', sender_id: { app_id: 'cli_source' } },
      message: { message_id: 'om_bot', chat_id: 'oc_2', chat_type: 'group', message_type: 'text', content: JSON.stringify({ text: '@_user_1 inspect' }), mentions: [{ key: '@_user_1', name: 'CodyWork', id: { app_id: 'cli_test', open_id: 'ou_bot' } }] },
    } })
    expect(message).toMatchObject({
      sender: { id: 'cli_source', type: 'app', idType: 'app_id' }, addressedToAgent: true,
      mentions: [{ id: 'ou_bot', idType: 'open_id', type: 'app', isAgent: true }],
    })
  })

  it('promotes a topic-group root event to a stable topic binding after chat lookup', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
      message: { message_id: 'om_topic_root', chat_id: 'oc_topic', chat_type: 'group', message_type: 'text', content: JSON.stringify({ text: 'root' }) },
    } })
    expect(message?.conversation).toEqual({ id: 'oc_topic', scope: 'group' })
    expect(applyFeishuChatMode(message!, 'topic').conversation).toEqual({ id: 'oc_topic', scope: 'topic', rootId: 'om_topic_root' })
  })

  it('maps file resources without leaking provider fields into the envelope shape', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
      message: { message_id: 'om_3', chat_id: 'oc_1', chat_type: 'p2p', message_type: 'file', content: JSON.stringify({ file_key: 'file_1', file_name: '../report.txt' }) },
    } })
    expect(message?.attachments).toEqual([{ id: 'file_1', type: 'file', name: '../report.txt' }])
  })

  it.each([
    ['audio', { file_key: 'file_audio' }, { id: 'file_audio', type: 'audio', name: 'file_audio.opus' }],
    ['media', { file_key: 'file_video', file_name: 'clip.mp4' }, { id: 'file_video', type: 'video', name: 'clip.mp4' }],
  ])('normalizes %s resources for download', (messageType, content, attachment) => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
      message: { message_id: `om_${messageType}`, chat_id: 'oc_1', chat_type: 'p2p', message_type: messageType, content: JSON.stringify(content) },
    } })
    expect(message?.attachments).toEqual([attachment])
  })

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
    } })
    expect(message).toMatchObject({
      text: '[图片][E2E-IMAGE] inspect this image[图片]',
      content: { type: 'post' },
      attachments: [{ id: 'img_1', type: 'image', name: 'img_1.jpg' }],
    })
  })

  it('recognizes bot mentions and file resources embedded in rich-text posts', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
      message: {
        message_id: 'om_post_file', chat_id: 'oc_1', chat_type: 'group', message_type: 'post',
        content: JSON.stringify({ zh_cn: { content: [[
          { tag: 'at', user_id: 'ou_bot', user_name: 'CodyBot' },
          { tag: 'text', text: ' inspect ' },
          { tag: 'file', file_key: 'file_1', file_name: 'report.txt' },
        ]] } }),
      },
    } })
    expect(message).toMatchObject({
      addressedToAgent: true, text: 'inspect [文件：report.txt]',
      attachments: [{ id: 'file_1', type: 'file', name: 'report.txt' }],
    })
  })

  it('exposes a stable card title for product routing', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
      message: {
        message_id: 'om_card', chat_id: 'oc_1', chat_type: 'group', message_type: 'interactive',
        content: JSON.stringify({ header: { title: { tag: 'plain_text', content: 'P0 发布告警' } }, elements: [] }),
      },
    } })
    expect(message).toMatchObject({ text: 'P0 发布告警', content: { type: 'interactive', title: 'P0 发布告警' } })
  })

  it('extracts card body text and image resources', () => {
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } },
      message: {
        message_id: 'om_card_body', chat_id: 'oc_1', chat_type: 'group', message_type: 'interactive',
        content: JSON.stringify({ header: { title: { content: '告警' } }, body: { elements: [
          { tag: 'markdown', content: '服务 **不可用**' }, { tag: 'img', img_key: 'img_card' },
        ] } }),
      },
    } })
    expect(message).toMatchObject({
      text: '告警\n服务 **不可用**', content: { title: '告警' },
      attachments: [{ id: 'img_card', type: 'image', name: 'img_card.jpg' }],
    })
  })

  it('preserves card fields, action URLs, and decoded source content for investigation', () => {
    const raw = {
      header: { title: { content: '实时对账平台' } },
      body: { elements: [
        { tag: 'column_set', fields: [
          { label: { content: '任务 ID' }, value: { content: 'T205655' } },
          { label: { content: '校验索引' }, value: { content: '7686727454044245034' } },
        ] },
        { tag: 'button', text: { content: '异常详情' }, behaviors: [{ type: 'open_url', default_url: 'https://example.test/diff?checkIndex=7686727454044245034' }] },
      ] },
    }
    const message = normalizeFeishuMessage(config, { event: {
      sender: { sender_type: 'app', sender_id: { app_id: 'cli_alert' } },
      message: {
        message_id: 'om_reconcile', chat_id: 'oc_alert', chat_type: 'group', message_type: 'interactive', content: JSON.stringify(raw),
      },
    } })
    expect(message).toMatchObject({
      text: expect.stringContaining('https://example.test/diff'),
      content: {
        type: 'interactive', title: '实时对账平台', raw,
        fields: [
          { label: '任务 ID', value: 'T205655' },
          { label: '校验索引', value: '7686727454044245034' },
        ],
        actions: [{ label: '异常详情', url: 'https://example.test/diff?checkIndex=7686727454044245034' }],
      },
    })
  })

  it('hydrates nonsupport events from message detail', () => {
    const payload = { event: { sender: { sender_type: 'user', sender_id: { open_id: 'ou_user' } }, message: {
      message_id: 'om_hydrate', chat_id: 'oc_1', chat_type: 'group', message_type: 'nonsupport', content: '{}',
    } } }
    const hydrated = hydrateFeishuMessagePayload(payload, { data: { items: [{ msg_type: 'post', body: { content: JSON.stringify({ zh_cn: { content: [[{ tag: 'text', text: 'real body' }]] } }) } }] } })
    expect(normalizeFeishuMessage(config, hydrated)).toMatchObject({ content: { type: 'post' }, text: 'real body' })
  })
})

describe('feishuCardMention', () => {
  it('renders only Feishu open IDs as native card mentions', () => {
    expect(feishuCardMention('ou_user-1')).toBe('<at id=ou_user-1></at>')
    expect(feishuCardMention('cli_app')).toBe('')
    expect(feishuCardMention('all')).toBe('')
  })
})

describe('Feishu interactive cards', () => {
  it('renders assistant Markdown without a header', () => {
    expect(feishuMarkdownCard('## Result\n\n- **done**', { note: 'Workspace: demo' })).toEqual({
      config: { wide_screen_mode: true },
      elements: [
        { tag: 'markdown', content: '**Result**\n\n- **done**' },
        { tag: 'note', elements: [{ tag: 'plain_text', content: 'Workspace: demo' }] },
      ],
    })
  })

  it('publishes the message kinds normalized by the adapter', () => {
    expect(FEISHU_MESSAGE_TYPES).toEqual(['text', 'post', 'image', 'file', 'audio', 'media', 'interactive'])
  })

  it('splits long Markdown without dropping content', () => {
    const markdown = `${'a'.repeat(20_000)}\n${'b'.repeat(20_000)}`
    const cards = feishuMarkdownCards(markdown, { note: 'route' })
    expect(cards).toHaveLength(2)
    expect(cards.map(card => (card.elements as Array<{ content?: string }>)[0]?.content).join('')).toBe(markdown.replace('\n', ''))
    expect(JSON.stringify(cards)).toContain('1/2')
    expect(JSON.stringify(cards)).toContain('2/2')
  })

  it('renders external URL buttons without creating a callback payload', () => {
    const card = feishuTextCard('Done', 'Result', { actions: [{ text: 'Open', url: 'https://work.example/session/1', type: 'primary' }] })
    expect(card).toMatchObject({ elements: [
      { tag: 'markdown' },
      { tag: 'action', actions: [{ tag: 'button', type: 'primary', url: 'https://work.example/session/1' }] },
    ] })
    expect(JSON.stringify(card)).not.toContain('"value"')
  })

  it('round-trips structured selection values through the selected option', () => {
    const card = feishuSelectionCard('Bind', 'Choose', [{ text: 'Workspace', value: { action: 'pick', workspaceId: 'ws-1' } }])
    expect(JSON.stringify(card)).toContain('ws-1')
    expect(normalizeFeishuAction({
      event_id: 'action-1', operator: { operator_id: { open_id: 'user-1' } }, context: { open_message_id: 'message-1' },
      action: { option: JSON.stringify({ action: 'pick', workspaceId: 'ws-1' }) },
    })).toMatchObject({ actorId: 'user-1', remoteMessageId: 'message-1', value: { action: 'pick', workspaceId: 'ws-1' } })
  })

  it('renders a patchable card with reasoning summary and partial answer', () => {
    const card = feishuStreamingCard({ state: 'answering', reasoning: 'Checking the route', answer: 'Partial **answer**', note: 'YOLO' })
    expect(card).toMatchObject({
      config: { wide_screen_mode: true, update_multi: true },
      header: { template: 'turquoise' },
    })
    expect(JSON.stringify(card)).toContain('思考摘要')
    expect(JSON.stringify(card)).toContain('Partial **answer**')
  })
})

describe('Feishu application administration', () => {
  it('resolves and caches user-facing user metadata', async () => {
    const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret' })
    let calls = 0
    const get = async () => { calls += 1; return { code: 0, data: { user: { name: '勾超' } } } }
    Object.assign(provider as unknown as { client: unknown }, { client: { contact: { v3: { user: { get } } } } })
    await expect(provider.userMetadata('ou_user')).resolves.toEqual({ id: 'ou_user', name: '勾超' })
    await expect(provider.userMetadata('ou_user')).resolves.toEqual({ id: 'ou_user', name: '勾超' })
    expect(calls).toBe(1)
  })

  it('resolves and caches user-facing chat metadata', async () => {
    const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret' })
    let calls = 0
    const get = async () => { calls += 1; return { code: 0, data: { name: '告警群', chat_mode: 'topic' } } }
    Object.assign(provider as unknown as { client: unknown }, { client: { im: { v1: { chat: { get } } } } })
    await expect(provider.chatMetadata('oc_alert')).resolves.toEqual({ id: 'oc_alert', name: '告警群', mode: 'topic' })
    await expect(provider.chatMetadata('oc_alert')).resolves.toEqual({ id: 'oc_alert', name: '告警群', mode: 'topic' })
    expect(calls).toBe(1)
  })

  it('adds and removes a native message reaction', async () => {
    const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret' })
    const create = async () => ({ code: 0, data: { reaction_id: 'reaction-1' } })
    const remove = async () => ({ code: 0 })
    Object.assign(provider as unknown as { client: unknown }, { client: {
      im: { v1: { messageReaction: { create, delete: remove } } },
    } })
    await expect(provider.addReaction('om_1')).resolves.toBe('reaction-1')
    await expect(provider.removeReaction('om_1', 'reaction-1')).resolves.toBeUndefined()
  })

  it('identifies the current app sender to prevent reply loops', () => {
    const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret', botOpenId: 'ou_bot' })
    expect(provider.isOwnSenderId('cli_test')).toBe(true)
    expect(provider.isOwnSenderId('ou_bot')).toBe(true)
    expect(provider.isOwnSenderId('cli_other')).toBe(false)
  })

  it('returns the current-app owner first and deduplicates administrators', async () => {
    const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret' })
    const applicationGet = async () => ({ code: 0, data: { app: { creator_id: 'ou_owner' } } })
    const collaboratorsGet = async () => ({ code: 0, data: { collaborators: [
      { type: 'administrator', user_id: 'ou_admin' },
      { type: 'administrator', user_id: 'ou_owner' },
      { type: 'developer', user_id: 'ou_developer' },
    ] } })
    Object.assign(provider as unknown as { client: unknown }, { client: {
      application: { v6: { application: { get: applicationGet }, applicationCollaborators: { get: collaboratorsGet } } },
    } })

    await expect(provider.applicationAdministrators()).resolves.toEqual({
      ownerId: 'ou_owner', administratorIds: ['ou_owner', 'ou_admin'],
    })
  })

  it('rejects an empty or malformed administrator response', async () => {
    const provider = new FeishuProvider({ accountId: 'bot-1', appId: 'cli_test', appSecret: 'secret' })
    Object.assign(provider as unknown as { client: unknown }, { client: {
      application: { v6: {
        application: { get: async () => ({ code: 0, data: { app: {} } }) },
        applicationCollaborators: { get: async () => ({ code: 0, data: { collaborators: [{ type: 'administrator', user_id: 'from-another-namespace' }] } }) },
      } },
    } })

    await expect(provider.applicationAdministrators()).rejects.toThrow('no valid Open ID')
  })
})
