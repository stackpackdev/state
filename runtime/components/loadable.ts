import { z } from 'zod'

export const LoadableSchema = z.object({
  isLoading: z.boolean(),
  error: z.string().nullable(),
})

export const LoadableConditions = {
  when: {
    isLoading: (s: any) => s.isLoading,
    hasError: (s: any) => s.error !== null,
  },
  gates: {
    isLoaded: (s: any) => !s.isLoading && s.error === null,
    hasError: (s: any) => s.error !== null,
  },
}

export const LoadableInitial = { isLoading: false, error: null }

export const Loadable = {
  schema: LoadableSchema,
  conditions: LoadableConditions,
  initial: LoadableInitial,
}
