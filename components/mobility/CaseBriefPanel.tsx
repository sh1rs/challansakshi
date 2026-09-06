'use client';
import { useId, useState } from 'react';
import type { MobilityCase } from '../../lib/mobility/cases';
import { buildCaseBrief, type CaseBriefOptions } from '../../lib/mobility/case-brief';
import { fingerprintCaseTeamInput } from '../../lib/mobility/case-team';
import styles from './AdviserPanel.module.css';

export default function CaseBriefPanel({ caseValue, language }: { caseValue: MobilityCase; language: 'en' | 'hi' }) {
  let fingerprint: string;
  try { fingerprint = fingerprintCaseTeamInput(caseValue, language); }
  catch { return <p>{language === 'hi' ? 'संक्षिप्त विवरण तैयार करने से पहले केस की जानकारी सही करें।' : 'Correct the case details before preparing a brief.'}</p>; }
  return <CurrentBrief key={fingerprint} caseValue={caseValue} language={language} />;
}
function CurrentBrief({ caseValue, language }: { caseValue: MobilityCase; language: 'en' | 'hi' }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const id = useId();
  const [options, setOptions] = useState<CaseBriefOptions>({ factKeys: [], includeDraft: false, includeReference: false, includeRecentUpdates: false });
  const [message, setMessage] = useState('');
  const brief = buildCaseBrief(caseValue, options, language);
  const download = () => {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'my-mobility-brief.txt'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(t('Brief downloaded. Share it only with someone you choose.', 'संक्षिप्त विवरण डाउनलोड हुआ। केवल अपने चुने व्यक्ति से साझा करें।'));
  };
  return <details className={styles.panel}>
    <summary>{t('Explain my case in a short brief', 'मेरा मामला संक्षेप में बताएँ')}</summary>
    <p>{t('A small note for a family member, a support desk or your next visit. Start without personal details, then choose what belongs in it. Everything stays on this device until you share the download yourself.', 'परिवार, सहायता केंद्र या अगली यात्रा के लिए छोटा नोट। शुरुआत बिना व्यक्तिगत जानकारी के करें, फिर ज़रूरी विवरण चुनें। डाउनलोड स्वयं साझा करने तक सब इस डिवाइस पर रहता है।')}</p>
    <fieldset><legend>{t('Details to explain (up to ten)', 'बताने के लिए विवरण (अधिकतम दस)')}</legend>
      {caseValue.facts.map(fact => <label key={fact.key}><input type="checkbox" checked={options.factKeys.includes(fact.key)} disabled={!options.factKeys.includes(fact.key) && options.factKeys.length >= 10} onChange={event => { setOptions({ ...options, factKeys: event.target.checked ? [...options.factKeys, fact.key] : options.factKeys.filter(key => key !== fact.key) }); setMessage(''); }} /><span>{t('Include', 'शामिल करें')} {fact.label}: {fact.value}</span></label>)}
      <label><input type="checkbox" checked={options.includeDraft} onChange={event => setOptions({ ...options, includeDraft: event.target.checked })} />{t('Include my draft wording', 'मेरे मसौदे की भाषा शामिल करें')}</label>
      <label><input type="checkbox" checked={options.includeReference} onChange={event => setOptions({ ...options, includeReference: event.target.checked })} />{t('Include my entered reference', 'मेरा दर्ज संदर्भ शामिल करें')}</label>
      <label><input type="checkbox" checked={options.includeRecentUpdates} onChange={event => setOptions({ ...options, includeRecentUpdates: event.target.checked })} />{t('Include my last three reported updates', 'मेरे अंतिम तीन दर्ज अपडेट शामिल करें')}</label>
    </fieldset>
    <div role="region" aria-labelledby={id} className={styles.preview}><h3 id={id}>{t('Preview my short brief', 'मेरा संक्षिप्त विवरण देखें')}</h3><p className={styles.draft}>{brief}</p></div>
    <button type="button" onClick={download}>{t('Download this brief', 'यह संक्षिप्त विवरण डाउनलोड करें')}</button>
    {message && <p role="status">{message}</p>}
  </details>;
}
