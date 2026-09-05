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
  headingLevel = 2,
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
  headingLevel?: 1 | 2;
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
    allSteps: labels.allSteps ?? 'All steps',
  };
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const stateLabels: Record<GuidedStepState, string> = {
    complete: labels.stateComplete ?? defaultStateLabels.complete,
    current: labels.stateCurrent ?? defaultStateLabels.current,
    upcoming: labels.stateUpcoming ?? defaultStateLabels.upcoming,
    skipped: labels.stateSkipped ?? defaultStateLabels.skipped,
    blocked: labels.stateBlocked ?? defaultStateLabels.blocked,
    'safe-stop': labels.stateSafeStop ?? defaultStateLabels['safe-stop'],
  };

  return (
    <section className={styles.guide} aria-labelledby={headingId}>
      <div className={styles.guideTopline}>
        <p>{currentLabel}</p>
      </div>

      <div className={styles.primaryInstruction}>
        <span className={styles.visuallyHidden}>{copy.doNow}</span>
        <Heading id={headingId} ref={headingRef} tabIndex={-1}>{instruction}</Heading>
      </div>

      <div className={styles.status} role="status" aria-live="polite" data-tone={statusTone}><span className={styles.visuallyHidden}>{copy.status}</span><strong>{status}</strong></div>

      <details className={styles.guideDisclosure}>
        <summary>{copy.why}</summary>
        <div className={styles.detailsContent}>
          <p>{why}</p>
          <span className={styles.detailLabel}>{copy.next}</span>
          <p>{next}</p>
          <span className={styles.detailLabel}>{copy.allSteps}</span>
          <ol className={styles.stepList} aria-label={progressLabel}>
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
        </div>
      </details>
    </section>
  );
}
