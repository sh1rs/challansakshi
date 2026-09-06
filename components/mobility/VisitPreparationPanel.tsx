'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import type { MobilityCase } from '../../lib/mobility/cases';
import { previewVisitCalendar, previewVisitPack, reviewedVisitCalendar, reviewedVisitPack, visitCalendarDetails, visitInstructionLines, visitIsoToLocalTime, visitLocalTimeToIso, type VisitChecklistItem, type VisitLanguage, type VisitPackOptions, type VisitPreview } from '../../lib/mobility/visit-preparation';
import styles from './VisitPreparationPanel.module.css';

type Props = { caseValue: MobilityCase; language: VisitLanguage; onAppointmentChange: (value: MobilityCase['appointment']) => void };
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'The personal visit preparation could not be made.';
export default function VisitPreparationPanel(props: Props) { return <CurrentVisitPanel key={`${props.caseValue.id}:${props.language}`} {...props} />; }

function CurrentVisitPanel({ caseValue, language, onAppointmentChange }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [open, setOpen] = useState(false), [error, setError] = useState('');
  const [timeReview, setTimeReview] = useState(0);
  const appointment = caseValue.appointment;
  let localTime = ''; try { if (appointment) localTime = visitIsoToLocalTime(appointment.at); } catch { /* A malformed working appointment remains editable; exports validate it. */ }
  useEffect(() => { const hide = () => { setOpen(false); setError(''); }; window.addEventListener('pagehide', hide); return () => window.removeEventListener('pagehide', hide); }, []);
  function changeTime(value: string) {
    setError(''); setTimeReview(value => value + 1);
    try { onAppointmentChange(value ? { at: visitLocalTimeToIso(value), venue: appointment?.venue ?? '', instructions: appointment?.instructions ?? '' } : undefined); }
    catch (cause) { setError(errorText(cause)); }
  }
  return <details className={styles.panel} open={open} onToggle={event => { if (event.currentTarget.open !== open) { setOpen(event.currentTarget.open); setError(''); } }}>
    <summary onClick={event => { event.preventDefault(); setOpen(!open); setError(''); }}><CalendarDays size={17} />{t('Appointment and visit pack', 'अपॉइंटमेंट और कार्यालय जाने की तैयारी')}</summary>
    {open && <div className={styles.body}>
      <p>{t('Add details only from an appointment you booked yourself. Copy the instructions you received. This does not book or confirm a slot.', 'केवल स्वयं बुक किए अपॉइंटमेंट की जानकारी जोड़ें। मिले निर्देश लिखें। इससे कोई स्लॉट बुक या पुष्टि नहीं होता।')}</p>
      <label>{t('Booked date and time (your local time)', 'बुक की तारीख और समय (आपका स्थानीय समय)')}<input type="datetime-local" value={localTime} onChange={event => changeTime(event.target.value)} /></label>
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {appointment && <>
        <p className={styles.small}>{t('Device time zone', 'डिवाइस का समय क्षेत्र')}: {Intl.DateTimeFormat().resolvedOptions().timeZone}. {t('Check that this matches the time you mean from your booking.', 'जाँचें कि यह आपकी बुकिंग में दिए समय से मेल खाता है।')}</p>
        <label>{t('Venue from the booking', 'बुकिंग में दिया स्थान')}<input autoComplete="off" maxLength={500} value={appointment.venue} onChange={event => onAppointmentChange({ ...appointment, venue: event.target.value })} /></label>
        <label>{t('Official instructions you received', 'आपको मिले आधिकारिक निर्देश')}<textarea aria-label={t('Official instructions you received', 'आपको मिले आधिकारिक निर्देश')} maxLength={2000} rows={4} value={appointment.instructions} onChange={event => onAppointmentChange({ ...appointment, instructions: event.target.value })} /></label>
        <p className={styles.small}>{t('Put each source instruction on its own line if you want a packing checklist. Select only the lines you have reviewed.', 'तैयारी सूची चाहिए तो स्रोत का हर निर्देश अलग पंक्ति में रखें। केवल जाँची हुई पंक्तियाँ चुनें।')}</p>
        <VisitReview key={`${JSON.stringify(caseValue)}:${timeReview}`} caseValue={caseValue} language={language} />
      </>}
      <p className={styles.small}>{t('The appointment fields belong to this working case; use Save case separately to keep them. Checklist choices and download approvals stay in memory and clear when this panel closes, the case changes, or you leave. Downloaded files remain until you delete them.', 'अपॉइंटमेंट विवरण इस कार्यरत केस का भाग हैं; रखने के लिए अलग से केस सहेजें। सूची और डाउनलोड की सहमति केवल याददाश्त में रहती है; पैनल बंद करने, केस बदलने या बाहर जाने पर साफ़ होती है। डाउनलोड फ़ाइलें आपके हटाने तक रहती हैं।')}</p>
    </div>}
  </details>;
}

