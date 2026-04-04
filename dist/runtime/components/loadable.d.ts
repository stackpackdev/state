import { z } from 'zod';
export declare const LoadableSchema: z.ZodObject<{
    isLoading: z.ZodBoolean;
    error: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const LoadableConditions: {
    when: {
        isLoading: (s: any) => any;
        hasError: (s: any) => boolean;
    };
    gates: {
        isLoaded: (s: any) => boolean;
        hasError: (s: any) => boolean;
    };
};
export declare const LoadableInitial: {
    isLoading: boolean;
    error: null;
};
export declare const Loadable: {
    schema: z.ZodObject<{
        isLoading: z.ZodBoolean;
        error: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    conditions: {
        when: {
            isLoading: (s: any) => any;
            hasError: (s: any) => boolean;
        };
        gates: {
            isLoaded: (s: any) => boolean;
            hasError: (s: any) => boolean;
        };
    };
    initial: {
        isLoading: boolean;
        error: null;
    };
};
//# sourceMappingURL=loadable.d.ts.map