'use client';

/* Native links start a fresh tool session and leave guides usable without JavaScript. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, FileText, MessageSquareText, ReceiptText } from 'lucide-react';
import type { Language } from '../../lib/domain';
import type { CivicGuide } from '../../lib/civic-guides';
import { PublicBetaShell } from './PublicBetaShell';
import styles from './CivicGuides.module.css';

type Localized = readonly [string, string];
const topics: Record<string, { label: Localized; Icon: typeof FileText }> = {
  'wrong-e-challan': { label: ['e-Challan', 'ई-चालान'], Icon: FileText },
  'fastag-wrong-deduction': { label: ['FASTag', 'FASTag'], Icon: ReceiptText },
  'fake-challan-message': { label: ['Message safety', 'संदेश सुरक्षा'], Icon: MessageSquareText },
};

function dateLabel(date: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function GuideCard({ guide, language }: { guide: CivicGuide; language: Language }) {
  const index = language === 'hi' ? 1 : 0;
  const topic = topics[guide.slug];
  const Icon = topic?.Icon ?? BookOpen;
  return <a href={`/guides/${guide.slug}`} className={styles.card}>
    <div className={styles.cardTop}><span className={styles.cardIcon}><Icon size={26} strokeWidth={1.6} aria-hidden="true" /></span><span>{guide.readMinutes} {index ? 'मिनट पढ़ने का समय' : 'min read'}</span></div>
    <p className={styles.topic}>{topic?.label[index] ?? 'ChallanSakshi'}</p>
    <h2>{guide.title[index]}</h2>
    <p className={styles.cardDescription}>{guide.description[index]}</p>
    <span className={styles.cardAction}>{index ? 'मार्गदर्शिका पढ़ें' : 'Read the guide'}<ArrowRight size={18} aria-hidden="true" /></span>
  </a>;
}

function Breadcrumbs({ language, guide }: { language: Language; guide?: CivicGuide }) {
  const hi = language === 'hi';
  return <nav className={styles.breadcrumbs} aria-label={hi ? 'पृष्ठ का मार्ग' : 'Breadcrumb'}><ol>
    <li><a href="/">{hi ? 'होम' : 'Home'}</a><ChevronRight size={14} aria-hidden="true" /></li>
    <li>{guide ? <><a href="/guides">{hi ? 'मार्गदर्शिकाएँ' : 'Guides'}</a><ChevronRight size={14} aria-hidden="true" /></> : <span aria-current="page">{hi ? 'मार्गदर्शिकाएँ' : 'Guides'}</span>}</li>
    {guide ? <li><span aria-current="page">{topics[guide.slug]?.label[hi ? 1 : 0] ?? guide.title[hi ? 1 : 0]}</span></li> : null}
  </ol></nav>;
}

export function CivicGuidesHub({ guides }: { guides: readonly CivicGuide[] }) {
  const [language, setLanguage] = useState<Language>('en');
  const hi = language === 'hi';
  const t = (en: string, hindi: string) => hi ? hindi : en;
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="नागरिक मार्गदर्शिकाएँ">
    <main className={styles.page}>
      <Breadcrumbs language={language} />
      <header className={styles.hubHero}>
        <p className={styles.eyebrow}><BookOpen size={17} aria-hidden="true" />{t('The ChallanSakshi guidebook', 'ChallanSakshi की मार्गदर्शिकाएँ')}</p>
        <h1>{t('Challan & FASTag guides.', 'चालान और FASTag मार्गदर्शिकाएँ।')}</h1>
        <p className={styles.lede}>{t('Something doesn’t look right? Start with the facts, know what to keep, and find a practical next step.', 'कुछ सही नहीं लग रहा? तथ्यों से शुरू करें, जानें क्या सँभालकर रखना है और अगला उपयोगी कदम पाएँ।')}</p>
        <div className={styles.principles}><span>{t('Free to read', 'पढ़ना मुफ़्त')}</span><span>{t('No account needed', 'खाते की ज़रूरत नहीं')}</span><span>{t('Links to official sources', 'आधिकारिक स्रोतों के लिंक')}</span></div>
      </header>
      <section className={styles.cards} aria-label={t('Choose a guide', 'एक मार्गदर्शिका चुनें')}>{guides.map(guide => <GuideCard key={guide.slug} guide={guide} language={language} />)}</section>
      <aside className={styles.hubNote}>
        <div><h2>{t('Read first. Use a tool when you’re ready.', 'पहले समझें। तैयार हों तो उपकरण इस्तेमाल करें।')}</h2><p>{t('Each guide explains a common situation and links to a free preparation tool. ChallanSakshi is an independent civic project by Shourya Banda, also known as sh1rs.', 'हर मार्गदर्शिका एक आम स्थिति समझाती है और मुफ़्त तैयारी उपकरण का लिंक देती है। ChallanSakshi, Shourya Banda (sh1rs) की स्वतंत्र नागरिक परियोजना है।')}</p></div>
        <a href="/about">{t('About the project', 'परियोजना के बारे में')}<ArrowUpRight size={18} aria-hidden="true" /></a>
      </aside>
    </main>
  </PublicBetaShell>;
}

export function CivicGuideArticle({ guide, relatedGuides }: { guide: CivicGuide; relatedGuides: readonly CivicGuide[] }) {
  const [language, setLanguage] = useState<Language>('en');
  const index = language === 'hi' ? 1 : 0;
  const t = (en: string, hindi: string) => index ? hindi : en;
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="नागरिक मार्गदर्शिका">
    <main className={`${styles.page} ${styles.articlePage}`}>
      <Breadcrumbs language={language} guide={guide} />
      <article>
        <header className={styles.articleHero}>
          <p className={styles.eyebrow}>{topics[guide.slug]?.label[index]}<span aria-hidden="true">/</span>{t('A practical guide', 'एक उपयोगी मार्गदर्शिका')}</p>
          <h1>{guide.title[index]}</h1>
          <p className={styles.lede}>{guide.description[index]}</p>
          <div className={styles.byline}><span>{t('By', 'लेखक')} <a href="https://sh1rs.com" target="_blank" rel="noopener noreferrer">Shourya Banda · sh1rs</a></span><span>{guide.readMinutes} {t('min read', 'मिनट पढ़ने का समय')}</span><span>{t('Updated', 'अपडेट')} <time dateTime={guide.updatedAt}>{dateLabel(guide.updatedAt, language)}</time></span></div>
        </header>

        <div className={styles.articleLayout}>
          <div className={styles.articleBody}>
            <section className={styles.answer} aria-labelledby="guide-answer"><p className={styles.sectionLabel} id="guide-answer">{t('The starting point', 'शुरुआत यहाँ से करें')}</p><p>{guide.answer[index]}</p></section>
            <nav className={styles.jumpLinks} aria-label={t('In this guide', 'इस मार्गदर्शिका में')}><span>{t('In this guide', 'इस मार्गदर्शिका में')}</span><a href="#guide-checklist">{t('What to keep', 'क्या सँभालकर रखें')}</a><a href="#guide-steps">{t('What to do', 'क्या करें')}</a><a href="#guide-sources">{t('Sources', 'स्रोत')}</a></nav>

            <section className={styles.section} aria-labelledby="guide-checklist"><p className={styles.sectionLabel}>{t('01 / Get organised', '01 / व्यवस्थित करें')}</p><h2 id="guide-checklist">{t('Keep these details together.', 'ये विवरण एक साथ रखें।')}</h2><ul className={styles.checklist}>{guide.checklist.map(item => <li key={item[0]}>{item[index]}</li>)}</ul></section>

            <section className={styles.section} aria-labelledby="guide-steps"><p className={styles.sectionLabel}>{t('02 / Take the next step', '02 / अगला कदम उठाएँ')}</p><h2 id="guide-steps">{t('Work through it, one step at a time.', 'एक-एक कदम करके आगे बढ़ें।')}</h2><ol className={styles.steps}>{guide.steps.map((step, stepIndex) => <li key={step.title[0]}><span className={styles.stepNumber} aria-hidden="true">{String(stepIndex + 1).padStart(2, '0')}</span><div><h3>{step.title[index]}</h3><p>{step.body[index]}</p></div></li>)}</ol></section>

            <aside className={styles.caution} aria-labelledby="guide-caution"><h2 id="guide-caution">{t('A limit to keep in mind', 'एक सीमा ध्यान में रखें')}</h2><p>{guide.caution[index]}</p></aside>

            <section className={styles.sources} aria-labelledby="guide-sources"><p className={styles.sectionLabel}>{t('03 / Check the source', '03 / स्रोत जाँचें')}</p><h2 id="guide-sources">{t('Official sources & review notes', 'आधिकारिक स्रोत और समीक्षा नोट')}</h2><p className={styles.reviewScope}>{t('Source links and the general preparation guidance were checked on', 'स्रोत लिंक और सामान्य तैयारी मार्गदर्शन की जाँच की गई:')} <time dateTime={guide.updatedAt}>{dateLabel(guide.updatedAt, language)}</time>. {t('This review covers public guidance, not a decision on your case. Portal steps, applicable rules and available services can change; confirm your situation with the relevant official service.', 'यह समीक्षा सार्वजनिक मार्गदर्शन की है, आपके मामले के निर्णय की नहीं। पोर्टल के चरण, लागू नियम और उपलब्ध सेवाएँ बदल सकती हैं; संबंधित आधिकारिक सेवा से अपनी स्थिति की पुष्टि करें।')}</p><ul>{guide.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={17} aria-hidden="true" /><span className={styles.srOnly}>{t(' (opens in a new tab)', ' (नए टैब में खुलेगा)')}</span></a><p>{source.note[index]}</p><span className={styles.sourceHost}>{new URL(source.url).hostname}</span></li>)}</ul><a className={styles.textLink} href="/sources">{t('See the official-service directory', 'आधिकारिक सेवा निर्देशिका देखें')}<ArrowRight size={17} aria-hidden="true" /></a></section>
          </div>

          <aside className={styles.toolAside} aria-labelledby="guide-tool"><span className={styles.toolIcon}><BookOpen size={25} aria-hidden="true" /></span><p className={styles.sectionLabel}>{t('Put the guide into practice', 'मार्गदर्शिका से तैयारी करें')}</p><h2 id="guide-tool">{t('Your records. Your next step.', 'आपके रिकॉर्ड। आपका अगला कदम।')}</h2><p>{t('Use the free tool to organise what you know and prepare a next step you can review.', 'जो जानते हैं उसे व्यवस्थित करने और अपनी समीक्षा के लिए अगला कदम तैयार करने हेतु मुफ़्त उपकरण इस्तेमाल करें।')}</p><a className={styles.primaryAction} href={guide.nextAction.href}>{guide.nextAction.label[index]}<ArrowRight size={18} aria-hidden="true" /></a><p className={styles.toolBoundary}>{t('No sign-up needed. Documents are read on this device. You control any official submission.', 'साइन-अप की ज़रूरत नहीं। दस्तावेज़ इसी डिवाइस पर पढ़े जाते हैं। कोई भी आधिकारिक सबमिशन आपके नियंत्रण में है।')}</p></aside>
        </div>
      </article>

      {relatedGuides.length ? <section className={styles.related} aria-labelledby="related-guides"><div className={styles.relatedHeading}><h2 id="related-guides">{t('More everyday questions.', 'रोज़मर्रा के और सवाल।')}</h2><a href="/guides">{t('All guides', 'सभी मार्गदर्शिकाएँ')}<ArrowRight size={17} aria-hidden="true" /></a></div><div className={styles.relatedCards}>{relatedGuides.map(related => <GuideCard key={related.slug} guide={related} language={language} />)}</div></section> : null}
    </main>
  </PublicBetaShell>;
}
