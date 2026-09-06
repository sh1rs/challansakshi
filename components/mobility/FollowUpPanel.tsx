'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Download, ExternalLink } from 'lucide-react';
import { type MobilityCase } from '../../lib/mobility/cases';
import { MOBILITY_STORE_EVENT, readCases } from '../../lib/mobility/store';
import {
  acknowledgeFollowUp, addFollowUpObservation, buildFollowUpCalendar, createFollowUp, fingerprintFollowUpEvidence,
  followUpAttention, followUpSummary, recordFailedFollowUp, scheduleFollowUp,
  type FollowUpRecord, type FollowUpStatus,
} from '../../lib/mobility/follow-up';
import { assertExactSavedFollowUpCase, deleteAllFollowUps, FOLLOW_UP_STORE_EVENT, readFollowUps, saveFollowUp } from '../../lib/mobility/follow-up-store';
import styles from './FollowUpPanel.module.css';

type Language = 'en' | 'hi';
const now = () => new Date().toISOString();
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function localInput(at = now()) { const date = new Date(at); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
const statuses: Record<FollowUpStatus, [string, string]> = { unknown: ['Unclear in my record', 'मेरे रिकॉर्ड में स्पष्ट नहीं'], pending: ['Pending in my record', 'मेरे रिकॉर्ड में लंबित'], 'needs-info': ['More information requested', 'और जानकारी माँगी गई'], completed: ['Completed in my record', 'मेरे रिकॉर्ड में पूरा'] };
const statusLabel = (status: FollowUpStatus, language: Language) => statuses[status][language === 'hi' ? 1 : 0];
function dateLabel(at: string, language: Language) { return new Date(at).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN'); }
function errorText(cause: unknown) { return cause instanceof Error ? cause.message : 'This local follow-up action could not be completed.'; }

export default function FollowUpPanel(props: { caseValue: MobilityCase; language: Language }) {
  return <CaseFollowUpEditor key={props.caseValue.id} {...props} />;
}

function CaseFollowUpEditor({ caseValue, language }: { caseValue: MobilityCase; language: Language }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState<FollowUpRecord | null>(null);
  const [sourceCase, setSourceCase] = useState<MobilityCase | null>(null);
  const [stale, setStale] = useState(false);
  const [sourceRemoved, setSourceRemoved] = useState(false);
  const [mode, setMode] = useState<'observation' | 'failed-check' | null>(null);
  const [status, setStatus] = useState<FollowUpStatus>('unknown');
  const [at, setAt] = useState(localInput);
  const [sourceLabel, setSourceLabel] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [consent, setConsent] = useState(false);
  const [evidenceHash, setEvidenceHash] = useState('');
  const [hashing, setHashing] = useState(false);
  const hashRun = useRef(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [calendar, setCalendar] = useState<{ record: FollowUpRecord; caseValue: MobilityCase } | null>(null);
  const caseChanged = Boolean(sourceCase && JSON.stringify(sourceCase) !== JSON.stringify(caseValue));

  const clearHeldRecord = useCallback(() => {
    hashRun.current += 1; setHashing(false); setCalendar(null);
    setRecord(null); setSourceCase(null); setMode(null); setStatus('unknown'); setAt(localInput());
    setSourceLabel(''); setReference(''); setNote(''); setNextDate(''); setEvidenceHash(''); setConsent(false);
    setMessage(''); setError(''); setStale(true); setSourceRemoved(true);
  }, []);
  const checkHeldRecord = useCallback((markChanged: boolean) => {
    if (!record) return;
    try {
      const cases = readCases(); const savedCase = cases.find(item => item.id === record.caseId);
      const savedRecord = readFollowUps(cases).find(item => item.caseId === record.caseId);
      if (!savedCase || (record.revision > 0 && !savedRecord)) { clearHeldRecord(); return; }
      if (markChanged || (savedRecord && savedRecord.revision !== record.revision) || (sourceCase && JSON.stringify(savedCase) !== JSON.stringify(sourceCase))) {
        setStale(true); setCalendar(null); hashRun.current += 1; setHashing(false);
      }
    } catch (cause) { clearHeldRecord(); setError(errorText(cause)); }
  }, [record, sourceCase, clearHeldRecord]);
  useEffect(() => {
    // Closing the disclosure must not detach deletion/expiry invalidation.
    const changed = () => checkHeldRecord(true);
    const focused = () => checkHeldRecord(false);
    window.addEventListener(FOLLOW_UP_STORE_EVENT, changed); window.addEventListener(MOBILITY_STORE_EVENT, changed); window.addEventListener('focus', focused);
    return () => { hashRun.current += 1; window.removeEventListener(FOLLOW_UP_STORE_EVENT, changed); window.removeEventListener(MOBILITY_STORE_EVENT, changed); window.removeEventListener('focus', focused); };
  }, [checkHeldRecord]);

  function load() {
    setError(''); setMessage(''); setCalendar(null); hashRun.current += 1; setHashing(false);
    try {
      const cases = readCases(); const saved = cases.find(item => item.id === caseValue.id);
      if (!saved || JSON.stringify(saved) !== JSON.stringify(caseValue)) throw new Error(t('Save or reload this case first. Follow-up entries must refer to the exact saved case.', 'पहले इस केस को सहेजें या फिर लोड करें। फ़ॉलो-अप प्रविष्टियाँ इसी सहेजे केस से जुड़नी चाहिए।'));
      const existing = readFollowUps(cases).find(item => item.caseId === saved.id) ?? createFollowUp(saved.id, now());
      setRecord(existing); setSourceCase(saved); setNextDate(existing.nextCheckDate); setStale(false); setSourceRemoved(false); setMode(null); setAt(localInput()); setSourceLabel(''); setReference(''); setNote(''); setEvidenceHash(''); setConsent(false);
    } catch (cause) { setRecord(null); setSourceCase(null); setStale(true); setError(errorText(cause)); }
  }
  function persist(event: React.FormEvent) {
    event.preventDefault(); if (!record || !sourceCase || !consent || stale || caseChanged || hashing) return;
    try {
      const savedAt = now(); let next = scheduleFollowUp(record, nextDate, savedAt);
      if (mode === 'observation') next = addFollowUpObservation(next, { status, observedAt: new Date(at).toISOString(), sourceLabel, reference, note, ...(evidenceHash ? { evidenceSha256: evidenceHash } : {}) }, savedAt);
      if (mode === 'failed-check') next = recordFailedFollowUp(next, { at: new Date(at).toISOString(), note }, savedAt);
      const saved = saveFollowUp(next, sourceCase, { consent });
      setRecord(saved); setStale(false); setMode(null); setNote(''); setEvidenceHash(''); setCalendar(null); setError('');
      setMessage(t('Saved your follow-up on this device. No official status was checked and no message was sent.', 'आपका फ़ॉलो-अप इस डिवाइस पर सहेजा गया। कोई आधिकारिक स्थिति नहीं जाँची और कोई संदेश नहीं भेजा गया।'));
    } catch (cause) { setError(errorText(cause)); if (/stale|changed|expired|deleted/iu.test(errorText(cause))) { setStale(true); setCalendar(null); } }
  }
  function chooseMode(next: 'observation' | 'failed-check') {
    hashRun.current += 1; setHashing(false); setMode(mode === next ? null : next); setAt(localInput()); setNote(''); setEvidenceHash(''); setCalendar(null);
  }
  async function hashEvidence(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; setEvidenceHash('');
    if (!file) return;
    const run = ++hashRun.current; setHashing(true); setError('');
    try {
      if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error(t('Choose a non-empty file of at most 5 MiB.', 'अधिकतम 5 MiB की गैर-खाली फ़ाइल चुनें।'));
      const hash = fingerprintFollowUpEvidence(new Uint8Array(await file.arrayBuffer()));
      if (run === hashRun.current) setEvidenceHash(hash);
    } catch (cause) { if (run === hashRun.current) setError(errorText(cause)); }
    finally { if (run === hashRun.current) setHashing(false); }
  }
  function downloadCalendar() {
    if (!calendar || stale || caseChanged) return;
    try {
      assertExactSavedFollowUpCase(calendar.caseValue);
      const current = readFollowUps().find(item => item.caseId === calendar.record.caseId);
      if (!current || current.revision !== calendar.record.revision) throw new Error('The saved reminder changed. Reload and review the calendar reminder again.');
      const content = buildFollowUpCalendar(calendar.caseValue, current, now(), language);
      const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `follow-up-${current.caseId}.ics`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setMessage(t('Downloaded your personal calendar reminder. Import it into your own calendar; ChallanSakshi does not send reminders.', 'आपका निजी कैलेंडर अनुस्मारक डाउनलोड हुआ। इसे अपने कैलेंडर में जोड़ें; चालान साक्षी अनुस्मारक नहीं भेजता।')); setError('');
    } catch (cause) { setError(errorText(cause)); setCalendar(null); }
  }
  const summary = record ? followUpSummary(record, now()) : null;
  const latest = summary?.latestObservation;

  return <details className={styles.panel} open={open} onToggle={event => { const isOpen = event.currentTarget.open; if (isOpen) { if (record) checkHeldRecord(false); else if (!sourceRemoved) load(); } setOpen(isOpen); }}>
    <summary>{t('My follow-up records & reminder', 'मेरे फ़ॉलो-अप रिकॉर्ड और अनुस्मारक')}</summary>
    {open && <div className={styles.body}>
      <p>{t('Record what you saw in your own acknowledgement, message or record. These are your entries, not a live or verified official status.', 'अपनी पावती, संदेश या रिकॉर्ड में देखी जानकारी दर्ज करें। ये आपकी प्रविष्टियाँ हैं, लाइव या सत्यापित आधिकारिक स्थिति नहीं।')}</p>
      {error && <p className={styles.warning} role="alert">{error}</p>}
      {message && <p className={styles.notice} role="status">{message}</p>}
      {(stale || caseChanged) && <div className={styles.warning} role="status"><p>{sourceRemoved ? t('The saved follow-up is no longer available. Its details and unsaved entries were cleared from this view. Reload before starting another entry.', 'सहेजा फ़ॉलो-अप अब उपलब्ध नहीं है। उसके विवरण और बिना सहेजी प्रविष्टियाँ इस दृश्य से साफ़ हुईं। नई प्रविष्टि शुरू करने से पहले फिर लोड करें।') : t('The case or follow-up changed. Your current form is still here. Reload the saved follow-up before saving; reloading clears unsaved follow-up entries.', 'केस या फ़ॉलो-अप बदल गया। वर्तमान फ़ॉर्म यहीं है। सहेजने से पहले सहेजा फ़ॉलो-अप फिर लोड करें; इससे बिना सहेजी फ़ॉलो-अप प्रविष्टियाँ हटेंगी।')}</p><button type="button" onClick={load}>{t('Reload saved follow-up', 'सहेजा फ़ॉलो-अप फिर लोड करें')}</button></div>}
      {record && <>
        <section className={styles.observation} aria-label={t('Last observed status', 'अंतिम देखी स्थिति')}>
          <span className={styles.badge}>{t('Entered by you', 'आपकी दर्ज जानकारी')}</span>
          <h3>{latest ? statusLabel(latest.status, language) : t('No observation recorded', 'कोई देखी जानकारी दर्ज नहीं')}</h3>
          {latest && <><p><strong>{t('Source', 'स्रोत')}:</strong> {latest.sourceLabel}{latest.reference ? ` · ${latest.reference}` : ''}</p><small>{t('You observed this', 'आपने यह देखा')}: {dateLabel(latest.observedAt, language)} · {t(`${summary!.ageDays} days old`, `${summary!.ageDays} दिन पुराना`)}</small>{summary?.stale && <p className={styles.warning}>{t('This observation is at least 30 days old. Check your current record before relying on it.', 'यह जानकारी कम-से-कम 30 दिन पुरानी है। इस पर निर्भर होने से पहले वर्तमान रिकॉर्ड जाँचें।')}</p>}{latest.note && <p className={styles.note}>{latest.note}</p>}{latest.evidenceSha256 && <small className={styles.hash}>{t('Local file fingerprint', 'स्थानीय फ़ाइल फ़िंगरप्रिंट')}: {latest.evidenceSha256}</small>}</>}
        </section>
        {summary?.latestFailedCheck && <section className={styles.failed} aria-label={t('Latest failed check', 'अंतिम असफल जाँच')}><h3>{t('Last time you could not check', 'जब आप पिछली बार जाँच नहीं कर पाए')}</h3><small>{dateLabel(summary.latestFailedCheck.at, language)}</small><p>{summary.latestFailedCheck.note}</p><small>{t('The last observed status and its original time are kept above.', 'अंतिम देखी स्थिति और उसका मूल समय ऊपर रखा गया है।')}</small></section>}
        <form className={styles.form} onSubmit={persist}>
          <div className={styles.actions}><button type="button" aria-pressed={mode === 'observation'} disabled={stale || caseChanged || record.observations.length >= 20} onClick={() => chooseMode('observation')}>{t('Add an observation', 'देखी जानकारी जोड़ें')}</button><button type="button" aria-pressed={mode === 'failed-check'} disabled={stale || caseChanged || record.failedChecks.length >= 10} onClick={() => chooseMode('failed-check')}>{t('I could not check', 'मैं जाँच नहीं कर पाया')}</button></div>
          {mode && <fieldset className={styles.entry} disabled={stale || caseChanged}>
            <legend>{mode === 'observation' ? t('From your own record', 'आपके अपने रिकॉर्ड से') : t('Keep a failed-check note', 'असफल जाँच का नोट रखें')}</legend>
            {mode === 'observation' && <><label>{t('Status on my record', 'मेरे रिकॉर्ड की स्थिति')}<select value={status} onChange={event => setStatus(event.target.value as FollowUpStatus)}>{(['unknown', 'pending', 'needs-info', 'completed'] as const).map(value => <option key={value} value={value}>{statusLabel(value, language)}</option>)}</select></label><label>{t('Source I looked at', 'मैंने जो स्रोत देखा')}<input value={sourceLabel} maxLength={160} required onChange={event => setSourceLabel(event.target.value)} placeholder={t('For example, my acknowledgement dated 6 September', 'जैसे, 6 सितंबर की मेरी पावती')} /></label><label>{t('Reference in my record (optional)', 'मेरे रिकॉर्ड का संदर्भ (वैकल्पिक)')}<input value={reference} maxLength={160} onChange={event => setReference(event.target.value)} /></label></>}
            <label>{mode === 'observation' ? t('When I observed it', 'मैंने कब देखा') : t('When I tried to check', 'मैंने जाँच की कोशिश कब की')}<input type="datetime-local" value={at} required onChange={event => setAt(event.target.value)} /></label>
            <label>{mode === 'observation' ? t('Short note (optional)', 'छोटा नोट (वैकल्पिक)') : t('Why I could not check', 'मैं जाँच क्यों नहीं कर पाया')}<textarea value={note} rows={3} maxLength={500} required={mode === 'failed-check'} onChange={event => setNote(event.target.value)} /></label>
            {mode === 'observation' && <details><summary>{t('Add a local evidence fingerprint (optional)', 'स्थानीय साक्ष्य फ़िंगरप्रिंट जोड़ें (वैकल्पिक)')}</summary><p>{t('Choose a file up to 5 MiB. Only its SHA-256 fingerprint is saved; the file is not uploaded or kept. A matching fingerprint identifies identical bytes, not authenticity.', 'अधिकतम 5 MiB की फ़ाइल चुनें। केवल SHA-256 फ़िंगरप्रिंट सहेजा जाएगा; फ़ाइल अपलोड या रखी नहीं जाती। मेल खाता फ़िंगरप्रिंट समान बाइट बताता है, प्रामाणिकता नहीं।')}</p><label>{t('File to fingerprint locally', 'स्थानीय फ़िंगरप्रिंट के लिए फ़ाइल')}<input type="file" onChange={hashEvidence} /></label>{hashing && <p role="status">{t('Calculating local fingerprint…', 'स्थानीय फ़िंगरप्रिंट बन रहा है…')}</p>}{evidenceHash && <code className={styles.hash}>{evidenceHash}</code>}</details>}
          </fieldset>}
          <label>{t('Next source-check date (optional)', 'स्रोत की अगली जाँच की तारीख (वैकल्पिक)')}<input type="date" value={nextDate} disabled={stale || caseChanged} onChange={event => { setNextDate(event.target.value); setCalendar(null); }} /></label>
          <small>{t('Choose when to review your source record again. This is separate from your broader case reminder and is not an official deadline or appointment. It appears here when you return; no background checks or messages.', 'अपना स्रोत रिकॉर्ड फिर कब देखना है, यह चुनें। यह आपके सामान्य केस अनुस्मारक से अलग है और आधिकारिक समय सीमा या अपॉइंटमेंट नहीं है। लौटने पर यहीं दिखेगा; कोई पृष्ठभूमि जाँच या संदेश नहीं।')}</small>
          <label className={styles.check}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />{t('This is my private device. Save these follow-up details here for up to 90 days.', 'यह मेरा निजी डिवाइस है। ये फ़ॉलो-अप विवरण यहाँ अधिकतम 90 दिन सहेजें।')}</label>
          <button type="submit" className={styles.primary} disabled={!consent || stale || caseChanged || hashing || (mode === null && nextDate === record.nextCheckDate)}>{t('Save follow-up on this device', 'इस डिवाइस पर फ़ॉलो-अप सहेजें')}</button>
        </form>
        {record.nextCheckDate && record.revision > 0 && <button type="button" className={styles.calendarButton} disabled={stale || caseChanged || nextDate !== record.nextCheckDate || mode !== null} onClick={() => { setCalendar({ record, caseValue: sourceCase! }); setError(''); }}><CalendarDays size={16} />{t('Review calendar reminder', 'कैलेंडर अनुस्मारक जाँचें')}</button>}
        {calendar && <section className={styles.calendar} aria-label={t('Review personal calendar reminder', 'निजी कैलेंडर अनुस्मारक की समीक्षा')}><h3>{t('Personal calendar reminder', 'निजी कैलेंडर अनुस्मारक')}</h3><p><strong>{calendar.caseValue.title}</strong></p><p>{t('All day', 'पूरे दिन')}: {calendar.record.nextCheckDate}</p><p>{t('The file contains the case title and this date. Source notes, references and evidence are excluded. Re-importing uses the same event identity; your calendar decides how to update it.', 'फ़ाइल में केस का शीर्षक और यह तारीख होगी। स्रोत नोट, संदर्भ और साक्ष्य शामिल नहीं होंगे। दोबारा जोड़ने पर वही घटना पहचान उपयोग होगी; आपका कैलेंडर तय करेगा कि उसे कैसे बदले।')}</p><button type="button" onClick={downloadCalendar}><Download size={16} />{t('Download reviewed .ics', 'जाँची हुई .ics डाउनलोड करें')}</button></section>}
        {(record.observations.length >= 20 || record.failedChecks.length >= 10) && <p className={styles.warning}>{t('This case reached a follow-up history limit. Existing records are preserved.', 'यह केस फ़ॉलो-अप इतिहास की सीमा पर पहुँचा। पुराने रिकॉर्ड सुरक्षित रखे गए हैं।')}</p>}
      </>}
    </div>}
  </details>;
}

export function FollowUpInbox({ cases, language, onOpenCase }: { cases: MobilityCase[]; language: Language; onOpenCase: (id: string) => void }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const headingId = useId();
  const [records, setRecords] = useState<FollowUpRecord[]>([]);
  const [checkedAt, setCheckedAt] = useState(now);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => { try { const loaded = readFollowUps(); if (active) { setRecords(loaded); setCheckedAt(now()); setError(''); } } catch (cause) { if (active) { setRecords([]); setError(errorText(cause)); } } };
    queueMicrotask(load);
    window.addEventListener(FOLLOW_UP_STORE_EVENT, load); window.addEventListener(MOBILITY_STORE_EVENT, load); window.addEventListener('focus', load);
    return () => { active = false; window.removeEventListener(FOLLOW_UP_STORE_EVENT, load); window.removeEventListener(MOBILITY_STORE_EVENT, load); window.removeEventListener('focus', load); };
  }, []);
  const items = cases.filter(item => item.status !== 'completed').flatMap(caseValue => {
    const record = records.find(item => item.caseId === caseValue.id); if (!record) return [];
    const attention = followUpAttention(record, checkedAt, localDate()); return attention ? [{ caseValue, record, attention }] : [];
  });
  function seen(item: typeof items[number]) {
    try { saveFollowUp(acknowledgeFollowUp(item.record, item.attention.key, now(), localDate()), item.caseValue, { consent: true }); setError(''); }
    catch (cause) { setError(errorText(cause)); }
  }
  function clearUnreadableFollowUps() {
    if (!window.confirm(t('Clear all follow-up notes on this device? Saved cases and reusable details will remain.', 'इस डिवाइस के सभी फ़ॉलो-अप नोट साफ़ करें? सहेजे केस और दोबारा उपयोग की जानकारी बनी रहेगी।'))) return;
    try { deleteAllFollowUps(); setRecords([]); setError(''); } catch (cause) { setError(errorText(cause)); }
  }
  if (cases.length === 0 && !error) return null;
  return <section className={styles.inbox} aria-labelledby={headingId}><h2 id={headingId}>{t('Follow-up attention', 'फ़ॉलो-अप पर ध्यान')}</h2><p>{t('From dates and records you saved. No automatic official checks.', 'आपकी सहेजी तारीखों और रिकॉर्ड से। कोई स्वचालित आधिकारिक जाँच नहीं।')}</p>{error && <div className={styles.warning}><p role="alert">{error}</p><button type="button" onClick={clearUnreadableFollowUps}>{t('Clear follow-up notes on this device', 'इस डिवाइस के फ़ॉलो-अप नोट साफ़ करें')}</button></div>}<details><summary>{t(`${items.length} unseen follow-up items`, `${items.length} अनदेखे फ़ॉलो-अप`)}</summary>{items.length === 0 ? <p>{t('No unseen follow-up attention right now. Marking an item seen does not complete the case.', 'अभी कोई अनदेखा फ़ॉलो-अप नहीं। देखा चिह्नित करने से केस पूरा नहीं होता।')}</p> : items.map(item => <article key={item.caseValue.id} className={styles.inboxItem}><h3>{item.caseValue.title}</h3><span className={styles.badge}>{t('Your records', 'आपके रिकॉर्ड')}</span><p>{item.attention.reason === 'due' ? t(`Your chosen check date is due: ${item.record.nextCheckDate}`, `आपकी चुनी जाँच तारीख आ गई: ${item.record.nextCheckDate}`) : item.attention.reason === 'failed-check' ? t('Your latest check failed; the previous observation is kept.', 'आपकी अंतिम जाँच असफल हुई; पिछली जानकारी रखी गई है।') : item.attention.reason === 'needs-info' ? t('Your record says more information was requested.', 'आपके रिकॉर्ड के अनुसार और जानकारी माँगी गई थी।') : t('Your last observation is at least 30 days old.', 'आपकी अंतिम देखी जानकारी कम-से-कम 30 दिन पुरानी है।')}</p><div className={styles.actions}><button type="button" onClick={() => onOpenCase(item.caseValue.id)}>{t('Open case', 'केस खोलें')}<ExternalLink size={14} /></button><button type="button" onClick={() => seen(item)}>{t('Mark seen', 'देखा चिह्नित करें')}</button></div></article>)}</details></section>;
}
