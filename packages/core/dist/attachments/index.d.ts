import { type Readable } from 'node:stream';
export type StoredAttachment = {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    path: string;
};
export interface AttachmentStorage {
    put(input: {
        name: string;
        mimeType?: string;
        bytes: Uint8Array;
    }): StoredAttachment;
    importFile(input: {
        path: string;
        name?: string;
        mimeType?: string;
    }): StoredAttachment;
    putStream(input: {
        name: string;
        mimeType?: string;
        stream: Readable;
    }): Promise<StoredAttachment>;
    remove(path: string): void;
}
export declare function safeAttachmentName(name: string): string;
export declare function decodeAttachmentDataUrl(dataUrl: string): {
    bytes: Buffer;
    mimeType: string;
};
/** Private bytes only. Products own scoped metadata, quotas and authorization. Never executes files. */
export declare class LocalAttachmentStorage implements AttachmentStorage {
    private readonly root;
    private readonly maxBytes;
    constructor(root: string, maxBytes?: number);
    put(input: {
        name: string;
        mimeType?: string;
        bytes: Uint8Array;
    }): StoredAttachment;
    importFile(input: {
        path: string;
        name?: string;
        mimeType?: string;
    }): StoredAttachment;
    putStream(input: {
        name: string;
        mimeType?: string;
        stream: Readable;
    }): Promise<StoredAttachment>;
    remove(path: string): void;
}
//# sourceMappingURL=index.d.ts.map