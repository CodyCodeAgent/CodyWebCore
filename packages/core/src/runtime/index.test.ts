import { describe, expect, it } from 'vitest'
import { appServerRuntimeProfile, RuntimeRegistry } from './index.js'

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

describe('RuntimeRegistry', () => {
  type Adapter = { id: string; command: string }
  type Config = { command: string }

  function registry() {
    return new RuntimeRegistry<Adapter, Config, { models: boolean }>({
      defaultId: 'codex',
      descriptors: [
        {
          id: 'codex',
          label: 'Codex',
          description: 'Codex App Server',
          capabilities: { models: true },
          create: (config) => ({ id: 'codex', command: config.command }),
        },
        {
          id: 'trae',
          label: 'Trae',
          capabilities: { models: true },
          create: (config) => ({ id: 'trae', command: config.command }),
        },
      ],
    })
  }

  it('lists, validates, and creates adapters without knowing their implementation', () => {
    const runtimes = registry()
    expect(runtimes.defaultId).toBe('codex')
    expect(runtimes.list().map((descriptor) => descriptor.id)).toEqual(['codex', 'trae'])
    expect(runtimes.has('trae')).toBe(true)
    expect(runtimes.has('missing')).toBe(false)
    expect(runtimes.create('trae', { command: 'traecli' })).toEqual({ id: 'trae', command: 'traecli' })
  })

  it('rejects duplicate, malformed, and absent Runtime identifiers', () => {
    expect(() => new RuntimeRegistry({
      defaultId: 'codex',
      descriptors: [
        { id: 'codex', label: 'Codex', create: () => ({}) },
        { id: 'codex', label: 'Duplicate', create: () => ({}) },
      ],
    })).toThrow('already registered')
    expect(() => new RuntimeRegistry({
      defaultId: 'missing',
      descriptors: [{ id: 'codex', label: 'Codex', create: () => ({}) }],
    })).toThrow('Default Runtime is not registered')
    expect(() => new RuntimeRegistry({
      defaultId: 'codex',
      descriptors: [{ id: ' codex', label: 'Codex', create: () => ({}) }],
    })).toThrow('leading or trailing whitespace')
  })

  it('makes unknown Runtime selection an explicit error', () => {
    expect(() => registry().require('missing')).toThrow('Runtime is not registered: missing')
  })
})
