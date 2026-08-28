function uniqueAbsoluteRoots(values, label) {
    const roots = [...new Set(values.map(value => value.trim()).filter(Boolean))];
    for (const root of roots) {
        if (!root.startsWith('/'))
            throw new Error(`${label} must contain absolute paths: ${root}`);
    }
    return roots;
}
/**
 * Build a per-thread named Codex permission profile without mutating config.toml.
 * The returned values are passed to thread/start.config + thread/start.permissions.
 */
export function createRootPermissionProfileOverrides(profile) {
    if (!/^[A-Za-z0-9_-]+$/u.test(profile.id))
        throw new Error(`invalid permission profile id: ${profile.id}`);
    const readableRoots = uniqueAbsoluteRoots(profile.readableRoots, 'readableRoots');
    const writableRoots = uniqueAbsoluteRoots(profile.writableRoots ?? [], 'writableRoots');
    const deniedRoots = uniqueAbsoluteRoots(profile.deniedRoots ?? [], 'deniedRoots');
    const filesystem = { ':minimal': 'read' };
    for (const root of readableRoots)
        filesystem[root] = 'read';
    for (const root of writableRoots)
        filesystem[root] = 'write';
    for (const root of deniedRoots)
        filesystem[root] = 'deny';
    return {
        permissions: profile.id,
        config: {
            permissions: {
                [profile.id]: {
                    description: profile.description ?? `Runtime-owned ${profile.id} policy`,
                    filesystem,
                    network: { enabled: profile.networkAccess ?? false },
                },
            },
        },
    };
}
//# sourceMappingURL=permission-profile.js.map