'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CaseStatus, MobilityCase } from '../../lib/mobility/cases';
import { getService } from '../../lib/mobility/services';
import { MOBILITY_STORE_EVENT, readCases } from '../../lib/mobility/store';
import { createJourney, getJourneyEvent, JOURNEY_EVENT_IDS, JOURNEY_RETENTION_MS, MAX_JOURNEY_LINKS, summarizeJourney, type JourneyEventId, type JourneyNextKind, type JourneyPlan } from '../../lib/mobility/journeys';
import { deleteAllJourneys, deleteJourney, JOURNEY_STORE_EVENT, JourneyStoreError, readJourneys, saveJourney } from '../../lib/mobility/journey-store';
import styles from './JourneyPanel.module.css';

type Language = 'en' | 'hi';
type Editor = { original: JourneyPlan | null; eventId: JourneyEventId | ''; caseIds: string[] };
const statusCopy: Record<CaseStatus, [string, string]> = {
  preparing: ['Preparing locally', 'स्थानीय तैयारी जारी'], ready: ['Prepared locally', 'स्थानीय तैयारी पूरी'],
  'awaiting-response': ['Awaiting a response · user-reported', 'जवाब की प्रतीक्षा · आपके अनुसार'],
  'needs-attention': ['Needs your attention', 'आपका ध्यान चाहिए'], completed: ['Marked completed · user-reported', 'पूरा चिह्नित · आपके अनुसार'],
};
const nextCopy: Record<JourneyNextKind, [string, string]> = {
  'link-case': ['Link a saved case when one is relevant to this plan.', 'इस योजना से संबंधित सहेजा केस जोड़ें।'],
  'review-attention': ['Review the case needing your attention.', 'जिस केस पर ध्यान चाहिए, उसकी समीक्षा करें।'],
  'personal-follow-up': ['Review the case whose personal follow-up date is due. This is your reminder, not an official deadline.', 'जिस केस की आपकी फ़ॉलो-अप तारीख आ गई है, उसे देखें। यह आपका अनुस्मारक है, आधिकारिक समय-सीमा नहीं।'],
  prepare: ['Continue preparing the next linked case.', 'अगले जुड़े केस की तैयारी जारी रखें।'],
  'official-step': ['Open the prepared case and review its official handoff instructions.', 'तैयार केस खोलें और आधिकारिक सेवा के निर्देश देखें।'],
  'follow-up': ['Open the waiting case and review your latest source or next check date.', 'प्रतीक्षा वाला केस खोलें और अपना नवीनतम स्रोत या अगली जाँच तारीख देखें।'],
  'review-reported-completion': ['Review the completion you recorded and keep any official acknowledgement separately.', 'अपने दर्ज किए पूर्ण परिणाम की समीक्षा करें और आधिकारिक पावती अलग रखें।'],
};

