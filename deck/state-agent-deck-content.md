# state-agent: Presentation Deck Content
## "The Schema That Thinks"

---

## THE NARRATIVE FRAMEWORK

### Heroes

**Maya** — A senior frontend developer at a fast-growing startup. She's smart, pragmatic, and under pressure. Her team just adopted AI coding agents to ship their React dashboard 3x faster. She's the believer — the one who championed AI-assisted development to leadership. Her reputation is on the line.

**Axon** — The AI coding agent. Not a character with a face, but a presence — represented visually as a glowing cursor, a stream of generated code, a force of nature. Axon is powerful but blind. It can write 200 lines of React in seconds, but it can't *see* the rules. It infers, guesses, and sometimes... gets it catastrophically wrong.

### Desire
Ship a production-quality React application in weeks, not months — with an AI agent doing most of the heavy lifting.

### Obstacle
State management is the minefield where agents step on every mine. The code *looks* right. It passes linting. It even renders. But under the surface, impossible states breed, selectors over-subscribe, transitions violate business logic, and the whole thing collapses at demo day.

### Thematic through-line
**"Don't make the agent read your mind. Give it a contract."**

---

## ACT STRUCTURE

| Act | Slides | Emotional Beat |
|-----|--------|----------------|
| **I — The Promise** | 1–4 | Excitement → Confidence |
| **II — The Fracture** | 5–9 | Doubt → Frustration → Crisis |
| **III — The Insight** | 10–12 | Revelation → Clarity |
| **IV — The Transformation** | 13–22 | Rising power → Mastery |
| **V — The New World** | 23–25 | Vision → Call to action |

---

---

# ACT I — THE PROMISE

---

## SLIDE 1: Title

### Story Point
*The world before the problem. Optimism. The agent era has arrived.*

### Visual
Dark background. A single glowing terminal cursor blinks center-screen. Below it, the title fades in letter by letter, as if being typed by an AI:

**state-agent**
*The state management framework designed for the developer who doesn't write the code.*

Small tagline beneath: `v0.x · React · TypeScript · Zod`

### Speaker Notes
"We're entering an era where the developer's job isn't to write every line of code — it's to define the system, and let an agent build it. But what happens when the agent gets state wrong? That's the story we're going to tell today. And it starts with two characters."

---

## SLIDE 2: Meet Maya

### Story Point
*Introduce the human hero. Establish stakes.*

### Visual
Split composition. Left side: stylized illustration of a developer at a desk — multiple monitors, coffee cup, Slack notifications. The vibe is focused, competent, slightly overwhelmed. Right side: a simplified org chart showing her team, with a glowing node labeled "AI Agent" newly connected. A speech bubble from leadership above says: *"Ship the dashboard by Q3."*

### Speaker Notes
"This is Maya. Senior frontend engineer. Her company just greenlit AI coding agents for the team. She's the one who pushed for it. She told her CTO: give us agents and we'll ship 3x faster. Leadership said yes. Now she has to deliver. The dashboard is complex — multi-step checkout, real-time data, role-based views. Tight deadline. The agent is her multiplier."

---

## SLIDE 3: Meet Axon

### Story Point
*Introduce the agent. Establish its nature — powerful but literally unable to see constraints that aren't written down.*

### Visual
Abstract, cinematic. A dark screen with streams of code flowing downward like rain (Matrix-style but modern, using actual TypeScript/React syntax). In the center, a glowing cursor pulses — this is Axon. Around the cursor, code assembles itself: components, hooks, stores. It's fast. It's impressive. The visual conveys raw generative power.

Small caption at bottom: *"200 lines per second. Zero understanding of what's valid."*

### Speaker Notes
"And this is Axon. The agent. It doesn't have a face — it's a force. It reads your codebase, your prompts, your types. And it generates. Fast. Fluent. Confident. It can scaffold an entire store, wire up selectors, build components in seconds. But here's the thing about Axon — it doesn't know your rules. It *infers* them. And inference... is where bugs are born."

---

## SLIDE 4: The Early Wins

### Story Point
*Show the honeymoon. Things are working. Velocity is real. This builds trust that makes the fall harder.*

### Visual
A stylized velocity chart climbing steeply upward — sprint-over-sprint. Beside it, a quick montage of UI components appearing: a data table, a filter bar, a modal, a form. Each piece snaps into place like Tetris blocks. Everything fits. A green checkmark appears over each component. Maya's expression (small avatar in corner): confident smile.

