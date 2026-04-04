import { z } from 'zod';
export declare const PaginatedSchema: z.ZodObject<{
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const PaginatedConditions: {
    when: {
        isFirstPage: (s: any) => boolean;
        isLastPage: (s: any) => boolean;
    };
    computed: {
        totalPages: (s: any) => number;
        hasNextPage: (s: any) => boolean;
        hasPrevPage: (s: any) => boolean;
    };
};
export declare const PaginatedInitial: {
    page: number;
    pageSize: number;
    total: number;
};
export declare const Paginated: {
    schema: z.ZodObject<{
        page: z.ZodNumber;
        pageSize: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>;
    conditions: {
        when: {
            isFirstPage: (s: any) => boolean;
            isLastPage: (s: any) => boolean;
        };
        computed: {
            totalPages: (s: any) => number;
            hasNextPage: (s: any) => boolean;
            hasPrevPage: (s: any) => boolean;
        };
    };
    initial: {
        page: number;
        pageSize: number;
        total: number;
    };
};
//# sourceMappingURL=paginated.d.ts.map