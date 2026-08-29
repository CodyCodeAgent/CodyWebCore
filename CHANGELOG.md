# Changelog

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