### Speaker Notes
"The first two weeks are magic. Axon generates the settings page in an afternoon. The data tables — done by Wednesday. Filters, modals, form validation — Axon handles it. Maya reviews, tweaks, ships. The velocity chart looks like a hockey stick. Leadership is thrilled. Maya thinks: this is going to work."

---

---

# ACT II — THE FRACTURE

---

## SLIDE 5: The First Crack

### Story Point
*The first impossible state. Subtle. Looks right, isn't right. This is the inciting incident.*

### Visual
A code editor view, center-screen. The code looks clean and professional:

```
{ data: User[], isLoading: true, error: "timeout" }
```

At first glance, nothing is wrong. Then a red pulse radiates outward from the code block — a slow, ominous glow. The three values `data`, `isLoading`, and `error` each highlight in red, one at a time. A diagnostic label appears: **"Impossible state: data AND loading AND error coexist."**

Below the code, a simplified UI render shows: a spinner overlaying actual data, with an error toast on top. A visual mess.

### Speaker Notes
"Then it happens. A bug report comes in: 'The user list shows data AND a spinner AND an error message. All at the same time.' Maya looks at the store Axon generated. It's a flat object. `data`, `isLoading`, `error` — three independent fields. Technically valid TypeScript. Zod doesn't complain. But in reality? You can't be loading and succeeded and errored simultaneously. The agent didn't know that. Nobody told it."

---

## SLIDE 6: The Selector Avalanche

### Story Point
*The performance crisis. The second class of agent bug — over-subscribing.*

### Visual
An animated flow diagram. On the left, a single store represented as a box with many fields. On the right, a column of React components (8–10 of them). Fat red arrows connect EVERY component to the ENTIRE store — each one has `useStore(s => s)`. When any single field in the store blinks (simulating a state change), ALL components flash red simultaneously — mass re-render.

A performance profiler strip along the bottom shows a flame graph spiking repeatedly. FPS counter in corner drops: 60 → 30 → 12 → 4.

Caption: *"80% of agent-generated Zustand code subscribes to the entire store."*

### Speaker Notes
"Bug number two is quieter but deadlier. Axon generates selectors by subscribing to everything. `useStore(s => s)`. Every component re-renders on every change. On a small app, you don't notice. On the dashboard with 40 components and real-time data? The UI crawls. Maya profiles it, sees the flame graph, and realizes every component is re-rendering on every keystroke. The agent doesn't understand React's rendering model. It doesn't know about structural equality or memoization. It just grabs everything."

---

## SLIDE 7: The Impossible Transition

### Story Point
*The business logic violation. The most dangerous bug — the one that passes every automated test.*

### Visual
A state machine diagram of a checkout flow: `cart → shipping → payment → confirmed`. Clean, simple arrows. Then a new, jagged red arrow appears going BACKWARD from `confirmed` to `cart`, labeled "Agent-generated mutation". The arrow crackles with visual distortion. Below, a customer's order vanishes mid-confirmation. A sad receipt icon appears with a red X.

### Speaker Notes
"Week four. A customer completes checkout. Pays. Gets a confirmation screen. Then the page refreshes and they're back in the cart. Their order is gone. Maya traces it: Axon generated a state reset that transitions from 'confirmed' back to 'cart'. Why? Because nothing said it couldn't. There's no declared state machine. No transition constraints. The agent saw a 'reset' function and used it everywhere — including places it should never fire. Zod validated the shape. TypeScript checked the types. But nobody encoded the *business rules* of which transitions are legal."

---

## SLIDE 8: The Effect Cascade

### Story Point
*Compounding failures. Effects scattered across components create invisible chains of destruction.*

### Visual
A web of interconnected nodes, like a neural network gone wrong. Each node is a React component. Between them, tangled lines represent `useEffect` calls — some dotted (missing cleanup), some looping back on themselves (infinite loops), some duplicated (two components triggering the same fetch). Red pulses travel along the lines, multiplying at each intersection. The visual gets increasingly chaotic.

A counter in the corner: API calls per second climbing from 2 → 10 → 50 → 200. An AWS bill icon appears with an escalating dollar amount.

### Speaker Notes
"Then the effects. Axon scattered `useEffect` across seven components. Two of them fetch the same data on the same state change — duplicated calls. One has no cleanup — no AbortController — so rapid tab switches fire overlapping requests. Another creates an infinite loop: it updates state, which triggers itself, which updates state... Maya's monitoring dashboard lights up. 200 API calls per second. From one user. She kills the deployment at 2am."

