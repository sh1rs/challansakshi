'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { buildAgenda, currentAgendaTarget, type Agenda, type AgendaInput, type AgendaItem, type AgendaReasonKind } from '../../lib/mobility/agenda';
import { FOLLOW_UP_STORE_EVENT, readFollowUps } from '../../lib/mobility/follow-up-store';
import { readRenewals, RENEWAL_STORE_EVENT, RENEWAL_STORE_KEY } from '../../lib/mobility/renewal-store';
import { renewalKindLabel } from '../../lib/mobility/renewals';
import { getService } from '../../lib/mobility/services';
import { MOBILITY_STORE_EVENT, readCases } from '../../lib/mobility/store';
import styles from './AgendaPanel.module.css';

type Language = 'en' | 'hi';
type Props = { language: Language; onOpenCase: (id: string) => void; onOpenRenewals: () => void; onCountChange?: (count: number) => void };
const EMPTY: AgendaInput = { cases: [], followUps: [], renewals: [] };
const KEYS = new Set(['challansakshi-mobility-cases-v1', 'challansakshi-mobility-follow-ups-v1', RENEWAL_STORE_KEY]);
const reasonCopy: Record<AgendaReasonKind, [string, string]> = {
  'case-check-due': ['Your chosen case check date is due', 'आपकी चुनी केस जाँच तारीख आ गई है'],
  'source-check-due': ['Your chosen source check date is due', 'आपकी चुनी स्रोत जाँच तारीख आ गई है'],
  appointment: ['Appointment time you entered · within 30 days', 'आपकी दर्ज अपॉइंटमेंट का समय · 30 दिनों के भीतर'],
  'needs-attention': ['You marked this case as needing attention', 'आपने इस केस पर ध्यान देने के लिए चिह्न लगाया है'],
  'source-needs-info': ['Your saved observation says more information was requested', 'आपकी सहेजी जानकारी के अनुसार और विवरण माँगा गया था'],
  'document-check-due': ['Your chosen document check date is due', 'आपकी चुनी दस्तावेज़ जाँच तारीख आ गई है'],
  'document-expiry-past': ['The expiry date you entered has passed', 'आपकी दर्ज समाप्ति तारीख बीत गई है'],
  'document-expiry-today': ['The expiry date you entered is today', 'आपकी दर्ज समाप्ति तारीख आज है'],
  'document-expiry-soon': ['The expiry date you entered is within 30 days', 'आपकी दर्ज समाप्ति तारीख 30 दिनों के भीतर है'],
};

