import { z } from 'zod';
export const LoadableSchema = z.object({
    isLoading: z.boolean(),
    error: z.string().nullable(),
});
export const LoadableConditions = {
    when: {
        isLoading: (s) => s.isLoading,
        hasError: (s) => s.error !== null,
    },
    gates: {
        isLoaded: (s) => !s.isLoading && s.error === null,
        hasError: (s) => s.error !== null,
    },
};
export const LoadableInitial = { isLoading: false, error: null };
export const Loadable = {
    schema: LoadableSchema,
    conditions: LoadableConditions,
    initial: LoadableInitial,
};
//# sourceMappingURL=loadable.js.map