const transitions = {
    queued: new Set(['start', 'fail', 'cancel']),
    running: new Set(['progress', 'await_approval', 'complete', 'fail', 'cancel']),
    awaiting_approval: new Set(['progress', 'resume', 'fail', 'cancel']),
    completed: new Set(),
    failed: new Set(),
    cancelled: new Set(),
};
export function createTaskSnapshot(input) {
    const nowIso = (input.now ?? new Date()).toISOString();
    return {
        id: input.id ?? globalThis.crypto.randomUUID(),
        kind: input.kind,
        origin: input.origin,
        principal: input.principal,
        idempotencyKey: input.idempotencyKey,
        status: 'queued',
        input: input.input,
        progress: null,
        result: null,
        error: null,
        revision: 0,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
    };
}
export function taskIsTerminal(status) {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
}
export function transitionTask(task, event) {
    if (!transitions[task.status].has(event.type)) {
        throw new Error(`Invalid task transition: ${task.status} -> ${event.type}`);
    }
    const atIso = (event.at ?? new Date()).toISOString();
    const next = { ...task, revision: task.revision + 1, updatedAtIso: atIso };
    switch (event.type) {
        case 'start':
            return { ...next, status: 'running', startedAtIso: task.startedAtIso ?? atIso };
        case 'progress':
            return { ...next, progress: event.progress };
        case 'await_approval':
            return { ...next, status: 'awaiting_approval', progress: event.progress ?? task.progress };
        case 'resume':
            return { ...next, status: 'running' };
        case 'complete':
            return { ...next, status: 'completed', result: event.result, error: null, completedAtIso: atIso };
        case 'fail':
            return { ...next, status: 'failed', error: event.error, completedAtIso: atIso };
        case 'cancel':
            return { ...next, status: 'cancelled', error: event.error ?? null, completedAtIso: atIso };
    }
}
/** In-process task notifications. Durable state and recovery remain product-owned. */
export class TaskEventBus {
    listeners = new Map();
    subscribe(taskId, listener) {
        const listeners = this.listeners.get(taskId) ?? new Set();
        listeners.add(listener);
        this.listeners.set(taskId, listeners);
        return () => {
            listeners.delete(listener);
            if (listeners.size === 0)
                this.listeners.delete(taskId);
        };
    }
    publish(task) {
        for (const listener of this.listeners.get(task.id) ?? [])
            listener(task);
    }
    waitFor(taskId, current, predicate, timeoutMs) {
        const boundedTimeoutMs = Math.max(0, timeoutMs);
        return new Promise((resolve, reject) => {
            let settled = false;
            let unsubscribe = () => { };
            const finish = (task) => {
                if (settled || !predicate(task))
                    return;
                settled = true;
                clearTimeout(timer);
                unsubscribe();
                resolve(task);
            };
            const timer = setTimeout(async () => {
                if (settled)
                    return;
                try {
                    settled = true;
                    unsubscribe();
                    resolve(await current());
                }
                catch (error) {
                    reject(error);
                }
            }, boundedTimeoutMs);
            unsubscribe = this.subscribe(taskId, finish);
            void Promise.resolve(current()).then(finish, (error) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                unsubscribe();
                reject(error);
            });
        });
    }
}
//# sourceMappingURL=index.js.map