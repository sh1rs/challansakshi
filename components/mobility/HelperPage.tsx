'use client';

import { useEffect, useRef, useState } from 'react';
import { PublicBetaShell } from '../public-beta/PublicBetaShell';
import type { HelperInvitation, HelperSnapshot } from '../../lib/mobility/helper-contract';
import { HelperRequestError, HelperSnapshotPreview, helperError, helperRequest, readHelperInvitation, readHelperSnapshot, type HelperLanguage } from './HelperAccessPanel';
import styles from './HelperAccessPanel.module.css';

type Location = { kind: 'invite' | 'task'; value: string };
type AccountStatus = { configured: boolean; authenticated: boolean; user?: { id: string; email: string } };
type Task = { invitation: HelperInvitation; snapshot: HelperSnapshot };

function readFragment(): Location | null {
  const invite = /^#invite=([a-f0-9]{64})$/.exec(window.location.hash);
  if (invite) return { kind: 'invite', value: invite[1] };
  const task = /^#task=([A-Za-z0-9][A-Za-z0-9_-]{0,79})$/.exec(window.location.hash);
  return task ? { kind: 'task', value: task[1] } : null;
}

export default function HelperPage() {
  const [language, setLanguage] = useState<HelperLanguage>('en');
  const [location, setLocation] = useState<Location | null | undefined>(undefined);
  useEffect(() => {
    const change = () => setLocation(readFragment());
    change(); window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="विश्वसनीय सहायक" onQuickExit={() => window.location.replace('/')}>
    <main className={styles.page}>
      <h1>{t('Help with one preparation case', 'एक केस की तैयारी में मदद करें')}</h1>
      <p>{t('A case owner can share selected details for your preparation suggestions. You cannot change their case or perform any official action. The owner reviews and applies any suggestion.', 'केस का मालिक तैयारी के सुझाव के लिए चुने विवरण साझा कर सकता है। आप उनका केस नहीं बदल सकते या कोई आधिकारिक कार्रवाई नहीं कर सकते। मालिक हर सुझाव जाँचकर अपनाता है।')}</p>
      {location === undefined ? <p role="status">{t('Checking the invitation link…', 'आमंत्रण लिंक जाँचा जा रहा है…')}</p> : location === null ? <div className={styles.card}><p>{t('Open the complete invitation link the owner shared with you. An accepted task can be reopened using its task link.', 'मालिक का साझा किया पूरा आमंत्रण लिंक खोलें। स्वीकृत काम उसके लिंक से दोबारा खोला जा सकता है।')}</p><a href="/account">{t('Open my account', 'मेरा खाता खोलें')}</a></div>
        : <HelperSession key={`${location.kind}:${location.value}`} location={location} language={language} onAccepted={id => {
          window.history.replaceState(null, '', `/helper#task=${encodeURIComponent(id)}`);
          setLocation({ kind: 'task', value: id });
        }} />}
    </main>
  </PublicBetaShell>;
}

function HelperSession({ location, language, onAccepted }: { location: Location; language: HelperLanguage; onAccepted: (id: string) => void }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [draft, setDraft] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [accountChanged, setAccountChanged] = useState(false);
  const alive = useRef(true);
  const action = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; action.current?.abort(); }; }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const value = await helperRequest('status', 'GET', undefined, controller.signal);
        if (typeof value.configured !== 'boolean' || typeof value.authenticated !== 'boolean') throw new HelperRequestError(502);
        const user = value.user as { id?: unknown; email?: unknown } | undefined;
        if (value.authenticated && (typeof user?.id !== 'string' || !user.id || typeof user?.email !== 'string' || !user.email)) throw new HelperRequestError(502);
        if (!alive.current || controller.signal.aborted) return;
        setStatus(value as AccountStatus);
        if (value.authenticated && location.kind === 'task') {
          const response = await helperRequest(`helpers/${encodeURIComponent(location.value)}`, 'GET', undefined, controller.signal, String(user!.id));
          const invitation = readHelperInvitation(response.invitation); const snapshot = readHelperSnapshot(response.snapshot);
          if (invitation.id !== location.value || invitation.status !== 'accepted' || Date.parse(invitation.expiresAt) <= Date.now() || invitation.helperEmail.toLowerCase() !== String(user!.email).toLowerCase()) throw new HelperRequestError(403);
          if (!alive.current || controller.signal.aborted) return;
          setTask({ invitation, snapshot }); setDraft(invitation.proposal?.draft ?? snapshot.draft);
        }
      } catch (cause) { if (alive.current && !controller.signal.aborted) { setTask(null); setDraft(''); setError(cause); if (cause instanceof HelperRequestError && (cause.status === 401 || cause.code === 'account-changed')) { setStatus(null); setAccountChanged(true); } } }
    })();
    return () => controller.abort();
  }, [location.kind, location.value, refresh]);

  const refreshAccess = () => {
    action.current?.abort(); action.current = null; setBusy(false);
    setStatus(null); setTask(null); setDraft(''); setError(null); setExpired(false); setSaved(false); setAccountChanged(false);
    setRefresh(value => value + 1);
  };

  useEffect(() => {
    if (!task) return;
    const remaining = Date.parse(task.invitation.expiresAt) - Date.now();
    const expire = () => { action.current?.abort(); action.current = null; setBusy(false); setTask(null); setDraft(''); setSaved(false); setExpired(true); };
    const timer = window.setTimeout(expire, Math.max(0, Math.min(remaining, 2_147_483_647)));
    return () => window.clearTimeout(timer);
  }, [task]);

  const run = async (operation: (signal: AbortSignal) => Promise<void>) => {
    if (action.current) return;
    const controller = new AbortController(); action.current = controller;
    setBusy(true); setError(null); setSaved(false);
    try { await operation(controller.signal); }
    catch (cause) {
      if (alive.current && !controller.signal.aborted) {
        setError(cause);
        if (cause instanceof HelperRequestError && [401, 403, 404, 409].includes(cause.status)) { setTask(null); setDraft(''); }
        if (cause instanceof HelperRequestError && (cause.status === 401 || cause.code === 'account-changed')) { setStatus(null); setError(null); setAccountChanged(true); setRefresh(value => value + 1); }
      }
    } finally { if (action.current === controller) { action.current = null; if (alive.current) setBusy(false); } }
  };

  return <>
    {accountChanged && <p className={styles.error} role="alert">{helperError(new HelperRequestError(409, 'account-changed'), language)}</p>}
    {status === null && !error && <p className={styles.status} role="status">{t('Checking your account access…', 'खाते की पहुँच जाँची जा रही है…')}</p>}
    {status && !status.configured && <div className={styles.card}><p>{t('Account helper access is not available yet. The owner can keep preparing their case on their device.', 'खाते में सहायक की पहुँच अभी उपलब्ध नहीं है। मालिक अपने डिवाइस पर केस की तैयारी जारी रख सकता है।')}</p></div>}
    {status?.configured && !status.authenticated && <div className={styles.card}>
      <h2>{t('Sign in with the invited email', 'आमंत्रित ईमेल से साइन इन करें')}</h2>
      <p>{t('Keep this invitation tab open. Sign in in another tab using the email the owner invited, then return here and refresh access.', 'यह आमंत्रण टैब खुला रखें। मालिक के आमंत्रित ईमेल से दूसरे टैब में साइन इन करें, फिर यहाँ लौटकर पहुँच रीफ़्रेश करें।')}</p>
      <a className={styles.actionLink} href="/account" target="_blank" rel="noopener noreferrer">{t('Sign in in another tab', 'दूसरे टैब में साइन इन करें')}</a>
      <button type="button" disabled={busy} onClick={refreshAccess}>{t('I signed in — refresh access', 'मैंने साइन इन किया — पहुँच रीफ़्रेश करें')}</button>
    </div>}
    {status?.authenticated && <>
      <p className={styles.status}>{t('Signed in as', 'साइन-इन ईमेल')}: {status.user?.email}</p>
      {location.kind === 'invite' && <div className={styles.card}>
        <h2>{t('Accept only if you expected this invitation', 'उम्मीद किया आमंत्रण ही स्वीकार करें')}</h2>
        <p>{t('Acceptance opens the selected case snapshot for preparation suggestions until its expiry. The owner can revoke access, and changing the account case ends this snapshot’s access.', 'स्वीकार करने पर अवधि समाप्त होने तक तैयारी के सुझाव के लिए चुनी केस प्रति खुलेगी। मालिक पहुँच हटा सकता है और खाते का केस बदलने पर इस प्रति की पहुँच समाप्त होती है।')}</p>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => void run(async signal => {
          const response = await helperRequest('helpers/accept', 'POST', { token: location.value }, signal, status.user!.id);
          const invitation = readHelperInvitation(response.invitation); readHelperSnapshot(response.snapshot);
          if (invitation.status !== 'accepted' || Date.parse(invitation.expiresAt) <= Date.now() || invitation.helperEmail.toLowerCase() !== status.user?.email.toLowerCase()) throw new HelperRequestError(403);
          if (alive.current && !signal.aborted) onAccepted(invitation.id);
        })}>{busy ? t('Accepting…', 'स्वीकार किया जा रहा है…') : t('Accept this preparation invitation', 'तैयारी का यह आमंत्रण स्वीकार करें')}</button>
        <a href="/account" target="_blank" rel="noopener noreferrer">{t('Use a different sign-in email in another tab', 'दूसरे टैब में अलग ईमेल से साइन इन करें')}</a>
      </div>}
      {task && <>
        <p>{t('Access ends', 'पहुँच समाप्त')}: {new Date(task.invitation.expiresAt).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</p>
        <HelperSnapshotPreview snapshot={task.snapshot} language={language} label={t('Shared case snapshot', 'साझा केस की प्रति')} />
        <section className={styles.card} aria-labelledby="helper-suggestion-heading">
          <h2 id="helper-suggestion-heading">{t('Suggest a preparation draft', 'तैयारी का मसौदा सुझाएँ')}</h2>
          <p>{t('Use only the shared details. Keep uncertainties visible. Your suggestion does not change the case; its owner must review and choose to apply it.', 'केवल साझा विवरण उपयोग करें। अनिश्चितताएँ स्पष्ट रखें। आपके सुझाव से केस नहीं बदलता; मालिक को जाँचकर अपनाना होगा।')}</p>
          <label htmlFor="helper-draft">{t('Your preparation suggestion', 'तैयारी के लिए आपका सुझाव')}</label>
          <textarea id="helper-draft" rows={9} maxLength={16000} value={draft} disabled={busy} onChange={event => { setDraft(event.target.value); setSaved(false); }} />
          <small>{draft.length.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')} / 16,000 {t('characters', 'अक्षर')}</small>
          <button type="button" className={styles.primary} disabled={busy || !draft.trim() || draft.length > 16000} onClick={() => void run(async signal => {
            const response = await helperRequest(`helpers/${encodeURIComponent(task.invitation.id)}`, 'PUT', { draft, revision: task.invitation.revision }, signal, status.user!.id);
            if (!Number.isSafeInteger(response.revision) || (response.revision as number) <= task.invitation.revision) throw new HelperRequestError(502);
            if (!alive.current || signal.aborted || Date.parse(task.invitation.expiresAt) <= Date.now()) return;
            setTask({ ...task, invitation: { ...task.invitation, revision: response.revision as number } }); setSaved(true);
          })}>{t('Save suggestion for owner', 'मालिक के लिए सुझाव सहेजें')}</button>
        </section>
      </>}
      <button type="button" onClick={refreshAccess}>{t('Refresh access', 'पहुँच फिर जाँचें')}</button>
    </>}
    {error !== null && <p className={styles.error} role="alert">{helperError(error, language)}</p>}
    {status === null && error !== null && <button type="button" onClick={refreshAccess}>{t('Refresh access', 'पहुँच फिर जाँचें')}</button>}
    {expired && <p className={styles.error} role="alert">{t('This invitation has expired. The shared snapshot has been cleared from this page. Ask the owner for a new invitation.', 'इस आमंत्रण की अवधि समाप्त हो गई। इस पेज से साझा प्रति हटा दी गई है। मालिक से नया आमंत्रण माँगें।')}</p>}
    {saved && <p role="status" aria-live="polite">{t('Suggestion saved for the owner to review. The account case has not changed.', 'मालिक की समीक्षा के लिए सुझाव सहेजा गया। खाते का केस नहीं बदला है।')}</p>}
    <details className={styles.privacy}><summary>{t('Access and privacy', 'पहुँच और गोपनीयता')}</summary>
      <p className={styles.boundary}>{t('This page keeps the invitation and shared details in transient memory. It does not save them to this device or send messages. Close the tab when finished.', 'यह पेज आमंत्रण और साझा विवरण अस्थायी मेमोरी में रखता है। इन्हें डिवाइस पर सहेजता या संदेश नहीं भेजता। काम पूरा होने पर टैब बंद करें।')}</p>
      <p className={styles.boundary}>{t('Your access lasts 1–24 hours. The shared snapshot and your proposals may remain with the owner’s account case during its 90-day retention until deleted. Ending access does not immediately delete those account records.', 'आपकी पहुँच 1–24 घंटे रहती है। साझा प्रति और आपके सुझाव मालिक के खाते के केस की 90-दिन संग्रह अवधि में, मिटाए जाने तक रह सकते हैं। पहुँच समाप्त होने से खाते के ये रिकॉर्ड तुरंत नहीं मिटते।')}</p>
    </details>
  </>;
}
