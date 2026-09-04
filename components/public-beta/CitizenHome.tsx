'use client';

import { useState } from 'react';
import { buildReviewHref, HOME_ACTIONS, SITUATION_LINKS, type CitizenGoal } from '../../lib/citizen-home';
import { CitizenFooter, CitizenHeader, CitizenHeaderButton } from '../shared/CitizenChrome';
import styles from './CitizenHome.module.css';

type Language = 'en' | 'hi';

type Copy = {
  simpleMode: string;
  heading: string;
  supporting: string;
  simpleSupporting: string;
  actions: Record<CitizenGoal, { title: string; description: string; simpleDescription: string }>;
  situationsHeading: string;
  commonSituations: string;
  situations: readonly string[];
  fastagHeading: string;
  fastagBody: string;
  fastagAction: string;
};

const copy: Record<Language, Copy> = {
  en: {
    simpleMode: 'Simple mode',
    heading: 'What happened with your challan?',
    supporting: 'Check the record, compare the evidence, and continue on the right official service.',
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
    fastagHeading: 'Have a FASTag transaction problem instead?',
    fastagBody: 'Compare the plaza record, issuer transaction, debit status, and the appropriate official escalation route.',
    fastagAction: 'Go to FASTag help',
  },
  hi: {
    simpleMode: 'सरल भाषा',
    heading: 'आपके चालान के साथ क्या हुआ?',
    supporting: 'रिकॉर्ड जाँचें, सबूत की तुलना करें और सही आधिकारिक सेवा पर आगे बढ़ें।',
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
    fastagHeading: 'क्या आपको FASTag लेन-देन की समस्या है?',
    fastagBody: 'प्लाज़ा रिकॉर्ड, जारीकर्ता लेन-देन, डेबिट स्थिति और सही आधिकारिक एस्केलेशन मार्ग की तुलना करें।',
    fastagAction: 'FASTag सहायता पर जाएँ',
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

        <nav className={styles.situations} aria-label={text.commonSituations}>
          <span className={styles.situationsHeading}>{text.situationsHeading}</span>
          {SITUATION_LINKS.map((situation, index) => (
            <a href={situation.href} key={situation.href + index}>{text.situations[index]}</a>
          ))}
        </nav>

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