---

## SLIDE 9: The Crisis

### Story Point
*The emotional low point. Maya's credibility is on the line. The agent approach seems broken. This is the "all is lost" moment.*

### Visual
Dark, muted tones. Maya's avatar is small, alone, at a desk at night. The monitors show a Slack thread: messages from team members — *"Should we just go back to writing it by hand?"* *"The agent is generating more bugs than it saves time."* Leadership's message: *"We need to talk about the timeline."*

The velocity chart from Slide 4 reappears, but now it's crashed — the line plateaus and then dips. A label reads: **"Net velocity: negative. Time debugging > time saved."**

### Speaker Notes
"Maya stares at the metrics. The team spent more time debugging agent-generated state code than they saved. Net velocity is negative. The checkout bug cost a customer. The performance issue made the demo stutter in front of investors. Her team is losing faith. And Maya starts to wonder: is this just... the wrong approach? Are agents fundamentally incapable of managing state?"

*[Pause for one beat]*

"The answer is no. The agents aren't broken. The *system* is. And the proof is one question..."

---

---

# ACT III — THE INSIGHT

---

## SLIDE 10: The Question

### Story Point
*The philosophical turn. Reframe the problem. This is the "aha" moment.*

### Visual
Full-screen typography on a dark background. A single question, large and centered:

**"What if the agent didn't have to read your code to understand your system?"**

Below it, a visual metaphor: two paths diverge. The left path is labeled *"Read code → Infer rules → Generate"* — it's dark, foggy, full of question marks. The right path is labeled *"Query contract → Generate within constraints"* — it's lit, clear, with guardrails visible on both sides.

### Speaker Notes
"Every framework today asks the agent to READ code and INFER what's possible. Read the reducer. Figure out which selectors exist. Guess which transitions are valid. That's where every bug came from — the inference gap. But what if we flipped it? What if instead of asking the agent to understand the system... the system told the agent what's possible? A queryable contract. Not code to interpret — a spec to follow."

---

## SLIDE 11: The OpenAPI Parallel

### Story Point
*Anchor the insight in something the audience already knows and trusts.*

### Visual
Side-by-side comparison, animated. Left side: "Before OpenAPI" — an LLM staring at raw REST endpoints, guessing parameters, getting 400 errors. Code snippets show malformed API calls. Red X marks.

Right side: "After OpenAPI" — the LLM reads a structured JSON schema, sees every endpoint, every parameter, every constraint. Generates perfect function calls. Green checkmarks.

An arrow transitions the comparison downward to a new pair. Left: "Today's state management" — agent reading .ts files, inferring selectors and transitions. Right: "state-agent" — agent querying a schema contract, seeing modes, transitions, selectors, invariants. All in one artifact.

### Speaker Notes
"This is the same insight that made OpenAPI function-calling work for LLMs. Before structured schemas, models guessed API parameters and got 400 errors constantly. After schemas, they query the contract and generate correct calls. state-agent does the same thing — but for React state. The schema isn't just types. It's a planning language. Modes, transitions, selectors, invariants, effects — all declared in one queryable artifact."

---

## SLIDE 12: Schema as World Model

### Story Point
*The core thesis. The single slide the audience must remember. The killer differentiator.*

### Visual
A central glowing hexagon labeled **"Schema"**. From it, seven spokes radiate outward, each connecting to a capability:

1. **TypeScript types** — `z.infer<S>`
2. **Runtime validation** — Zod parse on every mutation
3. **Agent planning language** — introspection API
4. **Transition constraints** — declared state machines
5. **Selector generator** — auto-built from schema shape
6. **Composition unit** — ECS-style components
7. **Property specification** — invariants and refinements

The hexagon pulses. Each spoke lights up in sequence. The animation conveys: one artifact, seven functions. Everything the agent needs, in one place.

Tagline at bottom: **"The schema is the single source of truth for everything."**

### Speaker Notes
"This is the killer differentiator. No state management framework today treats the schema as a planning language for agents. Redux has types. Zustand has selectors. Jotai has atoms. XState has statecharts. But none of them provide a single artifact that simultaneously serves as types, validation, planning language, transition constraint, selector generator, composition unit, and property specification. The agent reads ONE thing and knows: what the state looks like, what values are valid, what transitions are legal, what selectors exist, what invariants must hold, and what effects will fire."

