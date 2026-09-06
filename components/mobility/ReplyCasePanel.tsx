'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FolderPlus } from 'lucide-react';
import type { MobilityCase } from '../../lib/mobility/cases';
import { prepareReplyFollowUp, saveReviewedReplyFollowUp } from '../../lib/mobility/reply-case';
import { MOBILITY_STORE_EVENT, readCases } from '../../lib/mobility/store';
import { getService } from '../../lib/mobility/services';
import styles from './ReplyCasePanel.module.css';

type Props = { note: string; language: 'en' | 'hi'; privateDevice: boolean; ensureActive: () => boolean };
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'Could not prepare this local case.';

export default function ReplyCasePanel(props: Props) {
  return <CurrentReplyCase key={JSON.stringify([props.note, props.language, props.privateDevice])} {...props} />;
}
function CurrentReplyCase({ note, language, privateDevice, ensureActive }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<MobilityCase[] | null>(null);
  const [parent, setParent] = useState<MobilityCase | undefined>();
  const [preview, setPreview] = useState<MobilityCase | null>(null);
  const [consent, setConsent] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');
  const saving = useRef(false);
  useEffect(() => {
    if (!open || !parent) return;
    const invalidate = () => { setStale(true); setConsent(false); setPreview(null); };
    window.addEventListener(MOBILITY_STORE_EVENT, invalidate);
    return () => window.removeEventListener(MOBILITY_STORE_EVENT, invalidate);
  }, [open, parent]);
  function reset() { setCases(null); setParent(undefined); setPreview(null); setConsent(false); setStale(false); setError(''); setSavedId(''); saving.current = false; }
  function build(related?: MobilityCase) {
    setConsent(false); setError(''); setStale(false); setSavedId('');
    try { setPreview(prepareReplyFollowUp(note, language, related)); } catch (cause) { setPreview(null); setError(errorText(cause)); }
  }
  function toggle(next: boolean) { reset(); setOpen(next); if (next && privateDevice && ensureActive()) build(); }
  function chooseRelated() {
    if (!privateDevice || !ensureActive()) { reset(); setOpen(false); return; }
    setConsent(false); setParent(undefined); setPreview(null); setSavedId('');
    try { setCases(readCases()); setStale(false); setError(''); build(); } catch (cause) { setCases(null); setError(errorText(cause)); }
  }
  function select(id: string) {
    if (!privateDevice || !ensureActive()) { reset(); setOpen(false); return; }
    const selected = cases?.find(item => item.id === id); setParent(selected); build(selected);
  }
  function save() {
    // Recheck the reply tool's privacy lifetime before any store access or creation.
    if (!ensureActive()) { reset(); setOpen(false); return; }
    if (!privateDevice || !preview || !consent || stale || saving.current || savedId) return;
    saving.current = true;
    try {
      const saved = saveReviewedReplyFollowUp(preview, { note, language, relatedCase: parent, consent });
      setSavedId(saved.id); setConsent(false); setPreview(saved); setStale(false); setError('');
    } catch (cause) { setError(errorText(cause)); setConsent(false); if (/changed|deleted|expired|stale/iu.test(errorText(cause))) { setStale(true); setPreview(null); } }
    finally { saving.current = false; }
  }
  return <details className={styles.panel} open={open} onToggle={event => { if (event.currentTarget.open !== open) toggle(event.currentTarget.open); }}>
    <summary onClick={event => { event.preventDefault(); toggle(!open); }}><FolderPlus size={16} />{t('Continue this reply as a case', 'इस उत्तर को केस के रूप में आगे बढ़ाएँ')}</summary>
    {open && <div className={styles.body}>
      {!privateDevice ? <p>{t('Choose “My private device” above before preparing a saved case. No saved cases have been read.', 'सहेजा केस तैयार करने से पहले ऊपर “मेरा निजी डिवाइस” चुनें। कोई सहेजा केस नहीं पढ़ा गया।')}</p> : <>
        <p>{t('Start a separate preparation from the exact note you reviewed. Existing submitted or completed cases keep their history. Reply words do not determine the new case status.', 'जाँचे हुए पूरे नोट से अलग तैयारी शुरू करें। पहले भेजे या पूरे हुए केस का इतिहास बना रहेगा। उत्तर के शब्द नए केस की स्थिति तय नहीं करते।')}</p>
        {!savedId && <><button type="button" onClick={chooseRelated}>{t('Choose a related case (optional)', 'संबंधित केस चुनें (वैकल्पिक)')}</button>
          {cases && <label>{t('Related saved case', 'संबंधित सहेजा केस')}<select aria-label={t('Related saved case', 'संबंधित सहेजा केस')} value={parent?.id ?? ''} onChange={event => select(event.target.value)}><option value="">{t('Start without a related case', 'संबंधित केस के बिना शुरू करें')}</option>{cases.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
          {cases?.length === 0 && <p>{t('No cases are saved on this device. You can start a new preparation.', 'इस डिवाइस पर कोई केस सहेजा नहीं है। आप नई तैयारी शुरू कर सकते हैं।')}</p>}
          {parent && <p className={styles.notice}>{t('The selected case supplies its service, state, reference and facts only. Copied facts need a fresh check. Its draft, completion, appointment and history stay with the original case.', 'चुने केस से केवल सेवा, राज्य, संदर्भ और विवरण लिए जाएँगे। कॉपी किए विवरण फिर जाँचने होंगे। उसका मसौदा, पूर्णता, अपॉइंटमेंट और इतिहास मूल केस में रहेंगे।')}</p>}
        </>}
        {error && <p className={styles.warning} role="alert">{error}</p>}
        {stale && !savedId && <div className={styles.warning} role="status"><p>{t('Saved case details changed. Your old selection cannot be used. Choose the related case again and review the full preview.', 'सहेजे केस के विवरण बदले हैं। पुराना चयन उपयोग नहीं हो सकता। संबंधित केस फिर चुनकर पूरी समीक्षा करें।')}</p><button type="button" onClick={chooseRelated}>{t('Reload related cases', 'संबंधित केस फिर लोड करें')}</button></div>}
        {preview && !savedId && <section className={styles.preview} aria-label={t('Review the new follow-up case', 'नए फ़ॉलो-अप केस की समीक्षा')}>
          <h3>{t('New case · Preparing', 'नया केस · तैयारी जारी')}</h3><p>{t('Review the details and your full note below. No original reply text is added beyond this reviewed note.', 'नीचे विवरण और अपना पूरा नोट जाँचें। जाँचे नोट से बाहर मूल उत्तर का कोई पाठ नहीं जोड़ा जाएगा।')}</p>
          <dl className={styles.context}>
            <div><dt>{t('Case name', 'केस का नाम')}</dt><dd>{preview.title}</dd></div>
            <div><dt>{t('Service', 'सेवा')}</dt><dd>{getService(preview.service).title[language]}</dd></div>
            <div><dt>{t('State / authority', 'राज्य / प्राधिकरण')}</dt><dd>{preview.jurisdiction || t('Not added', 'नहीं जोड़ा गया')}</dd></div>
            <div><dt>{t('Reference', 'संदर्भ')}</dt><dd>{preview.reference || t('Not added', 'नहीं जोड़ा गया')}</dd></div>
            <div><dt>{t('Prepared on', 'तैयार किया गया')}</dt><dd>{new Date(preview.createdAt).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</dd></div>
          </dl>
          <small>{t('Saved cases expire 90 days after their last save. This new case has no completed steps or appointment yet.', 'सहेजे केस अंतिम बार सहेजने के 90 दिन बाद हटते हैं। इस नए केस में अभी कोई पूरा चरण या अपॉइंटमेंट नहीं है।')}</small>
          <div><h4>{t('Details copied into this case', 'इस केस में कॉपी किए विवरण')}</h4>{preview.facts.length === 0 ? <p>{t('No details are being copied from another case.', 'दूसरे केस से कोई विवरण कॉपी नहीं हो रहा।')}</p> : <ul className={styles.facts}>{preview.facts.map(fact => <li key={fact.key}><strong>{fact.label}</strong><p>{fact.value}</p><small>{t('Source', 'स्रोत')}: {fact.source === 'document' ? t('Document reading', 'दस्तावेज़ की रीडिंग') : fact.source === 'profile' ? t('Reusable profile', 'पुनः उपयोग प्रोफ़ाइल') : t('Entered by you', 'आपकी दर्ज जानकारी')} · {t('Needs your fresh check in this case', 'इस केस में आपको फिर जाँचना है')}</small></li>)}</ul>}</div>
          <div><h4>{t('Your complete reply follow-up note', 'उत्तर के बाद आपका पूरा नोट')}</h4><pre className={styles.note} tabIndex={0} data-reply-case-note>{preview.draft}</pre></div>
          <details className={styles.metadata}><summary>{t('All case fields and source metadata (optional)', 'केस के सभी फ़ील्ड और स्रोत जानकारी (वैकल्पिक)')}</summary><label>{t('Exact new case contents', 'नए केस की पूरी सामग्री')}<textarea aria-label={t('Exact new case contents', 'नए केस की पूरी सामग्री')} readOnly rows={10} value={JSON.stringify(preview, null, 2)} spellCheck={false} /></label></details>
          <label className={styles.check}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />{t('I reviewed every included detail. Save this separate case unencrypted on my private device for up to 90 days.', 'मैंने शामिल हर विवरण जाँच लिया है। यह अलग केस मेरे निजी डिवाइस पर बिना एन्क्रिप्शन अधिकतम 90 दिन सहेजें।')}</label>
          <button type="button" className={styles.primary} disabled={!consent || stale} onClick={save}>{t('Save this follow-up case on my private device', 'यह फ़ॉलो-अप केस मेरे निजी डिवाइस पर सहेजें')}</button>
        </section>}
        {savedId && <div className={styles.notice} role="status"><p>{t('Saved a separate preparation case on this device. Nothing was submitted and existing cases were not updated.', 'इस डिवाइस पर अलग तैयारी केस सहेजा गया। कुछ भेजा नहीं गया और पुराने केस बदले नहीं गए।')}</p><a href={`/mobility#case=${encodeURIComponent(savedId)}`}>{t('Open my saved follow-up case', 'मेरा सहेजा फ़ॉलो-अप केस खोलें')}<ArrowRight size={16} /></a></div>}
        <small>{t('Anyone using this browser may be able to read saved cases. The complete original reply and attachments remain yours to keep separately.', 'इस ब्राउज़र का उपयोग करने वाला सहेजे केस पढ़ सकता है। पूरा मूल उत्तर और संलग्नक अलग से रखें।')}</small>
      </>}
      <button type="button" onClick={() => toggle(false)}>{t('Close this case preview', 'इस केस की समीक्षा बंद करें')}</button>
    </div>}
  </details>;
}
