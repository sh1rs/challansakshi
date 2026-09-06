'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Download, Plus } from 'lucide-react';
import { buildRenewalCalendar, createRenewal, renewalAttention, renewalCalendarPreview, renewalInput, renewalKindLabel, renewalLocalDate, RENEWAL_KINDS, RENEWAL_RETENTION_DAYS, updateRenewal, type RenewalInput, type RenewalLanguage, type RenewalRecord } from '../../lib/mobility/renewals';
import { assertCurrentRenewal, deleteAllRenewals, deleteRenewal, MAX_RENEWALS, readRenewals, RENEWAL_STORE_EVENT, saveRenewal } from '../../lib/mobility/renewal-store';
import styles from './RenewalPanel.module.css';

type Props = { language: RenewalLanguage; onStartLicenceRenewal?: (record: RenewalRecord) => void; onCountChange?: (count: number) => void };
type Editor = { original: RenewalRecord | null; input: RenewalInput };
const blank = (): RenewalInput => ({ kind: 'licence', label: '', vehicleLabel: '', expiryDate: '', sourceLabel: '', checkedOn: renewalLocalDate(), reminderDate: '' });
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'The document reminder could not be updated.';
const same = (left: RenewalRecord, right: RenewalRecord) => JSON.stringify(left) === JSON.stringify(right);

