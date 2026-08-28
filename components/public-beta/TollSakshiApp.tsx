'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Language } from '../../lib/domain';
import { buildTollGuidedProgress, getTollGuideContent } from '../../lib/guided-journey';
import {
  assessTollReview,
  buildTollPassport,
  buildTollWorksheet,
  calculateRecordedIntervalMinutes,
  type TollConcern,
  type TollRecordStatus,
  type TollReviewAnswers,
} from '../../lib/toll-domain';
import { tollFixtures, type TollFixture } from '../../lib/toll-fixtures';
import { GuidedStepHeader } from '../guided/GuidedStepHeader';
import { PublicBetaShell, SafetyBoundary, publicBetaStyles as styles } from './PublicBetaShell';

type Step = 'start' | 'records' | 'reconcile' | 'packet';
type Mode = 'real' | 'synthetic';
type Device = 'private' | 'shared';

const defaultAnswers: TollReviewAnswers = {
  concern: 'not-sure', sourceVerified: false, timestampType: 'unknown', plazaScope: 'unknown', passingImageStatus: 'not-supplied',
  passingPlateObservation: 'not-supplied', vehicleClassObservation: 'not-supplied', secondDebitPresent: false, samePlaza: false,
  closeInTime: false, creditAdjustment: 'not-checked', alternateReceipt: 'not-supplied', tariffOrPassRecord: 'not-supplied', acknowledgement: 'not-supplied',
  plazaRecorded: false, directionKnown: false, secondTimestampRecorded: false, vehicleSuffixRecorded: false,
  recordedIntervalMinutes: null,
  officialSourceSelected: false, tagSuffixRecorded: false, transactionSuffixRecorded: false, eventTimestampRecorded: false, amountRecorded: false,
  tagMappingVerified: false, alternateReceiptEventMatch: false, tariffOrPassConflictConfirmed: false, reconciliationConfirmed: false,
};

const emptyRefs = { issuerLabel: '', tagSuffix: '', vehicleSuffix: '', transactionSuffix: '', amount: '', plaza: '', eventDateTime: '', secondEventDateTime: '' };

function t(language: Language, en: string, hi: string) { return language === 'hi' ? hi : en; }

function sanitizeSuffix(value: string): string { return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }
function isValidAmount(value: string): boolean { return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 100000; }

function SelectField({ id, label, value, onChange, options, help }: { id: string; label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; help?: string }) {
  return <div className={styles.field}><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>{help && <small>{help}</small>}</div>;
}

function concernLabel(concern: TollConcern, language: Language): string {
  const labels: Record<TollConcern, [string, string]> = {
    unrecognised: ['I do not recognise this crossing', 'मैं इस क्रॉसिंग को नहीं पहचानता/पहचानती'],
    duplicate: ['I may have been debited twice', 'शायद दो बार राशि कटी'],
    'paid-another-way': ['I paid another way too', 'मैंने दूसरे तरीके से भी भुगतान किया'],
    'fare-or-class': ['Fare or vehicle class looks wrong', 'किराया या वाहन श्रेणी गलत लगती है'],
    'pass-or-discount': ['Pass or discount was not applied', 'पास या छूट लागू नहीं हुई'],
    'tag-lifecycle': ['Closure, refund, or tag status is incomplete', 'बंद करने, रिफंड या टैग स्थिति की समस्या'],
    'plaza-incident': ['The tag did not work at the plaza', 'प्लाज़ा पर टैग काम नहीं किया'],
    'record-check': ['I recognise the crossing and want to check the records', 'मैं क्रॉसिंग पहचानता/पहचानती हूँ और रिकॉर्ड जाँचना चाहता/चाहती हूँ'],
    'not-sure': ['I am not sure yet', 'अभी पता नहीं'],
  };
  return t(language, labels[concern][0], labels[concern][1]);
}

function statusLabel(value: TollRecordStatus, language: Language): string {
  const labels: Record<TollRecordStatus, [string, string]> = {
    readable: ['Readable', 'पढ़ने योग्य'], unclear: ['Unclear', 'अस्पष्ट'], 'not-supplied': ['Not supplied', 'नहीं दिया'],
    'not-applicable': ['N/A', 'लागू नहीं'], 'official-verification': ['Verify officially', 'आधिकारिक जाँच'],
  };
  return t(language, labels[value][0], labels[value][1]);
}

