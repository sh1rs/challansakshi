'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { CitizenGoal } from '../../lib/citizen-home';
import { useClientReady } from '../shared/useClientReady';
import { CitizenReviewCheck } from './CitizenReviewCheck';
import adaptive from './CitizenReviewAdaptive.module.css';
import { deriveCitizenReviewQuestionPlan, type CitizenReviewInputId, type CitizenReviewDecisionQuestionId } from '../../lib/citizen-review-question-plan';
import { createCitizenReviewState, getCitizenReviewAnswers, getCitizenReviewFactsSignature, changeCitizenReviewAnswer, selectCitizenReviewFile, confirmCitizenReviewState, confirmCitizenReviewHelper, invalidateCitizenReviewFacts, type CitizenReviewDevice } from '../../lib/citizen-review-state';
import {
  getCitizenReviewPresentation,
  localizeAssessment,
} from '../../lib/citizen-review-presentation';
import type { Language } from '../../lib/domain';
import {
  buildCitizenEvidencePresentationView,
  buildCitizenEvidenceSummary,
  buildCitizenEvidenceView,
  buildCitizenTimeline,
  type CitizenEvidencePresentationView,
} from '../../lib/evidence-intelligence';
import {
  assessCitizenChallanReview,
  calculateEnteredOfficialDeadline,
  citizenSituationForFinding,
  type CitizenSituation,
  type RecordAvailability,
} from '../../lib/public-challan';
import { startSharedDeviceInactivityGuard } from '../../lib/shared-device-inactivity';
import {
  ALL_ISSUING_JURISDICTION_CODES,
  getOfficialRouteFreshnessToken,
  getOfficialRouteFreshnessDelayMs,
  resolveCurrentOfficialAuxiliaryRoute,
  type IssuingJurisdictionCode,
  type JurisdictionConfirmation,
} from '../../lib/official-destinations';
import { CURRENT_EXTENSION_RELEASE_STATE, evaluatePublicExtensionRelease } from '../../lib/extension-release';
import {
  activateCitizenReviewOfficialLink,
  buildCitizenReviewHandoffView,
  changeCitizenExtensionConsent,
  changeCitizenReferenceLastFour,
  changeCitizenReturnAuthorization,
  changeCitizenReturnState,
  changeCitizenReviewHandoffDescription,
  changeCitizenReviewLookupValue,
  changeCitizenReviewPackPermission,
  clearCitizenReviewExtensionPreparation,
  completeCitizenReviewCopy,
  confirmCitizenReviewHandoffPack,
  createCitizenReviewHandoffController,
  expireCitizenReviewExtensionPreparation,
  getCitizenReviewExtensionReadiness,
  getCitizenReviewReceiptState,
  getCitizenReviewEffectGuardSignature,
  getCitizenReviewReturnReadiness,
  invalidateCitizenReviewHandoff,
  isCitizenReviewCurrentPack,
  prepareCitizenReviewExtension,
  projectCitizenReviewHandoffRenderState,
  recordCitizenReviewReturn,
  requestCitizenReceiptDownload,
  requestCitizenReviewCopy,
  reconcileCitizenReviewCurrentPack,
  type CitizenReviewBrowserEffect,
  type CitizenReviewHandoffControllerState,
} from '../../lib/citizen-review-handoff-controller';
import { LocalRecordIntake, type LocalRecordSelection } from './LocalRecordIntake';
import { OfficialHandoffPanel } from './OfficialHandoffPanel';
import { PublicBetaShell, publicBetaStyles as styles } from './PublicBetaShell';

type Step = 'check' | 'resolve';
type Device = CitizenReviewDevice;
type ReviewError = { step: Step; message: string };

function freshOpaqueRevisionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function t(language: Language, en: string, hi: string) {
  return language === 'hi' ? hi : en;
}