---

---

# ACT IV — THE TRANSFORMATION

*Each slide in this act shows Maya and Axon re-encountering one of the earlier bugs — but this time, state-agent prevents it. The emotional arc is rising competence and control.*

---

## SLIDE 13: Impossible States, Made Impossible

### Story Point
*Return to the bug from Slide 5 — this time, the system prevents it.*

### Visual
The same code block from Slide 5 reappears, but now it dissolves and is replaced by a discriminated union schema:

```
| { status: 'idle' }
| { status: 'loading', startedAt: number }
| { status: 'success', data: User[], fetchedAt: number }
| { status: 'error', error: string, retryCount: number }
```

Axon's cursor tries to write `{ status: 'loading', data: [...] }`. A shield icon flashes — **rejected**. The error message appears, styled for agent consumption:

*"Mode transition rejected. Status is 'loading' but state has fields from mode 'success'. Did you mean to transition to 'success' first?"*

Axon reads the message, self-corrects, generates the right code. Green checkmark.

### Speaker Notes
"Remember the impossible state? Data AND loading AND error at the same time? With discriminated unions, that state is literally unrepresentable. The schema says: when status is 'loading', only `startedAt` exists. Period. The agent can't produce `data` in loading mode — Zod rejects it, TypeScript flags it. And if the agent tries? The error message is designed for self-correction. It tells the agent exactly what went wrong and what to do instead. No human intervention needed."

---

## SLIDE 14: Auto-Gates and Type Narrowing

### Story Point
*The power that emerges from modes — auto-derived gates and when conditions.*

### Visual
A split screen. Left: the discriminated union schema from the previous slide. Right: a React component tree. Between them, animated connections appear:

- `gates.idle` → controls mounting of `<EmptyState />`
- `gates.loading` → controls mounting of `<Spinner />`
- `gates.success` → controls mounting of `<UserList />`
- `gates.error` → controls mounting of `<ErrorMessage />`

The agent doesn't write any conditional logic. It writes:
```
<Gated store="users" gate="success">
  <UserList />
</Gated>
```

TypeScript narrows automatically inside each gated block. The visual shows type annotations shrinking from the full union to the specific variant.

### Speaker Notes
"And modes aren't just validation — they're infrastructure. The framework auto-derives gates for each mode. The agent doesn't write `if (status === 'success')` — it writes `<Gated gate='success'>`. Inside that block, TypeScript narrows the type automatically. The agent generates less code, and what it generates is correct by construction. Zero conditional logic. Zero bugs."

---

## SLIDE 15: Selectors That Write Themselves

### Story Point
*Return to the bug from Slide 6 — the performance crisis, now prevented.*

### Visual
The same diagram from Slide 6 reappears: store → components with fat red arrows (full-store subscription). Then a transformation animation: the fat arrows dissolve and are replaced by thin, precise green arrows — each component connected to a SINGLE path in the store via the selector tree.

A tree structure appears: `store.select.items`, `store.select.filter`, `store.select.items[n].done`. Each path is a pre-built, typed selector. The agent picks from the tree — no selector function to write.

Performance profiler below shows a flat, healthy flame graph. FPS counter: solid 60.

### Speaker Notes
"The selector problem? Gone. The framework generates a typed selector tree from the schema at store creation time. Instead of writing selector functions — which agents get wrong 80% of the time — the agent picks a path from the tree. `store.select.filter`. That's it. The subscription is automatically scoped to that path. Only re-renders when that path changes. The agent removed the decision entirely. No structural equality, no memoization, no understanding of React's rendering model required."

---

## SLIDE 16: The Transition Map

### Story Point
*Return to the bug from Slide 7 — the impossible checkout transition, now constrained.*

### Visual
The same state machine from Slide 7 reappears: `cart → shipping → payment → confirmed`. But now the arrows are solid, labeled, and directional — a proper state machine diagram derived from the `transitions` declaration.

Axon's cursor tries to create the backward arrow from `confirmed → cart`. A wall appears — the transition is not in the map. The structured warning appears:

*"Transition 'confirmed → cart' is not declared. Valid transitions from 'confirmed': ['confirmed → idle' (reset)]"*

The agent reads the warning. Queries `validTargets('confirmed')`. Generates the correct transition. Green checkmark.

Below, an introspection panel shows what the agent sees: a clean JSON of all valid transitions, queryable at runtime.

