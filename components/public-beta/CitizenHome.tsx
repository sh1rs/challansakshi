'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Same-origin anchors intentionally clear memory-only review state. */

import { useState } from 'react';
import { buildReviewHref, HOME_ACTIONS, SITUATION_LINKS, type CitizenGoal } from '../../lib/citizen-home';
import styles from './CitizenHome.module.css';

type Language = 'en' | 'hi';

type Copy = {
  language: string;
  english: string;
  hindi: string;
  simpleMode: string;
  privacy: string;
  demo: string;
  home: string;
  heading: string;
  supporting: string;
  simpleSupporting: string;
  actions: Record<CitizenGoal, { title: string; question: string; simpleQuestion: string; cta: string }>;
  situationsHeading: string;
  commonSituations: string;
  situations: readonly string[];
  journeyHeading: string;
  journey: readonly { title: string; body: string }[];
  privacyHeading: string;
  privacyGroups: readonly { title: string; items: readonly string[] }[];
  fastagHeading: string;
  fastagBody: string;
  fastagAction: string;
  footerPrivacy: string;
  footerSafety: string;
  footerDemo: string;
  footerLimit: string;
};

const copy: Record<Language, Copy> = {
  en: {
    language: 'Language',
    english: 'English',
    hindi: 'हिंदी',
    simpleMode: 'Simple mode',
    privacy: 'Privacy',
    demo: 'Hackathon demo',
    home: 'ChallanSakshi home',
    heading: 'What happened with your challan?',
    supporting: 'Verify the record, understand the notice, check the evidence, and continue through the correct official service.',
    simpleSupporting: 'Check what the official record says. Compare only what you can see. Then use the official service.',
    actions: {
      verify: { title: 'Verify', question: 'Is this challan actually connected to you or your vehicle?', simpleQuestion: 'Check whether the official record is about your vehicle.', cta: 'Find the official record' },
      understand: { title: 'Understand', question: 'What does this notice, status, or Virtual Court update mean?', simpleQuestion: 'See what the notice or status means.', cta: 'Explain my situation' },
      evidence: { title: 'Check evidence', question: 'Does the supplied evidence agree with the record and your vehicle?', simpleQuestion: 'Check whether the photo and record agree.', cta: 'Compare the evidence' },
      resolve: { title: 'Resolve', question: 'What is the safest official next step?', simpleQuestion: 'See the next official step.', cta: 'Show my next step' },
    },
    situationsHeading: 'Your situation might be:',
    commonSituations: 'Common challan situations',
    situations: [
      'I do not recognise this challan',
      'The photograph may show another vehicle',
      'I already paid',
      'My grievance was rejected',
      'My case moved to Virtual Court',
    ],
    journeyHeading: 'How ChallanSakshi works',
    journey: [
      { title: 'Open the official service', body: 'You will go to the official portal or app to search or sign in.' },
      { title: 'Bring back your record', body: 'Return here to review what you can see on your device.' },
      { title: 'Review before acting', body: 'Understand, check the evidence, and choose the correct next step.' },
    ],
    privacyHeading: 'Your privacy is built in',
    privacyGroups: [
      { title: 'We never ask for', items: ['Government passwords', 'CAPTCHA or OTP', 'Aadhaar details', 'Payment credentials'] },
      { title: 'Your documents stay on your device', items: ['Selected files stay browser-local', 'No file is uploaded to ChallanSakshi, AI, or an authority', 'Opening a PDF creates a separate local tab; close it yourself', 'You choose what to save or share'] },
      { title: 'Official services, always', items: ['Payments happen on official services', 'Submissions happen on official services', 'We do not collect or process payments'] },
    ],
    fastagHeading: 'Have a FASTag transaction problem instead?',
    fastagBody: 'Compare the plaza record, issuer transaction, debit status, and the appropriate official escalation route.',
    fastagAction: 'Go to FASTag help',
    footerPrivacy: 'Privacy',
    footerSafety: 'Safety',
    footerDemo: 'Hackathon demo',
    footerLimit: 'Independent service. ChallanSakshi does not file, pay, authenticate, give legal advice, or guarantee an outcome.',
  },
  hi: {
    language: 'भाषा',
    english: 'English',
    hindi: 'हिंदी',
    simpleMode: 'सरल मोड',
    privacy: 'गोपनीयता',
    demo: 'हैकाथॉन डेमो',
    home: 'ChallanSakshi होम',
    heading: 'आपके चालान के साथ क्या हुआ?',
    supporting: 'रिकॉर्ड जाँचें, नोटिस समझें, साक्ष्य देखें और सही आधिकारिक सेवा के माध्यम से आगे बढ़ें।',
    simpleSupporting: 'देखें कि आधिकारिक रिकॉर्ड क्या कहता है। केवल वही तुलना करें जो आप देख सकते हैं। फिर आधिकारिक सेवा इस्तेमाल करें।',
    actions: {
      verify: { title: 'जाँचें', question: 'क्या यह चालान वास्तव में आप या आपके वाहन से जुड़ा है?', simpleQuestion: 'जाँचें कि आधिकारिक रिकॉर्ड आपके वाहन के बारे में है या नहीं।', cta: 'आधिकारिक रिकॉर्ड खोजें' },
      understand: { title: 'समझें', question: 'इस नोटिस, स्थिति या वर्चुअल कोर्ट अपडेट का क्या अर्थ है?', simpleQuestion: 'देखें कि नोटिस या स्थिति का क्या अर्थ है।', cta: 'मेरी स्थिति समझाएँ' },
      evidence: { title: 'साक्ष्य जाँचें', question: 'क्या दिए गए साक्ष्य रिकॉर्ड और आपके वाहन से मेल खाते हैं?', simpleQuestion: 'जाँचें कि फोटो और रिकॉर्ड मेल खाते हैं या नहीं।', cta: 'साक्ष्य की तुलना करें' },
      resolve: { title: 'आगे बढ़ें', question: 'सबसे सुरक्षित आधिकारिक अगला कदम क्या है?', simpleQuestion: 'आधिकारिक अगला कदम देखें।', cta: 'मेरा अगला कदम दिखाएँ' },
    },
    situationsHeading: 'आपकी स्थिति यह हो सकती है:',
    commonSituations: 'चालान की सामान्य स्थितियाँ',
    situations: [
      'मैं इस चालान को नहीं पहचानता/पहचानती',
      'फोटो में कोई दूसरा वाहन हो सकता है',
      'मैं पहले ही भुगतान कर चुका/चुकी हूँ',
      'मेरी शिकायत अस्वीकार हो गई',
      'मेरा मामला वर्चुअल कोर्ट चला गया',
    ],
    journeyHeading: 'ChallanSakshi कैसे काम करता है',
    journey: [
      { title: 'आधिकारिक सेवा खोलें', body: 'खोजने या साइन इन करने के लिए आप आधिकारिक पोर्टल या ऐप पर जाएँगे।' },
      { title: 'अपना रिकॉर्ड वापस लाएँ', body: 'अपने डिवाइस पर जो आप देख सकते हैं उसकी समीक्षा के लिए यहाँ लौटें।' },
      { title: 'कार्रवाई से पहले समीक्षा करें', body: 'समझें, साक्ष्य जाँचें और सही अगला कदम चुनें।' },
    ],
    privacyHeading: 'आपकी गोपनीयता इसमें शामिल है',
    privacyGroups: [
      { title: 'हम कभी नहीं माँगते', items: ['सरकारी पासवर्ड', 'CAPTCHA या OTP', 'आधार विवरण', 'भुगतान क्रेडेंशियल'] },
      { title: 'आपके दस्तावेज़ आपके डिवाइस पर रहते हैं', items: ['चुनी फ़ाइलें ब्राउज़र में स्थानीय रहती हैं', 'कोई फ़ाइल ChallanSakshi, AI या किसी प्राधिकरण पर अपलोड नहीं होती', 'PDF अलग स्थानीय टैब में खुलती है; उसे स्वयं बंद करें', 'आप चुनते हैं कि क्या सेव या साझा करना है'] },
      { title: 'हमेशा आधिकारिक सेवाएँ', items: ['भुगतान आधिकारिक सेवाओं पर होते हैं', 'सबमिशन आधिकारिक सेवाओं पर होते हैं', 'हम भुगतान नहीं लेते या प्रोसेस नहीं करते'] },
    ],
    fastagHeading: 'क्या आपको FASTag लेन-देन की समस्या है?',
    fastagBody: 'प्लाज़ा रिकॉर्ड, जारीकर्ता लेन-देन, डेबिट स्थिति और सही आधिकारिक एस्केलेशन मार्ग की तुलना करें।',
    fastagAction: 'FASTag सहायता पर जाएँ',
    footerPrivacy: 'गोपनीयता',
    footerSafety: 'सुरक्षा',
    footerDemo: 'हैकाथॉन डेमो',
    footerLimit: 'स्वतंत्र सेवा। ChallanSakshi फाइल, भुगतान, प्रमाणीकरण या कानूनी सलाह नहीं देता और नतीजे की गारंटी नहीं देता।',
  },
};

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function GoalIcon({ goal }: { goal: CitizenGoal }) {
  if (goal === 'verify') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
  if (goal === 'understand') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h10l3 3v14H6zM16 3.5v4h3M9 11h7M9 15h7M9 19h4" /><path d="M4 6.5v14h11" /></svg>;
  if (goal === 'evidence') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5.5 18 4.5-4 3 3 3-2.5 3 3.5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h13M14 3l3 3-3 3M20 18H7M10 15l-3 3 3 3M7 6v12M17 6v12" /></svg>;
}

