// Cross-Store Pub/Sub Protocol
// Enables stores to communicate via events without direct coupling.
// Publishers declare conditions on state changes, subscribers react.

import type { Actor, Store } from './types.js'

// ─── Types ──────────────────────────────────────────────────

export type PublishCondition<T = any> = (prev: T, next: T) => boolean

export type StoreEventHandler = (context: {
  event: string
  source: string
  store: Store
  actor: Actor
}) => void | Promise<void>

export interface EventBus {
  /** Register a publisher */
  registerPublisher(storeName: string, events: Record<string, PublishCondition>): void
  /** Register a subscriber */
  registerSubscriber(storeName: string, subscriptions: Record<string, StoreEventHandler>): void
  /** Emit check — called internally by store on state change */
  checkAndEmit(storeName: string, prev: unknown, next: unknown): void
  /** Get the event graph for introspection */
  getGraph(): Record<string, { publishers: string[]; subscribers: string[] }>
  /** Unregister a store */
  unregister(storeName: string): void
  /** Clear all registrations */
  clear(): void
  /** @internal Set the store resolver for looking up stores by name */
  _setStoreResolver(resolver: (name: string) => Store | undefined): void
}

// ─── System Actor ───────────────────────────────────────────

const PUBSUB_ACTOR: Actor = {
  id: 'pubsub-system',
  type: 'system',
  name: 'event-bus',
}

// ─── Event Depth Limit ──────────────────────────────────────

const MAX_EVENT_DEPTH = 5

// ─── Create Event Bus ───────────────────────────────────────

export function createEventBus(): EventBus {
  // Map<qualifiedEventName, Array<{ condition, storeName }>>
  const publishers = new Map<string, Array<{ condition: PublishCondition; storeName: string }>>()
  // Map<qualifiedEventName, Array<{ handler, storeName }>>
  const subscribers = new Map<string, Array<{ handler: StoreEventHandler; storeName: string }>>()

  let resolveStore: ((name: string) => Store | undefined) | null = null

  // Depth tracking for preventing infinite event chains.
  // Since handlers are delivered via Promise.resolve().then(), depth is
  // captured at scheduling time and restored in the microtask so that
  // any synchronous re-entry into checkAndEmit sees the correct depth.
  let currentDepth = 0

  function registerPublisher(storeName: string, events: Record<string, PublishCondition>): void {
    for (const [eventName, condition] of Object.entries(events)) {
      const qualifiedName = `${storeName}.${eventName}`
      if (!publishers.has(qualifiedName)) {
        publishers.set(qualifiedName, [])
      }
      publishers.get(qualifiedName)!.push({ condition, storeName })
    }
  }

  function registerSubscriber(storeName: string, subscriptions: Record<string, StoreEventHandler>): void {
    for (const [eventKey, handler] of Object.entries(subscriptions)) {
      if (!subscribers.has(eventKey)) {
        subscribers.set(eventKey, [])
      }
      subscribers.get(eventKey)!.push({ handler, storeName })
    }
  }

  function checkAndEmit(storeName: string, prev: unknown, next: unknown): void {
    if (currentDepth >= MAX_EVENT_DEPTH) {
      console.warn(
        `[state-agent] EventBus: max event depth (${MAX_EVENT_DEPTH}) reached. ` +
        `Suppressing events from store "${storeName}" to prevent infinite loops.`
      )
      return
    }

    // Find all events this store publishes
    for (const [qualifiedName, pubEntries] of publishers) {
      for (const entry of pubEntries) {
        if (entry.storeName !== storeName) continue

        let shouldEmit = false
        try {
          shouldEmit = entry.condition(prev, next)
        } catch (e) {
          console.warn(
            `[state-agent] EventBus: publish condition error for "${qualifiedName}":`,
            e
          )
          continue
        }

        if (!shouldEmit) continue

        // Deliver to all subscribers of this event
        const subs = subscribers.get(qualifiedName)
        if (!subs || subs.length === 0) continue

        // Resolve the source store
        const sourceStore = resolveStore?.(storeName)
        if (!sourceStore) continue

        // Extract event name from qualified name (storeName.eventName)
        const dotIndex = qualifiedName.indexOf('.')
        const eventName = dotIndex >= 0 ? qualifiedName.slice(dotIndex + 1) : qualifiedName

        for (const sub of subs) {
          // Capture the current depth for this handler's microtask context
          const capturedDepth = currentDepth
          Promise.resolve().then(() => {
            // Restore depth context so recursive checkAndEmit sees correct depth
            const savedDepth = currentDepth
            currentDepth = capturedDepth + 1
            try {
              return sub.handler({
                event: eventName,
                source: storeName,
                store: sourceStore,
                actor: PUBSUB_ACTOR,
              })
            } finally {
              currentDepth = savedDepth
            }
          }).catch((err) => {
            console.warn(
              `[state-agent] EventBus: subscriber error for "${qualifiedName}" in store "${sub.storeName}":`,
              err
            )
          })
        }
      }
    }
  }

  function getGraph(): Record<string, { publishers: string[]; subscribers: string[] }> {
    const graph: Record<string, { publishers: string[]; subscribers: string[] }> = {}

    for (const [eventName, pubEntries] of publishers) {
      if (!graph[eventName]) {
        graph[eventName] = { publishers: [], subscribers: [] }
      }
      for (const entry of pubEntries) {
        if (!graph[eventName].publishers.includes(entry.storeName)) {
          graph[eventName].publishers.push(entry.storeName)
        }
      }
    }

    for (const [eventName, subEntries] of subscribers) {
      if (!graph[eventName]) {
        graph[eventName] = { publishers: [], subscribers: [] }
      }
      for (const entry of subEntries) {
        if (!graph[eventName].subscribers.includes(entry.storeName)) {
          graph[eventName].subscribers.push(entry.storeName)
        }
      }
    }

    return graph
  }

  function unregister(storeName: string): void {
    // Remove from publishers
    for (const [eventName, entries] of publishers) {
      const filtered = entries.filter(e => e.storeName !== storeName)
      if (filtered.length === 0) {
        publishers.delete(eventName)
      } else {
        publishers.set(eventName, filtered)
      }
    }

    // Remove from subscribers
    for (const [eventName, entries] of subscribers) {
      const filtered = entries.filter(e => e.storeName !== storeName)
      if (filtered.length === 0) {
        subscribers.delete(eventName)
      } else {
        subscribers.set(eventName, filtered)
      }
    }
  }

  function clear(): void {
    publishers.clear()
    subscribers.clear()
    currentDepth = 0
  }

  return {
    registerPublisher,
    registerSubscriber,
    checkAndEmit,
    getGraph,
    unregister,
    clear,
    _setStoreResolver(resolver: (name: string) => Store | undefined) {
      resolveStore = resolver
    },
  }
}

// ─── Global Singleton ───────────────────────────────────────

export const eventBus = createEventBus()
