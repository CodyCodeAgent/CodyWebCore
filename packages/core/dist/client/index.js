import { createConversationState, reduceConversationEvent, reduceConversationEvents, } from '../conversation/index.js';
/**
 * Browser-neutral controller used by both products. Native history is authoritative;
 * realtime events are overlays and every reconnect is reconciled through read().
 */
export function createConversationController(threadId, transport) {
    let state = createConversationState(threadId);
    let readRevision = 0;
    let unsubscribeTransport = null;
    const listeners = new Set();
    const publish = (next) => {
        if (next === state)
            return;
        state = next;
        for (const listener of listeners)
            listener(state);
    };
    const refresh = async () => {
        const revision = ++readRevision;
        publish({ ...state, history: { ...state.history, loading: true, requestRevision: revision } });
        try {
            const events = await transport.read(threadId);
            if (revision !== readRevision)
                return;
            // A read snapshot replaces native-derived state while preserving only
            // connection and pending realtime requests that have not materialized yet.
            const snapshot = reduceConversationEvents(createConversationState(threadId), events);
            publish({
                ...snapshot,
                connection: state.connection,
                pendingRequests: state.pendingRequests,
                history: { ...snapshot.history, loading: false, requestRevision: revision },
            });
        }
        catch (error) {
            if (revision !== readRevision)
                return;
            publish({ ...state, history: { ...state.history, loading: false, requestRevision: revision } });
            throw error;
        }
    };
    const start = async () => {
        if (!unsubscribeTransport) {
            unsubscribeTransport = transport.subscribe(threadId, (value) => {
                if (value.type === 'event') {
                    publish(reduceConversationEvent(state, value.event));
                    return;
                }
                if (value.type === 'connected') {
                    publish(reduceConversationEvent(state, {
                        id: `connection:${threadId}:${Date.now()}:connected`, type: 'runtime.connected', threadId,
                        atIso: new Date().toISOString(), data: {},
                    }));
                    void refresh().catch(() => undefined);
                    return;
                }
                publish(reduceConversationEvent(state, {
                    id: `connection:${threadId}:${Date.now()}:disconnected`, type: 'runtime.disconnected', threadId,
                    atIso: new Date().toISOString(), data: { error: value.error ?? 'Realtime connection disconnected.' },
                }));
            });
        }
        await refresh();
    };
    return {
        getState: () => state,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        start,
        refresh,
        dispose() { readRevision += 1; unsubscribeTransport?.(); unsubscribeTransport = null; listeners.clear(); },
    };
}
/** Small shared WebSocket lifecycle with bounded exponential reconnect. */
export function createReconnectingConversationSocket(options) {
    const createSocket = options.createSocket ?? ((url) => new WebSocket(url));
    const minDelay = Math.max(100, options.minDelayMs ?? 500);
    const maxDelay = Math.max(minDelay, options.maxDelayMs ?? 10_000);
    let socket = null;
    let reconnectTimer = null;
    let delay = minDelay;
    let closed = false;
    const connect = () => {
        if (closed)
            return;
        socket = createSocket(typeof options.url === 'function' ? options.url() : options.url);
        socket.addEventListener('open', () => { delay = minDelay; options.listener({ type: 'connected' }); });
        socket.addEventListener('message', (event) => {
            const parsed = options.parse(event.data);
            if (parsed)
                options.listener(parsed);
        });
        socket.addEventListener('error', () => socket?.close());
        socket.addEventListener('close', () => {
            socket = null;
            if (closed || reconnectTimer)
                return;
            options.listener({ type: 'disconnected' });
            const wait = delay;
            delay = Math.min(maxDelay, Math.round(delay * 1.6));
            reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, wait);
        });
    };
    connect();
    return {
        close() {
            closed = true;
            if (reconnectTimer)
                clearTimeout(reconnectTimer);
            reconnectTimer = null;
            socket?.close();
            socket = null;
        },
    };
}
//# sourceMappingURL=index.js.map