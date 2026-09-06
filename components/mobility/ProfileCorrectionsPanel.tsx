'use client';

import { useEffect, useId, useState } from 'react';
import { applyProfileCorrections, buildProfileCorrectionPreview, type ProfileCorrectionExclusion, type ProfileCorrectionPreview } from '../../lib/mobility/profile-corrections';
import { MOBILITY_STORE_EVENT, readCases, readProfile } from '../../lib/mobility/store';
import styles from './ProfileCorrectionsPanel.module.css';

export default function ProfileCorrectionsPanel({ language }: { language: 'en' | 'hi' }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ProfileCorrectionPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    const changed = () => { setStale(true); setSelected([]); };
    window.addEventListener(MOBILITY_STORE_EVENT, changed);
    return () => window.removeEventListener(MOBILITY_STORE_EVENT, changed);
  }, [open]);

  function refresh() {
    setSelected([]); setMessage(''); setError('');
    try {
      const profile = readProfile();
      setPreview(profile ? buildProfileCorrectionPreview(profile, readCases()) : null);
      setStale(false);
      return true;
    } catch (cause) {
      setPreview(null); setStale(true);
      setError(cause instanceof Error ? cause.message : t('Saved details could not be read.', 'सहेजी जानकारी पढ़ी नहीं जा सकी।'));
      return false;
    }
  }

  function toggle() {
    if (!open) refresh();
    else { setPreview(null); setSelected([]); setError(''); setMessage(''); }
    setOpen(!open);
  }

  function apply() {
    if (!preview || stale || selected.length === 0) return;
    try {
      const updated = applyProfileCorrections(preview, selected, new Date().toISOString(), language);
      refresh();
      setMessage(t(
        `${updated.length} saved draft${updated.length === 1 ? '' : 's'} updated. Reopen each draft to confirm changed facts and recheck its wording. Any open editor keeps its current work until you choose to reload.`,
        `${updated.length} सहेजे मसौदे सुधारे गए। बदले तथ्यों की पुष्टि और शब्दों की दोबारा जाँच के लिए हर मसौदा खोलें। खुला संपादक आपका वर्तमान काम रखेगा, जब तक आप फिर लोड करना न चुनें।`,
      ));
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : t('Corrections could not be saved.', 'सुधार सहेजे नहीं जा सके।');
      if (/stale|conflict|deleted|expired/iu.test(detail)) {
        const refreshed = refresh();
        setError(t(
          refreshed ? 'Nothing was changed by this attempt. Saved data changed after the preview. The preview has been refreshed; review and select drafts again.' : 'Nothing was changed by this attempt. Saved data changed and could not be refreshed. Try refreshing the preview again.',
          refreshed ? 'इस प्रयास से कोई बदलाव नहीं हुआ। पूर्वावलोकन के बाद सहेजी जानकारी बदली थी। नया पूर्वावलोकन तैयार है; फिर जाँचकर मसौदे चुनें।' : 'इस प्रयास से कोई बदलाव नहीं हुआ। सहेजी जानकारी बदली और नया पूर्वावलोकन नहीं बन सका। फिर से पूर्वावलोकन लोड करें।',
        ));
      } else setError(detail);
    }
  }

  function exclusionText(reason: ProfileCorrectionExclusion['reason']): string {
    switch (reason) {
      case 'completed': return t('Completed case: its saved history is kept.', 'पूरा केस: इसका सहेजा इतिहास रखा जाएगा।');
      case 'awaiting-response': return t('Awaiting a response: its saved history is kept.', 'उत्तर की प्रतीक्षा: इसका सहेजा इतिहास रखा जाएगा।');
      case 'citizen-reported': return t('You have recorded an update here. Its history is kept because it may describe an action already taken.', 'आपने यहाँ अपडेट दर्ज किया है। किए हुए काम की जानकारी हो सकती है, इसलिए इतिहास रखा जाएगा।');
      case 'no-profile-facts': return t('No copied profile fields to correct. Your entries and document readings are kept.', 'सुधारने के लिए प्रोफ़ाइल से लिए तथ्य नहीं हैं। आपकी प्रविष्टियाँ और दस्तावेज़ से पढ़ी जानकारी रखी जाएगी।');
      case 'missing-profile-value': return t('The copied field or vehicle is no longer in the saved profile. Check this draft yourself.', 'लिया गया तथ्य या वाहन अब सहेजी प्रोफ़ाइल में नहीं है। इस मसौदे को स्वयं जाँचें।');
      case 'event-limit': return t('This case has reached its 200-entry timeline limit. Download its note before starting a new draft.', 'इस केस की समयरेखा में 200 प्रविष्टियाँ हो गई हैं। नया मसौदा शुरू करने से पहले इसका नोट डाउनलोड करें।');
    }
  }

  const changedFacts = preview?.cases.reduce((count, item) => count + (selected.includes(item.original.id) ? item.changes.length : 0), 0) ?? 0;
  const emptyValue = t('(empty)', '(खाली)');

  return <section className={styles.root} aria-label={t('Profile corrections', 'प्रोफ़ाइल सुधार')}>
    <button type="button" className={styles.trigger} aria-expanded={open} aria-controls={panelId} onClick={toggle}>
      {open ? t('Close correction review', 'सुधार समीक्षा बंद करें') : t('Review profile corrections', 'प्रोफ़ाइल सुधारों की समीक्षा करें')}
    </button>
    {open && <div id={panelId} className={styles.panel}>
      <h3>{t('Update saved drafts', 'सहेजे मसौदे सुधारें')}</h3>
      <p>{t('Compare saved reusable details with fields already copied into your drafts. Choose each draft to update after reviewing the changes.', 'सहेजी दोबारा उपयोग की जानकारी की तुलना मसौदों में पहले से लिए तथ्यों से करें। बदलाव जाँचकर सुधारने वाले मसौदे चुनें।')}</p>
      <p className={styles.hint}>{t('This uses the saved profile. Save any profile edits first. Changes stay on this device; you will confirm the changed facts and recheck the existing draft wording.', 'इसमें सहेजी प्रोफ़ाइल का उपयोग होता है। प्रोफ़ाइल के बदलाव पहले सहेजें। सुधार इसी डिवाइस पर रहेंगे; बदले तथ्य और पुराने मसौदे के शब्द फिर जाँचने होंगे।')}</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {message && <p role="status" className={styles.success}>{message}</p>}
      {stale && <p role="status" className={styles.warning}>{t('Saved details changed. Refresh the preview before choosing drafts.', 'सहेजी जानकारी बदल गई है। मसौदे चुनने से पहले पूर्वावलोकन फिर लोड करें।')}</p>}
      <button type="button" onClick={refresh}>{t('Refresh correction preview', 'सुधार पूर्वावलोकन फिर लोड करें')}</button>
      {!preview && !error && <p>{t('Save reusable details on your private device to compare them with saved drafts.', 'सहेजे मसौदों से तुलना के लिए अपने निजी डिवाइस पर दोबारा उपयोग की जानकारी सहेजें।')}</p>}
      {preview && <>
        <p className={styles.counts}>{t(
          `${preview.cases.length} drafts with corrections · ${preview.unchangedCount} already match · ${preview.excluded.length} excluded`,
          `${preview.cases.length} मसौदों में सुधार · ${preview.unchangedCount} पहले से मेल खाते हैं · ${preview.excluded.length} बाहर रखे गए`,
        )}</p>
        {preview.cases.length === 0 && <p>{t('No saved drafts are available for profile corrections.', 'प्रोफ़ाइल सुधार के लिए कोई सहेजा मसौदा उपलब्ध नहीं है।')}</p>}
        {preview.cases.map(item => <article key={item.original.id} className={styles.draft}>
          <label className={styles.selection}>
            <input type="checkbox" disabled={stale} checked={selected.includes(item.original.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.original.id] : previous.filter(id => id !== item.original.id))} />
            <span>{t('Update', 'सुधारें')}: <strong>{item.original.title}</strong></span>
          </label>
          <small>{item.original.jurisdiction || t('Jurisdiction not added', 'क्षेत्र नहीं जोड़ा गया')} · {t('Saved', 'सहेजा')}: {new Date(item.original.updatedAt).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</small>
          <dl className={styles.changes}>{item.changes.map(change => <div key={change.key}>
            <dt>{change.label}{change.nextLabel !== change.label && <> → {change.nextLabel}</>}</dt>
            <dd><span>{t('Before', 'पहले')}</span><p>{change.before || emptyValue}</p></dd>
            <dd><span>{t('After', 'बाद में')}</span><p>{change.after || emptyValue}</p></dd>
          </div>)}</dl>
          {item.preservedFacts > 0 && <small>{t(`${item.preservedFacts} other fields stay as they are, including your entries, document readings or details no longer in the profile.`, `${item.preservedFacts} अन्य तथ्य वैसे ही रहेंगे, जिनमें आपकी प्रविष्टियाँ, दस्तावेज़ से पढ़ी जानकारी या प्रोफ़ाइल से हटाई जानकारी शामिल है।`)}</small>}
          {item.original.status === 'ready' && <p className={styles.hint}>{t('This draft will return to Preparing so you can review the changed facts and wording.', 'यह मसौदा फिर तैयारी जारी में जाएगा ताकि आप बदले तथ्य और शब्द जाँच सकें।')}</p>}
        </article>)}
        {preview.cases.length > 0 && <div className={styles.apply}>
          <p>{t(`${selected.length} drafts selected · ${changedFacts} facts to correct`, `${selected.length} मसौदे चुने · ${changedFacts} तथ्य सुधारने हैं`)}</p>
          <button type="button" className={styles.primary} disabled={stale || selected.length === 0} onClick={apply}>
            {t('Apply reviewed corrections', 'जाँचे हुए सुधार लागू करें')}
          </button>
        </div>}
        {preview.excluded.length > 0 && <details className={styles.exclusions}>
          <summary>{t('Why some cases are excluded', 'कुछ केस बाहर क्यों हैं')} ({preview.excluded.length})</summary>
          <ul>{preview.excluded.map(item => <li key={item.caseId}><strong>{item.title}</strong><p>{exclusionText(item.reason)}</p></li>)}</ul>
        </details>}
      </>}
    </div>}
  </section>;
}
