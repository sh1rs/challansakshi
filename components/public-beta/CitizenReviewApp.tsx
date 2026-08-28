'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { GuidedStepHeader } from '../guided/GuidedStepHeader';
import { parseCitizenGoal, type CitizenGoal } from '../../lib/citizen-home';
import {
  CITIZEN_DISCLAIMER_EN,
  CITIZEN_DISCLAIMER_HI,
  getCitizenReviewPresentation,
  localizeAssessment,
  localizeDeadline,
} from '../../lib/citizen-review-presentation';
import type { Language } from '../../lib/domain';
import {
  buildCitizenEvidencePresentationView,
  buildCitizenEvidenceSummary,
  buildCitizenEvidenceView,
  buildCitizenTimeline,
  type CitizenEvidencePresentationView,
} from '../../lib/evidence-intelligence';
import { buildChallanGuidedProgress, getChallanGuideContent } from '../../lib/guided-journey';
import {
  assessCitizenChallanReview,
  calculateEnteredOfficialDeadline,
  citizenSituationForFinding,
  type CitizenChallanAnswers,
  type CitizenSituation,
  type Observation,
  type OffenceObservation,
  type RecordAvailability,
} from '../../lib/public-challan';
import { startSharedDeviceInactivityGuard } from '../../lib/shared-device-inactivity';
import { LocalRecordIntake, type LocalRecordSelection } from './LocalRecordIntake';
import { PublicBetaShell, SafetyBoundary, publicBetaStyles as styles } from './PublicBetaShell';

type Step = 'safety' | 'source' | 'observations' | 'result';
type Role = 'self' | 'helper';
type Device = 'private' | 'shared';
type ReviewError = { step: Step; message: string };

const NATIONAL_URL = 'https://echallan.parivahan.gov.in/';
const COURT_URL = 'https://vcourts.gov.in/virtualcourt/index.php';
const DISCLAIMER = CITIZEN_DISCLAIMER_EN;

