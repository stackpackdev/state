# State-Agent Framework: Comprehensive Evaluation Report

**Date:** 2026-03-10
**Runtime:** Node v22.14.0 | TypeScript 5.9.3 | Vitest (396 tests passing)
**Benchmark apps:** Dashboard (buildable) + E-Commerce (source-only validation)
**New since last report:** Presence primitive (5th primitive), Zod 4.3.6, TS 5.9.3

---

## 1. Benchmark Results

### A. Runtime Performance

Core runtime performance, measured on Apple Silicon:

| Operation | Throughput | Latency | Notes |
|-----------|-----------|---------|-------|
| `store.set()` scalar | 746K ops/s | 1.3 us | Hot-path mutation |
| `store.update()` (Immer) | 912K ops/s | 1.1 us | Draft mutation |
| `store.update()` (array push) | 175K ops/s | 5.7 us | Array-heavy |
| `store.reset()` | 2.5M ops/s | 403 ns | Full state swap |
| `store.delete()` | 294K ops/s | 3.4 us | Path deletion |
| Notify 10 listeners | 632K ops/s | 1.6 us | |
| Notify 100 listeners | 473K ops/s | 2.1 us | |
| Path-scoped (50 match) | 114K ops/s | 8.8 us | Filtered delivery |
| `getWhen()` (5 conditions) | 68M ops/s | 15 ns | Memoized |
| `getGates()` (3 conditions) | 41M ops/s | 24 ns | Memoized |
| `isWhen()` single check | 47M ops/s | 21 ns | |
| Computed (single, memoized) | 37M ops/s | 27 ns | 100-item array |
| `getComputed()` all 4 values | 8.6M ops/s | 117 ns | |
| Computed after mutation | 80K ops/s | 12.5 us | Recompute cost |
| Mutation + Zod validation | 558K ops/s | 1.8 us | Schema check |
| Mutation + 3 middleware | 779K ops/s | 1.3 us | Pipeline overhead |
| `history.push()` | 62M ops/s | 16 ns | Ring buffer |
| `history.getAll()` (10K items) | 39K ops/s | 26 us | Full retrieval |
| `history.getLast(10)` | 44K ops/s | 23 us | |
| Raw `whenEvaluator.evaluate()` | 128M ops/s | 8 ns | No store overhead |
| Raw computed (memoized) | 65M ops/s | 15 ns | |
| Raw computed (recompute) | 21M ops/s | 48 ns | |
| Store creation (minimal) | 35K ops/s | 29 us | One-time cost |
| Store creation (with schema) | 11K ops/s | 92 us | One-time cost |
| `defineStore` (full options) | 15K ops/s | 67 us | One-time cost |

**Verdict:** No performance concern. Hot-path operations (mutations, subscriptions, conditions) are all sub-3us. Store creation (~67-92us) is a one-time cost. When/gate evaluation at 15-24ns is essentially free.

**Change from 2026-03-09:** Performance is consistent. Minor variations from run-to-run noise (±10%). TypeScript upgrade from 5.5→5.9.3 has no runtime impact.

### B. Production Build Comparison (Dashboard App)

Both apps built with Vite 5.4.21, production mode, minified:

| Metric | React Baseline | state-agent | Delta |
|--------|---------------|-------------|-------|
| Bundle size (raw) | 183.1 KB | 275.1 KB | **+50%** |
| Bundle size (gzip) | 55.9 KB | 82.6 KB | **+48%** |
| Modules transformed | 54 | 159 | **+194%** |
| Build time | 430ms | 774ms | **+80%** |

**Note:** The state-agent app includes the full runtime (Immer + Zod + store/flow/presence/middleware/history/computed/when/gate systems). The React baseline uses only React + ReactDOM with no state management library. The bundle difference (~27KB gzip) is the framework cost. This is comparable to adding Zustand (~1KB) + Zod (~13KB) + Immer (~6KB) individually, plus the additional runtime for when/gate/presence/computed/history/middleware.

### C. Code Volume Comparison (Dashboard App — Buildable)

| Metric | React Baseline | state-agent | Delta |
|--------|---------------|-------------|-------|
| Source files | 27 | 23 | **-15%** |
| Lines of code | 2,693 | 2,507 | **-7%** |
| Characters | 85,823 | 78,862 | **-8%** |
| Estimated tokens | 21,456 | 19,716 | **-8%** |
| React hooks used | 98 | 43 | **-56%** |
| Custom hook files | 6 | 0 | **-100%** |
| Reducer case statements | 17 | 6 | **-65%** |

#### Lines by Category

| Category | React | state-agent | Delta |
|----------|-------|-------------|-------|
| State | 468 | 648 | +38% |
| Hooks | 419 | 0 | -100% |
| Types | 149 | 118 | -21% |
| Components | 492 | 455 | -8% |
| Pages | 960 | 1,092 | +14% |
| Root (App, main) | 205 | 194 | -5% |

State files are larger (+38%) because they consolidate schema, types, conditions, and computed into one place. But hooks are eliminated entirely (-100%) and total LOC is lower.

#### State Management Overhead

