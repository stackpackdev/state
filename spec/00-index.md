# state-agent Spec Index

All design documents, implementation plans, and brainstorms in one place.

| # | Document | Status | Summary |
|---|----------|--------|---------|
| 01 | [Runtime Perf & Ergonomics](./01-runtime-perf-ergonomics.md) | Partially done | 10 improvements: structuredClone, memoize when/gate, ring buffer, defineStore, default actor, computed, etc. |
| 02 | [Agent-First Evolution](./02-agent-first-evolution.md) | Done (12/14 features) | 14 major features: modes, selectors, transitions, optimistic, effects, introspection, ECS, pub/sub, persistence, undo, properties, migrations |
| 03 | [Gaps & Completions](./03-gaps-and-completions.md) | Partially done | V2 gap analysis: useSelect, introspection completeness, benchmarks, component contracts |
| 04 | [Animations & Presence](./04-animations-presence.md) | Done (5/5 phases) | Presence primitive: core tracker, React hooks, component, exports, docs |
| 05 | [Presence Perf Brainstorm](./05-presence-perf-brainstorm.md) | Brainstorm (not started) | 4 perf optimizations: batch API, keyOrder fix, sync memoization, snapshot caching |
| 06 | [Implementation Plan V3](./IMPLEMENTATION_PLAN_V3.md) | Complete (all 3 waves + 12 insights) | Unified plan: perf foundation, API polish, advanced capabilities |
| 07 | [Refactor Report](./REFACTOR_REPORT.md) | Complete | Real-world refactor of AINDCon conference app: 63% less code, 66% fewer tokens, 34 tests |
| 08 | [Website Spec](./WEBSITE_SPEC.md) | Ready for implementation | StoryBrand SB7 narrative, 10 homepage sections, comparison table, design direction |