function VisitReview({ caseValue, language }: Pick<Props, 'caseValue' | 'language'>) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const initial = (() => { try { return { items: visitInstructionLines(caseValue.appointment?.instructions ?? ''), error: '' }; } catch (cause) { return { items: [], error: errorText(cause) }; } })();
  const [items, setItems] = useState<VisitChecklistItem[]>(initial.items);
  const [options, setOptions] = useState<VisitPackOptions>({ includeReference: false, factKeys: [] });
  const [pack, setPack] = useState<VisitPreview | null>(null), [packApproved, setPackApproved] = useState(false);
  const [calendar, setCalendar] = useState<VisitPreview | null>(null), [calendarApproved, setCalendarApproved] = useState(false);
  const [error, setError] = useState(initial.error), [message, setMessage] = useState('');
  const urls = useRef(new Set<string>());
  useEffect(() => { const activeUrls = urls.current; return () => { activeUrls.forEach(url => URL.revokeObjectURL(url)); activeUrls.clear(); }; }, []);
  function invalidate() { setPack(null); setPackApproved(false); setCalendar(null); setCalendarApproved(false); setError(initial.error); setMessage(''); }
  function editItem(index: number, patch: Partial<VisitChecklistItem>) {
    setItems(previous => previous.map((item, position) => position === index ? { ...item, ...patch } : item)); invalidate();
  }
  function changeOptions(next: VisitPackOptions) { setOptions(next); invalidate(); }
  function reviewPack() { try { setPack(previewVisitPack(caseValue, items, options, language)); setPackApproved(false); setCalendar(null); setCalendarApproved(false); setError(''); setMessage(''); } catch (cause) { setError(errorText(cause)); } }
  function reviewCalendar() { try { setCalendar(previewVisitCalendar(caseValue, language)); setCalendarApproved(false); setPack(null); setPackApproved(false); setError(''); setMessage(''); } catch (cause) { setError(errorText(cause)); } }
  function download(kind: 'pack' | 'calendar') {
    try {
      const text = kind === 'pack' ? reviewedVisitPack(pack!, caseValue, items, options, language, packApproved) : reviewedVisitCalendar(calendar!, caseValue, language, calendarApproved);
      const url = URL.createObjectURL(new Blob([text], { type: kind === 'pack' ? 'text/plain;charset=utf-8' : 'text/calendar;charset=utf-8' })); urls.current.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = kind === 'pack' ? 'my-personal-visit-pack.txt' : 'my-personal-visit.ics'; anchor.click();
      setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
      setPackApproved(false); setCalendarApproved(false); setMessage(t('Your reviewed file was downloaded. Keep it private. No booking or notification subscription was created.', 'आपकी जाँची फ़ाइल डाउनलोड हुई। इसे निजी रखें। कोई बुकिंग या सूचना सदस्यता नहीं बनी।'));
    } catch (cause) { setError(errorText(cause)); setPackApproved(false); setCalendarApproved(false); }
  }
  let calendarDetails: ReturnType<typeof visitCalendarDetails> | null = null;
  try { if (calendar) calendarDetails = visitCalendarDetails(caseValue, language); } catch { /* A fresh review reports validation errors. */ }
  const confirmed = caseValue.facts.filter(fact => fact.confirmed), canReview = Boolean(caseValue.appointment?.venue.trim()) && !initial.error;
  return <div className={styles.body}>
    {items.length > 0 && <details className={styles.optional}><summary>{t('Packing checklist · optional', 'तैयारी सूची · वैकल्पिक')} <span>({items.length})</span></summary><section className={styles.checklist} aria-label={t('Checklist from my instruction lines', 'मेरे निर्देशों से तैयारी सूची')}>
      <h3>{t('Choose your packing checklist', 'अपनी तैयारी सूची चुनें')}</h3><p>{t('These lines come only from the instructions you entered. An edited line is your wording and needs a fresh check. This list does not establish official requirements.', 'ये पंक्तियाँ केवल आपके दर्ज निर्देशों से हैं। बदली पंक्ति आपकी भाषा है और फिर जाँचनी होगी। यह सूची आधिकारिक आवश्यकताएँ तय नहीं करती।')}</p>
      {items.map((item, index) => <div className={styles.line} key={item.line}>
        <p className={styles.source}>{t('Source line', 'स्रोत पंक्ति')} {item.line}: {item.source}</p>
        <label>{t('My checklist wording · line', 'मेरी सूची की भाषा · पंक्ति')} {item.line}<textarea aria-label={`${t('My checklist wording · line', 'मेरी सूची की भाषा · पंक्ति')} ${item.line}`} rows={2} maxLength={2000} value={item.wording} onChange={event => editItem(index, { wording: event.target.value, selected: false, packed: false })} /></label>
        <label className={styles.check}><input type="checkbox" checked={item.selected} disabled={!item.wording.trim()} onChange={event => editItem(index, { selected: event.target.checked, packed: false })} />{t('Use reviewed line', 'जाँची पंक्ति लें')} {item.line}</label>
        {item.selected && <label className={styles.check}><input type="checkbox" checked={item.packed} onChange={event => editItem(index, { packed: event.target.checked })} />{t('Packed or ready · line', 'साथ रखा या तैयार · पंक्ति')} {item.line}</label>}
      </div>)}
    </section></details>}
    {(caseValue.reference || confirmed.length > 0) && <details className={styles.optional}><summary>{t('Add selected case details · optional', 'चुने केस विवरण जोड़ें · वैकल्पिक')}</summary><div className={styles.body}>
      <p>{t('The visit pack starts with your appointment and checklist only. Select any additional personal detail you want in this downloaded file.', 'कार्यालय नोट में शुरुआत में केवल अपॉइंटमेंट और सूची हैं। डाउनलोड में जो अतिरिक्त निजी विवरण चाहिए वह चुनें।')}</p>
      {caseValue.reference && <label className={styles.check}><input type="checkbox" checked={options.includeReference} onChange={event => changeOptions({ ...options, includeReference: event.target.checked })} />{t('Include my reference', 'मेरा संदर्भ जोड़ें')}: {caseValue.reference}</label>}
      {confirmed.map(fact => <label className={styles.check} key={fact.key}><input type="checkbox" checked={options.factKeys.includes(fact.key)} onChange={event => changeOptions({ ...options, factKeys: event.target.checked ? [...options.factKeys, fact.key] : options.factKeys.filter(key => key !== fact.key) })} />{fact.label}: {fact.value}</label>)}
    </div></details>}
    {error && <p className={styles.notice} role="alert">{error}</p>}{message && <p className={styles.notice} role="status">{message}</p>}
    <div className={styles.actions}><button type="button" disabled={!canReview} onClick={reviewPack}>{t('Review my visit pack', 'कार्यालय नोट की समीक्षा करें')}</button><button type="button" disabled={!canReview} onClick={reviewCalendar}><CalendarDays size={16} />{t('Review personal appointment calendar', 'निजी अपॉइंटमेंट कैलेंडर जाँचें')}</button></div>
    {pack && <section className={styles.review} aria-label={t('Review exact visit pack', 'पूरा कार्यालय नोट जाँचें')}><h3>{t('Your exact text file', 'आपकी पूरी टेक्स्ट फ़ाइल')}</h3><label>{t('Exact visit-pack contents', 'कार्यालय नोट की पूरी सामग्री')}<textarea aria-label={t('Exact visit-pack contents', 'कार्यालय नोट की पूरी सामग्री')} readOnly rows={12} value={pack.text} /></label><label className={styles.check}><input type="checkbox" checked={packApproved} onChange={event => setPackApproved(event.target.checked)} />{t('I reviewed the exact visit pack and choose to download this personal copy.', 'मैंने पूरा कार्यालय नोट जाँचा और यह निजी प्रति डाउनलोड करना चाहता/चाहती हूँ।')}</label><button className={styles.primary} type="button" disabled={!packApproved} onClick={() => download('pack')}><Download size={16} />{t('Download my visit pack', 'कार्यालय जाने की तैयारी डाउनलोड करें')}</button></section>}
    {calendar && calendarDetails && <section className={styles.review} aria-label={t('Review personal visit calendar', 'निजी यात्रा कैलेंडर जाँचें')}><h3>{calendarDetails.summary}</h3><p>{t('Start', 'शुरू')}: {calendarDetails.local.replace('T', ' ')} · {calendarDetails.zone}</p><p>{calendarDetails.description}</p><p>{t('Only this title, start time and description are included. Venue, instructions, reference and case facts are excluded. No end time or reminder alarm is guessed. Repeated downloads use the same event ID; your calendar app decides how to merge imports.', 'केवल यह नाम, शुरू होने का समय और विवरण शामिल हैं। स्थान, निर्देश, संदर्भ और केस तथ्य शामिल नहीं हैं। समाप्ति समय या अलार्म नहीं अनुमानित किया जाता। दोबारा डाउनलोड में घटना की पहचान समान रहती है; आयात कैसे मिलें यह आपका कैलेंडर ऐप तय करता है।')}</p><details className={styles.optional}><summary>{t('Exact calendar file contents', 'कैलेंडर फ़ाइल की पूरी सामग्री')}</summary><textarea aria-label={t('Exact appointment calendar contents', 'अपॉइंटमेंट कैलेंडर की पूरी सामग्री')} readOnly rows={10} value={calendar.text} /></details><label className={styles.check}><input type="checkbox" checked={calendarApproved} onChange={event => setCalendarApproved(event.target.checked)} />{t('I reviewed this personal calendar entry and choose to download it.', 'मैंने यह निजी कैलेंडर प्रविष्टि जाँची और इसे डाउनलोड करना चाहता/चाहती हूँ।')}</label><button type="button" disabled={!calendarApproved} onClick={() => download('calendar')}><Download size={16} />{t('Download reviewed appointment .ics', 'जाँची अपॉइंटमेंट .ics डाउनलोड करें')}</button></section>}
  </div>;
}
