# Changelog

## 0.37.8

- Derive retryable failed user messages from the native Turn after optimistic reconciliation, including after a page refresh.
- Keep transient response-stream recovery distinct from terminal failure and expose one explicit shared retry action only after the Turn has failed.

## 0.37.7

- Preserve response-stream and inactivity failures when the owner interrupts a native Turn for safety, instead of misreporting them as user-initiated `Stopped` receipts.
- Keep failed user commands retryable while leaving explicit user interrupts classified as interrupted.

## 0.37.6

- Ignore late response-stream disconnect notifications after a native Turn already reached its authoritative terminal state.
- Cover duplicate upstream failures, stop/read settlement, explicit-interrupt races, inactivity races and quarantine queue barriers.

## 0.37.5

- Keep empty maintenance Turns in diagnostic state without rendering `Worked`, `Stopped`, or failure rows in the user conversation.
- Restrict the live overlay to the active Turn so a historical terminal failure cannot render a second time as `Thinking`.
- Cover orphaned completed, failed, and interrupted Turn projection with deterministic tests.

## 0.37.4

- Re-applied the current process-owner attachment snapshot after every native history refresh so queued and active commands remain visible across browser tabs and reconnects.
- Reconciled exhausted or inactive Turns against native `thread/read` after one deduplicated interrupt request; an unconfirmed stop quarantines the session instead of starting an overlapping Turn.
- Kept upstream-failed user commands retryable while preserving native terminal authority and first-terminal deduplication.
- Ignored late events from closed WebSocket generations and added deterministic reconnect, dual-source reconciliation, stop-confirmation and quarantine coverage.

## 0.37.3

- Registered owner submissions before broadcasting `command.queued`, closing the attach/realtime race between browser tabs.
- Locked queue replay to owner insertion order and covered active-plus-queued multi-tab attachment with deterministic tests.
- Removed the need for a persistent browser outbox; Core attachment state is the only post-admission authority.

## 0.37.2

- Made the service-side session manager the sole owner of admitted and active commands, and replayed that volatile state when a browser tab attaches or refreshes.
- Kept browser persistence only for the pre-admission HTTP window, including acknowledgement-loss recovery when realtime admission arrives before the HTTP response.
- Settled optimistic user messages from native Turn terminal events even when Codex never emits a durable user item.
- Restricted response-stream recovery state to explicit transport recovery warnings instead of treating every warning as a retry.
- Made duplicate approval and question responses idempotent across multiple browser tabs.

## 0.37.1

- Restored the queue barrier when attaching to a native thread with an active Turn, and preserved it across repeated attaches.
- Scoped command idempotency to the native thread so rebinding a product conversation cannot replay a submission from the old thread.
- Preserved intentionally repeated user prompts across distinct native Turns while retaining same-Turn optimistic reconciliation.
- Made the first terminal Turn transition authoritative so delayed conflicting terminal events cannot create duplicate receipts.
- Made application heartbeats opt-in, added reconnect jitter, and avoided treating background-tab timer throttling as a dead socket.

## 0.37.0

- Made the shared client controller the single owner of optimistic command admission, native history reconciliation, realtime overlays, failed outbox state, and browser transport status.
- Added one shared heartbeat-aware WebSocket lifecycle with bounded reconnect, close-code diagnostics, and no unrelated HTTP health polling.
- Made the App Server host permanently unavailable after its first process exits or its transport fails; only a product service restart can create a new owner process.
- Added process-owner command idempotency so multiple browser tabs can submit the same durable outbox command without starting duplicate native Turns.
- Kept upstream response-stream failure separate from browser WebSocket state and native terminal events, preserving the active Turn queue barrier until Codex reports a real terminal transition.
- Reconciled terminal assistant overlays one-to-one with durable history and made the final shared feed Turn-contiguous, including queued follow-ups and terminal receipts.
- Added Core-owned runtime/session snapshots so products no longer persist or independently advance native Turn lifecycle state.

## 0.36.2

