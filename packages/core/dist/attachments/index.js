import { createWriteStream } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { basename, join, extname } from 'node:path';
import { DEFAULT_ATTACHMENT_POLICY } from '../composer/index.js';
export function safeAttachmentName(name) {
    return basename(name.replace(/\\/gu, '/')).replace(/[\u0000-\u001f\u007f]/gu, '-').slice(0, 180) || 'attachment';
}
export function decodeAttachmentDataUrl(dataUrl) {
    if (dataUrl.length > Math.ceil(DEFAULT_ATTACHMENT_POLICY.maxBytes * 4 / 3) + 1024)
        throw new Error('附件不能超过 20MB');
    const match = /^data:([^;,]*)(?:;[^;,=]+=[^;,]*)*;base64,([A-Za-z0-9+/]*={0,2})$/u.exec(dataUrl);
    if (!match)
        throw new Error('附件数据无效');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.toString('base64') !== match[2])
        throw new Error('附件数据无效');
    return { bytes, mimeType: match[1] || 'application/octet-stream' };
}
/** Private bytes only. Products own scoped metadata, quotas and authorization. Never executes files. */
export class LocalAttachmentStorage {
    root;
    maxBytes;
    constructor(root, maxBytes = DEFAULT_ATTACHMENT_POLICY.maxBytes) {
        this.root = root;
        this.maxBytes = maxBytes;
        mkdirSync(root, { recursive: true, mode: 0o700 });
    }
    put(input) {
        if (input.bytes.byteLength > this.maxBytes)
            throw new Error(`附件不能超过 ${Math.floor(this.maxBytes / 1024 / 1024)}MB`);
        const name = safeAttachmentName(input.name);
        const id = `file_${randomUUID()}`;
        const extension = extname(name).replace(/[^.a-zA-Z0-9_-]/gu, '').slice(0, 20);
        const path = join(this.root, `${id}${extension}`);
        writeFileSync(path, input.bytes, { flag: 'wx', mode: 0o600 });
        return { id, name, mimeType: input.mimeType || 'application/octet-stream', size: input.bytes.byteLength, path };
    }
    importFile(input) {
        const stat = statSync(input.path);
        if (!stat.isFile() || stat.size > this.maxBytes)
            throw new Error('附件不是普通文件或超过大小限制');
        return this.put({ name: input.name || basename(input.path), mimeType: input.mimeType, bytes: readFileSync(input.path) });
    }
    async putStream(input) {
        const name = safeAttachmentName(input.name);
        const id = `file_${randomUUID()}`;
        const path = join(this.root, `${id}${extname(name).replace(/[^.a-zA-Z0-9_-]/gu, '').slice(0, 20)}`);
        const partial = `${path}.part`;
        let size = 0;
        const limit = this.maxBytes;
        const limiter = new Transform({ transform(chunk, _encoding, callback) {
                size += chunk.length;
                callback(size > limit ? new Error(`附件超过 ${limit} 字节限制`) : null, chunk);
            } });
        try {
            await pipeline(input.stream, limiter, createWriteStream(partial, { flags: 'wx', mode: 0o600 }));
            await rename(partial, path);
            return { id, name, mimeType: input.mimeType || 'application/octet-stream', size, path };
        }
        catch (error) {
            await unlink(partial).catch(() => undefined);
            throw error;
        }
    }
    remove(path) { rmSync(path, { force: true }); }
}
//# sourceMappingURL=index.js.map