# stackpack-state Demo Site — Design Spec

**Date:** 2026-04-12  
**Status:** Approved

---

## Overview

A standalone Vite + React + TypeScript demo app at `/Users/parandykt/Apps/stackpack/demo/` (sibling to `state/` and `website/`). Single page. No routing. Purpose: show developers why stackpack-state beats Zustand, Redux, and Jotai through a live interactive task manager with a guided tour and capability table.

---

## Visual Style

Matches the StackPack dashboard aesthetic:
- **Background:** `#EAE6DF` (warm linen)
- **Cards:** white, `1px solid #E0DBD3`, `border-radius: 8px`, generous padding
- **Typography:** system-ui sans, uppercase small-caps labels with letter-spacing, body in regular weight
- **Accents:** black primary buttons, `#22c55e` green for positive indicators, muted grays for secondary text
- **Spacing:** lots of breathing room — 24px+ gaps, no cramped layouts

---

## Layout

```
┌──────────────────────────────────────────────────────┐
│  HEADER: "stackpack-state" logo + tagline            │
├──────────────────────────────────────────────────────┤
│  FRAMEWORK SELECTOR: [Zustand | Redux | Jotai] tabs  │
├──────────────────┬───────────────────────────────────┤
│  stackpack-state │  [selected framework]             │
│  Task Manager    │  Same Task Manager                │
│  (left panel)    │  (right panel)                    │
├──────────────────┴───────────────────────────────────┤
│  AGENT PANEL: Live agent introspection & simulation  │
├──────────────────────────────────────────────────────┤
│  CAPABILITY TABLE: Full feature comparison grid      │
└──────────────────────────────────────────────────────┘
```

---

## Task Manager App (Both Panels)

The same task manager UI is implemented twice — once with stackpack-state, once with the selected competitor. Each panel shows:

- Task list with add/complete/delete
- "N of M completed" computed badge
- Undo button (history)
- Tasks animate out on delete (Presence / CSS transition)
- "Saved" indicator (effects → localStorage)
- Loading skeleton on initial mount (Gate)
- Actor label on each task: "you" or "agent"

The right panel shows the competitor's implementation. For features it can't support natively, it shows a `— not supported` label or requires visible extra code.

---

## Guided Tour (9 Steps)

A "Start Tour →" button in the header initiates the tour. Each step:
- Highlights the relevant UI region with a subtle ring
- Floating card: **Capability name** + one-sentence value prop + "Try it" prompt
- Right panel shows the competitor's equivalent (or lack thereof)
- Auto-advances when the user performs the action, or via "Next →"

| # | Capability | One-liner |
|---|---|---|
| 1 | Schema-first | One Zod schema drives types, validation, and selectors — no duplication. |
| 2 | Computed values | Derived state is declared once and never stored or synced manually. |
| 3 | Gate | Expensive mounts are controlled by a condition, not a ternary in JSX. |
| 4 | Presence | Components unmount only after their exit animation completes — zero extra code. |
| 5 | History / Undo | Built-in undo with one flag — no middleware, no manual snapshots. |
| 6 | Optimistic updates | Rollback on failure is a first-class primitive, not a try/catch pattern. |
| 7 | Effects | Side effects are declared in the store, not scattered across useEffect calls. |
| 8 | Actor system | Every state change is tagged with who made it — human or agent. |
| 9 | Agent-readable schema | The entire state shape, valid actions, and constraints are introspectable from a single schema — purpose-built for AI agents. |

After the tour: "View full comparison →" scrolls to the capability table.

---

## Agent Panel

A dedicated section between the task manager and the capability table. Shows three things:

1. **Schema introspection** — a code snippet showing how an agent reads the full state shape in one call. Competitor side shows `???` / opaque.
2. **Simulate Agent button** — triggers an agent adding a task and completing another. The actor label "agent" appears on the affected tasks in the left panel.
3. **Valid transitions** — a small readout showing which actions are currently valid (e.g., "cannot complete: already done"), demonstrating schema-enforced constraints.

---

## Capability Comparison Table

Full-width section at the bottom. Rows = capabilities, columns = stackpack-state + Zustand + Redux + Jotai.

| Capability | stackpack-state | Zustand | Redux | Jotai |
|---|---|---|---|---|
| Schema-first (Zod) | ✅ built-in | ❌ | ❌ | ❌ |
| Computed values | ✅ built-in | ⚠️ manual selector | ⚠️ reselect lib | ⚠️ derived atoms |
| History / Undo | ✅ built-in | ⚠️ middleware | ⚠️ middleware | ❌ manual |
| Optimistic updates | ✅ built-in | ❌ manual | ❌ manual | ❌ manual |
| Presence (deferred unmount) | ✅ built-in | ❌ | ❌ | ❌ |
| Gate (mount-edge conditions) | ✅ built-in | ❌ | ❌ | ❌ |
| Effects (store-declared) | ✅ built-in | ⚠️ subscribe() | ⚠️ middleware | ❌ manual |
| Actor system | ✅ built-in | ❌ | ❌ | ❌ |
| Migrations | ✅ built-in | ⚠️ manual | ⚠️ manual | ❌ |
| Multi-store pub/sub | ✅ built-in | ❌ | ❌ | ⚠️ atom deps |
| Agent-optimized APIs | ✅ | ❌ | ❌ | ❌ |
| TypeScript inference | ✅ full | ✅ full | ⚠️ partial | ✅ full |

Legend: ✅ built-in &nbsp; ⚠️ possible with extra code/libs &nbsp; ❌ not supported  
⚠️ cells are hoverable with a tooltip explaining what extra work is required.

---

## Tech Stack

- **Vite** + React 18 + TypeScript
- **stackpack-state** (local workspace package link)
- **zustand**, **@reduxjs/toolkit + react-redux**, **jotai** (all bundled, swapped via framework selector)
- **Tailwind CSS** for styling
- No router, no backend, no external API calls

---

## File Structure

```
/Users/parandykt/Apps/stackpack/demo/
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   └── globals.css          # linen bg, card styles, tokens
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── FrameworkSelector.tsx
│   │   ├── SplitPanel.tsx
│   │   ├── TourOverlay.tsx
│   │   ├── AgentPanel.tsx
│   │   └── CapabilityTable.tsx
│   ├── panels/
│   │   ├── StackpackPanel.tsx   # stackpack-state implementation
│   │   ├── ZustandPanel.tsx
│   │   ├── ReduxPanel.tsx
│   │   └── JotaiPanel.tsx
│   └── tour/
│       └── steps.ts             # tour step definitions
```

---

## Success Criteria

- A developer can open the page, click "Start Tour", and understand all 9 differentiators within 3 minutes
- Switching frameworks instantly swaps the right panel with no reload
- The agent simulation visibly attributes changes in the left panel with an "agent" label
- The capability table is scannable at a glance with clear ✅/⚠️/❌ signals
- Visual style matches the StackPack dashboard (linen bg, white cards, black CTAs)
