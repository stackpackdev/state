import { describe, it, expect } from 'vitest'
import { createFlow } from '../flow.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('user')

// ─── Hierarchical Flow: mode ────────────────────────────────

describe('flow mode', () => {
  it('defaults to separate mode', () => {
    const flow = createFlow({
      name: 'app',
      states: ['Home', 'Settings'],
      initial: 'Home',
    })
    expect(flow.mode).toBe('separate')
  })

  it('accepts together mode', () => {
    const flow = createFlow({
      name: 'dashboard',
      mode: 'together',
      states: ['Overview', 'Stats'],
      initial: 'Overview',
    })
    expect(flow.mode).toBe('together')
  })
})

// ─── Hierarchical Flow: children ────────────────────────────

describe('flow children', () => {
  function createAppFlow() {
    return createFlow({
      name: 'app',
      mode: 'separate',
      states: ['Home', 'Dashboard', 'Profile'],
      initial: 'Home',
      children: {
        'Dashboard': {
          name: 'dashboard',
          mode: 'separate',
          states: ['Overview', 'Settings', 'Reports'],
          initial: 'Overview',
        },
        'Profile': {
          name: 'profile',
          mode: 'separate',
          states: ['View', 'Edit'],
          initial: 'View',
        },
      },
    })
  }

  it('creates child flows', () => {
    const flow = createAppFlow()
    const children = flow.children()
    expect(Object.keys(children)).toEqual(['Dashboard', 'Profile'])
    expect(children['Dashboard'].name).toBe('dashboard')
    expect(children['Profile'].name).toBe('profile')
  })

  it('child flows have their own state', () => {
    const flow = createAppFlow()
    const dashboard = flow.children()['Dashboard']
    expect(dashboard.current()).toBe('Overview')
    expect(dashboard.states()).toEqual(['Overview', 'Settings', 'Reports'])
  })

  it('returns empty children when no children defined', () => {
    const flow = createFlow({
      name: 'leaf',
      states: ['A', 'B'],
      initial: 'A',
    })
    expect(flow.children()).toEqual({})
  })
})

// ─── Path-based navigation ──────────────────────────────────

describe('flow.go with paths', () => {
  function createNestedFlow() {
    return createFlow({
      name: 'app',
      states: ['Home', 'Dashboard'],
      initial: 'Home',
      children: {
        'Dashboard': {
          name: 'dashboard',
          states: ['Overview', 'Settings'],
          initial: 'Overview',
        },
      },
    })
  }

  it('navigates to nested state via path', () => {
    const flow = createNestedFlow()
    flow.go('/Dashboard/Settings', user)

    expect(flow.current()).toBe('Dashboard')
    expect(flow.children()['Dashboard'].current()).toBe('Settings')
  })

  it('navigates parent and child in one go', () => {
    const flow = createNestedFlow()
    // Start at Home, navigate to Dashboard/Settings
    expect(flow.current()).toBe('Home')
    flow.go('/Dashboard/Settings', user)
    expect(flow.current()).toBe('Dashboard')
    expect(flow.children()['Dashboard'].current()).toBe('Settings')
  })

  it('single segment path works like direct navigation', () => {
    const flow = createNestedFlow()
    flow.go('/Dashboard', user)
    expect(flow.current()).toBe('Dashboard')
  })

  it('does not navigate child if parent state has no child flow', () => {
    const flow = createNestedFlow()
    // Home has no children
    flow.go('/Home/Something', user)
    expect(flow.current()).toBe('Home') // navigated to Home
    // No crash, just silently ignores the child path
  })
})

// ─── flow.resolve ───────────────────────────────────────────

describe('flow.resolve', () => {
  function createDeepFlow() {
    return createFlow({
      name: 'app',
      states: ['Home', 'Dashboard'],
      initial: 'Home',
      children: {
        'Dashboard': {
          name: 'dashboard',
          states: ['Overview', 'Settings'],
          initial: 'Overview',
          children: {
            'Settings': {
              name: 'settings',
              states: ['General', 'Security'],
              initial: 'General',
            },
          },
        },
      },
    })
  }

  it('resolves a direct child', () => {
    const flow = createDeepFlow()
    const dashboard = flow.resolve('Dashboard')
    expect(dashboard).toBeDefined()
    expect(dashboard!.name).toBe('dashboard')
  })

  it('resolves a nested child via path', () => {
    const flow = createDeepFlow()
    const settings = flow.resolve('Dashboard/Settings')
    expect(settings).toBeDefined()
    expect(settings!.name).toBe('settings')
  })

  it('resolves with leading slash', () => {
    const flow = createDeepFlow()
    const settings = flow.resolve('/Dashboard/Settings')
    expect(settings).toBeDefined()
    expect(settings!.name).toBe('settings')
  })

  it('returns undefined for non-existent path', () => {
    const flow = createDeepFlow()
    expect(flow.resolve('NonExistent')).toBeUndefined()
    expect(flow.resolve('Dashboard/NonExistent')).toBeUndefined()
  })
})

// ─── flow.activeChain ───────────────────────────────────────

describe('flow.activeChain', () => {
  it('returns single-level chain', () => {
    const flow = createFlow({
      name: 'app',
      states: ['Home', 'Settings'],
      initial: 'Home',
    })
    expect(flow.activeChain()).toEqual(['app/Home'])
  })

  it('returns multi-level chain', () => {
    const flow = createFlow({
      name: 'app',
      states: ['Home', 'Dashboard'],
      initial: 'Dashboard',
      children: {
        'Dashboard': {
          name: 'dashboard',
          states: ['Overview', 'Settings'],
          initial: 'Overview',
        },
      },
    })
    expect(flow.activeChain()).toEqual([
      'app/Dashboard',
      'dashboard/Overview',
    ])
  })

  it('chain updates after navigation', () => {
    const flow = createFlow({
      name: 'app',
      states: ['Home', 'Dashboard'],
      initial: 'Home',
      children: {
        'Dashboard': {
          name: 'dashboard',
          states: ['Overview', 'Settings'],
          initial: 'Overview',
        },
      },
    })

    expect(flow.activeChain()).toEqual(['app/Home'])
    flow.go('/Dashboard/Settings', user)
    expect(flow.activeChain()).toEqual([
      'app/Dashboard',
      'dashboard/Settings',
    ])
  })
})

// ─── flow.has with paths ────────────────────────────────────

describe('flow.has with paths', () => {
  it('checks nested path', () => {
    const flow = createFlow({
      name: 'app',
      states: ['Home', 'Dashboard'],
      initial: 'Dashboard',
      children: {
        'Dashboard': {
          name: 'dashboard',
          states: ['Overview', 'Settings'],
          initial: 'Overview',
        },
      },
    })

    expect(flow.has('Dashboard/Overview')).toBe(true)
    expect(flow.has('Dashboard/Settings')).toBe(false)
    expect(flow.has('Home/Overview')).toBe(false) // wrong parent
  })
})
