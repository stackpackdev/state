# Agent Demo Plan: Making state-agent's Value Undeniable

## The Problem With the Current Demo

The conference app proves state-agent works but doesn't show why it exists. The AI chat is just a chat box that sends prompts to Claude — it doesn't read stores, doesn't use introspection, doesn't have actor attribution, and doesn't need permissions. You could swap it for Zustand and nothing would change.

## The Demo Concept: "The AI That Knows Your App"

One screen. Split view. Left side is a normal app. Right side is a live panel showing exactly what the AI agent sees, thinks, and does to your state — in real time.

The user watches the AI **read their state through introspection, reason about what to change, check its own permissions, make attributed mutations, and get blocked when it tries something it shouldn't**. Every step is visible.

This is not a chatbot. This is a visible, transparent agent operating on app state with guardrails.

---

## The Visual: What People See in a 60-Second Video

### Frame 1: The App (3 seconds)
A simple todo app. Some items, a filter, nothing special. Bottom-right corner: a small "AI Assistant" button with a subtle pulse.

### Frame 2: User Asks the AI (5 seconds)
User types: "Clean up my todos — archive anything completed more than a week ago"

### Frame 3: The Panel Opens (the money shot — 40 seconds)

The right side slides open. It's not a chat response. It's a **live agent trace** with three lanes:

```
┌─────────────────────────────┬──────────────────────────────────┐
│                             │  AGENT TRACE                     │
│                             │                                  │
│   ☐ Buy groceries           │  ▸ INTROSPECT                    │
│   ☐ Fix bike                │    storeRegistry.introspect()    │
│   ✓ Clean garage (8d ago)  │    Found: todos store            │
│   ✓ Email taxes (12d ago)  │    Schema: { items, filter }     │
│   ✓ Book flights (3d ago)  │    Gates: hasItems ✓             │
│   ☐ Call dentist            │    Computed: activeCount = 3     │
│                             │                                  │
│                             │  ▸ READ STATE                    │
│                             │    5 items, 3 completed          │
│                             │    "Clean garage" — done 8d ago  │
│                             │    "Email taxes" — done 12d ago  │
│                             │    "Book flights" — done 3d ago  │
│                             │                                  │
│                             │  ▸ PLAN                          │
│                             │    Archive 2 items (>7 days)     │
│                             │    Keep "Book flights" (3 days)  │
│                             │                                  │
│                             │  ▸ CHECK PERMISSIONS             │
│                             │    canAct(agent, 'delete',       │
│                             │      'todos.items') → ✗ DENIED  │
│                             │    canAct(agent, 'write',        │
│                             │      'todos.items') → ✓ OK      │
│                             │                                  │
│                             │  ▸ MUTATE                        │
│   ☐ Buy groceries           │    store.update(draft => {       │
│   ☐ Fix bike                │      draft.items[2].archived=true│
│   ✓ Book flights (3d ago)  │      draft.items[3].archived=true│
│   ☐ Call dentist            │    }, agentActor)                │
│                             │                                  │
│                             │  ▸ VERIFY                        │
│                             │    activeCount: 3 (unchanged)    │
│                             │    2 items archived               │
│                             │    Actor: ai-assistant            │
│                             │                                  │
│                             │  ✓ Done. 2 items archived.       │
└─────────────────────────────┴──────────────────────────────────┘
```

**What's happening visually:**
- Each step animates in sequentially (200ms stagger)
- The introspection step shows the schema tree expanding
- The permission check shows a red flash on DENIED, green on OK
- The mutation step highlights the items on the left that change
- Items fade out of the list in sync with the mutation step
- The actor badge "ai-assistant" pulses on the archived items

### Frame 4: The Permission Block (10 seconds)

User types: "Delete all my todos"

The trace shows:
```
▸ CHECK PERMISSIONS
  canAct(agent, 'delete', 'todos.items') → ✗ DENIED

▸ BLOCKED
  "I can archive items but I'm not permitted to delete them.
   Would you like me to archive everything instead?"
```

The DENIED step flashes red. The agent explains itself. The user sees **the guardrail working in real time**.

### Frame 5: The Attribution Log (5 seconds)

