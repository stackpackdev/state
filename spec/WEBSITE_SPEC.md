# state-agent Website Spec

> Strategic storytelling framework applied. Target: vibe-coding React devs using AI pair programming.

---

## Brand Narrative (StoryBrand SB7 Framework)

### The Hero
React developers who use AI tools (Claude Code, Cursor, Copilot) to build apps faster. They "vibe code" — describe what they want, the AI builds it. They ship fast but hit walls when state gets complex.

### The Problem

**External**: State management libraries weren't designed for AI-assisted development. Redux needs 4 files per feature. Zustand stores grow into tangles. Jotai atoms scatter everywhere. The AI generates plausible-looking state code that breaks in subtle ways.

**Internal**: "I spend more time fixing AI-generated state bugs than I saved by using AI in the first place." The developer feels like they're babysitting the AI instead of collaborating with it.

**Philosophical**: AI tools should amplify developers, not create new categories of bugs. State management should be a solved problem by now.

### The Guide (state-agent)
A framework that speaks the same language as your AI tools. Schema is the planning language — the AI reads it once and understands your entire state shape, valid mutations, transitions, and conditions.

### The Plan
1. **Define your schema** — one Zod schema per store. Types, validation, and AI comprehension in one declaration.
2. **Let AI generate** — agents produce correct state code on the first try because Together/Separate/When/Gate rules eliminate ambiguity.
3. **Ship with confidence** — 459 tests, Zod validation on every mutation, property invariants catch logic bugs before users do.

### The Call to Action
**Direct**: `npm install state-agent` — try the 5-minute refactor on your messiest component.
**Transitional**: Read the skill doc — see how AI agents use the framework.

### Success
63% less code. 66% fewer tokens. 97% less prop drilling. Your AI pair programmer finally understands your state layer.

### Failure (what you avoid)
More useState spaghetti. More prop drilling. More "why did the AI put loading state in three different places?" More animation hacks with useEffect and setTimeout.

---

## One-Liner

**"State management that your AI pair programmer actually understands."**

---

## Homepage Sections

### 1. Hero Section

**Headline**: State management that your AI pair programmer actually understands.

**Subheadline**: 5 primitives. One schema. 63% less code. Built for the age of vibe coding.

**CTA**: Get Started | View on GitHub

**Visual**: Animated split-screen — left side shows a messy App.tsx with useState/prop drilling (551 LOC, fading out), right side shows clean state-agent stores (97 LOC, fading in). Counter animates from 551 → 97.

---

### 2. The Problem (Empathy Section)

**Headline**: Your AI writes great components. Your state layer is still a mess.

Three cards:

**Card 1 — "The Prop Drilling Spiral"**
You asked the AI to add a feature. It threaded a new prop through 6 components. Now every parent re-renders when a child changes. The AI doesn't know which data changes together.

**Card 2 — "The State Sprawl"**
37 useState calls scattered across your app. Loading states duplicated in 4 components. The AI can't see the whole picture because there IS no whole picture.

