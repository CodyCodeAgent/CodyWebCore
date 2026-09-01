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
        submitModes: [{ value: 'queue', label: '排队' }, { value: 'steer', label: '引导' }],
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
    await selects[1]!.setValue('steer')
    await selects[2]!.setValue('gpt-5.6-sol')
    await selects[3]!.setValue('high')
    await selects[4]!.setValue('workspace-write')

    expect(wrapper.emitted('update:collaboration-mode')?.at(-1)).toEqual(['plan'])
    expect(wrapper.emitted('update:submit-mode')?.at(-1)).toEqual(['steer'])
    expect(wrapper.emitted('update:reasoning')?.at(-1)).toEqual(['high'])
    expect(wrapper.emitted('update:permission')?.at(-1)).toEqual(['workspace-write'])
  })

  it('allows a skills-only turn and rejects an empty submit', async () => {
    const empty = mount(CodyComposer, { props: { draft: '', skills: [{ value: 'review', label: 'Review' }], selectedSkills: [] } })
    await empty.find('form').trigger('submit')
    expect(empty.emitted('send')).toBeUndefined()

    const withSkill = mount(CodyComposer, { props: { draft: '', skills: [{ value: 'review', label: 'Review' }], selectedSkills: ['review'] } })
    expect((withSkill.find('.cody-composer-send').element as HTMLButtonElement).disabled).toBe(false)
    await withSkill.find('form').trigger('submit')
    expect(withSkill.emitted('send')).toEqual([[]])
  })

  it('selects multiple Skills through inline dollar references instead of a dropdown', async () => {
    const wrapper = mount(CodyComposer, {
      props: {
        draft: '',
        skills: [
          { value: 'review', label: 'Review', description: 'Review the current change' },
          { value: 'testing', label: 'Testing', description: 'Run the relevant checks' },
        ],
        selectedSkills: [],
      },
    })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('请执行 $rev')
    expect(wrapper.find('.cody-composer-skill-control').exists()).toBe(false)
    expect(wrapper.find('.cody-composer-skill-menu').exists()).toBe(true)
    expect(wrapper.findAll('.cody-composer-skill-option')).toHaveLength(1)
    expect(wrapper.find('.cody-composer-skill-option-name').text()).toBe('$Review')

    await wrapper.find('.cody-composer-skill-option').trigger('mousedown')
    expect(wrapper.emitted('update:selected-skills')?.at(-1)).toEqual([['review']])
    expect(wrapper.emitted('update:draft')?.at(-1)).toEqual(['请执行 '])

    await wrapper.setProps({ draft: '再加 $test', selectedSkills: ['review'] })
    await textarea.trigger('click')
    await wrapper.find('.cody-composer-skill-option').trigger('mousedown')
    expect(wrapper.emitted('update:selected-skills')?.at(-1)).toEqual([['review', 'testing']])
  })

  it('supports keyboard navigation in the inline Skill menu', async () => {
    const wrapper = mount(CodyComposer, {
      props: {
        draft: '',
        skills: [
          { value: 'review', label: 'Review' },
          { value: 'testing', label: 'Testing' },
        ],
        selectedSkills: [],
      },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('$')
    await textarea.trigger('keydown', { key: 'ArrowDown' })
    await textarea.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:selected-skills')?.at(-1)).toEqual([['testing']])
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('keeps Enter for newlines and submits with Control or Command Enter', async () => {
    const wrapper = mount(CodyComposer, { props: { draft: '继续' } })
    const textarea = wrapper.find('textarea')

    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    textarea.element.dispatchEvent(enter)
    await wrapper.vm.$nextTick()
    expect(enter.defaultPrevented).toBe(false)
    expect(wrapper.emitted('send')).toBeUndefined()

    const controlEnter = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, cancelable: true })
    textarea.element.dispatchEvent(controlEnter)
    await wrapper.vm.$nextTick()
    expect(controlEnter.defaultPrevented).toBe(true)
    expect(wrapper.emitted('send')).toEqual([[]])

    const commandEnter = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, cancelable: true })
    textarea.element.dispatchEvent(commandEnter)
    await wrapper.vm.$nextTick()
    expect(commandEnter.defaultPrevented).toBe(true)
    expect(wrapper.emitted('send')).toEqual([[], []])
  })

  it('emits stop while a turn is running', async () => {
    const wrapper = mount(CodyComposer, {
      props: { draft: '', isRunning: true, disabled: false },
    })

    await wrapper.find('.cody-composer-stop').trigger('click')

    expect(wrapper.emitted('stop')).toEqual([[]])
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

  it('keeps an interrupted turn out of the transcript', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:00.000Z', data: {} },
      { id: 'user', type: 'user.completed', threadId: 'thread-1', turnId: 'turn-1', itemId: 'user-1', atIso: '2026-08-29T00:00:00.100Z', data: { text: 'Continue' } },
      { id: 'stop', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:01.000Z', data: {} },
    ])
    const wrapper = mount(CodyConversation, { props: { entries: conversationEntriesFromState(state) } })

    expect(wrapper.find('.cody-interrupted-card').exists()).toBe(false)
    expect(wrapper.find('.cody-failure-card').exists()).toBe(false)
  })

  it('offers an explicit retry action for a failed user message', async () => {
    const message = {
      id: 'user:native-user-1', turnId: 'turn-1', role: 'user' as const, text: 'run it',
      messageType: 'userMessage.outbox.failed',
      outbox: { status: 'failed' as const, lastError: 'response stream timed out' },
    }
    const wrapper = mount(CodyConversation, {
      props: { entries: [{ id: message.id, kind: 'message' as const, message }] },
    })

    expect(wrapper.text()).toContain('发送失败：response stream timed out')
    await wrapper.get('.cody-message-retry').trigger('click')
    expect(wrapper.emitted('retryMessage')).toEqual([[message]])
  })

  it('does not render an interrupted receipt for an empty Turn', () => {
    const state = reduceConversationEvents(createConversationState('thread-1'), [
      { id: 'start', type: 'turn.started', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:00.000Z', data: {} },
      { id: 'stop', type: 'turn.interrupted', threadId: 'thread-1', turnId: 'turn-1', atIso: '2026-08-29T00:00:01.000Z', data: {} },
    ])
    const wrapper = mount(CodyConversation, { props: { entries: conversationEntriesFromState(state) } })

    expect(wrapper.find('.cody-interrupted-card').exists()).toBe(false)
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
