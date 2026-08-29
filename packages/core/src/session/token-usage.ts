import { asRecord } from '../protocol/index.js'

function readNonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'bigint') {
    const numeric = Number(value)
    return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null
  }
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    const numeric = Number(value)
    return Number.isSafeInteger(numeric) ? numeric : null
  }
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export type CodexTokenUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  contextWindow: number | null
  autoCompactTokenLimit: number | null
}

/** Reads token usage compatibility fields at the protocol boundary. */
export function codexTokenUsageFromPayload(payload: unknown): CodexTokenUsage | null {
  const row = asRecord(payload)
  const turn = asRecord(row?.turn)
  const usage = asRecord(row?.usage) ?? asRecord(row?.tokenUsage) ?? asRecord(row?.token_usage)
    ?? asRecord(turn?.usage) ?? asRecord(turn?.tokenUsage) ?? asRecord(turn?.token_usage)
  if (!usage) return null
  const last = asRecord(usage.last) ?? usage
  const inputTokens = readNonNegativeInteger(last.inputTokens) ?? readNonNegativeInteger(last.input_tokens) ?? 0
  const outputTokens = readNonNegativeInteger(last.outputTokens) ?? readNonNegativeInteger(last.output_tokens) ?? 0
  const totalTokens = readNonNegativeInteger(last.totalTokens) ?? readNonNegativeInteger(last.total_tokens) ?? inputTokens + outputTokens
  if (totalTokens <= 0 && inputTokens <= 0 && outputTokens <= 0) return null
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    contextWindow: readNonNegativeInteger(usage.modelContextWindow) ?? readNonNegativeInteger(usage.model_context_window),
    autoCompactTokenLimit: readNonNegativeInteger(usage.autoCompactTokenLimit) ?? readNonNegativeInteger(usage.auto_compact_token_limit),
  }
}
