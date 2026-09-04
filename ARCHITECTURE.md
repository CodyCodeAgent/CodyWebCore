# CodyWebCore architecture contract

CodyWebCore is the only layer that interprets Codex App Server conversation semantics for CodyWeb and CodyWork. Products may adapt normalized events to their own navigation, persistence, policy, notifications and integrations, but they must not create a second Turn state machine.

## Dependency direction

```text
protocol ───────────────┐
   │                    │
   ▼                    ▼
runtime ──► session ──► conversation ◄── client
               │             │
               │             ▼
               └──────► presentation

composer (independent product input rules)

protocol/runtime/session/conversation/composer/presentation/client
                              │
                              ▼
                             vue
```

- `protocol` owns generated schema, typed RPC calls, capability checks and tolerant wire readers.
- `runtime` owns the single-start App Server process, JSON-RPC transport, initialization, pending server requests and diagnostics. A timeout or transport failure marks that owner unavailable; it never creates a replacement process.
- `session` is the only raw-notification-to-`CodexEvent` interpretation path. It owns native Thread attachment, Turn coordination, retry authority and approval routing.
- `conversation` owns deterministic reducer state, history/live reconciliation, terminal authority, overlays, timeline entries and feed selection.
- `composer` owns framework-neutral input intent, queue/steer selection, attachments and option reconciliation.
- `presentation` owns framework-neutral risk and timeline view models.
- `client` owns reconnecting subscriptions and latest-wins history reads.
- `channel` owns provider-neutral remote-message identities, durable delivery semantics and projections from authoritative conversation state. Products provide persistence, routing and policy; providers own wire formats.
- `vue` renders the shared conversation and composer surfaces. It receives product-owned callbacks and policy labels rather than product services.

Imports must follow this direction. A lower layer never imports Vue or a product repository. Product code imports public package entrypoints and must not reach into `packages/*/src` or generated schema files.

## Authority rules

| Concern | Authority |
| --- | --- |
| Native durable transcript | `thread/read`, normalized by `session` |
| Streaming assistant/reasoning/plan | normalized realtime events reduced by `conversation` |
| Turn terminal state | only native `turn/completed`, `turn/failed` or `turn/interrupted` |
| Turn-scoped `error`/`warning` and inactivity | operational retry/disconnected state; never fabricated terminal state |
| Browser realtime connection | WebSocket open/close plus application heartbeat; unrelated HTTP health checks never change conversation state |
| Client command admission | Core optimistic outbox plus process-owner idempotency keyed by product binding and client command id |
| Approval decision | injected product policy; Core transports and reconciles the request |
| Workspace roots and write access | product policy adapter; Core can preserve or narrow, never widen |
| Product audit/cost/checkpoints | product adapter consuming normalized events |
| Remote-channel delivery and conversation projection | `channel`, with product persistence and policy ports |
| Feishu wire protocol, browser notifications, catalog and workspace navigation | product/provider adapter |

Products must use `normalizeCodexNotification`, selectors such as `latestTerminalTurnEvent`, and the conversation reducer instead of switching on native Turn/item methods. Direct wire parsing is allowed only at a named adapter boundary for data that Core intentionally does not model, such as an MCP image payload, rate-limit snapshot, catalog Thread DTO, or third-party delivery envelope.

## Release contract

- A release updates the root, core and Vue package versions together.
- Generated `dist` artifacts are committed with the source because both products consume this repository as a Git package.
- Changes to normalized events, reducer semantics, runtime recovery, public Vue props or generated protocol schema require a changelog entry and synchronized product upgrades.
- Every release runs boundary checks, core tests, Vue tests, type checks and production builds.

## Product constraints

CodyWork owns Workspace → Demand → Worktree navigation and is free to redesign its storage and UI without compatibility shims. Its policy adapter must keep each Demand inside its readable/writable roots.

CodyWeb owns catalog, its existing Feishu integration, tasks, audit, checkpoint and workspace tooling. CodyWeb does not migrate to the new channel package until separately approved. Shared channel mechanisms may live in Core while provider wire behavior and product routing remain adapters.
