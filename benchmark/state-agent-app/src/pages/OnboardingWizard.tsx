import React from 'react';
import { useStore, useWhen, useComputed } from 'state-agent/react';
import { goNext, goBack, updateWizardData } from '../state/onboarding.flow';
import { logActivity } from '../state/activity.store';
import { addNotification } from '../state/notifications.store';
import type { WizardStep, WizardData } from '../types';

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { value: state } = useStore<{
    currentStepIndex: number;
    steps: WizardStep[];
    data: WizardData;
  }>('onboarding');

  const { isFirstStep, isLastStep } = useWhen('onboarding');
  const currentStep = useComputed<WizardStep>('onboarding', 'currentStep');
  const progress = useComputed<number>('onboarding', 'progress');
  const isValid = useComputed<boolean>('onboarding', 'isValid');
  const userName = useComputed<string>('auth', 'userName');

  const handleNext = () => {
    if (isLastStep) {
      // Complete wizard
      logActivity('wizard_completed', `Onboarding completed by ${userName}`, userName);
      addNotification('success', 'Onboarding complete! Welcome aboard.');
      onComplete();
    } else {
      const ok = goNext();
      if (!ok) {
        addNotification('error', 'Please fill in all required fields.');
      }
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 8, textAlign: 'center' }}>Onboarding</h2>
      <p style={{ color: '#6b7280', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
        Set up your profile in 3 easy steps
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {state.steps.map((step, i) => (
            <span
              key={step.id}
              style={{
                fontSize: 12,
                fontWeight: i === state.currentStepIndex ? 700 : 400,
                color: step.isCompleted ? '#22c55e' : i === state.currentStepIndex ? '#3b82f6' : '#9ca3af',
              }}
            >
              {i + 1}. {step.label}
            </span>
          ))}
        </div>
        <div style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#3b82f6',
              borderRadius: 3,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Step content */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 24,
          marginBottom: 20,
          minHeight: 200,
        }}
      >
        {currentStep.id === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16 }}>Profile Setup</h3>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>
                Display Name *
              </label>
              <input
                value={state.data.displayName}
                onChange={(e) => updateWizardData({ displayName: e.target.value })}
                placeholder="Your name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>
                Role *
              </label>
              <select
                value={state.data.role}
                onChange={(e) => updateWizardData({ role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <option value="">Select a role...</option>
                <option value="developer">Developer</option>
                <option value="designer">Designer</option>
                <option value="manager">Project Manager</option>
                <option value="qa">QA Engineer</option>
              </select>
            </div>
          </div>
        )}

        {currentStep.id === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16 }}>Project Preferences</h3>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>
                Default Project View
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['list', 'board'] as const).map((view) => (
                  <label key={view} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="projectView"
                      checked={state.data.defaultProjectView === view}
                      onChange={() => updateWizardData({ defaultProjectView: view })}
                    />
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={state.data.emailNotifications}
                  onChange={(e) => updateWizardData({ emailNotifications: e.target.checked })}
                />
                Receive email notifications
              </label>
            </div>
          </div>
        )}

        {currentStep.id === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 16 }}>Review & Confirm</h3>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Please review your selections:</p>
            <table style={{ fontSize: 14, borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 16px 6px 0', color: '#6b7280' }}>Display Name:</td>
                  <td style={{ fontWeight: 600 }}>{state.data.displayName || '(not set)'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 16px 6px 0', color: '#6b7280' }}>Role:</td>
                  <td style={{ fontWeight: 600 }}>{state.data.role || '(not set)'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 16px 6px 0', color: '#6b7280' }}>Default View:</td>
                  <td style={{ fontWeight: 600 }}>{state.data.defaultProjectView}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 16px 6px 0', color: '#6b7280' }}>Email Notifications:</td>
                  <td style={{ fontWeight: 600 }}>{state.data.emailNotifications ? 'Yes' : 'No'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={goBack}
          disabled={isFirstStep}
          style={{
            padding: '10px 20px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            backgroundColor: isFirstStep ? '#f3f4f6' : '#fff',
            color: isFirstStep ? '#9ca3af' : '#374151',
            fontSize: 14,
            cursor: isFirstStep ? 'not-allowed' : 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isValid && !isLastStep}
          style={{
            padding: '10px 20px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: isValid || isLastStep ? '#3b82f6' : '#9ca3af',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: isValid || isLastStep ? 'pointer' : 'not-allowed',
          }}
        >
          {isLastStep ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}
