'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOBILITY_STORE_EVENT, readCases, saveCase } from '../../lib/mobility/store';
import { updateCase, validateCase, type MobilityCase } from '../../lib/mobility/cases';
import styles from './DocumentCasePanel.module.css';
import CaseAccountPreview from './CaseAccountPreview';
import ProfileAccountPanel from './ProfileAccountPanel';
import AdviserPanel from './AdviserPanel';
import HelperAccessPanel from './HelperAccessPanel';

type Status = { configured: boolean; authenticated: boolean; user?: { id: string; name: string; email: string } };
type Remote = { value: MobilityCase; revision: number };
type AccountContext = { accountId: string; generation: number };
type PendingUpload = { value: MobilityCase; accountId: string; revision: number };
class AccountRequestError extends Error {
  constructor(readonly status: number, readonly code: string) { super('Account request failed.'); }
}
async function request(path: string, method = 'GET', payload?: unknown, accountId?: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/account/${path}`, { method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20_000), headers: { ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }), ...(accountId ? { 'X-Mobility-Account': accountId } : {}) }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const parsed: unknown = await response.json();
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid account response');
  const value = parsed as Record<string, unknown>;
  if (!response.ok) throw new AccountRequestError(response.status, typeof value.code === 'string' ? value.code : '');
  return value;
}
function readStatus(value: Record<string, unknown>): Status {
  if (typeof value.configured !== 'boolean' || typeof value.authenticated !== 'boolean') throw new Error('Invalid account status');
  if (value.authenticated) {
    const user = value.user as Record<string, unknown> | undefined;
    if (!user || typeof user.id !== 'string' || !user.id || user.id.length > 160 || typeof user.email !== 'string' || typeof user.name !== 'string') throw new Error('Invalid account identity');
  }
  return value as Status;
}
export default function AccountPanel({ language }: { language: 'en' | 'hi' }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [status, setStatus] = useState<Status | null>(null);
  const [remote, setRemote] = useState<Remote[]>([]);
  const [local, setLocal] = useState<MobilityCase[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [deleteAccount, setDeleteAccount] = useState(false);
  const [notice, setNotice] = useState<'account-changed' | 'local-changed' | 'unavailable' | null>(null);
  const currentAccount = useRef<string | null>(null);
  const generation = useRef(0);
  const statusGeneration = useRef(0);
  const alive = useRef(true);
  const working = useRef(false);
  const clearReview = useCallback(() => { generation.current += 1; setRemote([]); setLocal([]); setPending(null); setDeleteAccount(false); }, []);
  const refreshStatus = useCallback(async (forceClear = false) => {
    const attempt = ++statusGeneration.current;
    if (forceClear) { clearReview(); currentAccount.current = null; setStatus(null); }
    try {
      const next = readStatus(await request('status'));
      if (!alive.current || statusGeneration.current !== attempt) return;
      const nextId = next.authenticated ? next.user!.id : null;
      if (currentAccount.current !== nextId) {
        if (currentAccount.current !== null) setNotice('account-changed');
        clearReview();
      }
      currentAccount.current = nextId; setStatus(next);
    } catch {
      if (alive.current && statusGeneration.current === attempt) { clearReview(); currentAccount.current = null; setStatus(null); setNotice('unavailable'); }
    }
  }, [clearReview]);
  const accountChanged = useCallback(() => { setNotice('account-changed'); setMessage(''); void refreshStatus(true); }, [refreshStatus]);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (alive.current) void refreshStatus(); });
    const focus = () => { void refreshStatus(); };
    window.addEventListener('focus', focus);
    return () => { alive.current = false; generation.current += 1; statusGeneration.current += 1; window.removeEventListener('focus', focus); };
  }, [refreshStatus]);
  useEffect(() => {
    const invalidate = (event: Event) => {
      const area = (event as CustomEvent<{ area?: string }>).detail?.area;
      if (area && area !== 'cases' && area !== 'all') return;
      generation.current += 1;
      setLocal([]); setPending(null); setNotice('local-changed');
    };
    window.addEventListener(MOBILITY_STORE_EVENT, invalidate);
    return () => window.removeEventListener(MOBILITY_STORE_EVENT, invalidate);
  }, []);
  const isCurrent = (context: AccountContext) => alive.current && currentAccount.current === context.accountId && generation.current === context.generation;
  const run = async (operation: (context: AccountContext) => Promise<unknown>) => {
    if (working.current || !currentAccount.current) return;
    const context = { accountId: currentAccount.current, generation: generation.current };
    working.current = true; setBusy(true); setMessage(''); setNotice(null);
    try { await operation(context); }
    catch (cause) {
      if (isCurrent(context)) {
        if (cause instanceof AccountRequestError && (cause.status === 401 || cause.code === 'account-changed')) accountChanged();
        else setMessage(t('Could not complete that action. Reload the account list before trying again; your device copies remain.', 'कार्रवाई पूरी नहीं हो सकी। दोबारा कोशिश से पहले खाते की सूची खोलें; डिवाइस की प्रतियाँ बनी रहेंगी।'));
      }
    } finally { working.current = false; if (alive.current) setBusy(false); }
  };
  const load = async (context: AccountContext) => {
    const result = await request('cases', 'GET', undefined, context.accountId);
    if (!Array.isArray(result.cases) || result.cases.length > 50) throw new Error('Invalid account records');
    const records = result.cases.map((item: Remote) => {
      if (!Number.isSafeInteger(item.revision) || item.revision < 1) throw new Error('Invalid revision');
      return { value: validateCase(item.value), revision: item.revision };
    });
    if (isCurrent(context)) setRemote(records);
    return records;
  };
  const copyToDevice = (item: MobilityCase) => {
    try {
      const cases = readCases();
      const source = cases.some(existing => existing.id === item.id) ? { ...item, id: crypto.randomUUID(), title: `${item.title.slice(0,140)} ${t('(account copy)', '(खाते की प्रति)')}` } : item;
      const copy = updateCase(source, {}, new Date().toISOString(), { kind: 'updated', basis: 'local', text: t('Saved a reviewed copy from my account on this private device.', 'खाते की जाँची प्रति इस निजी डिवाइस पर सहेजी।') });
      saveCase(copy); setLocal(readCases()); setNotice(null); setMessage(t('Saved a device copy. Existing device cases were preserved.', 'डिवाइस पर प्रति सहेजी। मौजूदा मामले सुरक्षित रखे गए।'));
    } catch { setMessage(t('Could not save a device copy. Check available browser storage.', 'डिवाइस पर प्रति सहेजी नहीं जा सकी। ब्राउज़र संग्रह जाँचें।')); }
  };
  return <section className={styles.panel} aria-labelledby="account-heading">
    <h1 id="account-heading">{t('Your account', 'आपका खाता')}</h1>
    <p>{t('Keep using the tools as a guest. An account lets you choose which saved cases to carry to another device.', 'अतिथि के रूप में उपकरण उपयोग करते रहें। खाते से आप चुने हुए मामले दूसरे डिवाइस पर ले जा सकते हैं।')}</p>
    {status && !status.configured && <p>{t('Account saving is not available yet. You can save and reopen cases on this device today.', 'खाते में सहेजना अभी उपलब्ध नहीं है। आज इस डिवाइस पर मामले सहेज और फिर खोल सकते हैं।')}</p>}
    {status?.configured && !status.authenticated && <a className={styles.action} href="/api/account/login">{t('Continue with Google', 'Google से आगे बढ़ें')}</a>}
    {status?.authenticated && <>
      <p>{t('Signed in as', 'इस नाम से साइन इन')}: {status.user?.name || status.user?.email}</p>
      <p>{t('Choose a case before uploading. Its readings, request and timeline are available for 90 days after an account save. Expired copies are removed when the account cases are next accessed. Original documents stay on your device. Account and device copies are managed separately.', 'अपलोड से पहले मामला चुनें। उसके विवरण, अनुरोध और समयरेखा खाते में सहेजने के बाद 90 दिन तक उपलब्ध हैं। अगली बार खाते के मामले खोलने पर अवधि समाप्त प्रतियाँ हटती हैं। मूल दस्तावेज़ डिवाइस पर रहते हैं। खाते और डिवाइस की प्रतियाँ अलग संभाली जाती हैं।')}</p>
      <button className={styles.action} disabled={busy} onClick={() => { try { setLocal(readCases()); setMessage(''); setNotice(null); } catch { setMessage(t('Could not read device cases.', 'डिवाइस के मामले पढ़े नहीं जा सके।')); } }}>{t('Choose cases on my private device', 'मेरे निजी डिवाइस के मामले चुनें')}</button>
      <button className={styles.action} disabled={busy} onClick={() => void run(load)}>{t('Load my account cases', 'मेरे खाते के मामले खोलें')}</button>
      {local.map(item => <article key={item.id}><strong>{item.title}</strong><p>{item.facts.length} {t('details', 'विवरण')} · {item.status}</p><button disabled={busy} onClick={() => void run(async context => { const records = await load(context); if (isCurrent(context)) setPending({ value: item, accountId: context.accountId, revision: records.find(record => record.value.id === item.id)?.revision ?? 0 }); })}>{t('Review account save', 'खाते में सहेजने की समीक्षा')}</button></article>)}
      {pending && <div role="region" aria-label={t('Review upload', 'अपलोड की समीक्षा')}><h2>{pending.value.title}</h2><p>{t('This sends the displayed case details and its history to your signed-in account. If an account copy exists, this replaces that copy after checking its revision.', 'यह दिखाए गए मामले के विवरण और इतिहास को आपके खाते में भेजता है। खाते में प्रति होने पर उसकी संशोधन स्थिति जाँचकर यह उसे बदलता है।')}</p><CaseAccountPreview item={pending.value} language={language} /><button disabled={busy} onClick={() => void run(async context => { const source = readCases().find(item => item.id === pending.value.id); if (pending.accountId !== context.accountId || !source || JSON.stringify(source) !== JSON.stringify(pending.value)) { setPending(null); setLocal([]); setNotice('local-changed'); return; } await request('cases', 'PUT', { value: pending.value, revision: pending.revision }, pending.accountId); if (!isCurrent(context)) return; setPending(null); await load(context); if (isCurrent(context)) setMessage(t('Case saved to your account.', 'मामला आपके खाते में सहेजा गया।')); })}>{t('Save this reviewed case to my account', 'यह जाँचा मामला मेरे खाते में सहेजें')}</button><button disabled={busy} onClick={() => setPending(null)}>{t('Cancel', 'रद्द करें')}</button></div>}
      {remote.map(item => <article key={item.value.id}>
        <h2>{item.value.title}</h2><p>{t('Account copy', 'खाते की प्रति')} · {new Date(item.value.updatedAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}</p>
        <button disabled={busy} onClick={() => copyToDevice(item.value)}>{t('Save a copy on my private device', 'मेरे निजी डिवाइस पर प्रति सहेजें')}</button>
        <details><summary>{t('Remove account copy', 'खाते की प्रति हटाएँ')}</summary><p>{t('This deletes this account copy. Device copies remain.', 'यह खाते की प्रति मिटाता है। डिवाइस की प्रतियाँ बनी रहेंगी।')}</p><button disabled={busy} onClick={() => void run(async context => { await request('cases', 'DELETE', { id: item.value.id, revision: item.revision }, context.accountId); if (isCurrent(context)) await load(context); })}>{t('Delete this account copy', 'खाते की यह प्रति मिटाएँ')}</button></details>
        <AdviserPanel accountId={status.user!.id} onAccountChanged={accountChanged} caseValue={item.value} revision={item.revision} language={language} />
        <HelperAccessPanel accountId={status.user!.id} onAccountChanged={accountChanged} caseValue={item.value} revision={item.revision} language={language} onCaseUpdated={() => { void run(load); }} />
      </article>)}
      <ProfileAccountPanel key={status.user!.id} accountId={status.user!.id} onAccountChanged={accountChanged} language={language} disabled={busy} />
      <button disabled={busy} onClick={() => void run(async context => { await request('logout', 'POST', undefined, context.accountId); if (isCurrent(context)) { currentAccount.current = null; clearReview(); setStatus({ configured: true, authenticated: false }); } })}>{t('Sign out', 'साइन आउट')}</button>
      <details><summary>{t('Delete account and cloud copies', 'खाता और क्लाउड प्रतियाँ मिटाएँ')}</summary><p>{t('This removes your account, all account cases and sessions. Device copies remain until you delete them on each device.', 'इससे खाता, खाते के सभी मामले और सत्र हट जाते हैं। हर डिवाइस की प्रतियाँ वहाँ मिटाने तक बनी रहती हैं।')}</p><label><input type="checkbox" checked={deleteAccount} onChange={event => setDeleteAccount(event.target.checked)} />{t('Delete my account and its saved data', 'मेरा खाता और उसका सहेजा डेटा मिटाएँ')}</label><button disabled={busy || !deleteAccount} onClick={() => void run(async context => { await request('data', 'DELETE', undefined, context.accountId); if (isCurrent(context)) { currentAccount.current = null; clearReview(); setStatus({ configured: true, authenticated: false }); } })}>{t('Permanently delete my account', 'मेरा खाता स्थायी रूप से मिटाएँ')}</button></details>
    </>}
    {notice && <p role="status">{notice === 'account-changed' ? t('The signed-in account changed or the session ended. Review this account before choosing data again. Nothing was retried.', 'साइन-इन खाता बदल गया या सत्र समाप्त हुआ। डेटा फिर चुनने से पहले यह खाता जाँचें। कोई कार्रवाई दोहराई नहीं गई।') : notice === 'local-changed' ? t('Device cases changed or were deleted. Choose and review the current device case again before uploading.', 'डिवाइस के केस बदले या मिटाए गए। अपलोड से पहले वर्तमान केस फिर चुनकर जाँचें।') : t('Account service is unavailable. Your device cases are still available.', 'खाता सेवा उपलब्ध नहीं है। डिवाइस के मामले अभी भी उपलब्ध हैं।')}</p>}
    {status === null && notice === 'unavailable' && <button onClick={() => void refreshStatus()}>{t('Refresh account access', 'खाते की पहुँच फिर जाँचें')}</button>}
    {message && <p role="status">{message}</p>}
    <a href="/mobility">{t('Go to my mobility cases', 'मेरे मोबिलिटी मामले खोलें')}</a>
  </section>;
}