function indiaDateNow() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function downloadSummary(summary: string) {
  const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'challansakshi-citizen-evidence-summary.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([v, text]) => (
          <option value={v} key={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function Preview({
  selection,
  title,
  language,
}: {
  selection: LocalRecordSelection;
  title: string;
  language: Language;
}) {
  return (
    <article className={styles.localPreview}>
      <header>
        <strong>{title}</strong>
        <small>
          {selection.meta.role === 'photograph'
            ? t(language, 'Selected photograph', 'चुनी गई तस्वीर')
            : t(language, 'Selected notice', 'चुना गया नोटिस')}
        </small>
      </header>
      {selection.meta.previewKind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element -- Deliberate local object URL; never routed through a service.
        <img
          src={selection.previewUrl}
          alt={t(language, `${title} preview`, `${title} प्रीव्यू`)}
        />
      ) : (
        <div className={styles.localPdfOpen}>
          <a href={selection.previewUrl} target="_blank" rel="noopener noreferrer">
            {t(language, 'Open selected PDF locally', 'चुना गया PDF स्थानीय रूप से खोलें')}
          </a>
          <p>
            {t(
              language,
              'Opens in a new browser-local tab. Close that PDF tab yourself, especially on a shared device.',
              'नए ब्राउज़र-स्थानीय टैब में खुलता है। खासकर साझा डिवाइस पर PDF टैब स्वयं बंद करें।',
            )}
          </p>
        </div>
      )}
    </article>
  );
}
const resultText: Record<
  CitizenSituation,
  {
    title: [string, string];
    simpleTitle: [string, string];
    body: [string, string];
    simple: [string, string];
    tone: 'warn' | 'good' | 'stop';
  }
> = {
  'source-not-verified': {
    title: [
      'Check the notice on an official service first',
      'पहले आधिकारिक सेवा पर नोटिस जाँचें',
    ],
    simpleTitle: ['Open an official service first', 'पहले आधिकारिक सेवा खोलें'],
    body: [
      'A message or forwarded link is not enough to begin an evidence comparison.',
      'सिर्फ संदेश या भेजा हुआ लिंक सबूत तुलना के लिए पर्याप्त नहीं है।',
    ],
    simple: [
      'Do not rely on the message. Find the record on an official service first.',
      'संदेश पर भरोसा न करें। पहले आधिकारिक सेवा पर रिकॉर्ड खोजें।',
    ],
    tone: 'stop',
  },
  'insufficient-review': {
    title: ['Not enough information to review', 'समीक्षा के लिए पर्याप्त जानकारी नहीं'],
    simpleTitle: ['You need clearer records', 'आपको साफ़ रिकॉर्ड चाहिए'],
    body: [
      'Inspect the supplied evidence and a readable comparison record before treating a difference as action-ready.',
      'अंतर पर कार्रवाई से पहले दी गई तस्वीर और पढ़ने योग्य तुलना रिकॉर्ड देखें।',
    ],
    simple: [
      'More clear records are needed before deciding what to do.',
      'निर्णय से पहले अधिक साफ़ रिकॉर्ड चाहिए।',
    ],
    tone: 'stop',
  },
  'records-appear-consistent': {
    title: [
      'Your entries do not support a vehicle mismatch',
      'आपकी प्रविष्टियाँ वाहन बेमेल का समर्थन नहीं करतीं',
    ],
    simpleTitle: [
      'The photo and vehicle record look alike',
      'तस्वीर और वाहन रिकॉर्ड मेल खाते दिखते हैं',
    ],
    body: [
      'The plate and category observations align. ChallanSakshi will not manufacture a dispute.',
      'नंबर प्लेट और श्रेणी मेल खाते हैं। ChallanSakshi विवाद नहीं गढ़ेगा।',
    ],
    simple: [
      'The plate and vehicle type appear to match.',
      'नंबर प्लेट और वाहन का प्रकार मेल खाते दिखते हैं।',
    ],
    tone: 'good',
  },
  'evidence-unclear': {
    title: ['Supplied image remains unclear', 'दी गई तस्वीर अभी भी अस्पष्ट है'],
    simpleTitle: ['The photo is not clear enough', 'तस्वीर पर्याप्त साफ़ नहीं है'],
    body: [
      'One or more evidence fields are unreadable, missing, or not assessable from the supplied still.',
      'एक या अधिक सबूत फ़ील्ड अपठनीय, गायब या तस्वीर से जाँचने योग्य नहीं हैं।',
    ],
    simple: [
      'The photo is not clear enough to decide. Ask for clearer evidence.',
      'तस्वीर पर्याप्त साफ़ नहीं है। साफ़ सबूत माँगें।',
    ],
    tone: 'warn',
  },
  'material-inconsistency-recorded': {
    title: [
      'Citizen-recorded material inconsistency',
      'नागरिक द्वारा दर्ज महत्वपूर्ण असंगति',
    ],
    simpleTitle: [
      'Possible vehicle mismatch',
      'वाहन में संभावित अंतर',
    ],
    body: [
      'Your observations contain a readable plate or vehicle-category conflict. Official verification is still required.',
      'आपके अवलोकनों में नंबर प्लेट या वाहन श्रेणी का अंतर है। आधिकारिक जाँच अभी भी ज़रूरी है।',
    ],
    simple: [
      'The photo and your vehicle record do not appear to match.',
      'तस्वीर और आपके वाहन रिकॉर्ड में अंतर दिखता है।',
    ],
    tone: 'warn',
  },
};

function sourceLabel(view: CitizenEvidencePresentationView, id: string, fallback: string) {
  return view.sources.find((source) => source.id === id)?.label
    ?? fallback;
}

function EvidenceRows({
  evidence,
  language,
  simpleMode,
}: {
  evidence: CitizenEvidencePresentationView;
  language: Language;
  simpleMode: boolean;
}) {
  const labels = getCitizenReviewPresentation(language, simpleMode).table;

  return (
    <div className={styles.evidenceTable}>
      <table>
        <caption>{labels.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.field}</th>
            <th scope="col">{labels.observation}</th>
            <th scope="col">{labels.source}</th>
            <th scope="col">{labels.confidence}</th>
            <th scope="col">{labels.confirmation}</th>
            <th scope="col">{labels.limitation}</th>
          </tr>
        </thead>
        <tbody>
          {evidence.observations.map((item) => (
            <tr key={item.id}>
              <td data-label={labels.field}>{item.field}</td>
              <td data-label={labels.observation}>{item.value}</td>
              <td data-label={labels.source}>
                {sourceLabel(evidence, item.sourceId, labels.sourceFallback)}
              </td>
              <td data-label={labels.confidence}>{item.confidence}</td>
              <td data-label={labels.confirmation}>{item.confirmation}</td>
              <td data-label={labels.limitation}>{item.limitation ?? labels.none}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type CitizenReviewAppProps = Readonly<{
  readRenderNowMs?: () => number;
  initialGoal?: CitizenGoal | null;
  initialNowIso?: string;
}>;

export default function CitizenReviewApp({ readRenderNowMs = Date.now, initialGoal = null, initialNowIso = new Date().toISOString() }: CitizenReviewAppProps = {}) {
  const clientReady = useClientReady();
  const [language, setLanguage] = useState<Language>('en');
  const [reviewState, setReviewState] = useState(() => createCitizenReviewState(initialGoal));
  const step = reviewState.phase;
  const role = reviewState.role;
  const confirmedSignature = reviewState.confirmedFactsSignature;
  const helperSignature = reviewState.helperConfirmedSignature;
  const [device, setDevice] = useState<Device>('unknown');
  const [recordSelection, setRecordSelection] = useState<LocalRecordSelection | null>(null);
  const [photographSelection, setPhotographSelection] = useState<LocalRecordSelection | null>(null);
  const [artifactSignature, setArtifactSignature] = useState('');
  const simpleMode = true;
  const [expandedQuestion, setExpandedQuestion] = useState<CitizenReviewDecisionQuestionId | null>(null);
  const [fileIntakeRequested, setFileIntakeRequested] = useState(false);
  const [preparationOpen, setPreparationOpen] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionConfirmation>({ status: 'unconfirmed' });
  const [handoffState, setHandoffState] = useState<CitizenReviewHandoffControllerState>(() => (
    createCitizenReviewHandoffController({
      resultRevisionId: freshOpaqueRevisionId(),
      packRevisionId: freshOpaqueRevisionId(),
      deviceMode: 'shared',
    })
  ));
  const [vehicleSuffix, setVehicleSuffix] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [officialDeadline, setOfficialDeadline] = useState('');
  const [offence, setOffence] = useState('');
  const [referenceDate, setReferenceDate] = useState(indiaDateNow);
  const [routeNowIso, setRouteNowIso] = useState(initialNowIso);
  const [error, setError] = useState<ReviewError | null>(null);
  const [artifactStatus, setArtifactStatus] = useState<{ signature: string; message: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [minimumContentHeight, setMinimumContentHeight] = useState<number>();
  const preservedScrollYRef = useRef<number | null>(null);
  const questionFocusRef = useRef<CitizenReviewDecisionQuestionId | null>(null);
  const previousStep = useRef(step);
  const signatureRef = useRef('');
  const confirmedSignatureRef = useRef('');
  const operationToken = useRef(0);
  const recordSelectionRef = useRef<LocalRecordSelection | null>(null);
  const photographSelectionRef = useRef<LocalRecordSelection | null>(null);
  const clearAndExitRef = useRef<() => void>(() => undefined);
  const handoffStateRef = useRef(handoffState);

  const answers = useMemo(() => getCitizenReviewAnswers(reviewState), [reviewState]);
  const questionPlan = useMemo(() => deriveCitizenReviewQuestionPlan({
    answers, answeredQuestionIds: reviewState.answeredQuestionIds,
    hasSelectedPhotograph: reviewState.photograph.present,
  }), [answers, reviewState.answeredQuestionIds, reviewState.photograph.present]);
  const signature = useMemo(() => getCitizenReviewFactsSignature(reviewState), [reviewState]);
  const factsConfirmed = confirmedSignature === signature && confirmedSignature !== '' && role !== 'unselected';
  const helperConfirmed = factsConfirmed && helperSignature === signature && helperSignature !== '';
  const evidenceConfirmed = factsConfirmed && (role !== 'helper' || helperConfirmed);
  const routeFreshnessToken = getOfficialRouteFreshnessToken('national-record-lookup', routeNowIso);
  const presentationSignature = JSON.stringify({ signature, language, device, jurisdiction, vehicleSuffix, eventDate, officialDeadline, offence, routeFreshnessToken });
  const artifactInputRef = useRef(presentationSignature);
  const summaryGenerated = artifactSignature === presentationSignature && artifactSignature !== '';
  const presentation = getCitizenReviewPresentation(language, simpleMode);
  const reviewRole = role === 'helper' ? 'present-helper' : 'self';
  const reviewDevice = device === 'private' ? 'private' : 'shared';
  const jurisdictionLabel = jurisdiction.status === 'confirmed'
    ? jurisdiction.code
    : t(language, 'I am not sure', 'मुझे पता नहीं');
  const assessment = useMemo(() => assessCitizenChallanReview(answers), [answers]);
  const localizedAssessment = useMemo(
    () => localizeAssessment(assessment, language, simpleMode),
    [assessment, language, simpleMode],
  );

  const deadline = useMemo(() => {
    try {
      return calculateEnteredOfficialDeadline(officialDeadline, referenceDate);
    } catch {
      return null;
    }
  }, [officialDeadline, referenceDate]);

  const canonicalView = evidenceConfirmed
    ? buildCitizenEvidenceView({
      answers,
      answeredQuestionIds: reviewState.answeredQuestionIds,
      assessment,
      confirmation: 'confirmed',
      recordMeta: recordSelection?.meta,
      photographMeta: photographSelection?.meta,
    })
    : null;
  const view = canonicalView
    ? buildCitizenEvidencePresentationView(canonicalView, { language, simpleMode })
    : null;
  const timelineFor = (generated: boolean) => buildCitizenTimeline({
    recordSelected: Boolean(recordSelection),
    imageSelected: Boolean(photographSelection),
    sourceConfirmed:
      answers.sourceStatus !== 'not-selected' && answers.sourceStatus !== 'message-only',
    observationsConfirmed: factsConfirmed,
    summaryGenerated: generated,
    language,
  });
  const summaryFor = (generated: boolean) => (evidenceConfirmed
    ? buildCitizenEvidenceSummary({
      answers,
      answeredQuestionIds: reviewState.answeredQuestionIds,
      assessment,
      confirmation: 'confirmed',
      jurisdiction: jurisdictionLabel,
      vehicleSuffix,
      allegedOffence: offence,
      eventDate,
      officialDeadline,
      recordMeta: recordSelection?.meta,
      photographMeta: photographSelection?.meta,
      language,
      simpleMode,
      timeline: timelineFor(generated),
    })
    : '');
  const situation = citizenSituationForFinding(assessment.finding);
  const copy = resultText[situation];
  const resultTitle = (simpleMode ? copy.simpleTitle : copy.title)[language === 'hi' ? 1 : 0];
  const resultBody = situation === 'material-inconsistency-recorded'
    ? answers.plateObservation === 'different'
      ? t(language, 'You marked the readable plate in the photo as different from your vehicle record.', 'आपने तस्वीर की पढ़ने योग्य नंबर प्लेट को अपने वाहन रिकॉर्ड से अलग बताया।')
      : t(language, 'You marked the vehicle type in the photo as different from your vehicle record.', 'आपने तस्वीर में वाहन के प्रकार को अपने वाहन रिकॉर्ड से अलग बताया।')
    : situation === 'insufficient-review'
      ? answers.ownRecordAvailable !== 'present'
        ? t(language, 'You need a readable RC or independent vehicle record before comparing the photo.', 'तस्वीर की तुलना से पहले पढ़ने योग्य RC या स्वतंत्र वाहन रिकॉर्ड चाहिए।')
        : t(language, 'You could not inspect the photo, so no vehicle comparison was made.', 'आप तस्वीर नहीं देख सके, इसलिए वाहन की तुलना नहीं की गई।')
      : copy.simple[language === 'hi' ? 1 : 0];
  const handoffViewInput = useMemo(() => ({
    answers,
    factsConfirmed: evidenceConfirmed && device !== 'unknown' && step === 'resolve',
    jurisdictionConfirmation: jurisdiction,
    role: reviewRole,
    deviceMode: reviewDevice,
    language,
    simpleMode,
    nowIso: routeNowIso,
  } as const), [
    answers,
    evidenceConfirmed,
    device,
    step,
    jurisdiction,
    reviewRole,
    reviewDevice,
    language,
    simpleMode,
    routeNowIso,
  ]);
  const handoffView = buildCitizenReviewHandoffView(handoffState, handoffViewInput);
  const extensionRelease = evaluatePublicExtensionRelease(CURRENT_EXTENSION_RELEASE_STATE);
  const renderNowMs = handoffState.extensionPreparation.status === 'prepared'
    ? readRenderNowMs()
    : Date.parse(routeNowIso);
  const handoffRenderState = projectCitizenReviewHandoffRenderState(
    handoffState,
    handoffView,
    renderNowMs,
  );
  const hasCurrentHandoffPack = isCitizenReviewCurrentPack(handoffState, handoffView)
    && handoffRenderState.currentPack !== null;
  const currentHandoffPack = handoffRenderState.currentPack;
  const returnReadiness = getCitizenReviewReturnReadiness(handoffState, handoffView);
  const extensionReadiness = currentHandoffPack
    ? getCitizenReviewExtensionReadiness(handoffState, handoffView, extensionRelease)
    : { status: 'blocked' as const, reason: 'current-pack-required' as const };
  const currentExtensionPreparation = handoffRenderState.extensionPreparation;

  useEffect(() => {
    signatureRef.current = signature;
    confirmedSignatureRef.current = confirmedSignature;
    artifactInputRef.current = presentationSignature;
  }, [signature, confirmedSignature, presentationSignature]);

  useEffect(() => {
    handoffStateRef.current = handoffState;
  }, [handoffState]);

  useEffect(() => {
    if (!handoffState.confirmedPack || hasCurrentHandoffPack) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setHandoffState((current) => {
        const revisions = {
          resultRevisionId: freshOpaqueRevisionId(),
          packRevisionId: freshOpaqueRevisionId(),
        };
        const expired = expireCitizenReviewExtensionPreparation(current, renderNowMs, revisions);
        const nowIso = Number.isFinite(renderNowMs)
          ? new Date(renderNowMs).toISOString()
          : handoffViewInput.nowIso;
        return reconcileCitizenReviewCurrentPack(
          expired,
          buildCitizenReviewHandoffView(expired, { ...handoffViewInput, nowIso }),
          revisions,
        );
      });
    });
    return () => {
      active = false;
    };
  }, [handoffState.confirmedPack, handoffView.contextSignature, handoffViewInput, hasCurrentHandoffPack, renderNowMs]);

  useEffect(() => () => {
    operationToken.current += 1;
    signatureRef.current = '';
    confirmedSignatureRef.current = '';
    artifactInputRef.current = '';
    if (recordSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(recordSelectionRef.current.previewUrl);
    }
    if (photographSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(photographSelectionRef.current.previewUrl);
    }
    handoffStateRef.current = invalidateCitizenReviewHandoff(handoffStateRef.current, {
      resultRevisionId: freshOpaqueRevisionId(),
      packRevisionId: freshOpaqueRevisionId(),
    });
  }, []);

  useEffect(() => {
    if (handoffState.extensionPreparation.status !== 'prepared') return;
    const delay = Math.max(0, handoffState.extensionPreparation.expiresAtMs - Date.now());
    const timer = window.setTimeout(() => {
      setRouteNowIso(new Date().toISOString());
      setHandoffState((current) => expireCitizenReviewExtensionPreparation(current, Date.now(), {
        resultRevisionId: freshOpaqueRevisionId(),
        packRevisionId: freshOpaqueRevisionId(),
      }));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [handoffState.extensionPreparation]);

  useEffect(() => {
    const refresh = () => {
      setReferenceDate(indiaDateNow());
      setRouteNowIso(new Date().toISOString());
    };
    const delay = getOfficialRouteFreshnessDelayMs('national-record-lookup', routeNowIso);
    const timer = delay === null ? undefined : window.setTimeout(refresh, delay);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [routeNowIso]);

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [step]);

  const invalidateArtifact = () => {
    operationToken.current += 1;
    setArtifactSignature('');
    setArtifactStatus(null);
  };

  const invalidate = () => {
    const next = invalidateCitizenReviewHandoff(handoffStateRef.current, {
      resultRevisionId: freshOpaqueRevisionId(),
      packRevisionId: freshOpaqueRevisionId(),
    });
    handoffStateRef.current = next;
    setHandoffState(next);
    setError(null);
    invalidateArtifact();
  };

  const reset = () => {
    setReviewState(createCitizenReviewState());
    setDevice('unknown');
    setRecordSelection(null);
    setPhotographSelection(null);
    recordSelectionRef.current = null;
    photographSelectionRef.current = null;
    confirmedSignatureRef.current = '';
    invalidate();
    setHandoffState(current => ({ ...current, role: 'self', deviceMode: 'shared' }));
    setJurisdiction({ status: 'unconfirmed' });
    setVehicleSuffix('');
    setEventDate('');
    setOfficialDeadline('');
    setOffence('');
    setError(null);
    setPreparationOpen(false);
    setFileIntakeRequested(false);
  };

  const clearAndExit = () => {
    if (recordSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(recordSelectionRef.current.previewUrl);
    }
    if (photographSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(photographSelectionRef.current.previewUrl);
    }
    reset();
    window.location.replace('/');
  };

  useEffect(() => {
    clearAndExitRef.current = clearAndExit;
  });

  useEffect(() => {
    if (device !== 'shared') return;

    const guard = startSharedDeviceInactivityGuard({
      windowTarget: window,
      documentTarget: document,
      isVisible: () => document.visibilityState === 'visible',
      onExpire: () => clearAndExitRef.current(),
    });
    return guard.stop;
  }, [device]);

  const preserveViewportHeight = () => {
    const main = mainRef.current;
    if (!main) return;
    preservedScrollYRef.current = window.scrollY;
    // A shorter result must not clamp the browser's current scroll position.
    // Reserve only the height needed for this viewport, not the whole old form.
    const surroundingHeight = document.documentElement.scrollHeight - main.getBoundingClientRect().height;
    setMinimumContentHeight(Math.max(0, Math.ceil(window.scrollY + window.innerHeight - surroundingHeight)));
  };

  useLayoutEffect(() => {
    const scrollY = preservedScrollYRef.current;
    if (scrollY === null) return;
    preservedScrollYRef.current = null;
    if (/\bjsdom\b/i.test(window.navigator.userAgent)) {
      (document.scrollingElement ?? document.documentElement).scrollTop = scrollY;
      return;
    }
    window.scrollTo({ top: scrollY, left: window.scrollX, behavior: 'instant' });
  }, [step, minimumContentHeight]);

  const editAnswers = () => {
    preserveViewportHeight();
    // Move focus off the departing subtree before React removes it.
    headingRef.current?.focus({ preventScroll: true });
    invalidate();
    confirmedSignatureRef.current = '';
    setReviewState(invalidateCitizenReviewFacts);
    setExpandedQuestion(questionPlan.visible.at(-1) ?? 'source');
    setPreparationOpen(false);
  };

  const expandQuestion = (id: CitizenReviewDecisionQuestionId) => {
    questionFocusRef.current = id;
    setExpandedQuestion(id);
  };

  useEffect(() => {
    const id = questionFocusRef.current;
    if (!id || expandedQuestion !== id) return;
    questionFocusRef.current = null;
    const group = document.getElementById(`review-question-${id}`);
    const control = group?.querySelector<HTMLInputElement>('input:checked') ?? group?.querySelector<HTMLInputElement>('input');
    control?.focus({ preventScroll: true });
  }, [expandedQuestion]);

  const showError = (message: string) => setError({ step, message });

  const chooseDevice = (nextDevice: 'private' | 'shared') => {
    invalidate();
    setHandoffState((current) => ({ ...current, deviceMode: nextDevice }));
    setDevice(nextDevice);
  };

  const changeAnswer = (id: CitizenReviewInputId, value: string) => {
    invalidate();
    confirmedSignatureRef.current = '';
    if (id === 'plate' && value === 'unavailable') {
      if (photographSelectionRef.current?.previewUrl) URL.revokeObjectURL(photographSelectionRef.current.previewUrl);
      photographSelectionRef.current = null;
      setPhotographSelection(null);
    }
    setReviewState(current => changeCitizenReviewAnswer(current, id, value));
    setExpandedQuestion(null);
  };

  const changeJurisdiction = (nextJurisdiction: JurisdictionConfirmation) => {
    invalidate();
    setJurisdiction(nextJurisdiction);
  };

  const changeVehicleSuffix = (nextValue: string) => {
    invalidate();
    setVehicleSuffix(nextValue);
  };

  const changeEventDate = (nextValue: string) => {
    invalidate();
    setEventDate(nextValue);
  };

  const changeOfficialDeadline = (nextValue: string) => {
    invalidate();
    setOfficialDeadline(nextValue);
  };

  const changeOffence = (nextValue: string) => {
    invalidate();
    setOffence(nextValue);
  };

  const changeLanguage = (nextLanguage: Language) => {
    setHandoffState((current) => invalidateCitizenReviewHandoff(current, {
      resultRevisionId: freshOpaqueRevisionId(),
      packRevisionId: freshOpaqueRevisionId(),
    }));
    invalidateArtifact();
    setLanguage(nextLanguage);
  };

  const quickExit = clearAndExit;

  const confirmAnswers = (targetRole: 'self' | 'helper') => {
    const result = confirmCitizenReviewState(reviewState, targetRole);
    if (result.missing.length) {
      showError(t(language, 'Choose an answer to continue.', 'आगे बढ़ने के लिए उत्तर चुनें।'));
      const firstMissing = result.missing[0];
      setExpandedQuestion(firstMissing);
      const control = document.querySelector<HTMLInputElement>(`#review-question-${firstMissing} input`);
      control?.focus({ preventScroll: true });
      const rect = control?.getBoundingClientRect();
      if (control && rect && (rect.top < 0 || rect.bottom > window.innerHeight)) control.scrollIntoView({ block: 'nearest' });
      return;
    }
    if ((vehicleSuffix && vehicleSuffix.length !== 4) || (officialDeadline && !deadline)) {
      showError(t(language, 'Check the optional last four characters or deadline you entered.', 'दर्ज किए आखिरी चार अक्षर/अंक या अंतिम तारीख जाँचें।'));
      return;
    }
    if (result.state.phase !== step) {
      preserveViewportHeight();
      headingRef.current?.focus({ preventScroll: true });
    }
    invalidate();
    setHandoffState(current => ({ ...current, role: targetRole === 'helper' ? 'present-helper' : 'self' }));
    confirmedSignatureRef.current = result.state.confirmedFactsSignature;
    setReviewState(result.state);
  };

  const selectHelper = () => {
    invalidate();
    setHandoffState(current => ({ ...current, role: 'present-helper' }));
    confirmedSignatureRef.current = '';
    setReviewState(current => ({ ...invalidateCitizenReviewFacts(current), role: 'helper' }));
  };

  const confirmAffectedPerson = () => {
    preserveViewportHeight();
    headingRef.current?.focus({ preventScroll: true });
    invalidate();
    setReviewState(confirmCitizenReviewHelper);
  };

  const recordChanged = (selection: LocalRecordSelection | null) => {
    invalidate();
    if (
      recordSelectionRef.current?.previewUrl
      && recordSelectionRef.current.previewUrl !== selection?.previewUrl
    ) {
      URL.revokeObjectURL(recordSelectionRef.current.previewUrl);
    }
    recordSelectionRef.current = selection;
    setRecordSelection(selection);
    setReviewState(current => selectCitizenReviewFile(current, 'record', selection !== null));
  };
  const photographChanged = (selection: LocalRecordSelection | null) => {
    invalidate();
    if (
      photographSelectionRef.current?.previewUrl
      && photographSelectionRef.current.previewUrl !== selection?.previewUrl
    ) {
      URL.revokeObjectURL(photographSelectionRef.current.previewUrl);
    }
    photographSelectionRef.current = selection;
    setPhotographSelection(selection);
    setReviewState(current => selectCitizenReviewFile(current, 'photograph', selection !== null));
  };
  const chooseManualEntry = () => {
    invalidate();
    if (recordSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(recordSelectionRef.current.previewUrl);
    }
    recordSelectionRef.current = null;
    setRecordSelection(null);
    setReviewState(current => selectCitizenReviewFile(current, 'record', false));
  };

  const beginArtifactOperation = () => {
    const nowIso = new Date().toISOString();
    if (resolveCurrentOfficialAuxiliaryRoute('national-record-lookup', nowIso).status !== 'current' || routeFreshnessToken !== getOfficialRouteFreshnessToken('national-record-lookup', nowIso)) {
      invalidate();
      setRouteNowIso(nowIso);
      return null;
    }
    if (signatureRef.current !== signature || confirmedSignatureRef.current !== signature || artifactInputRef.current !== presentationSignature) return null;
    return {
      token: ++operationToken.current,
      actionSignature: signature,
      actionPresentationSignature: presentationSignature,
    };
  };

  const operationIsCurrent = (token: number, actionSignature: string) => (
    operationToken.current === token
    && signatureRef.current === actionSignature
    && confirmedSignatureRef.current === actionSignature
    && artifactInputRef.current === presentationSignature
    && routeFreshnessToken === getOfficialRouteFreshnessToken('national-record-lookup', new Date().toISOString())
  );

  const completeArtifactOperation = (
    token: number,
    actionSignature: string,
    actionPresentationSignature: string,
    message: string,
  ) => {
    if (!operationIsCurrent(token, actionSignature)) return;
    setArtifactSignature(actionPresentationSignature);
    setArtifactStatus({ signature: actionPresentationSignature, message });
  };

  const copySummary = async () => {
    if (device !== 'private' || !factsConfirmed || (role === 'helper' && !helperConfirmed)) return;
    const operation = beginArtifactOperation();
    if (!operation) return;
    try {
      await navigator.clipboard.writeText(summaryFor(true));
      completeArtifactOperation(
        operation.token,
        operation.actionSignature,
        operation.actionPresentationSignature,
        t(
        language,
        'Summary copied locally.',
        'सारांश स्थानीय रूप से कॉपी हुआ।',
        ),
      );
    } catch {
      if (operationIsCurrent(operation.token, operation.actionSignature)) {
        setArtifactStatus({
          signature: operation.actionPresentationSignature,
          message: t(
            language,
            'Copy was blocked; no summary action was recorded.',
            'कॉपी रोकी गई; कोई सारांश कार्रवाई दर्ज नहीं हुई।',
          ),
        });
      }
    }
  };

  const saveSummary = () => {
    if (device !== 'private' || !factsConfirmed || (role === 'helper' && !helperConfirmed)) return;
    const operation = beginArtifactOperation();
    if (!operation) return;
    downloadSummary(summaryFor(true));
    completeArtifactOperation(
      operation.token,
      operation.actionSignature,
      operation.actionPresentationSignature,
      t(language, 'Summary downloaded locally.', 'सारांश स्थानीय रूप से डाउनलोड हुआ।'),
    );
  };

  const printSummary = () => {
    if (device !== 'private' || !factsConfirmed || (role === 'helper' && !helperConfirmed)) return;
    const operation = beginArtifactOperation();
    if (!operation) return;
    window.print();
    completeArtifactOperation(
      operation.token,
      operation.actionSignature,
      operation.actionPresentationSignature,
      t(language, 'The browser print dialog opened.', 'ब्राउज़र प्रिंट संवाद खुला।'),
    );
  };

  const changeHandoffPackPermission = (
    key: Parameters<typeof changeCitizenReviewPackPermission>[1],
    checked: boolean,
  ) => setHandoffState((current) => changeCitizenReviewPackPermission(current, key, checked, {
    resultRevisionId: freshOpaqueRevisionId(),
    packRevisionId: freshOpaqueRevisionId(),
  }));

  const changeExtensionConsent = (
    key: Parameters<typeof changeCitizenExtensionConsent>[1],
    checked: boolean,
  ) => setHandoffState((current) => changeCitizenExtensionConsent(current, key, checked, {
    resultRevisionId: freshOpaqueRevisionId(),
    packRevisionId: freshOpaqueRevisionId(),
    nowMs: Date.now(),
  }));

  const currentHandoffForAction = (
    current: CitizenReviewHandoffControllerState,
    nowIso: string,
  ) => {
    const view = buildCitizenReviewHandoffView(current, { ...handoffViewInput, nowIso });
    const reconciled = reconcileCitizenReviewCurrentPack(current, view, {
      resultRevisionId: freshOpaqueRevisionId(),
      packRevisionId: freshOpaqueRevisionId(),
    });
    return reconciled === current
      ? { status: 'current' as const, state: current, view }
      : { status: 'invalidated' as const, state: reconciled };
  };

  const confirmHandoffPack = (checked: boolean) => {
    if (!checked) {
      setHandoffState((current) => invalidateCitizenReviewHandoff(current, {
        resultRevisionId: freshOpaqueRevisionId(),
        packRevisionId: freshOpaqueRevisionId(),
      }));
      return;
    }
    const nowIso = new Date().toISOString();
    setRouteNowIso(nowIso);
    setHandoffState((current) => {
      const currentView = buildCitizenReviewHandoffView(current, { ...handoffViewInput, nowIso });
      return confirmCitizenReviewHandoffPack(current, {
        view: currentView,
        sourceKind: answers.sourceStatus === 'downloaded-official-record'
          ? 'official-download'
          : 'official-service',
        nowIso,
      });
    });
  };

  const copyHandoffField = async (field: Parameters<typeof requestCitizenReviewCopy>[1]) => {
    if (device !== 'private') return;
    const nowIso = new Date().toISOString();
    const current = handoffStateRef.current;
    const action = currentHandoffForAction(current, nowIso);
    if (action.status === 'invalidated') {
      handoffStateRef.current = action.state;
      setHandoffState(action.state);
      return;
    }
    const requested = requestCitizenReviewCopy(action.state, field, action.view);
    if (!requested.effect || requested.effect.type !== 'clipboard-write') return;
    const effect = requested.effect;
    handoffStateRef.current = requested.state;
    setHandoffState(requested.state);
    if (
      handoffStateRef.current.pendingCopy?.token !== effect.token
      || getCitizenReviewEffectGuardSignature(handoffStateRef.current) !== effect.guardSignature
    ) return;
    try {
      await navigator.clipboard.writeText(effect.value);
      setHandoffState((current) => completeCitizenReviewCopy(current, effect.token, true));
    } catch {
      setHandoffState((current) => completeCitizenReviewCopy(current, effect.token, false));
    }
  };

  const downloadHandoffEffect = (effect: Extract<CitizenReviewBrowserEffect, { type: 'download-text' }>) => {
    if (
      effect.token !== `receipt-${handoffStateRef.current.effectCounter}`
      || getCitizenReviewEffectGuardSignature(handoffStateRef.current) !== effect.guardSignature
    ) return;
    const blob = new Blob([effect.content], { type: effect.mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = effect.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadHandoffReceipt = () => {
    if (device !== 'private') return;
    const nowIso = new Date().toISOString();
    const current = handoffStateRef.current;
    const action = currentHandoffForAction(current, nowIso);
    if (action.status === 'invalidated') {
      handoffStateRef.current = action.state;
      setHandoffState(action.state);
      return;
    }
    const requested = requestCitizenReceiptDownload(action.state, action.view);
    if (!requested.effect || requested.effect.type !== 'download-text') return;
    handoffStateRef.current = requested.state;
    setHandoffState(requested.state);
    downloadHandoffEffect(requested.effect);
  };

  const extensionPresentation = {
    release: extensionRelease,
    preparationAllowedByController: extensionReadiness.status === 'ready',
    supportedDesktopConfirmed: handoffState.extensionConsent.supportedDesktopConfirmed,
    boundedSafetyReviewConfirmed: handoffState.extensionConsent.boundedSafetyReviewConfirmed,
    helperConfirmation: {
      affectedPersonPresent: handoffState.extensionConsent.affectedPersonPresent,
      affectedPersonReviewedFields: handoffState.extensionConsent.affectedPersonReviewedFields,
      affectedPersonRequestedPreparation: handoffState.extensionConsent.affectedPersonRequestedPreparation,
    },
    preparation: currentExtensionPreparation.status === 'prepared'
      ? { status: 'prepared' as const, canonicalEnvelopeJson: currentExtensionPreparation.canonicalEnvelopeJson }
      : currentExtensionPreparation,
  };


  const recordOptions: Array<[RecordAvailability, string]> = [
    ['present', t(language, 'Available and readable', 'उपलब्ध और पढ़ने योग्य')],
    ['unclear', t(language, 'Unclear', 'अस्पष्ट')],
    ['missing', t(language, 'Not available', 'उपलब्ध नहीं')],
    ['not-applicable', t(language, 'Not applicable', 'लागू नहीं')],
  ];
  const deviceQuestion = (
    <fieldset className={adaptive.device}>
      <legend>{t(language, 'Is this your own/private device or a shared device?', 'यह आपका निजी डिवाइस है या साझा डिवाइस?')}</legend>
      <div className={adaptive.options}>
        {(['private', 'shared'] as const).map(value => <label data-required-action className={adaptive.option} key={value}>
          <input type="radio" name="review-device" value={value} checked={device === value} onChange={() => chooseDevice(value)} />
          {value === 'private' ? t(language, 'My private device', 'मेरा निजी डिवाइस') : t(language, 'A shared device', 'साझा डिवाइस')}
        </label>)}
      </div>
      {device === 'shared' && <p className={adaptive.subtle}>{presentation.sharedInactivityNotice}</p>}
    </fieldset>
  );
  const lookupResolution = resolveCurrentOfficialAuxiliaryRoute('national-record-lookup', routeNowIso);
  const lookup = lookupResolution.status === 'current' ? lookupResolution.route : null;
  const safeLookup = lookup ? <div className={adaptive.officialLookup}>
    <a data-required-action className={adaptive.secondary} data-official-lookup href={lookup.canonicalUrl} target="_blank" rel="noopener noreferrer"
      onClick={event => {
        const nowIso = new Date().toISOString();
        const current = resolveCurrentOfficialAuxiliaryRoute('national-record-lookup', nowIso);
        setRouteNowIso(nowIso);
        if (current.status !== 'current' || current.route.canonicalUrl !== lookup.canonicalUrl) event.preventDefault();
      }}>
      {lookupResolution.status === 'current' && lookupResolution.usedFallback
        ? t(language, 'Open the official services directory', 'आधिकारिक सेवा निर्देशिका खोलें')
        : t(language, 'Open official e-Challan service', 'आधिकारिक ई-चालान सेवा खोलें')} ↗
    </a>
    <p className={adaptive.subtle}>{t(language, 'Route checked', 'रास्ता जाँचा गया')}: {lookup.lastVerifiedAt}</p>
  </div> : <p role="status">{t(language, 'The official link needs a fresh check. Find the service independently; no case details have been sent.', 'आधिकारिक लिंक की दोबारा जाँच चाहिए। सेवा स्वतंत्र रूप से खोजें; केस का कोई विवरण नहीं भेजा गया।')}</p>;

  const optionalDetails = <details className={adaptive.details}>
    <summary>{t(language, 'Add a copy, state, or more details', 'कॉपी, राज्य या अन्य विवरण जोड़ें')}</summary>
    <div className={adaptive.fieldGrid}>
      <SelectField id="review-jurisdiction" label={t(language, 'Issuing state or union territory', 'चालान जारी करने वाला राज्य या केंद्र शासित प्रदेश')}
        value={jurisdiction.status === 'confirmed' ? jurisdiction.code : ''}
        onChange={value => changeJurisdiction(value ? { status: 'confirmed', code: value as IssuingJurisdictionCode } : { status: 'unconfirmed' })}
        options={[[ '', t(language, 'Not sure yet', 'अभी पता नहीं')], ...ALL_ISSUING_JURISDICTION_CODES.map(code => [code, code] as [string, string])]} />
      <div className={styles.field}><label htmlFor="review-suffix">{t(language, 'Registration: last four characters (optional)', 'वाहन नंबर: आखिरी चार अक्षर/अंक (वैकल्पिक)')}</label>
        <input id="review-suffix" maxLength={4} value={vehicleSuffix} onChange={event => changeVehicleSuffix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /></div>
      <div className={styles.field}><label htmlFor="review-offence">{t(language, 'Offence on the notice (optional)', 'नोटिस पर उल्लंघन (वैकल्पिक)')}</label>
        <input id="review-offence" maxLength={120} value={offence} onChange={event => changeOffence(event.target.value)} /></div>
      <div className={styles.field}><label htmlFor="review-event-date">{t(language, 'Event date (optional)', 'घटना की तारीख (वैकल्पिक)')}</label>
        <input id="review-event-date" type="date" value={eventDate} onChange={event => changeEventDate(event.target.value)} /></div>
      <div className={styles.field}><label htmlFor="review-deadline">{t(language, 'Deadline shown on the notice (optional)', 'नोटिस पर अंतिम तारीख (वैकल्पिक)')}</label>
        <input id="review-deadline" type="date" value={officialDeadline} onChange={event => changeOfficialDeadline(event.target.value)} /></div>
      {reviewState.answeredQuestionIds.source && answers.sourceStatus !== 'message-only' && <SelectField id="review-notice-copy" label={t(language, 'Notice copy (optional)', 'नोटिस की कॉपी (वैकल्पिक)')}
        value={reviewState.answeredQuestionIds['notice-copy'] ? answers.noticeCopyAvailable : ''}
        onChange={value => changeAnswer('notice-copy', value)} options={[[ '', t(language, 'Not answered', 'उत्तर नहीं दिया')], ...recordOptions]} />}
    </div>
    <button data-required-action className={adaptive.secondary} type="button" onClick={() => setFileIntakeRequested(true)}>{t(language, 'Preview a copy on this device', 'इस डिवाइस पर कॉपी देखें')}</button>
    {fileIntakeRequested && step === 'check' && deviceQuestion}
    {fileIntakeRequested && device !== 'unknown' && <>
      {device === 'shared' && <p>{t(language, 'Exit clears this review but cannot close a PDF or image preview opened in another tab; close that tab yourself.', 'बाहर निकलने पर यह समीक्षा साफ़ होगी, लेकिन दूसरे टैब में खुला PDF या चित्र बंद नहीं होगा; वह टैब स्वयं बंद करें।')}</p>}
      <LocalRecordIntake record={recordSelection} photograph={photographSelection} onRecordChange={recordChanged} onPhotographChange={photographChanged} language={language} />
      {recordSelection && <button data-required-action className={adaptive.secondary} type="button" onClick={chooseManualEntry}>{t(language, 'Remove copy and use my answers', 'कॉपी हटाएँ और मेरे उत्तर उपयोग करें')}</button>}
      {recordSelection && <Preview selection={recordSelection} title={t(language, 'Your notice', 'आपका नोटिस')} language={language} />}
      {photographSelection && <Preview selection={photographSelection} title={t(language, 'Your photo', 'आपकी तस्वीर')} language={language} />}
    </>}
  </details>;

  const firstAction = questionPlan.missing.length > 0
    ? <button data-required-action className={adaptive.primary} type="button" onClick={() => confirmAnswers('self')}>{t(language, 'Continue', 'आगे बढ़ें')}</button>
    : answers.sourceStatus === 'message-only'
      ? <button data-required-action className={adaptive.primary} type="button" onClick={() => confirmAnswers('self')}>{t(language, 'Show me the safe next step', 'सुरक्षित अगला कदम दिखाएँ')}</button>
      : <div className={adaptive.actions}>
        <p className={adaptive.subtle}>{answers.ownRecordAvailable !== 'present' || !answers.imageInspected
          ? t(language, 'I confirm which record or service/record photo I could not inspect; ChallanSakshi will not compare what is missing.', 'मैं पुष्टि करता/करती हूँ कि कौन सा रिकॉर्ड या सेवा/रिकॉर्ड की तस्वीर नहीं देख सका/सकी; जो उपलब्ध नहीं है, ChallanSakshi उसकी तुलना नहीं करेगा।')
          : t(language, 'I checked every answer above against the readable vehicle record and the photo shown in the service or record I opened. Anything I could not see is marked unclear.', 'मैंने ऊपर के हर उत्तर को पढ़ने योग्य वाहन रिकॉर्ड और खोली गई सेवा या रिकॉर्ड की तस्वीर से जाँचा है। जो दिखाई नहीं दिया, उसे अस्पष्ट चिह्नित किया है।')}</p>
        {role !== 'helper' ? <>
          <span>{t(language, 'For my own challan', 'अपने चालान के लिए')}</span>
          <button data-required-action className={adaptive.primary} type="button" onClick={() => confirmAnswers('self')}>{t(language, 'I checked these answers — see my next step', 'मैंने उत्तर जाँचे — अगला कदम दिखाएँ')}</button>
          <button data-required-action className={adaptive.secondary} type="button" onClick={selectHelper}>{t(language, 'I am helping someone who is here', 'मैं यहाँ मौजूद व्यक्ति की मदद कर रहा/रही हूँ')}</button>
        </> : <>
          {!factsConfirmed
            ? <button data-required-action className={adaptive.primary} type="button" onClick={() => confirmAnswers('helper')}>{t(language, 'I checked these entries as the helper', 'सहायक के रूप में मैंने प्रविष्टियाँ जाँची हैं')}</button>
            : <button data-required-action className={adaptive.primary} type="button" onClick={confirmAffectedPerson}>{t(language, 'I am here and confirm these final answers', 'मैं यहाँ हूँ और इन अंतिम उत्तरों की पुष्टि करता/करती हूँ')}</button>}
        </>}
      </div>;

  return (
    <PublicBetaShell language={language} setLanguage={changeLanguage} service="ChallanSakshi" serviceHindi="चालान साक्षी" onQuickExit={quickExit} simpleMode={simpleMode} preserveScroll>
      <main ref={mainRef} className={adaptive.main} style={{ minHeight: minimumContentHeight }} data-device-context={device} data-review-phase={step} inert={!clientReady}>
        {device !== 'private' && <aside className={styles.sharedPrintWarning} data-shared-print-warning><h1>{t(language, 'Private-device choice required to print', 'प्रिंट करने के लिए निजी डिवाइस चुनना ज़रूरी है')}</h1></aside>}
        <header className={adaptive.heading}>
          <p className={adaptive.progress}>{step === 'check' ? t(language, '1 of 2 · Check', '1 / 2 · जाँच') : t(language, '2 of 2 · Resolve', '2 / 2 · अगला कदम')}</p>
          <h1 ref={headingRef} tabIndex={-1} id="review-heading">{step === 'check' ? t(language, 'Check your challan', 'अपना चालान जाँचें') : t(language, 'Your next step', 'आपका अगला कदम')}</h1>
          <p className={adaptive.intro}>{step === 'check'
            ? t(language, 'Keep the notice and your vehicle record open. Review what you can see, then get a next step based on your answers.', 'नोटिस और अपने वाहन का रिकॉर्ड खुला रखें। जो दिख रहा है उसे जाँचें, फिर अपने उत्तरों के अनुसार अगला कदम देखें।')
            : t(language, 'Review the finding and prepare your next official step.', 'नतीजा देखकर अगले आधिकारिक कदम की तैयारी करें।')}</p>
        </header>
        {step === 'check' ? <section className={adaptive.panel} aria-labelledby="review-heading">
          {!reviewState.answeredQuestionIds.source && safeLookup}
          <CitizenReviewCheck language={language} state={reviewState} plan={questionPlan} onAnswer={changeAnswer}
            expandedQuestion={expandedQuestion} onExpand={expandQuestion} errorQuestion={error ? questionPlan.missing[0] : undefined}>
            {error?.step === step && <p role="alert">{error.message}</p>}
            {firstAction}
            {optionalDetails}
          </CitizenReviewCheck>
        </section> : <section className={adaptive.panel} aria-labelledby="review-heading" data-print-result>
          <div data-result-finding className={adaptive.result} data-tone={copy.tone}>
            <div className={adaptive.resultTopline}>
              <p className={adaptive.resultLabel}>{t(language, 'What we found', 'क्या पता चला')}</p>
              <button data-required-action className={adaptive.change} type="button" onClick={editAnswers}>{t(language, 'Edit my answers', 'मेरे उत्तर बदलें')}</button>
            </div>
            <h2>{resultTitle}</h2>
            <p className={adaptive.resultLabel}>{t(language, 'What it means', 'इसका मतलब')}</p>
            <p>{resultBody}</p>
            <p className={adaptive.resultLabel}>{t(language, 'What to do now', 'अब क्या करें')}</p>
            <p>{answers.sourceStatus === 'message-only'
              ? t(language, 'Do not use the message link. Find your notice on the official service first.', 'संदेश का लिंक उपयोग न करें। पहले आधिकारिक सेवा पर अपना नोटिस खोजें।')
              : t(language, 'Continue on the official e-Challan service with the record you checked.', 'जाँचे गए रिकॉर्ड के साथ आधिकारिक ई-चालान सेवा पर आगे बढ़ें।')}</p>
            {factsConfirmed && <p className={adaptive.subtle}>{t(language, 'Based on the answers you confirmed; the authority makes the decision.', 'आपके पुष्ट उत्तरों पर आधारित; निर्णय प्राधिकरण करता है।')}</p>}
          </div>
          {safeLookup}
          {factsConfirmed && <>
            <button data-required-action className={adaptive.primary} type="button" aria-expanded={preparationOpen} data-grievance-affordance aria-controls="review-preparation" onClick={() => setPreparationOpen(!preparationOpen)}>{t(language, 'Prepare my checklist', 'मेरी चेकलिस्ट तैयार करें')}</button>
            {preparationOpen && <div id="review-preparation" className={adaptive.preparation} data-print-preparation>
              <h2>{t(language, 'Your checklist', 'आपकी चेकलिस्ट')}</h2>
              <p className={adaptive.subtle}>{t(language, 'Use this to organise the records and details for your next official step. You can add only the details you have.', 'अगले आधिकारिक कदम के लिए रिकॉर्ड और विवरण व्यवस्थित करें। आपके पास जो विवरण हैं, केवल वे जोड़ सकते हैं।')}</p>
              {localizedAssessment.missingEvidence.length > 0 && <ul>{localizedAssessment.missingEvidence.map(item => <li key={item}>{item}</li>)}</ul>}
              {optionalDetails}
              {deviceQuestion}
              {device !== 'unknown' && <>
            <OfficialHandoffPanel
              language={language}
              simpleMode={simpleMode}
              reviewContext={{
                role: reviewRole,
                deviceMode: reviewDevice,
              }}
              draft={handoffView.draft}
              confirmedPack={currentHandoffPack}
              packConfirmation={handoffState.packConfirmation}
              copyStatus={handoffState.copyStatus}
              lookupValue={handoffState.lookupValue}
              officialLinkStatus={handoffState.linkActivation ? 'activated' : 'not-activated'}
              receiptState={getCitizenReviewReceiptState(handoffState)}
              returnDraft={handoffState.returnDraft}
              returnAuthorization={handoffState.returnAuthorization}
              returnReadiness={returnReadiness}
              extension={extensionPresentation}
              callbacks={{
                onDescriptionChange: (value) => setHandoffState((current) => (
                  changeCitizenReviewHandoffDescription(current, value, {
                    packRevisionId: freshOpaqueRevisionId(),
                  })
                )),
                onLookupValueChange: (value) => setHandoffState((current) => (
                  changeCitizenReviewLookupValue(current, value)
                )),
                onAffectedPersonPresentChange: (checked) => changeHandoffPackPermission('affectedPersonPresent', checked),
                onAffectedPersonInspectedEvidenceChange: (checked) => changeHandoffPackPermission('affectedPersonInspectedEvidence', checked),
                onAffectedPersonInspectedReadableRecordChange: (checked) => changeHandoffPackPermission('affectedPersonInspectedReadableRecord', checked),
                onAffectedPersonConfirmedEntitlementChange: (checked) => changeHandoffPackPermission('affectedPersonConfirmedEntitlement', checked),
                onAffectedPersonRequestedPreparationChange: (checked) => changeHandoffPackPermission('affectedPersonRequestedPreparation', checked),
                onAffectedPersonConfirmedPackChange: confirmHandoffPack,
                onOfficialLinkActivate: () => {
                  const nowIso = new Date().toISOString();
                  setRouteNowIso(nowIso);
                  const action = currentHandoffForAction(handoffState, nowIso);
                  if (action.status === 'invalidated') {
                    handoffStateRef.current = action.state;
                    setHandoffState(action.state);
                    return false;
                  }
                  const activated = activateCitizenReviewOfficialLink(action.state, action.view, nowIso);
                  if (activated === action.state) return false;
                  handoffStateRef.current = activated;
                  setHandoffState(activated);
                  return true;
                },
                onCopyField: copyHandoffField,
                onReturnStateChange: (value) => setHandoffState((current) => changeCitizenReturnState(current, value)),
                onReferenceLastFourChange: (value) => setHandoffState((current) => changeCitizenReferenceLastFour(current, value)),
                onReturnAffectedPersonPresentChange: (checked) => setHandoffState((current) => changeCitizenReturnAuthorization(current, 'affectedPersonPresent', checked, {
                  resultRevisionId: freshOpaqueRevisionId(),
                  packRevisionId: freshOpaqueRevisionId(),
                })),
                onReturnRecordingRequestedChange: (checked) => setHandoffState((current) => changeCitizenReturnAuthorization(current, 'affectedPersonRequestedReturnRecording', checked, {
                  resultRevisionId: freshOpaqueRevisionId(),
                  packRevisionId: freshOpaqueRevisionId(),
                })),
                onReturnStateConfirmedChange: (checked) => setHandoffState((current) => changeCitizenReturnAuthorization(current, 'affectedPersonConfirmedReturnState', checked, {
                  resultRevisionId: freshOpaqueRevisionId(),
                  packRevisionId: freshOpaqueRevisionId(),
                })),
                onReturnReferenceConfirmedChange: (checked) => setHandoffState((current) => changeCitizenReturnAuthorization(current, 'affectedPersonConfirmedReferenceFragment', checked, {
                  resultRevisionId: freshOpaqueRevisionId(),
                  packRevisionId: freshOpaqueRevisionId(),
                })),
                onRecordReturn: () => {
                  const nowIso = new Date().toISOString();
                  setRouteNowIso(nowIso);
                  setHandoffState((current) => {
                    const action = currentHandoffForAction(current, nowIso);
                    return action.status === 'current'
                      ? recordCitizenReviewReturn(action.state, action.view, nowIso)
                      : action.state;
                  });
                },
                onDownloadReceipt: downloadHandoffReceipt,
              }}
              extensionCallbacks={{
                onSupportedDesktopChange: (checked) => changeExtensionConsent('supportedDesktopConfirmed', checked),
                onBoundedSafetyReviewChange: (checked) => changeExtensionConsent('boundedSafetyReviewConfirmed', checked),
                onAffectedPersonPresentChange: (checked) => changeExtensionConsent('affectedPersonPresent', checked),
                onAffectedPersonReviewedFieldsChange: (checked) => changeExtensionConsent('affectedPersonReviewedFields', checked),
                onAffectedPersonRequestedPreparationChange: (checked) => changeExtensionConsent('affectedPersonRequestedPreparation', checked),
                onPrepare: () => {
                  const nowMs = Date.now();
                  const nowIso = new Date(nowMs).toISOString();
                  setRouteNowIso(nowIso);
                  setHandoffState((current) => {
                    const action = currentHandoffForAction(current, nowIso);
                    return action.status === 'current'
                      ? prepareCitizenReviewExtension(action.state, {
                        view: action.view,
                        release: extensionRelease,
                        language,
                        simpleMode,
                        nowMs,
                      })
                      : action.state;
                  });
                },
                onClearPrepared: () => setHandoffState((current) => clearCitizenReviewExtensionPreparation(current)),
              }}
            />

              </>}
              {view && <details className={adaptive.details} data-print-evidence>
                <summary>{t(language, 'Evidence and history', 'सबूत और इतिहास')}</summary>
                <EvidenceRows evidence={view} language={language} simpleMode={simpleMode} />
                <h3>{presentation.timelineHeading}</h3>
                <ol>{timelineFor(summaryGenerated).map(item => <li key={item.id}>{item.label}</li>)}</ol>
              </details>}
              {device !== 'unknown' && <section className={styles.artifact} data-print-artifact>
                <h3>{presentation.summaryHeading}</h3>
                {device === 'shared' ? <p>{t(language, 'Copy, download and formatted print are off on shared devices.', 'साझा डिवाइस पर कॉपी, डाउनलोड और तैयार प्रिंट बंद हैं।')}</p> : <p>{t(language, 'Saving or copying leaves a copy on this device.', 'सहेजने या कॉपी करने से इस डिवाइस पर कॉपी रहेगी।')}</p>}
                <details className={adaptive.details}><summary>{t(language, 'Preview my summary', 'मेरा सारांश देखें')}</summary><pre>{summaryFor(summaryGenerated)}</pre></details>
                <div className={adaptive.actions}>
                  <button data-required-action type="button" className={adaptive.secondary} disabled={device !== 'private'} onClick={copySummary}>{presentation.actions.copy}</button>
                  <button data-required-action type="button" className={adaptive.secondary} disabled={device !== 'private'} onClick={printSummary}>{presentation.actions.print}</button>
                  <button data-required-action type="button" className={adaptive.primary} disabled={device !== 'private'} onClick={saveSummary}>{presentation.actions.download}</button>
                </div>
              </section>}
              {artifactStatus?.signature === presentationSignature && <p role="status">{artifactStatus.message}</p>}
            </div>}
          </>}
        </section>}
      </main>
    </PublicBetaShell>
  );
}
