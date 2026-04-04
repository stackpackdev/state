import { z } from 'zod';
export declare const SelectableSchema: z.ZodObject<{
    selectedIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const SelectableConditions: {
    when: {
        hasSelection: (s: any) => boolean;
    };
    computed: {
        selectedCount: (s: any) => any;
    };
};
export declare const SelectableInitial: {
    selectedIds: string[];
};
export declare const Selectable: {
    schema: z.ZodObject<{
        selectedIds: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    conditions: {
        when: {
            hasSelection: (s: any) => boolean;
        };
        computed: {
            selectedCount: (s: any) => any;
        };
    };
    initial: {
        selectedIds: string[];
    };
};
//# sourceMappingURL=selectable.d.ts.map