/** Mounted once near saved cases; opens only an existing case via the parent. */
export default function JourneyPanel({ language, onOpenCase, onCountChange }: { language: Language; onOpenCase: (caseId: string) => void; onCountChange?: (count: number) => void }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const id = useId(); const languageIndex = language === 'hi' ? 1 : 0;
  const [open, setOpen] = useState(false); const openRef = useRef(false);
  const [plans, setPlans] = useState<JourneyPlan[]>([]);
  const [cases, setCases] = useState<MobilityCase[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null); const editorRef = useRef<Editor | null>(null);
  const [consent, setConsent] = useState(false); const reviewed = useRef<MobilityCase[]>([]);
  const [stale, setStale] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<JourneyStoreError['code'] | ''>('');
  const [message, setMessage] = useState<'saved' | 'deleted' | 'cleared' | ''>('');
  const [deadline, setDeadline] = useState(0);
  const saveController = useRef<AbortController | null>(null);
  const previousLanguage = useRef(language);
  const generation = useRef(0); const action = useRef(0); const countCallback = useRef(onCountChange);
  useEffect(() => { countCallback.current = onCountChange; }, [onCountChange]);
  const changeEditor = useCallback((next: Editor | null) => { editorRef.current = next; setEditor(next); reviewed.current = []; setConsent(false); }, []);
  const cancelPendingSave = useCallback(() => { action.current += 1; saveController.current?.abort(); saveController.current = null; setBusy(false); reviewed.current = []; setConsent(false); }, []);
  const clearEditor = useCallback(() => { cancelPendingSave(); changeEditor(null); setStale(false); }, [cancelPendingSave, changeEditor]);
  const failure = (cause: unknown) => setError(cause instanceof JourneyStoreError ? cause.code : 'unavailable');
  useEffect(() => {
    if (previousLanguage.current === language) return;
    previousLanguage.current = language; action.current += 1; saveController.current?.abort(); saveController.current = null; reviewed.current = [];
    queueMicrotask(() => { setBusy(false); setConsent(false); });
  }, [language]);

  const refresh = useCallback(async () => {
    const run = ++generation.current;
    try {
      // Hide expired links and their reviewed editor even if storage cleanup is queued.
      const now = Date.now();
      const unexpired = (plan: JourneyPlan) => now - Date.parse(plan.updatedAt) < JOURNEY_RETENTION_MS;
      setPlans(current => current.filter(unexpired));
      if (editorRef.current?.original && !unexpired(editorRef.current.original)) {
        clearEditor(); setMessage('cleared');
      }
      // Update labels synchronously, before awaiting the plan lock, to clear deleted PII.
      const freshCases = readCases();
      setCases(openRef.current ? freshCases : []);
      const currentEditor = editorRef.current;
      if (currentEditor) {
        const ids = new Set(freshCases.map(item => item.id));
        const kept = currentEditor.caseIds.filter(caseId => ids.has(caseId));
        const selectionChanged = reviewed.current.some(item => {
          const latest = freshCases.find(saved => saved.id === item.id); const key = Symbol.for('challansakshi.mobility.case-revision');
          return JSON.stringify(latest) !== JSON.stringify(item) || (latest && Object.getOwnPropertyDescriptor(latest, key)?.value !== Object.getOwnPropertyDescriptor(item, key)?.value);
        });
        if (kept.length !== currentEditor.caseIds.length || selectionChanged) {
          changeEditor({ ...currentEditor, caseIds: kept }); setStale(true);
        }
      }
      const freshPlans = await readJourneys();
      if (run !== generation.current) return;
      setPlans(freshPlans); countCallback.current?.(freshPlans.length); setError('');
      const held = editorRef.current;
      if (held?.original) {
        const current = freshPlans.find(item => item.id === held.original!.id);
        if (!current) { clearEditor(); setMessage('cleared'); }
        else if (JSON.stringify(current) !== JSON.stringify(held.original)) { reviewed.current = []; setConsent(false); setStale(true); }
      }
      const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
      setDeadline(Math.min(tomorrow.getTime(), ...freshCases.map(item => Date.parse(item.updatedAt) + JOURNEY_RETENTION_MS), ...freshPlans.map(item => Date.parse(item.updatedAt) + JOURNEY_RETENTION_MS)));
    } catch (cause) {
      if (run !== generation.current) return;
      setCases([]); setPlans([]); countCallback.current?.(0); reviewed.current = []; setConsent(false); setStale(true);
      setError(cause instanceof JourneyStoreError ? cause.code : 'unavailable');
    }
  }, [changeEditor, clearEditor]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ area?: string; operation?: string }>).detail;
      if (detail?.area === 'profile') return;
      if (detail?.area === 'all' && detail.operation === 'delete') { clearEditor(); setCases([]); setPlans([]); countCallback.current?.(0); }
      void refresh();
    };
    const nativeChanged = (event: StorageEvent) => { if (event.key === null) { clearEditor(); setCases([]); setPlans([]); countCallback.current?.(0); void refresh(); } };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const pageHidden = () => { generation.current += 1; clearEditor(); setCases([]); };
    window.addEventListener(MOBILITY_STORE_EVENT, changed); window.addEventListener(JOURNEY_STORE_EVENT, changed);
    window.addEventListener('storage', nativeChanged); window.addEventListener('focus', changed); window.addEventListener('pagehide', pageHidden);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; generation.current += 1; action.current += 1; saveController.current?.abort(); reviewed.current = []; window.removeEventListener(MOBILITY_STORE_EVENT, changed); window.removeEventListener(JOURNEY_STORE_EVENT, changed); window.removeEventListener('storage', nativeChanged); window.removeEventListener('focus', changed); window.removeEventListener('pagehide', pageHidden); document.removeEventListener('visibilitychange', visible); };
  }, [clearEditor, refresh]);
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setTimeout(() => { void refresh(); }, Math.max(1, Math.min(2_147_483_647, deadline - Date.now() + 1)));
    return () => window.clearTimeout(timer);
  }, [deadline, refresh]);

  function begin(original: JourneyPlan | null) {
    changeEditor({ original, eventId: original?.eventId ?? '', caseIds: [...(original?.caseIds ?? [])] });
    setStale(false); setMessage(''); setError('');
  }
  async function persist(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || !editor.eventId || !consent || stale || busy) return;
    const run = ++action.current; setBusy(true); setError('');
    const controller = new AbortController(); saveController.current = controller;
    try {
      const value = editor.original ? { ...editor.original, caseIds: editor.caseIds } : createJourney(editor.eventId, editor.caseIds);
      await saveJourney(value, { original: editor.original, cases: reviewed.current, consent, signal: controller.signal });
      if (run !== action.current) return;
      changeEditor(null); setStale(false); setMessage('saved'); await refresh();
    } catch (cause) { if (run === action.current) { failure(cause); reviewed.current = []; setConsent(false); setStale(true); } }
    finally { if (saveController.current === controller) { saveController.current = null; setBusy(false); } }
  }
  async function remove(plan: JourneyPlan) {
    if (busy || !window.confirm(t('Delete this plan? Its linked cases will stay on this device.', 'यह योजना हटाएँ? इससे जुड़े केस इस डिवाइस पर रहेंगे।'))) return;
    const run = ++action.current; const controller = new AbortController(); saveController.current = controller; setBusy(true); setError('');
    try { await deleteJourney(plan, controller.signal); if (run !== action.current) return; clearEditor(); setMessage('deleted'); await refresh(); }
    catch (cause) { if (run === action.current) failure(cause); }
    finally { if (saveController.current === controller) { saveController.current = null; setBusy(false); } }
  }
  async function clearPlans() {
    if (busy || !window.confirm(t('Delete all saved plan links on this device? Your cases will stay.', 'इस डिवाइस की सभी सहेजी योजना कड़ियाँ हटाएँ? आपके केस रहेंगे।'))) return;
    const run = ++action.current; const controller = new AbortController(); saveController.current = controller; setBusy(true); setError('');
    try { await deleteAllJourneys(controller.signal); if (run !== action.current) return; clearEditor(); setMessage('deleted'); await refresh(); }
    catch (cause) { if (run === action.current) failure(cause); }
    finally { if (saveController.current === controller) { saveController.current = null; setBusy(false); } }
  }
  function openCase(caseId: string) {
    try {
      if (!readCases().some(item => item.id === caseId)) { void refresh(); return; }
      onOpenCase(caseId);
    } catch (cause) { failure(cause); }
  }
  const errorCopy: Record<JourneyStoreError['code'], [string, string]> = {
    consent: ['Review the links and choose private-device saving first.', 'पहले कड़ियाँ देखें और निजी डिवाइस पर सहेजना चुनें।'],
    conflict: ['This plan changed or was removed. Reload the saved choices before continuing.', 'यह योजना बदली या हटी है। आगे बढ़ने से पहले सहेजे विकल्प फिर लोड करें।'],
    'case-changed': ['A selected case changed or disappeared. Review the latest choices again.', 'चुना केस बदला या हटा है। नवीनतम विकल्प फिर देखें।'],
    unavailable: ['This browser could not read or save linked plans. Your cases remain available.', 'यह ब्राउज़र जुड़ी योजनाएँ पढ़ या सहेज नहीं सका। आपके केस उपलब्ध हैं।'],
    malformed: ['Saved plan data could not be read. You can clear only plans and start again.', 'सहेजी योजना की जानकारी पढ़ी नहीं गई। केवल योजनाएँ मिटाकर फिर शुरू कर सकते हैं।'],
    limit: ['Keep at most 10 plans with 10 linked cases each. Remove a plan or link before adding more.', 'अधिकतम 10 योजनाएँ रखें, हर योजना में 10 केस। और जोड़ने से पहले योजना या कड़ी हटाएँ।'],
  };
  const selectedCases = editor ? cases.filter(item => editor.caseIds.includes(item.id)) : [];
  const event = editor?.eventId ? getJourneyEvent(editor.eventId) : null;

  return <section className={styles.panel} aria-label={t('Connected life-event plans', 'जीवन बदलाव की जुड़ी योजनाएँ')}>
    <details open={open} onToggle={toggle => {
      const next = toggle.currentTarget.open; openRef.current = next; setOpen(next);
      if (next) void refresh(); else { generation.current += 1; setCases([]); cancelPendingSave(); }
    }}>
      <summary>{t('Connected life-event plans', 'जीवन बदलाव की जुड़ी योजनाएँ')} <span>({plans.length})</span></summary>
      {open && <div className={styles.body}>
        <p>{t('Connect cases you saved for one life change. Progress comes from your own case entries; no official outcome is verified here.', 'एक जीवन बदलाव के लिए अपने सहेजे केस जोड़ें। प्रगति आपके केस की प्रविष्टियों से आती है; यहाँ किसी आधिकारिक परिणाम की पुष्टि नहीं होती।')}</p>
        <details className={styles.privacy}><summary>{t('What stays on this device', 'इस डिवाइस पर क्या रहता है')}</summary><p>{t('Only the plan type, case links, dates and revision are saved. Case facts are not copied. Keep up to 10 plans with 10 links each for 90 days after a changed plan is saved. Reading or removing expired links does not renew this period. Deleting a plan keeps its cases.', 'केवल योजना का प्रकार, केस कड़ियाँ, तारीखें और संस्करण सहेजे जाते हैं। केस के तथ्य कॉपी नहीं होते। अधिकतम 10 योजनाएँ, हर एक में 10 कड़ियाँ, बदली योजना सहेजने के बाद 90 दिन तक रखें। पढ़ने या समाप्त कड़ियाँ हटाने से अवधि नहीं बढ़ती। योजना हटाने पर केस रहते हैं।')}</p></details>
        {error && <div role="alert" className={styles.warning}><p>{errorCopy[error][languageIndex]}</p>{(error === 'malformed' || error === 'unavailable') && <button type="button" onClick={() => { void clearPlans(); }}>{t('Clear saved plans only', 'केवल सहेजी योजनाएँ मिटाएँ')}</button>}</div>}
        {message && <p role="status">{message === 'saved' ? t('Plan links saved on this device. No case or official service was changed.', 'योजना कड़ियाँ इस डिवाइस पर सहेजी गईं। कोई केस या आधिकारिक सेवा नहीं बदली।') : message === 'deleted' ? t('Plan links deleted. Your cases are unchanged.', 'योजना कड़ियाँ हटाई गईं। आपके केस नहीं बदले।') : t('The saved plan disappeared or expired. Its working selection was cleared.', 'सहेजी योजना हटी या समाप्त हुई। उसका कार्य चयन मिटा दिया गया।')}</p>}
        {!editor && <button type="button" className={styles.primary} disabled={busy || !cases.length} onClick={() => begin(null)}>{t('Connect saved cases', 'सहेजे केस जोड़ें')}</button>}
        {!cases.length && <p>{t('Save a relevant case first, then explicitly link it here. Empty saved plans can be deleted below.', 'पहले संबंधित केस सहेजें, फिर उसे यहाँ स्वयं जोड़ें। खाली सहेजी योजनाएँ नीचे हटा सकते हैं।')}</p>}
        {editor && <form className={styles.editor} onSubmit={event => { void persist(event); }}>
          <label htmlFor={`${id}-event`}>{t('Life event', 'जीवन बदलाव')}</label>
          <select id={`${id}-event`} value={editor.eventId} disabled={busy || Boolean(editor.original)} onChange={change => { changeEditor({ ...editor, eventId: change.target.value as JourneyEventId | '', caseIds: [] }); }}>
            <option value="">{t('Choose a life event', 'जीवन बदलाव चुनें')}</option>
            {JOURNEY_EVENT_IDS.map(eventId => <option key={eventId} value={eventId}>{getJourneyEvent(eventId).title[language]}</option>)}
          </select>
          {event && <><p>{event.description[language]}</p><p>{t('Suggested topics only. You decide which cases belong; no service depends on finishing another here.', 'ये केवल सुझाए विषय हैं। कौन से केस जोड़ने हैं, आप चुनें; यहाँ कोई सेवा दूसरी सेवा पूरी होने पर निर्भर नहीं है।')}</p>
            <fieldset><legend>{t('Choose saved cases to link', 'जोड़ने के लिए सहेजे केस चुनें')}</legend><div className={styles.choices}>
              {cases.map(item => <label className={styles.check} key={item.id}><input type="checkbox" checked={editor.caseIds.includes(item.id)} disabled={busy || stale || (!editor.caseIds.includes(item.id) && editor.caseIds.length >= MAX_JOURNEY_LINKS)} onChange={change => { changeEditor({ ...editor, caseIds: change.target.checked ? [...editor.caseIds, item.id] : editor.caseIds.filter(caseId => caseId !== item.id) }); }} /><span><strong>{item.title}</strong><small>{getService(item.service).title[language]} · {item.jurisdiction || t('State not added', 'राज्य नहीं जोड़ा')}</small><small>{statusCopy[item.status][languageIndex]}{event.services.includes(item.service) ? ` · ${t('Suggested topic', 'सुझाया विषय')}` : ''}</small></span></label>)}
            </div></fieldset>
            <section className={styles.preview} aria-label={t('Review plan links', 'योजना कड़ियाँ देखें')}><h4>{t('Review plan links', 'योजना कड़ियाँ देखें')}</h4><p>{event.title[language]} · {selectedCases.length} {t('selected cases', 'चुने केस')}</p>{selectedCases.length ? <ul>{selectedCases.map(item => <li key={item.id}>{item.title}</li>)}</ul> : <p>{t('No case links selected.', 'कोई केस कड़ी नहीं चुनी।')}</p>}</section>
            {stale && <p role="status" className={styles.warning}>{t('Saved data changed. Your remaining selections are here, but review them again before saving.', 'सहेजी जानकारी बदली। बाकी चयन यहीं हैं, लेकिन सहेजने से पहले फिर समीक्षा करें।')}</p>}
            {stale && <button type="button" disabled={busy} onClick={() => { const latest = editor.original ? plans.find(item => item.id === editor.original!.id) ?? null : null; begin(latest); }}>{t('Reload plan choices', 'योजना विकल्प फिर लोड करें')}</button>}
            <label className={styles.check}><input type="checkbox" checked={consent} disabled={busy || stale} onChange={change => { reviewed.current = change.target.checked ? selectedCases : []; setConsent(change.target.checked); }} /><span>{t('This is my private device. Save these reviewed plan links here for up to 90 days.', 'यह मेरा निजी डिवाइस है। समीक्षा की गई योजना कड़ियाँ यहाँ अधिकतम 90 दिन सहेजें।')}</span></label>
            <button type="submit" className={styles.primary} disabled={busy || stale || !consent || (!editor.original && !selectedCases.length)}>{busy ? t('Saving…', 'सहेज रहे हैं…') : t('Save plan links', 'योजना कड़ियाँ सहेजें')}</button>
          </>}
          <button type="button" disabled={busy} onClick={clearEditor}>{t('Cancel linking', 'जोड़ना रद्द करें')}</button>
        </form>}
        {plans.map((plan, index) => {
          const definition = getJourneyEvent(plan.eventId); const summary = summarizeJourney(plan, cases);
          return <article className={styles.plan} key={plan.id} aria-label={`${definition.title[language]} · ${index + 1}`}>
            <h4>{definition.title[language]} · {index + 1}</h4>
            <p>{summary.completedReported} / {summary.total} {t('linked cases marked completed by you', 'जुड़े केस आपने पूरा चिह्नित किए')}</p>
            {summary.total > 0 && <progress max={summary.total} value={summary.completedReported} aria-label={t('User-reported case completion', 'आपके बताए केस पूरे होने की प्रगति')} />}
            {!summary.total && <p>{t('No current case links. Removed or expired cases are not retained in this plan.', 'कोई वर्तमान केस कड़ी नहीं। हटे या समाप्त केस इस योजना में नहीं रखे जाते।')}</p>}
            <ul className={styles.linked}>{summary.cases.map(item => <li key={item.id}><button type="button" onClick={() => openCase(item.id)}>{item.title}</button><small>{item.personalCheckDue ? t('Your personal follow-up date is due', 'आपकी फ़ॉलो-अप तारीख आ गई है') : statusCopy[item.status][languageIndex]}</small></li>)}</ul>
            <section className={styles.next} aria-label={t('One next step', 'एक अगला कदम')}><h5>{t('One next step', 'एक अगला कदम')}</h5><p>{nextCopy[summary.next.kind][languageIndex]}</p>{summary.next.caseId ? <button type="button" onClick={() => openCase(summary.next.caseId!)}>{t('Open next case', 'अगला केस खोलें')}</button> : <button type="button" disabled={busy || !cases.length} onClick={() => begin(plan)}>{t('Choose case links', 'केस कड़ियाँ चुनें')}</button>}</section>
            <details className={styles.privacy}><summary>{t('Suggested topics and official sources', 'सुझाए विषय और आधिकारिक स्रोत')}</summary><p>{t('A possible preparation order, not a required sequence. Select only services that apply; the authority decides its requirements.', 'तैयारी का एक संभावित क्रम, अनिवार्य क्रम नहीं। केवल लागू सेवाएँ चुनें; आवश्यकताएँ प्राधिकरण तय करता है।')}</p><ol>{definition.services.map(service => <li key={service}><a href={getService(service).sourceUrl} target="_blank" rel="noopener noreferrer">{getService(service).title[language]}</a></li>)}</ol></details>
            <p className={styles.meta}>{t('Plan expires', 'योजना समाप्त होगी')}: {new Date(Date.parse(plan.updatedAt) + JOURNEY_RETENTION_MS).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}</p>
            <div className={styles.actions}><button type="button" disabled={busy} onClick={() => begin(plan)}>{t('Edit case links', 'केस कड़ियाँ बदलें')}</button><button type="button" disabled={busy} onClick={() => { void remove(plan); }}>{t('Delete plan', 'योजना हटाएँ')}</button></div>
          </article>;
        })}
      </div>}
    </details>
  </section>;
}
