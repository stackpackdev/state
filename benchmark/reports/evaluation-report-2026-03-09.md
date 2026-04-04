# State-Agent Framework: Comprehensive Evaluation Report

**Date:** 2026-03-09
**Runtime:** Node v22.14.0 | TypeScript 5.5 | Vitest (354 tests passing)
**Benchmark apps:** Dashboard (original) + E-Commerce (independent validation)

---

## 1. Benchmark Results

### A. Runtime Performance

The core runtime is fast — well within interactive UI budgets:

| Operation | Throughput | Latency |
|-----------|-----------|---------|
| `store.set()` scalar | 603K ops/s | 1.6 us |
| `store.update()` (Immer) | 722K ops/s | 1.4 us |
| `store.reset()` | 2.1M ops/s | 460 ns |
| Notify 100 listeners | 434K ops/s | 2.3 us |
| `getWhen()` (5 conditions) | 49M ops/s | 20 ns |
| `getGates()` (3 conditions) | 39M ops/s | 25 ns |
| Computed (memoized) | 45M ops/s | 22 ns |
| Mutation + Zod validation | 512K ops/s | 1.9 us |
| Mutation + 3 middleware | 657K ops/s | 1.5 us |
| `history.push()` | 64M ops/s | 16 ns |
| Raw when evaluator | 128M ops/s | 8 ns |

**Verdict:** No performance concern. Even the slowest operation (store creation with schema at ~128us) is a one-time cost. Hot-path operations (mutations, subscriptions, conditions) are all sub-3us.

### B. Code Volume Comparison (Dashboard App — Original Benchmark)

| Metric | React Baseline | state-agent | Delta |
|--------|---------------|-------------|-------|
| Source files | 27 | 23 | **-15%** |
| Lines of code | 2,693 | 2,507 | **-7%** |
| Estimated tokens | 21,456 | 19,716 | **-8%** |
| React hooks used | 98 | 43 | **-56%** |
| Custom hook files | 6 | 0 | **-100%** |
| Reducer case statements | 17 | 6 | **-65%** |

### C. Code Volume Comparison (E-Commerce App — Independent Validation)

| Metric | React Baseline | state-agent | Delta |
|--------|---------------|-------------|-------|
| Source files | 18 | 16 | **-11%** |
| Lines of code | 1,027 | 869 | **-15%** |
| Estimated tokens | 8,144 | 7,399 | **-9%** |
| React hooks used | 49 | 3 | **-94%** |
| Custom hook files | 4 | 0 | **-100%** |
| Reducer case statements | 22 | 2 | **-91%** |

### D. Features Gained for Free

Both apps show state-agent includes these at zero additional code cost:

- **Schema validation** (Zod, auto-rollback on bad mutations)
- **Action history** (ring buffer, actor-filtered)
- **Actor attribution** (every mutation tagged: human/agent/system)
- **Dependency graph** (`impactOf()` analysis)
- **Memoized when/gate conditions**
- **Path-scoped subscriptions**

---

## 2. Claims vs Reality

| Marketing Claim | Measured Result | Validated? |
|-----------------|-----------------|------------|
| 77% fewer state decisions (96->22) | Hook reduction: 56-94%, File reduction: 11-15% | **Partially.** Decision count is hard to measure mechanically, but hook/boilerplate reduction is real |
| 2.7x signal density (35%->100%) | State files are denser but also longer (+31-38%) | **Nuanced.** Signal-per-line improves, but total state LOC increases because schema+when+gate definitions replace hooks+types spread across multiple files |
| O(1) impact analysis | `introspectStore()` and `impactOf()` exist in API | **Yes** — structurally true, dependency graph is built-in |
| 0 co-mutation risks | Zod validates every mutation, auto-rollback | **Yes** — schema enforcement prevents invalid states |
| 70-80% bug prevention | Schema + gates + when conditions prevent a class of bugs | **Plausible but unmeasurable** — structural safety is real, but exact % is aspirational |
| Token cost savings | 8-9% token reduction measured | **Modest.** Not the dramatic savings implied. The real savings are in agent reasoning, not raw tokens |

**Honest assessment:** The claims are directionally correct but the marketing numbers (77%, 2.7x) overstate what mechanical benchmarks show. The actual code reduction is 7-15% in LOC and 8-9% in tokens. The real value is **structural** — eliminating entire categories of bugs and decisions — not raw size reduction.

---

## 3. Value for Agentic Development

### New Projects

**Strong case.** When an AI agent builds a new app:

- `defineStore` is a single-file pattern (schema + type + store + conditions) — less coordination needed
- Agent doesn't need to decide where to put `useMemo`, `useCallback`, `useReducer` — those decisions are eliminated
- Schema validation happens automatically — agent can't produce silently-invalid state
- The skill.md gives agents a clear decision tree (8-step checklist) vs. the open-ended decisions with vanilla React