export default function TollSakshiApp() {
  const [language, setLanguage] = useState<Language>('en');
  const [step, setStep] = useState<Step>('start');
  const [mode, setMode] = useState<Mode>('real');
  const [device, setDevice] = useState<Device | null>(null);
  const [consent, setConsent] = useState({ manual: false, minimum: false });
  const [answers, setAnswers] = useState<TollReviewAnswers>(defaultAnswers);
  const [refs, setRefs] = useState(emptyRefs);
  const [direction, setDirection] = useState('unknown');
  const [fixtureId, setFixtureId] = useState<TollFixture['id']>('different-vehicle');
  const [error, setError] = useState('');
  const [artifactStatus, setArtifactStatus] = useState('');
  const [tagMappingSignature, setTagMappingSignature] = useState('');
  const [receiptMatchSignature, setReceiptMatchSignature] = useState('');
  const [tariffConflictSignature, setTariffConflictSignature] = useState('');
  const [sourceVerificationSignature, setSourceVerificationSignature] = useState('');
  const [reconciliationSignature, setReconciliationSignature] = useState('');
  const guideHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef<Step>(step);

  const currentSourceVerificationSignature = useMemo(() => JSON.stringify({ issuerLabel: refs.issuerLabel }), [refs.issuerLabel]);
  const sourceConfirmed = sourceVerificationSignature !== '' && sourceVerificationSignature === currentSourceVerificationSignature;
  const currentTagMappingSignature = useMemo(() => JSON.stringify({ sourceConfirmed, issuerLabel: refs.issuerLabel, tagSuffix: refs.tagSuffix, vehicleSuffix: refs.vehicleSuffix }), [sourceConfirmed, refs.issuerLabel, refs.tagSuffix, refs.vehicleSuffix]);
  const currentReceiptMatchSignature = useMemo(() => JSON.stringify({ receipt: answers.alternateReceipt, plaza: refs.plaza, event: refs.eventDateTime, direction, amount: refs.amount }), [answers.alternateReceipt, refs.plaza, refs.eventDateTime, refs.amount, direction]);
  const currentTariffConflictSignature = useMemo(() => JSON.stringify({ concern: answers.concern, record: answers.tariffOrPassRecord, plaza: refs.plaza, event: refs.eventDateTime, direction, amount: refs.amount, vehicleClass: answers.vehicleClassObservation }), [answers.concern, answers.tariffOrPassRecord, answers.vehicleClassObservation, refs.plaza, refs.eventDateTime, refs.amount, direction]);
  const tagMappingConfirmed = tagMappingSignature !== '' && tagMappingSignature === currentTagMappingSignature;
  const receiptMatchConfirmed = receiptMatchSignature !== '' && receiptMatchSignature === currentReceiptMatchSignature;
  const tariffConflictConfirmed = tariffConflictSignature !== '' && tariffConflictSignature === currentTariffConflictSignature;
  const currentReconciliationSignature = useMemo(() => JSON.stringify({ answers, refs, direction, sourceConfirmed, tagMappingConfirmed, receiptMatchConfirmed, tariffConflictConfirmed }), [answers, refs, direction, sourceConfirmed, tagMappingConfirmed, receiptMatchConfirmed, tariffConflictConfirmed]);
  const reconciliationConfirmed = reconciliationSignature !== '' && reconciliationSignature === currentReconciliationSignature;

  const reviewedAnswers = useMemo<TollReviewAnswers>(() => ({
    ...answers,
    plazaRecorded: Boolean(refs.plaza.trim()),
    directionKnown: direction !== 'unknown',
    secondTimestampRecorded: Boolean(refs.secondEventDateTime),
    vehicleSuffixRecorded: refs.vehicleSuffix.length === 4,
    recordedIntervalMinutes: calculateRecordedIntervalMinutes(refs.eventDateTime, refs.secondEventDateTime),
    officialSourceSelected: Boolean(refs.issuerLabel && refs.issuerLabel !== 'Not sure'),
    tagSuffixRecorded: refs.tagSuffix.length === 4,
    transactionSuffixRecorded: refs.transactionSuffix.length === 4,
    eventTimestampRecorded: Boolean(refs.eventDateTime),
    amountRecorded: isValidAmount(refs.amount),
    sourceVerified: mode === 'synthetic' ? answers.sourceVerified : sourceConfirmed,
    tagMappingVerified: mode === 'synthetic' ? answers.tagMappingVerified : tagMappingConfirmed,
    alternateReceiptEventMatch: mode === 'synthetic' ? answers.alternateReceiptEventMatch : receiptMatchConfirmed,
    tariffOrPassConflictConfirmed: mode === 'synthetic' ? answers.tariffOrPassConflictConfirmed : tariffConflictConfirmed,
    reconciliationConfirmed: mode === 'synthetic' ? answers.reconciliationConfirmed : reconciliationConfirmed,
  }), [answers, refs, direction, mode, sourceConfirmed, tagMappingConfirmed, receiptMatchConfirmed, tariffConflictConfirmed, reconciliationConfirmed]);
  const assessment = useMemo(() => assessTollReview(reviewedAnswers), [reviewedAnswers]);
  const passport = useMemo(() => buildTollPassport(reviewedAnswers, refs), [reviewedAnswers, refs]);
  const worksheet = useMemo(() => buildTollWorksheet({ ...refs, answers: reviewedAnswers, assessment, synthetic: mode === 'synthetic' }), [refs, reviewedAnswers, assessment, mode]);
  const startReady = Boolean(device && (mode === 'synthetic' || (consent.manual && consent.minimum)));
  const sourceReady = mode === 'synthetic'
    ? reviewedAnswers.sourceVerified
    : Boolean(sourceConfirmed && refs.issuerLabel && refs.issuerLabel !== 'Not sure');
  const identifiersValid = [refs.tagSuffix, refs.vehicleSuffix, refs.transactionSuffix]
    .every((value) => value.length === 0 || value.length === 4);
  const recordsReady = identifiersValid && (!refs.amount || isValidAmount(refs.amount)) && sourceReady;
  const finalConfirmationReady = mode === 'synthetic' ? reviewedAnswers.reconciliationConfirmed : reconciliationConfirmed;
  const guide = getTollGuideContent({
    step,
    startReady,
    sourceReady,
    recordsReady,
    finalConfirmationReady,
    packetAvailable: assessment.shouldPrepareIssuerNote,
    exportAllowed: device !== 'shared',
  });
  const guideProgress = buildTollGuidedProgress(step);
  const isNhaiFastagSource = refs.issuerLabel === 'IHMCL portal — NHAI FASTag only';
  const displayedRoute = assessment.route === 'issuer'
    ? (isNhaiFastagSource ? 'verified IHMCL portal or 1033' : 'issuing bank / official account provider')
    : assessment.route === 'issuer-and-1033'
      ? (isNhaiFastagSource ? 'verified IHMCL portal or 1033' : 'issuing bank plus 1033 for the NHAI plaza issue')
      : assessment.route.replaceAll('-', ' ');

  const reset = () => {
    setStep('start'); setMode('real'); setDevice(null); setConsent({ manual: false, minimum: false }); setAnswers(defaultAnswers);
    setRefs(emptyRefs); setDirection('unknown'); setFixtureId('different-vehicle'); setError(''); setArtifactStatus('');
    setTagMappingSignature(''); setReceiptMatchSignature(''); setTariffConflictSignature('');
    setSourceVerificationSignature(''); setReconciliationSignature('');
  };

  useEffect(() => {
    if (device !== 'shared') return;
    const inactivityMs = 10 * 60 * 1000;
    let expiresAt = Date.now() + inactivityMs;
    let timeout = window.setTimeout(() => window.location.replace('/'), inactivityMs);
    const checkExpiry = () => {
      window.clearTimeout(timeout);
      if (Date.now() >= expiresAt) window.location.replace('/');
      else timeout = window.setTimeout(() => window.location.replace('/'), expiresAt - Date.now());
    };
    const rearm = () => {
      window.clearTimeout(timeout);
      expiresAt = Date.now() + inactivityMs;
      timeout = window.setTimeout(() => window.location.replace('/'), inactivityMs);
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'input', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, rearm, { passive: true }));
    window.addEventListener('focus', checkExpiry);
    window.addEventListener('pageshow', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    return () => {
      window.clearTimeout(timeout);
      events.forEach((eventName) => window.removeEventListener(eventName, rearm));
      window.removeEventListener('focus', checkExpiry);
      window.removeEventListener('pageshow', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [device]);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    guideHeadingRef.current?.focus();
  }, [step]);

  const quickExit = () => { reset(); window.location.replace('/'); };

  const chooseFixture = (fixture: TollFixture) => {
    setFixtureId(fixture.id); setAnswers(fixture.answers); setRefs(fixture.refs); setDirection('forward'); setError('');
  };

  const selectRealMode = () => {
    setMode('real'); setConsent({ manual: false, minimum: false }); setAnswers(defaultAnswers); setRefs(emptyRefs);
    setDirection('unknown'); setFixtureId('different-vehicle'); setError(''); setArtifactStatus('');
    setTagMappingSignature(''); setReceiptMatchSignature(''); setTariffConflictSignature('');
    setSourceVerificationSignature(''); setReconciliationSignature('');
  };

  const selectSyntheticMode = () => {
    setMode('synthetic'); setConsent({ manual: false, minimum: false }); setArtifactStatus('');
    setTagMappingSignature(''); setReceiptMatchSignature(''); setTariffConflictSignature('');
    setSourceVerificationSignature(''); setReconciliationSignature('');
    chooseFixture(tollFixtures[0]);
  };

  const continueStart = () => {
    if (!device || (mode === 'real' && (!consent.manual || !consent.minimum))) {
      setError(t(language, 'Choose the device type and, for real records, confirm both safety statements before continuing.', 'डिवाइस प्रकार चुनें और असली रिकॉर्ड के लिए दोनों सुरक्षा कथनों की पुष्टि करें।'));
      return;
    }
    if (mode === 'synthetic') chooseFixture(tollFixtures.find((fixture) => fixture.id === fixtureId) ?? tollFixtures[0]);
    setError(''); setStep('records');
  };

  const continueRecords = () => {
    if ([refs.tagSuffix, refs.vehicleSuffix, refs.transactionSuffix].some((value) => value.length > 0 && value.length !== 4)) {
      setError(t(language, 'Each identifier suffix must be exactly four characters, or blank.', 'हर पहचान प्रत्यय ठीक चार अक्षर/अंक का हो, या खाली रहे।'));
      return;
    }
    if (refs.amount && !isValidAmount(refs.amount)) {
      setError(t(language, 'Enter a debit amount greater than 0 and no more than ₹1,00,000, with at most two decimal places—or leave it blank.', '0 से अधिक और ₹1,00,000 तक की डेबिट राशि, अधिकतम दो दशमलव अंकों के साथ दर्ज करें—या खाली छोड़ें।'));
      return;
    }
    if (mode === 'real' && (!sourceConfirmed || !refs.issuerLabel || refs.issuerLabel === 'Not sure')) {
      setError(t(language, 'First choose and confirm the official account service where you independently found the debit.', 'पहले वह आधिकारिक खाता सेवा चुनें और पुष्टि करें जहाँ आपने स्वतंत्र रूप से डेबिट पाया।'));
      return;
    }
    if (mode === 'real' && !reconciliationConfirmed) {
      setError(t(language, 'Review the final same-transaction confirmation after your last edit.', 'अंतिम बदलाव के बाद उसी लेन-देन की अंतिम पुष्टि फिर जाँचें।'));
      return;
    }
    setError(''); setStep('reconcile');
  };

  const changeConcern = (concern: TollConcern) => {
    setAnswers({
      ...answers,
      concern,
      secondDebitPresent: false,
      samePlaza: false,
      closeInTime: false,
      creditAdjustment: 'not-checked',
      alternateReceipt: 'not-supplied',
      alternateReceiptEventMatch: false,
      tariffOrPassRecord: 'not-supplied',
      tariffOrPassConflictConfirmed: false,
      acknowledgement: 'not-supplied',
    });
    setRefs({ ...refs, secondEventDateTime: '' });
    setReceiptMatchSignature('');
    setTariffConflictSignature('');
    setReconciliationSignature('');
  };

  const changePassingImageStatus = (passingImageStatus: TollRecordStatus) => {
    setAnswers({
      ...answers,
      passingImageStatus,
      ...(passingImageStatus === 'readable' ? {} : {
        passingPlateObservation: passingImageStatus === 'not-supplied' ? 'not-supplied' as const : 'unclear' as const,
        vehicleClassObservation: passingImageStatus === 'not-supplied' ? 'not-supplied' as const : 'unclear' as const,
      }),
    });
    setReconciliationSignature('');
  };

  const copyWorksheet = async () => {
    if (device === 'shared' || !assessment.shouldPrepareIssuerNote) return;
    try { await navigator.clipboard.writeText(worksheet); setArtifactStatus(t(language, 'Issuer worksheet copied. The clipboard may retain it.', 'जारीकर्ता वर्कशीट कॉपी हुई। क्लिपबोर्ड इसे रख सकता है।')); }
    catch { setArtifactStatus(t(language, 'Copy was blocked by the browser.', 'ब्राउज़र ने कॉपी रोक दी।')); }
  };
  const downloadWorksheet = () => {
    if (device === 'shared' || !assessment.shouldPrepareIssuerNote) return;
    const blob = new Blob([worksheet], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = mode === 'synthetic' ? 'SYNTHETIC-tollsakshi-fixture.txt' : 'tollsakshi-local-worksheet.txt'; anchor.click(); URL.revokeObjectURL(url);
    setArtifactStatus(t(language, 'Downloaded locally. TollSakshi cannot erase that copy.', 'स्थानीय डाउनलोड हुआ। TollSakshi वह कॉपी मिटा नहीं सकता।'));
  };

  const recordOptions: Array<[TollRecordStatus, string]> = [
    ['readable', t(language, 'Available and readable', 'उपलब्ध और पढ़ने योग्य')], ['unclear', t(language, 'Available but unclear', 'उपलब्ध लेकिन अस्पष्ट')],
    ['not-supplied', t(language, 'Not supplied / not located', 'नहीं दिया / नहीं मिला')], ['official-verification', t(language, 'Requires official verification', 'आधिकारिक जाँच आवश्यक')],
  ];

  const mapRows = [
    { label: t(language, 'Vehicle identity', 'वाहन पहचान'), record: answers.passingImageStatus !== 'readable' ? t(language, `Passing image: ${answers.passingImageStatus.replaceAll('-', ' ')}`, `पासिंग तस्वीर: ${answers.passingImageStatus.replaceAll('-', ' ')}`) : `${t(language, 'Plate observation', 'प्लेट अवलोकन')}: ${answers.passingPlateObservation}`, status: answers.passingImageStatus !== 'readable' ? 'unclear' : answers.passingPlateObservation === 'different' ? 'conflicts' : answers.passingPlateObservation === 'match' ? 'agrees' : 'unclear' },
    { label: t(language, 'Event time', 'घटना समय'), record: answers.timestampType === 'sms-received' ? t(language, 'SMS time—cannot establish passage time', 'SMS समय—पास होने का समय साबित नहीं') : `${t(language, 'Entered as', 'इस रूप में दर्ज')}: ${answers.timestampType}`, status: answers.timestampType === 'reader-read' ? 'verify official' : 'unclear' },
    { label: t(language, 'Plaza & direction', 'प्लाज़ा और दिशा'), record: `${refs.plaza || t(language, 'Not entered', 'दर्ज नहीं')} · ${direction}`, status: refs.plaza ? 'verify official' : 'not supplied' },
    { label: t(language, 'Two-debit interval', 'दो डेबिट का अंतर'), record: reviewedAnswers.recordedIntervalMinutes === null ? (answers.secondDebitPresent ? t(language, 'Two debits entered; valid reader-time pair missing', 'दो डेबिट दर्ज; मान्य रीडर-समय जोड़ी गायब') : t(language, 'One debit in this worksheet', 'इस वर्कशीट में एक डेबिट')) : t(language, `${reviewedAnswers.recordedIntervalMinutes} minutes between entered reader times`, `दर्ज रीडर समयों में ${reviewedAnswers.recordedIntervalMinutes} मिनट`), status: answers.secondDebitPresent && answers.samePlaza && answers.closeInTime ? 'issuer rule required' : 'unclear' },
    { label: t(language, 'Amount & vehicle class', 'राशि और वाहन श्रेणी'), record: `${refs.amount ? `₹${refs.amount}` : t(language, 'Amount not entered', 'राशि दर्ज नहीं')} · ${answers.passingImageStatus === 'readable' ? answers.vehicleClassObservation : t(language, 'no readable passing-image comparison', 'पढ़ने योग्य पासिंग-तस्वीर तुलना नहीं')}`, status: answers.passingImageStatus !== 'readable' ? 'unclear' : answers.vehicleClassObservation === 'different' ? 'conflicts' : answers.vehicleClassObservation === 'match' ? 'agrees' : 'verify official' },
    { label: t(language, 'Other payment / pass', 'अन्य भुगतान / पास'), record: answers.concern === 'paid-another-way' ? statusLabel(answers.alternateReceipt, language) : answers.concern === 'pass-or-discount' ? statusLabel(answers.tariffOrPassRecord, language) : t(language, 'Not claimed', 'दावा नहीं'), status: answers.concern === 'paid-another-way' || answers.concern === 'pass-or-discount' ? 'verify official' : 'not applicable' },
    { label: t(language, 'Credit adjustment', 'क्रेडिट समायोजन'), record: answers.concern === 'duplicate' ? answers.creditAdjustment.replaceAll('-', ' ') : t(language, 'Not applicable to selected concern', 'चुनी समस्या पर लागू नहीं'), status: answers.concern !== 'duplicate' ? 'not applicable' : answers.creditAdjustment === 'visible' ? 'agrees' : answers.creditAdjustment === 'not-visible-in-checked-period' ? 'not found in checked period' : 'unclear' },
  ];

  return (
    <PublicBetaShell language={language} setLanguage={setLanguage} service="TollSakshi" serviceHindi="टोल साक्षी · by ChallanSakshi" onQuickExit={quickExit} englishOnly>
      <main className={styles.main}>
        <GuidedStepHeader
          {...guide}
          steps={guideProgress}
          progressLabel={t(language, 'TollSakshi guided review progress', 'TollSakshi निर्देशित समीक्षा प्रगति')}
          headingRef={guideHeadingRef}
          headingId="toll-guided-step-title"
        />
        <section className={`${styles.hero} ${styles.heroCompact}`}>
          <div><p className={styles.eyebrow}>{t(language, 'FASTag transaction reconciliation', 'FASTag लेन-देन मिलान')}</p><h1>{t(language, 'Does this debit match a ', 'क्या यह डेबिट दर्ज ')}<em>{t(language, 'documented crossing?', 'क्रॉसिंग से मेल खाता है?')}</em></h1><p className={styles.lede}>{t(language, 'TollSakshi separates passage time from posting time, maps the debit to vehicle and plaza records, and prepares a conservative issuer checklist.', 'TollSakshi पास होने के समय को पोस्टिंग समय से अलग रखता है, डेबिट को वाहन और प्लाज़ा रिकॉर्ड से मिलाता है, और सावधान जारीकर्ता सूची बनाता है।')}</p></div>
          <div className={styles.heroCard}><span>{t(language, 'NEW MOBILITY SERVICE', 'नई मोबिलिटी सेवा')}</span><strong>{t(language, 'One evidence core, a new real-world pain point', 'एक सबूत प्रणाली, नई असली समस्या')}</strong><ul><li>{t(language, 'Unrecognised toll crossing', 'अपरिचित टोल क्रॉसिंग')}</li><li>{t(language, 'Possible duplicate debit or missing credit', 'संभावित दोहरा डेबिट या गायब क्रेडिट')}</li><li>{t(language, 'Alternate payment, fare, class, or pass conflict', 'अन्य भुगतान, किराया, श्रेणी या पास अंतर')}</li></ul></div>
        </section>
        <SafetyBoundary language={language}><p>{t(language, 'TollSakshi never asks you to enter or share an OTP, UPI PIN, card PIN, CVV, banking password, full card number, or FASTag account password. Enter an OTP only inside a verified official issuer or IHMCL portal that you independently opened; a UPI PIN authorizes an outgoing payment and is never needed to receive a refund.', 'TollSakshi कभी OTP, UPI PIN, कार्ड PIN, CVV, बैंकिंग पासवर्ड, पूरा कार्ड नंबर या FASTag पासवर्ड दर्ज या साझा करने को नहीं कहता। OTP केवल स्वतंत्र रूप से खोले गए सत्यापित आधिकारिक जारीकर्ता या IHMCL पोर्टल में दर्ज करें; UPI PIN बाहर जाने वाले भुगतान को मंज़ूरी देता है और रिफंड पाने के लिए कभी आवश्यक नहीं है।')}</p></SafetyBoundary>
        {mode === 'synthetic' && <p className={styles.restricted} role="status"><strong>SYNTHETIC FIXTURE — NOT A REAL TRANSACTION.</strong> {t(language, 'Every value on this page is fictional. Do not submit the generated note to an issuer.', 'इस पेज की हर जानकारी काल्पनिक है। तैयार नोट जारीकर्ता को जमा न करें।')}</p>}

        {step === 'start' && <section className={styles.panel} aria-labelledby="toll-start-title">
          <div className={styles.sectionTitle}><div><h2 id="toll-start-title">{t(language, 'Manual self-review or synthetic walkthrough', 'मैन्युअल स्वयं-समीक्षा या सिंथेटिक उदाहरण')}</h2><p>{t(language, 'Real mode is tab-memory only. Synthetic cases contain no citizen data.', 'रियल मोड केवल टैब मेमोरी में है। सिंथेटिक मामलों में नागरिक डेटा नहीं है।')}</p></div></div>
          <div className={styles.choiceFields}>
            <fieldset className={styles.choiceFieldset}>
              <legend className={styles.choiceLegend}>{t(language, 'A. Which review do you want?', 'A. आप कौन-सी समीक्षा चाहते हैं?')}</legend>
              <div className={styles.choiceGroup} role="group">
                <button type="button" aria-pressed={mode === 'real'} className={`${styles.choice} ${mode === 'real' ? styles.choiceActive : ''}`} onClick={selectRealMode}><strong>{t(language, 'Use my own records manually', 'अपने रिकॉर्ड मैन्युअली उपयोग करें')}</strong><small>{t(language, 'No uploads, no AI, no account, no automatic filing.', 'कोई अपलोड, AI, अकाउंट या स्वचालित फाइलिंग नहीं।')}</small></button>
                <button type="button" aria-pressed={mode === 'synthetic'} className={`${styles.choice} ${mode === 'synthetic' ? styles.choiceActive : ''}`} onClick={selectSyntheticMode}><strong>{t(language, 'Explore fictional examples', 'काल्पनिक उदाहरण देखें')}</strong><small>{t(language, 'Different vehicle, citizen-reported two-debit pattern, and records-aligned refusal.', 'अलग वाहन, नागरिक द्वारा दर्ज दो-डेबिट पैटर्न और मेल खाते रिकॉर्ड का इनकार।')}</small></button>
              </div>
            </fieldset>
            <fieldset className={styles.choiceFieldset}>
              <legend className={styles.choiceLegend}>{t(language, 'B. What kind of device is this?', 'B. यह किस तरह का डिवाइस है?')}</legend>
              <div className={styles.choiceGroup} role="group">
                <button type="button" aria-pressed={device === 'private'} className={`${styles.choice} ${device === 'private' ? styles.choiceActive : ''}`} onClick={() => setDevice('private')}><strong>{t(language, 'Private device', 'निजी डिवाइस')}</strong><small>{t(language, 'Local copy/download available at the end.', 'अंत में स्थानीय कॉपी/डाउनलोड उपलब्ध।')}</small></button>
                <button type="button" aria-pressed={device === 'shared'} className={`${styles.choice} ${device === 'shared' ? styles.choiceActive : ''}`} onClick={() => setDevice('shared')}><strong>{t(language, 'Shared or public device', 'साझा या सार्वजनिक डिवाइस')}</strong><small>{t(language, 'In-app copy/download controls are disabled; the page attempts to leave after about 10 minutes of inactivity.', 'ऐप के कॉपी/डाउनलोड नियंत्रण बंद हैं; लगभग 10 मिनट निष्क्रिय रहने पर पेज बाहर निकलने का प्रयास करता है।')}</small></button>
              </div>
            </fieldset>
          </div>
          {mode === 'synthetic' && <div className={styles.fixtureBar}>{tollFixtures.map((fixture) => <button type="button" key={fixture.id} className={`${styles.fixtureChoice} ${fixtureId === fixture.id ? styles.choiceActive : ''}`} onClick={() => chooseFixture(fixture)}><span className={styles.syntheticChip}>SYNTHETIC</span><strong>{fixture.label}</strong><small>{fixture.description}</small></button>)}</div>}
          {mode === 'real' && <div className={styles.acknowledgements}><label className={styles.check}><input type="checkbox" checked={consent.manual} onChange={(event) => setConsent({ ...consent, manual: event.target.checked })} />{t(language, 'I understand this is manual self-review and no record is inspected, submitted, or authenticated.', 'मैं समझता/समझती हूँ कि यह मैन्युअल स्वयं-समीक्षा है और कोई रिकॉर्ड देखा, जमा या प्रमाणित नहीं होता।')}</label><label className={styles.check}><input type="checkbox" checked={consent.minimum} onChange={(event) => setConsent({ ...consent, minimum: event.target.checked })} />{t(language, 'I will use only last-four identifiers and will not enter credentials or full financial data.', 'मैं केवल अंतिम-चार पहचान का उपयोग करूँगा/करूँगी और क्रेडेंशियल या पूरा वित्तीय डेटा दर्ज नहीं करूँगा/करूँगी।')}</label></div>}
          <p className={styles.restricted}><strong>{t(language, 'Never enter:', 'कभी दर्ज न करें:')}</strong> {t(language, 'OTP, UPI PIN, card PIN/CVV, password, complete card/account/tag/reference number, Aadhaar, phone/address, RC image, or a bank statement.', 'OTP, UPI PIN, कार्ड PIN/CVV, पासवर्ड, पूरा कार्ड/खाता/टैग/रेफरेंस नंबर, आधार, फ़ोन/पता, RC तस्वीर या बैंक स्टेटमेंट।')}</p>
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
          <div className={styles.actions}><a className={styles.buttonQuiet} href="/review">{t(language, 'Review an e-Challan instead', 'इसके बजाय ई-चालान समीक्षा करें')}</a><button type="button" className={styles.button} onClick={continueStart}>{t(language, 'Start transaction check', 'लेन-देन जाँच शुरू करें')} →</button></div>
        </section>}

        {step === 'records' && <section className={styles.panel} aria-labelledby="toll-records-title">
          <div className={styles.sectionTitle}><div><h2 id="toll-records-title">{t(language, 'Describe the transaction—not your account', 'लेन-देन बताएँ—अपना खाता नहीं')}</h2><p>{t(language, 'Work through five small evidence groups. Keep reader-read, debit-post, and SMS-received times distinct.', 'पाँच छोटे सबूत समूह पूरे करें। रीडर-रीड, डेबिट-पोस्ट और SMS-मिलने के समय अलग रखें।')}</p></div></div>
          <div className={styles.recordSections}>
          <section className={styles.recordSection} aria-labelledby="record-source-title">
            <div className={styles.recordSectionHeading}><span>1</span><div><h3 id="record-source-title">{t(language, 'Concern and official source', 'समस्या और आधिकारिक स्रोत')}</h3><p>{t(language, 'Begin with one debit that you independently found in an official account service.', 'एक ऐसे डेबिट से शुरू करें जो आपको स्वतंत्र रूप से आधिकारिक खाता सेवा में मिला हो।')}</p></div></div>
            <div className={styles.formGrid}>
            <SelectField id="concern" label={t(language, 'What is the closest recorded-transaction concern?', 'सबसे नज़दीकी दर्ज लेन-देन समस्या क्या है?')} value={answers.concern} onChange={(value) => changeConcern(value as TollConcern)} options={(Object.keys({ unrecognised: 1, duplicate: 1, 'paid-another-way': 1, 'fare-or-class': 1, 'pass-or-discount': 1, 'record-check': 1, 'not-sure': 1 }) as TollConcern[]).map((value) => [value, concernLabel(value, language)])} help={t(language, 'Changing concern clears fields that belong only to the previous branch. For a tag-not-working or plaza/road incident without a recorded debit, use Safety & official routes instead.', 'समस्या बदलने पर पिछली शाखा के फ़ील्ड साफ़ होते हैं। दर्ज डेबिट के बिना टैग न चलने या प्लाज़ा/सड़क घटना के लिए सुरक्षा और आधिकारिक रास्ते उपयोग करें।')} />
            <SelectField id="issuer" label={t(language, 'Official FASTag record source you independently opened', 'स्वतंत्र रूप से खोला आधिकारिक FASTag रिकॉर्ड स्रोत')} value={refs.issuerLabel} onChange={(value) => setRefs({ ...refs, issuerLabel: value })} options={[["", t(language, 'Choose one', 'एक चुनें')], ...(mode === 'synthetic' ? [['Demo Bank', 'Demo Bank (fictional)'] as [string, string]] : []), ['Bank / issuer app', t(language, 'Bank or issuer app/site', 'बैंक या जारीकर्ता ऐप/साइट')], ['Issuer statement', t(language, 'Issuer statement', 'जारीकर्ता स्टेटमेंट')], ['IHMCL portal — NHAI FASTag only', t(language, 'Verified IHMCL portal — NHAI FASTag only', 'सत्यापित IHMCL पोर्टल — केवल NHAI FASTag')], ['Not sure', t(language, 'Not sure', 'पता नहीं')]]} />
            {mode === 'real' && <div className={`${styles.field} ${styles.fieldWide}`}><label className={styles.check}><input type="checkbox" checked={sourceConfirmed} onChange={(event) => setSourceVerificationSignature(event.target.checked ? currentSourceVerificationSignature : '')} />{t(language, 'I independently found this debit in the official account service selected above—my bank/issuer service or, for an NHAI FASTag, the IHMCL portal—not only in a message. Changing the source requires confirmation again.', 'मैंने यह डेबिट ऊपर चुनी आधिकारिक खाता सेवा—बैंक/जारीकर्ता सेवा या NHAI FASTag के लिए IHMCL पोर्टल—में स्वतंत्र रूप से पाया, केवल संदेश में नहीं। स्रोत बदलने पर फिर पुष्टि करनी होगी।')}</label></div>}
            </div>
          </section>

          <section className={styles.recordSection} aria-labelledby="record-event-title">
            <div className={styles.recordSectionHeading}><span>2</span><div><h3 id="record-event-title">{t(language, 'Masked identifiers and event', 'मास्क पहचान और घटना')}</h3><p>{t(language, 'Use last-four identifiers only. Record one event time and say what that time means.', 'केवल अंतिम चार पहचान दर्ज करें। एक घटना समय और उसका अर्थ दर्ज करें।')}</p></div></div>
            <div className={styles.formGrid}>
            {([['tagSuffix', t(language, 'FASTag ending — last 4 only', 'FASTag अंतिम 4')], ['vehicleSuffix', t(language, 'Vehicle suffix shown in official tag mapping — last 4 only', 'आधिकारिक टैग मैपिंग का वाहन नंबर — अंतिम 4')], ['transactionSuffix', t(language, 'Transaction reference ending — last 4 only', 'लेन-देन रेफरेंस अंतिम 4')]] as const).map(([key, label]) => <div className={styles.field} key={key}><label htmlFor={key}>{label}</label><input id={key} value={refs[key]} maxLength={4} autoComplete="off" onChange={(event) => setRefs({ ...refs, [key]: sanitizeSuffix(event.target.value) })} placeholder="••••" /></div>)}
            <div className={styles.field}><label htmlFor="amount">{t(language, 'Debit amount in rupees (optional)', 'डेबिट राशि रुपये में (वैकल्पिक)')}</label><input id="amount" type="number" min="0" max="100000" step="0.01" value={refs.amount} onInput={(event) => setRefs({ ...refs, amount: event.currentTarget.value })} onChange={(event) => setRefs({ ...refs, amount: event.target.value })} /></div>
            {mode === 'real' && <div className={`${styles.field} ${styles.fieldWide}`}><label className={styles.check}><input type="checkbox" checked={tagMappingConfirmed} onChange={(event) => setTagMappingSignature(event.target.checked ? currentTagMappingSignature : '')} />{t(language, 'I found the vehicle suffix above in that official FASTag account’s tag-to-vehicle mapping—not only in my memory or RC. Editing the source, tag, or vehicle suffix requires confirmation again.', 'मैंने ऊपर का वाहन प्रत्यय उस आधिकारिक FASTag खाते की टैग-से-वाहन मैपिंग में पाया—केवल अपनी याद या RC में नहीं। स्रोत, टैग या वाहन प्रत्यय बदलने पर फिर पुष्टि करनी होगी।')}</label></div>}
            <div className={styles.field}><label htmlFor="plaza">{t(language, 'Plaza name or ID (no location history)', 'प्लाज़ा नाम या ID (लोकेशन इतिहास नहीं)')}</label><input id="plaza" value={refs.plaza} maxLength={60} autoComplete="off" onChange={(event) => setRefs({ ...refs, plaza: event.target.value.replace(/[\n\r\t]/g, ' ') })} /></div>
            <SelectField id="direction" label={t(language, 'Direction, if recorded', 'दिशा, यदि दर्ज हो')} value={direction} onChange={setDirection} options={[['unknown', t(language, 'Unknown', 'अज्ञात')], ['forward', t(language, 'Forward / outbound', 'आगे / बाहर')], ['reverse', t(language, 'Reverse / return', 'वापसी')]]} />
            <div className={styles.field}><label htmlFor="event-time">{t(language, 'One timestamp from the record', 'रिकॉर्ड से एक समय')}</label><input id="event-time" type="datetime-local" value={refs.eventDateTime} onInput={(event) => setRefs({ ...refs, eventDateTime: event.currentTarget.value })} onChange={(event) => setRefs({ ...refs, eventDateTime: event.target.value })} /></div>
            <SelectField id="timestamp-type" label={t(language, 'What does that timestamp mean?', 'उस समय का अर्थ क्या है?')} value={answers.timestampType} onChange={(value) => setAnswers({ ...answers, timestampType: value as TollReviewAnswers['timestampType'] })} options={[['unknown', t(language, 'Unknown', 'अज्ञात')], ['reader-read', t(language, 'Reader-read / passage time', 'रीडर-रीड / पास होने का समय')], ['debit-posted', t(language, 'Debit-post time', 'डेबिट-पोस्ट समय')], ['sms-received', t(language, 'SMS-received time', 'SMS मिलने का समय')]]} help={t(language, 'An SMS time cannot be used as historical passage time.', 'SMS समय को ऐतिहासिक पास होने का समय नहीं माना जा सकता।')} />
            <SelectField id="plaza-scope" label={t(language, 'Plaza scope', 'प्लाज़ा का दायरा')} value={answers.plazaScope} onChange={(value) => setAnswers({ ...answers, plazaScope: value as TollReviewAnswers['plazaScope'] })} options={[['unknown', t(language, 'Unknown', 'अज्ञात')], ['national-highway', t(language, 'National Highway / NHAI tolled stretch', 'राष्ट्रीय राजमार्ग / NHAI टोल')], ['state-city-private', t(language, 'State, city, parking, or private plaza', 'राज्य, शहर, पार्किंग या निजी प्लाज़ा')]]} />
            </div>
          </section>

          <section className={styles.recordSection} aria-labelledby="record-passing-title">
            <div className={styles.recordSectionHeading}><span>3</span><div><h3 id="record-passing-title">{t(language, 'Passing evidence', 'पासिंग सबूत')}</h3><p>{t(language, 'Say whether an image was supplied before recording what the plate or class appears to show.', 'प्लेट या श्रेणी का अवलोकन दर्ज करने से पहले बताएँ कि तस्वीर दी गई थी या नहीं।')}</p></div></div>
          <div className={styles.observationGrid}>
            <div className={styles.observationCard}><label htmlFor="passing-image"><span>{t(language, 'YOUR RECORD CHECK', 'आपकी रिकॉर्ड जाँच')}</span>{t(language, 'Passing image', 'पासिंग तस्वीर')}</label><select id="passing-image" value={answers.passingImageStatus} onChange={(event) => changePassingImageStatus(event.target.value as TollRecordStatus)}>{recordOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className={styles.observationCard}><label htmlFor="passing-plate"><span>{t(language, 'YOUR OBSERVATION', 'आपका अवलोकन')}</span>{t(language, 'Passing-image plate', 'पासिंग तस्वीर प्लेट')}</label><select id="passing-plate" value={answers.passingPlateObservation} disabled={answers.passingImageStatus !== 'readable'} onChange={(event) => setAnswers({ ...answers, passingPlateObservation: event.target.value as TollReviewAnswers['passingPlateObservation'] })}><option value="match">{t(language, 'Suffix appears to match', 'प्रत्यय मेल खाता है')}</option><option value="different">{t(language, 'Suffix appears different', 'प्रत्यय अलग दिखता है')}</option><option value="unclear">{t(language, 'Unclear', 'अस्पष्ट')}</option><option value="not-supplied">{t(language, 'Not supplied', 'नहीं दिया')}</option></select></div>
            <div className={styles.observationCard}><label htmlFor="class-observation"><span>{t(language, 'YOUR OBSERVATION', 'आपका अवलोकन')}</span>{t(language, 'Vehicle class', 'वाहन श्रेणी')}</label><select id="class-observation" value={answers.vehicleClassObservation} disabled={answers.passingImageStatus !== 'readable'} onChange={(event) => setAnswers({ ...answers, vehicleClassObservation: event.target.value as TollReviewAnswers['vehicleClassObservation'] })}><option value="match">{t(language, 'Appears to match', 'मेल खाता है')}</option><option value="different">{t(language, 'Appears different', 'अलग दिखता है')}</option><option value="unclear">{t(language, 'Unclear', 'अस्पष्ट')}</option><option value="not-supplied">{t(language, 'Not supplied', 'नहीं दिया')}</option></select></div>
          </div>
          </section>

          <section className={styles.recordSection} aria-labelledby="record-concern-title">
          <div className={styles.recordSectionHeading}><span>4</span><div><h3 id="record-concern-title">{t(language, 'Evidence for this concern', 'इस समस्या के सबूत')}</h3><p>{t(language, 'Only the fields relevant to your selected concern appear here.', 'यहाँ केवल चुनी हुई समस्या से जुड़े फ़ील्ड दिखते हैं।')}</p></div></div>
          {answers.concern === 'duplicate' && <div className={styles.acknowledgements}>
            <label className={styles.check}><input type="checkbox" checked={answers.secondDebitPresent} onChange={(event) => setAnswers({ ...answers, secondDebitPresent: event.target.checked })} />{t(language, 'I found two debit entries.', 'मुझे दो डेबिट प्रविष्टियाँ मिलीं।')}</label>
            <label className={styles.check}><input type="checkbox" checked={answers.samePlaza} onChange={(event) => setAnswers({ ...answers, samePlaza: event.target.checked })} />{t(language, 'Both entries record the same plaza.', 'दोनों प्रविष्टियों में वही प्लाज़ा है।')}</label>
            <label className={styles.check}><input type="checkbox" checked={answers.closeInTime} onChange={(event) => setAnswers({ ...answers, closeInTime: event.target.checked })} />{t(language, 'I believe these entries relate to one expected crossing and want the issuer to apply the current duplicate-validation rule. TollSakshi does not decide that rule.', 'मेरा मानना है कि ये प्रविष्टियाँ एक अपेक्षित क्रॉसिंग से जुड़ी हैं और मैं चाहता/चाहती हूँ कि जारीकर्ता वर्तमान डुप्लिकेट-जाँच नियम लागू करे। TollSakshi वह नियम तय नहीं करता।')}</label>
            <div className={styles.formGrid}>
              <div className={styles.field}><label htmlFor="second-event-time">{t(language, 'Second reader-read timestamp', 'दूसरा रीडर-रीड समय')}</label><input id="second-event-time" type="datetime-local" value={refs.secondEventDateTime} onInput={(event) => setRefs({ ...refs, secondEventDateTime: event.currentTarget.value })} onChange={(event) => setRefs({ ...refs, secondEventDateTime: event.target.value })} /><small>{t(language, 'Both timestamps must actually be reader-read times—not SMS times.', 'दोनों समय वास्तव में रीडर-रीड हों—SMS समय नहीं।')}</small></div>
              <SelectField id="credit" label={t(language, 'Credit / reversal check', 'क्रेडिट / रिवर्सल जाँच')} value={answers.creditAdjustment} onChange={(value) => setAnswers({ ...answers, creditAdjustment: value as TollReviewAnswers['creditAdjustment'] })} options={[['not-checked', t(language, 'I have not checked a sufficient statement period', 'मैंने पर्याप्त स्टेटमेंट अवधि नहीं जाँची')], ['not-visible-in-checked-period', t(language, 'No credit visible in the period I checked', 'जाँची अवधि में क्रेडिट नहीं दिखा')], ['visible', t(language, 'A corresponding credit is visible', 'संबंधित क्रेडिट दिख रहा है')]]} />
            </div>
          </div>}
          {answers.concern === 'paid-another-way' && <div className={styles.acknowledgements}><div className={styles.formGrid}><SelectField id="receipt" label={t(language, 'Alternate-payment plaza receipt', 'अन्य भुगतान की प्लाज़ा रसीद')} value={answers.alternateReceipt} onChange={(value) => setAnswers({ ...answers, alternateReceipt: value as TollRecordStatus })} options={recordOptions} help={t(language, 'A bank withdrawal or recollection is not a plaza receipt.', 'बैंक निकासी या याद भर प्लाज़ा रसीद नहीं है।')} /></div><label className={styles.check}><input type="checkbox" checked={receiptMatchConfirmed} onChange={(event) => setReceiptMatchSignature(event.target.checked ? currentReceiptMatchSignature : '')} />{t(language, 'I compared the receipt with the entered toll record: plaza, date/time, direction, and amount all refer to the same event. Editing any compared field requires confirmation again.', 'मैंने रसीद को दर्ज टोल रिकॉर्ड से मिलाया: प्लाज़ा, तारीख/समय, दिशा और राशि सभी उसी घटना से जुड़े हैं। तुलना का कोई फ़ील्ड बदलने पर फिर पुष्टि करनी होगी।')}</label></div>}
          {(answers.concern === 'fare-or-class' || answers.concern === 'pass-or-discount') && <div className={styles.acknowledgements}><div className={styles.formGrid}><SelectField id="tariff" label={t(language, 'Date-effective official tariff / pass record', 'तारीख पर लागू आधिकारिक टैरिफ / पास रिकॉर्ड')} value={answers.tariffOrPassRecord} onChange={(value) => setAnswers({ ...answers, tariffOrPassRecord: value as TollRecordStatus })} options={recordOptions} /></div><label className={styles.check}><input type="checkbox" checked={tariffConflictConfirmed} onChange={(event) => setTariffConflictSignature(event.target.checked ? currentTariffConflictSignature : '')} />{t(language, 'I checked that this official record applies to the entered plaza, event date/time, direction, class/pass, and amount—and it conflicts with the debit. Any edit requires confirmation again.', 'मैंने जाँचा कि यह आधिकारिक रिकॉर्ड दर्ज प्लाज़ा, तारीख/समय, दिशा, श्रेणी/पास और राशि पर लागू है—और डेबिट से टकराता है। कोई बदलाव होने पर फिर पुष्टि करनी होगी।')}</label></div>}
          {answers.concern === 'tag-lifecycle' && <div className={styles.formGrid} style={{ marginTop: 22 }}><SelectField id="ack" label={t(language, 'Issuer acknowledgement', 'जारीकर्ता स्वीकृति')} value={answers.acknowledgement} onChange={(value) => setAnswers({ ...answers, acknowledgement: value as TollRecordStatus })} options={recordOptions} /></div>}
          {!['duplicate', 'paid-another-way', 'fare-or-class', 'pass-or-discount', 'tag-lifecycle'].includes(answers.concern) && <p className={styles.recordSectionNote}>{t(language, 'No extra branch-specific document is required for this selection. Continue to the final confirmation.', 'इस चयन के लिए कोई अतिरिक्त शाखा-विशेष दस्तावेज़ आवश्यक नहीं है। अंतिम पुष्टि पर जाएँ।')}</p>}
          </section>

          <section className={styles.recordSection} aria-labelledby="record-confirm-title">
          <div className={styles.recordSectionHeading}><span>5</span><div><h3 id="record-confirm-title">{t(language, 'Final same-transaction confirmation', 'उसी लेन-देन की अंतिम पुष्टि')}</h3><p>{t(language, 'Confirm only after your last edit. Any changed fact automatically makes the confirmation stale.', 'अंतिम बदलाव के बाद ही पुष्टि करें। कोई तथ्य बदलने पर पुष्टि स्वतः पुरानी हो जाती है।')}</p></div></div>
          {mode === 'real'
            ? <div className={styles.acknowledgements}><label className={styles.check}><input type="checkbox" checked={reconciliationConfirmed} onChange={(event) => setReconciliationSignature(event.target.checked ? currentReconciliationSignature : '')} />{t(language, 'I reviewed these final entries against the same official transaction. The source, identifiers, event, passing-image observations, and any comparison above belong to that one record. Any later edit requires confirmation again.', 'मैंने इन अंतिम प्रविष्टियों को उसी आधिकारिक लेन-देन से मिलाया। स्रोत, पहचान, घटना, पासिंग-तस्वीर अवलोकन और ऊपर की तुलना उसी रिकॉर्ड से जुड़ी हैं। बाद का कोई भी बदलाव फिर पुष्टि माँगेगा।')}</label></div>
            : <p className={styles.recordSectionNote}>{t(language, 'The fictional fixture already contains this confirmation so the walkthrough can demonstrate the resulting map.', 'काल्पनिक उदाहरण में यह पुष्टि पहले से है ताकि walkthrough परिणाम का नक्शा दिखा सके।')}</p>}
          </section>
          </div>
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
          <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setStep('start')}>← {t(language, 'Back', 'पीछे')}</button><button type="button" className={styles.button} onClick={continueRecords}>{t(language, 'Check what agrees and conflicts', 'देखें क्या मेल खाता या टकराता है')} →</button></div>
        </section>}

        {step === 'reconcile' && <section className={styles.panel} aria-labelledby="reconcile-title">
          <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>{t(language, 'Transaction-to-Journey Map', 'लेन-देन से यात्रा नक्शा')}</p><h2 id="reconcile-title">{t(language, 'Where the supplied entries agree, conflict, or stop', 'दी गई प्रविष्टियाँ कहाँ मेल, अंतर या रुकती हैं')}</h2><p>{t(language, 'A map of questions—not a bank or toll decision.', 'प्रश्नों का नक्शा—बैंक या टोल का निर्णय नहीं।')}</p></div></div>
          <div className={styles.resultHero} data-tone={assessment.finding === 'records-align' || assessment.finding === 'already-corrected' ? 'good' : assessment.finding === 'insufficient' ? 'stop' : 'warn'}><span className={styles.resultIcon} aria-hidden="true">{assessment.finding === 'records-align' || assessment.finding === 'already-corrected' ? '✓' : assessment.finding === 'insufficient' ? 'i' : '!'}</span><div><h2>{assessment.title}</h2><p>{assessment.reasons.join(' ')}</p><p><strong>{t(language, 'Based only on your answers.', 'केवल आपके उत्तरों पर आधारित।')}</strong> {t(language, 'The issuer and plaza records were not authenticated here.', 'जारीकर्ता और प्लाज़ा रिकॉर्ड यहाँ प्रमाणित नहीं हुए।')}</p></div></div>
          <div className={styles.journeyMap} role="table" aria-label={t(language, 'Transaction to Journey Map', 'लेन-देन से यात्रा नक्शा')}><header role="row"><span>{t(language, 'Question', 'प्रश्न')}</span><span>{t(language, 'Your entered record', 'आपका दर्ज रिकॉर्ड')}</span><span>{t(language, 'Map status', 'नक्शा स्थिति')}</span></header>{mapRows.map((row) => <div className={styles.journeyRow} role="row" key={row.label}><strong>{row.label}</strong><span>{row.record}</span><span className={styles.mapStatus}>{row.status}</span></div>)}</div>
          <div className={styles.listPanel}><h3>{t(language, 'What this does not conclude', 'यह क्या निष्कर्ष नहीं देता')}</h3><ul>{assessment.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setStep('records')}>← {t(language, 'Edit records', 'रिकॉर्ड बदलें')}</button><button type="button" className={styles.button} onClick={() => setStep('packet')}>{t(language, 'Check evidence and official route', 'सबूत और आधिकारिक रास्ता देखें')} →</button></div>
        </section>}

        {step === 'packet' && <section className={styles.panel} aria-labelledby="packet-title">
          <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>{t(language, 'Toll Evidence Passport · TP1–TP14', 'टोल सबूत पासपोर्ट · TP1–TP14')}</p><h2 id="packet-title">{t(language, 'A complete map of what you checked—and what is still missing', 'आपने क्या जाँचा और अभी क्या गायब है, उसका पूरा नक्शा')}</h2><p>{t(language, '“Not supplied” means not found in the limited records you reviewed, not that the record does not exist.', '“नहीं दिया” का अर्थ केवल आपकी सीमित समीक्षा में नहीं मिला—यह नहीं कि रिकॉर्ड मौजूद नहीं है।')}</p></div></div>
          <div className={styles.resultMeta}><article><small>{t(language, 'Rule-based route', 'नियम-आधारित रास्ता')}</small><strong>{displayedRoute}</strong></article><article><small>{t(language, 'Official account note', 'आधिकारिक खाता नोट')}</small><strong>{assessment.shouldPrepareIssuerNote ? t(language, 'Available', 'उपलब्ध') : t(language, 'Withheld', 'रोका गया')}</strong></article><article><small>{t(language, 'Decision maker', 'निर्णयकर्ता')}</small><strong>{t(language, 'Official account provider / responsible authority', 'आधिकारिक खाता प्रदाता / जिम्मेदार प्राधिकरण')}</strong></article></div>
          <div className={styles.passport}>{passport.map((item) => <article key={item.id}><b>{item.id}</b><div><strong>{item.label}</strong><small>{item.why}</small></div><em>{statusLabel(item.status, language)}</em></article>)}</div>
          {assessment.shouldPrepareIssuerNote && <><div className={styles.deadline}><strong>{t(language, 'Report an incorrect deduction promptly through the official channel for your FASTag', 'अपने FASTag के आधिकारिक रास्ते से गलत कटौती तुरंत रिपोर्ट करें')}</strong><p>{t(language, 'IHMCL’s FASTag FAQ currently says to report an incorrect deduction within 40 days of the transaction date and says the chargeback process normally takes up to 20–30 working days. Treat 40 days as source-labelled IHMCL reporting guidance, not a statutory limitation period; treat 20–30 working days as a normal processing estimate, not a refund or resolution guarantee. Contact the appropriate official channel promptly and verify its current process.', 'IHMCL की FASTag FAQ वर्तमान में लेन-देन की तारीख से 40 दिनों के भीतर गलत कटौती रिपोर्ट करने और चार्जबैक प्रक्रिया में सामान्यतः 20–30 कार्यदिवस तक लगने की बात कहती है। 40 दिन IHMCL की स्रोत-लेबल मार्गदर्शिका है, कानूनी सीमा नहीं; 20–30 कार्यदिवस सामान्य प्रक्रिया अनुमान है, रिफंड या समाधान की गारंटी नहीं। उचित आधिकारिक रास्ते से तुरंत संपर्क करें और वर्तमान प्रक्रिया जाँचें।')}</p></div><div className={styles.listPanel}><h3>{t(language, 'Keep a manual follow-up ledger', 'मैन्युअल फॉलो-अप लेजर रखें')}</h3><ul><li>{t(language, 'Record the reported date and only the last four characters of the issuer acknowledgement.', 'रिपोर्ट की तारीख और जारीकर्ता स्वीकृति के केवल अंतिम चार अक्षर/अंक दर्ज रखें।')}</li><li>{t(language, 'Record which statement end date you checked before saying that no credit was visible.', '“क्रेडिट नहीं दिखा” कहने से पहले जाँची गई स्टेटमेंट अंतिम तारीख दर्ज रखें।')}</li><li>{t(language, 'If a response arrives, check whether it supplies a passing image, readable plate, reader timestamp, plaza/direction, fare basis, and any credit adjustment.', 'उत्तर आए तो जाँचें कि उसमें पासिंग तस्वीर, पढ़ने योग्य प्लेट, रीडर समय, प्लाज़ा/दिशा, किराया आधार और क्रेडिट समायोजन है या नहीं।')}</li><li>{t(language, 'If an image or annexure is cited but absent, ask for that record instead of guessing what it contains.', 'तस्वीर या अनुलग्नक का उल्लेख हो लेकिन वह न मिले तो उसके लिए पूछें—उसकी सामग्री का अनुमान न लगाएँ।')}</li></ul></div></>}
          {assessment.shouldPrepareIssuerNote ? <div className={styles.artifact}><h3>{t(language, 'Local account-provider preparation note', 'स्थानीय खाता-प्रदाता तैयारी नोट')}</h3><p className={styles.artifactWarning}>{device === 'shared' ? t(language, 'The in-app copy/download controls are disabled; text may still be manually selected. The page attempts to leave after about 10 minutes of inactivity.', 'ऐप के कॉपी/डाउनलोड नियंत्रण बंद हैं; टेक्स्ट फिर भी मैन्युअली चुना जा सकता है। लगभग 10 मिनट निष्क्रिय रहने पर पेज बाहर निकलने का प्रयास करता है।') : t(language, 'Copy/download may leave information outside this tab. TollSakshi cannot erase those copies.', 'कॉपी/डाउनलोड से जानकारी इस टैब के बाहर रह सकती है। TollSakshi उन कॉपी को मिटा नहीं सकता।')}</p><pre>{worksheet}</pre></div> : <div className={styles.stopCard}><h3>{t(language, 'No issuer dispute note prepared', 'कोई जारीकर्ता विवाद नोट तैयार नहीं किया गया')}</h3><p>{t(language, 'This outcome does not support a transaction dispute note. Follow the route shown above or correct the records; TollSakshi will not label a transaction incorrect without an evidence-supported route.', 'यह नतीजा लेन-देन विवाद नोट का समर्थन नहीं करता। ऊपर दिखा रास्ता अपनाएँ या रिकॉर्ड सुधारें; TollSakshi सबूत-समर्थित रास्ते के बिना लेन-देन को गलत नहीं बताएगा।')}</p></div>}
          <div className={styles.sourceGrid}>
            {(assessment.route === 'issuer' || assessment.route === 'issuer-and-1033' || assessment.route === 'verify-records') && (isNhaiFastagSource ? <a href="https://fastag.ihmcl.com" target="_blank" rel="noreferrer"><strong>{t(language, 'Verified IHMCL customer portal — NHAI FASTag ↗', 'सत्यापित IHMCL ग्राहक पोर्टल — NHAI FASTag ↗')}</strong><small>{t(language, 'Use only for a bank-neutral NHAI FASTag or NHAI Prepaid Wallet. Open it independently.', 'केवल बैंक-न्यूट्रल NHAI FASTag या NHAI Prepaid Wallet के लिए। इसे स्वतंत्र रूप से खोलें।')}</small></a> : <a href="https://www.npci.org.in/product/netc/netc-fastag-helpline" target="_blank" rel="noreferrer"><strong>{t(language, assessment.shouldPrepareIssuerNote ? 'Find the current issuer route ↗' : 'Find the official FASTag account route ↗', assessment.shouldPrepareIssuerNote ? 'वर्तमान जारीकर्ता रास्ता खोजें ↗' : 'आधिकारिक FASTag खाता रास्ता खोजें ↗')}</strong><small>{t(language, 'NPCI issuer directory. Do not use a number copied from the debit message.', 'NPCI जारीकर्ता निर्देशिका। डेबिट संदेश से कॉपी नंबर उपयोग न करें।')}</small></a>)}
            {(assessment.route === '1033' || assessment.route === 'issuer-and-1033' || (isNhaiFastagSource && assessment.route === 'issuer')) && <a href="https://ihmcl.co.in/24x7-national-highways-helpline-1033/" target="_blank" rel="noreferrer"><strong>{t(language, '1033 scope for National Highways ↗', 'राष्ट्रीय राजमार्ग के लिए 1033 दायरा ↗')}</strong><small>{t(language, 'For NHAI FASTag support or plaza/road issues on NHAI tolled stretches—not every state, city, parking, or private toll.', 'NHAI टोल मार्गों पर NHAI FASTag सहायता या प्लाज़ा/सड़क समस्याओं के लिए—हर राज्य, शहर, पार्किंग या निजी टोल के लिए नहीं।')}</small></a>}
            {(assessment.route === 'issuer' || assessment.route === 'issuer-and-1033') && <a href="https://www.npci.org.in/circulars/netc" target="_blank" rel="noreferrer"><strong>{t(language, 'Current NETC circular registry ↗', 'वर्तमान NETC सर्कुलर सूची ↗')}</strong><small>{t(language, 'Current ruleset index; TollSakshi applies no definitive duplicate time threshold.', 'वर्तमान नियम सूची; TollSakshi निश्चित डुप्लिकेट समय सीमा लागू नहीं करता।')}</small></a>}
            <a href="/safety"><strong>{t(language, 'Scam and escalation safety', 'स्कैम और एस्केलेशन सुरक्षा')}</strong><small>{t(language, '1930/cybercrime route for actual financial scams; RBI eligibility limits.', 'असली वित्तीय स्कैम के लिए 1930/cybercrime रास्ता; RBI पात्रता सीमाएँ।')}</small></a>
          </div>
          {artifactStatus && <p className={styles.inlineError} role="status">{artifactStatus}</p>}
          <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setStep('reconcile')}>← {t(language, 'Back to map', 'नक्शे पर वापस')}</button>{assessment.shouldPrepareIssuerNote && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}><button type="button" className={styles.buttonSecondary} disabled={device === 'shared'} onClick={copyWorksheet}>{t(language, 'Copy note', 'नोट कॉपी करें')}</button><button type="button" className={styles.button} disabled={device === 'shared'} onClick={downloadWorksheet}>{t(language, 'Download .txt', '.txt डाउनलोड करें')}</button></div>}</div>
        </section>}
      </main>
    </PublicBetaShell>
  );
}
