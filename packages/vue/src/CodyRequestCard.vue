<template>
  <article class="cody-request-card" :data-kind="request.kind">
    <div class="cody-request-heading">
      <strong>{{ request.kind === 'approval' ? '需要你的确认' : 'Codex 需要补充信息' }}</strong>
      <small>Agent 已暂停等待</small>
    </div>
    <template v-if="request.kind === 'question' && questions.length">
      <fieldset v-for="question in questions" :key="question.id" class="cody-question-field">
        <legend><span v-if="question.header">{{ question.header }}</span>{{ question.question }}</legend>
        <div v-if="question.options.length" class="cody-question-options">
          <button v-for="option in question.options" :key="option.label" type="button" :class="{ selected: answers[question.id] === option.label }" @click="answers[question.id] = option.label">
            <strong>{{ option.label }}</strong><small v-if="option.description">{{ option.description }}</small>
          </button>
        </div>
        <input v-if="question.options.length === 0 || question.isOther" v-model="answers[question.id]" :type="question.isSecret ? 'password' : 'text'" :placeholder="question.options.length ? '其他回答…' : '输入回答…'" @keyup.enter="submitQuestion" />
      </fieldset>
      <div class="cody-request-actions"><button type="button" :disabled="!canSubmit" @click="submitQuestion">提交回答</button></div>
    </template>
    <template v-else>
      <p>{{ summary }}</p>
      <div v-if="request.kind === 'approval'" class="cody-request-actions">
        <button type="button" @click="emit('resolveApproval', request.id, 'accept')">允许一次</button>
        <button type="button" data-tone="danger" @click="emit('resolveApproval', request.id, 'decline')">拒绝</button>
      </div>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { ConversationRequest } from '@codycodeagent/cody-web-core/conversation'
import { questionFieldsFromParams, requestSummary } from './types.js'

const props = defineProps<{ request: ConversationRequest }>()
const emit = defineEmits<{
  resolveApproval: [requestId: string, decision: 'accept' | 'decline']
  resolveQuestion: [requestId: string, answer: Record<string, { answers: string[] }>]
}>()
const answers = reactive<Record<string, string>>({})
const questions = computed(() => questionFieldsFromParams(props.request.params))
const summary = computed(() => requestSummary(props.request.params))
const canSubmit = computed(() => questions.value.length > 0 && questions.value.every(question => Boolean(answers[question.id]?.trim())))

watch(() => props.request.id, () => { for (const key of Object.keys(answers)) delete answers[key] })

function submitQuestion(): void {
  if (!canSubmit.value) return
  emit('resolveQuestion', props.request.id, Object.fromEntries(questions.value.map(question => [question.id, { answers: [answers[question.id]!.trim()] }])))
}
</script>