### Existing Projects (Refactor)

**Mixed case.** Migration is non-trivial:

- Each Context+useReducer+custom-hook combo must be rewritten as a `.store.ts`
- Incremental adoption is possible (stores can coexist with Context)
- But the migration itself costs tokens and introduces risk
- Best suited for projects already planning a state management overhaul

### Compared to Alternatives

| vs. | state-agent advantage | state-agent disadvantage |
|-----|----------------------|--------------------------|
| **Zustand** | Built-in schema validation, when/gate primitives, actor tracking, history | Zustand is simpler, more widely adopted, smaller bundle |
| **Redux Toolkit** | Far less boilerplate, no action types, no slices ceremony | Redux has massive ecosystem, middleware market, DevTools |
| **Jotai/Recoil** | Structured store model vs. scattered atoms; better for agent reasoning | Atoms are more compositional for fine-grained reactivity |
| **Vanilla React** | Eliminates hook boilerplate, adds safety | Zero dependency cost with vanilla |

---

## 4. Compatibility Matrix

### Framework Compatibility

| Platform | Core Runtime | UI Bindings | Status |
|----------|-------------|-------------|--------|
| **React 18-19 (Web)** | Full | Full | Production ready |
| **React Native** | Full | ~95% (hooks work, needs testing) | Viable with minimal work |
| **Vue.js** | Full | Needs adapter (~200 LOC) | Feasible |
| **Svelte** | Full | Needs adapter (~150 LOC) | Feasible |
| **Node.js (server)** | Full | N/A | Works today |
| **Electron** | Full | Full | Works today |
| **Vanilla JS** | Full | Manual subscribe() | Works today |

**Key architectural win:** Core runtime (`runtime/core/`) has **zero React imports**, zero DOM APIs, zero browser-only dependencies. Only `immer` + `zod`. The React layer is a thin adapter using `useSyncExternalStore`.

### Mobile Apps

- **React Native:** Near-compatible. `useSyncExternalStore` is available in RN 0.73+. Storage adapter is pluggable (swap `localStorage` for `AsyncStorage`). No DOM code in bindings.
- **Native iOS/Android:** Not applicable (JavaScript runtime required)
- **Expo:** Same as React Native — should work

---

## 5. Who Should Use This and Why

### Ideal Users

1. **Teams using AI agents to build/maintain React apps** — The framework's real differentiator. It gives agents a structured vocabulary (Together/Separate/When/Gate) instead of open-ended React patterns. The skill.md + AGENTS.md are genuine agent-facing docs.

2. **Projects with complex conditional UI** — When/Gate distinction (style-edge vs mount-edge) eliminates a common source of bugs where developers confuse hiding vs unmounting.

3. **Apps needing audit trails** — Built-in actor attribution and history ring buffer are genuinely useful for apps with compliance or undo requirements.

4. **Solo developers wanting "batteries included" state** — Schema validation, computed values, conditions, and history in a single `defineStore()` call vs. assembling 5 libraries.

### Less Ideal Users

1. **Simple apps** — If your state is just `useState` in a few components, this adds unnecessary abstraction.
2. **Teams deeply invested in Redux/Zustand** — Migration cost exceeds benefit unless you're also adopting agent-driven development.
3. **Non-React web projects** — Until Vue/Svelte adapters exist, you'd use only the core (which works, but you lose the ergonomic hooks).
4. **Performance-critical hot loops** — Store creation (~77-127us) is fine for UI but not for tight computation loops. This is unlikely to matter in practice.

### Why Use It

The framework's unique value proposition isn't "less code" (the savings are modest at 8-15%). It's **structural safety for agent-driven development**:

- Agents make fewer wrong decisions because the API surface is constrained
- Schema validation catches agent mistakes at runtime
- Actor tracking lets you audit what the agent changed vs. what the user changed
- The Together/Separate/When/Gate vocabulary maps directly to UI reasoning

### Why Skip It

- Ecosystem maturity: v0.1.0, one contributor, no community yet
- The 354 tests are solid, but no production battle-testing is documented
- Marketing claims overstate measured improvements
- Lock-in risk for a pre-1.0 framework

---

## Summary

**The framework is technically sound** — 354 passing tests, sub-microsecond hot-path performance, clean architecture with framework-agnostic core. The benchmark claims are directionally correct but overstated: real-world improvements are ~8-15% in code volume, not the 77% headline number.

**Its genuine value is agent-oriented state design**, not raw efficiency. The Together/Separate/When/Gate primitives, Zod schemas, and actor tracking create a structured environment where AI agents make fewer mistakes. That's a real niche — but it's narrow, and the framework needs ecosystem maturity (Vue/Svelte adapters, RN testing, community adoption, production case studies) before it can compete with established alternatives for non-agent use cases.
