import { z } from 'zod';
export const PaginatedSchema = z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
});
export const PaginatedConditions = {
    when: {
        isFirstPage: (s) => s.page === 1,
        isLastPage: (s) => s.page >= Math.ceil(s.total / s.pageSize),
    },
    computed: {
        totalPages: (s) => Math.ceil(s.total / s.pageSize),
        hasNextPage: (s) => s.page < Math.ceil(s.total / s.pageSize),
        hasPrevPage: (s) => s.page > 1,
    },
};
export const PaginatedInitial = { page: 1, pageSize: 20, total: 0 };
export const Paginated = {
    schema: PaginatedSchema,
    conditions: PaginatedConditions,
    initial: PaginatedInitial,
};
//# sourceMappingURL=paginated.js.map