A small "History" tab at the bottom shows:
```
10:42:01  user      added "Call dentist"
10:42:15  user      completed "Book flights"
10:43:22  ai-assist archived "Clean garage"      ← highlighted differently
10:43:22  ai-assist archived "Email taxes"        ← highlighted differently
```

Human actions and AI actions are visually distinct. You can see exactly what the AI did.

---

## Why This Works as a Video

1. **No reading required** — The split-view layout tells the story visually. Left = your app. Right = what the AI sees and does.

2. **The permission block is the climax** — People understand "AI tried to delete, got blocked" instantly. That's the whole pitch in one frame.

3. **Attribution is the denouement** — The history log with two colors (human/AI) is immediately legible. "Oh, I can always see what the AI changed."

4. **60 seconds total** — Short enough for Twitter/LinkedIn. No narration needed, just on-screen text.

---

## Implementation Plan

### What to build

A new demo app (or a mode in the existing one) with 4 components:

#### 1. The App (left panel)
A minimal todo app. Not the conference app — too complex to grok in a video. Todos are universally understood.

- Simple list with checkboxes
- Filter tabs (All / Active / Done)
- Items show completion date
- Archived items fade out with animation (presence tracker)

**State:**
```typescript
const todosStore = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({
      id: z.string(),
      text: z.string(),
      done: z.boolean(),
      completedAt: z.number().nullable(),
      archived: z.boolean(),
    })),
    filter: z.enum(['all', 'active', 'done']),
  }),
  when: {
    isEmpty: (s) => s.items.filter(i => !i.archived).length === 0,
    isFiltered: (s) => s.filter !== 'all',
    hasCompleted: (s) => s.items.some(i => i.done && !i.archived),
  },
  gates: {
    hasItems: (s) => s.items.filter(i => !i.archived).length > 0,
  },
  computed: {
    activeCount: (s) => s.items.filter(i => !i.done && !i.archived).length,
    completedCount: (s) => s.items.filter(i => i.done && !i.archived).length,
    archivedCount: (s) => s.items.filter(i => i.archived).length,
  },
  persist: { key: 'sa-demo-todos', debounceMs: 100 },
  undo: { limit: 20 },
})
```

#### 2. The Agent Trace Panel (right panel)
A vertical timeline that shows each agent step as it happens.

**Steps rendered as cards:**
- **INTROSPECT** — Shows store names, schema shape, current gates/computed. Animated tree expansion.
- **READ** — Shows relevant state values. Items highlighted on the left.
- **PLAN** — Shows what the agent intends to do. Plain English.
- **PERMISSIONS** — Shows `canAct()` calls with green checkmark or red X. Red flashes on denial.
- **MUTATE** — Shows the code-like mutation. Items on the left animate simultaneously.
- **VERIFY** — Shows post-mutation computed values. Confirms what changed.

Each card has:
- An icon (magnifying glass, eye, brain, shield, pencil, checkmark)
- A timestamp
- Expandable detail (click to see raw data)
- Color coding (blue for read, yellow for plan, red/green for permissions, purple for mutate)

#### 3. The History Bar (bottom)
A horizontal scrolling log of all mutations. Each entry shows:
- Timestamp
- Actor (user/AI with distinct colors)
- Action summary ("added todo", "archived 2 items")
- Click to expand shows the full action object

#### 4. The Agent Engine (not visible)
The actual AI that processes user requests. This runs locally and uses the introspection API.

**Not an LLM call.** For the demo, this should be a scripted agent that:
1. Calls `storeRegistry.introspect()` to get the system description
2. Reads relevant state via `store.getState()`
3. Plans mutations based on the user's request
4. Checks permissions via `canAct()`
5. Executes mutations with `store.update(fn, agentActor)`
6. Verifies via computed values

For a production version, swap the scripted engine for an LLM that receives the introspection output as context and generates mutations. But for the video demo, scripted is better — it's deterministic, fast, and doesn't need an API key.

### Architecture

