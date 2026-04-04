import { z } from 'zod';
import type { ZodObject } from 'zod';
import { type DefineStoreResult } from '../core/define.js';
import type { Middleware, StoreDependencies } from '../core/types.js';
export interface ComponentDefinition {
    schema: ZodObject<any>;
    conditions?: {
        when?: Record<string, (state: any) => boolean>;
        gates?: Record<string, (state: any) => boolean>;
        computed?: Record<string, (state: any) => unknown>;
    };
    initial: Record<string, unknown>;
}
interface ComposeStoreOptions<S extends ZodObject<any>> {
    name: string;
    schema: S;
    components: ComponentDefinition[];
    initial: z.infer<S>;
    when?: Record<string, (state: any) => boolean>;
    gates?: Record<string, (state: any) => boolean>;
    computed?: Record<string, (state: any) => unknown>;
    middleware?: Middleware[];
    dependencies?: StoreDependencies;
}
export declare function composeStore<S extends ZodObject<any>>(options: ComposeStoreOptions<S>): DefineStoreResult<any>;
export {};
//# sourceMappingURL=compose.d.ts.map