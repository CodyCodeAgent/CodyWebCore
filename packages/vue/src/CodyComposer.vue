<template>
  <form class="cody-composer" :data-variant="variant" data-cody-component="composer-surface" @submit.prevent="emit('send')">
    <div class="cody-composer-shell">
      <div v-if="selectedSkills.length" class="cody-composer-selected" aria-label="Selected skills">
        <span v-for="skill in selectedSkills" :key="skill" class="cody-composer-chip">
          ${{ optionLabel(skills, skill) }}
          <button type="button" :disabled="disabled" :aria-label="`移除 Skill ${optionLabel(skills, skill)}`" @click="removeSkill(skill)">×</button>
        </span>
      </div>
      <textarea :value="draft" rows="1" :disabled="disabled" :placeholder="placeholder" @input="emit('update:draft', ($event.target as HTMLTextAreaElement).value)" @keydown.enter.exact.prevent="emit('send')" />
      <div class="cody-composer-controls">
        <slot name="leading" />
        <label v-if="skills.length" class="cody-composer-compact-control cody-composer-skill-control" title="为本轮显式选择 Skill">
          <span class="cody-composer-icon" aria-hidden="true">✦</span>
          <select :value="''" :disabled="disabled" aria-label="添加 Skill" @change="addSkill(($event.target as HTMLSelectElement).value)">
            <option value="">Skills</option>
            <option v-for="option in unselectedSkills" :key="option.value" :value="option.value">${{ option.label }}</option>
          </select>
        </label>
        <ComposerSelect v-if="collaborationModes.length" label="协作模式" :model-value="selectedCollaborationMode" :options="collaborationModes" :disabled="disabled || isRunning" @update:model-value="emit('update:collaboration-mode', $event)" />
        <ComposerSelect label="提交策略" :model-value="selectedSubmitMode" :options="submitModes" :disabled="disabled" @update:model-value="emit('update:submit-mode', $event)" />
        <ComposerSelect v-if="models.length" label="模型" :model-value="selectedModel" :options="models" :disabled="disabled || isRunning" @update:model-value="emit('update:model', $event)" />
        <ComposerSelect label="推理强度" :model-value="selectedReasoning" :options="reasoningOptions" :disabled="disabled || isRunning" @update:model-value="emit('update:reasoning', $event)" />
        <ComposerSelect label="权限" :model-value="selectedPermission" :options="permissionOptions" :disabled="disabled || isRunning" @update:model-value="emit('update:permission', $event)" />
        <slot name="controls" />
        <div class="cody-composer-actions">
          <button v-if="isRunning" class="cody-composer-stop" type="button" :disabled="disabled" @click="emit('stop')">停止</button>
          <button class="cody-composer-send" type="submit" :disabled="disabled || !draft.trim()" :aria-label="submitLabel">↑</button>
        </div>
      </div>
      <p v-if="selectedPermissionDescription" class="cody-composer-policy">{{ selectedPermissionDescription }}</p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import type { CodyComposerOption } from './types.js'

const ComposerSelect = defineComponent({
  name: 'CodyComposerSelect',
  props: { label: { type: String, required: true }, modelValue: { type: String, required: true }, options: { type: Array as () => CodyComposerOption[], required: true }, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('label', { class: 'cody-composer-compact-control', title: props.label }, [
      h('select', { value: props.modelValue, disabled: props.disabled, 'aria-label': props.label, onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value) }, props.options.map(option => h('option', { value: option.value }, option.label))),
    ])
  },
})

const props = withDefaults(defineProps<{
  draft: string
  disabled?: boolean
  isRunning?: boolean
  placeholder?: string
  collaborationModes?: CodyComposerOption[]
  selectedCollaborationMode?: string
  submitModes?: CodyComposerOption[]
  selectedSubmitMode?: string
  models?: CodyComposerOption[]
  selectedModel?: string
  reasoningOptions?: CodyComposerOption[]
  selectedReasoning?: string
  permissionOptions?: CodyComposerOption[]
  selectedPermission?: string
  skills?: CodyComposerOption[]
  selectedSkills?: string[]
  /** Standalone preserves CodyWeb's dark canvas; embedded inherits the host workbench surface. */
  variant?: 'standalone' | 'embedded'
}>(), {
  placeholder: '输入消息…', collaborationModes: () => [], selectedCollaborationMode: '', submitModes: () => [], selectedSubmitMode: '', models: () => [], selectedModel: '', reasoningOptions: () => [], selectedReasoning: '', permissionOptions: () => [], selectedPermission: '', skills: () => [], selectedSkills: () => [], variant: 'standalone',
})
const emit = defineEmits<{
  'update:draft': [value: string]
  'update:collaboration-mode': [value: string]
  'update:submit-mode': [value: string]
  'update:model': [value: string]
  'update:reasoning': [value: string]
  'update:permission': [value: string]
  'update:selected-skills': [value: string[]]
  send: []
  stop: []
}>()
const unselectedSkills = computed(() => props.skills.filter(option => !props.selectedSkills.includes(option.value)))
const selectedPermissionDescription = computed(() => props.permissionOptions.find(option => option.value === props.selectedPermission)?.description ?? '')
const submitLabel = computed(() => props.isRunning && props.selectedSubmitMode === 'guide' ? '发送引导' : props.isRunning ? '加入队列' : '发送')
function optionLabel(options: CodyComposerOption[], value: string): string { return options.find(option => option.value === value)?.label ?? value }
function addSkill(value: string): void { if (value && !props.selectedSkills.includes(value)) emit('update:selected-skills', [...props.selectedSkills, value]) }
function removeSkill(value: string): void { emit('update:selected-skills', props.selectedSkills.filter(skill => skill !== value)) }
</script>
