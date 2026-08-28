import { describe, expect, it } from 'vitest'
import { readNestedString, readString } from '../src/protocol/index.js'

describe('protocol value readers', () => {
  it('preserves whitespace in content and deltas', () => {
    expect(readString(' next token')).toBe(' next token')
  })

  it('normalizes identifiers read through protocol paths', () => {
    expect(readNestedString({ threadId: '  thread-1  ' }, [['threadId']])).toBe('thread-1')
  })
})
