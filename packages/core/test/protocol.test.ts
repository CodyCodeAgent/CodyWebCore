import { describe, expect, it } from 'vitest'
import { createRootPermissionProfileOverrides, readNestedString, readString } from '../src/protocol/index.js'

describe('protocol value readers', () => {
  it('preserves whitespace in content and deltas', () => {
    expect(readString(' next token')).toBe(' next token')
  })

  it('normalizes identifiers read through protocol paths', () => {
    expect(readNestedString({ threadId: '  thread-1  ' }, [['threadId']])).toBe('thread-1')
  })

  it('builds exact per-thread permission profile config with deny precedence', () => {
    expect(createRootPermissionProfileOverrides({
      id: 'codywork-write',
      readableRoots: ['/workspace'],
      writableRoots: ['/workspace/worktrees/feature'],
      deniedRoots: ['/workspace/worktrees/feature/service'],
    })).toEqual({
      permissions: 'codywork-write',
      config: {
        permissions: {
          'codywork-write': {
            description: 'Runtime-owned codywork-write policy',
            filesystem: {
              ':minimal': 'read',
              '/workspace': 'read',
              '/workspace/worktrees/feature': 'write',
              '/workspace/worktrees/feature/service': 'deny',
            },
            network: { enabled: false },
          },
        },
      },
    })
  })
})
