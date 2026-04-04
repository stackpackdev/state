import { z } from 'zod';
export const FilterableSchema = z.object({
    filter: z.string(),
    sortBy: z.string(),
    sortOrder: z.enum(['asc', 'desc']),
});
export const FilterableConditions = {
    when: {
        hasFilter: (s) => s.filter !== '',
        isAscending: (s) => s.sortOrder === 'asc',
    },
};
export const FilterableInitial = { filter: '', sortBy: '', sortOrder: 'asc' };
export const Filterable = {
    schema: FilterableSchema,
    conditions: FilterableConditions,
    initial: FilterableInitial,
};
//# sourceMappingURL=filterable.js.map