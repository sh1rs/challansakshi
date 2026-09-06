'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createCase, validateCase, type MobilityCase, type ServiceKind } from '../../lib/mobility/cases';
import type { HelperInvitation, HelperSnapshot } from '../../lib/mobility/helper-contract';
import { getService } from '../../lib/mobility/services';
import { sha256Hex } from '../../lib/local-sha256';
import styles from './HelperAccessPanel.module.css';

export type HelperLanguage = 'en' | 'hi';
export class HelperRequestError extends Error {
  constructor(public status: number, public code = '') { super('Helper request could not complete.'); }
}
export async function helperRequest(path: string, method = 'GET', payload?: unknown, signal?: AbortSignal, accountId?: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/account/${path}`, { method, credentials: 'same-origin', cache: 'no-store', signal, headers: { ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }), ...(accountId ? { 'X-Mobility-Account': accountId } : {}) }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { code?: unknown };
    throw new HelperRequestError(response.status, typeof error.code === 'string' ? error.code : '');
  }
  const value: unknown = await response.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HelperRequestError(502);
  return value as Record<string, unknown>;
}
export function helperError(error: unknown, language: HelperLanguage): string {
  if (error instanceof HelperRequestError && error.code === 'account-changed') return language === 'hi' ? 'साइन-इन खाता बदल गया। साझा विवरण हटाए गए। वर्तमान खाते को जाँचकर फिर कार्रवाई चुनें; कोई अनुरोध दोहराया नहीं गया।' : 'The signed-in account changed. Shared details were cleared. Review the current account before choosing an action again; nothing was retried.';
  if (error instanceof HelperRequestError && error.code === 'helper-history-full') return language === 'hi' ? 'इस खाते में 100 आमंत्रण रिकॉर्ड हैं। नया आमंत्रण बनाने से पहले किसी केस का समाप्त आमंत्रण इतिहास मिटाएँ। केस नहीं मिटेगा।' : 'This account has 100 saved invitations. Delete ended invitation history from one of your cases before creating another. The case itself stays saved.';
  const code = error instanceof HelperRequestError ? error.status : 0;
  const en = code === 401 ? 'Sign in again before continuing. Your session may have ended.'
    : code === 403 ? 'This action is unavailable for this account. The invitation may have ended, already been used, or belong to another sign-in email.'
      : code === 404 ? 'This invitation or account case is unavailable. Ask the owner to check it.'
        : code === 409 ? 'The invitation, suggestion or case changed. Refresh and review the current version before continuing.'
          : code === 400 ? 'Check the selected details, helper sign-in email, expiry and current revision before trying again.'
            : code === 413 ? 'This selection is too large. Share fewer details or shorten the suggestion.'
              : 'Helper access could not complete this step. Refresh before trying again; no official action was performed.';
  const hi = code === 401 ? 'आगे बढ़ने से पहले फिर साइन इन करें। आपके सत्र की अवधि समाप्त हो सकती है।'
    : code === 403 ? 'इस खाते के लिए यह कार्रवाई उपलब्ध नहीं है। आमंत्रण समाप्त, पहले उपयोग किया गया या किसी दूसरे साइन-इन ईमेल का हो सकता है।'
      : code === 404 ? 'यह आमंत्रण या खाते का केस उपलब्ध नहीं है। मालिक से जाँचने को कहें।'
        : code === 409 ? 'आमंत्रण, सुझाव या केस बदल गया है। आगे बढ़ने से पहले रीफ़्रेश करके वर्तमान प्रति जाँचें।'
          : code === 400 ? 'फिर कोशिश करने से पहले चुने विवरण, सहायक का साइन-इन ईमेल, अवधि और वर्तमान प्रति जाँचें।'
            : code === 413 ? 'चुनी जानकारी बहुत बड़ी है। कम विवरण साझा करें या सुझाव छोटा करें।'
              : 'सहायक की पहुँच वाला यह चरण पूरा नहीं हुआ। फिर कोशिश से पहले रीफ़्रेश करें; कोई आधिकारिक कार्रवाई नहीं हुई।';
  return language === 'hi' ? hi : en;
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HelperRequestError(502); return value as Record<string, unknown>; }
function text(value: unknown, max: number, empty = false): string { if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw new HelperRequestError(502); return value; }
function revision(value: unknown): number { if (!Number.isSafeInteger(value) || (value as number) < 1) throw new HelperRequestError(502); return value as number; }
function identifier(value: unknown): string { const id = text(value, 80); if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) throw new HelperRequestError(502); return id; }
function date(value: unknown): string { const iso = text(value, 64); if (!Number.isFinite(Date.parse(iso))) throw new HelperRequestError(502); return iso; }
export function readHelperInvitation(value: unknown): HelperInvitation {
  const item = record(value);
  if (!['invited', 'accepted', 'revoked', 'expired', 'case-changed', 'applied'].includes(String(item.status))) throw new HelperRequestError(502);
  let proposal: HelperInvitation['proposal'] = null;
  if (item.proposal !== null) { const proposed = record(item.proposal); proposal = { draft: text(proposed.draft, 16_000), at: date(proposed.at) }; }
  return { id: identifier(item.id), caseId: identifier(item.caseId), caseTitle: text(item.caseTitle, 160), caseRevision: revision(item.caseRevision), helperEmail: text(item.helperEmail, 254), createdAt: date(item.createdAt), expiresAt: date(item.expiresAt), status: item.status as HelperInvitation['status'], revision: revision(item.revision), proposal };
}
export function readHelperSnapshot(value: unknown): HelperSnapshot {
  const input = record(value);
  const checked = validateCase({ ...createCase(input.service as ServiceKind, '2000-01-01T00:00:00.000Z', 'helper-snapshot'), title: input.title, jurisdiction: input.jurisdiction, facts: input.facts, draft: input.draft });
  if ([...checked.facts].some(fact => !fact)) throw new HelperRequestError(502);
  return { title: checked.title, service: checked.service, jurisdiction: checked.jurisdiction, draft: checked.draft, facts: checked.facts.map(({ key, label, value, source, confirmed }) => ({ key, label, value, source, confirmed })) };
}
export function HelperSnapshotPreview({ snapshot, language, label }: { snapshot: HelperSnapshot; language: HelperLanguage; label: string }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  return <section className={styles.preview} aria-label={label}>
    <h3>{label}</h3><h4>{snapshot.title}</h4><p>{getService(snapshot.service).title[language]}</p>
    <p><strong>{t('Authority or state', 'प्राधिकरण या राज्य')}:</strong> {snapshot.jurisdiction || t('Not supplied', 'नहीं दिया गया')}</p>
    <h4>{t('Selected details', 'चुने हुए विवरण')}</h4>
    {snapshot.facts.length ? <ul>{snapshot.facts.map(fact => <li key={fact.key}><strong>{fact.label}:</strong> {fact.value || t('No reading', 'विवरण खाली है')}<small>{fact.confirmed ? t('Confirmed by the citizen', 'नागरिक द्वारा पुष्टि') : t('Still needs checking', 'अभी जाँच ज़रूरी')} · {fact.source === 'document' ? t('Document reading', 'दस्तावेज़ विवरण') : fact.source === 'profile' ? t('Profile detail', 'प्रोफ़ाइल विवरण') : t('Citizen-entered detail', 'नागरिक द्वारा दिया विवरण')}</small></li>)}</ul> : <p>{t('No individual details selected.', 'अलग विवरण नहीं चुने गए हैं।')}</p>}
    <h4>{t('Shared preparation draft', 'साझा तैयारी मसौदा')}</h4>
    {snapshot.draft ? <pre>{snapshot.draft}</pre> : <p>{t('No draft included.', 'मसौदा शामिल नहीं है।')}</p>}
  </section>;
}

type Props = { language: HelperLanguage; caseValue: MobilityCase; revision: number; accountId: string; onCaseUpdated?: () => void; onAccountChanged?: () => void };
export default function HelperAccessPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const t = (en: string, hi: string) => props.language === 'hi' ? hi : en;
  const key = sha256Hex(JSON.stringify({ caseValue: props.caseValue, revision: props.revision, accountId: props.accountId }));
  return <details className={styles.panel} onToggle={event => setOpen(event.currentTarget.open)}><summary>{t('Trusted helper · optional', 'विश्वसनीय सहायक · वैकल्पिक')}</summary>{open && <OwnerHelperPanel key={key} {...props} />}</details>;
}

function OwnerHelperPanel({ language, caseValue, revision: caseRevision, accountId, onCaseUpdated, onAccountChanged }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const id = useId();
  const [invitations, setInvitations] = useState<HelperInvitation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [includeDraft, setIncludeDraft] = useState(false);
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState('1');
  const [reviewed, setReviewed] = useState(false);
  const [link, setLink] = useState('');
  const [proposal, setProposal] = useState<{ invitation: HelperInvitation; snapshot: HelperSnapshot } | null>(null);
  const [proposalReviewed, setProposalReviewed] = useState(false);
  const [deleteReview, setDeleteReview] = useState<{ id: string; revision: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [accountEnded, setAccountEnded] = useState(false);
  const [message, setMessage] = useState<'' | 'created' | 'copied' | 'select-copy' | 'revoked' | 'applied' | 'deleted'>('');
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const listGeneration = useRef(0);
  const linkInput = useRef<HTMLInputElement>(null);
  const linkInvitation = useRef('');
  const snapshot: HelperSnapshot = { title: caseValue.title, service: caseValue.service, jurisdiction: caseValue.jurisdiction, facts: caseValue.facts.filter(fact => selected.includes(fact.key)).map(({ key, label, value, source, confirmed }) => ({ key, label, value, source, confirmed })), draft: includeDraft ? caseValue.draft : '' };
  const activeStatus = (value: HelperInvitation) => ['invited', 'accepted'].includes(value.status);
  const statusLabel = (value: HelperInvitation['status']) => ({ invited: t('Invited', 'आमंत्रित'), accepted: t('Accepted', 'स्वीकार किया'), revoked: t('Revoked', 'पहुँच हटाई'), expired: t('Expired', 'अवधि समाप्त'), 'case-changed': t('Case changed — access ended', 'केस बदला — पहुँच समाप्त'), applied: t('Suggestion applied by owner', 'मालिक ने सुझाव अपनाया') })[value];

  const load = async (signal?: AbortSignal) => {
    const generation = ++listGeneration.current;
    const response = await helperRequest('helpers', 'GET', undefined, signal, accountId);
    if (!Array.isArray(response.invitations) || response.invitations.length > 100) throw new HelperRequestError(502);
    const items = response.invitations.map(readHelperInvitation).filter(item => item.caseId === caseValue.id);
    if (alive.current && !signal?.aborted && listGeneration.current === generation) setInvitations(items);
  };
  const accountError = (cause: unknown) => {
    if (!(cause instanceof HelperRequestError) || !(cause.status === 401 || cause.code === 'account-changed')) return;
    setAccountEnded(true); setLink(''); linkInvitation.current = ''; setInvitations([]); setProposal(null); setProposalReviewed(false); setDeleteReview(null); setSelected([]); setIncludeDraft(false); setReviewed(false); setEmail('');
    listGeneration.current += 1; onAccountChanged?.();
  };
  useEffect(() => {
    alive.current = true;
    const initial = new AbortController();
    void load(initial.signal).catch(cause => { if (!initial.signal.aborted && alive.current) { setError(cause); accountError(cause); } });
    return () => { alive.current = false; initial.abort(); controller.current?.abort(); };
    // The keyed owner view remounts for every case snapshot or revision change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = async (operation: (signal: AbortSignal) => Promise<void>) => {
    if (controller.current || accountEnded) return;
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError(null); setMessage(''); setDeleteReview(null);
    try { await operation(current.signal); }
    catch (cause) { if (alive.current && !current.signal.aborted) { setError(cause); setProposal(null); setProposalReviewed(false); accountError(cause); } }
    finally { if (controller.current === current) { controller.current = null; if (alive.current) setBusy(false); } }
  };
  const validHours = Number.isInteger(Number(hours)) && Number(hours) >= 1 && Number(hours) <= 24;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const create = () => run(async signal => {
    if (!reviewed || !validHours || !validEmail) return;
    const response = await helperRequest('helpers', 'POST', { caseId: caseValue.id, caseRevision, helperEmail: email.trim().toLowerCase(), hours: Number(hours), factKeys: selected, includeDraft }, signal, accountId);
    const invited = readHelperInvitation(response.invitation);
    const url = new URL(text(response.url, 2048));
    if (invited.caseId !== caseValue.id || invited.caseRevision !== caseRevision || url.origin !== window.location.origin || url.pathname !== '/helper' || url.search || url.username || url.password || !/^#invite=[a-f0-9]{64}$/.test(url.hash)) throw new HelperRequestError(502);
    if (!alive.current || signal.aborted) return;
    listGeneration.current += 1;
    setInvitations(previous => [invited, ...previous.filter(value => value.id !== invited.id)]); setLink(url.href); linkInvitation.current = invited.id; setReviewed(false);
    setMessage('created');
  });
  const reviewProposal = (invited: HelperInvitation) => run(async signal => {
    setProposal(null); setProposalReviewed(false);
    const response = await helperRequest(`helpers/${encodeURIComponent(invited.id)}`, 'GET', undefined, signal, accountId);
    const current = readHelperInvitation(response.invitation); const shared = readHelperSnapshot(response.snapshot);
    if (current.id !== invited.id || current.caseId !== caseValue.id || current.caseRevision !== caseRevision || current.status !== 'accepted' || !current.proposal) throw new HelperRequestError(409);
    if (alive.current && !signal.aborted) setProposal({ invitation: current, snapshot: shared });
  });

  if (accountEnded) return <p className={styles.error} role="alert">{helperError(error, language)}</p>;
  return <div className={styles.content}>
    <p>{t('Share one selected case snapshot for preparation suggestions. You review and apply any suggestion.', 'तैयारी के सुझाव के लिए एक चुनी केस प्रति साझा करें। हर सुझाव आप जाँचकर अपनाते हैं।')}</p>
    <details className={styles.privacy}><summary>{t('Access and privacy', 'पहुँच और गोपनीयता')}</summary>
      <p className={styles.boundary}>{t('The helper must sign in with the invited email. The case title, service and authority/state are always included. Choose individual details and the draft below. This grants no access to other cases, your account settings, payments or official services. Revoking stops future access; it cannot erase copies already kept by the helper.', 'सहायक को आमंत्रित ईमेल से साइन इन करना होगा। केस शीर्षक, सेवा और प्राधिकरण/राज्य हमेशा शामिल हैं। नीचे अलग विवरण और मसौदा चुनें। इससे दूसरे केस, खाता सेटिंग, भुगतान या आधिकारिक सेवाओं की पहुँच नहीं मिलती। पहुँच हटाने से आगे का उपयोग रुकता है; सहायक की पहले रखी प्रतियाँ मिट नहीं सकतीं।')}</p>
      <p className={styles.boundary}>{t('Helper access lasts 1–24 hours. The shared snapshot and proposals may remain with your account case during its 90-day retention until deleted. Expiry or revocation does not immediately delete those account records.', 'सहायक की पहुँच 1–24 घंटे रहती है। साझा प्रति और सुझाव आपके खाते के केस की 90-दिन संग्रह अवधि में, मिटाए जाने तक रह सकते हैं। अवधि समाप्त होने या पहुँच हटाने से खाते के ये रिकॉर्ड तुरंत नहीं मिटते।')}</p>
      <p className={styles.boundary}>{t('An account can keep up to 10 active invitations and 100 invitations in total. You can explicitly delete ended invitation history below. This removes that shared snapshot and suggestion from your account; it does not change the case or erase copies already kept by the helper.', 'एक खाते में अधिकतम 10 सक्रिय और कुल 100 आमंत्रण रह सकते हैं। नीचे समाप्त आमंत्रण का इतिहास अलग से मिटा सकते हैं। इससे खाते से उसकी साझा प्रति और सुझाव हटेंगे; केस नहीं बदलेगा और सहायक की पहले रखी प्रतियाँ नहीं मिटेंगी।')}</p>
    </details>
    <fieldset disabled={busy} className={styles.form}><legend>{t('Choose what to share', 'साझा जानकारी चुनें')}</legend>
      <label htmlFor={`${id}-email`}>{t('Helper’s sign-in email', 'सहायक का साइन-इन ईमेल')}</label><input id={`${id}-email`} type="email" maxLength={254} autoComplete="off" value={email} onChange={event => { setEmail(event.target.value); setReviewed(false); }} />
      <label htmlFor={`${id}-hours`}>{t('Access expires after (hours)', 'पहुँच की अवधि (घंटे)')}</label><input id={`${id}-hours`} type="number" min={1} max={24} step={1} value={hours} onChange={event => { setHours(event.target.value); setReviewed(false); }} /><small>{t('Choose 1 to 24 hours. Changing the account case ends access to its old snapshot.', '1 से 24 घंटे चुनें। खाते का केस बदलने पर उसकी पुरानी प्रति की पहुँच समाप्त होती है।')}</small>
      {caseValue.facts.map(fact => <label key={fact.key} className={styles.check}><input type="checkbox" aria-label={`${t('Share', 'साझा करें')} ${fact.label}: ${fact.value}`} checked={selected.includes(fact.key)} onChange={event => { setSelected(previous => event.target.checked ? [...previous, fact.key] : previous.filter(key => key !== fact.key)); setReviewed(false); }} /><span><strong>{fact.label}:</strong> {fact.value || t('No reading', 'विवरण खाली है')}<small>{fact.confirmed ? t('Confirmed by you', 'आपके द्वारा पुष्टि') : t('Still needs checking', 'अभी जाँच ज़रूरी')}</small></span></label>)}
      <label className={styles.check}><input type="checkbox" checked={includeDraft} disabled={!caseValue.draft} onChange={event => { setIncludeDraft(event.target.checked); setReviewed(false); }} /><span>{t('Include my current preparation draft', 'मेरा वर्तमान तैयारी मसौदा शामिल करें')}</span></label>
      <HelperSnapshotPreview snapshot={snapshot} language={language} label={t('What your helper will see', 'सहायक को क्या दिखाई देगा')} />
      <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>{t('I reviewed this snapshot and trust this helper with it.', 'मैंने यह प्रति जाँच ली है और इसे इस सहायक से साझा करने पर भरोसा है।')}</span></label>
      <button type="button" className={styles.primary} disabled={!reviewed || !validEmail || !validHours} onClick={() => { void create(); }}>{t('Create reviewed invitation', 'जाँचा आमंत्रण बनाएँ')}</button>
    </fieldset>
    {link && <div className={styles.linkBox}><label htmlFor={`${id}-link`}>{t('Invitation link — share it yourself', 'आमंत्रण लिंक — स्वयं साझा करें')}</label><input ref={linkInput} id={`${id}-link`} readOnly value={link} onFocus={event => event.target.select()} /><button type="button" onClick={() => {
      void navigator.clipboard?.writeText(link).then(() => { if (alive.current) setMessage('copied'); }).catch(() => { if (alive.current) { linkInput.current?.focus(); linkInput.current?.select(); setMessage('select-copy'); } });
      if (!navigator.clipboard) { linkInput.current?.focus(); linkInput.current?.select(); setMessage('select-copy'); }
    }}>{t('Copy invitation link', 'आमंत्रण लिंक कॉपी करें')}</button><p>{t('No message has been sent. Share this link yourself with the invited person.', 'कोई संदेश नहीं भेजा गया। यह लिंक आमंत्रित व्यक्ति से स्वयं साझा करें।')}</p><small>{t('The link is shown only in this open panel. Closing or reloading it clears the link; revoke and create another invitation if you need a replacement.', 'लिंक केवल इस खुले पैनल में दिखता है। बंद या रीफ़्रेश करने पर लिंक हट जाएगा; दूसरा लिंक चाहिए तो पहुँच हटाकर नया आमंत्रण बनाएँ।')}</small></div>}
    <div className={styles.listHeading}><h3>{t('Invitations for this case', 'इस केस के आमंत्रण')}</h3><button type="button" disabled={busy} onClick={() => void run(async signal => { setProposal(null); setProposalReviewed(false); await load(signal); })}>{t('Refresh invitations', 'आमंत्रण रीफ़्रेश करें')}</button></div>
    {!invitations.length && <p>{t('No invitations loaded for this case.', 'इस केस का कोई आमंत्रण नहीं मिला।')}</p>}
    {invitations.map(invited => <article key={invited.id} aria-label={`${t('Invitation for', 'इनके लिए आमंत्रण')} ${invited.helperEmail}`} className={styles.invitation}>
      <h4>{invited.helperEmail}</h4><p>{statusLabel(invited.status)}</p><small>{t('Access ends', 'पहुँच समाप्त')}: {new Date(invited.expiresAt).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</small>
      <div className={styles.actions}>{invited.status === 'accepted' && invited.proposal && <button type="button" disabled={busy} onClick={() => void reviewProposal(invited)}>{t('Review helper suggestion', 'सहायक का सुझाव जाँचें')}</button>}
        {activeStatus(invited) && <button type="button" disabled={busy} onClick={() => void run(async signal => {
          const response = await helperRequest(`helpers/${encodeURIComponent(invited.id)}/revoke`, 'POST', { revision: invited.revision }, signal, accountId);
          if (response.revoked !== true) throw new HelperRequestError(502);
          if (!alive.current || signal.aborted) return;
          listGeneration.current += 1;
          setInvitations(previous => previous.map(value => value.id === invited.id ? { ...value, status: 'revoked', revision: value.revision + 1 } : value));
          if (linkInvitation.current === invited.id) { setLink(''); linkInvitation.current = ''; }
          if (proposal?.invitation.id === invited.id) { setProposal(null); setProposalReviewed(false); }
          setMessage('revoked');
        })}>{t('Revoke access', 'पहुँच हटाएँ')}</button>}
        {!activeStatus(invited) && <button type="button" disabled={busy} onClick={() => setDeleteReview({ id: invited.id, revision: invited.revision })}>{t('Delete invitation history', 'आमंत्रण इतिहास मिटाएँ')}</button>}</div>
      {deleteReview?.id === invited.id && deleteReview.revision === invited.revision && <section className={styles.preview} aria-label={t('Confirm invitation history deletion', 'आमंत्रण इतिहास मिटाने की पुष्टि')}>
        <p>{t('Delete this invitation’s shared snapshot and suggestion from your account? Your case and any draft you already applied will remain. Copies already kept by the helper will remain.', 'खाते से इस आमंत्रण की साझा प्रति और सुझाव मिटाएँ? आपका केस और पहले अपनाया मसौदा रहेगा। सहायक की पहले रखी प्रतियाँ भी रहेंगी।')}</p>
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void run(async signal => {
          const response = await helperRequest(`helpers/${encodeURIComponent(invited.id)}`, 'DELETE', { revision: deleteReview.revision }, signal, accountId);
          if (response.deleted !== true) throw new HelperRequestError(502);
          if (!alive.current || signal.aborted) return;
          listGeneration.current += 1;
          setInvitations(previous => previous.filter(value => value.id !== invited.id));
          if (proposal?.invitation.id === invited.id) { setProposal(null); setProposalReviewed(false); }
          if (linkInvitation.current === invited.id) { setLink(''); linkInvitation.current = ''; }
          setMessage('deleted');
        })}>{t('Permanently delete invitation history', 'आमंत्रण इतिहास स्थायी रूप से मिटाएँ')}</button><button type="button" disabled={busy} onClick={() => setDeleteReview(null)}>{t('Keep this history', 'यह इतिहास रखें')}</button></div>
      </section>}
    </article>)}
    {proposal && <section className={styles.preview} aria-label={t('Review proposed replacement', 'प्रस्तावित बदलाव की समीक्षा')}>
      <h3>{t('Review proposed replacement', 'प्रस्तावित बदलाव की समीक्षा')}</h3><p>{t('Applying replaces this account case’s preparation draft and marks it as preparing. The helper cannot apply it. Read the complete text before choosing.', 'अपनाने पर खाते के केस का तैयारी मसौदा बदलेगा और स्थिति तैयारी जारी होगी। सहायक इसे नहीं अपना सकता। चुनने से पहले पूरा पाठ पढ़ें।')}</p>
      <h4>{t('Current account draft', 'खाते का वर्तमान मसौदा')}</h4><pre>{caseValue.draft || t('No draft', 'मसौदा नहीं है')}</pre>
      <h4>{t('Complete suggested replacement', 'पूरा सुझाया बदलाव')}</h4><pre>{proposal.invitation.proposal!.draft}</pre>
      <details><summary>{t('Original shared snapshot', 'मूल साझा प्रति')}</summary><HelperSnapshotPreview snapshot={proposal.snapshot} language={language} label={t('What was shared', 'क्या साझा किया गया था')} /></details>
      <label className={styles.check}><input type="checkbox" checked={proposalReviewed} disabled={busy} onChange={event => setProposalReviewed(event.target.checked)} /><span>{t('I reviewed the complete replacement draft.', 'मैंने पूरा बदला जाने वाला मसौदा जाँच लिया है।')}</span></label>
      {['completed', 'awaiting-response'].includes(caseValue.status) && <p>{t('This case is submitted or completed according to your record. Prepare a separate follow-up instead of replacing this draft.', 'आपके रिकॉर्ड के अनुसार यह केस जमा या पूरा हुआ है। इसका मसौदा बदलने के बजाय अलग फ़ॉलो-अप तैयार करें।')}</p>}
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={busy || !proposalReviewed || ['completed', 'awaiting-response'].includes(caseValue.status)} onClick={() => void run(async signal => {
        const response = await helperRequest(`helpers/${encodeURIComponent(proposal.invitation.id)}/apply`, 'POST', { revision: proposal.invitation.revision, caseRevision }, signal, accountId);
        const updated = record(response.case); validateCase(updated.value); revision(updated.revision);
        if (response.applied !== true) throw new HelperRequestError(502);
        if (!alive.current || signal.aborted) return;
        listGeneration.current += 1;
        const appliedId = proposal.invitation.id;
        setProposal(null); setProposalReviewed(false); setInvitations(previous => previous.map(value => value.id === appliedId ? { ...value, status: 'applied', revision: value.revision + 1 } : value));
        setMessage('applied');
        onCaseUpdated?.();
      })}>{t('Apply reviewed suggestion to account case', 'जाँचा सुझाव खाते के केस में अपनाएँ')}</button><button type="button" disabled={busy} onClick={() => { setProposal(null); setProposalReviewed(false); }}>{t('Close review', 'समीक्षा बंद करें')}</button></div>
    </section>}
    {error !== null && <p className={styles.error} role="alert">{helperError(error, language)}</p>}{message && <p role="status" aria-live="polite">{{
      created: t('Invitation created. No message has been sent.', 'आमंत्रण बनाया गया। कोई संदेश नहीं भेजा गया।'),
      copied: t('Link copied. Share it only with the invited person.', 'लिंक कॉपी हुआ। केवल आमंत्रित व्यक्ति से साझा करें।'),
      'select-copy': t('Select and copy the link above.', 'ऊपर का लिंक चुनकर कॉपी करें।'),
      revoked: t('Future helper access has been revoked.', 'सहायक की आगे की पहुँच हटा दी गई।'),
      applied: t('You applied the reviewed draft to your account case. No official action was performed.', 'आपने जाँचा मसौदा खाते के केस में अपनाया। कोई आधिकारिक कार्रवाई नहीं हुई।'),
      deleted: t('Invitation history deleted from your account. Your case and any applied draft are unchanged.', 'आमंत्रण इतिहास खाते से मिटाया गया। केस और अपनाया मसौदा नहीं बदले हैं।'),
    }[message]}</p>}
  </div>;
}