/** Derived local state only: no writes, subscriptions to remote services or account calls. */
export default function AgendaPanel({ language, onOpenCase, onOpenRenewals, onCountChange }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en; const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const heading = useId(); const index = language === 'hi' ? 1 : 0;
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [error, setError] = useState(false); const [changed, setChanged] = useState(false); const [busy, setBusy] = useState<string | null>(null);
  const generation = useRef(0); const action = useRef(0); const mounted = useRef(false);
  const suspended = useRef(false);
  const countCallback = useRef(onCountChange); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { countCallback.current = onCountChange; }, [onCountChange]);
  const publish = useCallback((value: Agenda) => { setAgenda(value); countCallback.current?.(value.items.length); }, []);
  const refresh = useCallback(async () => {
    if (!mounted.current || suspended.current) return;
    const run = ++generation.current; action.current += 1; setBusy(null);
    // Clear held labels before any read that may wait for an expiry-cleanup lock.
    publish(buildAgenda(EMPTY));
    let partial: AgendaInput = EMPTY; let failed = false;
    try {
      const cases = readCases(); partial = { ...EMPTY, cases };
      try { partial = { ...partial, followUps: readFollowUps(cases) }; } catch { failed = true; }
    } catch { failed = true; }
    if (!mounted.current || suspended.current || run !== generation.current) return;
    try { publish(buildAgenda(partial)); } catch { partial = EMPTY; failed = true; }
    setError(failed);
    try {
      const renewals = await readRenewals();
      if (!mounted.current || suspended.current || run !== generation.current) return;
      publish(buildAgenda({ ...partial, renewals })); setError(failed);
    } catch {
      if (!mounted.current || suspended.current || run !== generation.current) return;
      setError(true);
    }
  }, [publish]);
  useEffect(() => {
    mounted.current = true;
    const update = (event?: Event) => {
      if ((event as CustomEvent<{ area?: string }> | undefined)?.detail?.area === 'profile') return;
      void refresh();
    };
    const external = (event: StorageEvent) => { if (event.key === null || KEYS.has(event.key)) void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') { suspended.current = false; void refresh(); } };
    const show = () => { suspended.current = false; void refresh(); };
    const hide = () => { suspended.current = true; generation.current += 1; action.current += 1; clearTimeout(timer.current); setAgenda(null); setBusy(null); setChanged(false); setError(false); countCallback.current?.(0); };
    queueMicrotask(() => { void refresh(); });
    window.addEventListener(MOBILITY_STORE_EVENT, update); window.addEventListener(FOLLOW_UP_STORE_EVENT, update); window.addEventListener(RENEWAL_STORE_EVENT, update);
    window.addEventListener('storage', external); window.addEventListener('focus', update); window.addEventListener('pagehide', hide); window.addEventListener('pageshow', show); document.addEventListener('visibilitychange', visible);
    return () => {
      mounted.current = false; generation.current += 1; action.current += 1; clearTimeout(timer.current);
      window.removeEventListener(MOBILITY_STORE_EVENT, update); window.removeEventListener(FOLLOW_UP_STORE_EVENT, update); window.removeEventListener(RENEWAL_STORE_EVENT, update);
      window.removeEventListener('storage', external); window.removeEventListener('focus', update); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show); document.removeEventListener('visibilitychange', visible);
    };
  }, [language, refresh]);
  useEffect(() => {
    if (!agenda) return;
    const delay = Math.max(1, Math.min(2_147_483_647, agenda.nextRefreshAt - Date.now() + 1));
    timer.current = setTimeout(() => { void refresh(); }, delay);
    return () => { clearTimeout(timer.current); };
  }, [agenda, refresh]);

  async function open(item: AgendaItem) {
    if (busy) return;
    const run = ++action.current; const sourceRun = generation.current; setBusy(item.key); setChanged(false);
    try {
      let input: AgendaInput;
      if (item.target.kind === 'case') { const cases = readCases(); input = { cases, followUps: readFollowUps(cases), renewals: [] }; }
      else input = { ...EMPTY, renewals: await readRenewals() };
      if (!mounted.current || run !== action.current || sourceRun !== generation.current) return;
      const current = currentAgendaTarget(item, input);
      if (current.target.kind === 'case') onOpenCase(current.target.id); else onOpenRenewals();
    } catch {
      if (mounted.current && run === action.current) { setChanged(true); void refresh(); }
    } finally { if (run === action.current) setBusy(null); }
  }
  function date(value: string) { return value.includes('T') ? new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : value; }
  function card(item: AgendaItem, highlighted: boolean) {
    return <article key={item.key} className={`${styles.card} ${highlighted ? styles.highlight : ''}`} aria-label={item.title || renewalKindLabel(item.documentKind!, language)}>
      {highlighted && <span className={styles.badge}>{t('Suggested next step', 'सुझाया अगला कदम')}</span>}
      <h3>{item.title || renewalKindLabel(item.documentKind!, language)}</h3>
      <p className={styles.category}>{item.service ? getService(item.service).title[language] : renewalKindLabel(item.documentKind!, language)}</p>
      <ul className={styles.reasons}>{item.reasons.map(reason => <li key={reason.kind}>{reasonCopy[reason.kind][index]}{reason.date && <>: <time dateTime={reason.date}>{date(reason.date)}</time></>}</li>)}</ul>
      <div className={styles.source}>
        {item.source.kind === 'case' ? <p>{t('From your saved case entry', 'आपकी सहेजी केस प्रविष्टि से')}: {date(item.source.date)}. {t('No source observation saved.', 'कोई स्रोत जानकारी सहेजी नहीं गई।')}</p> : <>
          <p>{item.source.kind === 'document' ? t('Source you entered', 'आपका दर्ज स्रोत') : t('Last source observation you saved', 'आपकी सहेजी अंतिम स्रोत जानकारी')}: <strong>{item.source.label}</strong> · {date(item.source.date)}</p>
          <p>{item.source.freshness === 'stale' ? t(`Source needs a fresh check · ${item.source.ageDays} days old.`, `स्रोत फिर जाँचें · ${item.source.ageDays} दिन पुराना।`) : t('Source checked less than 30 days ago; current status is not verified.', 'स्रोत 30 दिन से कम पहले जाँचा गया; वर्तमान स्थिति सत्यापित नहीं है।')}</p>
        </>}
        {item.source.failedCheckAt && <p>{t('You recorded an unsuccessful check', 'आपने असफल जाँच दर्ज की')}: {date(item.source.failedCheckAt)}. {t('That did not refresh the earlier observation.', 'इससे पहले की जानकारी की जाँच नई नहीं हुई।')}</p>}
      </div>
      <button type="button" disabled={busy !== null} onClick={() => { void open(item); }}>{busy === item.key ? t('Checking saved item…', 'सहेजा विवरण जाँच रहे हैं…') : item.target.kind === 'case' ? t('Open saved case', 'सहेजा केस खोलें') : t('Open document organiser', 'दस्तावेज़ आयोजक खोलें')}</button>
    </article>;
  }
  if (!agenda?.items.length && !error) return null;
  return <section className={styles.panel} aria-labelledby={heading}>
    <h2 id={heading}>{t('Your next steps', 'आपके अगले कदम')}</h2>
    <p className={styles.intro}>{t('From entries saved on this device. Personal dates and appointments are entered by you; no automatic official checks.', 'इस डिवाइस की सहेजी प्रविष्टियों से। निजी तारीखें और अपॉइंटमेंट आपने दर्ज किए हैं; कोई स्वचालित आधिकारिक जाँच नहीं।')}</p>
    {changed && <p role="status" className={styles.notice}>{t('That item changed, disappeared or is no longer due. Review the refreshed list before opening it.', 'वह विवरण बदला, हटा या अब जाँच के लिए देय नहीं है। खोलने से पहले नई सूची देखें।')}</p>}
    {error && <p role="status" className={styles.notice}>{t('Some saved records could not be read. Available next steps are shown; review the relevant saved-case or document organiser section.', 'कुछ सहेजे रिकॉर्ड पढ़े नहीं गए। उपलब्ध अगले कदम दिख रहे हैं; संबंधित सहेजे केस या दस्तावेज़ आयोजक देखें।')}</p>}
    {agenda?.next && card(agenda.next, true)}
    {agenda && agenda.items.length > 1 && <details className={styles.more}><summary>{t(`Show ${agenda.items.length - 1} more next steps`, `${agenda.items.length - 1} और अगले कदम देखें`)}</summary><div>{agenda.items.slice(1).map(item => card(item, false))}</div></details>}
    <details className={styles.ranking}><summary>{t('Why these appear first', 'ये पहले क्यों दिखते हैं')}</summary><p>{t('Due personal case or source checks come first, then appointments entered for the next 30 calendar days, cases marked for attention, and document checks or entered expiry dates within 30 days. Dates break ties, then stable saved IDs. These are planning suggestions, not legal deadlines or required official actions. Opening this list does not extend retention.', 'पहले देय निजी केस या स्रोत जाँच, फिर अगले 30 कैलेंडर दिनों के दर्ज अपॉइंटमेंट, ध्यान के लिए चिह्नित केस, और दस्तावेज़ जाँच या 30 दिनों के भीतर दर्ज समाप्ति तारीखें आती हैं। बराबरी होने पर तारीख और सहेजी पहचान से क्रम तय होता है। ये योजना सुझाव हैं, कानूनी समय-सीमा या अनिवार्य आधिकारिक कार्रवाई नहीं। सूची खोलने से संग्रह अवधि नहीं बढ़ती।')}</p></details>
  </section>;
}
