import { z } from 'zod'

export const SelectableSchema = z.object({
  selectedIds: z.array(z.string()),
})

export const SelectableConditions = {
  when: {
    hasSelection: (s: any) => s.selectedIds.length > 0,
  },
  computed: {
    selectedCount: (s: any) => s.selectedIds.length,
  },
}

export const SelectableInitial = { selectedIds: [] as string[] }

export const Selectable = {
  schema: SelectableSchema,
  conditions: SelectableConditions,
  initial: SelectableInitial,
}
