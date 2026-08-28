import type { ThreadStartParams } from './generated/v2/ThreadStartParams.js';
export type RootPermissionProfile = {
    /** Per-thread profile id. Keep this stable when a thread is resumed. */
    id: string;
    description?: string;
    readableRoots: readonly string[];
    writableRoots?: readonly string[];
    deniedRoots?: readonly string[];
    networkAccess?: boolean;
};
export type RootPermissionProfileOverrides = {
    permissions: string;
    config: NonNullable<ThreadStartParams['config']>;
};
/**
 * Build a per-thread named Codex permission profile without mutating config.toml.
 * The returned values are passed to thread/start.config + thread/start.permissions.
 */
export declare function createRootPermissionProfileOverrides(profile: RootPermissionProfile): RootPermissionProfileOverrides;
//# sourceMappingURL=permission-profile.d.ts.map