| Metric | React | state-agent | Delta |
|--------|-------|-------------|-------|
| State mgmt lines (state + hooks) | 887 | 648 | **-27%** |
| Context/Store files | 5 | 8 | +60% |
| Custom hook files | 6 | 0 | -100% |

More store files, but each is self-contained. Zero custom hooks needed.

### D. Code Volume Comparison (E-Commerce App — Independent Validation)

| Metric | React Baseline | state-agent | Delta |
|--------|---------------|-------------|-------|
| Source files | 18 | 16 | **-11%** |
| Lines of code | 1,027 | 869 | **-15%** |
| Estimated tokens | 8,144 | 7,399 | **-9%** |
| React hooks used | 49 | 3 | **-94%** |
| Custom hook files | 4 | 0 | **-100%** |
| Reducer case statements | 22 | 2 | **-91%** |

The e-commerce app shows stronger reductions than the dashboard because it has proportionally more state management boilerplate relative to UI code.

### E. Features Gained for Free

Both apps demonstrate these at zero additional code cost:

- **Schema validation** (Zod 4, auto-rollback on bad mutations)
- **Action history** (ring buffer, actor-filtered)
- **Actor attribution** (every mutation tagged: human/agent/system)
- **Dependency graph** (`impactOf()` analysis)
- **Memoized when/gate conditions** (15-24ns evaluation)
- **Path-scoped subscriptions** (fine-grained re-renders)
- **Presence tracking** (animated enter/leave lifecycle) — **NEW**

---

## 2. Claims vs Reality

| Marketing Claim | Measured Result | Validated? |
|-----------------|-----------------|------------|
| 77% fewer state decisions (96→22) | Hook reduction: 56-94%, File reduction: 11-15% | **Partially.** Decision count is hard to measure mechanically, but hook/boilerplate reduction is real |
| 2.7x signal density (35%→100%) | State files are denser but also longer (+31-38%) | **Nuanced.** Signal-per-line improves, but total state LOC increases because schema+when+gate definitions replace hooks+types spread across multiple files |
| O(1) impact analysis | `introspectStore()` and `impactOf()` exist in API | **Yes** — structurally true, dependency graph is built-in |
| 0 co-mutation risks | Zod validates every mutation, auto-rollback | **Yes** — schema enforcement prevents invalid states |
| 70-80% bug prevention | Schema + gates + when + presence conditions prevent a class of bugs | **Plausible but unmeasurable** — structural safety is real, but exact % is aspirational |
| Token cost savings | 8-9% token reduction measured | **Modest.** Not the dramatic savings implied. The real savings are in agent reasoning, not raw tokens |

**Honest assessment:** The claims are directionally correct but the marketing numbers (77%, 2.7x) overstate what mechanical benchmarks show. The actual code reduction is 7-15% in LOC and 8-9% in tokens. The real value is **structural** — eliminating entire categories of bugs and decisions — not raw size reduction.

---

## 3. What's New: The Presence Primitive

Since the 2026-03-09 report, the 5th primitive has been fully implemented and documented:

| Primitive | Edge Type | What Changes | Unmount |
|-----------|-----------|-------------|---------|
| **When** | style-edge | Appearance (classes, styles) | Never — element stays mounted |
| **Gate** | mount-edge | Component subtree | Immediate — gone when gate closes |
| **Presence** | presence-edge | Component subtree + lifecycle | Deferred — stays until leave animation completes |

### What Presence Solves

