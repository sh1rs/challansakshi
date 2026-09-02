import type { JSX } from 'react';
import type { Language } from '../../lib/domain';
import type { OfficialHandoffPack } from '../../lib/official-handoff';
import type { CitizenReturnState } from '../../lib/official-handoff-receipt';
import type { OfficialHandoffReceiptState } from '../../lib/official-handoff-receipt';
import { getOfficialHandoffPresentation } from '../../lib/citizen-review-presentation';
import {
  ExtensionAssistCard,
  type ExtensionAssistCallbacks,
  type ExtensionAssistPresentation,
} from './ExtensionAssistCard';
import styles from './OfficialHandoffPanel.module.css';

type DestinationPresentation = Readonly<{
  serviceName: string;
  purpose: 'official-grievance-service' | 'official-services-directory';
  domain: string;
  lastVerifiedAt: string;
  canonicalUrl: string;
}>;

type DraftBase = Readonly<{
  destination: DestinationPresentation;
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
  onAffectedPersonPresentChange: (checked: boolean) => void;
  onAffectedPersonInspectedEvidenceChange: (checked: boolean) => void;
  onAffectedPersonInspectedReadableRecordChange: (checked: boolean) => void;
  onAffectedPersonConfirmedEntitlementChange: (checked: boolean) => void;
  onAffectedPersonRequestedPreparationChange: (checked: boolean) => void;
  onAffectedPersonConfirmedPackChange: (checked: boolean) => void;
  onOfficialLinkActivate: () => void;
  onCopyField: (field: 'lookup' | 'category' | 'description', value: string) => void;
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
    safetyConsent: Readonly<{
      manualReviewAcknowledged: boolean;
      minimumDataAcknowledged: boolean;
      affectedPersonPresentAcknowledged: boolean;
    }>;
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
  extension: ExtensionAssistPresentation;
  callbacks: OfficialHandoffCallbacks;
  extensionCallbacks: ExtensionAssistCallbacks;
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

function CopyStatus({
  status,
  failure,
  success,
}: {
  status: OfficialHandoffPanelProps['copyStatus'];
  failure: string;
  success: string;
}): JSX.Element | null {
  if (status.status === 'idle') return null;
  return (
    <p className={styles.status} role="status" aria-live="polite">
      {status.status === 'failed' ? failure : success}
    </p>
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
  lookupValue,
  officialLinkStatus,
  receiptState,
  returnDraft,
  returnAuthorization,
  extension,
  callbacks,
  extensionCallbacks,
}: OfficialHandoffPanelProps): JSX.Element {
  const copy = getOfficialHandoffPresentation(language, simpleMode);
  const privateDevice = reviewContext.deviceMode === 'private';
  const helping = reviewContext.role === 'present-helper';
  const eligible = draft.status === 'eligible';
  const showOfficialAnchor = !eligible || confirmedPack !== null;
  const purpose = copy.purpose[draft.destination.purpose];
  const returnLabels = {
    'acknowledgement-seen': copy.returnStates.acknowledgementSeen,
    'portal-unavailable': copy.returnStates.portalUnavailable,
    'not-submitted': copy.returnStates.notSubmitted,
    'needs-correction': copy.returnStates.correctionNeeded,
  } as const;

  return (
    <section className={styles.panel} aria-labelledby="official-handoff-heading">
      <p className={styles.eyebrow}>{copy.eyebrow}</p>
      <h2 id="official-handoff-heading">{draft.destination.serviceName}</h2>
      <p className={styles.purpose}>{purpose}</p>
      <p className={styles.domain}>{draft.destination.domain}</p>
      <p className={styles.verified}>{copy.verified}: {draft.destination.lastVerifiedAt}</p>

      {draft.status !== 'eligible' ? (
        <p className={styles.closedReason} role="status">
          {copy.eligibility[draft.status]}
        </p>
      ) : (
        <>
          {privateDevice && lookupValue ? (
            <section className={styles.fieldGroup} aria-labelledby="handoff-lookup-heading">
              <h3 id="handoff-lookup-heading">{copy.lookupHeading}</h3>
              <p>{copy.lookupLabel}</p>
              <p className={styles.selectableValue}>{lookupValue}</p>
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => callbacks.onCopyField('lookup', lookupValue)}
              >
                {copy.copyLookup}
              </button>
            </section>
          ) : null}

          {draft.mappedCategory ? (
            <section className={styles.fieldGroup} aria-labelledby="handoff-category-heading">
              <h3 id="handoff-category-heading">{copy.categoryHeading}</h3>
              <p>{draft.mappedCategory.label}</p>
              <p className={styles.selectableValue}>{draft.mappedCategory.value}</p>
              {privateDevice ? (
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => callbacks.onCopyField('category', draft.mappedCategory?.value ?? '')}
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
            <p className={styles.fieldHelp}>{copy.descriptionHelp}</p>
            <p className={styles.fieldHelp}>{draft.descriptionCodePointCount} {language === 'hi' ? 'अक्षर' : 'characters'}</p>
            {draft.descriptionError ? <p className={styles.error} role="alert">{draft.descriptionError}</p> : null}
            <p className={styles.selectableValue}>{draft.normalizedDescription}</p>
            {privateDevice ? (
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => callbacks.onCopyField('description', draft.normalizedDescription)}
              >
                {copy.copyDescription}
              </button>
            ) : <p className={styles.manualCopy}>{copy.sharedInstruction}</p>}
            <CopyStatus status={copyStatus} failure={copy.copyFailure} success={copy.copySuccess} />
          </section>

          <section className={styles.checklist} aria-labelledby="handoff-checklist-heading">
            <h3 id="handoff-checklist-heading">{copy.checklistHeading}</h3>
            <ul>
              {draft.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className={styles.confirmationGroup} aria-labelledby="handoff-role-heading">
            <h3 id="handoff-role-heading">{helping ? copy.roles.helper.heading : copy.roles.self.heading}</h3>
            {helping ? (
              <>
                <Confirmation checked={packConfirmation.affectedPersonPresent} label={copy.roles.helper.confirmations.affectedPersonPresent} onChange={callbacks.onAffectedPersonPresentChange} />
                <Confirmation checked={packConfirmation.affectedPersonInspectedEvidence} label={copy.roles.helper.confirmations.affectedPersonInspectedEvidence} onChange={callbacks.onAffectedPersonInspectedEvidenceChange} />
                <Confirmation checked={packConfirmation.affectedPersonInspectedReadableRecord} label={copy.roles.helper.confirmations.affectedPersonInspectedReadableRecord} onChange={callbacks.onAffectedPersonInspectedReadableRecordChange} />
                <Confirmation checked={packConfirmation.affectedPersonConfirmedEntitlement} label={copy.roles.helper.confirmations.affectedPersonConfirmedEntitlement} onChange={callbacks.onAffectedPersonConfirmedEntitlementChange} />
                <Confirmation checked={packConfirmation.affectedPersonRequestedPreparation} label={copy.roles.helper.confirmations.affectedPersonRequestedPreparation} onChange={callbacks.onAffectedPersonRequestedPreparationChange} />
                <Confirmation checked={packConfirmation.affectedPersonConfirmedPack} label={copy.roles.helper.confirmations.affectedPersonConfirmedPack} onChange={callbacks.onAffectedPersonConfirmedPackChange} />
                <p className={styles.boundary}>{copy.roles.helper.submitBoundary}</p>
              </>
            ) : (
              <>
                <Confirmation checked={packConfirmation.affectedPersonInspectedEvidence} label={copy.roles.self.confirmations.affectedPersonInspectedEvidence} onChange={callbacks.onAffectedPersonInspectedEvidenceChange} />
                <Confirmation checked={packConfirmation.affectedPersonInspectedReadableRecord} label={copy.roles.self.confirmations.affectedPersonInspectedReadableRecord} onChange={callbacks.onAffectedPersonInspectedReadableRecordChange} />
                <Confirmation checked={packConfirmation.affectedPersonConfirmedEntitlement} label={copy.roles.self.confirmations.affectedPersonConfirmedEntitlement} onChange={callbacks.onAffectedPersonConfirmedEntitlementChange} />
                <Confirmation checked={packConfirmation.affectedPersonConfirmedPack} label={copy.roles.self.confirmations.affectedPersonConfirmedPack} onChange={callbacks.onAffectedPersonConfirmedPackChange} />
              </>
            )}
          </section>
        </>
      )}

      <section className={styles.leaving} aria-labelledby="handoff-leaving-heading">
        <h3 id="handoff-leaving-heading">{copy.leaveHeading}</h3>
        <p>{copy.leaveBody}</p>
        <p className={styles.boundary}>{copy.safetyBoundary}</p>
        {showOfficialAnchor ? (
          <a
            className={styles.officialAnchor}
            href={draft.destination.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            onClick={callbacks.onOfficialLinkActivate}
          >
            {copy.openPrefix} {draft.destination.serviceName}
          </a>
        ) : null}
      </section>

      {eligible && confirmedPack && officialLinkStatus === 'activated' ? (
        <section className={styles.returnSection} aria-labelledby="handoff-return-heading">
          <h3 id="handoff-return-heading">{copy.returnHeading}</h3>
          <p className={styles.status}>{copy.activated}</p>
          <div className={styles.returnChoices}>
            {returnStateKeys.map((state) => (
              <label className={styles.returnChoice} key={state}>
                <input
                  type="radio"
                  checked={returnDraft.selectedReturnState === state}
                  onChange={() => callbacks.onReturnStateChange(state)}
                />
                <span>{returnLabels[state]}</span>
              </label>
            ))}
          </div>
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
            <div className={styles.confirmationGroup}>
              <Confirmation checked={returnAuthorization.affectedPersonPresent} label={copy.returnAuthorization.affectedPersonPresent} onChange={callbacks.onReturnAffectedPersonPresentChange} />
              <Confirmation checked={returnAuthorization.affectedPersonRequestedReturnRecording} label={copy.returnAuthorization.affectedPersonRequestedReturnRecording} onChange={callbacks.onReturnRecordingRequestedChange} />
              <Confirmation checked={returnAuthorization.affectedPersonConfirmedReturnState} label={copy.returnAuthorization.affectedPersonConfirmedReturnState} onChange={callbacks.onReturnStateConfirmedChange} />
              <Confirmation checked={returnAuthorization.affectedPersonConfirmedReferenceFragment} label={copy.returnAuthorization.affectedPersonConfirmedReferenceFragment} onChange={callbacks.onReturnReferenceConfirmedChange} />
            </div>
          ) : null}
          <p className={styles.boundary}>{helping ? copy.returnBasis.helper : copy.returnBasis.self}</p>
          <button className={styles.action} type="button" onClick={callbacks.onRecordReturn}>{copy.recordReturn}</button>
          {privateDevice && receiptState?.status === 'citizen-return-recorded' ? (
            <button className={styles.action} type="button" onClick={callbacks.onDownloadReceipt}>{copy.receiptDownload}</button>
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
