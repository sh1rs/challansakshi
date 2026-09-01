'use client';

import { useState } from 'react';
import { buildReviewHref, HOME_ACTIONS, SITUATION_LINKS, type CitizenGoal } from '../../lib/citizen-home';
import { CitizenFooter, CitizenHeader, CitizenHeaderButton } from '../shared/CitizenChrome';
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
  actions: Record<CitizenGoal, { title: string; description: string; simpleDescription: string }>;
  situationsHeading: string;
  commonSituations: string;
  situations: readonly string[];
  privacyHeading: string;
  privacyStatements: readonly string[];
  privacyLink: string;
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
      verify: { title: 'Check if it’s yours', description: 'Find the official record and check the vehicle details.', simpleDescription: 'Check whether the official record is about your vehicle.' },
      understand: { title: 'Understand the notice', description: 'See what the notice, status, or Virtual Court update means.', simpleDescription: 'See what the notice or status means.' },
      evidence: { title: 'Compare the photo', description: 'Compare the visible vehicle details with your record.', simpleDescription: 'Check whether the photo and record agree.' },
      resolve: { title: 'Find the next step', description: 'Use the right official route for your situation.', simpleDescription: 'See the next official step.' },
    },
    situationsHeading: 'Not sure? Choose your situation',
    commonSituations: 'Common challan situations',
    situations: [
      'I do not recognise this challan',
      'The photograph may show another vehicle',
      'I already paid',
      'My grievance was rejected',
      'My case moved to Virtual Court',
    ],
    privacyHeading: 'Your privacy is built in',
    privacyStatements: [
      'Files stay in this browser',
      'Nothing is uploaded to ChallanSakshi, AI, or an authority',
      'Payments and submissions stay on official services',
    ],
    privacyLink: 'Read full privacy details',
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
      verify: { title: 'जाँचें कि यह आपका है', description: 'आधिकारिक रिकॉर्ड खोजें और वाहन की जानकारी जाँचें।', simpleDescription: 'जाँचें कि आधिकारिक रिकॉर्ड आपके वाहन के बारे में है या नहीं।' },
      understand: { title: 'नोटिस समझें', description: 'नोटिस, स्थिति या वर्चुअल कोर्ट अपडेट का अर्थ देखें।', simpleDescription: 'देखें कि नोटिस या स्थिति का क्या अर्थ है।' },
      evidence: { title: 'फ़ोटो की तुलना करें', description: 'दिखाई देने वाली वाहन जानकारी को अपने रिकॉर्ड से मिलाएँ।', simpleDescription: 'जाँचें कि फोटो और रिकॉर्ड मेल खाते हैं या नहीं।' },
      resolve: { title: 'अगला कदम खोजें', description: 'अपनी स्थिति के लिए सही आधिकारिक रास्ता चुनें।', simpleDescription: 'आधिकारिक अगला कदम देखें।' },
    },
    situationsHeading: 'पक्का नहीं? अपनी स्थिति चुनें',
    commonSituations: 'चालान की सामान्य स्थितियाँ',
    situations: [
      'मैं इस चालान को नहीं पहचानता/पहचानती',
      'फोटो में कोई दूसरा वाहन हो सकता है',
      'मैं पहले ही भुगतान कर चुका/चुकी हूँ',
      'मेरी शिकायत अस्वीकार हो गई',
      'मेरा मामला वर्चुअल कोर्ट चला गया',
    ],
    privacyHeading: 'आपकी गोपनीयता इसमें शामिल है',
    privacyStatements: [
      'फ़ाइलें इसी ब्राउज़र में रहती हैं',
      'ChallanSakshi, AI या किसी प्राधिकरण पर कुछ अपलोड नहीं होता',
      'भुगतान और सबमिशन आधिकारिक सेवाओं पर ही होते हैं',
    ],
    privacyLink: 'पूरी गोपनीयता जानकारी पढ़ें',
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
      <CitizenHeader
        language={language}
        setLanguage={setLanguage}
        service="ChallanSakshi"
        serviceHindi="चालान साक्षी"
        utilities={<CitizenHeaderButton type="button" aria-pressed={simpleMode} onClick={() => setSimpleMode((current) => !current)}>{text.simpleMode}</CitizenHeaderButton>}
      />

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="citizen-home-heading">
          <h1 id="citizen-home-heading">{text.heading}</h1>
          <p>{simpleMode ? text.simpleSupporting : text.supporting}</p>
          <div className={styles.actionList}>
            {HOME_ACTIONS.map((action) => {
              const actionCopy = text.actions[action.goal];
              return (
                <a className={styles.actionRow} href={buildReviewHref(action.goal)} key={action.goal}>
                  <div className={styles.goalIcon}><GoalIcon goal={action.goal} /></div>
                  <div className={styles.actionCopy}>
                    <h2>{actionCopy.title}</h2>
                    <p>{simpleMode ? actionCopy.simpleDescription : actionCopy.description}</p>
                  </div>
                  <span className={styles.actionCta}><ArrowIcon /></span>
                </a>
              );
            })}
          </div>
        </section>

        <details className={styles.situationDisclosure}>
          <summary>{text.situationsHeading}</summary>
          <nav aria-label={text.commonSituations}>
            {SITUATION_LINKS.map((situation, index) => (
              <a href={situation.href} key={situation.href + index}>
                <SituationIcon index={index} />
                <span>{text.situations[index]}</span>
                <ArrowIcon />
              </a>
            ))}
          </nav>
        </details>

        <section className={styles.privacyBand} aria-label={text.privacyHeading}>
          <div className={styles.privacyLead}><span><PrivacyIcon /></span><h2>{text.privacyHeading}</h2></div>
          <ul>{text.privacyStatements.map((statement) => <li key={statement}>{statement}</li>)}</ul>
          <a className={styles.privacyLink} href="/privacy">{text.privacyLink}<ArrowIcon /></a>
        </section>

        <aside className={styles.fastagDoorwayShell} aria-labelledby="fastag-doorway-title">
          <a className={styles.fastagDoorway} href="/fastag">
            <span className={styles.fastagIcon}><FastagIcon /></span>
            <div><h2 id="fastag-doorway-title">{text.fastagHeading}</h2><p>{text.fastagBody}</p></div>
            <span className={styles.fastagCta}><span>{text.fastagAction}</span><ArrowIcon /></span>
          </a>
        </aside>
      </main>

      <CitizenFooter language={language} />
    </div>
  );
}