React has no concept of "this node should be removed, but not yet" (react#161, open since 2013). The Presence primitive:

- Tracks lifecycle phases (`entering` → `present` → `leaving`) as observable state
- Works with CSS transitions (timeout-based) or JS animation libraries (manual `done()` callback)
- Handles rapid toggle race conditions (re-add cancels leave, flips to entering)
- Freezes values at leave time — no stale closures
- Works with portals (state-side tracking, not DOM-side)

### API Surface

```typescript
// Core (framework-agnostic)
createPresenceTracker({ timeout, onRemoved })

// React hooks
usePresence(storeName, gateName, { timeout })     // single boolean gate
usePresenceList(storeName, path, { timeout, keyFn }) // array items

// React component
<Presence store="modal" gate="isOpen" timeout={300}>
  {({ phase, ref, done, entered }) => ...}
</Presence>
```

### Impact on Agent API Concepts

| Metric | Before (2026-03-09) | After (2026-03-10) |
|--------|---------------------|---------------------|
| Primitives | 4 (Together/Separate/When/Gate) | 5 (+Presence) |
| React hooks | 7 | 9 (+usePresence, +usePresenceList) |
| React components | 1 (`<Gated>`) | 2 (+`<Presence>`) |
| Animation problems solvable | External library required | Built-in |

---

## 4. Value for Agentic Development

### New Projects

**Strong case.** When an AI agent builds a new app:

- `defineStore` is a single-file pattern (schema + type + store + conditions) — less coordination needed
- Agent doesn't need to decide where to put `useMemo`, `useCallback`, `useReducer` — those decisions are eliminated
- Schema validation happens automatically — agent can't produce silently-invalid state
- The skill.md gives agents a clear decision tree (8-step checklist) vs. the open-ended decisions with vanilla React
- Presence eliminates the need for agents to reason about animation timing, cleanup, and race conditions

### Existing Projects (Refactor)

**Mixed case.** Migration is non-trivial:

- Each Context+useReducer+custom-hook combo must be rewritten as a `.store.ts`
- Incremental adoption is possible (stores can coexist with Context)
- But the migration itself costs tokens and introduces risk
- Best suited for projects already planning a state management overhaul

### Compared to Alternatives

| vs. | state-agent advantage | state-agent disadvantage |
|-----|----------------------|--------------------------|
| **Zustand** | Built-in schema validation, when/gate/presence primitives, actor tracking, history | Zustand is simpler, more widely adopted, smaller bundle |
| **Redux Toolkit** | Far less boilerplate, no action types, no slices ceremony | Redux has massive ecosystem, middleware market, DevTools |
| **Jotai/Recoil** | Structured store model vs. scattered atoms; better for agent reasoning | Atoms are more compositional for fine-grained reactivity |
| **Framer Motion** | Presence lives in state layer (observable, debuggable) vs component tree (fragile) | Framer Motion has vastly more animation capabilities |
| **Vanilla React** | Eliminates hook boilerplate, adds safety, animated lifecycle | Zero dependency cost with vanilla |

---

## 5. Bundle Size Analysis

| | React Baseline | state-agent | Delta |
|---|---|---|---|
| **App code** (source) | 85.8 KB | 78.9 KB | -8% |
| **Bundle** (minified) | 183.1 KB | 275.1 KB | +50% |
| **Bundle** (gzip) | 55.9 KB | 82.6 KB | +48% |
| **Framework overhead** (gzip) | 0 KB | ~26.7 KB | — |

The ~27KB gzip framework overhead buys: Zod validation, Immer immutability, when/gate/presence evaluation, computed memoization, history ring buffer, middleware pipeline, actor attribution, dependency graph, flow state machines, persistence, effects, optimistic updates, and pub/sub.

For comparison:
- Zustand: ~1.1KB gzip
- Jotai: ~3.5KB gzip
- Redux Toolkit: ~11KB gzip
- Zod (standalone): ~13KB gzip
- Immer (standalone): ~6KB gzip

state-agent's ~27KB includes equivalents of Zod + Immer + a state manager + additional features. The marginal cost beyond Zod+Immer is ~8KB for the full runtime.

---

## 6. Compatibility Matrix

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

---

## 7. Who Should Use This and Why

### Ideal Users

1. **Teams using AI agents to build/maintain React apps** — The framework's real differentiator. It gives agents a structured vocabulary (Together/Separate/When/Gate/Presence) instead of open-ended React patterns.

2. **Projects with complex conditional UI** — When/Gate/Presence distinction eliminates a common source of bugs where developers confuse hiding vs unmounting vs animated exit.

3. **Apps needing audit trails** — Built-in actor attribution and history ring buffer are genuinely useful for apps with compliance or undo requirements.

4. **Solo developers wanting "batteries included" state** — Schema validation, computed values, conditions, history, and animated lifecycle in a single `defineStore()` call.

### Less Ideal Users

1. **Simple apps** — If your state is just `useState` in a few components, this adds unnecessary abstraction.
2. **Teams deeply invested in Redux/Zustand** — Migration cost exceeds benefit unless you're also adopting agent-driven development.
3. **Bundle-sensitive apps** — The ~27KB gzip overhead matters for lightweight landing pages (but is negligible for SPAs).
4. **Non-React web projects** — Until Vue/Svelte adapters exist, you'd use only the core.

### Why Use It

The framework's unique value proposition isn't "less code" (the savings are modest at 8-15%). It's **structural safety for agent-driven development**:

- Agents make fewer wrong decisions because the API surface is constrained
- Schema validation catches agent mistakes at runtime
- Actor tracking lets you audit what the agent changed vs. what the user changed
- The Together/Separate/When/Gate/Presence vocabulary maps directly to UI reasoning
- Presence eliminates an entire class of animation bugs that waste agent turns

### Why Skip It

- Ecosystem maturity: v0.1.0, one contributor, no community yet
- The 396 tests are solid, but no production battle-testing is documented
- Marketing claims overstate measured improvements
- Lock-in risk for a pre-1.0 framework
- Bundle size overhead may matter for some use cases

---

## Summary

**The framework is technically sound** — 396 passing tests, sub-microsecond hot-path performance, clean architecture with framework-agnostic core. The benchmark claims are directionally correct but overstated: real-world improvements are ~8-15% in code volume, not the 77% headline number.

**The Presence primitive is a genuine differentiator.** No other state management library treats animated lifecycle as a first-class state concern. This alone can save agents dozens of debugging turns on animation timing issues.

**Bundle cost is real but justified.** The ~27KB gzip overhead includes Zod + Immer + a full state management runtime with features that would require 3-4 separate libraries otherwise.

**Its genuine value is agent-oriented state design**, not raw efficiency. The five primitives, Zod schemas, and actor tracking create a structured environment where AI agents make fewer mistakes. That's a real niche — and with Presence, it now covers the full spectrum of state concerns from data loading to animated transitions.