### Speaker Notes
"The checkout disaster? Now the agent can see the map before it writes a single line. Declared transitions constrain which state changes are valid. `confirmed` can only go to `idle` via reset. That's it. When the agent tries an invalid transition, it gets a structured error — designed for machine consumption, not human reading — that tells it exactly what's legal. The agent also has `validTargets()` — it can query the transition graph before generating code. It doesn't guess. It asks."

---

## SLIDE 17: Effects, Declared and Controlled

### Story Point
*Return to the bug from Slide 8 — the effect cascade, now tamed.*

### Visual
The tangled web from Slide 8 dissolves. In its place: a clean, organized panel alongside the store definition. Effects are listed as declarations:

```
effects:
  searchPosts → watches: 'search', debounce: 300ms
  reportError → watches: 'idle → error', retry: 3x exponential
```

Each effect has a status badge: `idle`, `running`, `debouncing`. An AbortController icon sits next to each one. When a new search fires, the previous one is automatically cancelled — shown by a "cancelled" badge fading out as a new "running" badge appears.

The API call counter from Slide 8 reappears: steady at 1-2 per second. Flat and healthy.

### Speaker Notes
"The effect chaos? Declared effects. Every side effect lives alongside the store — visible, auditable, controlled. Built-in debounce. Automatic cancellation via AbortSignal. Retry with backoff. No more scattered useEffects across seven components. No more duplicate fetches. No more infinite loops. The agent declares intent: 'when search changes, debounce 300ms, fetch'. The framework handles cleanup, cancellation, and error recovery."

---

## SLIDE 18: The Agent's Eye — Introspection API

### Story Point
*The unifying feature. The agent no longer reads files — it queries the system.*

### Visual
A dramatic visual: a stylized "eye" made of code, opening. Through the eye, the system is visible as a structured JSON:

```json
{
  stores: {
    auth: { modes: [...], validTransitions: [...], selectorPaths: [...] },
    posts: { effects: {...}, computed: [...], dependencies: {...} }
  }
}
```

On one side: "Before" — the agent reading scattered `.ts` files, grep-ing for types, parsing imports. Slow, fragile, incomplete.

On the other side: "After" — the agent makes a single `storeRegistry.introspect()` call and receives the complete runtime truth. Fast, accurate, queryable.

### Speaker Notes
"And this is where it all comes together. The Agent Introspection API. One function call — `storeRegistry.introspect()` — and the agent sees the entire system. Every store, its schema as JSON Schema, its current mode, valid transitions, selector paths, active effects, dependencies. Runtime truth, not file-level inference. This is the same format LLMs use for function calling. The agent doesn't read your code. It reads your contract."

---

## SLIDE 19: Composable State — The ECS Pattern

### Story Point
*The agent stops reinventing common patterns. It composes from a catalog.*

### Visual
Three "component" blocks float in space, each labeled: **Loadable**, **Paginated**, **Filterable**. Each block shows its schema fragment and auto-included conditions. They drift together, merge with a satisfying snap, and form a complete store:

```
postsStore = schema + Loadable + Paginated + Filterable
```

Below, a comparison: Left: "What agents generate from scratch" — 60 lines of reinvented loading/error/pagination logic with 4 marked bugs. Right: "What agents compose" — 8 lines using `composeStore`. Zero bugs.

### Speaker Notes
"Agents reinvent `isLoading, error, data` in every store. They reinvent pagination. Filtering. Selection. Every reinvention has subtle bugs. State components are a catalog of tested, composable schema fragments. Loadable, Paginated, Filterable, Selectable — each one carries pre-built conditions, gates, and computed values. The agent composes instead of generating from scratch. Eight lines instead of sixty. Zero bugs instead of four."

---

## SLIDE 20: Optimistic Updates — One Line

### Story Point
*The hardest pattern in state management, reduced to intent declaration.*

### Visual
An animated flow showing a todo item being toggled. Two timelines run in parallel:

**Timeline A — "Without state-agent"**: Agent generates snapshot logic, rollback logic, race condition handling, error recovery... 40 lines of fragile code. A red X appears at the end: "Concurrent operations break rebase."

**Timeline B — "With state-agent"**: Agent writes:
```
store.optimistic({ apply: ..., commit: ... })
```

The framework handles the snapshot → apply → commit → rollback/reconcile flow automatically. Green checkmarks at every step. A second optimistic operation arrives while the first is pending — the queue rebases correctly.

