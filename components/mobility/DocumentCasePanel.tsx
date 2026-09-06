'use client';
import { useState } from 'react';
import type { DocumentEvidence } from '../../lib/document-evidence';
import { buildDocumentCase, JURISDICTIONS } from '../../lib/mobility/document-bridge';
import { saveCase } from '../../lib/mobility/store';
import { updateCase, type MobilityCase } from '../../lib/mobility/cases';
import styles from './DocumentCasePanel.module.css';

export default function DocumentCasePanel({ evidence, jurisdictionHint, language, device, ensureActive }: { evidence: DocumentEvidence; jurisdictionHint: string; language: 'en' | 'hi'; device: 'unknown' | 'private' | 'shared'; ensureActive: () => boolean }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [jurisdiction, setJurisdiction] = useState(jurisdictionHint);
  const [draft, setDraft] = useState(() => buildDocumentCase(evidence, jurisdictionHint, language, new Date().toISOString(), 'preview').draft);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');
  const [savedCase, setSavedCase] = useState<MobilityCase | null>(null);
  const save = () => {
    if (device !== 'private' || !ensureActive()) return;
    try {
      const now = new Date().toISOString();
      const item = savedCase ? updateCase(savedCase, { jurisdiction, draft }, now) : buildDocumentCase(evidence, jurisdiction, language, now, crypto.randomUUID());
      item.draft = draft;
      saveCase(item);
      setSavedCase(item);
      setSavedId(item.id); setError('');
    } catch { setError(t('Could not save this case. Keep a downloaded copy and try again on your private browser.', 'यह मामला सहेजा नहीं जा सका। डाउनलोड की गई कॉपी रखें और निजी ब्राउज़र में दोबारा कोशिश करें।')); }
  };
  return <section className={styles.panel} aria-labelledby="connected-request-heading">
    <h2 id="connected-request-heading">{t('Continue with a saved case', 'सहेजे गए मामले के साथ आगे बढ़ें')}</h2>
    <p>{t('Your readings are included, with unclear values marked for checking. The request uses the details you confirmed. Edit the wording, then keep your request and follow-up together.', 'आपके विवरण शामिल हैं और अस्पष्ट विवरण जाँच के लिए चिह्नित हैं। अनुरोध में आपके पुष्टि किए विवरण हैं। शब्द बदलें और अनुरोध व आगे की कार्रवाई साथ रखें।')}</p>
    <label>{t('Issuing state or territory', 'जारी करने वाला राज्य या क्षेत्र')}<select value={jurisdiction} onChange={event => { setJurisdiction(event.target.value); setSavedId(''); }}><option value="">{t('Not sure yet', 'अभी निश्चित नहीं')}</option>{JURISDICTIONS.map(state => <option key={state}>{state}</option>)}</select></label>
    {jurisdictionHint && <small>{t('Suggested from an explicit label in your notice. Please check it.', 'चालान के स्पष्ट लेबल से सुझाया गया है। कृपया जाँचें।')}</small>}
    <label>{t('Your request', 'आपका अनुरोध')}<textarea aria-label={t('Your request', 'आपका अनुरोध')} value={draft} maxLength={16000} rows={8} onChange={event => { setDraft(event.target.value); setSavedId(''); }} /></label>
    {device === 'private' ? <>
      <p className={styles.consent}>{t('Saving keeps these readings, source-file fingerprints and your request in this browser for up to 90 days. Anyone using this browser can read them. Original documents stay with you. You can delete the saved case at any time.', 'सहेजने पर विवरण, स्रोत फ़ाइल फ़िंगरप्रिंट और अनुरोध इस ब्राउज़र में 90 दिन तक रहते हैं। इस ब्राउज़र का उपयोग करने वाला इन्हें पढ़ सकता है। मूल दस्तावेज़ आपके पास रहते हैं। सहेजा मामला कभी भी मिटा सकते हैं।')}</p>
      {savedId ? <a className={styles.action} href={`/mobility#case=${encodeURIComponent(savedId)}`}>{t('Open my saved case', 'मेरा सहेजा मामला खोलें')}</a> : <button className={styles.action} onClick={save} disabled={!draft.trim()}>{t('Save this case on my private device', 'मेरे निजी डिवाइस पर यह मामला सहेजें')}</button>}
    </> : <p>{t('Choose “My private device” above to save and resume this case.', 'इसे सहेजने और फिर खोलने के लिए ऊपर “मेरा निजी डिवाइस” चुनें।')}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
