/**
 * Current status observed by app-server without starting or recovering an environment.
 *
 * For a currently ready remote environment, app-server asks the existing
 * exec-server connection for `environment/status` without allowing recovery.
 */
export type EnvironmentStatusKind = "ready" | "pending" | "disconnected" | "unknown";
//# sourceMappingURL=EnvironmentStatusKind.d.ts.map