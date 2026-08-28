export * from './methods.js';
export const READ_RECOVERY_METHODS = new Set(['thread/read', 'thread/loaded/list']);
export function asRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
export function readString(value) {
    return typeof value === 'string' ? value : '';
}
export function readNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function readIsoTimestampMs(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value < 10_000_000_000 ? value * 1000 : value;
    if (typeof value !== 'string' || value.length === 0)
        return null;
    const milliseconds = new Date(value).getTime();
    return Number.isNaN(milliseconds) ? null : milliseconds;
}
export function readIsoTimestampString(value) {
    if (typeof value === 'string')
        return value;
    const milliseconds = readIsoTimestampMs(value);
    return milliseconds === null ? '' : new Date(milliseconds).toISOString();
}
export function toRawPayload(value) {
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
export function readNestedString(value, paths) {
    for (const path of paths) {
        let cursor = value;
        for (const key of path) {
            const record = asRecord(cursor);
            if (!record) {
                cursor = null;
                break;
            }
            cursor = record[key];
        }
        const text = readString(cursor).trim();
        if (text)
            return text;
    }
    return '';
}
export function readThreadId(params) {
    return readNestedString(params, [
        ['threadId'], ['thread_id'], ['thread', 'id'], ['turn', 'threadId'], ['turn', 'thread_id'], ['request', 'threadId'],
    ]);
}
export function readTurnId(params) {
    return readNestedString(params, [
        ['turnId'], ['turn_id'], ['turn', 'id'], ['request', 'turnId'], ['request', 'turn_id'],
    ]);
}
export function readItemId(params) {
    return readNestedString(params, [
        ['itemId'], ['item_id'], ['item', 'id'], ['request', 'itemId'], ['request', 'item_id'],
    ]);
}
export function normalizeRpcResponse(value) {
    const record = asRecord(value);
    if (!record)
        return null;
    const id = typeof record.id === 'number' || typeof record.id === 'string' || record.id === null ? record.id : undefined;
    const method = typeof record.method === 'string' ? record.method : undefined;
    const errorValue = asRecord(record.error);
    const error = errorValue && typeof errorValue.code === 'number' && typeof errorValue.message === 'string'
        ? { code: errorValue.code, message: errorValue.message, ...(errorValue.data === undefined ? {} : { data: errorValue.data }) }
        : undefined;
    if (id === undefined && !method)
        return null;
    return {
        ...(record.jsonrpc === '2.0' ? { jsonrpc: '2.0' } : {}),
        ...(id === undefined ? {} : { id }),
        ...(method ? { method } : {}),
        ...(record.params === undefined ? {} : { params: record.params }),
        ...(record.result === undefined ? {} : { result: record.result }),
        ...(error ? { error } : {}),
    };
}
export function isServerRequest(response) {
    return typeof response.id === 'number' && typeof response.method === 'string';
}
export function isNotification(response) {
    return response.id === undefined && typeof response.method === 'string';
}
export function capabilitySet(methods, protocolVersion = 'unknown') {
    return { protocolVersion, supports: new Set(methods) };
}
export function hasCapability(capabilities, method) {
    return !capabilities || capabilities.supports.size === 0 || capabilities.supports.has(method);
}
//# sourceMappingURL=index.js.map