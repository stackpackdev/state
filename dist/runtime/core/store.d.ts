import type { Store, StoreOptions, StoreRegistry } from './types.js';
export declare const storeRegistry: StoreRegistry;
export declare function createStore<T = any>(options: StoreOptions<T>): Store<T>;
export declare function getStore<T = any>(name: string): Store<T> | undefined;
export declare function getAllStores(): Map<string, Store>;
//# sourceMappingURL=store.d.ts.map