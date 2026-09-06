'use client';

import { useEffect, useId, useState } from 'react';
import { compareWorkingCase, hasReportedCaseHistory, type RecoveryChange } from '../../lib/mobility/case-recovery';
import type { MobilityCase } from '../../lib/mobility/cases';
import styles from './CaseRecoveryPanel.module.css';

type Props = { working: MobilityCase; saved: MobilityCase; language: 'en' | 'hi'; onRecover: (keys: string[], reviewedSaved: MobilityCase) => void };
const labels: Record<string, [string, string]> = { title: ['Case title', 'केस का नाम'], jurisdiction: ['State / issuing authority', 'राज्य / जारीकर्ता'], reference: ['Entered reference', 'दर्ज संदर्भ'], draft: ['Request wording', 'अनुरोध की भाषा'], followUpDate: ['Personal follow-up date', 'निजी फ़ॉलो-अप तारीख'], appointment: ['Entered appointment', 'दर्ज अपॉइंटमेंट'] };

export default function CaseRecoveryPanel(props: Props) {
  let changes: RecoveryChange[];
  try {
    changes = compareWorkingCase(props.working, props.saved);
  } catch {
    return <p>{props.language === 'hi' ? 'तुलना करने से पहले केस की जानकारी सही करें।' : 'Correct the working case details before comparing versions.'}</p>;
  }
  return <Comparison key={JSON.stringify([props.working, props.saved, props.language])} {...props} changes={changes} />;
}

function Comparison({ working, saved, language, onRecover, changes }: Props & { changes: RecoveryChange[] }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const id = useId(); const [selected, setSelected] = useState<string[]>([]);
  const reported = hasReportedCaseHistory(saved);
  useEffect(() => { const clear = () => setSelected([]); window.addEventListener('pagehide', clear); return () => window.removeEventListener('pagehide', clear); }, []);
  function value(change: RecoveryChange, side: 'saved' | 'working') {
    const item = change[side];
    if (item === undefined || item === '') return <p>{t('No value', 'कोई जानकारी नहीं')}</p>;
    if (typeof item === 'string') return <p className={styles.text}>{item}</p>;
    if ('value' in item) return <>
      <p className={styles.text}>{item.value}</p>
      <small>{item.label} · {item.confirmed ? t('Confirmed by you', 'आपके द्वारा जाँचा गया') : t('Needs your review', 'आपकी समीक्षा चाहिए')} · {item.source === 'document' ? t('From a supplied document', 'दिए दस्तावेज़ से') : item.source === 'profile' ? t('From reusable details', 'दोबारा उपयोग जानकारी से') : t('Entered by you', 'आपके द्वारा दर्ज')}</small>
      {(item.sourceId || item.sourceFingerprint || item.page) && <details><summary>{t('Source details', 'स्रोत विवरण')}</summary><p className={styles.text}>{[item.sourceId, item.page ? `${t('Page', 'पृष्ठ')} ${item.page}` : '', item.sourceFingerprint].filter(Boolean).join('\n')}</p></details>}
    </>;
    return <p className={styles.text}>{[new Date(item.at).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN'), item.venue, item.instructions].join('\n')}</p>;
  }
  return <details className={styles.panel} onToggle={event => { if (!event.currentTarget.open) setSelected([]); }}>
    <summary>{t('Compare and recover my edits', 'तुलना करके मेरे बदलाव वापस लाएँ')} ({changes.length})</summary>
    <p>{t('Compare your working details with the latest saved case. Select only the changes you want to carry into a new working draft. Nothing is saved by this step.', 'कार्यरत जानकारी को नवीनतम सहेजे केस से मिलाएँ। केवल वे बदलाव चुनें जिन्हें नए कार्यरत मसौदे में रखना है। इस चरण में कुछ सहेजा नहीं जाता।')}</p>
    {reported && <p role="status">{t('The saved case now has activity reported by you. Download your current note before reloading; carrying edits into that historical record is unavailable.', 'सहेजे केस में अब आपकी दर्ज गतिविधि है। फिर खोलने से पहले वर्तमान नोट डाउनलोड करें; पुराने रिकॉर्ड में बदलाव जोड़ना उपलब्ध नहीं है।')}</p>}
    <p>{t('The latest saved timeline and checklist are kept. Working timeline entries are not carried over. Download your note first if you need those entries; an unadded update stays in its editor. Carried facts need confirmation again.', 'नवीनतम सहेजी समयरेखा और सूची रखी जाती है। कार्यरत समयरेखा की प्रविष्टियाँ साथ नहीं आतीं। उनकी ज़रूरत हो तो पहले नोट डाउनलोड करें; बिना जोड़ा अपडेट अपने संपादक में रहता है। वापस लाए तथ्य फिर जाँचने होंगे।')}</p>
    {changes.length === 0 && <p>{t('Editable details match. Only history or progress may differ; reload to use the latest saved version.', 'संपादन योग्य जानकारी मिलती है। केवल इतिहास या प्रगति अलग हो सकती है; नवीनतम सहेजा संस्करण फिर खोलें।')}</p>}
    <div className={styles.changes}>{changes.map((change, index) => {
      const label = change.field === 'fact' ? change.label : labels[change.field][language === 'hi' ? 1 : 0];
      return <section className={styles.change} key={change.key} aria-labelledby={`${id}-${index}`}>
        <h4 id={`${id}-${index}`}>{label}</h4>
        <div className={styles.pair}><div><strong>{t('Latest saved', 'नवीनतम सहेजा')}</strong>{value(change, 'saved')}</div><div><strong>{t('My working version', 'मेरा कार्यरत संस्करण')}</strong>{value(change, 'working')}</div></div>
        <label><input type="checkbox" disabled={reported} checked={selected.includes(change.key)} onChange={event => setSelected(previous => event.target.checked ? [...previous, change.key] : previous.filter(key => key !== change.key))} />{t('Carry my change to', 'मेरा बदलाव वापस लाएँ:')} {label}</label>
      </section>;
    })}</div>
    <button type="button" disabled={reported || selected.length === 0} onClick={() => onRecover(selected, saved)}>{t('Use selected edits in a working draft', 'चुने बदलाव कार्यरत मसौदे में रखें')}</button>
    <small>{t('Review the resulting draft and choose private-device saving again. This comparison does not contact an authority.', 'बने मसौदे की समीक्षा करें और निजी डिवाइस पर सहेजना फिर चुनें। यह तुलना किसी प्राधिकरण से संपर्क नहीं करती।')}</small>
    {working.events.length !== saved.events.length && <small>{t(`Timeline entries: working ${working.events.length}, latest saved ${saved.events.length}.`, `समयरेखा प्रविष्टियाँ: कार्यरत ${working.events.length}, नवीनतम सहेजी ${saved.events.length}।`)}</small>}
  </details>;
}
