import type { JSX } from 'react';
import type { Language } from '../../lib/domain';
import type { PublicExtensionRelease } from '../../lib/extension-release';
import { getOfficialHandoffPresentation } from '../../lib/citizen-review-presentation';
import styles from './ExtensionAssistCard.module.css';

export type ExtensionAssistPresentation = Readonly<{
  release: PublicExtensionRelease;
  preparationAllowedByController: boolean;
  supportedDesktopConfirmed: boolean;
  boundedSafetyReviewConfirmed: boolean;
  helperConfirmation: Readonly<{
    affectedPersonPresent: boolean;
    affectedPersonReviewedFields: boolean;
    affectedPersonRequestedPreparation: boolean;
  }>;
  preparation:
    | Readonly<{ status: 'idle' }>
    | Readonly<{ status: 'failed' }>
    | Readonly<{ status: 'prepared'; canonicalEnvelopeJson: string }>;
}>;

export type ExtensionAssistCallbacks = Readonly<{
  onSupportedDesktopChange: (checked: boolean) => void;
  onBoundedSafetyReviewChange: (checked: boolean) => void;
  onAffectedPersonPresentChange: (checked: boolean) => void;
  onAffectedPersonReviewedFieldsChange: (checked: boolean) => void;
  onAffectedPersonRequestedPreparationChange: (checked: boolean) => void;
  onPrepare: () => void;
  onClearPrepared: () => void;
}>;

type ExtensionAssistCardProps = Readonly<{
  language: Language;
  simpleMode: boolean;
  role: 'self' | 'present-helper';
  presentation: ExtensionAssistPresentation;
  callbacks: ExtensionAssistCallbacks;
}>;

function Confirmation(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <label className={styles.confirmation}>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

export function ExtensionAssistCard({
  language,
  simpleMode,
  role,
  presentation,
  callbacks,
}: ExtensionAssistCardProps): JSX.Element | null {
  if (presentation.release.status !== 'public-enabled') return null;

  const copy = getOfficialHandoffPresentation(language, simpleMode).helper;
  const helper = presentation.helperConfirmation;

  return (
    <aside className={styles.card} aria-labelledby="extension-assist-heading">
      <p className={styles.eyebrow}>{copy.heading}</p>
      <h3 id="extension-assist-heading">{copy.heading}</h3>
      <p>{copy.independence}</p>

      <a
        className={styles.action}
        href={presentation.release.acquisition.firstPartyLandingUrl}
        target="_blank"
        rel="noreferrer"
      >
        {copy.reviewLink}
      </a>

      <div className={styles.confirmations}>
        <Confirmation
          checked={presentation.supportedDesktopConfirmed}
          label={copy.confirmations.supportedDesktop}
          onChange={callbacks.onSupportedDesktopChange}
        />
        <Confirmation
          checked={presentation.boundedSafetyReviewConfirmed}
          label={copy.confirmations.boundedSafetyReview}
          onChange={callbacks.onBoundedSafetyReviewChange}
        />
        {role === 'present-helper' ? (
          <>
            <Confirmation
              checked={helper.affectedPersonPresent}
              label={copy.confirmations.affectedPersonPresent}
              onChange={callbacks.onAffectedPersonPresentChange}
            />
            <Confirmation
              checked={helper.affectedPersonReviewedFields}
              label={copy.confirmations.affectedPersonReviewedFields}
              onChange={callbacks.onAffectedPersonReviewedFieldsChange}
            />
            <Confirmation
              checked={helper.affectedPersonRequestedPreparation}
              label={copy.confirmations.affectedPersonRequestedPreparation}
              onChange={callbacks.onAffectedPersonRequestedPreparationChange}
            />
            <p className={styles.boundary}>{copy.submitBoundary}</p>
          </>
        ) : null}
      </div>

      <button
        className={styles.action}
        type="button"
        disabled={!presentation.preparationAllowedByController}
        onClick={callbacks.onPrepare}
      >
        {copy.prepare}
      </button>

      {presentation.preparation.status === 'failed' ? (
        <p className={styles.status} role="status" aria-live="polite">{copy.failed}</p>
      ) : null}
      {presentation.preparation.status === 'prepared' ? (
        <>
          <p className={styles.status} role="status" aria-live="polite">{copy.prepared}</p>
          <button className={styles.action} type="button" onClick={callbacks.onClearPrepared}>
            {copy.clear}
          </button>
          <span
            className={styles.capsule}
            data-challansakshi-extension-handoff="v1"
            aria-hidden="true"
            translate="no"
          >
            <span data-challansakshi-extension-envelope="v1">
              {presentation.preparation.canonicalEnvelopeJson}
            </span>
          </span>
        </>
      ) : null}
    </aside>
  );
}
