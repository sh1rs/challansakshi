import type { JSX } from 'react';
import type { Language } from '../../lib/domain';
import type { OfficialHandoffPack } from '../../lib/official-handoff';
import type { OfficialFallbackRoute } from '../../lib/official-destinations';
import type { CitizenReturnState } from '../../lib/official-handoff-receipt';
import type { OfficialHandoffReceiptState } from '../../lib/official-handoff-receipt';
import type { CitizenReviewReturnReadiness } from '../../lib/citizen-review-handoff-controller';
import { getOfficialHandoffPresentation } from '../../lib/citizen-review-presentation';
import {
  ExtensionAssistCard,
  type ExtensionAssistCallbacks,
  type ExtensionAssistPresentation,
} from './ExtensionAssistCard';
import styles from './OfficialHandoffPanel.module.css';

type DestinationPresentation = Readonly<{
  serviceName: string;
  purpose: 'official-grievance-service' | 'official-service';
  domain: string;
  lastVerifiedAt: string;
  canonicalUrl: string;
}>;

type DraftBase = Readonly<{
  destination: DestinationPresentation;
  fallback: OfficialFallbackRoute;
  mappedCategory: Readonly<{ label: string; value: string }> | null;
  normalizedDescription: string;
  descriptionCodePointCount: number;
  descriptionError: string | null;
  checklist: readonly string[];
  resultRevisionId: string;
  packRevisionId: string;
}>;

export type OfficialHandoffDraft = DraftBase & (
  | Readonly<{ status: 'eligible'; eligibilityReason: 'action-ready'; routeKey: 'legacy' | 'nextgen' }>
  | Readonly<{ status: 'manual'; eligibilityReason: 'manual-route-only'; routeKey: 'delhi-manual' }>
  | Readonly<{ status: 'unresolved'; eligibilityReason: 'route-unresolved'; routeKey: 'unresolved' }>
  | Readonly<{
    status: 'abstained';
    eligibilityReason: 'result-not-action-ready' | 'source-not-action-ready' | 'pack-build-abstained';
    routeKey: 'legacy' | 'nextgen' | 'delhi-manual' | 'unresolved';
  }>
);

type PackConfirmation = Readonly<{
  affectedPersonPresent: boolean;
  affectedPersonInspectedEvidence: boolean;
  affectedPersonInspectedReadableRecord: boolean;
  affectedPersonConfirmedEntitlement: boolean;
  affectedPersonRequestedPreparation: boolean;
  affectedPersonConfirmedPack: boolean;
}>;

type ReturnAuthorization = Readonly<{
  affectedPersonPresent: boolean;
  affectedPersonRequestedReturnRecording: boolean;
  affectedPersonConfirmedReturnState: boolean;
  affectedPersonConfirmedReferenceFragment: boolean;
}>;

export type OfficialHandoffCallbacks = Readonly<{
  onDescriptionChange: (value: string) => void;
  onLookupValueChange: (value: string) => void;
  onAffectedPersonPresentChange: (checked: boolean) => void;
  onAffectedPersonInspectedEvidenceChange: (checked: boolean) => void;
  onAffectedPersonInspectedReadableRecordChange: (checked: boolean) => void;
  onAffectedPersonConfirmedEntitlementChange: (checked: boolean) => void;
  onAffectedPersonRequestedPreparationChange: (checked: boolean) => void;
  onAffectedPersonConfirmedPackChange: (checked: boolean) => void;
  onOfficialLinkActivate: () => boolean;
  onCopyField: (field: 'lookup' | 'category' | 'description') => void;
  onReturnStateChange: (value: CitizenReturnState) => void;
  onReferenceLastFourChange: (value: string) => void;
  onReturnAffectedPersonPresentChange: (checked: boolean) => void;
  onReturnRecordingRequestedChange: (checked: boolean) => void;
  onReturnStateConfirmedChange: (checked: boolean) => void;
  onReturnReferenceConfirmedChange: (checked: boolean) => void;
  onRecordReturn: () => void;
  onDownloadReceipt: () => void;
}>;

