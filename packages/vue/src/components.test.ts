// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CodyComposer from './CodyComposer.vue'
import CodyConversation from './CodyConversation.vue'
import { conversationEntriesFromState } from './types.js'
import { createConversationState, reduceConversationEvents } from '@codycodeagent/cody-web-core/conversation'

describe('shared conversation components', () => {
  it('emits every run-mode selection from the shared composer', async () => {
    const wrapper = mount(CodyComposer, {
      props: {
        draft: '继续',
        collaborationModes: [{ value: 'default', label: 'Default' }, { value: 'plan', label: 'Plan' }],
        selectedCollaborationMode: 'default',
        submitModes: [{ value: 'queue', label: '排队' }, { value: 'guide', label: '引导' }],
        selectedSubmitMode: 'queue',
        models: [{ value: 'gpt-5.6-sol', label: 'gpt-5.6-sol' }],
        selectedModel: 'gpt-5.6-sol',
        reasoningOptions: [{ value: 'medium', label: '中' }, { value: 'high', label: '高' }],
        selectedReasoning: 'medium',
        permissionOptions: [{ value: 'read-only', label: '只读' }, { value: 'workspace-write', label: 'Worktree 写入' }],
        selectedPermission: 'read-only',
      },
    })

    const selects = wrapper.findAll('select')
    await selects[0]!.setValue('plan')
    await selects[1]!.setValue('guide')
    await selects[2]!.setValue('gpt-5.6-sol')
    await selects[3]!.setValue('high')
    await selects[4]!.setValue('workspace-write')

    expect(wrapper.emitted('update:collaboration-mode')?.at(-1)).toEqual(['plan'])
    expect(wrapper.emitted('update:submit-mode')?.at(-1)).toEqual(['guide'])
    expect(wrapper.emitted('update:reasoning')?.at(-1)).toEqual(['high'])
    expect(wrapper.emitted('update:permission')?.at(-1)).toEqual(['workspace-write'])
  })

  it('keeps completed tools collapsed and running tools open', () => {
    const wrapper = mount(CodyConversation, {
      props: {
        entries: [
          { id: 'done', kind: 'tool', tool: { kind: 'command', title: '完成命令', status: 'completed', summary: 'done', details: [] } },
          { id: 'running', kind: 'tool', tool: { kind: 'command', title: '执行命令', status: 'running', summary: 'running', details: [] } },
        ],
      },
    })

    const cards = wrapper.findAll('details.cody-tool-card')
    expect(cards[0]!.attributes('open')).toBeUndefined()
    expect(cards[1]!.attributes('open')).toBe('')
  })

  it('keeps long tool output bounded until the user expands it', async () => {
    const output = Array.from({ length: 90 }, (_, index) => `line-${String(index + 1)}`).join('\n')
    const wrapper = mount(CodyConversation, {
      props: {
        entries: [{
          id: 'long-output',
          kind: 'tool',
          tool: { kind: 'command', title: 'Long command', status: 'completed', summary: 'done', details: [], output },
        }],
      },
    })

    expect(wrapper.find('pre').text()).toContain('line-80')
    expect(wrapper.find('pre').text()).not.toContain('line-81')
    expect(wrapper.find('.cody-tool-output-toggle').text()).toBe('Show full output')

    await wrapper.find('.cody-tool-output-toggle').trigger('click')
    expect(wrapper.find('pre').text()).toContain('line-90')
    expect(wrapper.find('.cody-tool-output-toggle').text()).toBe('Show preview')
  })

  it('renders the native retry message from shared conversation state', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:00.000Z', data: {} },
      { id: 'retry', type: 'turn.retrying', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:01.000Z', data: { message: 'Reconnecting… 2/5' } },
    ])
    const wrapper = mount(CodyConversation, { props: { entries: conversationEntriesFromState(state) } })

    expect(wrapper.find('.cody-conversation-activity').attributes('data-tone')).toBe('retrying')
    expect(wrapper.text()).toContain('Reconnecting… 2/5')
    expect(wrapper.text()).toContain('正在恢复本次回复')
  })

  it('renders an interrupted turn as a neutral receipt instead of a failure', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:00.000Z', data: {} },
      { id: 'stop', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:01.000Z', data: {} },
    ])
    const wrapper = mount(CodyConversation, { props: { entries: conversationEntriesFromState(state) } })

    expect(wrapper.find('.cody-interrupted-card').text()).toBe('本次回复已停止')
    expect(wrapper.find('.cody-failure-card').exists()).toBe(false)
  })

  it('emits approval decisions from the shared request card', async () => {
    const wrapper = mount(CodyConversation, {
      props: {
        entries: [{
          id: 'approval-entry',
          kind: 'request',
          request: {
            id: 'request-42',
            kind: 'approval',
            threadId: 'thread-1',
            method: 'item/commandExecution/requestApproval',
            requestedAtIso: '2026-08-28T00:00:00.000Z',
            params: { command: 'sudo rm -rf /tmp/example', cwd: '/workspace/app' },
          },
        }],
      },
    })

    expect(wrapper.find('.cody-approval-risk-level').text()).toBe('high')
    expect(wrapper.find('.cody-approval-risk-subject').text()).toContain('sudo rm -rf')
    expect(wrapper.text()).toContain('Deletes files')

    const buttons = wrapper.findAll('.cody-request-actions button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('resolveApproval')).toEqual([
      ['request-42', 'accept'],
      ['request-42', 'decline'],
    ])
  })

  it('renders native question choices and emits the structured answer map', async () => {
    const wrapper = mount(CodyConversation, {
      props: {
        entries: [{
          id: 'question-entry', kind: 'request',
          request: {
            id: 'request-7', kind: 'question', threadId: 'thread-1', method: 'item/tool/requestUserInput', requestedAtIso: '2026-08-28T00:00:00.000Z',
            params: { questions: [{ id: 'choice', header: '选择', question: '选哪个？', isOther: false, isSecret: false, options: [{ label: 'Alpha', description: '第一项' }, { label: 'Beta', description: '第二项' }] }] },
          },
        }],
      },
    })

    await wrapper.findAll('.cody-question-options button')[1]!.trigger('click')
    await wrapper.find('.cody-request-actions button').trigger('click')

    expect(wrapper.emitted('resolveQuestion')).toEqual([['request-7', { choice: { answers: ['Beta'] } }]])
  })
})
