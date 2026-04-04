import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const BASE = join(import.meta.dirname, '..')
const reactDirName = process.argv[2] || 'react-baseline'
const agentDirName = process.argv[3] || 'state-agent-app'
const REACT_DIR = join(BASE, reactDirName, 'src')
const AGENT_DIR = join(BASE, agentDirName, 'src')

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
  for (const f of files) { const m = readFileSync(f, 'utf-8').match(pattern); if (m) count += m.length }
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
function printRow(label: string, react: number, agent: number) {
  const delta = react === 0 ? (agent > 0 ? '+' + agent : '0') : ((agent - react) / react * 100).toFixed(0) + '%'
  console.log(`│ ${label.padEnd(28)} │ ${String(react).padStart(12)} │ ${String(agent).padStart(12)} │ ${delta.padStart(7)} │`)
}

const reactFiles = collectFiles(REACT_DIR)
const agentFiles = collectFiles(AGENT_DIR)
console.log(`\n  Comparing: ${reactDirName} vs ${agentDirName}\n`)

const reactLines = totalLines(reactFiles)
const agentLines = totalLines(agentFiles)
const reactChars = totalChars(reactFiles)
const agentChars = totalChars(agentFiles)

console.log('  1. CODE VOLUME')
printRow('Source files', reactFiles.length, agentFiles.length)
printRow('Lines of code', reactLines, agentLines)
printRow('Est. tokens (chars/4)', Math.round(reactChars / 4), Math.round(agentChars / 4))

console.log('\n  2. LINES BY CATEGORY')
const reactByDir = filesByDir(reactFiles, REACT_DIR)
const agentByDir = filesByDir(agentFiles, AGENT_DIR)
for (const cat of ['state', 'hooks', 'types', 'components', 'pages', '(root)']) {
  const rL = totalLines(reactByDir[cat] ?? [])
  const aL = totalLines(agentByDir[cat] ?? [])
  if (rL > 0 || aL > 0) printRow(cat === '(root)' ? 'Root (App, main)' : cat.charAt(0).toUpperCase() + cat.slice(1), rL, aL)
}

console.log('\n  3. HOOK USAGE')
let totalReact = 0, totalAgentH = 0
for (const h of ['useState', 'useReducer', 'useContext', 'useMemo', 'useCallback', 'useEffect', 'useRef', 'createContext']) {
  const r = countInFiles(reactFiles, new RegExp(h + '[<(]', 'g'))
  const a = countInFiles(agentFiles, new RegExp(h + '[<(]', 'g'))
  totalReact += r; totalAgentH += a
  if (r > 0 || a > 0) printRow(h, r, a)
}
printRow('TOTAL React hooks', totalReact, totalAgentH)
let totalFw = 0
for (const h of ['useStore', 'useValue', 'useComputed', 'useWhen', 'useGate', 'defineStore']) {
  const a = countInFiles(agentFiles, new RegExp(h + '[<(]', 'g'))
  totalFw += a
  if (a > 0) printRow(h + ' (fw)', 0, a)
}
const gated = countInFiles(agentFiles, /<Gated[\s>]/g); totalFw += gated
if (gated > 0) printRow('<Gated> (fw)', 0, gated)
printRow('TOTAL framework hooks', 0, totalFw)

console.log('\n  4. STRUCTURAL')
printRow('Context/Store files', (reactByDir['state'] ?? []).length, (agentByDir['state'] ?? []).length)
printRow('Custom hook files', (reactByDir['hooks'] ?? []).length, (agentByDir['hooks'] ?? []).length)
printRow('Reducer cases', countInFiles(reactFiles, /case ['"`]\w+['"`]:/g), countInFiles(agentFiles, /case ['"`]\w+['"`]:/g))

console.log('\n  VERDICT')
const lineDelta = ((agentLines - reactLines) / reactLines * 100).toFixed(1)
const tokenDelta = ((Math.round(agentChars/4) - Math.round(reactChars/4)) / Math.round(reactChars/4) * 100).toFixed(1)
const hookDelta = totalReact > 0 ? ((totalAgentH - totalReact) / totalReact * 100).toFixed(1) : 'N/A'
console.log(`  LOC:    ${lineDelta}% (${agentLines} vs ${reactLines})`)
console.log(`  Tokens: ${tokenDelta}% (${Math.round(agentChars/4)} vs ${Math.round(reactChars/4)})`)
console.log(`  React hooks: ${hookDelta}% (${totalAgentH} vs ${totalReact})`)
console.log(`  Hook files eliminated: ${(reactByDir['hooks'] ?? []).length}`)