### Speaker Notes
"Optimistic updates are the second hardest pattern in state management, after cache invalidation. Agents almost never get rollback right. They never handle concurrent operations. With state-agent, the agent writes intent: apply this mutation immediately, then confirm it. The framework snapshots, applies, commits, and on failure — automatically rolls back and rebases any concurrent operations. The same strategy TanStack Query uses. Forty lines of fragile agent code replaced by three lines of intent."

---

## SLIDE 21: The Safety Net — Undo, Properties, Persistence

### Story Point
*The supporting features that make agent-driven development safe and production-ready.*

### Visual
Three panels, appearing in sequence:

**Panel 1 — Undo/Replay**: Axon generates a mutation. Checks the result. It's wrong. Calls `store.undo(1)`. State reverts. Axon tries again. Gets it right. A caption: *"Agents are probabilistic. Give them a safety net."*

**Panel 2 — Property Checking**: An invariant is declared: `"Total items must equal sum of categories."` After a mutation, the property checker runs. Violation detected. Developer warning in console. Caption: *"Catch semantic bugs the type system can't see."*

**Panel 3 — Persistence**: A store with `persist: { key: 'settings' }`. Browser refreshes. State survives. Schema version changes. Migration runs automatically. Caption: *"One line to survive page reloads. Versioned, validated, zero boilerplate."*

### Speaker Notes
"Three features that make the system production-ready. Undo: agents are probabilistic — they sometimes generate wrong mutations. Undo gives them a safety net to try, check, and revert. Property checking: invariants that catch semantic bugs the type system can't see — like 'total must equal sum of categories.' And persistence: one config line and the store survives page reloads, with schema migrations built in. No custom localStorage code. No versioning bugs."

---

## SLIDE 22: Cross-Store Communication — Pub/Sub

### Story Point
*Stores talk to each other declaratively. No more invisible useEffect chains.*

### Visual
Two stores represented as distinct nodes: `auth` and `posts`. Between them, a clean publish/subscribe channel. When `auth` transitions to `authenticated`, it publishes an event. `posts` receives it and starts fetching. The visual is clean, directional, explicit.

Below, the introspection API shows the event graph — a topology of which stores publish what, and who subscribes.

Contrast with: the tangled web from Slide 8. Same coordination, different implementation. Chaos vs. clarity.

### Speaker Notes
"Finally — cross-store coordination. Instead of invisible useEffect chains watching auth state from seven components, stores declare what events they publish and what events they subscribe to. Auth publishes 'authenticated'. Posts subscribes to 'auth.authenticated' and starts fetching. Declarative. Visible. Introspectable. The event graph is queryable — the agent can see the entire communication topology before generating a single line of coordination code."

---

---

# ACT V — THE NEW WORLD

---

## SLIDE 23: Maya and Axon, Reunited

### Story Point
*Return to the heroes. Show the new working relationship. The emotional payoff.*

### Visual
A reprise of Slide 2's composition, but transformed. Maya is at her desk, but relaxed. Confident. The monitors show clean dashboards, green CI builds, a shipped product. Axon's cursor is still generating code — but now each line is checked against the schema contract. A visual "contract handshake" icon sits between Maya and Axon.

The velocity chart from Slide 4 reappears — but this time the growth continues upward, past the original crash point, without dipping.

Small callouts show: "0 impossible state bugs", "60fps sustained", "0 invalid transitions in production."

### Speaker Notes
"Maya ships the dashboard. On time. The checkout flow has zero impossible state bugs. The performance profiler stays flat at 60fps. No more 2am rollbacks. The relationship between Maya and Axon has changed. She doesn't write state management code. She defines the contract — the schema, the modes, the transitions, the invariants. Axon queries the contract and generates code that conforms to it. Maya reviews for intent. Axon executes with constraints. The velocity is real this time — because the bugs aren't."

---

## SLIDE 24: The Priority Roadmap

### Story Point
*Ground the vision in reality. Show the implementation path.*

### Visual
A four-tier pyramid, building from bottom to top:

**Tier 1 (base — "Ship first")**: State Modes · Auto-Selectors · Introspection API · Property Checking
*"High impact, manageable effort, low risk. Independent. Parallelizable."*

**Tier 2**: Optimistic Updates · Transition Graphs · State Components · Persistence
*"High impact, higher effort. Build on Tier 1 foundations."*

