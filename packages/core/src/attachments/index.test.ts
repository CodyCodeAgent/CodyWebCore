import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { LocalAttachmentStorage, decodeAttachmentDataUrl } from './index.js'
import { materializeAttachmentText, parseAttachmentText, attachmentDownloadUrl } from '../composer/index.js'

describe('shared attachments', () => {
  it('accepts arbitrary formats and empty files with safe unique storage names', async () => {
    const root = mkdtempSync(join(tmpdir(), 'core-files-'))
    try {
      const storage = new LocalAttachmentStorage(root, 8)
      const a = storage.put({ name: '../../test.exe', bytes: Buffer.from([0, 1, 255]) })
      const b = storage.put({ name: '../../test.exe', bytes: Buffer.alloc(0) })
      expect(a.name).toBe('test.exe'); expect(a.path).not.toBe(b.path)
      expect(readFileSync(a.path)).toEqual(Buffer.from([0, 1, 255]))
      expect(() => storage.put({ name: 'large.pdf', bytes: Buffer.alloc(9) })).toThrow()
      await expect(storage.putStream({ name: 'large.pdf', stream: Readable.from([Buffer.alloc(9)]) })).rejects.toThrow()
      expect(readdirSync(root).some(name => name.endsWith('.part'))).toBe(false)
      const c = await storage.putStream({ name: 'report.pdf', stream: Readable.from([Buffer.from('pdf')]) })
      expect(readFileSync(c.path, 'utf8')).toBe('pdf')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('strictly decodes base64 without format allowlists', () => {
    expect(decodeAttachmentDataUrl('data:;base64,').bytes.length).toBe(0)
    expect(decodeAttachmentDataUrl('data:application/pdf;base64,AAH/').bytes).toEqual(Buffer.from([0,1,255]))
    expect(() => decodeAttachmentDataUrl('data:text/plain;base64,a')).toThrow()
  })
  it('roundtrips native manifests and refuses executable download URLs', () => {
    const file = { id: 'file_1', name: 'report.pdf', mimeType: 'application/pdf', path: '/tmp/report.pdf', url: '/api/files/1', size: 3 }
    expect(parseAttachmentText(materializeAttachmentText('read it', [file]))).toEqual({ text: 'read it', attachments: [file] })
    expect(parseAttachmentText(materializeAttachmentText('', [file]).trim())).toEqual({ text: '', attachments: [file] })
    expect(parseAttachmentText('ordinary text').attachments).toEqual([])
    expect(attachmentDownloadUrl('javascript:alert(1)')).toBeUndefined()
    expect(attachmentDownloadUrl('//evil.example')).toBeUndefined()
    expect(attachmentDownloadUrl('/api/files/1')).toBe('/api/files/1')
  })
})
