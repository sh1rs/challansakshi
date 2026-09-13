'use client';

/* Native navigation deliberately starts a fresh tool or review session. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from 'react';
import { ArrowUpRight, FileCheck2, MessageSquareText, ReceiptText, Route, ShieldCheck } from 'lucide-react';
import type { Language } from '../../lib/domain';
import { aboutQuestions } from '../../lib/site-content';
import { PublicBetaShell } from './PublicBetaShell';
import styles from './AboutPage.module.css';

export default function AboutPage() {
  const [language, setLanguage] = useState<Language>('en');
  const hi = language === 'hi';
  const t = (en: string, hindi: string) => hi ? hindi : en;
  const tools = [
    { href: '/review', Icon: FileCheck2, name: t('Understand a challan', 'चालान समझें'), description: t('Read a document, check the details and prepare your next step.', 'दस्तावेज़ पढ़ें, विवरण जाँचें और अगला कदम तैयार करें।') },
    { href: '/fastag', Icon: ReceiptText, name: t('Check a FASTag debit', 'FASTag डेबिट जाँचें'), description: t('Compare the transaction with your journey and records.', 'लेन-देन को अपनी यात्रा और रिकॉर्ड से मिलाएँ।') },
    { href: '/message-check', Icon: ShieldCheck, name: t('Check a suspicious message', 'संदिग्ध संदेश जाँचें'), description: t('Look for common warning signs before following a link.', 'लिंक खोलने से पहले आम चेतावनी संकेत देखें।') },
    { href: '/reply-review', Icon: MessageSquareText, name: t('Understand a reply', 'जवाब समझें'), description: t('Connect the reply to your questions and prepare a follow-up.', 'जवाब को अपने सवालों से जोड़ें और अगला अनुरोध बनाएँ।') },
    { href: '/mobility', Icon: Route, name: t('Keep a case organised', 'केस व्यवस्थित रखें'), description: t('Build a plan, organise evidence and save it on your private device.', 'योजना बनाएँ, सबूत व्यवस्थित करें और अपने निजी डिवाइस पर सहेजें।') },
  ];
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="ChallanSakshi के बारे में">
    <main className={styles.page}>
      <a className={styles.back} href="/">{t('ChallanSakshi home', 'ChallanSakshi होम')}</a>
      <header className={styles.hero}>
        <h1>{t('A little clarity. A better next step.', 'थोड़ी स्पष्टता। एक बेहतर अगला कदम।')}</h1>
        <p>{t('ChallanSakshi is a free civic tool for the moments when a challan, a toll debit or an official reply leaves you unsure what to do.', 'ChallanSakshi उन पलों के लिए एक मुफ़्त नागरिक उपकरण है जब चालान, टोल डेबिट या आधिकारिक जवाब के बाद समझ न आए कि क्या करें।')}</p>
        <p>{t('Understand the record. Check what you know. Prepare your own next step, with the official service always in your control.', 'रिकॉर्ड समझें। जो जानते हैं उसे जाँचें। अपना अगला कदम तैयार करें, और आधिकारिक सेवा का नियंत्रण हमेशा अपने पास रखें।')}</p>
        <div className={styles.values} aria-label={t('Project principles', 'परियोजना के सिद्धांत')}><span>{t('Free to use', 'उपयोग मुफ़्त')}</span><span>{t('No sign-up to start', 'शुरू करने के लिए साइन-अप नहीं')}</span><span>{t('Independent of government', 'सरकार से स्वतंत्र')}</span></div>
      </header>

      <section className={styles.section} aria-labelledby="about-tools">
        <h2 id="about-tools">{t('Find the help you need', 'अपनी ज़रूरत की सहायता पाएँ')}</h2>
        <div className={styles.tools}>{tools.map(({ href, Icon, name, description }) => <a href={href} key={href} className={styles.tool}><Icon size={24} aria-hidden="true" /><div><h3>{name}</h3><p>{description}</p></div><ArrowUpRight size={20} aria-hidden="true" /></a>)}</div>
        <p className={styles.note}>{t('Prefer to try it first?', 'पहले आज़माना चाहते हैं?')} <a href="/demo">{t('Explore a clearly labelled fictional example.', 'स्पष्ट रूप से चिह्नित काल्पनिक उदाहरण देखें।')}</a></p>
      </section>

      <section className={styles.section} aria-labelledby="about-questions">
        <h2 id="about-questions">{t('Before you get started', 'शुरू करने से पहले')}</h2>
        <div className={styles.questions}>{aboutQuestions.map(({ question, answer }, index) => <details key={question[0]} open={index === 0 ? true : undefined}><summary>{question[hi ? 1 : 0]}</summary><p>{answer[hi ? 1 : 0]}</p></details>)}</div>
      </section>

      <section className={styles.creator} aria-labelledby="about-creator">
        <div><p className={styles.signature}>sh1rs<span aria-hidden="true">.</span></p><h2 id="about-creator">{t('Built by Shourya Banda', 'Shourya Banda द्वारा निर्मित')}</h2><p>{t('An independent public-interest project, made to help people take a more informed next step. Free for the public to use.', 'एक स्वतंत्र जनहित परियोजना, ताकि लोग अपना अगला कदम बेहतर जानकारी के साथ उठा सकें। जनता के उपयोग के लिए मुफ़्त।')}</p></div>
        <div className={styles.contact}><a href="https://sh1rs.com" target="_blank" rel="noopener noreferrer">{t('More from sh1rs', 'sh1rs की अन्य परियोजनाएँ')}<ArrowUpRight size={18} aria-hidden="true" /></a><a href="tel:+916305640566">+91 63056 40566</a><p>{t('Website feedback and security concerns. Please leave personal case details out.', 'वेबसाइट प्रतिक्रिया और सुरक्षा चिंताएँ। कृपया मामले की निजी जानकारी न दें।')}</p></div>
      </section>
      <nav className={styles.related} aria-label={t('Project information', 'परियोजना की जानकारी')}><a href="/privacy">{t('Privacy & data controls', 'गोपनीयता और डेटा नियंत्रण')}</a><a href="/safety">{t('Safety guidance', 'सुरक्षा मार्गदर्शन')}</a><a href="/sources">{t('Official sources', 'आधिकारिक स्रोत')}</a></nav>
    </main>
  </PublicBetaShell>;
}
