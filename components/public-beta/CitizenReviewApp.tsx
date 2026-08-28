'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- a full same-origin navigation intentionally clears memory-only real-case state. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { GuidedStepHeader } from '../guided/GuidedStepHeader';
import type { Language } from '../../lib/domain';
import { buildChallanGuidedProgress, getChallanGuideContent } from '../../lib/guided-journey';
import {
  assessCitizenChallanReview,
  buildCitizenChallanWorksheet,
  calculateEnteredOfficialDeadline,
  type CitizenChallanAnswers,
  type CitizenReviewFinding,
  type Observation,
  type OffenceObservation,
  type RecordAvailability,
} from '../../lib/public-challan';
import { PublicBetaShell, SafetyBoundary, publicBetaStyles as styles } from './PublicBetaShell';

type Step = 'safety' | 'source' | 'observations' | 'result';
type Role = 'self' | 'helper';
type Device = 'private' | 'shared';

const defaultAnswers: CitizenChallanAnswers = {
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

function indiaDateNow(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function SelectField({ id, label, value, onChange, options, help }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  help?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
      </select>
      {help && <small>{help}</small>}
    </div>
  );
}

function findingCopy(finding: CitizenReviewFinding, language: Language): { title: string; body: string; tone: 'warn' | 'good' | 'stop' } {
  const values: Record<CitizenReviewFinding, { en: string; hi: string; bodyEn: string; bodyHi: string; tone: 'warn' | 'good' | 'stop' }> = {
    'source-not-verified': { en: 'Verify the notice source first', hi: 'पहले नोटिस के स्रोत की पुष्टि करें', bodyEn: 'A message or forwarded link is not enough to begin an evidence comparison.', bodyHi: 'सिर्फ संदेश या भेजा हुआ लिंक सबूत की तुलना शुरू करने के लिए पर्याप्त नहीं है।', tone: 'stop' },
    'citizen-recorded-inconsistency': { en: 'Citizen-recorded material inconsistency', hi: 'नागरिक द्वारा दर्ज महत्वपूर्ण असंगति', bodyEn: 'Your structured observations contain a readable plate or vehicle-category conflict. Official verification is still required.', bodyHi: 'आपके दर्ज अवलोकनों में पढ़ने योग्य नंबर प्लेट या वाहन श्रेणी का अंतर है। आधिकारिक जाँच अभी भी आवश्यक है।', tone: 'warn' },
    'supplied-image-unclear': { en: 'Supplied image remains unclear', hi: 'दी गई तस्वीर अभी भी अस्पष्ट है', bodyEn: 'Your answers contain an unreadable, missing, or not-assessable evidence field. Ask for clearer evidence instead of guessing.', bodyHi: 'आपके उत्तरों में अपठनीय, गायब या एक तस्वीर से न जाँची जा सकने वाली जानकारी है। अनुमान लगाने के बजाय साफ़ सबूत माँगें।', tone: 'warn' },
    'entries-do-not-support-mismatch': { en: 'Your entries do not support a vehicle mismatch', hi: 'आपकी प्रविष्टियाँ वाहन बेमेल का समर्थन नहीं करतीं', bodyEn: 'The plate and category observations align. ChallanSakshi will not manufacture a vehicle-mismatch request.', bodyHi: 'नंबर प्लेट और श्रेणी के अवलोकन मेल खाते हैं। ChallanSakshi वाहन बेमेल की शिकायत नहीं गढ़ेगा।', tone: 'good' },
    'insufficient-review': { en: 'Not enough information to review', hi: 'समीक्षा के लिए पर्याप्त जानकारी नहीं', bodyEn: 'Inspect the official evidence first, then record only what you can actually see.', bodyHi: 'पहले आधिकारिक सबूत देखें, फिर केवल वही दर्ज करें जो आप वास्तव में देख सकते हैं।', tone: 'stop' },
  };
  const item = values[finding];
  return { title: language === 'hi' ? item.hi : item.en, body: language === 'hi' ? item.bodyHi : item.bodyEn, tone: item.tone };
}

export default function CitizenReviewApp() {
  const [language, setLanguage] = useState<Language>('en');
  const [step, setStep] = useState<Step>('safety');
  const [role, setRole] = useState<Role | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [consent, setConsent] = useState({ manual: false, minimum: false, citizenConfirmed: false });
  const [helperConfirmationSignature, setHelperConfirmationSignature] = useState('');
  const [answers, setAnswers] = useState<CitizenChallanAnswers>(defaultAnswers);
  const [jurisdiction, setJurisdiction] = useState('');
  const [vehicleSuffix, setVehicleSuffix] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [officialDeadline, setOfficialDeadline] = useState('');
  const [referenceDate, setReferenceDate] = useState(indiaDateNow);
  const [offence, setOffence] = useState('');
  const [error, setError] = useState('');
  const [artifactStatus, setArtifactStatus] = useState('');
  const guideHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef<Step>(step);

  const currentReviewSignature = useMemo(() => JSON.stringify({ answers, jurisdiction, vehicleSuffix, eventDate, officialDeadline, offence }), [answers, jurisdiction, vehicleSuffix, eventDate, officialDeadline, offence]);
  const helperFinalConfirmed = helperConfirmationSignature !== '' && helperConfirmationSignature === currentReviewSignature;

  const assessment = useMemo(() => assessCitizenChallanReview(answers), [answers]);
  const deadline = useMemo(() => {
    try { return calculateEnteredOfficialDeadline(officialDeadline, referenceDate); }
    catch { return null; }
  }, [officialDeadline, referenceDate]);
  const resultCopy = findingCopy(assessment.finding, language);
  const worksheet = useMemo(() => buildCitizenChallanWorksheet({
    stateLabel: jurisdiction,
    vehicleSuffix,
    allegedOffence: offence,
    eventDate,
    officialDeadline,
    assessment,
    answers,
  }), [jurisdiction, vehicleSuffix, offence, eventDate, officialDeadline, assessment, answers]);
  const safetyReady = Boolean(role && device && consent.manual && consent.minimum && (role !== 'helper' || consent.citizenConfirmed));
  const observationsReady = (role !== 'helper' || helperFinalConfirmed)
    && (vehicleSuffix.length === 0 || vehicleSuffix.length === 4)
    && (!officialDeadline || Boolean(deadline));
  const guide = getChallanGuideContent({
    step,
    safetyReady,
    sourceStatus: answers.sourceStatus,
    jurisdictionSelected: Boolean(jurisdiction && jurisdiction !== 'Not sure' && jurisdiction !== 'Virtual Court / court notice'),
    observationsReady,
    worksheetAvailable: assessment.canPrepareWorksheet,
    exportAllowed: device !== 'shared',
  });
  const guideProgress = buildChallanGuidedProgress(step, answers.sourceStatus);

  const reset = () => {
    setStep('safety');
    setRole(null);
    setDevice(null);
    setConsent({ manual: false, minimum: false, citizenConfirmed: false });
    setHelperConfirmationSignature('');
    setAnswers(defaultAnswers);
    setJurisdiction('');
    setVehicleSuffix('');
    setEventDate('');
    setOfficialDeadline('');
    setOffence('');
    setError('');
    setArtifactStatus('');
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
    const refreshReferenceDate = () => setReferenceDate(indiaDateNow());
    const interval = window.setInterval(refreshReferenceDate, 60_000);
    window.addEventListener('focus', refreshReferenceDate);
    window.addEventListener('pageshow', refreshReferenceDate);
    document.addEventListener('visibilitychange', refreshReferenceDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshReferenceDate);
      window.removeEventListener('pageshow', refreshReferenceDate);
      document.removeEventListener('visibilitychange', refreshReferenceDate);
    };
  }, []);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    guideHeadingRef.current?.focus();
  }, [step]);

  const quickExit = () => {
    reset();
    window.location.replace('/');
  };

  const continueSafety = () => {
    if (!role || !device || !consent.manual || !consent.minimum || (role === 'helper' && !consent.citizenConfirmed)) {
      setError(t(language, 'Choose who is using the tool and the device type, then confirm each required safety statement.', 'टूल उपयोगकर्ता और डिवाइस प्रकार चुनें, फिर हर ज़रूरी सुरक्षा कथन की पुष्टि करें।'));
      return;
    }
    setError('');
    setStep('source');
  };

  const continueSource = () => {
    setError('');
    if (answers.sourceStatus === 'not-selected') {
      setError(t(language, 'Choose how you independently obtained the record.', 'चुनें कि आपने रिकॉर्ड स्वतंत्र रूप से कैसे प्राप्त किया।'));
      return;
    }
    if (jurisdiction === 'Virtual Court / court notice') {
      setError(t(language, answers.sourceStatus === 'message-only' ? 'Do not use the message link. This tool does not cover Virtual Court or court notices: independently locate the exact official court record and qualified assistance; do not use the generic e-Challan route.' : 'This manual e-Challan worksheet does not cover Virtual Court or court notices. Use the exact official court record and qualified assistance; do not continue through the generic challan route.', answers.sourceStatus === 'message-only' ? 'संदेश का लिंक उपयोग न करें। यह टूल वर्चुअल कोर्ट या अदालत नोटिस के लिए नहीं है: सही आधिकारिक अदालत रिकॉर्ड स्वतंत्र रूप से खोजें और योग्य सहायता लें; सामान्य ई-चालान रास्ता उपयोग न करें।' : 'यह मैन्युअल ई-चालान वर्कशीट वर्चुअल कोर्ट या अदालत नोटिस के लिए नहीं है। सही आधिकारिक अदालत रिकॉर्ड और योग्य सहायता उपयोग करें; सामान्य चालान रास्ते से आगे न बढ़ें।'));
      return;
    }
    if (answers.sourceStatus === 'message-only') {
      setStep('result');
      return;
    }
    if (!jurisdiction) {
      setError(t(language, 'Choose the jurisdiction shown by the official record, or select “Not sure”.', 'आधिकारिक रिकॉर्ड में दिखा क्षेत्र चुनें, या “पता नहीं” चुनें।'));
      return;
    }
    if (jurisdiction === 'Not sure') {
      setError(t(language, 'Identify the responsible official service before entering evidence. Use the Safety & official routes page if needed.', 'सबूत दर्ज करने से पहले जिम्मेदार आधिकारिक सेवा पहचानें। आवश्यकता हो तो सुरक्षा और आधिकारिक रास्ते पेज का उपयोग करें।'));
      return;
    }
    setStep('observations');
  };

  const continueObservations = () => {
    if (role === 'helper' && !helperFinalConfirmed) {
      setError(t(language, 'The citizen must confirm the final recorded observations before a worksheet is prepared.', 'वर्कशीट बनने से पहले नागरिक को अंतिम दर्ज अवलोकनों की पुष्टि करनी होगी।'));
      return;
    }
    if (vehicleSuffix.length > 0 && vehicleSuffix.length !== 4) {
      setError(t(language, 'Enter exactly the last four registration characters, or leave the field blank.', 'वाहन नंबर के ठीक अंतिम चार अक्षर/अंक दर्ज करें, या फ़ील्ड खाली छोड़ें।'));
      return;
    }
    if (officialDeadline && !deadline) {
      setError(t(language, 'The copied official deadline is not a valid date.', 'कॉपी की गई आधिकारिक अंतिम तारीख मान्य नहीं है।'));
      return;
    }
    setError('');
    setStep('result');
  };

  const copyWorksheet = async () => {
    if (device === 'shared' || !assessment.canPrepareWorksheet) return;
    try {
      await navigator.clipboard.writeText(worksheet);
      setArtifactStatus(t(language, 'Worksheet copied. Remember: the clipboard may retain it.', 'वर्कशीट कॉपी हो गई। याद रखें: क्लिपबोर्ड इसे रख सकता है।'));
    } catch {
      setArtifactStatus(t(language, 'Copy was blocked by the browser. Select the text manually if this is a private device.', 'ब्राउज़र ने कॉपी रोक दी। निजी डिवाइस हो तो टेक्स्ट मैन्युअली चुनें।'));
    }
  };

  const downloadWorksheet = () => {
    if (device === 'shared' || !assessment.canPrepareWorksheet) return;
    const blob = new Blob([worksheet], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'challansakshi-local-worksheet.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    setArtifactStatus(t(language, 'Downloaded locally. ChallanSakshi cannot erase the Downloads copy.', 'स्थानीय रूप से डाउनलोड हुआ। ChallanSakshi डाउनलोड की कॉपी मिटा नहीं सकता।'));
  };

  const observationOptions: Array<[Observation, string]> = [
    ['match', t(language, 'Appears to match', 'मेल खाता दिखता है')],
    ['different', t(language, 'Appears materially different', 'महत्वपूर्ण रूप से अलग दिखता है')],
    ['unclear', t(language, 'Cannot determine', 'तय नहीं कर सकता/सकती')],
    ['not-visible', t(language, 'Not visible', 'दिखाई नहीं देता')],
  ];
  const recordOptions: Array<[RecordAvailability, string]> = [
    ['present', t(language, 'Available and readable', 'उपलब्ध और पढ़ने योग्य')],
    ['unclear', t(language, 'Available but unclear', 'उपलब्ध लेकिन अस्पष्ट')],
    ['missing', t(language, 'Not located', 'नहीं मिला')],
    ['not-applicable', t(language, 'Not applicable', 'लागू नहीं')],
  ];

  return (
    <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="चालान साक्षी" onQuickExit={quickExit} englishOnly>
      <main className={styles.main}>
        <GuidedStepHeader
          {...guide}
          steps={guideProgress}
          progressLabel={t(language, 'e-Challan review progress', 'ई-चालान समीक्षा प्रगति')}
          headingRef={guideHeadingRef}
          headingId="challan-guided-step-title"
          labels={{
            doNow: t(language, 'Do this now', 'अभी यह करें'),
            why: t(language, 'Why this matters', 'यह क्यों ज़रूरी है'),
            status: t(language, 'Status', 'स्थिति'),
            next: t(language, 'Next', 'आगे'),
            allSteps: t(language, 'See all steps', 'सभी चरण देखें'),
          }}
        />

        <section className={`${styles.hero} ${styles.heroCompact}`}>
          <div>
            <p className={styles.eyebrow}>{t(language, 'Local manual workspace', 'स्थानीय मैन्युअल कार्यक्षेत्र')}</p>
            <h1>{t(language, 'Inspect the official record. Record only ', 'आधिकारिक रिकॉर्ड देखें। केवल वही दर्ज करें जो ')}<em>{t(language, 'what you can see.', 'आप देख सकते हैं।')}</em></h1>
            <p className={styles.lede}>{t(language, 'A structured self-review for a real e-Challan—without uploading the notice, photograph, RC, or personal identity.', 'असली ई-चालान की संरचित स्वयं-समीक्षा—नोटिस, तस्वीर, RC या व्यक्तिगत पहचान अपलोड किए बिना।')}</p>
          </div>
          <div className={styles.heroCard}>
            <span>{t(language, 'REAL CASE · MANUAL ONLY', 'असली मामला · केवल मैन्युअल')}</span>
            <strong>{t(language, 'What this safe first release can do', 'यह सुरक्षित पहला संस्करण क्या कर सकता है')}</strong>
            <ul>
              <li>{t(language, 'Check whether your own observations contain a material conflict', 'जाँचें कि आपके अवलोकनों में महत्वपूर्ण अंतर है या नहीं')}</li>
              <li>{t(language, 'Track unclear or missing supplied evidence', 'अस्पष्ट या गायब दिए गए सबूत दर्ज करें')}</li>
              <li>{t(language, 'Prepare a masked, neutral worksheet for an official route', 'आधिकारिक रास्ते के लिए मास्क की गई निष्पक्ष वर्कशीट बनाएँ')}</li>
            </ul>
          </div>
        </section>

        <SafetyBoundary language={language} />

        {step === 'safety' && (
          <section className={styles.panel} aria-labelledby="safety-title">
            <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>{t(language, 'Before any case detail', 'किसी भी मामले की जानकारी से पहले')}</p><h2 id="safety-title">{t(language, 'Set the privacy boundary', 'गोपनीयता सीमा तय करें')}</h2><p>{t(language, 'Case answers are not persisted by this app. Reloading, closing, or quick-exiting clears them from page memory. The host still receives technical request logs; downloads, clipboard copies, screenshots, and browser history are outside that clear action.', 'मामले के उत्तर इस ऐप द्वारा स्थायी रूप से सेव नहीं होते। रीलोड, बंद करने या तुरंत बाहर निकलने पर वे पेज मेमोरी से साफ़ होते हैं। होस्ट को तकनीकी अनुरोध लॉग मिलते हैं; डाउनलोड, क्लिपबोर्ड, स्क्रीनशॉट और ब्राउज़र इतिहास इस सफ़ाई से बाहर हैं।')}</p></div></div>
            <div className={styles.choiceGrid}>
              <fieldset className={styles.choiceFieldset}>
                <legend className={styles.choiceLegend}>{t(language, 'A. Who is reviewing this case?', 'A. इस मामले की समीक्षा कौन कर रहा है?')}</legend>
                <div className={styles.choiceGroup}>
                  <button type="button" aria-pressed={role === 'self'} className={`${styles.choice} ${role === 'self' ? styles.choiceActive : ''}`} onClick={() => { setRole('self'); setHelperConfirmationSignature(''); }}><strong>{t(language, 'This is my case', 'यह मेरा मामला है')}</strong><small>{t(language, 'I will record only my own observations.', 'मैं केवल अपने अवलोकन दर्ज करूँगा/करूँगी।')}</small></button>
                  <button type="button" aria-pressed={role === 'helper'} className={`${styles.choice} ${role === 'helper' ? styles.choiceActive : ''}`} onClick={() => { setRole('helper'); setHelperConfirmationSignature(''); }}><strong>{t(language, 'I am helping someone who is present', 'मैं सामने मौजूद किसी व्यक्ति की मदद कर रहा/रही हूँ')}</strong><small>{t(language, 'They have agreed; I will not infer answers or collect their identity.', 'उन्होंने सहमति दी है; मैं उत्तर का अनुमान या उनकी पहचान दर्ज नहीं करूँगा/करूँगी।')}</small></button>
                </div>
              </fieldset>
              <fieldset className={styles.choiceFieldset}>
                <legend className={styles.choiceLegend}>{t(language, 'B. What kind of device is this?', 'B. यह किस तरह का डिवाइस है?')}</legend>
                <div className={styles.choiceGroup}>
                  <button type="button" aria-pressed={device === 'private'} className={`${styles.choice} ${device === 'private' ? styles.choiceActive : ''}`} onClick={() => setDevice('private')}><strong>{t(language, 'Private device', 'निजी डिवाइस')}</strong><small>{t(language, 'Copy and download can be enabled at the end.', 'अंत में कॉपी और डाउनलोड उपलब्ध होंगे।')}</small></button>
                  <button type="button" aria-pressed={device === 'shared'} className={`${styles.choice} ${device === 'shared' ? styles.choiceActive : ''}`} onClick={() => setDevice('shared')}><strong>{t(language, 'Shared or public device', 'साझा या सार्वजनिक डिवाइस')}</strong><small>{t(language, 'In-app copy/download controls stay disabled; the page attempts to leave after about 10 minutes of inactivity. Use Quick exit when done.', 'ऐप के कॉपी/डाउनलोड नियंत्रण बंद रहते हैं; लगभग 10 मिनट निष्क्रिय रहने पर पेज बाहर निकलने का प्रयास करता है। अंत में तुरंत बाहर निकलें।')}</small></button>
                </div>
              </fieldset>
            </div>
            <div className={styles.acknowledgements}>
              <label className={styles.check}><input type="checkbox" checked={consent.manual} onChange={(event) => setConsent({ ...consent, manual: event.target.checked })} />{t(language, 'I understand this is manual self-review, not document analysis, filing, payment, or legal advice.', 'मैं समझता/समझती हूँ कि यह मैन्युअल स्वयं-समीक्षा है, दस्तावेज़ विश्लेषण, फाइलिंग, भुगतान या कानूनी सलाह नहीं।')}</label>
              <label className={styles.check}><input type="checkbox" checked={consent.minimum} onChange={(event) => setConsent({ ...consent, minimum: event.target.checked })} />{t(language, 'I will enter only the minimum masked details requested.', 'मैं केवल माँगी गई न्यूनतम मास्क की जानकारी दर्ज करूँगा/करूँगी।')}</label>
              {role === 'helper' && <label className={styles.check}><input type="checkbox" checked={consent.citizenConfirmed} onChange={(event) => setConsent({ ...consent, citizenConfirmed: event.target.checked })} />{t(language, 'The citizen is present, has agreed, and will confirm the final observations.', 'नागरिक मौजूद है, सहमत है और अंतिम अवलोकनों की पुष्टि करेगा/करेगी।')}</label>}
            </div>
            <p className={styles.restricted}><strong>{t(language, 'Never enter or paste:', 'कभी दर्ज या पेस्ट न करें:')}</strong> {t(language, 'names, phone/address, Aadhaar, full registration or challan number, RC/DL images, chassis/engine number, bank/card details, OTP, password, UPI PIN, or an entire notice/order.', 'नाम, फ़ोन/पता, आधार, पूरा वाहन या चालान नंबर, RC/DL तस्वीर, चेसिस/इंजन नंबर, बैंक/कार्ड जानकारी, OTP, पासवर्ड, UPI PIN या पूरा नोटिस/आदेश।')}</p>
            {error && <p className={styles.inlineError} role="alert">{error}</p>}
            <div className={styles.actions}><a className={styles.buttonQuiet} href="/">{t(language, 'Use the synthetic demo instead', 'इसके बजाय सिंथेटिक डेमो इस्तेमाल करें')}</a><button type="button" className={styles.button} onClick={continueSafety}>{t(language, 'Continue safely', 'सुरक्षित रूप से आगे बढ़ें')} →</button></div>
          </section>
        )}

        {step === 'source' && (
          <section className={styles.panel} aria-labelledby="source-title">
            <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>{t(language, 'Source before facts', 'तथ्यों से पहले स्रोत')}</p><h2 id="source-title">{t(language, 'How did you independently obtain the record?', 'आपने रिकॉर्ड स्वतंत्र रूप से कैसे प्राप्त किया?')}</h2><p>{t(language, 'Do not trust a link, number, or payment route merely because it appears in a message.', 'किसी संदेश में लिंक, नंबर या भुगतान रास्ता होने मात्र से उस पर भरोसा न करें।')}</p></div></div>
            <div className={styles.choiceGrid}>
              {([
                ['official-service', t(language, 'I opened the official service myself', 'मैंने आधिकारिक सेवा खुद खोली'), t(language, 'The record/status is visible there.', 'रिकॉर्ड/स्थिति वहाँ दिखाई दे रही है।')],
                ['downloaded-official-record', t(language, 'I downloaded it from an official service', 'मैंने इसे आधिकारिक सेवा से डाउनलोड किया'), t(language, 'I can still identify the official source.', 'मैं अभी भी आधिकारिक स्रोत पहचान सकता/सकती हूँ।')],
                ['message-only', t(language, 'I only have a message or forwarded link', 'मेरे पास केवल संदेश या भेजा हुआ लिंक है'), t(language, 'Comparison stops until the source is independently verified.', 'स्वतंत्र पुष्टि तक तुलना रुक जाएगी।')],
              ] as const).map(([value, title, body]) => <button type="button" key={value} className={`${styles.choice} ${answers.sourceStatus === value ? styles.choiceActive : ''}`} onClick={() => setAnswers({ ...answers, sourceStatus: value })}><strong>{title}</strong><small>{body}</small></button>)}
            </div>
            <div className={styles.formGrid} style={{ marginTop: 22 }}>
              <SelectField id="jurisdiction" label={t(language, 'Jurisdiction shown on the official record', 'आधिकारिक रिकॉर्ड पर दिखा क्षेत्र')} value={jurisdiction} onChange={setJurisdiction} options={[
                ['', t(language, 'Choose one', 'एक चुनें')], ['Central e-Challan service', t(language, 'Central e-Challan service', 'केंद्रीय ई-चालान सेवा')], ['State or UT service', t(language, 'State or UT service', 'राज्य या केंद्रशासित सेवा')], ['Virtual Court / court notice', t(language, 'Virtual Court or court notice', 'वर्चुअल कोर्ट या अदालत नोटिस')], ['Not sure', t(language, 'Not sure', 'पता नहीं')],
              ]} help={t(language, 'This beta does not assume every state uses the same route.', 'यह बीटा नहीं मानता कि हर राज्य एक ही रास्ता उपयोग करता है।')} />
              <SelectField id="offence" label={t(language, 'Alleged offence category (optional)', 'आरोपित अपराध श्रेणी (वैकल्पिक)')} value={offence} onChange={setOffence} options={[
                ['', t(language, 'Not selected', 'नहीं चुना')], ['Helmet / seatbelt', t(language, 'Helmet or seatbelt', 'हेलमेट या सीटबेल्ट')], ['Signal / lane', t(language, 'Signal or lane', 'सिग्नल या लेन')], ['Speed', t(language, 'Speed', 'गति')], ['Parking / stopping', t(language, 'Parking or stopping', 'पार्किंग या रुकना')], ['Registration / document', t(language, 'Registration or document', 'पंजीकरण या दस्तावेज़')], ['Other / unclear', t(language, 'Other or unclear', 'अन्य या अस्पष्ट')],
              ]} />
            </div>
            {error && <p className={styles.inlineError} role="alert">{error}</p>}
            <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setStep('safety')}>← {t(language, 'Back', 'पीछे')}</button><button type="button" className={styles.button} onClick={continueSource}>{answers.sourceStatus === 'message-only' ? t(language, 'See the safe next step', 'सुरक्षित अगला कदम देखें') : t(language, 'Continue to evidence comparison', 'सबूत की तुलना पर आगे बढ़ें')} →</button></div>
          </section>
        )}

        {step === 'observations' && (
          <section className={styles.panel} aria-labelledby="observe-title">
            <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>{t(language, 'Your observation—not extraction', 'आपका अवलोकन—न कि निष्कर्षण')}</p><h2 id="observe-title">{t(language, 'Record only what the official evidence shows', 'केवल वही दर्ज करें जो आधिकारिक सबूत दिखाता है')}</h2><p>{t(language, 'Use the official record in a separate tab or device. Do not paste it here.', 'आधिकारिक रिकॉर्ड अलग टैब या डिवाइस में देखें। उसे यहाँ पेस्ट न करें।')}</p></div></div>
            <div className={styles.formGrid}>
              <div className={styles.field}><label htmlFor="vehicle-suffix">{t(language, 'Your vehicle registration — last 4 only (optional)', 'आपका वाहन नंबर — केवल अंतिम 4 (वैकल्पिक)')}</label><input id="vehicle-suffix" value={vehicleSuffix} inputMode="text" maxLength={4} autoComplete="off" placeholder="3317" onChange={(event) => setVehicleSuffix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))} /><small>{t(language, 'Never enter the full registration.', 'पूरा वाहन नंबर कभी दर्ज न करें।')}</small></div>
              <div className={styles.field}><label htmlFor="event-date">{t(language, 'Event date shown (optional)', 'दिखाई गई घटना तारीख (वैकल्पिक)')}</label><input id="event-date" type="date" value={eventDate} max={indiaDateNow()} onInput={(event) => setEventDate(event.currentTarget.value)} onChange={(event) => setEventDate(event.target.value)} /><small>{t(language, 'Do not substitute the message-received date.', 'संदेश मिलने की तारीख को घटना तारीख न मानें।')}</small></div>
              <div className={styles.field}><label htmlFor="official-deadline">{t(language, 'Deadline visibly shown by official service (optional)', 'आधिकारिक सेवा पर दिखाई अंतिम तारीख (वैकल्पिक)')}</label><input id="official-deadline" type="date" value={officialDeadline} onInput={(event) => setOfficialDeadline(event.currentTarget.value)} onChange={(event) => setOfficialDeadline(event.target.value)} /><small>{t(language, 'We do not infer a legal deadline when this is blank.', 'खाली होने पर हम कानूनी अंतिम तारीख का अनुमान नहीं लगाते।')}</small></div>
              <div className={styles.field}><label htmlFor="image-inspected">{t(language, 'Did you inspect the officially supplied image?', 'क्या आपने आधिकारिक रूप से दी गई तस्वीर देखी?')}</label><select id="image-inspected" value={answers.imageInspected ? 'yes' : 'no'} onChange={(event) => setAnswers({ ...answers, imageInspected: event.target.value === 'yes' })}><option value="no">{t(language, 'No / image not supplied', 'नहीं / तस्वीर नहीं दी गई')}</option><option value="yes">{t(language, 'Yes, I inspected it', 'हाँ, मैंने देखी')}</option></select></div>
            </div>

            <div className={styles.observationGrid} style={{ marginTop: 22 }}>
              {([
                ['plateObservation', t(language, 'Plate comparison', 'नंबर प्लेट तुलना')],
                ['categoryObservation', t(language, 'Vehicle category', 'वाहन श्रेणी')],
                ['colourObservation', t(language, 'Vehicle colour', 'वाहन का रंग')],
              ] as const).map(([key, label]) => <div className={styles.observationCard} key={key}><label htmlFor={key}><span>{t(language, 'YOUR OBSERVATION', 'आपका अवलोकन')}</span>{label}</label><select id={key} value={answers[key]} disabled={!answers.imageInspected} onChange={(event) => setAnswers({ ...answers, [key]: event.target.value as Observation })}>{observationOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>)}
              <div className={styles.observationCard}><label htmlFor="offence-observation"><span>{t(language, 'YOUR OBSERVATION', 'आपका अवलोकन')}</span>{t(language, 'Alleged offence', 'आरोपित अपराध')}</label><select id="offence-observation" value={answers.offenceObservation} disabled={!answers.imageInspected} onChange={(event) => setAnswers({ ...answers, offenceObservation: event.target.value as OffenceObservation })}><option value="appears-visible">{t(language, 'Appears visible', 'दिखाई देता है')}</option><option value="not-visible">{t(language, 'Not visible in supplied image', 'दी गई तस्वीर में नहीं दिखता')}</option><option value="not-assessable-from-still">{t(language, 'Not assessable from one still', 'एक तस्वीर से जाँचना संभव नहीं')}</option><option value="unclear">{t(language, 'Unclear', 'अस्पष्ट')}</option></select></div>
              <div className={styles.observationCard}><label htmlFor="timestamp-status"><span>{t(language, 'YOUR OBSERVATION', 'आपका अवलोकन')}</span>{t(language, 'Image timestamp', 'तस्वीर का समय')}</label><select id="timestamp-status" value={answers.timestampStatus} disabled={!answers.imageInspected} onChange={(event) => setAnswers({ ...answers, timestampStatus: event.target.value as CitizenChallanAnswers['timestampStatus'] })}><option value="displayed">{t(language, 'Displayed and readable', 'दिखता और पढ़ने योग्य')}</option><option value="unclear">{t(language, 'Unclear', 'अस्पष्ट')}</option><option value="not-found">{t(language, 'Not found', 'नहीं मिला')}</option></select></div>
              <div className={styles.observationCard}><label htmlFor="location-status"><span>{t(language, 'YOUR OBSERVATION', 'आपका अवलोकन')}</span>{t(language, 'Image location', 'तस्वीर का स्थान')}</label><select id="location-status" value={answers.locationStatus} disabled={!answers.imageInspected} onChange={(event) => setAnswers({ ...answers, locationStatus: event.target.value as CitizenChallanAnswers['locationStatus'] })}><option value="displayed">{t(language, 'Displayed and readable', 'दिखता और पढ़ने योग्य')}</option><option value="unclear">{t(language, 'Unclear', 'अस्पष्ट')}</option><option value="not-found">{t(language, 'Not found', 'नहीं मिला')}</option></select></div>
            </div>

            <div className={styles.formGrid} style={{ marginTop: 22 }}>
              <SelectField id="own-record" label={t(language, 'Vehicle record you can compare', 'तुलना के लिए वाहन रिकॉर्ड')} value={answers.ownRecordAvailable} onChange={(value) => setAnswers({ ...answers, ownRecordAvailable: value as RecordAvailability })} options={recordOptions} />
              <SelectField id="notice-copy" label={t(language, 'Official notice copy', 'आधिकारिक नोटिस कॉपी')} value={answers.noticeCopyAvailable} onChange={(value) => setAnswers({ ...answers, noticeCopyAvailable: value as RecordAvailability })} options={recordOptions} />
              <SelectField id="custody-record" label={t(language, 'Event-time vehicle custody record (context only)', 'घटना समय वाहन अभिरक्षा रिकॉर्ड (केवल संदर्भ)')} value={answers.custodyRecordAvailable} onChange={(value) => setAnswers({ ...answers, custodyRecordAvailable: value as RecordAvailability })} options={recordOptions} help={t(language, 'This does not identify the driver or determine responsibility.', 'यह चालक की पहचान या जिम्मेदारी तय नहीं करता।')} />
            </div>
            {role === 'helper' && <div className={styles.acknowledgements}><label className={styles.check}><input type="checkbox" checked={helperFinalConfirmed} onChange={(event) => setHelperConfirmationSignature(event.target.checked ? currentReviewSignature : '')} />{t(language, 'The citizen is still present. I read back these final observations and they confirmed each answer. Any later edit requires confirmation again.', 'नागरिक अभी मौजूद है। मैंने अंतिम अवलोकन पढ़कर सुनाए और उन्होंने हर उत्तर की पुष्टि की। बाद का कोई भी बदलाव फिर पुष्टि माँगेगा।')}</label></div>}
            {error && <p className={styles.inlineError} role="alert">{error}</p>}
            <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setStep('source')}>← {t(language, 'Back', 'पीछे')}</button><button type="button" className={styles.button} onClick={continueObservations}>{t(language, 'Show what my entries support', 'दिखाएँ कि मेरी प्रविष्टियाँ क्या समर्थन करती हैं')} →</button></div>
          </section>
        )}

        {step === 'result' && (
          <section className={styles.panel} aria-labelledby="result-title">
            <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>{t(language, 'Conservative result', 'सावधान नतीजा')}</p><h2 id="result-title">{t(language, 'What your answers support—and do not support', 'आपके उत्तर क्या समर्थन करते हैं—और क्या नहीं')}</h2></div></div>
            <div className={styles.resultHero} data-tone={resultCopy.tone}><span className={styles.resultIcon} aria-hidden="true">{resultCopy.tone === 'good' ? '✓' : resultCopy.tone === 'stop' ? 'i' : '!'}</span><div><h2>{resultCopy.title}</h2><p>{resultCopy.body}</p><p><strong>{t(language, 'Based only on your answers.', 'केवल आपके उत्तरों पर आधारित।')}</strong> {t(language, 'ChallanSakshi did not inspect the photograph, challan, RC, authority record, or official status.', 'ChallanSakshi ने तस्वीर, चालान, RC, प्राधिकरण रिकॉर्ड या आधिकारिक स्थिति नहीं देखी।')}</p></div></div>

            {answers.sourceStatus === 'message-only' ? (
              <div className={styles.stopCard} style={{ marginTop: 18 }}><h2>{t(language, 'Do not use the message link', 'संदेश का लिंक उपयोग न करें')}</h2><p>{t(language, 'Independently locate the responsible official e-Challan or state/UT service. An official route must not be inferred from the message itself, and ChallanSakshi will not guess one from incomplete details.', 'जिम्मेदार आधिकारिक ई-चालान या राज्य/केंद्रशासित सेवा स्वतंत्र रूप से खोजें। संदेश से आधिकारिक रास्ते का अनुमान न लगाएँ; ChallanSakshi अधूरी जानकारी से रास्ता नहीं चुनेगा।')}</p><a className={styles.button} href={jurisdiction === 'Central e-Challan service' ? 'https://echallan.parivahan.gov.in/' : '/safety'} target={jurisdiction === 'Central e-Challan service' ? '_blank' : undefined} rel={jurisdiction === 'Central e-Challan service' ? 'noreferrer' : undefined}>{jurisdiction === 'Central e-Challan service' ? t(language, 'Open official central e-Challan service', 'आधिकारिक केंद्रीय ई-चालान सेवा खोलें') : t(language, 'Find the responsible official route safely', 'जिम्मेदार आधिकारिक रास्ता सुरक्षित रूप से खोजें')} ↗</a></div>
            ) : (
              <>
                <div className={styles.resultMeta}>
                  <article><small>{t(language, 'Source', 'स्रोत')}</small><strong>{answers.sourceStatus.replaceAll('-', ' ')}</strong></article>
                  <article><small>{t(language, 'Identifier shown here', 'यहाँ दिखाई पहचान')}</small><strong>{vehicleSuffix ? `•••• ${vehicleSuffix}` : t(language, 'Not entered', 'दर्ज नहीं')}</strong></article>
                  <article><small>{t(language, 'Worksheet', 'वर्कशीट')}</small><strong>{assessment.canPrepareWorksheet ? t(language, 'Neutral preparation available', 'निष्पक्ष तैयारी उपलब्ध') : t(language, 'Dispute request withheld', 'विवाद अनुरोध रोका गया')}</strong></article>
                </div>

                {deadline && deadline.status !== 'not-entered' && <div className={styles.deadline}><strong>{deadline.status === 'open' ? t(language, `${deadline.daysRemaining} calendar days to the copied official date`, `कॉपी की गई आधिकारिक तारीख तक ${deadline.daysRemaining} कैलेंडर दिन`) : deadline.status === 'today' ? t(language, 'The copied official date is today', 'कॉपी की गई आधिकारिक तारीख आज है') : t(language, 'The copied official date has passed', 'कॉपी की गई आधिकारिक तारीख बीत चुकी है')}</strong><p>{t(language, 'This is not a legal deadline calculation. It only counts to the date you copied. Verify the current case state and route now.', 'यह कानूनी अंतिम तारीख की गणना नहीं है। यह केवल आपके कॉपी किए दिन तक गिनती है। वर्तमान केस स्थिति और रास्ता अभी जाँचें।')}</p></div>}

                <div className={styles.listPanel}><h3>{t(language, 'What to verify before acting', 'कार्रवाई से पहले क्या जाँचें')}</h3><ul>{assessment.materialSignals.map((item) => <li key={item}>{item}</li>)}{assessment.missingEvidence.map((item) => <li key={item}>{item}</li>)}<li>{t(language, 'Re-check the current official status, applicable route, and any displayed deadline.', 'वर्तमान आधिकारिक स्थिति, लागू रास्ता और दिखाई अंतिम तारीख फिर जाँचें।')}</li></ul></div>

                {assessment.canPrepareWorksheet ? <div className={styles.artifact}><h3>{t(language, 'Local masked worksheet', 'स्थानीय मास्क की गई वर्कशीट')}</h3><p className={styles.artifactWarning}>{device === 'shared' ? t(language, 'The in-app copy/download controls are disabled; text may still be manually selected. The page attempts to leave after about 10 minutes of inactivity. Read the checklist, then Quick exit & clear.', 'ऐप के कॉपी/डाउनलोड नियंत्रण बंद हैं; टेक्स्ट फिर भी मैन्युअली चुना जा सकता है। लगभग 10 मिनट निष्क्रिय रहने पर पेज बाहर निकलने का प्रयास करता है। सूची पढ़ें, फिर तुरंत बाहर निकलें और साफ़ करें।') : t(language, 'Copying or downloading may leave information in the clipboard or Downloads folder. ChallanSakshi cannot erase those copies.', 'कॉपी या डाउनलोड से जानकारी क्लिपबोर्ड या डाउनलोड फ़ोल्डर में रह सकती है। ChallanSakshi उन कॉपी को मिटा नहीं सकता।')}</p><pre>{worksheet}</pre></div> : <div className={styles.stopCard}><h3>{t(language, 'No dispute request prepared', 'कोई विवाद अनुरोध तैयार नहीं किया गया')}</h3><p>{t(language, 'This outcome does not support a request from the entered observations. Review the official record or correct an answer; ChallanSakshi will not manufacture a dispute.', 'दर्ज अवलोकन इस नतीजे में अनुरोध का समर्थन नहीं करते। आधिकारिक रिकॉर्ड फिर देखें या उत्तर सुधारें; ChallanSakshi विवाद नहीं गढ़ेगा।')}</p></div>}

                <div className={styles.sourceGrid}>
                  {jurisdiction === 'Central e-Challan service' ? <a href="https://echallan.parivahan.gov.in/" target="_blank" rel="noreferrer"><strong>{t(language, 'Official central e-Challan service ↗', 'आधिकारिक केंद्रीय ई-चालान सेवा ↗')}</strong><small>{t(language, 'Nothing from this review is transferred. Re-enter required details only there.', 'इस समीक्षा से कुछ स्थानांतरित नहीं होता। आवश्यक जानकारी केवल वहाँ फिर दर्ज करें।')}</small></a> : <a href="/safety"><strong>{t(language, 'Return to the State/UT service you independently verified', 'स्वतंत्र रूप से सत्यापित राज्य/केंद्रशासित सेवा पर लौटें')}</strong><small>{t(language, 'ChallanSakshi does not guess or redirect a state route from your entries.', 'ChallanSakshi आपकी प्रविष्टियों से राज्य रास्ते का अनुमान या रीडायरेक्ट नहीं करता।')}</small></a>}
                  <a href="/safety"><strong>{t(language, 'Check route and scam safety', 'रास्ता और स्कैम सुरक्षा जाँचें')}</strong><small>{t(language, 'Official domains, court handoff limits, and credential red flags.', 'आधिकारिक डोमेन, अदालत हस्तांतरण सीमाएँ और क्रेडेंशियल खतरे।')}</small></a>
                </div>

                {artifactStatus && <p className={styles.inlineError} role="status">{artifactStatus}</p>}
              </>
            )}

            <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setStep(answers.sourceStatus === 'message-only' ? 'source' : 'observations')}>← {t(language, 'Edit answers', 'उत्तर बदलें')}</button>{assessment.canPrepareWorksheet && answers.sourceStatus !== 'message-only' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}><button type="button" className={styles.buttonSecondary} disabled={device === 'shared'} onClick={copyWorksheet}>{t(language, 'Copy worksheet', 'वर्कशीट कॉपी करें')}</button><button type="button" className={styles.button} disabled={device === 'shared'} onClick={downloadWorksheet}>{t(language, 'Download .txt', '.txt डाउनलोड करें')}</button></div>}</div>
          </section>
        )}
      </main>
    </PublicBetaShell>
  );
}
