import type { Ref } from 'react';
import type { GuidedProgressStep, GuidedStepState } from '../../lib/guided-journey';
import styles from './GuidedStepHeader.module.css';

type StatusTone = 'needs-action' | 'ready' | 'safe-stop' | 'complete';

const defaultStateLabels: Record<GuidedStepState, string> = {
  complete: 'Completed',
  current: 'Current',
  upcoming: 'Upcoming',
  skipped: 'Skipped',
  blocked: 'Blocked',
  'safe-stop': 'Safe stop',
};

export function GuidedStepHeader({
  currentLabel,
  instruction,
  why,
  status,
  statusTone,
  next,
  steps,
  progressLabel,
  headingRef,
  headingId = 'guided-step-title',
  labels = {},
}: {
  currentLabel: string;
  instruction: string;
  why: string;
  status: string;
  statusTone: StatusTone;
  next: string;
  steps: GuidedProgressStep[];
  progressLabel: string;
  headingRef?: Ref<HTMLHeadingElement>;
  headingId?: string;
  labels?: Partial<{
    doNow: string;
    why: string;
    status: string;
    next: string;
    allSteps: string;
    stateComplete: string;
    stateCurrent: string;
    stateUpcoming: string;
    stateSkipped: string;
    stateBlocked: string;
    stateSafeStop: string;
  }>;
}) {
  const copy = {
    doNow: labels.doNow ?? 'Do this now',
    why: labels.why ?? 'Why this matters',
    status: labels.status ?? 'Status',
    next: labels.next ?? 'Next',
    allSteps: labels.allSteps ?? 'See all steps',
  };
  const stateLabels: Record<GuidedStepState, string> = {
    complete: labels.stateComplete ?? defaultStateLabels.complete,
    current: labels.stateCurrent ?? defaultStateLabels.current,
    upcoming: labels.stateUpcoming ?? defaultStateLabels.upcoming,
    skipped: labels.stateSkipped ?? defaultStateLabels.skipped,
    blocked: labels.stateBlocked ?? defaultStateLabels.blocked,
    'safe-stop': labels.stateSafeStop ?? defaultStateLabels['safe-stop'],
  };
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  const completedCount = steps.filter((step) => step.state === 'complete').length;
  const completedCurrentStep = currentIndex >= 0 && statusTone === 'complete' ? 1 : 0;
  const progress = steps.length === 0
    ? 0
    : Math.round(((completedCount + completedCurrentStep) / steps.length) * 100);

  return (
    <section className={styles.guide} aria-labelledby={headingId}>
      <div className={styles.guideTopline}>
        <p>{currentLabel}</p>
        <span aria-hidden="true">{progress}%</span>
      </div>
      <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

      <div className={styles.primaryInstruction}>
        <span>{copy.doNow}</span>
        <h2 id={headingId} ref={headingRef} tabIndex={-1}>{instruction}</h2>
      </div>

      <div className={styles.guideDetails}>
        <div><span>{copy.why}</span><p>{why}</p></div>
        <div className={styles.status} role="status" aria-live="polite" data-tone={statusTone}><span>{copy.status}</span><strong>{status}</strong></div>
        <div><span>{copy.next}</span><p>{next}</p></div>
      </div>

      <details className={styles.stepDisclosure}>
        <summary>{copy.allSteps}</summary>
        <ol aria-label={progressLabel}>
          {steps.map((step, index) => (
            <li
              key={step.id}
              data-state={step.state}
              aria-current={step.state === 'current' ? 'step' : undefined}
              aria-label={`${stateLabels[step.state]}: ${step.label}`}
            >
              <span aria-hidden="true">{step.state === 'complete' ? '✓' : step.state === 'skipped' || step.state === 'safe-stop' ? '—' : index + 1}</span>
              <small><b className={styles.visuallyHidden}>{stateLabels[step.state]}: </b>{step.label}</small>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
