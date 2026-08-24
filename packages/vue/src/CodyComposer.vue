<template>
  <form class="cody-composer" data-cody-component="composer-surface" @submit.prevent="emit('send')">
    <div class="cody-composer-shell">
      <textarea :value="draft" rows="1" :disabled="disabled" :placeholder="placeholder" @input="emit('update:draft', ($event.target as HTMLTextAreaElement).value)" @keydown.enter.exact.prevent="emit('send')" />
      <div class="cody-composer-controls"><slot name="leading" /><span v-if="modeLabel" class="cody-composer-pill">{{ modeLabel }}</span><span v-if="modelLabel" class="cody-composer-pill">{{ modelLabel }}</span><span v-if="reasoningLabel" class="cody-composer-pill">{{ reasoningLabel }}</span><span v-if="permissionLabel" class="cody-composer-pill">{{ permissionLabel }}</span><slot name="controls" /><button v-if="isRunning" class="cody-composer-stop" type="button" :disabled="disabled" @click="emit('stop')">停止</button><button v-else class="cody-composer-send" type="submit" :disabled="disabled || !draft.trim()" aria-label="发送">↑</button></div>
    </div>
  </form>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ draft: string; disabled?: boolean; isRunning?: boolean; placeholder?: string; modeLabel?: string; modelLabel?: string; reasoningLabel?: string; permissionLabel?: string }>(), { placeholder: '输入消息…' })
const emit = defineEmits<{ 'update:draft': [value: string]; send: []; stop: [] }>()
</script>
