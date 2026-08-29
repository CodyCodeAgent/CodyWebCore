import { createConversationState, reduceConversationEvent, reduceConversationEvents, } from '../conversation/index.js';
/**
 * Browser-neutral controller used by both products. Native history is authoritative;
 * realtime events are overlays and every reconnect is reconciled through read().
 */
export function createConversationController(threadId, transport) {
    let state = createConversationState(threadId);
    let readRevision = 0;
    let unsubscribeTransport = null;
    let started = false;
    let initialReadSettled = false;
    let initialReadPromise = null;
    let connectionRevision = 0;
    let realtimeEventRevision = 0;
    let realtimeJournal = [];
    const listeners = new Set();
    const MAX_REALTIME_JOURNAL_EVENTS = 10_000;
    const publish = (next) => {
        if (next === state)
            return;
        state = next;
        for (const listener of listeners)
            listener(state);
    };
    const refresh = async () => {
        const revision = ++readRevision;
        const realtimeRevisionAtStart = realtimeEventRevision;
        publish({ ...state, history: { ...state.history, loading: true, requestRevision: revision, error: '' } });
        try {
            const events = await transport.read(threadId);
            if (revision !== readRevision)
                return;
            // Native history is authoritative, but events arriving after this read
            // started may not have reached its snapshot yet. Replay only that suffix;
            // older live overlays are intentionally replaced by native history.
            const snapshot = reduceConversationEvents(reduceConversationEvents(createConversationState(threadId), events), realtimeJournal
                .filter((entry) => entry.revision > realtimeRevisionAtStart)
                .map((entry) => entry.event));
            publish({
                ...snapshot,
                connection: state.connection,
                history: {
                    ...snapshot.history,
                    loading: false,
                    requestRevision: revision,
                    error: '',
                    loadedAtIso: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            if (revision !== readRevision)
                return;
            publish({
                ...state,
                history: {
                    ...state.history,
                    loading: false,
                    requestRevision: revision,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            throw error;
        }
    };
    const start = () => {
        if (started && initialReadPromise)
            return initialReadPromise;
        if (started)
            return Promise.resolve();
        started = true;
        if (!unsubscribeTransport) {
            unsubscribeTransport = transport.subscribe(threadId, (value) => {
                if (value.type === 'event') {
                    realtimeEventRevision += 1;
                    realtimeJournal = [
                        ...realtimeJournal,
                        { revision: realtimeEventRevision, event: value.event },
                    ].slice(-MAX_REALTIME_JOURNAL_EVENTS);
                    publish(reduceConversationEvent(state, value.event));
                    return;
                }
                if (value.type === 'connected') {
                    publish(reduceConversationEvent(state, {
                        id: `connection:${threadId}:${String(++connectionRevision)}:connected`, type: 'runtime.connected', threadId,
                        atIso: new Date().toISOString(), data: {},
                    }));
                    if (initialReadSettled)
                        void refresh().catch(() => undefined);
                    return;
                }
                publish(reduceConversationEvent(state, {
                    id: `connection:${threadId}:${String(++connectionRevision)}:disconnected`, type: 'runtime.disconnected', threadId,
                    atIso: new Date().toISOString(), data: { error: value.error ?? 'Realtime connection disconnected.' },
                }));
            });
        }
        // Initial history is enrichment, not a prerequisite for realtime use. The
        // error remains visible in state while the live subscription stays usable.
        // Explicit refresh() calls still reject so retry controls can report failure.
        initialReadPromise = refresh().catch(() => undefined).finally(() => {
            initialReadSettled = true;
            initialReadPromise = null;
        });
        return initialReadPromise;
    };
    return {
        getState: () => state,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        start,
        refresh,
        dispose() {
            readRevision += 1;
            started = false;
            initialReadSettled = false;
            initialReadPromise = null;
            realtimeJournal = [];
            realtimeEventRevision = 0;
            unsubscribeTransport?.();
            unsubscribeTransport = null;
            listeners.clear();
        },
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