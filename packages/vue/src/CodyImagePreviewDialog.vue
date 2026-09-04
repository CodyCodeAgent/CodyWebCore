<template>
  <div
    v-if="src"
    ref="dialogRef"
    class="cody-image-preview-dialog"
    role="dialog"
    aria-modal="true"
    :aria-label="alt"
    tabindex="-1"
    @click.self="dismiss"
  >
    <button type="button" aria-label="关闭图片预览" @click="dismiss">×</button>
    <img :src="src" :alt="alt" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  src: string
  alt?: string
}>(), { alt: '图片预览' })

const emit = defineEmits<{ dismiss: [] }>()
const dialogRef = ref<HTMLElement | null>(null)

watch(() => props.src, async (src) => {
  if (!src) return
  await nextTick()
  dialogRef.value?.focus()
}, { flush: 'post' })

function dismiss(): void {
  emit('dismiss')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.src) {
    event.preventDefault()
    dismiss()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>