- Added explicit local-command discard support to the shared conversation controller.
- Reconciled a native user item that arrives before the client command receives its native Turn binding, preventing a late acknowledgement from creating a duplicate user row.

## 0.36.1

- Made runtime disconnection authoritative for interactive state: active approvals and questions are cleared without fabricating terminal transcript rows.
- Prevented a native history refresh from resurrecting stale approval controls while the owner transport remains disconnected.

## 0.36.0

- Added a Core-owned client command lifecycle so optimistic outbox entries are accepted immediately and later bound to native Turn ids without product-generated fake Turn ids.
- Separated upstream response-stream exhaustion from native terminal history through `turn.disconnected`, allowing a later native terminal event to remain authoritative.
- Added deterministic command queue, binding, failure, reconnect, and native-history reconciliation coverage.

## 0.35.1

- Deduplicated terminal receipts by native Turn identity so durable history and realtime overlays cannot render duplicate completion markers.
- Kept empty `started → interrupted` Turns in diagnostic state while omitting their orphaned `Stopped` receipts from the visible conversation.

## 0.35.0

- Made the App Server process single-start for the lifetime of its owning service: RPC timeouts, initialization failures, EPIPE, and unexpected exits never trigger an automatic restart.
- Removed implicit App Server startup from ordinary RPC calls; only explicit host initialization may perform the single process launch.
- Added runtime lifecycle, launch count, and unavailable-reason diagnostics so products can require an explicit service restart or redeployment after process failure.

## 0.34.0

- Added a canonical Turn-bucket conversation feed so realtime replies, terminal receipts, and optimistic future prompts retain causal order across multiple queued Turns.
- Added deterministic pending-to-accepted Turn promotion for optimistic user messages without relying on renderer-specific array concatenation.

## 0.33.9

- Added a schema-bound, exactly-once recovery path for a `turn/start` request whose App Server explicitly reports `thread not found`: resume the durable native thread once, then retry only that request. Transport and timeout errors are never retried.

## 0.33.6

- Added a product-neutral raw-turn recovery monitor so gateway-dispatched turns receive the same bounded upstream retry and inactivity handling as managed sessions.
- Prevented a synthetic terminal recovery failure from being followed by its stale retry notification.

## 0.33.5

- Treat a reported bounded reconnect count as terminal even when a legacy App Server also reports `willRetry: true`.
- Bound retryable response-stream errors that omit retry metadata, while leaving generic warning notifications outside the retry budget.

## 0.33.4

- Reconciled terminal assistant overlays with durable history one-to-one by native identity, then turn/text occurrence, without collapsing replies across turns.
- Made upstream Codex response-stream recovery terminal when retries are explicitly declined, exhausted, or legacy retry errors exceed a bounded limit; preserve the user message for explicit retry.
- Unified the shared Vue composer’s multi-skill `$` references, collaboration-mode normalization, responsive control layout, and Control/Command Enter submission behavior.

## 0.33.3

- Preserve canonical assistant item identities across realtime overlays and durable thread history.
- Reconcile terminal assistant overlays without collapsing identical replies from different turns.

## 0.33.2

- Keep Enter available for multiline composer input and submit only with Control/Command Enter in the shared Vue composer.

## 0.33.1

- Clear unresolved approval/question snapshots when their turn completes, fails, or is interrupted so stale request cards cannot survive a terminal turn.

## 0.33.0

- Added stable pending approval/question event snapshots so product views can restore unresolved server-request cards after reconnecting.

## 0.32.1

- Stopped treating an absolute shell launcher such as `/bin/zsh` as an outside-workspace command operand while preserving detection for actual outside paths in the wrapped command.

## 0.32.0

- Added runtime contract validation for stable Thread summaries and Thread/Turn command result identifiers.
- Replaced opaque property-access failures with method-and-field-specific protocol errors.

## 0.31.0

- Restart a hung App Server after initialization timeout, while preserving the existing guard that forbids recovery with pending server requests.
- Added deterministic fault injection proving a second initialization uses a fresh process.

