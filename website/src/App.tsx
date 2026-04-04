import React from 'react'

export function App() {
  return (
    <>
      <Nav />
      <Hero />
      <Problem />
      <Benchmark />
      <CoreConcepts />
      <DependencyGraph />
      <HowItWorks />
      <CodeShowcase />
      <Roadmap />
      <Footer />
    </>
  )
}

/* ─────────────────────────────────────────────
   Nav
   ───────────────────────────────────────────── */

function Nav() {
  return (
    <nav>
      <div className="container">
        <a href="#" className="nav-logo">
          <span>state</span>-agent
        </a>
        <ul className="nav-links">
          <li><a href="#problem">Problem</a></li>
          <li><a href="#benchmark">Benchmark</a></li>
          <li><a href="#concepts">Concepts</a></li>
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#roadmap">Roadmap</a></li>
        </ul>
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────── */

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-badge">
          <span className="dot" />
          AI-native state management
        </div>

        <h1>
          State designed for how<br />
          <span className="highlight">agents actually reason</span>
        </h1>

        <p className="hero-sub">
          An AI agent analyzing your React app makes 96 decisions about where state lives,
          how it connects, and what it affects. state-agent reduces that to 22.
        </p>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="number green">77%</div>
            <div className="label">Fewer decisions</div>
          </div>
          <div className="hero-stat">
            <div className="number accent">2.7x</div>
            <div className="label">Signal density</div>
          </div>
          <div className="hero-stat">
            <div className="number cyan">0</div>
            <div className="label">Co-mutation bugs</div>
          </div>
          <div className="hero-stat">
            <div className="number orange">O(1)</div>
            <div className="label">Impact analysis</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Problem
   ───────────────────────────────────────────── */

function Problem() {
  return (
    <section className="problem-section" id="problem">
      <div className="container">
        <div className="section-label">The Problem</div>
        <h2 className="section-title">React state was designed<br />for humans typing code</h2>
        <p className="section-desc">
          When an AI agent generates a React app, it faces the same ambiguity a junior developer
          does — but at 100x speed with zero intuition. Every <code>useState</code> is an
          isolated island. Every shared value is a guess. The agent can't trace what breaks
          when something changes without scanning every file.
        </p>

        <div className="comparison">
          <div className="comparison-card before">
            <h3>Without state-agent</h3>
            <div className="comparison-item">
              <span className="icon">&#10005;</span>
              <span>96 independent decisions about state placement across 12 components</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10005;</span>
              <span>Signal-to-noise ratio of 35% — most state code is boilerplate</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10005;</span>
              <span><code>isLoading</code> duplicated in 10 places across 5 files — which one?</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10005;</span>
              <span>Changing auth requires scanning 23 inspection points to find blast radius</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10005;</span>
              <span>9 co-mutation risks where related state can drift out of sync</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10005;</span>
              <span>No way to know if toggling a boolean causes a CSS change or a mount cascade</span>
            </div>
          </div>

          <div className="comparison-card after">
            <h3>With state-agent</h3>
            <div className="comparison-item">
              <span className="icon">&#10003;</span>
              <span>22 decisions — stores pre-grouped by consumption patterns</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10003;</span>
              <span>100% signal — every line describes state shape, gates, or dependencies</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10003;</span>
              <span>3 canonical lookups: <code>auth.isLoading</code>, <code>todos.isLoading</code>, <code>posts.isLoading</code></span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10003;</span>
              <span><code>registry.impactOf('auth')</code> — one call returns the full blast radius</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10003;</span>
              <span>0 co-mutation risks — related state lives in one store</span>
            </div>
            <div className="comparison-item">
              <span className="icon">&#10003;</span>
              <span><code>when</code> = style change, <code>gate</code> = mount/unmount — always explicit</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Benchmark
   ───────────────────────────────────────────── */

function Benchmark() {
  return (
    <section id="benchmark">
      <div className="container">
        <div className="section-label">Benchmark</div>
        <h2 className="section-title">Measured on a real app.<br />Not a marketing claim.</h2>
        <p className="section-desc">
          Numbers from running state-agent against a 12-component React app with auth,
          API data, forms, dashboard, and navigation — the patterns every real app has.
        </p>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--green)' }}>96 → 22</div>
            <div className="metric-change good">↓ 77% reduction</div>
            <div className="metric-label">Agent decisions</div>
            <div className="metric-desc">
              State placement, sharing patterns, naming, and co-location decisions
              the agent no longer needs to make.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--accent)' }}>2.7x</div>
            <div className="metric-change good">35% → 100% signal</div>
            <div className="metric-label">Signal density</div>
            <div className="metric-desc">
              Ratio of meaningful state declarations to total state-related code.
              No boilerplate, no ceremony.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--cyan)' }}>52%</div>
            <div className="metric-change good">23 → 11 lookups</div>
            <div className="metric-label">Impact analysis reduction</div>
            <div className="metric-desc">
              Points an agent must inspect to understand the blast radius of
              changing a single store value.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--orange)' }}>9 → 0</div>
            <div className="metric-change good">↓ 100% eliminated</div>
            <div className="metric-label">Co-mutation risks</div>
            <div className="metric-desc">
              Places where related state (user + isAuthenticated, items + filter)
              could drift out of sync. Eliminated by consumption grouping.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--red)' }}>70–80%</div>
            <div className="metric-change good">7–8 of 10 bugs prevented</div>
            <div className="metric-label">State bug prevention</div>
            <div className="metric-desc">
              Common state bugs (stale closures, missing resets, sync drift)
              that are structurally impossible with state-agent.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--yellow)' }}>2 → 0</div>
            <div className="metric-change good">↓ 100% eliminated</div>
            <div className="metric-label">Type duplications</div>
            <div className="metric-desc">
              Duplicate type definitions that can diverge silently. Each store
              has one source-of-truth schema.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Core Concepts
   ───────────────────────────────────────────── */

