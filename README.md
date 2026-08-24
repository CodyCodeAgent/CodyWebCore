# CodyWebCore

Framework-neutral Codex App Server primitives shared by CodyWebUI and CodyWork.

`@codycodeagent/cody-web-core/protocol` owns wire normalization and capabilities.
`@codycodeagent/cody-web-core/runtime` owns a resilient service-level App Server host.
`@codycodeagent/cody-web-core/conversation` owns deterministic realtime/history merge rules.

`@codycodeagent/cody-web-core/vue` provides the shared Vue conversation surface and composer. It deliberately accepts product-owned data and callbacks: CodyWork keeps its Demand/Worktree policy while CodyWeb keeps its thread and project capabilities.