## 0.30.0

- Synchronized the exported runtime diagnostic version with the package version.
- Added a release-contract test that fails whenever package and runtime versions drift.

## 0.29.0

- Added complete typed Goal read/write authority, including paused, blocked, limited and complete states.
- Replaced the narrow objective/status helper with a generated-schema-aligned structured Goal update contract.

## 0.28.0

- Completed stable Thread summaries with session-tree, active-state and ephemeral metadata needed by products.
- Completed the Skill view model with normalized branding, icons, default prompts and tool dependencies so UI code never needs generated Skill records.

## 0.27.0

- Added a stable Thread snapshot that owns durable Turn status, errors, assistant output, timestamps and normalized events without exposing generated records to products.
- Added the shared Skill catalog, normalization, deduplication and enablement client.
- Added Thread archival to the schema-bound command surface so products no longer assemble remaining lifecycle RPCs.

## 0.26.0

- Added one schema-bound Thread/Turn command client for start, resume, rename, fork, compact, turn start, steer and interrupt.
- Rewired the stateful session manager through the same command client so browser and server products cannot drift on lifecycle payloads.
- Added exact payload and malformed-success contract tests for the shared command surface.

## 0.25.0

- Added a typed session catalog for paginated Thread discovery, durable history, models, collaboration modes, Thread settings and goals.
- Made current generated App Server schema fields authoritative for collaboration-mode and model normalization.
- Added generated-schema methods for Thread settings and goal updates so products no longer hand-build those RPC payloads.

## 0.24.0

- Split message reconciliation, history-window rules, Turn input building, token usage and App Server normalization into focused internal modules while preserving public entrypoints.
- Removed the session manager's duplicate approval-method catalog and made the protocol classifier authoritative for current and legacy approval requests.
- Kept the state reducer and session coordinator focused on state transitions and ownership instead of payload parsing.

## 0.23.2

- Exported one Core runtime version constant and used it in App Server initialization metadata so product manifests cannot silently drift.

## 0.23.1

- Declared the shared optional command/file policy evidence fields so products consume one server-request DTO without casts or shadow types.

## 0.23.0

- Added the canonical server-request normalizer and immutable thread-scoped pending-request store.
- Centralized approval, question and tool request classification, risk cards, metadata and protocol reply payloads.
- Preserved injected command/file policy evidence while keeping product permission decisions outside Core.

## 0.22.4

- Published the reconnect-authority fix with synchronized distributable artifacts for Git package consumers.

## 0.22.3

- Treat turn-scoped App Server `error` notifications as retry diagnostics until an authoritative terminal Turn notification arrives, including older payloads without `willRetry`.

## 0.22.2

- Added a shared terminal-Turn selector so product adapters do not reimplement completion/failure/interruption classification.

## 0.22.1

- Centralized token-usage compatibility parsing and normalized usage embedded in terminal Turn payloads.

## 0.22.0

- Normalized completed Turn items and exposed one final-assistant selector so product services no longer parse native item payloads.
- Preserved native Turn timestamps and explicit durations instead of measuring transport arrival latency.
- Added reducer-owned optimistic context-compaction state for product controls.

## 0.21.3

- Kept assistant overlays live when a provider omits an explicit turn-start notification; only terminal lifecycle states finalize them.

## 0.21.2

- Finalized assistant overlay rows when their turn ends and removed ended plan overlays while durable history catches up.

## 0.21.1

- Replaced an assistant delta row by native item identity when the completed item arrives, even if final text differs from the streamed prefix.
- Exposed native item ids from the live overlay selector so paged history and realtime views converge on one identity.

## 0.21.0

- Added a shared assistant/plan overlay-message selector for products that merge live state with independently paged durable history.
- Preserved native plan item identity across structured plan snapshot updates.

## 0.20.1

- Scoped plan snapshots to their thread and counted revisions from authoritative replacements rather than transport deltas.

## 0.20.0

- Moved structured-plan revision, lifecycle and stale-state semantics into the shared reducer.
- Added a shared live-overlay selector for activity, reasoning and current-turn failures.