**Card 3 — "The Animation Hack"**
You asked for a fade-out animation. The AI added useEffect + setTimeout + a boolean flag + a ref. React still unmounts the element before the animation finishes. This is a 10-year-old unsolved problem (react#161).

---

### 3. The 5 Primitives (The Framework)

**Headline**: Five questions. Every state decision answered.

Interactive decision tree or tabbed cards:

| Ask This | Primitive | What Happens |
|----------|-----------|-------------|
| What data changes together? | **Together** | Group into one store |
| What's independent? | **Separate** | Split into separate stores |
| What changes appearance? | **When** | Cheap style-edge re-render |
| What controls mounting? | **Gate** | Component mounts/unmounts |
| What animates in/out? | **Presence** | Deferred unmount with lifecycle phases |

**Why this matters for AI**: These rules are unambiguous. When an agent reads your schema, it knows EXACTLY where new state belongs. No guessing. No "should this be global or local?" debates.

---

### 4. The Proof (Real Numbers)

**Headline**: We refactored a real conference app. Here's what happened.

Animated stat counters:

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total lines of code | 5,288 | 1,926 | **-63%** |
| Tokens for AI to understand | ~46,000 | ~15,600 | **-66%** |
| Prop drilling instances | 37 | 1 | **-97%** |
| App.tsx (root component) | 551 lines | 97 lines | **-82%** |
| Tests (zero React dependency) | 0 | 34 | store logic fully testable |
| Total passing tests | — | 459 | full coverage |

**Subtext**: AINDCon conference app — 4 stores replace 1 monolithic component. Same UI, same features, fraction of the code.

---

### 5. How It Works (Code Walkthrough)

**Headline**: One schema. Everything derives.

Three-step progressive reveal:

**Step 1 — Define**
```typescript
export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })),
    filter: z.enum(['all', 'active', 'done']),
  }),
  initial: { items: [], filter: 'all' as const },
  when: { isEmpty: (s) => s.items.length === 0 },
  gates: { hasItems: (s) => s.items.length > 0 },
  computed: { activeCount: (s) => s.items.filter(i => !i.done).length },
})
```
Caption: Types, validation, selectors, conditions — all from one declaration. Your AI reads this and knows everything.

**Step 2 — Use**
```tsx
const { value, change, update } = useStore('todos')
change('filter', 'active')
update(draft => { draft.items.push(newItem) })
```
Caption: No actor boilerplate. No dispatch. No action creators. Just mutate.

**Step 3 — Animate**
```tsx
<Presence store="modal" gate="isOpen" timeout={300}>
  {({ phase, ref }) => (
    <div ref={ref} className={`modal modal--${phase}`}>
      <Content />
    </div>
  )}
</Presence>
```
Caption: CSS-only animations. No Framer Motion. No useEffect hacks. The element stays in the DOM until `leaving` phase completes.

---

### 6. The AI Advantage (Differentiator)

**Headline**: Built for agents. Not retrofitted.

Two columns:

**Other libraries** (left, dimmed):
- Agent generates plausible store code → breaks at runtime
- Agent doesn't know what data changes together → prop drilling
- Agent can't reason about mount/unmount → animation bugs
- Agent generates 4 files per feature (Redux) → token waste
- `getStore('name')` returns `unknown` → type errors everywhere

**state-agent** (right, highlighted):
- Schema IS the planning language → agent reads once, generates correctly
- Together/Separate rules → agent groups data correctly every time
- When/Gate/Presence → agent knows exactly which primitive to use
- One file per store → 66% fewer tokens for AI context
- `defineStore()` returns typed result → zero casting, zero guessing

**Bottom line**: The AI doesn't need to "understand" your state library. The library was designed to be understood by AI.

---

### 7. What's Inside (Feature Grid)

**Headline**: Everything you need. Nothing you don't.

Two dependency badges: `immer` + `zod`. That's it. React is optional.

Feature grid (3 columns):

**State**
- Zod-validated mutations
- Immer drafts
- Path-based read/write
- Actor attribution
- Computed values

**Conditions**
- When (style-edge)
- Gate (mount-edge)
- Presence (animated lifecycle)
- Discriminated union modes
- Transition graphs

**Advanced**
- Optimistic updates + rollback
- Effects (debounce, retry, abort)
- Cross-store pub/sub
- Persistence + migrations
- Undo/redo
- Runtime introspection
- Property invariants

---

### 8. Comparison Table

**Headline**: How state-agent compares

| Feature | state-agent | Redux | Zustand | Jotai | XState |
|---------|:-----------:|:-----:|:-------:|:-----:|:------:|
| AI-readable schema | Built-in | No | No | No | Partial |
| Files per store | 1 | 3-4 | 1 | N atoms | 1-2 |
| Zod validation | Every mutation | Manual | Manual | Manual | Manual |
| Conditions (when/gate) | Declarative | Manual | Manual | Manual | Guards |
| Animated lifecycle | Presence primitive | No | No | No | No |
| Undo/redo | Built-in | Middleware | No | No | No |
| Optimistic updates | Built-in | Middleware | Manual | No | No |
| Cross-store events | Pub/sub | Manual | Manual | Manual | Actors |
| Persistence + migrations | Built-in | Manual | Middleware | Middleware | No |
| Actor attribution | Every mutation | No | No | No | No |
| Bundle overhead | ~15KB (immer+zod) | ~7KB | ~1KB | ~3KB | ~25KB |

---

### 9. Get Started

**Headline**: 5 minutes to your first store.

```bash
npm install state-agent
```

Three paths:
1. **Quick start** → link to skill doc Quick Start section
2. **Refactor guide** → link to skill/refactoring.md (migrate from useState/Redux/Zustand)
3. **Full reference** → link to skill doc Full Reference section

---

### 10. Footer

- GitHub
- npm
- License: MIT
- "Built for agents. Used by humans."

---

## Design Direction

**Tone**: Confident, direct, zero fluff. Speak to developers who ship, not developers who debate.

**Visual style**: Dark mode default. Monospace code blocks. Minimal color — let the code speak. Accent color for stats/numbers. No stock photos, no illustrations of "happy developers." The product IS the visual.

**Animations**:
- Hero stat counter (551 → 97 LOC)
- Code blocks with syntax highlighting that reveals progressively
- Comparison table rows that highlight on hover
- Presence demo that actually demonstrates the `entering → present → leaving` lifecycle in real-time

**Typography**: System font stack for body. Monospace for everything code-related. Large, bold numbers for stats.

---

## Technical Implementation

- React + Vite (already set up in `website/`)
- Tailwind CSS for styling
- No heavy animation library — use CSS transitions + state-agent's own Presence primitive for the meta-demo
- Responsive: mobile-first, but code blocks need desktop width
- Static site — no backend needed

---

## Content Principles (from storytelling audit)

1. **Lead with the problem, not the solution** — the hero section names the pain before offering the cure
2. **Show, don't claim** — real numbers from a real refactor, not hypothetical benchmarks
3. **The customer is the hero** — state-agent is the guide. The developer ships the app.
4. **One clear CTA per section** — don't scatter attention
5. **Code IS the demo** — every section has a code example. No abstract diagrams.
6. **Specificity over superlatives** — "63% less code" not "dramatically less code"
7. **Address the internal problem** — "I spend more time fixing AI state bugs than I saved" resonates more than "reduce boilerplate"
8. **Name the enemy clearly** — prop drilling, scattered useState, animation hacks. Not "other libraries."
9. **Transitional CTA exists** — devs who aren't ready to install can read the skill doc
10. **Social proof is data, not testimonials** — 459 tests, real refactor metrics, zero hand-waving