export type OfficialHandoffPanelProps = Readonly<{
  language: Language;
  simpleMode: boolean;
  reviewContext: Readonly<{
    role: 'self' | 'present-helper';
    deviceMode: 'private' | 'shared';
  }>;
  draft: OfficialHandoffDraft;
  confirmedPack: OfficialHandoffPack | null;
  packConfirmation: PackConfirmation;
  copyStatus:
    | Readonly<{ status: 'idle' }>
    | Readonly<{ status: 'copied'; field: 'lookup' | 'category' | 'description' }>
    | Readonly<{ status: 'failed'; field: 'lookup' | 'category' | 'description' }>;
  lookupValue: string | null;
  officialLinkStatus: 'not-activated' | 'activated';
  receiptState: OfficialHandoffReceiptState | null;
  returnDraft: Readonly<{
    selectedReturnState: CitizenReturnState | null;
    referenceLastFour: string;
  }>;
  returnAuthorization: ReturnAuthorization;
  returnReadiness: CitizenReviewReturnReadiness;
  extension: ExtensionAssistPresentation;
  callbacks: OfficialHandoffCallbacks;
  extensionCallbacks: ExtensionAssistCallbacks;
}>;

function Confirmation(props: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <label className={styles.confirmation}>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

type CopyFeedback = Readonly<Record<'category' | 'description', Readonly<Record<'failed' | 'copied', string>>>>;

function CopyStatus({
  status,
  feedback,
  label,
}: {
  status: OfficialHandoffPanelProps['copyStatus'];
  feedback: CopyFeedback;
  label: string;
}): JSX.Element {
  const message = status.status === 'idle' || status.field === 'lookup'
    ? null
    : feedback[status.field][status.status];
  return (
    <div
      className={`${styles.copyStatusRegion}${message ? ` ${styles.status}` : ''}`}
      aria-label={label}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

const returnStateKeys: readonly CitizenReturnState[] = [
  'acknowledgement-seen',
  'portal-unavailable',
  'not-submitted',
  'needs-correction',
];

export function OfficialHandoffPanel({
  language,
  simpleMode,
  reviewContext,
  draft,
  confirmedPack,
  packConfirmation,
  copyStatus,
  officialLinkStatus,
  receiptState,
  returnDraft,
  returnAuthorization,
  returnReadiness,
  extension,
  callbacks,
  extensionCallbacks,
}: OfficialHandoffPanelProps): JSX.Element {
  const copy = getOfficialHandoffPresentation(language, simpleMode);
  const privateDevice = reviewContext.deviceMode === 'private';
  const helping = reviewContext.role === 'present-helper';
  const returnAnnouncement = helping ? copy.returnAnnouncements.helper : copy.returnAnnouncements.self;
  const eligible = draft.status === 'eligible';
  // Non-actionable routes use the parent’s single, clock-checked safe lookup.
  const showOfficialAnchor = eligible && confirmedPack !== null;
  const returnRecorded = receiptState?.status === 'citizen-return-recorded';
  const purpose = copy.purpose[draft.destination.purpose];
  const returnReadinessMessage = returnReadiness.status === 'ready'
    ? null
    : copy.returnReadiness[({
      'current-pack-required': 'currentPackRequired',
      'official-link-not-activated': 'officialLinkNotActivated',
      'return-state-required': 'returnStateRequired',
      'reference-fragment-incomplete': 'referenceFragmentIncomplete',
      'affected-person-present-required': 'affectedPersonPresentRequired',
      'affected-person-recording-request-required': 'affectedPersonRecordingRequestRequired',
      'affected-person-return-state-confirmation-required': 'affectedPersonReturnStateConfirmationRequired',
      'affected-person-reference-confirmation-required': 'affectedPersonReferenceConfirmationRequired',
    } as const)[returnReadiness.reason]];
  const returnLabels = {
    'acknowledgement-seen': copy.returnStates.acknowledgementSeen,
    'portal-unavailable': copy.returnStates.portalUnavailable,
    'not-submitted': copy.returnStates.notSubmitted,
    'needs-correction': copy.returnStates.correctionNeeded,
  } as const;

  // One visible checkbox per role stands for the same underlying permission keys the
  // controller and pack builder already require; nothing in the data contract changes.
  const selfConfirmed = packConfirmation.affectedPersonInspectedEvidence
    && packConfirmation.affectedPersonInspectedReadableRecord
    && packConfirmation.affectedPersonConfirmedEntitlement
    && packConfirmation.affectedPersonConfirmedPack;
  const helperReviewed = packConfirmation.affectedPersonPresent
    && packConfirmation.affectedPersonInspectedEvidence
    && packConfirmation.affectedPersonInspectedReadableRecord
    && packConfirmation.affectedPersonConfirmedEntitlement;
  const helperConfirmedPack = packConfirmation.affectedPersonRequestedPreparation
    && packConfirmation.affectedPersonConfirmedPack;
  const referenceFragmentEntered = returnDraft.selectedReturnState === 'acknowledgement-seen'
    && returnDraft.referenceLastFour.length === 4;
  const helperReturnConfirmed = returnAuthorization.affectedPersonPresent
    && returnAuthorization.affectedPersonRequestedReturnRecording
    && returnAuthorization.affectedPersonConfirmedReturnState
    && (!referenceFragmentEntered || returnAuthorization.affectedPersonConfirmedReferenceFragment);

  const changeSelfConfirmation = (checked: boolean) => {
    callbacks.onAffectedPersonInspectedEvidenceChange(checked);
    callbacks.onAffectedPersonInspectedReadableRecordChange(checked);
    callbacks.onAffectedPersonConfirmedEntitlementChange(checked);
    callbacks.onAffectedPersonConfirmedPackChange(checked);
  };
  const changeHelperReview = (checked: boolean) => {
    callbacks.onAffectedPersonPresentChange(checked);
    callbacks.onAffectedPersonInspectedEvidenceChange(checked);
    callbacks.onAffectedPersonInspectedReadableRecordChange(checked);
    callbacks.onAffectedPersonConfirmedEntitlementChange(checked);
  };
  const changeHelperPackConfirmation = (checked: boolean) => {
    callbacks.onAffectedPersonRequestedPreparationChange(checked);
    callbacks.onAffectedPersonConfirmedPackChange(checked);
  };
  const changeHelperReturnConfirmation = (checked: boolean) => {
    // Unticking withdraws the return attestations; it is not a departure signal, so the
    // confirmed pack and link activation stay intact and recording remains blocked.
    if (checked) callbacks.onReturnAffectedPersonPresentChange(true);
    callbacks.onReturnRecordingRequestedChange(checked);
    callbacks.onReturnStateConfirmedChange(checked);
    if (referenceFragmentEntered) callbacks.onReturnReferenceConfirmedChange(checked);
  };

  const officialAnchor = showOfficialAnchor ? (
    <a
      data-required-action
      data-grievance-affordance
      className={`${styles.officialAnchor} ${officialLinkStatus === 'not-activated' ? styles.primaryAction : styles.secondaryAction}`}
      href={draft.destination.canonicalUrl}
      target="_blank"
      rel="noreferrer"
      onClick={eligible ? (event) => {
        if (!callbacks.onOfficialLinkActivate()) event.preventDefault();
      } : undefined}
    >
      {copy.openPrefix} {draft.destination.serviceName}
    </a>
  ) : null;

  return (
    <section className={styles.panel} aria-labelledby="official-handoff-heading">
      <p className={styles.eyebrow}>{copy.eyebrow}</p>
      {draft.status === 'abstained' ? (
        <h2 id="official-handoff-heading">{copy.abstainedHeading}</h2>
      ) : (
        <div className={styles.destination}>
          <h2 id="official-handoff-heading">{draft.destination.serviceName}</h2>
          <p className={styles.purpose} data-purpose={draft.destination.purpose}>{purpose}</p>
          <p className={styles.domain}>{draft.destination.domain}</p>
          <p className={styles.verified}>{copy.verified}: {draft.destination.lastVerifiedAt}</p>
        </div>
      )}

      {draft.status !== 'eligible' ? (
        <>
          <p className={styles.closedReason} role="status">
            {copy.eligibility[draft.status]}
          </p>
          {officialAnchor}
        </>
      ) : (
        <>
          {privateDevice ? (
            <CopyStatus status={copyStatus} feedback={copy.copyFeedback} label={copy.copyStatusLabel} />
          ) : null}

          {draft.mappedCategory ? (
            <section className={styles.fieldGroup} aria-labelledby="handoff-category-heading">
              <h3 id="handoff-category-heading">{copy.categoryHeading}</h3>
              <p>{draft.mappedCategory.label}</p>
              <p className={styles.selectableValue}>{draft.mappedCategory.value}</p>
              {privateDevice && confirmedPack ? (
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => callbacks.onCopyField('category')}
                >
                  {copy.copyCategory}
                </button>
              ) : null}
            </section>
          ) : null}

          <section className={styles.fieldGroup} aria-labelledby="handoff-description-heading">
            <h3 id="handoff-description-heading">{copy.descriptionHeading}</h3>
            <label htmlFor="handoff-description">{copy.descriptionLabel}</label>
            <textarea
              id="handoff-description"
              value={draft.normalizedDescription}
              onChange={(event) => callbacks.onDescriptionChange(event.currentTarget.value)}
              aria-invalid={draft.descriptionError ? true : undefined}
            />
            <p className={styles.fieldHelp} role="status" aria-live="polite">
              {language === 'hi'
                ? `${copy.descriptionCounter} ${draft.descriptionCodePointCount}`
                : `${draft.descriptionCodePointCount} ${copy.descriptionCounter}`}
            </p>
            {draft.descriptionError ? <p className={styles.error} role="alert">{draft.descriptionError}</p> : null}
            <p className={styles.selectableValue}>{draft.normalizedDescription}</p>
            {privateDevice && confirmedPack ? (
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => callbacks.onCopyField('description')}
              >
                {copy.copyDescription}
              </button>
            ) : <p className={styles.manualCopy}>{copy.sharedInstruction}</p>}
          </section>

          <section className={styles.confirmationGroup} aria-labelledby="handoff-role-heading">
            <h3 id="handoff-role-heading">{helping ? copy.roles.helper.heading : copy.roles.self.heading}</h3>
            {helping ? (
              <>
                <Confirmation
                  checked={helperReviewed}
                  label={copy.roles.helper.confirmations.affectedPersonPresentAndReviewed}
                  onChange={changeHelperReview}
                />
                <Confirmation
                  checked={helperConfirmedPack}
                  disabled={!helperReviewed}
                  label={copy.roles.helper.confirmations.affectedPersonRequestedAndConfirmedPack}
                  onChange={changeHelperPackConfirmation}
                />
                <p className={styles.boundary}>{copy.roles.helper.submitBoundary}</p>
              </>
            ) : (
              <Confirmation
                checked={selfConfirmed}
                label={copy.roles.self.confirmation}
                onChange={changeSelfConfirmation}
              />
            )}
          </section>

          {showOfficialAnchor ? (
            <section className={styles.openService} aria-labelledby="handoff-open-heading">
              <h3 id="handoff-open-heading">{copy.openHeading}</h3>
              <p>{copy.openBody.replace('{domain}', draft.destination.domain)}</p>
              {officialAnchor}
            </section>
          ) : null}
        </>
      )}

      {eligible && confirmedPack && officialLinkStatus === 'activated' ? (
        <section className={styles.returnSection}>
          <p className={styles.status} role="status" aria-live="polite">{copy.activated}</p>
          <fieldset className={styles.returnChoices}>
            <legend>{copy.returnHeading}</legend>
            {returnStateKeys.map((state) => (
              <label className={styles.returnChoice} key={state}>
                <input
                  type="radio"
                  name="official-handoff-return-state"
                  checked={returnDraft.selectedReturnState === state}
                  onChange={() => callbacks.onReturnStateChange(state)}
                />
                <span>{returnLabels[state]}</span>
              </label>
            ))}
          </fieldset>
          {returnDraft.selectedReturnState === 'portal-unavailable' ? (
            <aside className={styles.status}>
              <strong>{copy.fallback.heading}</strong>{' '}{copy.fallback.body}{' '}
              <p>{language === 'hi' ? 'ऊपर दिया गया वर्तमान आधिकारिक खोज विकल्प उपयोग करें।' : 'Use the current official lookup above.'}</p>
            </aside>
          ) : null}
          {privateDevice && returnDraft.selectedReturnState === 'acknowledgement-seen' ? (
            <label className={styles.referenceField}>
              <span>{copy.referenceLabel}</span>
              <input
                value={returnDraft.referenceLastFour}
                maxLength={4}
                onChange={(event) => callbacks.onReferenceLastFourChange(event.currentTarget.value)}
              />
            </label>
          ) : null}
          {helping ? (
            <Confirmation
              checked={helperReturnConfirmed}
              label={copy.returnAuthorization.affectedPersonConfirmedReturn}
              onChange={changeHelperReturnConfirmation}
            />
          ) : null}
          {returnReadinessMessage ? (
            <p id="handoff-return-readiness" className={styles.status} role="status">
              {returnReadinessMessage}
            </p>
          ) : null}
          <button
            className={`${styles.action} ${returnRecorded ? styles.secondaryAction : styles.primaryAction}`}
            type="button"
            disabled={returnReadiness.status !== 'ready'}
            aria-describedby={returnReadinessMessage ? 'handoff-return-readiness' : undefined}
            onClick={callbacks.onRecordReturn}
          >
            {copy.recordReturn}
          </button>
          {returnRecorded ? (
            <p className={styles.status} role="status" aria-live="polite">{returnAnnouncement.recorded}</p>
          ) : null}
          {privateDevice && returnRecorded ? (
            <button className={`${styles.action} ${styles.primaryAction}`} type="button" onClick={callbacks.onDownloadReceipt}>{copy.receiptDownload}</button>
          ) : null}
        </section>
      ) : null}

      {eligible && confirmedPack && privateDevice ? (
        <ExtensionAssistCard
          language={language}
          simpleMode={simpleMode}
          role={reviewContext.role}
          presentation={extension}
          callbacks={extensionCallbacks}
        />
      ) : null}
    </section>
  );
}
