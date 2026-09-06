'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CaseFact, MobilityCase } from '../../lib/mobility/cases';
import { buildAdviserContext, fingerprintAdviserContext, isSensitiveAdviserText, validateAdviserSuggestion, type AdviserContext, type AdviserSuggestion } from '../../lib/mobility/adviser';
import styles from './AdviserPanel.module.css';

type Props = { accountId: string; caseValue: MobilityCase; revision: number; language: 'en' | 'hi'; onAccountChanged?: () => void };
// Screen only the fact fields actually eligible for the model context. Local source
// identifiers and file fingerprints are deliberately excluded from that context.
const sensitiveFact = ({ key, label, value, source, confirmed }: CaseFact) => isSensitiveAdviserText(JSON.stringify({ key, label, value, source, confirmed }));
export default function AdviserPanel(props: Props) { return <CurrentAdviserPanel key={`${props.accountId}:${props.caseValue.id}:${props.revision}:${props.language}`} {...props} />; }
function CurrentAdviserPanel({ accountId, caseValue, revision, language, onAccountChanged }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [includeDraft, setIncludeDraft] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<AdviserSuggestion | null>(null);
  const [accountChanged, setAccountChanged] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const recoverAccountChange = useCallback(() => {
    controller.current?.abort(); controller.current = null;
    setKeys([]); setIncludeDraft(false); setConsent(false); setResult(null);
    setAvailable(false); setBusy(false); setMessage(''); setOpen(false); setAccountChanged(true);
    onAccountChanged?.();
  }, [onAccountChanged]);
  let preview: AdviserContext | null = null; let previewError = '';
  try { preview = buildAdviserContext(caseValue, keys, includeDraft, language); } catch { previewError = t('Select up to eight short details, without identity numbers or secret credentials. The optional draft must be at most 1,200 characters.', 'पहचान संख्या या गुप्त जानकारी के बिना अधिकतम आठ छोटे विवरण चुनें। वैकल्पिक मसौदा 1,200 अक्षरों तक रखें।'); }
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    if (!open || accountChanged) return;
    let active = true;
    fetch('/api/account/adviser/status', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Mobility-Account': accountId } }).then(async response => {
      if (response.status === 401) { if (active) recoverAccountChange(); return; }
      const value = await response.json() as { available?: unknown; authenticated?: unknown; code?: unknown };
      if (response.status === 409 && value.code === 'account-changed') { if (active) recoverAccountChange(); return; }
      if (active) setAvailable(response.ok && value.available === true && value.authenticated === true);
    }).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, [open, accountId, accountChanged, recoverAccountChange]);
  const changed = () => { setConsent(false); setResult(null); setMessage(''); };
  const ask = async () => {
    if (busy || accountChanged || !consent || !preview || !available) return;
    const selected = preview; const fingerprint = fingerprintAdviserContext(selected);
    const active = new AbortController(); controller.current = active;
    setBusy(true); setMessage(''); setResult(null);
    const timer = setTimeout(() => active.abort(), 45_000);
    try {
      const response = await fetch('/api/account/adviser', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: active.signal, headers: { 'Content-Type': 'application/json', 'X-Mobility-Account': accountId }, body: JSON.stringify({ caseId: caseValue.id, caseRevision: revision, factKeys: keys, includeDraft, language, consent: true, contextFingerprint: fingerprint, requestId: crypto.randomUUID() }) });
      if (controller.current !== active || active.signal.aborted) return;
      if (response.status === 401) { recoverAccountChange(); return; }
      const value = await response.json() as Record<string, unknown>;
      if (controller.current !== active || active.signal.aborted) return;
      if (response.status === 409 && value.code === 'account-changed') { recoverAccountChange(); return; }
      if (!response.ok) throw new Error('unavailable');
      if (value.mode !== 'cloud-ai' || value.verified !== false || value.contextFingerprint !== fingerprint) throw new Error('invalid');
      const suggestion = validateAdviserSuggestion(value.suggestion, selected);
      if (controller.current === active && !active.signal.aborted) setResult(suggestion);
    } catch {
      if (controller.current === active) setMessage(t('No current suggestion is available. The request may have used today’s allowance. You can continue with on-device checks or reload the account case before trying again.', 'अभी कोई सुझाव उपलब्ध नहीं है। इस अनुरोध में आज की सीमा का उपयोग हुआ हो सकता है। डिवाइस की जाँच जारी रखें या फिर कोशिश से पहले खाते का मामला दोबारा खोलें।'));
    } finally {
      clearTimeout(timer);
      if (controller.current === active) { controller.current = null; setBusy(false); setConsent(false); }
    }
  };
  return <section className={styles.panel} aria-labelledby={id}>
    <h3 id={id}>{t('Optional AI second opinion', 'वैकल्पिक AI की दूसरी राय')}</h3>
    <p>{t('A preparation writer suggests a next step; a separate critic checks its wording. Both are AI suggestions for your review.', 'एक तैयारी लेखक अगला कदम सुझाता है; अलग समीक्षक उसकी भाषा जाँचता है। दोनों AI सुझाव हैं जिन्हें आप जाँचेंगे।')}</p>
    <button type="button" disabled={accountChanged} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t('Hide AI options', 'AI विकल्प छिपाएँ') : t('Review AI options', 'AI विकल्प देखें')}</button>
    {accountChanged && <p role="status">{t('Your signed-in account changed. Review the current account before continuing.', 'साइन इन किया खाता बदल गया। आगे बढ़ने से पहले मौजूदा खाता जाँचें।')}</p>}
    {open && <div className={styles.options}>
      {available === null ? <p role="status">{t('Checking availability…', 'उपलब्धता जाँच रहे हैं…')}</p> : !available ? <p role="status">{t('Optional cloud AI is not available here yet. The case team on your device is ready to use.', 'वैकल्पिक क्लाउड AI यहाँ अभी उपलब्ध नहीं है। डिवाइस की केस टीम उपयोग के लिए तैयार है।')} <a href="/mobility">{t('Open my cases', 'मेरे मामले खोलें')}</a></p> : <>
        <p>{t('Choose exactly what to send to Cloudflare Workers AI. No originals, account identity or unselected fields are included. This service allows three requests per account and twenty across the site each UTC day. Failed or stopped requests can count.', 'Cloudflare Workers AI को भेजे जाने वाले विवरण चुनें। मूल दस्तावेज़, खाता पहचान और न चुने विवरण शामिल नहीं हैं। प्रति UTC दिन खाते के तीन और पूरी साइट के बीस अनुरोध की सीमा है। असफल या रोके गए अनुरोध गिने जा सकते हैं।')}</p>
        <fieldset disabled={busy}><legend>{t('Details to include (up to eight)', 'शामिल विवरण (अधिकतम आठ)')}</legend>
          {caseValue.facts.map(fact => <label key={fact.key}><input type="checkbox" checked={keys.includes(fact.key)} disabled={sensitiveFact(fact) || fact.value.length > 400 || (!keys.includes(fact.key) && keys.length >= 8)} onChange={event => { changed(); setKeys(event.target.checked ? [...keys, fact.key] : keys.filter(key => key !== fact.key)); }} /><span>{fact.label}: {fact.value}{sensitiveFact(fact) && <small>{t(' Kept out of AI requests.', ' AI अनुरोध में शामिल नहीं होगा।')}</small>}{fact.value.length > 400 && <small>{t(' Too long for this limited preview.', ' सीमित पूर्वावलोकन के लिए बहुत लंबा।')}</small>}</span></label>)}
          <label><input type="checkbox" checked={includeDraft} disabled={caseValue.draft.length > 1200 || isSensitiveAdviserText(caseValue.draft)} onChange={event => { changed(); setIncludeDraft(event.target.checked); }} />{t('Include my preparation draft', 'मेरा तैयारी मसौदा शामिल करें')}</label>
        </fieldset>
        <div className={styles.preview} role="region" aria-label={t('Exact AI data preview', 'AI को भेजे जाने वाले डेटा का पूर्वावलोकन')}><h4>{t('Everything this request sends', 'इस अनुरोध में भेजा जाने वाला पूरा डेटा')}</h4>
          {preview ? <><dl><dt>{t('Service', 'सेवा')}</dt><dd>{preview.service}</dd><dt>{t('Jurisdiction', 'क्षेत्र')}</dt><dd>{preview.jurisdiction || t('Not supplied', 'नहीं दिया')}</dd><dt>{t('Response language', 'उत्तर की भाषा')}</dt><dd>{language === 'hi' ? 'हिन्दी' : 'English'}</dd></dl>
            {preview.facts.map(fact => <p key={fact.key}><strong>{fact.label}</strong> ({fact.key}): {fact.value}<br />{fact.source} · {fact.confirmed ? t('Confirmed by citizen', 'नागरिक द्वारा पुष्टि') : t('Unconfirmed reading', 'अपुष्ट पढ़ाई')}</p>)}
            {preview.draft && <p className={styles.draft}>{preview.draft}</p>}
          </> : <p role="alert">{previewError}</p>}
        </div>
        <label><input type="checkbox" checked={consent} disabled={busy || !preview} onChange={event => setConsent(event.target.checked)} />{t('Send this preview for this one AI request.', 'इस एक AI अनुरोध के लिए यह पूर्वावलोकन भेजें।')}</label>
        <div className={styles.actions}><button type="button" disabled={busy || !consent || !preview} onClick={() => void ask()}>{busy ? t('Writer and critic are working…', 'लेखक और समीक्षक काम कर रहे हैं…') : t('Ask for a second opinion', 'दूसरी राय माँगें')}</button>
          {busy && <button type="button" onClick={() => controller.current?.abort()}>{t('Stop waiting', 'प्रतीक्षा रोकें')}</button>}</div>
        {busy && <p role="status">{t('The provider may finish a request even if you stop waiting. Your case will stay as it is.', 'प्रतीक्षा रोकने पर भी प्रदाता अनुरोध पूरा कर सकता है। आपका मामला जैसा है वैसा रहेगा।')}</p>}
      </>}
      {message && <p role="status">{message}</p>}
      {result && <div className={styles.result} role="region" aria-label={t('AI suggestion for review', 'समीक्षा के लिए AI सुझाव')}><h4>{t('Suggested question', 'सुझाया प्रश्न')}</h4><p>{result.question}</p><ol>{result.steps.map((step, index) => <li key={index}><p>{step.text}</p><small>{step.sourceKeys.length ? `${t('Based on selected details', 'चुने विवरणों पर आधारित')}: ${step.sourceKeys.map(key => preview?.facts.find(fact => fact.key === key)?.label ?? key).join(', ')}` : t('General preparation suggestion', 'सामान्य तैयारी सुझाव')}</small></li>)}</ol><p>{t('The critic is another AI pass, not independent verification. Check the suggestion against your evidence. Nothing was changed or submitted.', 'समीक्षक भी AI है, स्वतंत्र सत्यापन नहीं। सुझाव को अपने साक्ष्य से जाँचें। कोई बदलाव या जमा नहीं हुआ।')}</p></div>}
    </div>}
  </section>;
}