## 0.19.0

- Added a shared multi-thread conversation-state registry for products with one App Server notification subscription.
- Preserved referential identity for untouched threads and added explicit registry pruning and selection helpers.

## 0.18.0

- Added a shared transcript selector so caches and non-Vue surfaces consume the same feed ordering and turn semantics as the shared renderer.
- Kept approvals and live activity in typed state channels instead of flattening transient controls into durable messages.

## 0.17.0

- Added one framework-neutral, protocol-ordered conversation feed selector for messages, tools, plans, requests, turn receipts and live activity.
- Switched the shared Vue renderer to consume the Core feed instead of independently rebuilding ordering and terminal semantics.

## 0.16.1

- Included the generated Vue controller-composable declarations required by Git package consumers.

## 0.16.0

- Added a Vue conversation-controller composable that owns history, realtime, switching and disposal lifecycle.
- Prevented disposed controllers from publishing stale state after a rapid thread switch.
- Kept history-failure degradation and realtime continuity identical across Vue products.

## 0.15.1

- Kept realtime conversations usable when the initial native-history read fails while retaining the error for explicit retry UI.
- Rendered precise reducer-owned turn activity in the shared conversation surface.

## 0.15.0

- Normalized turn activity, token usage and compaction into the shared event vocabulary.
- Added reducer-owned activity and context-usage state so products no longer parse those App Server payloads independently.
- Preserved structured plan explanation and typed steps alongside its rendered text snapshot.

## 0.14.0

- Serialized read-timeout recovery so callers cannot re-enter a dying App Server process.
- Added explicit recovery diagnostics and a deterministic replacement-process regression test.
- Kept automatic restart limited to read-only methods and disabled while client or server requests remain pending.

## 0.13.0

- Promoted protocol-order insertion, outbox/optimistic convergence and replay de-duplication into the shared conversation core.
- Normalized local-image identities and preserved intentionally repeated prompts across completed turn boundaries.
- Added stable message comparison, display compaction and live/persisted assistant reconciliation primitives.
- Exposed the session and client entrypoints consistently from the build package.

## 0.12.0

- Added one rich native-item tool normalizer shared by history and realtime paths.
- Unified command output, file moves/diffs, MCP errors/results, dynamic tools, sub-agents, web search, image, review and context-compaction presentation data.
- Preserved status, duration, exit code and output-label semantics without product-specific protocol parsing.

## 0.11.1

- Included the generated runtime and declaration artifacts required by direct Git package consumers.

## 0.11.0

- Added the canonical raw App Server notification normalizer used by both the shared session manager and product adapters.
- Preserved complete structured-plan snapshots instead of dropping their steps during realtime replacement.
- Unified delta field compatibility, explicit interrupted/failed notifications, unknown provider extensions and native item normalization.
- Cleared transient reasoning overlays when answer/plan output begins or a turn terminates while preserving reasoning in the durable timeline.

## 0.10.0

- Fixed native-history/realtime races by replaying events that arrive while a history read is in flight.
- Prevented initial socket connection from launching a duplicate history read and exposed history read failures in shared state.
- Added framework-neutral history-window and scroll-follow primitives for both product UIs.

## 0.9.1

- Removed the legacy `guide` UI alias from the shared Vue composer; submission mode values are now canonical `queue | steer` end to end.

## 0.9.0

- Added a product-neutral `composer` boundary for canonical queue/steer semantics, submission normalization, Skills, images, context attachments and trigger parsing.
- Centralized model, reasoning and collaboration-mode reconciliation without absorbing either product's permission policy.
- Separated image validation and context materialization from product upload/resource transports.
- Fixed the shared Vue composer so Skills-only turns are valid while empty submits remain blocked.

## 0.8.1

- Removed the last CodyWeb-specific command-policy filename from the framework-neutral approval risk copy.
- Updated App Server initialization metadata to report the current shared runtime version.

## 0.8.0

