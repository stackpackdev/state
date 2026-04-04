// Benchmark Report Generator
// Compares react-baseline vs state-agent-app across all dimensions

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const BASE = join(import.meta.dirname, '..')
const REACT_DIR = join(BASE, 'react-baseline', 'src')
const AGENT_DIR = join(BASE, 'state-agent-app', 'src')

// ─── File counting ──────────────────────────────────────────

function collectFiles(dir: string, exts = ['.ts', '.tsx']): string[] {
  const result: string[] = []
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) walk(full)
      else if (exts.includes(extname(full))) result.push(full)
    }
  }
  walk(dir)
  return result
}

function countInFiles(files: string[], pattern: RegExp): number {
  let count = 0
  for (const f of files) {
    const content = readFileSync(f, 'utf-8')
    const matches = content.match(pattern)
    if (matches) count += matches.length
  }
  return count
}

function totalLines(files: string[]): number {
  return files.reduce((sum, f) => sum + readFileSync(f, 'utf-8').split('\n').length, 0)
}

function totalChars(files: string[]): number {
  return files.reduce((sum, f) => sum + readFileSync(f, 'utf-8').length, 0)
}

function filesByDir(files: string[], base: string): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const f of files) {
    const rel = f.replace(base + '/', '')
    const dir = rel.includes('/') ? rel.split('/')[0] : '(root)'
    ;(groups[dir] ??= []).push(f)
  }
  return groups
}

// ─── Main ───────────────────────────────────────────────────

const reactFiles = collectFiles(REACT_DIR)
const agentFiles = collectFiles(AGENT_DIR)

console.log('╔══════════════════════════════════════════════════════════════════════╗')
console.log('║           BENCHMARK: React Baseline vs state-agent                  ║')
console.log('║           Project Management Dashboard (identical features)         ║')
console.log('╚══════════════════════════════════════════════════════════════════════╝')

// ─── 1. Code Volume ─────────────────────────────────────────

const reactLines = totalLines(reactFiles)
const agentLines = totalLines(agentFiles)
const reactChars = totalChars(reactFiles)
const agentChars = totalChars(agentFiles)

console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
console.log('│  1. CODE VOLUME                                                     │')
console.log('├──────────────────────────────┬──────────────┬──────────────┬─────────┤')
console.log('│ Metric                       │ React        │ state-agent  │ Delta   │')
console.log('├──────────────────────────────┼──────────────┼──────────────┼─────────┤')
printRow('Source files', reactFiles.length, agentFiles.length)
printRow('Lines of code', reactLines, agentLines)
printRow('Characters', reactChars, agentChars)
printRow('Est. tokens (chars/4)', Math.round(reactChars / 4), Math.round(agentChars / 4))
console.log('└──────────────────────────────┴──────────────┴──────────────┴─────────┘')

// ─── 2. Lines by category ───────────────────────────────────

console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
console.log('│  2. LINES BY CATEGORY                                               │')
console.log('├──────────────────────────────┬──────────────┬──────────────┬─────────┤')
console.log('│ Category                     │ React        │ state-agent  │ Delta   │')
console.log('├──────────────────────────────┼──────────────┼──────────────┼─────────┤')

const reactByDir = filesByDir(reactFiles, REACT_DIR)
const agentByDir = filesByDir(agentFiles, AGENT_DIR)

const categories = ['state', 'hooks', 'types', 'components', 'pages', '(root)']
for (const cat of categories) {
  const rLines = totalLines(reactByDir[cat] ?? [])
  const aLines = totalLines(agentByDir[cat] ?? [])
  printRow(cat === '(root)' ? 'Root (App, main)' : cat.charAt(0).toUpperCase() + cat.slice(1), rLines, aLines)
}
console.log('└──────────────────────────────┴──────────────┴──────────────┴─────────┘')

// ─── 3. Boilerplate Analysis ────────────────────────────────

console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
console.log('│  3. BOILERPLATE / HOOK USAGE                                        │')
console.log('├──────────────────────────────┬──────────────┬──────────────┬─────────┤')
console.log('│ Hook / Pattern               │ React        │ state-agent  │ Delta   │')
console.log('├──────────────────────────────┼──────────────┼──────────────┼─────────┤')

