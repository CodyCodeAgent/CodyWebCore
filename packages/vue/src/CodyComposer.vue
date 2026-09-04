<template>
  <form class="cody-composer" :data-variant="variant" data-cody-component="composer-surface" @submit.prevent="send">
    <div class="cody-composer-shell" :data-image-drag-active="isDraggingImages" @dragenter="onDragEnter" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
      <input ref="imageInputRef" class="cody-composer-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple tabindex="-1" aria-hidden="true" @change="onImageInputChange" />
      <ul v-if="images.length" class="cody-composer-images" aria-label="已添加图片">
        <li v-for="image in images" :key="image.id" class="cody-composer-image">
          <img :src="image.url" :alt="image.name || '待发送图片'" />
          <button type="button" :disabled="disabled" :aria-label="`移除图片 ${image.name || '附件'}`" @click="emit('remove-image', image.id)">×</button>
        </li>
      </ul>
      <div v-if="selectedSkills.length" class="cody-composer-selected" aria-label="已引用 Skills">
        <span v-for="skill in selectedSkills" :key="skill" class="cody-composer-chip">
          ${{ optionLabel(skills, skill) }}
          <button type="button" :disabled="disabled" :aria-label="`移除 Skill ${optionLabel(skills, skill)}`" @click="removeSkill(skill)">×</button>
        </span>
      </div>
      <textarea
        ref="draftInputRef"
        :value="draft"
        rows="1"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-expanded="isSkillMenuOpen"
        :aria-controls="isSkillMenuOpen ? skillMenuId : undefined"
        :aria-activedescendant="activeSkillOptionId"
        aria-autocomplete="list"
        @input="onDraftInput"
        @click="onDraftCursorChange"
        @keyup="onDraftCursorChange"
        @blur="onDraftBlur"
        @paste="onPaste"
        @keydown="onDraftKeydown"
      />
      <div v-if="isSkillMenuOpen" :id="skillMenuId" class="cody-composer-skill-menu" role="listbox" aria-label="可引用 Skills">
        <p v-if="filteredSkills.length === 0" class="cody-composer-skill-status">没有匹配的 Skill</p>
        <button
          v-for="(skill, index) in filteredSkills"
          v-else
          :id="skillOptionId(index)"
          :key="skill.value"
          class="cody-composer-skill-option"
          :class="{ active: index === highlightedSkillIndex }"
          type="button"
          role="option"
          :aria-selected="index === highlightedSkillIndex"
          @mouseenter="highlightedSkillIndex = index"
          @mousedown.prevent="selectSkill(skill.value)"
        >
          <span class="cody-composer-skill-option-name">${{ skill.label }}</span>
          <span v-if="skill.description" class="cody-composer-skill-option-description">{{ skill.description }}</span>
        </button>
      </div>
      <div class="cody-composer-controls">
        <div class="cody-composer-settings" aria-label="运行设置">
          <button v-if="imageUploadEnabled" class="cody-composer-image-picker" type="button" :disabled="disabled || isUploadingImages" aria-label="添加图片" title="添加图片（也可粘贴或拖拽）" @click="openImagePicker">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m5 18 5.1-5.1a1.5 1.5 0 0 1 2.1 0l2.1 2.1 1.1-1.1a1.5 1.5 0 0 1 2.1 0L20 16.4" /></svg>
          </button>
          <slot name="leading" />
          <ComposerSelect v-if="collaborationModes.length" label="协作模式" :model-value="selectedCollaborationMode" :options="collaborationModes" :disabled="disabled || isRunning" @update:model-value="emit('update:collaboration-mode', $event)" />
          <ComposerSelect label="提交策略" :model-value="selectedSubmitMode" :options="submitModes" :disabled="disabled" @update:model-value="emit('update:submit-mode', $event)" />
          <ComposerSelect v-if="models.length" label="模型" :model-value="selectedModel" :options="models" :disabled="disabled || isRunning" @update:model-value="emit('update:model', $event)" />
          <ComposerSelect label="推理强度" :model-value="selectedReasoning" :options="reasoningOptions" :disabled="disabled || isRunning" @update:model-value="emit('update:reasoning', $event)" />
          <ComposerSelect label="权限" :model-value="selectedPermission" :options="permissionOptions" :disabled="disabled || isRunning" @update:model-value="emit('update:permission', $event)" />
          <slot name="controls" />
        </div>
        <div class="cody-composer-actions">
          <button v-if="isRunning" class="cody-composer-stop" type="button" :disabled="disabled" aria-label="停止当前回复" title="停止当前回复" @click="emit('stop')">
            <span class="cody-composer-stop-icon" aria-hidden="true" />
          </button>
          <button class="cody-composer-send" type="submit" :disabled="!canSend" :aria-label="submitLabel" :title="submitLabel">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6" /></svg>
          </button>
        </div>
      </div>
      <p v-if="selectedPermissionDescription" class="cody-composer-policy">{{ selectedPermissionDescription }}</p>
      <p v-if="imageError" class="cody-composer-image-error" role="alert">{{ imageError }}</p>
      <p v-else-if="imageUploadEnabled && isUploadingImages" class="cody-composer-image-status" role="status">正在处理图片…</p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, ref, useId, watch } from 'vue'
