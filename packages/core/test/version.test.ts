import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CODY_WEB_CORE_VERSION } from '../src/runtime/index.js'

describe('published version contract', () => {
  it('keeps the runtime diagnostic version synchronized with the package', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(CODY_WEB_CORE_VERSION).toBe(manifest.version)
  })
})
