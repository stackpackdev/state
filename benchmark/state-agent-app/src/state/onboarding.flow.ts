import { defineStore, z, getDefaultActor } from 'state-agent';
import type { WizardStep, WizardData, WizardStepId } from '../types';

const STEPS: WizardStep[] = [
  { id: 'profile', label: 'Profile Setup', isCompleted: false },
  { id: 'preferences', label: 'Project Preferences', isCompleted: false },
  { id: 'review', label: 'Review & Confirm', isCompleted: false },
];

const INITIAL_DATA: WizardData = {
  displayName: '',
  role: '',
  defaultProjectView: 'board',
  emailNotifications: true,
};

export const onboarding = defineStore({
  name: 'onboarding',
  schema: z.object({
    currentStepIndex: z.number(),
    steps: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        isCompleted: z.boolean(),
      })
    ),
    data: z.object({
      displayName: z.string(),
      role: z.string(),
      defaultProjectView: z.enum(['list', 'board']),
      emailNotifications: z.boolean(),
    }),
  }),
  initial: {
    currentStepIndex: 0,
    steps: STEPS,
    data: INITIAL_DATA,
  },
  when: {
    isFirstStep: (s) => s.currentStepIndex === 0,
    isLastStep: (s) => s.currentStepIndex === s.steps.length - 1,
  },
  computed: {
    currentStep: (s) => s.steps[s.currentStepIndex],
    progress: (s) => {
      const completed = s.steps.filter((step) => step.isCompleted).length;
      return Math.round((completed / s.steps.length) * 100);
    },
    isValid: (s) => {
      const stepId = s.steps[s.currentStepIndex].id;
      switch (stepId) {
        case 'profile':
          return s.data.displayName.trim().length > 0 && s.data.role.trim().length > 0;
        case 'preferences':
          return true;
        case 'review':
          return true;
        default:
          return false;
      }
    },
  },
});

export function goNext(): boolean {
  const actor = getDefaultActor();
  const state = onboarding.store.getState();
  const stepId = state.steps[state.currentStepIndex].id;

  // Validate current step
  let valid = false;
  switch (stepId) {
    case 'profile':
      valid = state.data.displayName.trim().length > 0 && state.data.role.trim().length > 0;
      break;
    case 'preferences':
    case 'review':
      valid = true;
      break;
  }

  if (!valid) return false;

  onboarding.store.update((draft) => {
    draft.steps[draft.currentStepIndex].isCompleted = true;
    if (draft.currentStepIndex < draft.steps.length - 1) {
      draft.currentStepIndex++;
    }
  }, actor);

  return true;
}

export function goBack(): void {
  const actor = getDefaultActor();
  const state = onboarding.store.getState();
  if (state.currentStepIndex > 0) {
    onboarding.store.update((draft) => {
      draft.currentStepIndex--;
    }, actor);
  }
}

export function goToStep(stepId: WizardStepId): void {
  const actor = getDefaultActor();
  const state = onboarding.store.getState();
  const idx = state.steps.findIndex((s) => s.id === stepId);
  if (idx >= 0) {
    onboarding.store.update((draft) => {
      draft.currentStepIndex = idx;
    }, actor);
  }
}

export function updateWizardData(partial: Partial<WizardData>): void {
  const actor = getDefaultActor();
  onboarding.store.update((draft) => {
    Object.assign(draft.data, partial);
  }, actor);
}

export function resetWizard(): void {
  const actor = getDefaultActor();
  onboarding.store.reset(
    {
      currentStepIndex: 0,
      steps: STEPS.map((s) => ({ ...s, isCompleted: false })),
      data: { ...INITIAL_DATA },
    },
    actor
  );
}
