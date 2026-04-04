import type { Actor, Store } from './types.js';
export type PublishCondition<T = any> = (prev: T, next: T) => boolean;
export type StoreEventHandler = (context: {
    event: string;
    source: string;
    store: Store;
    actor: Actor;
}) => void | Promise<void>;
export interface EventBus {
    /** Register a publisher */
    registerPublisher(storeName: string, events: Record<string, PublishCondition>): void;
    /** Register a subscriber */
    registerSubscriber(storeName: string, subscriptions: Record<string, StoreEventHandler>): void;
    /** Emit check — called internally by store on state change */
    checkAndEmit(storeName: string, prev: unknown, next: unknown): void;
    /** Get the event graph for introspection */
    getGraph(): Record<string, {
        publishers: string[];
        subscribers: string[];
    }>;
    /** Unregister a store */
    unregister(storeName: string): void;
    /** Clear all registrations */
    clear(): void;
    /** @internal Set the store resolver for looking up stores by name */
    _setStoreResolver(resolver: (name: string) => Store | undefined): void;
}
export declare function createEventBus(): EventBus;
export declare const eventBus: EventBus;
//# sourceMappingURL=pubsub.d.ts.map