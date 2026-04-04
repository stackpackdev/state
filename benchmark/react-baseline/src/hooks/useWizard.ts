import { useState, useCallback, useMemo } from 'react';
import type { WizardStep, WizardStepId, WizardData } from '../types';

// ── Boilerplate counter: 3x useState, 5x useCallback, 2x useMemo ──

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

export function useWizard() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<WizardStep[]>(STEPS);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);

  const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const progress = useMemo(() => {
    const completed = steps.filter((s) => s.isCompleted).length;
    return Math.round((completed / steps.length) * 100);
  }, [steps]);

  const validateCurrentStep = useCallback((): boolean => {
    const stepId = steps[currentStepIndex].id;
    switch (stepId) {
      case 'profile':
        return data.displayName.trim().length > 0 && data.role.trim().length > 0;
      case 'preferences':
        return true; // preferences always valid (has defaults)
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStepIndex, steps, data]);

  const goNext = useCallback(() => {
    if (!validateCurrentStep()) return false;
    setSteps((prev) =>
      prev.map((s, i) => (i === currentStepIndex ? { ...s, isCompleted: true } : s))
    );
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    }
    return true;
  }, [currentStepIndex, steps.length, validateCurrentStep]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback(
    (stepId: WizardStepId) => {
      const idx = steps.findIndex((s) => s.id === stepId);
      if (idx >= 0) setCurrentStepIndex(idx);
    },
    [steps]
  );

  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setCurrentStepIndex(0);
    setSteps(STEPS);
    setData(INITIAL_DATA);
  }, []);

  return {
    currentStep,
    currentStepIndex,
    steps,
    data,
    isFirstStep,
    isLastStep,
    progress,
    goNext,
    goBack,
    goToStep,
    updateData,
    validateCurrentStep,
    reset,
  };
}
