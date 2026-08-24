export type CodyMessageRole = 'user' | 'assistant' | 'system'

/** A product supplies these choices; the shared component owns interaction and presentation. */
export type CodyComposerOption = {
  value: string
  label: string
  description?: string
}

export type CodyTool = {
  kind: string
  title: string
  status: string
  summary: string
  details: string[]
  output?: string
  outputLabel?: string
}

export type CodyMessage = {
  id: string
  role: CodyMessageRole
  text: string
  messageType?: string
  images?: string[]
  skills?: Array<{ name: string; path: string; displayName?: string }>
  tool?: CodyTool | null
}

export type CodyConversationEntry =
  | { id: string; kind: 'message'; message: CodyMessage }
  | { id: string; kind: 'tool'; tool: CodyTool }
  | { id: string; kind: 'reasoning'; text: string; title?: string }
  | { id: string; kind: 'worked'; label: string }
