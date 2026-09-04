'use client';
import { useState } from 'react';
import { HOME_ACTIONS } from '../../lib/citizen-home';
import { CitizenFooter, CitizenHeader } from '../shared/CitizenChrome';
import styles from './CitizenHome.module.css';

type Language = 'en' | 'hi';
const copy = {
  en: {
    heading: 'Check the record before you act',
    supporting: 'Review what you have, understand what it supports, and continue on the appropriate official service.',
    actions: [
      ['Review a challan or its photo', 'Check the official record and compare only what you can see.'],
      ['I only have an SMS or forwarded link', 'Check it safely without entering or sharing the message.'],
      ['Check a FASTag transaction', 'Compare the transaction and find the appropriate official route.'],
    ],
  },
  hi: {
    heading: 'कार्रवाई से पहले रिकॉर्ड जाँचें',
    supporting: 'जो आपके पास है उसकी समीक्षा करें, समझें कि वह क्या दिखाता है, फिर सही आधिकारिक सेवा पर आगे बढ़ें।',
    actions: [
      ['चालान या उसकी फ़ोटो की समीक्षा करें', 'आधिकारिक रिकॉर्ड जाँचें और केवल दिखाई देने वाली जानकारी की तुलना करें।'],
      ['मेरे पास केवल SMS या फ़ॉरवर्ड किया हुआ लिंक है', 'संदेश दर्ज या साझा किए बिना इसे सुरक्षित रूप से जाँचें।'],
      ['FASTag लेन-देन जाँचें', 'लेन-देन की तुलना करें और सही आधिकारिक रास्ता पाएँ।'],
    ],
  },
} as const;

function Arrow() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>; }

export default function CitizenHome({ initialLanguage = 'en' }: { initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const text = copy[language];
  return <div className={styles.page} lang={language}>
    <CitizenHeader language={language} setLanguage={setLanguage} />
    <main className={styles.main} lang={language}>
      <section className={styles.hero} aria-labelledby="citizen-home-heading">
        <p className={styles.eyebrow}>{language === 'hi' ? 'सबूत पहले, कार्रवाई बाद में' : 'Evidence before action'}</p>
        <h1 id="citizen-home-heading">{text.heading}</h1>
        <p className={styles.supporting}>{text.supporting}</p>
        <div className={styles.actionList}>
          {HOME_ACTIONS.map((action, index) => <a className={styles.actionRow} href={action.href} key={action.href}>
            <span className={styles.number} aria-hidden="true">0{index + 1}</span>
            <span className={styles.actionCopy}><h2>{text.actions[index][0]}</h2><p>{text.actions[index][1]}</p></span>
            <span className={styles.arrow}><Arrow /></span>
          </a>)}
        </div>
      </section>
    </main>
    <CitizenFooter language={language} />
  </div>;
}