export default function RenewalPanel({ language, onStartLicenceRenewal, onCountChange }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<RenewalRecord[]>([]);
  const [today, setToday] = useState(renewalLocalDate);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [consent, setConsent] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [calendar, setCalendar] = useState<RenewalRecord | null>(null);
  const [calendarReviewed, setCalendarReviewed] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const saving = useRef<AbortController | null>(null);
  const working = useRef<{ editor: Editor | null; calendar: RenewalRecord | null }>({ editor: null, calendar: null });
  const retained = useRef<RenewalRecord[]>([]);
  const mutating = useRef(false);
  const urls = useRef(new Set<string>());
  useEffect(() => { working.current = { editor, calendar }; }, [editor, calendar]);
  useEffect(() => {
    let active = true, loadSequence = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const resetWorking = () => { generation.current += 1; saving.current?.abort(); working.current = { editor: null, calendar: null }; setBusy(false); setEditor(null); setConsent(false); setConflict(false); setCalendar(null); setCalendarReviewed(false); };
    const scheduleRefresh = (next: RenewalRecord[]) => {
      clearTimeout(refreshTimer);
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
      const nextExpiry = Math.min(...next.map(record => Date.parse(record.updatedAt) + RENEWAL_RETENTION_DAYS * 86_400_000));
      const delay = Math.max(1, Math.min(60_000, midnight.getTime() - Date.now(), nextExpiry - Date.now()));
      refreshTimer = setTimeout(() => { void load(); }, delay);
    };
    const load = async (event?: Event) => {
      if (!active) return;
      const run = ++loadSequence;
      const clearing = (event as CustomEvent<{ operation?: string }> | undefined)?.detail?.operation === 'clear';
      if (clearing) resetWorking();
      // Privacy erasure in memory must not wait for another tab's storage lock.
      const isExpired = (record: RenewalRecord) => Date.now() - Date.parse(record.updatedAt) >= RENEWAL_RETENTION_DAYS * 86_400_000;
      const live = retained.current.filter(record => !isExpired(record));
      if (live.length !== retained.current.length) { retained.current = live; setRecords(live); onCountChange?.(live.length); }
      if (working.current.editor?.original && isExpired(working.current.editor.original) || working.current.calendar && isExpired(working.current.calendar)) {
        resetWorking(); setMessage(language === 'hi' ? 'इस अनुस्मारक की संग्रह अवधि समाप्त हुई। कार्यरत विवरण साफ़ हुए।' : 'This reminder reached its retention limit. Its working details were cleared.');
      }
      try {
        const next = await readRenewals(); if (!active || run !== loadSequence) return; retained.current = next; setRecords(next); setToday(renewalLocalDate()); onCountChange?.(next.length); setError(''); scheduleRefresh(next);
        const operation = (event as CustomEvent<{ operation?: string }> | undefined)?.detail?.operation;
        if (operation === 'clear') { resetWorking(); setMessage(language === 'hi' ? 'इस डिवाइस के दस्तावेज़ अनुस्मारक साफ़ हुए। बिना सहेजे विवरण भी हटे।' : 'Document reminders were cleared on this device. Unsaved organiser details were cleared too.'); return; }
        if (mutating.current) return;
        const previous = working.current.editor?.original;
        if (previous) {
          const latest = next.find(item => item.id === previous.id);
          if (!latest) { resetWorking(); setMessage(language === 'hi' ? 'यह अनुस्मारक हट गया या इसकी संग्रह अवधि समाप्त हुई। कार्यरत विवरण साफ़ हुए।' : 'This reminder was deleted or its retention expired. Its working details were cleared.'); }
          else if (!same(previous, latest)) { setConflict(true); setConsent(false); }
        }
        if (working.current.calendar) {
          const latest = next.find(item => item.id === working.current.calendar!.id);
          if (!latest || !same(latest, working.current.calendar)) { setCalendar(null); setCalendarReviewed(false); }
        }
      } catch (cause) { if (!active || run !== loadSequence) return; retained.current = []; setRecords([]); onCountChange?.(0); setCalendar(null); setCalendarReviewed(false); setConsent(false); setError(errorText(cause)); scheduleRefresh([]); }
    };
    const focus = () => { void load(); };
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    const hide = () => { clearTimeout(refreshTimer); resetWorking(); setOpen(false); setMessage(''); setError(''); urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); };
    queueMicrotask(() => { if (!active) return; resetWorking(); void load(); });
    window.addEventListener(RENEWAL_STORE_EVENT, load); window.addEventListener('focus', focus); window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearTimeout(refreshTimer); generation.current += 1; saving.current?.abort(); window.removeEventListener(RENEWAL_STORE_EVENT, load); window.removeEventListener('focus', focus); window.removeEventListener('pagehide', hide); document.removeEventListener('visibilitychange', visible); };
  }, [language, onCountChange]);
  useEffect(() => { const pending = urls.current; return () => { pending.forEach(url => URL.revokeObjectURL(url)); pending.clear(); }; }, []);

  function clearWorking() { generation.current += 1; saving.current?.abort(); working.current = { editor: null, calendar: null }; setBusy(false); setEditor(null); setConsent(false); setConflict(false); setCalendar(null); setCalendarReviewed(false); }
  async function refresh() {
    const run = generation.current;
    try { const next = await readRenewals(); if (run !== generation.current) return null; retained.current = next; setRecords(next); setToday(renewalLocalDate()); onCountChange?.(next.length); setError(''); return next; }
    catch (cause) { if (run === generation.current) setError(errorText(cause)); return null; }
  }
  function toggle(next: boolean) { setOpen(next); clearWorking(); setMessage(''); setError(''); if (next) void refresh(); }
  async function editRecord(record?: RenewalRecord) {
    if (editor && !window.confirm(t('Discard the unsaved organiser details?', 'बिना सहेजे आयोजक विवरण हटाएँ?'))) return;
    const run = ++generation.current;
    try { const original = record ? await assertCurrentRenewal(record) : null; if (run !== generation.current) return; setEditor({ original, input: original ? renewalInput(original) : blank() }); setConsent(false); setConflict(false); setCalendar(null); setCalendarReviewed(false); setError(''); setMessage(''); }
    catch (cause) { if (run === generation.current) { setError(errorText(cause)); void refresh(); } }
  }
  function change<K extends keyof RenewalInput>(key: K, value: RenewalInput[K]) {
    if (!editor || busy) return;
    generation.current += 1; setEditor({ ...editor, input: { ...editor.input, [key]: value } }); setConsent(false); setError(''); setMessage(''); setCalendar(null); setCalendarReviewed(false);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editor || !consent || conflict || busy) return;
    const run = ++generation.current; const controller = new AbortController(); saving.current = controller; setBusy(true);
    try {
      if (editor.original) await assertCurrentRenewal(editor.original);
      if (run !== generation.current) return;
      const at = new Date().toISOString();
      const candidate = editor.original ? updateRenewal(editor.original, editor.input, at) : createRenewal(editor.input, at);
      mutating.current = true; await saveRenewal(candidate, { consent: true, expected: editor.original ?? undefined, signal: controller.signal });
      if (run !== generation.current) return;
      clearWorking(); const completed = generation.current; await refresh(); if (completed !== generation.current) return;
      setMessage(t('Document reminder saved on this device. Its dates were entered by you; no official record was checked.', 'इस डिवाइस पर दस्तावेज़ अनुस्मारक सहेजा। तारीखें आपने दर्ज कीं; आधिकारिक रिकॉर्ड नहीं जाँचा गया।'));
    } catch (cause) { if (run === generation.current) { setError(errorText(cause)); setConsent(false); } }
    finally { mutating.current = false; if (saving.current === controller) { saving.current = null; setBusy(false); } }
  }
  async function reloadEditor() {
    if (!editor?.original) return;
    const run = ++generation.current;
    try { const latest = (await readRenewals()).find(item => item.id === editor.original!.id); if (run !== generation.current) return; if (!latest) { clearWorking(); void refresh(); throw new Error(t('This reminder was deleted or expired.', 'यह अनुस्मारक हट गया या इसकी अवधि समाप्त हुई।')); } setEditor({ original: latest, input: renewalInput(latest) }); setConflict(false); setConsent(false); setError(''); }
    catch (cause) { setError(errorText(cause)); }
  }
  async function remove(record: RenewalRecord) {
    if (busy || !window.confirm(t('Delete this document reminder from this device?', 'इस डिवाइस से यह दस्तावेज़ अनुस्मारक हटाएँ?'))) return;
    const run = ++generation.current; const controller = new AbortController(); saving.current = controller; setBusy(true);
    try {
      await deleteRenewal(record, controller.signal); if (run !== generation.current) return;
      clearWorking(); const completed = generation.current; await refresh(); if (completed !== generation.current) return;
      setMessage(t('Document reminder deleted.', 'दस्तावेज़ अनुस्मारक हटा।')); setError('');
    } catch (cause) { if (run === generation.current) setError(errorText(cause)); }
    finally { if (saving.current === controller) { saving.current = null; setBusy(false); } }
  }
  async function clearAll() {
    if (busy || !window.confirm(t('Clear all document reminders and unsaved organiser details on this device? Cases and other saved details will remain.', 'इस डिवाइस के सभी दस्तावेज़ अनुस्मारक और बिना सहेजे आयोजक विवरण साफ़ करें? केस और अन्य सहेजे विवरण बने रहेंगे।'))) return;
    const run = ++generation.current; const controller = new AbortController(); saving.current = controller; setBusy(true);
    try { await deleteAllRenewals(controller.signal); if (run !== generation.current) return; clearWorking(); retained.current = []; setRecords([]); onCountChange?.(0); setError(''); setMessage(t('Document reminders cleared on this device.', 'इस डिवाइस के दस्तावेज़ अनुस्मारक साफ़ हुए।')); }
    catch (cause) { if (run === generation.current) setError(errorText(cause)); }
    finally { if (saving.current === controller) { saving.current = null; setBusy(false); } }
  }
  async function reviewCalendar(record: RenewalRecord) {
    const run = ++generation.current;
    try { const current = await assertCurrentRenewal(record); if (run !== generation.current) return; renewalCalendarPreview(current, language); setCalendar(current); setCalendarReviewed(false); setError(''); }
    catch (cause) { setCalendar(null); setError(errorText(cause)); }
  }
  async function downloadCalendar() {
    if (!calendar || !calendarReviewed) return;
    const run = ++generation.current;
    try {
      const current = await assertCurrentRenewal(calendar); if (run !== generation.current) return; const content = buildRenewalCalendar(current, language);
      const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' })); urls.current.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'personal-document-reminder.ics'; anchor.click();
      setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
      setCalendarReviewed(false); setMessage(t('Personal calendar file downloaded. Import it yourself; no notification subscription was created.', 'निजी कैलेंडर फ़ाइल डाउनलोड हुई। इसे स्वयं आयात करें; कोई सूचना सदस्यता नहीं बनी।'));
    } catch (cause) { setCalendar(null); setCalendarReviewed(false); setError(errorText(cause)); }
  }
  async function startLicence(record: RenewalRecord) {
    if (record.kind !== 'licence') return;
    const run = ++generation.current;
    try { const current = await assertCurrentRenewal(record); if (run === generation.current) onStartLicenceRenewal?.(current); } catch (cause) { setError(errorText(cause)); }
  }
  const calendarPreview = calendar ? renewalCalendarPreview(calendar, language) : null;
  const sorted = [...records].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.id.localeCompare(b.id));
  return <details className={styles.panel} open={open} onToggle={event => { if (event.currentTarget.open !== open) toggle(event.currentTarget.open); }}>
    <summary onClick={event => { event.preventDefault(); toggle(!open); }}><CalendarDays size={17} />{t('Document expiry organiser', 'दस्तावेज़ अवधि आयोजक')}{records.length > 0 && <span>{records.length}</span>}</summary>
    {open && <div className={styles.body}>
      <p>{t('Keep dates from your own licence, insurance, PUC or another document. No official record is fetched. No full document number is needed.', 'अपने लाइसेंस, बीमा, PUC या अन्य दस्तावेज़ की तारीखें रखें। कोई आधिकारिक रिकॉर्ड नहीं लाया जाता। पूरा दस्तावेज़ नंबर ज़रूरी नहीं।')}</p>
      <p className={styles.small}>{t('“Due soon” means your entered expiry is within 30 calendar days. Source information checked 30 or more days ago is marked for review. These are organiser labels, not legal deadlines or grace periods.', '“जल्द तारीख” का अर्थ आपकी दर्ज अवधि अगले 30 कैलेंडर दिनों में है। 30 या अधिक दिन पहले जाँची स्रोत जानकारी फिर समीक्षा के लिए दिखती है। ये आयोजक लेबल हैं, कानूनी समय-सीमा या छूट अवधि नहीं।')}</p>
      {error && <p role="alert" className={styles.warning}>{error}</p>}{message && <p role="status" className={styles.notice}>{message}</p>}
      {records.length === 0 && !error && <p>{t('No document dates saved here yet.', 'यहाँ अभी कोई दस्तावेज़ तारीख सहेजी नहीं है।')}</p>}
      <button type="button" disabled={records.length >= MAX_RENEWALS || busy} onClick={() => void editRecord()}><Plus size={16} />{t('Add a document date', 'दस्तावेज़ तारीख जोड़ें')}</button>
      {records.length >= MAX_RENEWALS && <p>{t('Keep at most 50 reminders. Delete an old one before adding another.', 'अधिकतम 50 अनुस्मारक रखें। नया जोड़ने से पहले पुराना हटाएँ।')}</p>}
      {editor && <form className={styles.editor} onSubmit={event => void save(event)} aria-label={t('Edit document reminder', 'दस्तावेज़ अनुस्मारक संपादित करें')}>
        <h3>{editor.original ? t('Edit the saved dates', 'सहेजी तारीखें बदलें') : t('Add dates from your record', 'अपने रिकॉर्ड से तारीखें जोड़ें')}</h3>
        {conflict && <div className={styles.warning} role="status"><p>{t('This saved reminder changed. Your working details are still shown. Reloading replaces them with the latest saved version and clears consent.', 'यह सहेजा अनुस्मारक बदला। आपके कार्यरत विवरण अभी दिख रहे हैं। फिर लोड करने पर वे नवीनतम सहेजी प्रति से बदलेंगे और सहमति हटेगी।')}</p><button type="button" onClick={() => void reloadEditor()}>{t('Reload saved reminder', 'सहेजा अनुस्मारक फिर लोड करें')}</button></div>}
        <label>{t('Document type', 'दस्तावेज़ प्रकार')}<select disabled={busy} value={editor.input.kind} onChange={event => change('kind', event.target.value as RenewalInput['kind'])}>{RENEWAL_KINDS.map(kind => <option key={kind} value={kind}>{renewalKindLabel(kind, language)}</option>)}</select></label>
        <label>{t('Short document label (optional)', 'छोटा दस्तावेज़ नाम (वैकल्पिक)')}<input disabled={busy} autoComplete="off" maxLength={100} value={editor.input.label} onChange={event => change('label', event.target.value)} /></label>
        <label>{t('Vehicle label (optional)', 'वाहन का नाम (वैकल्पिक)')}<input disabled={busy} autoComplete="off" maxLength={100} value={editor.input.vehicleLabel} onChange={event => change('vehicleLabel', event.target.value)} placeholder={t('For example: family scooter', 'जैसे: परिवार का स्कूटर')} /></label>
        <label>{t('Expiry date shown in my record', 'मेरे रिकॉर्ड में लिखी अवधि की तारीख')}<input disabled={busy} type="date" required value={editor.input.expiryDate} onChange={event => change('expiryDate', event.target.value)} /></label>
        <label>{t('Source I checked', 'मैंने जो स्रोत जाँचा')}<input disabled={busy} autoComplete="off" required maxLength={200} value={editor.input.sourceLabel} onChange={event => change('sourceLabel', event.target.value)} placeholder={t('For example: my paper certificate', 'जैसे: मेरा कागज़ी प्रमाणपत्र')} /></label>
        <label>{t('Date I checked that source', 'मैंने स्रोत जिस तारीख को जाँचा')}<input disabled={busy} type="date" required max={today} value={editor.input.checkedOn} onChange={event => change('checkedOn', event.target.value)} /></label>
        <label>{t('My reminder / next-check date (optional)', 'मेरी अनुस्मारक / अगली जाँच तारीख (वैकल्पिक)')}<input disabled={busy} type="date" value={editor.input.reminderDate} onChange={event => change('reminderDate', event.target.value)} /></label>
        <p className={styles.small}>{t('Choose this date yourself. It creates no automatic notification or official appointment.', 'यह तारीख स्वयं चुनें। इससे स्वचालित सूचना या आधिकारिक अपॉइंटमेंट नहीं बनता।')}</p>
        <label className={styles.check}><input type="checkbox" checked={consent} disabled={conflict || busy} onChange={event => setConsent(event.target.checked)} />{t('This is my private device. Save these document dates unencrypted here for 90 days after my last save.', 'यह मेरा निजी डिवाइस है। आखिरी बार सहेजने के बाद 90 दिनों तक ये दस्तावेज़ तारीखें यहाँ बिना एन्क्रिप्शन रखें।')}</label>
        <div className={styles.actions}><button className={styles.primary} type="submit" disabled={!consent || conflict || busy}>{t('Save document reminder', 'दस्तावेज़ अनुस्मारक सहेजें')}</button><button type="button" onClick={clearWorking}>{t('Cancel changes', 'बदलाव रद्द करें')}</button></div>
      </form>}
      <div className={styles.list}>{sorted.map(record => {
        const attention = renewalAttention(record, today);
        const expiry = attention.expiry === 'past' ? t('Entered expiry has passed', 'दर्ज अवधि की तारीख बीत गई') : attention.expiry === 'today' ? t('Entered expiry is today', 'दर्ज अवधि की तारीख आज है') : attention.expiry === 'soon' ? t('Due soon · within 30 days', 'जल्द तारीख · 30 दिनों में') : t('Later entered expiry', 'दर्ज अवधि की तारीख बाद में है');
        return <article className={styles.record} key={record.id} aria-label={record.label || renewalKindLabel(record.kind, language)}>
          <div className={styles.heading}><h3>{record.label || renewalKindLabel(record.kind, language)}</h3><span className={styles.badge}>{expiry}</span></div>
          <p>{renewalKindLabel(record.kind, language)}{record.vehicleLabel && ` · ${record.vehicleLabel}`}</p>
          <dl><div><dt>{t('Entered expiry', 'दर्ज अवधि तारीख')}</dt><dd>{record.expiryDate}</dd></div><div><dt>{t('Source entered by you', 'आपका दर्ज स्रोत')}</dt><dd>{record.sourceLabel}</dd></div><div><dt>{t('Source checked by you', 'आपने स्रोत जाँचा')}</dt><dd>{record.checkedOn}</dd></div>{record.reminderDate && <div><dt>{t('Your reminder date', 'आपकी अनुस्मारक तारीख')}</dt><dd>{record.reminderDate}</dd></div>}</dl>
          {attention.source !== 'recent' && <p className={styles.warning}>{attention.source === 'stale' ? t('Source needs a fresh check · last checked at least 30 days ago.', 'स्रोत फिर जाँचें · आखिरी जाँच कम-से-कम 30 दिन पहले हुई।') : t('The entered check date is after today. Review that date.', 'दर्ज जाँच तारीख आज के बाद की है। वह तारीख फिर जाँचें।')}</p>}
          {attention.reminderDue && <p className={styles.notice}>{t('Your chosen reminder date is due. Check your own record when ready.', 'आपकी चुनी अनुस्मारक तारीख आ गई। तैयार होने पर अपना रिकॉर्ड जाँचें।')}</p>}
          <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void editRecord(record)}>{t('Edit dates', 'तारीखें बदलें')}</button>{record.reminderDate && <button type="button" disabled={busy} onClick={() => void reviewCalendar(record)}>{t('Review personal calendar reminder', 'निजी कैलेंडर अनुस्मारक जाँचें')}</button>}{record.kind === 'licence' && onStartLicenceRenewal && <button type="button" disabled={busy} onClick={() => void startLicence(record)}>{t('Prepare a licence-renewal case', 'लाइसेंस नवीनीकरण केस तैयार करें')}</button>}<button className={styles.danger} type="button" disabled={busy} onClick={() => void remove(record)}>{t('Delete reminder', 'अनुस्मारक हटाएँ')}</button></div>
        </article>;
      })}</div>
      {calendar && calendarPreview && <section className={styles.calendar} aria-label={t('Review document calendar reminder', 'दस्तावेज़ कैलेंडर अनुस्मारक जाँचें')}><h3>{calendarPreview.summary}</h3><p>{t('All day', 'पूरा दिन')}: {calendarPreview.date}</p><p>{calendarPreview.description}</p><p>{t('Document labels, vehicle labels, expiry dates and source details are excluded. Repeated downloads use the same event ID; your calendar application controls how imports are merged.', 'दस्तावेज़ और वाहन नाम, अवधि तारीख और स्रोत विवरण शामिल नहीं हैं। दोबारा डाउनलोड में घटना की पहचान समान रहती है; आयात कैसे मिलें यह आपका कैलेंडर ऐप तय करता है।')}</p><label className={styles.check}><input type="checkbox" checked={calendarReviewed} onChange={event => setCalendarReviewed(event.target.checked)} />{t('I reviewed this personal reminder and want the calendar file.', 'मैंने यह निजी अनुस्मारक जाँचा है और कैलेंडर फ़ाइल चाहता/चाहती हूँ।')}</label><div className={styles.actions}><button type="button" disabled={!calendarReviewed} onClick={() => void downloadCalendar()}><Download size={16} />{t('Download reviewed .ics', 'जाँची .ics डाउनलोड करें')}</button><button type="button" onClick={() => { generation.current += 1; setCalendar(null); setCalendarReviewed(false); }}>{t('Close calendar review', 'कैलेंडर समीक्षा बंद करें')}</button></div></section>}
      <p className={styles.small}>{t('Saved reminders disappear after 90 days without an explicit save; simply opening them does not extend this period. Closing this organiser clears unsaved form details. Downloaded files remain until you delete them.', 'स्पष्ट रूप से सहेजे बिना 90 दिन बीतने पर अनुस्मारक हटते हैं; केवल खोलने से अवधि नहीं बढ़ती। आयोजक बंद करने पर बिना सहेजे फ़ॉर्म विवरण साफ़ होते हैं। डाउनलोड फ़ाइलें आपके हटाने तक रहती हैं।')}</p>
      {(records.length > 0 || error) && <button type="button" className={styles.danger} onClick={() => void clearAll()}>{t('Clear document reminders on this device', 'इस डिवाइस के दस्तावेज़ अनुस्मारक साफ़ करें')}</button>}
    </div>}
  </details>;
}
