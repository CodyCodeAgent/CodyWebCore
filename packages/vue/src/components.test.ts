// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CodyComposer from './CodyComposer.vue'
import CodyConversation from './CodyConversation.vue'

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

  it('emits approval decisions from the shared request card', async () => {
    const wrapper = mount(CodyConversation, {
      props: {
        entries: [{
          id: 'approval-entry',
          kind: 'request',
          request: {
            id: 'request-42',
            kind: 'approval',
            params: { command: 'pnpm test' },
          },
        }],
      },
    })

    const buttons = wrapper.findAll('.cody-request-actions button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('resolveApproval')).toEqual([
      ['request-42', 'accept'],
      ['request-42', 'decline'],
    ])
  })
})
