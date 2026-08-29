import { describe, expect, it } from 'vitest'
import {
  createRootPermissionProfileOverrides,
  isApprovalRequestMethod,
  readNestedString,
  readString,
} from '../src/protocol/index.js'

describe('protocol value readers', () => {
  it('preserves whitespace in content and deltas', () => {
    expect(readString(' next token')).toBe(' next token')
  })

  it('normalizes identifiers read through protocol paths', () => {
    expect(readNestedString({ threadId: '  thread-1  ' }, [['threadId']])).toBe('thread-1')
  })

  it('classifies current and legacy approval request methods at one protocol boundary', () => {
    expect(isApprovalRequestMethod('item/commandExecution/requestApproval')).toBe(true)
    expect(isApprovalRequestMethod('item/fileChange/requestApproval')).toBe(true)
    expect(isApprovalRequestMethod('item/permissions/requestApproval')).toBe(true)
    expect(isApprovalRequestMethod('applyPatchApproval')).toBe(true)
    expect(isApprovalRequestMethod('execCommandApproval')).toBe(true)
    expect(isApprovalRequestMethod('item/tool/requestUserInput')).toBe(false)
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
