# CodyWebCore

Framework-neutral Codex App Server primitives shared by CodyWebUI and CodyWork.

`@codycodeagent/cody-web-core/protocol` owns wire normalization and capabilities.
`@codycodeagent/cody-web-core/runtime` owns a resilient service-level App Server host.
`@codycodeagent/cody-web-core/session` owns typed thread/turn coordination, notification normalization, retry semantics, and approval routing.
`@codycodeagent/cody-web-core/conversation` owns deterministic realtime/history merge rules.
`@codycodeagent/cody-web-core/composer` owns canonical queue/steer intent, turn attachments, trigger parsing and selection reconciliation.
`@codycodeagent/cody-web-core/client` owns reconnect reconciliation and latest-wins native history reads.

`@codycodeagent/cody-web-core/vue` provides the shared Vue conversation surface and composer. It deliberately accepts product-owned data and callbacks: CodyWork keeps its Demand/Worktree policy while CodyWeb keeps its thread and project capabilities.

## Ownership boundary

- Core owns Codex schema/RPC, process lifecycle, native thread/turn state, retries, normalized events, history/live reconciliation, Markdown and reusable Vue conversation controls.
- Products own routes, persistence outside native Codex history, workspace navigation, policy decisions, audits and third-party integrations.
- A product may narrow an execution policy, but Core never widens readable or writable roots.

## Protocol compatibility

| Core | Codex App Server boundary | Product migration |
| --- | --- | --- |
| 0.22.4 | Current generated schema; one terminal/retry authority, terminal item/usage recovery and shared Vue conversation/composer | CodyWeb and CodyWork must upgrade together and delete local Turn/message reconciliation |
| 0.15–0.22.2 | Progressive shared activity, plans, token usage, history/live feed, overlays and native terminal outcomes | Superseded by 0.22.4 because older releases may classify reconnect diagnostics as terminal |
| ≤ 0.14 | Runtime/protocol foundation without the complete shared conversation authority | Superseded; do not use for either product |

Schema snapshots live in `packages/core/schema/json`. Changes to generated schemas, normalized events, runtime recovery or Vue interaction contracts require a minor version and changelog entry.

The complete dependency, authority and product-adapter contract is documented in [ARCHITECTURE.md](./ARCHITECTURE.md). `pnpm check:boundaries` enforces the internal import direction.

Run `pnpm generate:protocol` with the target `codex` binary on `PATH` to atomically regenerate both TypeScript and JSON snapshots. The command records the generator version in `packages/core/schema/CODEX_VERSION`.

Named permission profiles supplied through `thread/start.config` are thread-start configuration. Codex reloads later `turn/start.permissions` selections from its process-level catalog, so products should either register reusable process-level profiles or keep a thread on its start profile. CodyWork uses the latter and applies the built-in read-only policy only for temporary Plan/read-only turns.

## Runtime failure diagnostics API

`AppServerHost.failureReport()` returns the most recent `AppServerFailureDiagnostic`, or `null` before a failure. Reports are deeply frozen, bounded and JSON-serializable, so a product can safely render or persist one without copying native request payloads:

```ts
import { createAppServerHost } from '@codycodeagent/cody-web-core/runtime'

const host = createAppServerHost({ rpcTimeoutMs: 20_000 })

try {
  await host.ensureInitialized()
  await host.call('thread/read', { threadId: 'thread-1', includeTurns: true })
} catch (error) {
  const report = host.failureReport()
  if (report) {
    showRuntimeFailure({
      phase: report.phase,
      cause: report.cause,
      method: report.failedMethod,
      hints: report.hints,
      details: JSON.stringify(report),
    })
  }
  throw error
}
```

The failure causes are `initialize_timeout`, `rpc_timeout`, `process_exit`, `stdin_error` and `malformed_json`; phases distinguish initialization, ordinary RPC, process, transport and protocol failures. A report contains process lifecycle state, pending client/server request summaries with timings, notification/failure counters, redacted recent logs, and conservative hints. Pending summaries include IDs and method names only—never parameters. Reports never include configured environment values, initialization parameters, request/response payloads or raw malformed stdout.

Logs are capped at 80 entries and 500 normalized characters per entry. Common authorization, bearer-token, API-key, token, secret, password, URL-userinfo and private-key forms are replaced with `[REDACTED]`. Products must still treat reports as operational data and apply their normal access and retention policy; heuristic redaction is not a substitute for avoiding secrets in process logs.

The pre-existing `diagnostics()` method remains the lightweight current-state/counter view. Use `failureReport()` when presenting or exporting the last classified failure snapshot. A later process failure replaces the previous report, except that an immediately following exit does not hide the stdin failure that caused it.

## Turn liveness contract

`CodexSessionManager` treats `turnInactivityTimeoutMs` as a silence watchdog, not a maximum turn duration. Every normalized non-terminal event for the active turn resets the watchdog, so long-running commands, tool calls and reasoning streams can continue for as long as they keep making observable progress. The default inactivity window is ten minutes.

If the provider produces no event for the full window, Core emits one authoritative `turn.failed` event with `data.cause === 'inactivity_timeout'`, clears the active turn and resolves all turn waiters with that same event. A later provider `turn/completed` or `turn.failed` notification for the same turn is ignored. Product code should consume the normalized terminal event and must not add a second wall-clock turn timeout.
