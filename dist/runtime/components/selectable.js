import { z } from 'zod';
export const SelectableSchema = z.object({
    selectedIds: z.array(z.string()),
});
export const SelectableConditions = {
    when: {
        hasSelection: (s) => s.selectedIds.length > 0,
    },
    computed: {
        selectedCount: (s) => s.selectedIds.length,
    },
};
export const SelectableInitial = { selectedIds: [] };
export const Selectable = {
    schema: SelectableSchema,
    conditions: SelectableConditions,
    initial: SelectableInitial,
};
//# sourceMappingURL=selectable.js.map