**Tier 3**: Effect Declarations · Cross-Store Pub/Sub · History Undo · Schema Migrations
*"Selective based on demand. All valuable, none are blockers."*

**Tier 4 (apex)**: Component Binding Contracts
*"Re-evaluate after Tier 1-3. Introspection provides 80% of the value at 20% of the cost."*

Each tier glows as it's discussed. Performance budget metrics appear alongside: `<5ms store creation · <1ms mutations · <2KB per feature`.

### Speaker Notes
"Here's how we build it. Four tiers, ordered by agent impact versus effort versus risk. Tier 1 ships first — four independent features that can be built in parallel. Each one eliminates a class of agent bug. Tier 2 builds on top. Tier 3 is selective. Every feature is opt-in, tree-shakeable, and must stay within the performance budget: under 5ms for store creation, under 1ms for mutations, under 2KB gzipped per feature. No feature bloat. No mandatory costs."

---

## SLIDE 25: The Closing — A Contract, Not Code

### Story Point
*The final statement. The thesis crystallized. Call to action.*

### Visual
Return to the dark background from Slide 1. The terminal cursor blinks again. But this time, it types the closing line:

**"Don't teach the agent your codebase. Give it a contract."**

Below, the seven spokes from Slide 12 reappear — the schema radiating its seven capabilities — but smaller, like a logo mark.

Final line fades in:

**state-agent** — *Schema-first state management for the agentic era.*

GitHub repo link. Star count. npm install command.

### Speaker Notes
"Every other framework optimizes for developer ergonomics — less boilerplate, better devtools. state-agent optimizes for generation accuracy — fewer valid-looking-but-wrong outputs. These are different design objectives that lead to different API surfaces. Any framework can add TypeScript types. No framework treats the schema as a planning language with transitions, invariants, and auto-selectors built in. That's the moat. That's the differentiator. Don't teach the agent your codebase. Give it a contract. And let it build."

*[End]*

---

---

# APPENDIX: Production Notes

## Pacing Guide

| Slide Range | Duration | Energy Level |
|-------------|----------|-------------|
| 1–4 (The Promise) | 3 min | High, fast |
| 5–9 (The Fracture) | 5 min | Building tension, slow down at crisis |
| 10–12 (The Insight) | 3 min | Thoughtful, pivotal |
| 13–22 (The Transformation) | 10 min | Rising energy, demo-ready |
| 23–25 (The New World) | 3 min | Confident, closing |
| **Total** | **~24 min** | |

## Visual Design Direction

- **Color palette**: Dark backgrounds (near-black), with accent colors — electric blue for Axon/agent, warm amber for Maya/human, red for bugs/failures, green for solutions/checkmarks.
- **Typography**: Monospace for code blocks and agent "voice". Clean sans-serif for narrative text. Large, cinematic text for key thesis statements (Slides 10, 25).
- **Animation philosophy**: Purposeful transitions that serve the story. Code blocks "type" themselves. Bugs pulse red. Solutions click into place. Avoid gratuitous motion.
- **Illustrations**: Stylized, not photorealistic. Think Stripe/Linear design language — geometric, clean, with depth via subtle gradients. Maya is represented consistently but simply (avatar, not detailed portrait). Axon is always abstract — light, cursor, flowing code.

## Recurring Visual Motifs

| Motif | Meaning | Appears in |
|-------|---------|------------|
| Glowing terminal cursor | Axon — the agent | Slides 1, 3, 13, 16, 25 |
| Red pulse / distortion | Bug, violation, failure | Slides 5, 6, 7, 8 |
| Shield / wall | Schema constraint blocking invalid state | Slides 13, 16 |
| Green checkmark | Correct generation, passing validation | Slides 4, 13, 14, 15, 16, 20 |
| Seven-spoke diagram | Schema as world model | Slides 12, 25 |
| Velocity chart | Team productivity | Slides 4, 9, 23 |

## Key Audience Takeaways (One Per Act)

1. **The Promise**: AI agents are a real multiplier for frontend development velocity.
2. **The Fracture**: State management is where agents systematically fail — impossible states, over-subscription, invalid transitions, effect chaos.
3. **The Insight**: The root cause is inference. The solution is a queryable contract.
4. **The Transformation**: state-agent makes the schema the single source of truth — types, validation, transitions, selectors, effects, composition, and invariants in one artifact.
5. **The New World**: The agent doesn't read code. It reads a contract. And the code it generates is correct by construction.
