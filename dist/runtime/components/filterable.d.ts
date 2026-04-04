import { z } from 'zod';
export declare const FilterableSchema: z.ZodObject<{
    filter: z.ZodString;
    sortBy: z.ZodString;
    sortOrder: z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>;
}, z.core.$strip>;
export declare const FilterableConditions: {
    when: {
        hasFilter: (s: any) => boolean;
        isAscending: (s: any) => boolean;
    };
};
export declare const FilterableInitial: {
    filter: string;
    sortBy: string;
    sortOrder: "asc";
};
export declare const Filterable: {
    schema: z.ZodObject<{
        filter: z.ZodString;
        sortBy: z.ZodString;
        sortOrder: z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>;
    }, z.core.$strip>;
    conditions: {
        when: {
            hasFilter: (s: any) => boolean;
            isAscending: (s: any) => boolean;
        };
    };
    initial: {
        filter: string;
        sortBy: string;
        sortOrder: "asc";
    };
};
//# sourceMappingURL=filterable.d.ts.map