import { composerHasContent, findComposerTrigger, removeComposerTrigger, type ComposerImage, type ComposerTrigger } from '@codycodeagent/cody-web-core/composer'
import type { CodyComposerOption } from './types.js'

const ComposerSelect = defineComponent({
  name: 'CodyComposerSelect',
  props: { label: { type: String, required: true }, modelValue: { type: String, required: true }, options: { type: Array as () => CodyComposerOption[], required: true }, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('label', { class: 'cody-composer-compact-control', title: props.label, 'data-control': props.label }, [
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
  /** Product-owned uploads are passed back for shared preview, paste, and drag/drop UI. */
  images?: ComposerImage[]
  imageUploadEnabled?: boolean
  isUploadingImages?: boolean
  imageError?: string
  /** Standalone preserves CodyWeb's dark canvas; embedded inherits the host workbench surface. */
  variant?: 'standalone' | 'embedded'
}>(), {
  placeholder: '输入消息…', collaborationModes: () => [], selectedCollaborationMode: '', submitModes: () => [], selectedSubmitMode: '', models: () => [], selectedModel: '', reasoningOptions: () => [], selectedReasoning: '', permissionOptions: () => [], selectedPermission: '', skills: () => [], selectedSkills: () => [], images: () => [], variant: 'standalone',
})
const emit = defineEmits<{
  'update:draft': [value: string]
  'update:collaboration-mode': [value: string]
  'update:submit-mode': [value: string]
  'update:model': [value: string]
  'update:reasoning': [value: string]
  'update:permission': [value: string]
  'update:selected-skills': [value: string[]]
  'attach-images': [files: File[]]
  'remove-image': [imageId: string]
  send: []
  stop: []
}>()
const draftInputRef = ref<HTMLTextAreaElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const latestDraft = ref(props.draft)
const activeSkillTrigger = ref<ComposerTrigger | null>(null)
const highlightedSkillIndex = ref(0)
const dragDepth = ref(0)
const componentId = useId()
const skillMenuId = `${componentId}-skill-menu`
const filteredSkills = computed(() => {
  const trigger = activeSkillTrigger.value
  if (!trigger) return []
  return props.skills
    .filter(option => !props.selectedSkills.includes(option.value))
    .filter(option => {
      if (!trigger.query) return true
      const haystack = `${option.label}\n${option.description ?? ''}`.toLowerCase()
      return haystack.includes(trigger.query)
    })
    .slice(0, 8)
})
const isSkillMenuOpen = computed(() => activeSkillTrigger.value !== null)
const activeSkillOptionId = computed(() => isSkillMenuOpen.value && filteredSkills.value.length
  ? skillOptionId(Math.min(highlightedSkillIndex.value, filteredSkills.value.length - 1))
  : undefined)
const selectedPermissionDescription = computed(() => props.permissionOptions.find(option => option.value === props.selectedPermission)?.description ?? '')
const canSend = computed(() => !props.disabled && !props.isUploadingImages && composerHasContent({ text: props.draft, images: props.images, skills: props.selectedSkills }))
const submitLabel = computed(() => props.isRunning && props.selectedSubmitMode === 'steer' ? '发送引导' : props.isRunning ? '加入队列' : '发送')
const isDraggingImages = computed(() => props.imageUploadEnabled && dragDepth.value > 0)
watch(() => props.draft, value => { latestDraft.value = value })
function optionLabel(options: CodyComposerOption[], value: string): string { return options.find(option => option.value === value)?.label ?? value }
function removeSkill(value: string): void { emit('update:selected-skills', props.selectedSkills.filter(skill => skill !== value)) }
function skillOptionId(index: number): string { return `${componentId}-skill-option-${String(index)}` }
function updateSkillTrigger(text: string, cursor: number): void {
  activeSkillTrigger.value = findComposerTrigger(text, cursor, '$')
  highlightedSkillIndex.value = 0
}
function onDraftInput(event: Event): void {
  const input = event.target as HTMLTextAreaElement
  latestDraft.value = input.value
  emit('update:draft', input.value)
  updateSkillTrigger(input.value, input.selectionStart)
}
function onDraftCursorChange(event: Event): void {
  const input = event.target as HTMLTextAreaElement
  updateSkillTrigger(input.value, input.selectionStart)
}
function onDraftBlur(): void {
  window.setTimeout(() => { activeSkillTrigger.value = null }, 0)
}
function imageFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter(file => file.type.startsWith('image/'))
}
function attachImages(files: FileList | File[]): void {
  if (!props.imageUploadEnabled || props.disabled || props.isUploadingImages) return
  const images = imageFiles(files)
  if (images.length) emit('attach-images', images)
}
function openImagePicker(): void { imageInputRef.value?.click() }
function onImageInputChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files) attachImages(input.files)
  input.value = ''
}
function onPaste(event: ClipboardEvent): void {
  const files = event.clipboardData?.files
  if (!files?.length || imageFiles(files).length === 0) return
  event.preventDefault()
  attachImages(files)
}
function onDragEnter(event: DragEvent): void {
  if (!props.imageUploadEnabled || imageFiles(event.dataTransfer?.files ?? []).length === 0) return
  event.preventDefault()
  dragDepth.value += 1
}
function onDragOver(event: DragEvent): void {
  if (!props.imageUploadEnabled || imageFiles(event.dataTransfer?.files ?? []).length === 0) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}