function SituationIcon({ index }: { index: number }) {
  if (index === 0) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2-2.5 3.7M12 17h.01" /></svg>;
  if (index === 1) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16V9l3-4h9l4 4v7M3 16h18M6 16a2 2 0 1 0 4 0M14 16a2 2 0 1 0 4 0M8 9h7" /></svg>;
  if (index === 2) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5c.4-1 1.3-1.5 2.5-1.5 1.4 0 2.5.8 2.5 2 0 3-4.6 1.5-4.6 4.2 0 1 .9 1.8 2.1 1.8 1.2 0 2.1-.7 2.4-1.7M12 6v12" /></svg>;
  if (index === 3) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 20 4M7 16l-3 1 1-3 2-1 3 3-1 2-2-2M11 12l3 3-2 2-3-3zM15 8l2-3 1 3-3 2-2-2z" /></svg>;
}

function JourneyIcon({ index }: { index: number }) {
  if (index === 0) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M21 3l-9 9M11 6H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6" /></svg>;
  if (index === 1) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 16v4h16v-4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6v-2H9zM8.5 13l2.2 2.2 4.8-5" /></svg>;
}

function PrivacyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.7-3 8-7 10-4-2-7-5.3-7-10V6zM9.5 11.5V10a2.5 2.5 0 0 1 5 0v1.5M8.5 11.5h7v5h-7z" /></svg>;
}

function FastagIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M6 9h7M6 13h4M17 9h1M17 13h1M8 20h8" /></svg>;
}

export default function CitizenHome() {
  const [language, setLanguage] = useState<Language>('en');
  const [simpleMode, setSimpleMode] = useState(false);
  const text = copy[language];

  return (
    <div className={styles.page} lang={language === 'hi' ? 'hi' : 'en'}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label={text.home}>ChallanSakshi</a>
        <nav className={styles.headerActions} aria-label={text.language}>
          <div className={styles.languageToggle} role="group" aria-label={text.language}>
            <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>{text.english}</button>
            <button type="button" aria-pressed={language === 'hi'} onClick={() => setLanguage('hi')}>{text.hindi}</button>
          </div>
          <button type="button" className={styles.simpleToggle} aria-pressed={simpleMode} onClick={() => setSimpleMode((current) => !current)}>{text.simpleMode}</button>
          <a href="/privacy">{text.privacy}</a>
          <a href="/demo">{text.demo}</a>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="citizen-home-heading">
          <h1 id="citizen-home-heading">{text.heading}</h1>
          <p>{simpleMode ? text.simpleSupporting : text.supporting}</p>
          <div className={styles.actionList}>
            {HOME_ACTIONS.map((action) => {
              const actionCopy = text.actions[action.goal];
              return (
                <article className={styles.actionRow} key={action.goal}>
                  <div className={styles.goalIcon}><GoalIcon goal={action.goal} /></div>
                  <div className={styles.actionCopy}>
                    <h2>{actionCopy.title}</h2>
                    <p>{simpleMode ? actionCopy.simpleQuestion : actionCopy.question}</p>
                  </div>
                  <a className={styles.actionLink} href={buildReviewHref(action.goal)}>
                    <span>{actionCopy.cta}</span>
                    <ArrowIcon />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <nav className={styles.situationRail} aria-label={text.commonSituations}>
          <strong>{text.situationsHeading}</strong>
          <div>
            {SITUATION_LINKS.map((situation, index) => (
              <a href={situation.href} key={situation.href + index}>
                <SituationIcon index={index} />
                <span>{text.situations[index]}</span>
                <ArrowIcon />
              </a>
            ))}
          </div>
        </nav>

        <section className={styles.journey} aria-label={text.journeyHeading}>
          <h2>{text.journeyHeading}</h2>
          <ol>
            {text.journey.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span className={styles.journeyIcon}><JourneyIcon index={index} /></span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.privacyBand} aria-label={text.privacyHeading}>
          <div className={styles.privacyLead}><span><PrivacyIcon /></span><h2>{text.privacyHeading}</h2></div>
          {text.privacyGroups.map((group) => <div className={styles.privacyGroup} key={group.title}><h3>{group.title}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
        </section>

        <aside className={styles.fastagDoorway}>
          <span className={styles.fastagIcon}><FastagIcon /></span>
          <div><h2>{text.fastagHeading}</h2><p>{text.fastagBody}</p></div>
          <a href="/fastag"><span>{text.fastagAction}</span><ArrowIcon /></a>
        </aside>
      </main>

      <footer className={styles.footer}>
        <a href="/privacy">{text.footerPrivacy}</a>
        <a href="/safety">{text.footerSafety}</a>
        <a href="/demo">{text.footerDemo}</a>
        <p>{text.footerLimit}</p>
      </footer>
    </div>
  );
}
