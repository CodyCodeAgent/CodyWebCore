export type TaskStatus = 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
export type TaskProgress = {
    phase: string;
    message?: string;
    percent?: number;
    details?: unknown;
};
export type TaskSnapshot<TInput = unknown, TProgress = TaskProgress, TResult = unknown> = {
    id: string;
    kind: string;
    origin: string;
    principal: string;
    idempotencyKey: string;
    status: TaskStatus;
    input: TInput;
    progress: TProgress | null;
    result: TResult | null;
    error: string | null;
    revision: number;
    createdAtIso: string;
    updatedAtIso: string;
    startedAtIso?: string;
    completedAtIso?: string;
};
export type CreateTaskInput<TInput> = {
    id?: string;
    kind: string;
    origin: string;
    principal: string;
    idempotencyKey: string;
    input: TInput;
    now?: Date;
};
export type TaskEvent<TProgress = TaskProgress, TResult = unknown> = {
    type: 'start';
    at?: Date;
} | {
    type: 'progress';
    progress: TProgress;
    at?: Date;
} | {
    type: 'await_approval';
    progress?: TProgress;
    at?: Date;
} | {
    type: 'resume';
    at?: Date;
} | {
    type: 'complete';
    result: TResult;
    at?: Date;
} | {
    type: 'fail';
    error: string;
    at?: Date;
} | {
    type: 'cancel';
    error?: string;
    at?: Date;
};
export declare function createTaskSnapshot<TInput>(input: CreateTaskInput<TInput>): TaskSnapshot<TInput>;
export declare function taskIsTerminal(status: TaskStatus): boolean;
export declare function transitionTask<TInput, TProgress, TResult>(task: TaskSnapshot<TInput, TProgress, TResult>, event: TaskEvent<TProgress, TResult>): TaskSnapshot<TInput, TProgress, TResult>;
export type TaskListener<TTask> = (task: TTask) => void;
/** In-process task notifications. Durable state and recovery remain product-owned. */
export declare class TaskEventBus<TTask extends {
    id: string;
}> {
    private readonly listeners;
    subscribe(taskId: string, listener: TaskListener<TTask>): () => void;
    publish(task: TTask): void;
    waitFor(taskId: string, current: () => TTask | Promise<TTask>, predicate: (task: TTask) => boolean, timeoutMs: number): Promise<TTask>;
}
//# sourceMappingURL=index.d.ts.map