// React hooks in baseline
const reactHooks = {
  'useState': countInFiles(reactFiles, /useState[<(]/g),
  'useReducer': countInFiles(reactFiles, /useReducer[<(]/g),
  'useContext': countInFiles(reactFiles, /useContext[<(]/g),
  'useMemo': countInFiles(reactFiles, /useMemo[<(]/g),
  'useCallback': countInFiles(reactFiles, /useCallback[<(]/g),
  'useEffect': countInFiles(reactFiles, /useEffect[<(]/g),
  'useRef': countInFiles(reactFiles, /useRef[<(]/g),
  'createContext': countInFiles(reactFiles, /createContext[<(]/g),
}

// Same hooks in state-agent app (residual)
const agentResidual = {
  'useState': countInFiles(agentFiles, /useState[<(]/g),
  'useReducer': countInFiles(agentFiles, /useReducer[<(]/g),
  'useContext': countInFiles(agentFiles, /useContext[<(]/g),
  'useMemo': countInFiles(agentFiles, /useMemo[<(]/g),
  'useCallback': countInFiles(agentFiles, /useCallback[<(]/g),
  'useEffect': countInFiles(agentFiles, /useEffect[<(]/g),
  'useRef': countInFiles(agentFiles, /useRef[<(]/g),
  'createContext': countInFiles(agentFiles, /createContext[<(]/g),
}

for (const [hook, count] of Object.entries(reactHooks)) {
  const agentCount = agentResidual[hook as keyof typeof agentResidual] ?? 0
  printRow(hook, count, agentCount)
}

console.log('├──────────────────────────────┼──────────────┼──────────────┼─────────┤')

// Framework-specific hooks
const frameworkHooks = {
  'useStore': countInFiles(agentFiles, /useStore[<(]/g),
  'useValue': countInFiles(agentFiles, /useValue[<(]/g),
  'useComputed': countInFiles(agentFiles, /useComputed[<(]/g),
  'useWhen': countInFiles(agentFiles, /useWhen[<(]/g),
  'useGate': countInFiles(agentFiles, /useGate[<(]/g),
  'defineStore': countInFiles(agentFiles, /defineStore[<(]/g),
  '<Gated>': countInFiles(agentFiles, /<Gated[\s>]/g),
}

for (const [hook, count] of Object.entries(frameworkHooks)) {
  printRow(hook + ' (framework)', 0, count)
}

const totalReactHooks = Object.values(reactHooks).reduce((a, b) => a + b, 0)
const totalResidual = Object.values(agentResidual).reduce((a, b) => a + b, 0)
const totalFramework = Object.values(frameworkHooks).reduce((a, b) => a + b, 0)

console.log('├──────────────────────────────┼──────────────┼──────────────┼─────────┤')
printRow('Total React hooks', totalReactHooks, totalResidual)
printRow('Total framework hooks', 0, totalFramework)
printRow('Total all hooks', totalReactHooks, totalResidual + totalFramework)
console.log('└──────────────────────────────┴──────────────┴──────────────┴─────────┘')

// ─── 4. Structural Comparison ───────────────────────────────

console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
console.log('│  4. STRUCTURAL COMPARISON                                           │')
console.log('├──────────────────────────────┬──────────────┬──────────────┬─────────┤')
console.log('│ Aspect                       │ React        │ state-agent  │ Delta   │')
console.log('├──────────────────────────────┼──────────────┼──────────────┼─────────┤')

const reactContextFiles = (reactByDir['state'] ?? []).length
const agentStoreFiles = (agentByDir['state'] ?? []).length
const reactHookFiles = (reactByDir['hooks'] ?? []).length
const agentHookFiles = (agentByDir['hooks'] ?? []).length

printRow('Context/Store files', reactContextFiles, agentStoreFiles)
printRow('Custom hook files', reactHookFiles, agentHookFiles)
printRow('Component files', (reactByDir['components'] ?? []).length, (agentByDir['components'] ?? []).length)
printRow('Page files', (reactByDir['pages'] ?? []).length, (agentByDir['pages'] ?? []).length)
printRow('Type definition files', (reactByDir['types'] ?? []).length, (agentByDir['types'] ?? []).length)

// Provider nesting
const reactProviders = countInFiles(reactFiles, /<\w+Provider[\s>]/g)
const agentProviders = countInFiles(agentFiles, /MultiStoreProvider|<\w+Provider[\s>]/g)
printRow('Provider components', reactProviders, agentProviders)

// Reducer boilerplate
const reactReducers = countInFiles(reactFiles, /case ['"`]\w+['"`]:/g)
const agentReducers = countInFiles(agentFiles, /case ['"`]\w+['"`]:/g)
printRow('Reducer case statements', reactReducers, agentReducers)

console.log('└──────────────────────────────┴──────────────┴──────────────┴─────────┘')

// ─── 5. Feature Coverage ────────────────────────────────────

console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
console.log('│  5. FEATURE COVERAGE MATRIX                                         │')
console.log('├──────────────────────────────┬──────────────────┬───────────────────┤')
console.log('│ Feature                      │ React Baseline   │ state-agent       │')
console.log('├──────────────────────────────┼──────────────────┼───────────────────┤')

const features = [
  ['Auth with protected routes', 'useContext+useReducer', '<Gated> + gates'],
  ['CRUD operations', 'useReducer dispatch', 'store.update()'],
  ['Form handling', 'useState per field', 'defineStore()'],
  ['Data fetching sim.', 'useEffect+useState', 'store functions'],
  ['Derived/computed state', 'useMemo (inline)', 'computed (store-level)'],
  ['Conditional rendering', 'manual ternary/&&', 'useWhen + useGate'],
  ['Activity logging', 'manual context calls', 'middleware (auto)'],
  ['Multi-step wizard', 'useState + switch', 'createFlow / store'],
  ['Notifications', 'useContext+timers', 'defineStore+timers'],
  ['Search + filters', 'useMemo + useState', 'computed + useValue'],
  ['Optimistic updates', 'manual rollback', 'middleware rollback'],
  ['Theme/settings', 'useContext', 'defineStore + useWhen'],
  ['Schema validation', 'manual / none', 'Zod (automatic)'],
  ['Action history', 'manual array', 'built-in ring buffer'],
  ['Dependency graph', 'N/A (manual)', 'store dependencies'],
  ['Path-scoped subscriptions', 'N/A', 'useValue(store, path)'],
  ['Actor attribution', 'N/A', 'built-in on every mutation'],
]

for (const [feature, react, agent] of features) {
  console.log(`│ ${feature.padEnd(28)} │ ${react.padEnd(16)} │ ${agent.padEnd(17)} │`)
}
console.log('└──────────────────────────────┴──────────────────┴───────────────────┘')

// ─── 6. Agent Efficiency ────────────────────────────────────

console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
console.log('│  6. AI AGENT EFFICIENCY METRICS                                     │')
console.log('├──────────────────────────────┬──────────────┬──────────────┬─────────┤')
console.log('│ Metric                       │ React        │ state-agent  │ Delta   │')
console.log('├──────────────────────────────┼──────────────┼──────────────┼─────────┤')

const reactTokens = Math.round(reactChars / 4)
const agentTokens = Math.round(agentChars / 4)

printRow('Tokens to generate app', reactTokens, agentTokens)
printRow('Files agent must create', reactFiles.length, agentFiles.length)

// State management overhead = state + hooks lines
const reactStateOverhead = totalLines(reactByDir['state'] ?? []) + totalLines(reactByDir['hooks'] ?? [])
const agentStateOverhead = totalLines(agentByDir['state'] ?? [])
printRow('State mgmt lines', reactStateOverhead, agentStateOverhead)

// Patterns to learn (unique API concepts)
const reactPatterns = 8 // useState, useReducer, useContext, useMemo, useCallback, useEffect, createContext, dispatch
const agentPatterns = 7 // defineStore, useStore, useValue, useWhen, useGate, useComputed, Gated
printRow('API concepts to learn', reactPatterns, agentPatterns)

// Implicit features (things you get for free)
const reactFreeFeatures = 0
const agentFreeFeatures = 5 // schema validation, action history, actor attribution, dependency graph, memoized conditions
printRow('Built-in features (free)', reactFreeFeatures, agentFreeFeatures)

// Estimated cost (at $15/M output tokens for Opus)
const costPer1M = 15
const reactCost = (reactTokens / 1_000_000) * costPer1M
const agentCost = (agentTokens / 1_000_000) * costPer1M
console.log(`│ ${'Est. cost @ $15/M tokens'.padEnd(28)} │ ${'$' + reactCost.toFixed(2).padStart(11)} │ ${'$' + agentCost.toFixed(2).padStart(11)} │ ${(((agentCost - reactCost) / reactCost) * 100).toFixed(0).padStart(4)}%   │`)

console.log('└──────────────────────────────┴──────────────┴──────────────┴─────────┘')

// ─── 7. Summary ─────────────────────────────────────────────

const lineDelta = ((agentLines - reactLines) / reactLines * 100).toFixed(1)
const fileDelta = ((agentFiles.length - reactFiles.length) / reactFiles.length * 100).toFixed(1)
const tokenDelta = ((agentTokens - reactTokens) / reactTokens * 100).toFixed(1)
const hookReduction = ((totalResidual - totalReactHooks) / totalReactHooks * 100).toFixed(1)

console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
console.log('║  VERDICT                                                             ║')
console.log('╠══════════════════════════════════════════════════════════════════════╣')
console.log(`║  Lines of code:        ${lineDelta.padStart(6)}% (${agentLines} vs ${reactLines})`)
console.log(`║  Source files:          ${fileDelta.padStart(6)}% (${agentFiles.length} vs ${reactFiles.length})`)
console.log(`║  Token cost:            ${tokenDelta.padStart(6)}% (${agentTokens.toLocaleString()} vs ${reactTokens.toLocaleString()})`)
console.log(`║  React hook usage:      ${hookReduction.padStart(6)}% (${totalResidual} vs ${totalReactHooks})`)
console.log(`║  Custom hook files:     ${reactHookFiles} eliminated (${reactHookFiles} → ${agentHookFiles})`)
console.log(`║  Context providers:     ${reactContextFiles} contexts → ${agentStoreFiles} stores`)
console.log(`║  Free built-in features: schema validation, action history,`)
console.log(`║    actor attribution, dependency graph, memoized when/gate`)
console.log('╚══════════════════════════════════════════════════════════════════════╝')

// ─── Helper ─────────────────────────────────────────────────

function printRow(label: string, react: number, agent: number) {
  const delta = react === 0 ? (agent > 0 ? '+' + agent : '0') : ((agent - react) / react * 100).toFixed(0) + '%'
  console.log(
    `│ ${label.padEnd(28)} │ ${String(react).padStart(12)} │ ${String(agent).padStart(12)} │ ${delta.padStart(7)} │`
  )
}
