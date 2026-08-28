<template>
  <section class="cody-conversation" :data-variant="variant" data-cody-component="conversation-surface">
    <div v-if="loading" class="cody-conversation-loading" role="status">正在同步对话…</div>
    <div v-else-if="entries.length === 0" class="cody-conversation-empty"><slot name="empty">开始这个需求的开发</slot></div>
    <template v-else v-for="entry in entries" :key="entry.id">
      <div v-if="entry.kind === 'worked'" class="cody-worked-divider"><span>{{ entry.label }}</span></div>
      <article v-else-if="entry.kind === 'message'" class="cody-message" :data-role="entry.message.role">
        <div class="cody-message-identity" :data-role="entry.message.role">{{ entry.message.role === 'user' ? '你' : 'CW' }}</div>
        <div class="cody-message-stack">
          <div class="cody-message-label">{{ entry.message.role === 'user' ? '你' : entry.message.role === 'assistant' ? 'Codex Agent' : '系统' }}</div>
          <ul v-if="entry.message.skills?.length" class="cody-message-skills"><li v-for="skill in entry.message.skills" :key="`${skill.name}:${skill.path}`">${{ skill.displayName || skill.name }}</li></ul>
          <div v-if="entry.message.text" class="cody-message-body"><slot name="markdown" :message="entry.message"><CodyMarkdown :text="entry.message.text" @open-file="emit('openFile', $event)" /></slot></div>
          <div v-if="entry.message.images?.length" class="cody-message-images"><img v-for="image in entry.message.images" :key="image" :src="image" alt="对话图片" loading="lazy"></div>
          <button v-if="entry.message.text" class="cody-copy-button" type="button" @click="emit('copy', entry.message.text)">复制</button>
        </div>
      </article>
      <details v-else-if="entry.kind === 'tool'" class="cody-tool-card" :data-tone="toolTone(entry.tool.status)" :open="toolTone(entry.tool.status) === 'running'">
        <summary><span>⌁</span><strong>{{ entry.tool.title }}</strong><small>{{ entry.tool.status }}</small></summary>
        <p>{{ entry.tool.summary }}</p><ul v-if="entry.tool.details.length"><li v-for="detail in entry.tool.details" :key="detail">{{ detail }}</li></ul>
        <pre v-if="entry.tool.output">{{ previewOutput(entry.tool.output) }}</pre>
      </details>
      <details v-else-if="entry.kind === 'reasoning'" class="cody-reasoning-card"><summary>✦ {{ entry.title || '推理过程' }}</summary><pre>{{ entry.text }}</pre></details>
      <details v-else-if="entry.kind === 'plan'" class="cody-plan-card" open><summary>计划</summary><CodyMarkdown :text="entry.text" @open-file="emit('openFile', $event)" /></details>
      <template v-else-if="entry.kind === 'request'">
        <slot name="request" :request="entry.request">
          <CodyRequestCard :request="entry.request" @resolve-approval="forwardApproval" @resolve-question="forwardQuestion" />
        </slot>
      </template>
      <details v-else-if="entry.kind === 'failure'" class="cody-failure-card"><summary>本次回复失败</summary><p>{{ entry.text }}</p></details>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { CodyConversationEntry } from './types.js'
import CodyMarkdown from './CodyMarkdown.vue'
import CodyRequestCard from './CodyRequestCard.vue'

withDefaults(defineProps<{ entries: CodyConversationEntry[]; loading?: boolean; variant?: 'standalone' | 'embedded' }>(), {
  variant: 'standalone',
})
const emit = defineEmits<{
  copy: [text: string]
  openFile: [{ path: string; line: number }]
  resolveApproval: [requestId: string, decision: 'accept' | 'decline']
  resolveQuestion: [requestId: string, answer: Record<string, { answers: string[] }>]
}>()

function toolTone(status: string): 'neutral' | 'running' | 'success' | 'danger' {
  if (/fail|error|cancel|reject/iu.test(status)) return 'danger'
  if (/complete|success|done|approved/iu.test(status)) return 'success'
  if (/run|start|pending|wait/iu.test(status)) return 'running'
  return 'neutral'
}

function previewOutput(value: string): string { return value.length > 12_000 ? `${value.slice(0, 12_000)}\n…输出已截断` : value }
function forwardApproval(requestId: string, decision: 'accept' | 'decline'): void { emit('resolveApproval', requestId, decision) }
function forwardQuestion(requestId: string, answer: Record<string, { answers: string[] }>): void { emit('resolveQuestion', requestId, answer) }
</script>
