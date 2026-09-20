import { describe, expect, it } from 'vitest'
import { appServerRuntimeProfile } from './index.js'

describe('appServerRuntimeProfile', () => {
  it('describes the Codex stdio App Server', () => {
    expect(appServerRuntimeProfile('codex')).toEqual({
      kind: 'codex',
      label: 'Codex',
      command: 'codex',
      args: ['app-server', '--stdio'],
      skillDirectoryName: '.codex',
    })
  })

  it('describes the TraeX stdio App Server with user-input support', () => {
    expect(appServerRuntimeProfile('traex', '/opt/bin/traex')).toEqual({
      kind: 'traex',
      label: 'TraeX',
      command: '/opt/bin/traex',
      args: ['app-server', '--enable', 'default_mode_request_user_input', '--listen', 'stdio://'],
      skillDirectoryName: '.trae',
    })
  })
})