- Centralized Codex server-request method classification and removed product-specific method predicates.
- Added framework-neutral approval risk summaries for commands, file changes, external tools and manual decisions, including policy evidence and scope mapping.
- Upgraded the shared Vue request card to show risk level, protected subject, risk labels, impact details and a recommendation before the user decides.
- Added contract tests for destructive commands, outside-workspace paths, sensitive writes, policy evidence and shared approval rendering.

## 0.7.0

- Added a framework-neutral `presentation` boundary for tool status, bounded output previews, and consecutive file-change grouping.
- Replaced the shared Vue conversation component's private tool-status and output-preview implementation with the shared presentation rules.
- Added an explicit preview/full-output control so long tool output remains compact without becoming inaccessible.
- Added contract tests that preserve product message types while grouping file changes and keep failure state visible across a group.

## 0.6.7

- Preserved native interrupted turns as `turn.interrupted` instead of misclassifying a user stop as a Runtime failure.
- Added a neutral shared conversation receipt for interrupted turns and cancelled any still-running tool rows.
- Built Core before shared Vue tests so component tests always exercise the current source contract rather than stale generated output.

## 0.6.6

- Added the canonical live-turn activity presentation to the shared Vue conversation surface.
- Rendered provider reconnect progress, pending approvals/questions and connection recovery from shared reducer state instead of product-specific placeholders.

## 0.6.5

- Normalized App Server warning notifications as visible retrying turns instead of silently dropping reconnect progress.
- Preserved native in-progress history without inventing a completed terminal event.

## 0.6.4

- Added the canonical native turn-input builder shared by CodyWeb and CodyWork.
- Enforced protocol-compatible Skill → text → image ordering so explicitly selected Skills cannot stall a turn.

## 0.6.3

- Normalized the title and summary of an already-coalesced multi-file change card.

## 0.6.2

- Coalesced item-level file changes and turn-level diff notifications into one stable per-turn timeline entry.
- Terminalized still-running tools when their turn completes or fails.
- Preserved native turn timestamps and stopped fabricating `<1s` history receipts when duration is unknown.
- Added a shared Vue request card with native multi-question, option, free-form and secret-answer support.
- Exported framework-neutral question normalization and request-summary view models.

## 0.6.1

- Fixed the conversation reducer so terminal-only diagnostic events never become the active turn.
- Preserved a newer active turn when a late terminal event arrives for an older turn.

## 0.6.0

- Added immutable, JSON-serializable runtime failure reports for initialization/RPC timeouts, process exits, stdin failures and malformed stdout.
- Added redacted, bounded logs, safe pending-request timing summaries, process/counter snapshots and conservative remediation hints.
- Added start/deadline/duration tracking for pending client RPCs without exposing request parameters or environment values.
- Replaced process-timing-dependent runtime tests with a deterministic fake App Server covering initialization deduplication and failure modes.
- Replaced the session manager's fixed wall-clock turn timeout with an inactivity watchdog that resets on progress, emits one normalized terminal failure after genuine silence and ignores late duplicate terminal notifications.
- Added a shared Vue approval-card interaction contract test so product adapters cannot render approval controls without wiring their decision callback.

## 0.5.1

- Regenerated TypeScript and JSON protocol snapshots from Codex App Server 0.148.x.
- Removed deleted `readOnlyAccess` and `persistExtendedHistory` fields.
- Added current named permission-profile and runtime workspace-root support.
- Added reproducible protocol generation and a Codex compatibility matrix.

## 0.5.0

- Added generated Codex App Server TypeScript and JSON schemas with typed RPC methods.
- Added the shared resilient App Server host, server-request broker and diagnostics.
- Added native thread/session coordination, queue/steer/interrupt, reconnect resume and strict request routing.
- Added deterministic history/live reconciliation and protocol-ordered conversation presentation.
- Added shared Vue conversation, composer and rich Markdown/Mermaid/image rendering.
- Migrated CodyWebUI bridge/readers and CodyWork runtime/UI to the shared contracts.
