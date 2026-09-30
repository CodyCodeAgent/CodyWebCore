import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CODY_WEB_CORE_VERSION } from '../src/runtime/index.js'

describe('published version contract', () => {
  it('keeps the runtime diagnostic version synchronized with the package', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(CODY_WEB_CORE_VERSION).toBe(manifest.version)
  })

  it('keeps every published workspace package on the release version', () => {
    const root = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string }
    const core = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
    const vue = JSON.parse(readFileSync(new URL('../../vue/package.json', import.meta.url), 'utf8')) as { version: string }
    expect([core.version, vue.version]).toEqual([root.version, root.version])
  })
})