const defaults: CitizenChallanAnswers = {
  sourceStatus: 'not-selected',
  imageInspected: false,
  plateObservation: 'unclear',
  categoryObservation: 'unclear',
  colourObservation: 'unclear',
  offenceObservation: 'unclear',
  timestampStatus: 'unclear',
  locationStatus: 'unclear',
  ownRecordAvailable: 'unclear',
  noticeCopyAvailable: 'unclear',
  custodyRecordAvailable: 'not-applicable',
};

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
          {selection.meta.name} · {t(language, 'memory only', 'केवल मेमोरी में')}
        </small>
      </header>
      {selection.meta.previewKind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element -- Deliberate local object URL; never routed through a service.
        <img
          src={selection.previewUrl}
          alt={t(language, `${title} preview`, `${title} प्रीव्यू`)}
        />
      ) : (
        <object
          data={selection.previewUrl}
          type="application/pdf"
          aria-label={t(language, `${title} PDF preview`, `${title} PDF प्रीव्यू`)}
        >
          <p>
            {t(
              language,
              'PDF preview unavailable; the file remains in this tab memory.',
              'PDF प्रीव्यू उपलब्ध नहीं; फ़ाइल इस टैब की मेमोरी में रहती है।',
            )}
          </p>
        </object>
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
      'The photo and vehicle record look different',
      'तस्वीर और वाहन रिकॉर्ड अलग दिखते हैं',
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

export default function CitizenReviewApp() {
  const [language, setLanguage] = useState<Language>('en');
  const [step, setStep] = useState<Step>('safety');
  const [goal, setGoal] = useState<CitizenGoal | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [consent, setConsent] = useState({
    manual: false,
    minimum: false,
    citizenConfirmed: false,
  });
  const [recordSelection, setRecordSelection] = useState<LocalRecordSelection | null>(null);
  const [photographSelection, setPhotographSelection] = useState<LocalRecordSelection | null>(null);
  const [confirmedSignature, setConfirmedSignature] = useState('');
  const [artifactSignature, setArtifactSignature] = useState('');
  const [simpleMode, setSimpleMode] = useState(false);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [helperSignature, setHelperSignature] = useState('');
  const [answers, setAnswers] = useState<CitizenChallanAnswers>(defaults);
  const [jurisdiction, setJurisdiction] = useState('');
  const [vehicleSuffix, setVehicleSuffix] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [officialDeadline, setOfficialDeadline] = useState('');
  const [offence, setOffence] = useState('');
  const [referenceDate, setReferenceDate] = useState(indiaDateNow);
  const [error, setError] = useState<ReviewError | null>(null);
  const [artifactStatus, setArtifactStatus] = useState<{ signature: string; message: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const signatureRef = useRef('');
  const confirmedSignatureRef = useRef('');
  const operationToken = useRef(0);
  const recordSelectionRef = useRef<LocalRecordSelection | null>(null);
  const photographSelectionRef = useRef<LocalRecordSelection | null>(null);
  const clearAndExitRef = useRef<() => void>(() => undefined);

  const signature = useMemo(
    () => JSON.stringify({
      answers,
      jurisdiction,
      vehicleSuffix,
      eventDate,
      officialDeadline,
      offence,
      manualEntryMode,
      recordName: recordSelection?.meta.name ?? '',
      photographName: photographSelection?.meta.name ?? '',
    }),
    [
      answers,
      jurisdiction,
      vehicleSuffix,
      eventDate,
      officialDeadline,
      offence,
      manualEntryMode,
      recordSelection?.meta.name,
      photographSelection?.meta.name,
    ],
  );
  const factsConfirmed = confirmedSignature === signature && confirmedSignature !== '';
  const helperConfirmed = factsConfirmed && helperSignature === signature && helperSignature !== '';
  const presentationSignature = `${signature}|${language}|${simpleMode ? 'simple' : 'standard'}`;
  const summaryGenerated = artifactSignature === presentationSignature && artifactSignature !== '';
  const presentation = getCitizenReviewPresentation(language, simpleMode);
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

  const safetyReady = Boolean(
    role
      && device
      && consent.manual
      && consent.minimum
      && (role !== 'helper' || consent.citizenConfirmed),
  );
  const observationsReady = factsConfirmed
    && (role !== 'helper' || helperConfirmed)
    && (vehicleSuffix.length === 0 || vehicleSuffix.length === 4)
    && (!officialDeadline || Boolean(deadline));

  const guide = getChallanGuideContent({
    step,
    safetyReady,
    sourceStatus: answers.sourceStatus,
    jurisdictionSelected: Boolean(jurisdiction && (recordSelection || manualEntryMode)),
    observationsReady,
    worksheetAvailable: factsConfirmed && assessment.canPrepareWorksheet,
    resultAvailable: step === 'result' && (factsConfirmed || answers.sourceStatus === 'message-only'),
    exportAllowed: device !== 'shared',
    language,
    simpleMode,
  });
  const canonicalView = factsConfirmed
    ? buildCitizenEvidenceView({
      answers,
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
  const summaryFor = (generated: boolean) => (factsConfirmed
    ? buildCitizenEvidenceSummary({
      answers,
      assessment,
      confirmation: 'confirmed',
      jurisdiction,
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
  const resultBody = simpleMode
    ? copy.simple[language === 'hi' ? 1 : 0]
    : copy.body[language === 'hi' ? 1 : 0];

  useEffect(() => {
    let active = true;
    const parsedGoal = parseCitizenGoal(window.location.search);
    queueMicrotask(() => {
      if (active) setGoal(parsedGoal);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    signatureRef.current = signature;
  }, [signature]);

  useEffect(() => () => {
    if (recordSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(recordSelectionRef.current.previewUrl);
    }
    if (photographSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(photographSelectionRef.current.previewUrl);
    }
  }, []);

  useEffect(() => {
    const refresh = () => setReferenceDate(indiaDateNow());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      headingRef.current?.focus();
    }
  }, [step]);

  const invalidateArtifact = () => {
    operationToken.current += 1;
    setArtifactSignature('');
    setArtifactStatus(null);
  };

  const invalidate = () => {
    confirmedSignatureRef.current = '';
    setConfirmedSignature('');
    setHelperSignature('');
    setError(null);
    invalidateArtifact();
  };

  const reset = () => {
    setStep('safety');
    setRole(null);
    setDevice(null);
    setConsent({ manual: false, minimum: false, citizenConfirmed: false });
    setRecordSelection(null);
    setPhotographSelection(null);
    recordSelectionRef.current = null;
    photographSelectionRef.current = null;
    invalidate();
    setManualEntryMode(false);
    setAnswers(defaults);
    setJurisdiction('');
    setVehicleSuffix('');
    setEventDate('');
    setOfficialDeadline('');
    setOffence('');
    setError(null);
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

  const goToStep = (nextStep: Step) => {
    setError(null);
    setStep(nextStep);
  };

  const showError = (message: string) => setError({ step, message });

  const chooseDevice = (nextDevice: Device) => {
    invalidate();
    setDevice(nextDevice);
  };

  const chooseRole = (nextRole: Role) => {
    invalidate();
    setRole(nextRole);
  };

  const changeConsent = (nextConsent: typeof consent) => {
    invalidate();
    setConsent(nextConsent);
  };

  const changeAnswers = (nextAnswers: CitizenChallanAnswers) => {
    invalidate();
    setAnswers(nextAnswers);
  };

  const changeJurisdiction = (nextJurisdiction: string) => {
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

  const changeHelperConfirmation = (nextSignature: string) => {
    invalidateArtifact();
    setHelperSignature(nextSignature);
  };

  const changeLanguage = (nextLanguage: Language) => {
    invalidateArtifact();
    setLanguage(nextLanguage);
  };

  const changeSimpleMode = (nextSimpleMode: boolean) => {
    invalidateArtifact();
    setSimpleMode(nextSimpleMode);
  };

  const quickExit = clearAndExit;

  const continueSafety = () => {
    if (!safetyReady) {
      showError(t(
        language,
        'Choose the reviewer and device, then confirm every safety statement.',
        'समीक्षक और डिवाइस चुनें, फिर हर सुरक्षा कथन की पुष्टि करें।',
      ));
      return;
    }
    goToStep('source');
  };

  const continueSource = () => {
    if (answers.sourceStatus === 'not-selected') {
      showError(t(
        language,
        'Choose how you independently obtained the record.',
        'चुनें कि रिकॉर्ड स्वतंत्र रूप से कैसे मिला।',
      ));
      return;
    }
    if (!jurisdiction) {
      showError(t(
        language,
        'Choose the official service or “I am not sure”.',
        'आधिकारिक सेवा या “मुझे पता नहीं” चुनें।',
      ));
      return;
    }
    if (!recordSelection && !manualEntryMode) {
      showError(t(
        language,
        'Choose an official-record file or deliberately select manual fact entry.',
        'आधिकारिक रिकॉर्ड फ़ाइल या मैन्युअल तथ्य प्रविष्टि चुनें।',
      ));
      return;
    }
    goToStep(answers.sourceStatus === 'message-only' ? 'result' : 'observations');
  };

  const continueObservations = () => {
    if (!factsConfirmed) {
      showError(t(
        language,
        'Confirm every fact or mark it unclear/not supplied.',
        'हर तथ्य पुष्ट करें या अस्पष्ट/नहीं दिया गया चिह्नित करें।',
      ));
      return;
    }
    if (role === 'helper' && !helperConfirmed) {
      showError(t(
        language,
        'The citizen must confirm the final entries after the facts checkbox.',
        'तथ्य चेकबॉक्स के बाद नागरिक अंतिम प्रविष्टियाँ पुष्ट करे।',
      ));
      return;
    }
    if (vehicleSuffix && vehicleSuffix.length !== 4) {
      showError(t(
        language,
        'Enter exactly four registration characters or leave it blank.',
        'ठीक चार वाहन अक्षर/अंक दर्ज करें या खाली छोड़ें।',
      ));
      return;
    }
    if (officialDeadline && !deadline) {
      showError(t(
        language,
        'The copied official date is invalid.',
        'कॉपी की गई आधिकारिक तारीख अमान्य है।',
      ));
      return;
    }
    goToStep('result');
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
    if (selection) setManualEntryMode(false);
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
  };
  const useManual = () => {
    invalidate();
    if (recordSelectionRef.current?.previewUrl) {
      URL.revokeObjectURL(recordSelectionRef.current.previewUrl);
    }
    recordSelectionRef.current = null;
    setRecordSelection(null);
    setManualEntryMode(true);
  };

  const beginArtifactOperation = () => ({
    token: ++operationToken.current,
    actionSignature: signatureRef.current,
    actionPresentationSignature: presentationSignature,
  });

  const operationIsCurrent = (token: number, actionSignature: string) => (
    operationToken.current === token
    && signatureRef.current === actionSignature
    && confirmedSignatureRef.current === actionSignature
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
    if (device === 'shared' || !factsConfirmed) return;
    const operation = beginArtifactOperation();
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
    if (device === 'shared' || !factsConfirmed) return;
    const operation = beginArtifactOperation();
    downloadSummary(summaryFor(true));
    completeArtifactOperation(
      operation.token,
      operation.actionSignature,
      operation.actionPresentationSignature,
      t(language, 'Summary downloaded locally.', 'सारांश स्थानीय रूप से डाउनलोड हुआ।'),
    );
  };

  const printSummary = () => {
    if (device === 'shared' || !factsConfirmed) return;
    const operation = beginArtifactOperation();
    window.print();
    completeArtifactOperation(
      operation.token,
      operation.actionSignature,
      operation.actionPresentationSignature,
      t(language, 'The browser print dialog opened.', 'ब्राउज़र प्रिंट संवाद खुला।'),
    );
  };

  const route = jurisdiction === 'National e-Challan'
    ? {
      href: NATIONAL_URL,
      external: true,
      label: t(language, 'Open National e-Challan', 'राष्ट्रीय ई-चालान खोलें'),
    }
    : jurisdiction === 'Virtual Court'
      ? {
        href: COURT_URL,
        external: true,
        label: t(language, 'Open Virtual Courts', 'वर्चुअल कोर्ट खोलें'),
      }
      : {
        href: '/safety',
        external: false,
        label: t(
          language,
          'Find the responsible official route safely',
          'जिम्मेदार आधिकारिक रास्ता सुरक्षित खोजें',
        ),
      };
  const observationOptions: Array<[Observation, string]> = [
    ['match', t(language, 'Appears to match', 'मेल खाता दिखता है')],
    ['different', t(language, 'Appears materially different', 'महत्वपूर्ण रूप से अलग')],
    ['unclear', t(language, 'Cannot determine', 'तय नहीं')],
    ['not-visible', t(language, 'Not visible', 'दिखाई नहीं देता')],
  ];
  const recordOptions: Array<[RecordAvailability, string]> = [
    ['present', t(language, 'Available and readable', 'उपलब्ध और पढ़ने योग्य')],
    ['unclear', t(language, 'Available but unclear', 'उपलब्ध लेकिन अस्पष्ट')],
    ['missing', t(language, 'Not located', 'नहीं मिला')],
    ['not-applicable', t(language, 'Not applicable', 'लागू नहीं')],
  ];

  return (
    <PublicBetaShell
      language={language}
      setLanguage={changeLanguage}
      service="ChallanSakshi"
      serviceHindi="चालान साक्षी"
      onQuickExit={quickExit}
      simpleMode={simpleMode}
      onSimpleModeChange={changeSimpleMode}
    >
      <main className={styles.main}>
        <GuidedStepHeader
          {...guide}
          steps={buildChallanGuidedProgress(step, answers.sourceStatus, language)}
          progressLabel={presentation.progressLabel}
          headingRef={headingRef}
          headingId="challan-guided-step-title"
          labels={presentation.guideLabels}
        />
        <section className={`${styles.hero} ${styles.heroCompact}`}>
          <div>
            <h1>
              {t(
                language,
                'Inspect the official record. Record only ',
                'आधिकारिक रिकॉर्ड देखें। केवल वही दर्ज करें जो ',
              )}
              <em>{t(language, 'what you can see.', 'आप देख सकते हैं।')}</em>
            </h1>
            <p className={styles.lede}>
              {goal === 'evidence'
                ? t(
                  language,
                  'Bring the record and supplied photograph together, then confirm each observation.',
                  'रिकॉर्ड और तस्वीर साथ लाएँ, फिर हर अवलोकन पुष्ट करें।',
                )
                : t(
                  language,
                  'Open the official service yourself, preview a selected record locally, and confirm structured facts.',
                  'आधिकारिक सेवा स्वयं खोलें, रिकॉर्ड स्थानीय रूप से देखें और संरचित तथ्य पुष्ट करें।',
                )}
            </p>
          </div>
        </section>
        <SafetyBoundary language={language} />

        {step === 'safety' && (
          <section className={styles.panel} aria-labelledby="safety-title">
            <div className={styles.sectionTitle}>
              <div>
                <h2 id="safety-title">
                  {presentation.stages.safety.heading}
                </h2>
                <p>{presentation.stages.safety.help}</p>
              </div>
            </div>
            <div className={styles.choiceGrid}>
              <fieldset className={styles.choiceFieldset}>
                <legend className={styles.choiceLegend}>
                  {t(language, 'Who is reviewing?', 'समीक्षा कौन कर रहा है?')}
                </legend>
                <div className={styles.choiceGroup}>
                  <button
                    type="button"
                    aria-pressed={role === 'self'}
                    className={`${styles.choice} ${role === 'self' ? styles.choiceActive : ''}`}
                    onClick={() => chooseRole('self')}
                  >
                    <strong>{t(language, 'This is my case', 'यह मेरा मामला है')}</strong>
                  </button>
                  <button
                    type="button"
                    aria-pressed={role === 'helper'}
                    className={`${styles.choice} ${role === 'helper' ? styles.choiceActive : ''}`}
                    onClick={() => chooseRole('helper')}
                  >
                    <strong>
                      {t(
                        language,
                        'I am helping someone present',
                        'मैं मौजूद व्यक्ति की मदद कर रहा/रही हूँ',
                      )}
                    </strong>
                  </button>
                </div>
              </fieldset>
              <fieldset className={styles.choiceFieldset}>
                <legend className={styles.choiceLegend}>
                  {t(language, 'What kind of device?', 'किस तरह का डिवाइस?')}
                </legend>
                <div className={styles.choiceGroup}>
                  <button
                    type="button"
                    aria-pressed={device === 'private'}
                    className={`${styles.choice} ${device === 'private' ? styles.choiceActive : ''}`}
                    onClick={() => chooseDevice('private')}
                  >
                    <strong>{t(language, 'Private device', 'निजी डिवाइस')}</strong>
                  </button>
                  <button
                    type="button"
                    aria-pressed={device === 'shared'}
                    className={`${styles.choice} ${device === 'shared' ? styles.choiceActive : ''}`}
                    onClick={() => chooseDevice('shared')}
                  >
                    <strong>
                      {t(language, 'Shared or public device', 'साझा या सार्वजनिक डिवाइस')}
                    </strong>
                  </button>
                </div>
              </fieldset>
            </div>
            {device === 'shared' && (
              <p className={styles.restricted}>{presentation.sharedInactivityNotice}</p>
            )}
            <div className={styles.acknowledgements}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={consent.manual}
                  onChange={(e) => changeConsent({ ...consent, manual: e.target.checked })}
                />
                {t(
                  language,
                  'I understand this is manual self-review, not authentication, filing, payment, or legal advice.',
                  'मैं समझता/समझती हूँ कि यह मैन्युअल समीक्षा है, प्रमाणीकरण, फाइलिंग, भुगतान या कानूनी सलाह नहीं।',
                )}
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={consent.minimum}
                  onChange={(e) => changeConsent({ ...consent, minimum: e.target.checked })}
                />
                {t(
                  language,
                  'I will enter only minimum masked details.',
                  'मैं केवल न्यूनतम मास्क जानकारी दर्ज करूँगा/करूँगी।',
                )}
              </label>
              {role === 'helper' && (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={consent.citizenConfirmed}
                    onChange={(e) => changeConsent({
                      ...consent,
                      citizenConfirmed: e.target.checked,
                    })}
                  />
                  {t(
                    language,
                    'The citizen is present and will confirm final observations.',
                    'नागरिक मौजूद है और अंतिम अवलोकन पुष्ट करेगा।',
                  )}
                </label>
              )}
            </div>
            {error?.step === step && (
              <p className={styles.inlineError} role="alert">{error.message}</p>
            )}
            <div className={styles.actions}>
              <a className={styles.buttonQuiet} href="/demo">
                {t(language, 'Use synthetic demo', 'सिंथेटिक डेमो')}
              </a>
              <button type="button" className={styles.button} onClick={continueSafety}>
                {presentation.stages.safety.action} →
              </button>
            </div>
          </section>
        )}

        {step === 'source' && (
          <section className={styles.panel} aria-labelledby="source-title">
            <div className={styles.sectionTitle}>
              <div>
                <h2 id="source-title">
                  {presentation.stages.source.heading}
                </h2>
                <p>{presentation.stages.source.help}</p>
              </div>
            </div>
            <div className={styles.serviceGrid}>
              {([
                ['National e-Challan', NATIONAL_URL, true],
                ['State or UT traffic service', '/safety', false],
                ['Virtual Court', COURT_URL, true],
                ['I am not sure', '/safety', false],
              ] as const).map(([label, href, external]) => (
                <article
                  key={label}
                  className={jurisdiction === label ? styles.serviceActive : ''}
                >
                  <button
                    type="button"
                    aria-pressed={jurisdiction === label}
                    onClick={() => changeJurisdiction(label)}
                  >
                    {t(
                      language,
                      label,
                      label === 'National e-Challan'
                        ? 'राष्ट्रीय ई-चालान'
                        : label === 'State or UT traffic service'
                          ? 'राज्य/केंद्रशासित यातायात सेवा'
                          : label === 'Virtual Court'
                            ? 'वर्चुअल कोर्ट'
                            : 'मुझे पता नहीं',
                    )}
                  </button>
                  <a
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer' : undefined}
                  >
                    {external
                      ? t(language, 'Open official service ↗', 'आधिकारिक सेवा खोलें ↗')
                      : t(language, 'Use safety route guidance', 'सुरक्षित रास्ता देखें')}
                  </a>
                </article>
              ))}
            </div>
            <div className={styles.recordSection}>
              <h3>
                {t(
                  language,
                  'Confirm how you obtained this copy',
                  'पुष्टि करें कि कॉपी कैसे मिली',
                )}
              </h3>
              <p>
                {t(
                  language,
                  'Selecting a file does not authenticate its origin.',
                  'फ़ाइल चुनना स्रोत प्रमाणित नहीं करता।',
                )}
              </p>
              <div className={styles.choiceGrid}>
                {([
                  [
                    'official-service',
                    t(
                      language,
                      'I opened the official service myself',
                      'मैंने आधिकारिक सेवा खुद खोली',
                    ),
                  ],
                  [
                    'downloaded-official-record',
                    t(
                      language,
                      'I downloaded it from an official service',
                      'मैंने इसे आधिकारिक सेवा से डाउनलोड किया',
                    ),
                  ],
                  [
                    'message-only',
                    t(
                      language,
                      'I only have a message or forwarded link',
                      'मेरे पास केवल संदेश या लिंक है',
                    ),
                  ],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={answers.sourceStatus === value}
                    className={`${styles.choice} ${
                      answers.sourceStatus === value ? styles.choiceActive : ''
                    }`}
                    onClick={() => changeAnswers({ ...answers, sourceStatus: value })}
                  >
                    <strong>{label}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.recordSection}>
              <h3>
                {t(
                  language,
                  'Choose one deliberate way to continue',
                  'आगे बढ़ने का एक तरीका चुनें',
                )}
              </h3>
              <p>
                {t(
                  language,
                  'A file never changes your source or notice-copy answers.',
                  'फ़ाइल आपके स्रोत या नोटिस-कॉपी उत्तर नहीं बदलती।',
                )}
              </p>
              <button
                type="button"
                aria-pressed={manualEntryMode}
                className={`${styles.buttonSecondary} ${
                  manualEntryMode ? styles.manualActive : ''
                }`}
                onClick={useManual}
              >
                {t(
                  language,
                  'Enter the essential facts yourself',
                  'आवश्यक तथ्य स्वयं दर्ज करें',
                )}
              </button>
            </div>
            <LocalRecordIntake
              record={recordSelection}
              photograph={photographSelection}
              onRecordChange={recordChanged}
              onPhotographChange={photographChanged}
              language={language}
            />
            {error?.step === step && (
              <p className={styles.inlineError} role="alert">{error.message}</p>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => goToStep('safety')}
              >
                ← {t(language, 'Back', 'पीछे')}
              </button>
              <button type="button" className={styles.button} onClick={continueSource}>
                {answers.sourceStatus === 'message-only'
                  ? t(language, 'See safe next step', 'सुरक्षित अगला कदम')
                  : presentation.stages.source.action} →
              </button>
            </div>
          </section>
        )}

        {step === 'observations' && (
          <section className={styles.panel} aria-labelledby="observe-title">
            <div className={styles.sectionTitle}>
              <div>
                <h2 id="observe-title">
                  {presentation.stages.observations.heading}
                </h2>
                <p>{presentation.stages.observations.help}</p>
              </div>
            </div>
            <div className={styles.evidenceWorkspace}>
              <aside className={styles.previewColumn}>
                {recordSelection ? (
                  <Preview
                    selection={recordSelection}
                    title={t(language, 'Official record', 'आधिकारिक रिकॉर्ड')}
                    language={language}
                  />
                ) : (
                  <p>
                    {t(
                      language,
                      'Manual fact entry selected; no record file is previewed.',
                      'मैन्युअल तथ्य प्रविष्टि चुनी गई; कोई फ़ाइल प्रीव्यू नहीं है।',
                    )}
                  </p>
                )}
                {photographSelection && (
                  <Preview
                    selection={photographSelection}
                    title={t(language, 'Supplied photograph', 'दी गई तस्वीर')}
                    language={language}
                  />
                )}
              </aside>
          <div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="vehicle-suffix">
                  {t(
                    language,
                    'Vehicle registration — last 4 only',
                    'वाहन नंबर — केवल अंतिम 4',
                  )}
                </label>
                <input
                  id="vehicle-suffix"
                  value={vehicleSuffix}
                  maxLength={4}
                  autoComplete="off"
                  onChange={(e) => changeVehicleSuffix(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
                  )}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="offence">
                  {t(language, 'Alleged offence category', 'आरोपित अपराध श्रेणी')}
                </label>
                <input
                  id="offence"
                  value={offence}
                  autoComplete="off"
                  onChange={(e) => changeOffence(e.target.value.slice(0, 80))}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="event-date">
                  {t(language, 'Displayed event date', 'दिखाई घटना तारीख')}
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={eventDate}
                  max={indiaDateNow()}
                  onChange={(e) => changeEventDate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="official-deadline">
                  {t(
                    language,
                    'Displayed official deadline',
                    'दिखाई आधिकारिक अंतिम तारीख',
                  )}
                </label>
                <input
                  id="official-deadline"
                  type="date"
                  value={officialDeadline}
                  onChange={(e) => changeOfficialDeadline(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="image-inspected">
                  {t(
                    language,
                    'Did you inspect the supplied photograph?',
                    'क्या आपने दी गई तस्वीर देखी?',
                  )}
                </label>
                <select
                  id="image-inspected"
                  value={answers.imageInspected ? 'yes' : 'no'}
                  onChange={(e) => changeAnswers({
                    ...answers,
                    imageInspected: e.target.value === 'yes',
                  })}
                >
                  <option value="no">
                    {t(language, 'No / not supplied', 'नहीं / नहीं दी गई')}
                  </option>
                  <option value="yes">
                    {t(language, 'Yes, inspected', 'हाँ, देखी')}
                  </option>
                </select>
              </div>
            </div>
            <div className={styles.observationGrid}>
              {([
                ['plateObservation', t(language, 'Plate comparison', 'नंबर प्लेट')],
                ['categoryObservation', t(language, 'Vehicle category', 'वाहन श्रेणी')],
                ['colourObservation', t(language, 'Vehicle colour', 'वाहन रंग')],
              ] as const).map(([key, label]) => (
                <div className={styles.observationCard} key={key}>
                  <label htmlFor={key}>{label}</label>
                  <select
                    id={key}
                    value={answers[key]}
                    disabled={!answers.imageInspected}
                    onChange={(e) => changeAnswers({
                      ...answers,
                      [key]: e.target.value as Observation,
                    })}
                  >
                    {observationOptions.map(([v, labelText]) => (
                      <option value={v} key={v}>{labelText}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div className={styles.observationCard}>
                <label htmlFor="offence-observation">
                  {t(language, 'Offence visibility', 'अपराध दृश्यता')}
                </label>
                <select
                  id="offence-observation"
                  value={answers.offenceObservation}
                  disabled={!answers.imageInspected}
                  onChange={(e) => changeAnswers({
                    ...answers,
                    offenceObservation: e.target.value as OffenceObservation,
                  })}
                >
                  <option value="appears-visible">
                    {t(language, 'Appears visible', 'दिखता है')}
                  </option>
                  <option value="not-visible">
                    {t(language, 'Not visible', 'नहीं दिखता')}
                  </option>
                  <option value="not-assessable-from-still">
                    {t(language, 'Not assessable from one still', 'एक तस्वीर से संभव नहीं')}
                  </option>
                  <option value="unclear">{t(language, 'Unclear', 'अस्पष्ट')}</option>
                </select>
              </div>
              <SelectField
                id="timestamp-status"
                label={t(language, 'Evidence timestamp', 'सबूत समय')}
                value={answers.timestampStatus}
                onChange={(v) => changeAnswers({
                  ...answers,
                  timestampStatus: v as CitizenChallanAnswers['timestampStatus'],
                })}
                options={[
                  ['displayed', t(language, 'Displayed', 'दिखाया गया')],
                  ['unclear', t(language, 'Unclear', 'अस्पष्ट')],
                  ['not-found', t(language, 'Not found', 'नहीं मिला')],
                ]}
              />
              <SelectField
                id="location-status"
                label={t(language, 'Evidence location', 'सबूत स्थान')}
                value={answers.locationStatus}
                onChange={(v) => changeAnswers({
                  ...answers,
                  locationStatus: v as CitizenChallanAnswers['locationStatus'],
                })}
                options={[
                  ['displayed', t(language, 'Displayed', 'दिखाया गया')],
                  ['unclear', t(language, 'Unclear', 'अस्पष्ट')],
                  ['not-found', t(language, 'Not found', 'नहीं मिला')],
                ]}
              />
            </div>
            <div className={styles.formGrid}>
              <SelectField
                id="own-record"
                label={t(language, 'Vehicle comparison record', 'वाहन तुलना रिकॉर्ड')}
                value={answers.ownRecordAvailable}
                onChange={(v) => changeAnswers({
                  ...answers,
                  ownRecordAvailable: v as RecordAvailability,
                })}
                options={recordOptions}
              />
              <SelectField
                id="notice-copy"
                label={t(language, 'Official notice copy', 'आधिकारिक नोटिस कॉपी')}
                value={answers.noticeCopyAvailable}
                onChange={(v) => changeAnswers({
                  ...answers,
                  noticeCopyAvailable: v as RecordAvailability,
                })}
                options={recordOptions}
              />
              <SelectField
                id="custody-record"
                label={t(language, 'Custody record (context only)', 'अभिरक्षा रिकॉर्ड')}
                value={answers.custodyRecordAvailable}
                onChange={(v) => changeAnswers({
                  ...answers,
                  custodyRecordAvailable: v as RecordAvailability,
                })}
                options={recordOptions}
              />
            </div>
          </div>
        </div>
            <div className={styles.acknowledgements}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={factsConfirmed}
                  onChange={(e) => {
                    invalidateArtifact();
                    confirmedSignatureRef.current = e.target.checked ? signature : '';
                    setConfirmedSignature(e.target.checked ? signature : '');
                    setHelperSignature('');
                  }}
                />
                {t(
                  language,
                  'I checked the selected record and photograph beside these entries. Every fact above is either confirmed by me or marked unclear/not supplied.',
                  'मैंने रिकॉर्ड और तस्वीर के साथ ये प्रविष्टियाँ जाँचीं। हर तथ्य पुष्ट है या अस्पष्ट/नहीं दिया गया चिह्नित है।',
                )}
              </label>
            </div>
            {role === 'helper' && factsConfirmed && (
              <div className={styles.acknowledgements}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={helperConfirmed}
                    onChange={(e) => changeHelperConfirmation(
                      e.target.checked ? signature : '',
                    )}
                  />
                  {t(
                    language,
                    'The citizen is present and confirmed every final entry.',
                    'नागरिक मौजूद है और हर अंतिम प्रविष्टि पुष्ट की।',
                  )}
                </label>
              </div>
            )}
            {view && (
              <section className={styles.evidenceTableSection}>
                <h3>
                  {t(language, 'Source-linked evidence view', 'स्रोत-जुड़ा सबूत दृश्य')}
                </h3>
                <p>
                  {presentation.table.confidenceHelp}
                </p>
                <EvidenceRows evidence={view} language={language} simpleMode={simpleMode} />
              </section>
            )}
            {error?.step === step && (
              <p className={styles.inlineError} role="alert">{error.message}</p>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => goToStep('source')}
              >
                ← {t(language, 'Back', 'पीछे')}
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={continueObservations}
              >
                {presentation.stages.observations.action} →
              </button>
            </div>
          </section>
        )}

        {step === 'result' && (
          <section className={styles.panel} aria-labelledby="result-title" data-print-result>
            <div className={styles.sectionTitle}>
              <div>
                <h2 id="result-title">
                  {presentation.stages.result.heading}
                </h2>
              </div>
            </div>
            <div className={styles.resultHero} data-tone={copy.tone}>
              <span className={styles.resultIcon} aria-hidden="true">
                {copy.tone === 'good' ? '✓' : copy.tone === 'warn' ? '!' : 'i'}
              </span>
              <div>
                <h2>{resultTitle}</h2>
                <p>{resultBody}</p>
                <p>
                  <strong>{presentation.resultLimitationLabel}</strong>{' '}
                  {presentation.resultLimitation}
                </p>
              </div>
            </div>
            {answers.sourceStatus === 'message-only' || !factsConfirmed || !view ? (
              <div className={styles.stopCard}>
                <h2>
                  {t(language, 'Do not use the message link', 'संदेश लिंक उपयोग न करें')}
                </h2>
                <p>
                  {t(
                    language,
                    'Find the responsible official service independently. Evidence comparison remains unavailable.',
                    'जिम्मेदार आधिकारिक सेवा स्वतंत्र रूप से खोजें। सबूत तुलना उपलब्ध नहीं है।',
                  )}
                </p>
                <a
                  className={styles.button}
                  href={route.href}
                  target={route.external ? '_blank' : undefined}
                  rel={route.external ? 'noreferrer' : undefined}
                >
                  {route.label} →
                </a>
              </div>
            ) : (
                <>
                  <div className={styles.resultColumns}>
                    <section className={styles.listPanel}>
                      <h3>{presentation.resultSections.established}</h3>
                      <ul>
                        {localizedAssessment.materialSignals.length ? (
                          localizedAssessment.materialSignals.map((item) => (
                            <li key={item}>{item}</li>
                          ))
                        ) : (
                          <li>
                            {t(
                              language,
                              'No material inconsistency was established.',
                              'कोई महत्वपूर्ण असंगति स्थापित नहीं हुई।',
                            )}
                          </li>
                        )}
                      </ul>
                    </section>
                    <section className={styles.listPanel}>
                      <h3>{presentation.resultSections.unclear}</h3>
                      <ul>
                        {localizedAssessment.cautions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                  <section className={styles.listPanel}>
                    <h3>{presentation.resultSections.missing}</h3>
                    <ul>
                      {localizedAssessment.missingEvidence.length ? (
                        localizedAssessment.missingEvidence.map((item) => (
                          <li key={item}>{item}</li>
                        ))
                      ) : (
                        <li>
                          {t(
                            language,
                            'No missing record marked.',
                            'कोई गायब रिकॉर्ड चिह्नित नहीं।',
                          )}
                        </li>
                      )}
                    </ul>
                  </section>
                  <section className={styles.evidenceTableSection} data-print-evidence>
                    <h3>{presentation.resultSections.evidence}</h3>
                    <p>
                      {presentation.table.confidenceHelp}
                    </p>
                    <EvidenceRows evidence={view} language={language} simpleMode={simpleMode} />
                  </section>
                  {deadline && deadline.status !== 'not-entered' && (
                    <div className={styles.deadline}>
                      <strong>
                        {localizeDeadline(deadline, language, simpleMode)}
                      </strong>
                      <p>
                        {t(
                          language,
                          'This is not a legal deadline calculation.',
                          'यह कानूनी समयसीमा गणना नहीं है।',
                        )}
                      </p>
                    </div>
                  )}
                  <section className={styles.timeline} data-print-timeline>
                    <h3>{presentation.timelineHeading}</h3>
                    <ol>
                      {timelineFor(summaryGenerated).map((item) => (
                        <li key={item.id}>{item.label}</li>
                      ))}
                    </ol>
                  </section>
                  <section className={styles.officialHandoff}>
                    <div>
                      <h3>{presentation.resultSections.officialRoute}</h3>
                      <p>
                        {t(
                          language,
                          'Nothing is transferred; enter identifiers only there.',
                          'कुछ स्थानांतरित नहीं होता; पहचान केवल वहाँ दर्ज करें।',
                        )}
                      </p>
                    </div>
                    <a
                      className={styles.button}
                      href={route.href}
                      target={route.external ? '_blank' : undefined}
                      rel={route.external ? 'noreferrer' : undefined}
                    >
                      {route.label} →
                    </a>
                  </section>
                  <section className={styles.artifact} data-print-artifact>
                    <h3>{presentation.summaryHeading}</h3>
                    <p>{presentation.summaryHelp}</p>
                    <p className={styles.summaryDisclaimer}>
                      <span lang="en">{DISCLAIMER}</span>
                      <span lang="hi">{CITIZEN_DISCLAIMER_HI}</span>
                    </p>
                    <p className={styles.artifactWarning}>
                      {device === 'shared'
                        ? t(
                          language,
                          'Download, copy, and print are disabled on this shared device. Screenshots, clipboard history, browser downloads, and backups are outside ChallanSakshi’s control.',
                          'इस साझा डिवाइस पर डाउनलोड, कॉपी और प्रिंट बंद हैं। स्क्रीनशॉट, क्लिपबोर्ड, डाउनलोड और बैकअप नियंत्रण से बाहर हैं।',
                        )
                        : t(
                          language,
                          'Local actions may leave copies on this device.',
                          'स्थानीय कार्रवाई से डिवाइस पर कॉपी रह सकती है।',
                        )}
                    </p>
                    <pre>{summaryFor(summaryGenerated)}</pre>
                    <div className={styles.summaryActions}>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        disabled={device === 'shared'}
                        onClick={copySummary}
                      >
                        {presentation.actions.copy}
                      </button>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        disabled={device === 'shared'}
                        onClick={printSummary}
                      >
                        {presentation.actions.print}
                      </button>
                      <button
                        type="button"
                        className={styles.button}
                        disabled={device === 'shared'}
                        onClick={saveSummary}
                      >
                        {presentation.actions.download}
                      </button>
                    </div>
                  </section>
                  {artifactStatus?.signature === presentationSignature && (
                    <p className={styles.inlineStatus} role="status">
                      {artifactStatus.message}
                    </p>
                  )}
                </>
              )}
            <p className={styles.summaryDisclaimer}>
              <span lang="en">{DISCLAIMER}</span>
              <span lang="hi">{CITIZEN_DISCLAIMER_HI}</span>
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => goToStep(
                  answers.sourceStatus === 'message-only' ? 'source' : 'observations',
                )}
              >
                ← {presentation.stages.result.action}
              </button>
            </div>
          </section>
        )}
      </main>
    </PublicBetaShell>
  );
}
