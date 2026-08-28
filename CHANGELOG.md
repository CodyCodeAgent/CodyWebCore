# Changelog

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