```
┌─────────────────────────────────────────────┐
│ App Shell (split layout)                     │
├────────────────────┬────────────────────────┤
│ TodoApp            │ AgentTracePanel         │
│ - reads from store │ - subscribes to agent   │
│ - user mutations   │   event emitter         │
│ - presence tracker │ - renders step cards    │
│   for animations   │ - animates sequentially │
├────────────────────┴────────────────────────┤
│ HistoryBar                                   │
│ - store.getHistory() → colored timeline      │
└─────────────────────────────────────────────┘

AgentEngine (non-visual)
├── introspect: storeRegistry.introspect()
├── read: store.getState()
├── plan: deterministic rules (or LLM)
├── check: canAct(agent, action, path)
├── mutate: store.update(fn, agentActor)
├── verify: store.computed('activeCount')
└── emits: step events → AgentTracePanel
```

### The Agent Event Protocol

The agent engine emits events that the trace panel renders:

```typescript
type AgentStep =
  | { type: 'introspect'; stores: string[]; schema: object; gates: Record<string, boolean>; computed: Record<string, unknown> }
  | { type: 'read'; data: unknown; highlights: string[] }
  | { type: 'plan'; description: string; actions: string[] }
  | { type: 'permission_check'; actor: string; action: string; path: string; allowed: boolean }
  | { type: 'mutate'; code: string; affectedPaths: string[] }
  | { type: 'verify'; computed: Record<string, unknown>; summary: string }
  | { type: 'blocked'; reason: string; suggestion: string }
  | { type: 'complete'; summary: string }
```

### Scripted Scenarios (for the video)

**Scenario 1: "Clean up old completed todos"**
1. Introspect → discover todos store
2. Read → find 3 completed items with timestamps
3. Plan → archive 2 items older than 7 days, keep 1 recent
4. Check permissions → write allowed, delete denied
5. Mutate → archive 2 items (presence tracker fades them out)
6. Verify → activeCount unchanged, archivedCount +2

**Scenario 2: "Delete all my todos" (permission block)**
1. Introspect → discover todos store
2. Read → find all items
3. Plan → delete all items
4. Check permissions → delete DENIED
5. Blocked → suggest archiving instead
6. (User approves)
7. Mutate → archive all completed items

**Scenario 3: "Undo what the AI just did"**
1. User clicks undo
2. History shows: undo 2 archive operations (actor: ai-assistant)
3. Items fade back in (presence tracker)
4. Attribution: undo by user, original action by AI

---

## Video Production Notes

### Style
- Dark theme (matches existing website)
- Monospace font for the trace panel
- Smooth animations (60fps, motion library)
- No narration — text captions only
- Music: subtle, electronic, builds with each step

### Timing
- 0-3s: Show the app, some todos
- 3-8s: User types request
- 8-35s: Agent trace plays out step by step
- 35-45s: Permission block scenario
- 45-55s: History bar with attribution
- 55-60s: Tagline: "state-agent — state management AI agents can see"

### Key Visual Moments (screenshot-worthy)
1. The schema tree expanding in the introspect step
2. The red DENIED flash on the permission check
3. Items fading out on the left synchronized with the mutation card
4. The two-color history bar (human blue, AI purple)

---

## What This Demo Proves

| Zustand/Jotai | state-agent |
|---|---|
| AI has no way to discover your state shape at runtime | `storeRegistry.introspect()` returns the complete schema |
| No concept of "who changed this" | Every mutation has an actor (human/agent/system) |
| No permission model for AI access | `canAct(agent, 'write', 'todos.items')` — path-level control |
| No way to audit AI mutations | `getHistory()` returns attributed action log |
| AI must parse source code to understand state | Introspection API gives structured runtime metadata |
| Agents can write any state, no guardrails | Schema validation + permissions = safe agent mutations |

---

## Stretch Goals (Not for v1 Video)

1. **Impact analysis visualization** — Before the AI mutates, show `impactOf('todos')` as a node graph. "If I change this, these 3 components re-render."

2. **Live schema diff** — When the AI archives items, show the schema validation passing in real time (green checkmarks on each field).

3. **Multi-agent scenario** — Two AI agents with different permissions. One can write items, the other can only read. Show the read-only agent getting blocked.

4. **LLM-powered mode** — Replace the scripted agent with a real Claude call that receives introspection output as system prompt. The AI figures out the mutations from the schema alone.

5. **Undo/redo visualization** — Show the snapshot stack growing and shrinking as the user undoes AI actions.

6. **When/Gates live panel** — Show all conditions updating in real time as state changes. `hasCompleted` flips from true to false when the last completed item is archived.