function onDragLeave(event: DragEvent): void {
  if (!props.imageUploadEnabled || dragDepth.value === 0) return
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}
function onDrop(event: DragEvent): void {
  if (!props.imageUploadEnabled || !event.dataTransfer?.files.length) return
  if (imageFiles(event.dataTransfer.files).length === 0) return
  event.preventDefault()
  dragDepth.value = 0
  attachImages(event.dataTransfer.files)
}
function selectSkill(value: string): void {
  const trigger = activeSkillTrigger.value
  if (!trigger) return
  const input = draftInputRef.value
  const currentDraft = input?.value || latestDraft.value
  const next = removeComposerTrigger(currentDraft, trigger)
  if (!props.selectedSkills.includes(value)) emit('update:selected-skills', [...props.selectedSkills, value])
  emit('update:draft', next.text)
  latestDraft.value = next.text
  activeSkillTrigger.value = null
  void nextTick(() => {
    const nextInput = draftInputRef.value
    nextInput?.focus()
    nextInput?.setSelectionRange(next.cursor, next.cursor)
  })
}
function onDraftKeydown(event: KeyboardEvent): void {
  if (isSkillMenuOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      activeSkillTrigger.value = null
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const count = filteredSkills.value.length
      if (count) highlightedSkillIndex.value = (highlightedSkillIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
      return
    }
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && filteredSkills.value.length) {
      event.preventDefault()
      selectSkill(filteredSkills.value[Math.min(highlightedSkillIndex.value, filteredSkills.value.length - 1)]!.value)
      return
    }
  }
  if (event.key !== 'Enter' || event.isComposing || (!event.ctrlKey && !event.metaKey)) return
  event.preventDefault()
  send()
}
function send(): void { if (canSend.value) emit('send') }
</script>
