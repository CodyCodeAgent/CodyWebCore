# CodyWebCore

Framework-neutral Codex App Server primitives shared by CodyWebUI and CodyWork.

`@codycodeagent/cody-web-core/protocol` owns wire normalization and capabilities.
`@codycodeagent/cody-web-core/runtime` owns a resilient service-level App Server host.
`@codycodeagent/cody-web-core/session` owns typed thread/turn coordination, notification normalization, retry semantics, and approval routing.
`@codycodeagent/cody-web-core/conversation` owns deterministic realtime/history merge rules.
`@codycodeagent/cody-web-core/client` owns reconnect reconciliation and latest-wins native history reads.

`@codycodeagent/cody-web-core/vue` provides the shared Vue conversation surface and composer. It deliberately accepts product-owned data and callbacks: CodyWork keeps its Demand/Worktree policy while CodyWeb keeps its thread and project capabilities.

## Ownership boundary

- Core owns Codex schema/RPC, process lifecycle, native thread/turn state, retries, normalized events, history/live reconciliation, Markdown and reusable Vue conversation controls.
- Products own routes, persistence outside native Codex history, workspace navigation, policy decisions, audits and third-party integrations.
- A product may narrow an execution policy, but Core never widens readable or writable roots.

## Protocol compatibility

| Core | Codex App Server boundary | Product migration |
| --- | --- | --- |
| 0.5.x | Generated schemas plus capability detection; unknown notifications are retained as `provider.extension` | CodyWebUI and CodyWork use the same runtime, protocol readers and conversation rules |

Schema snapshots live in `packages/core/schema/json`. Changes to generated schemas, normalized events, runtime recovery or Vue interaction contracts require a minor version and changelog entry.