function CoreConcepts() {
  return (
    <section id="concepts">
      <div className="container">
        <div className="section-label">Core Concepts</div>
        <h2 className="section-title">Five ideas. That's the whole API.</h2>
        <p className="section-desc">
          state-agent is built on five mechanical principles that let any agent — or developer —
          understand the entire state architecture of an app by reading store definitions alone.
        </p>

        <div className="concepts-grid">
          {/* Consumption Grouping */}
          <div className="concept-card">
            <div className="concept-icon purple">&#8644;</div>
            <h3>Consumption Grouping</h3>
            <p>
              State that's read by the same component belongs in the same store.
              Not by name similarity — by actual consumption. Two components with
              <code> isLoading</code> stay separate if they never render together.
            </p>
            <div className="concept-code">
              <pre>{cConsumption}</pre>
            </div>
          </div>

          {/* When vs Gate */}
          <div className="concept-card">
            <div className="concept-icon green">&#9881;</div>
            <h3>When vs Gate</h3>
            <p>
              <code>when</code> conditions change styles — the component stays mounted.
              <code> gate</code> conditions control mounting — the component tree appears or
              disappears. This distinction tells the agent the exact cost of any boolean flip.
            </p>
            <div className="concept-code">
              <pre>{cWhenGate}</pre>
            </div>
          </div>

          {/* Hierarchical Flow */}
          <div className="concept-card">
            <div className="concept-icon yellow">&#9776;</div>
            <h3>Hierarchical Flow</h3>
            <p>
              Navigation isn't flat. Flows are trees with path-based addressing.
              An agent can jump to any visibility state with a single path lookup instead
              of traversing the component tree.
            </p>
            <div className="concept-code">
              <pre>{cFlow}</pre>
            </div>
          </div>

          {/* Dependency Graph */}
          <div className="concept-card">
            <div className="concept-icon red">&#10140;</div>
            <h3>Dependency Graph</h3>
            <p>
              Every store declares what it reads, what gates it, and what it triggers.
              <code> registry.impactOf('auth')</code> returns the complete blast radius
              of any change — no component scanning required.
            </p>
            <div className="concept-code">
              <pre>{cDeps}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Dependency Graph Demo
   ───────────────────────────────────────────── */

function DependencyGraph() {
  return (
    <section>
      <div className="container">
        <div className="section-label">Impact Analysis</div>
        <h2 className="section-title">One function call.<br />Full blast radius.</h2>
        <p className="section-desc">
          When an agent plans a mutation, it needs to know every downstream effect before
          writing a single line. The dependency graph makes this a graph traversal, not a codebase scan.
        </p>

        <div className="impact-demo">
          <div className="impact-query">
            <span>registry</span>.impactOf(<span>'auth'</span>)
          </div>
          <div className="impact-result">
            <div className="impact-col">
              <h4>Gated Stores</h4>
              <div className="impact-item gated">dashboard</div>
              <div className="impact-item gated">todos</div>
              <div className="impact-item gated">posts</div>
            </div>
            <div className="impact-col">
              <h4>Triggered Refreshes</h4>
              <div className="impact-item triggered">todos → refetch</div>
              <div className="impact-item triggered">posts → refetch</div>
            </div>
            <div className="impact-col">
              <h4>Transitive Impact</h4>
              <div className="impact-item reads">dashboard-stats</div>
              <div className="impact-item reads">(gated by dashboard)</div>
            </div>
          </div>
        </div>

        <div className="two-col" style={{ marginTop: 48 }}>
          <div className="two-col-text">
            <h3>Path Schemas</h3>
            <p>
              Every store exposes a schema that lets the agent enumerate every valid mutation
              path without parsing TypeScript or executing code.
            </p>
            <ul>
              <li>Type of every path known statically</li>
              <li>Nullable fields marked explicitly</li>
              <li>Array item shapes included</li>
              <li>Agent validates its own mutations before executing</li>
            </ul>
          </div>
          <div className="code-block">
            <div className="code-header">
              <div className="code-dots">
                <span /><span /><span />
              </div>
              <span className="code-filename">todos.ts — pathSchema</span>
            </div>
            <div className="code-content">
              <pre>{cSchema}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   How It Works
   ───────────────────────────────────────────── */

function HowItWorks() {
  return (
    <section id="how-it-works">
      <div className="container">
        <div className="section-label">How It Works</div>
        <h2 className="section-title">From scattered state to<br />a traversable graph</h2>
        <p className="section-desc">
          Point state-agent at your codebase. It analyzes every component's state consumption,
          builds a bipartite graph, and generates stores that match how your app actually works.
        </p>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>
            <h3>Analyze</h3>
            <p>
              Scans every component for <code>useState</code>, <code>useReducer</code>,
              props, and context reads. Maps which state variables are consumed together
              by the same component.
            </p>
          </div>
          <div className="step">
            <div className="step-number">02</div>
            <h3>Group</h3>
            <p>
              Builds a bipartite graph (components ↔ state variables) and runs union-find
              to discover consumption groups. State that's read together lives together.
              Same-named state in unrelated components stays separate.
            </p>
          </div>
          <div className="step">
            <div className="step-number">03</div>
            <h3>Generate</h3>
            <p>
              Emits typed stores with <code>when</code> predicates, <code>gate</code> conditions,
              dependency metadata, path schemas, and hierarchical flows. Everything an agent
              needs to traverse and mutate state — in the store definition itself.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Code Showcase
   ───────────────────────────────────────────── */

function CodeShowcase() {
  return (
    <section>
      <div className="container">
        <div className="section-label">Generated Output</div>
        <h2 className="section-title">What the agent sees</h2>
        <p className="section-desc">
          This is a real store generated by <code>state-agent init</code> on a 12-component
          React app. Every piece of metadata exists to eliminate agent guesswork.
        </p>

        <div className="code-block" style={{ maxWidth: 680 }}>
          <div className="code-header">
            <div className="code-dots">
              <span /><span /><span />
            </div>
            <span className="code-filename">src/state/auth.ts</span>
          </div>
          <div className="code-content">
            <pre>{cAuthStore}</pre>
          </div>
        </div>

        <div className="arch-visual" style={{ marginTop: 32, maxWidth: 680 }}>
          <div className="arch-row">
            <span className="arch-label">name</span>
            <span className="arch-value">'auth'</span>
            <span className="arch-tag flow">identity</span>
          </div>
          <div className="arch-row">
            <span className="arch-label">when</span>
            <span className="arch-value">isLoading → style-edge (cheap)</span>
            <span className="arch-tag when">when</span>
          </div>
          <div className="arch-row">
            <span className="arch-label">gates</span>
            <span className="arch-value">isAuthenticated → mount-edge (expensive)</span>
            <span className="arch-tag gate">gate</span>
          </div>
          <div className="arch-row">
            <span className="arch-label">gates</span>
            <span className="arch-value">isGuest → mount-edge (inverse)</span>
            <span className="arch-tag gate">gate</span>
          </div>
          <div className="arch-row">
            <span className="arch-label">schema</span>
            <span className="arch-value">user{'{id, name, email}'} | isAuthenticated | isLoading</span>
            <span className="arch-tag dep">typed</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Roadmap
   ───────────────────────────────────────────── */

function Roadmap() {
  return (
    <section id="roadmap">
      <div className="container">
        <div className="section-label">Roadmap</div>
        <h2 className="section-title">What's next</h2>
        <p className="section-desc">
          state-agent is designed to evolve with the AI-native frontend stack.
          Every optimization is chosen for how much it reduces agent reasoning cost.
        </p>

        <div className="roadmap-grid">
          <div className="roadmap-card done">
            <div className="priority done">Shipped</div>
            <h4>Zod Schemas</h4>
            <p>
              Universal schema standard that works with every AI toolchain.
              Type safety is machine-verifiable. Import <code>z</code> directly from <code>state-agent</code>.
            </p>
          </div>
          <div className="roadmap-card done">
            <div className="priority done">Shipped</div>
            <h4>Co-located Single-File Stores</h4>
            <p>
              <code>defineStore</code> puts schema, types, conditions, and computed values
              in one file. Agent reads one file to know everything about a store.
            </p>
          </div>
          <div className="roadmap-card done">
            <div className="priority done">Shipped</div>
            <h4>Declarative Data Fetching</h4>
            <p>
              <code>createFetcher</code> and <code>useFetch</code> — declare what data
              a store needs with built-in loading, error, cache, and Zod validation.
            </p>
          </div>
          <div className="roadmap-card done">
            <div className="priority done">Shipped</div>
            <h4>{'<Gated>'} + {'<Presence>'}</h4>
            <p>
              <code>{'<Gated>'}</code> for immediate mount/unmount. <code>{'<Presence>'}</code> for
              animated enter/leave with deferred unmounting — the 5th primitive.
            </p>
          </div>
          <div className="roadmap-card">
            <div className="priority p1">P1 — Next</div>
            <h4>Signal-Based Reactivity</h4>
            <p>
              Fine-grained updates without re-renders. Aligns with TC39 Signals proposal,
              Svelte 5 Runes, and SolidJS — the direction the ecosystem is moving.
            </p>
          </div>
          <div className="roadmap-card">
            <div className="priority p1">P1 — Next</div>
            <h4>state-agent verify</h4>
            <p>
              Continuous validation that component usage matches store definitions.
              Catches drift between what the store declares and what components actually do.
            </p>
          </div>
          <div className="roadmap-card">
            <div className="priority p2">P2 — Soon</div>
            <h4>AGENTS.md Generation</h4>
            <p>
              Auto-generate state architecture documentation in the AGENTS.md format.
              Any AI agent can read the state graph without running code.
            </p>
          </div>
          <div className="roadmap-card">
            <div className="priority p2">P2 — Soon</div>
            <h4>MCP Server</h4>
            <p>
              Expose state-agent as a Model Context Protocol server. AI agents query
              the state graph, run impact analysis, and validate mutations through a
              standard tool interface.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Footer
   ───────────────────────────────────────────── */

function Footer() {
  return (
    <footer>
      <div className="container">
        <p>
          state-agent is open source. Built for AI-native frontend development.
        </p>
      </div>
    </footer>
  )
}


/* ═════════════════════════════════════════════
   Code Strings (syntax-highlighted via spans)
   ═════════════════════════════════════════════ */

const cConsumption = `// TodoList reads: items, filter, isLoading
// PostList reads: posts, isLoading
//
// Same "isLoading" name — but never read
// by the same component. Two separate stores.
//
// Dashboard reads: tasks, filter
// → tasks + filter grouped into dashboardStore
//   (consumed together by one component)`

const cWhenGate = `when: {
  // Style-edge: component stays mounted
  // Toggling this = re-render, CSS change
  isLoading: (state) => state.isLoading,
},

gates: {
  // Mount-edge: component tree mounts/unmounts
  // Toggling this = lifecycle, data fetching
  isAuthenticated: (state) => state.user !== null,
}`

const cFlow = `{
  name: 'app',
  mode: 'separate',  // one active at a time
  states: ['Home', 'Posts', 'Dashboard'],
  initial: 'Home',
  children: {
    Dashboard: {
      name: 'dashboard',
      mode: 'separate',
      states: ['Overview', 'Settings'],
      initial: 'Overview',
    }
  }
}
// flow.go('/Dashboard/Settings')
// flow.activeChain()
// → ['app/Dashboard', 'dashboard/Overview']`

const cDeps = `dependencies: {
  reads: [],             // stores we read from
  gatedBy: ['auth'],     // won't mount until auth gate passes
  triggers: ['auth'],    // re-fetches when auth changes
}

// registry.impactOf('auth') →
// { gatedStores: ['dashboard', 'todos', 'posts'],
//   triggeredStores: ['todos', 'posts'],
//   transitiveGates: ['dashboard-stats'] }`

const cSchema = `pathSchema: {
  'data':        { type: 'any', nullable: true },
  'isLoading':   { type: 'boolean' },
  'error':       { type: 'object', nullable: true },
}

// Agent knows:
// ✓ store.set('data', [...]) — valid, nullable
// ✓ store.set('isLoading', true) — valid, boolean
// ✗ store.set('count', 5) — invalid path`

const cAuthStore = `import { createStore } from 'state-agent'

export const authStore = createStore({
  name: 'auth',
  initial: {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  },

  // Style-edges: cheap re-renders
  when: {
    isLoading: (state) => state.isLoading === true,
  },

  // Mount-edges: controls component trees
  gates: {
    isAuthenticated: (state) => state.isAuthenticated,
    isGuest: (state) => state.user === null,
  },

  // Static path enumeration
  pathSchema: {
    'user': { type: 'object', nullable: true,
              fields: ['id', 'name', 'email'] },
    'isAuthenticated': { type: 'boolean' },
    'isLoading': { type: 'boolean' },
  },
})`
