'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, EyeOff, FlaskConical, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { PublicBetaShell } from '../public-beta/PublicBetaShell';
import {
  createAssistanceSession, createSyntheticPortal, observeAssistance, restoreAssistanceCheckpoint,
  serializeAssistanceCheckpoint, transitionAssistance,
  type AssistanceAction, type AssistanceEvent, type AssistanceScenario, type AssistanceSession, type AssistanceStage, type SyntheticPortal,
} from '../../lib/mobility/assistance';
import styles from './AssistanceLab.module.css';

const CHECKPOINT_KEY = 'challansakshi-synthetic-assistance-lab-v1';
type Language = 'en' | 'hi';
const stageText: Record<AssistanceStage, { en: string; hi: string }> = {
  review: { en: 'Review practice details', hi: 'अभ्यास की जानकारी जाँचें' },
  private: { en: 'Your private turn', hi: 'आपका निजी चरण' },
  approval: { en: 'Your approval is needed', hi: 'आपकी मंज़ूरी चाहिए' },
  approved: { en: 'Approved for this exact action', hi: 'इसी कार्रवाई के लिए मंज़ूरी मिली' },
  executing: { en: 'Synthetic action in progress', hi: 'काल्पनिक कार्रवाई जारी है' },
  inconclusive: { en: 'Inconclusive — check the outcome', hi: 'निष्कर्ष नहीं — परिणाम जाँचें' },
  checking: { en: 'Checking the synthetic record', hi: 'काल्पनिक रिकॉर्ड की जाँच जारी है' },
  retry: { en: 'No synthetic action was recorded', hi: 'कोई काल्पनिक कार्रवाई दर्ज नहीं हुई' },
  complete: { en: 'Synthetic receipt matched', hi: 'काल्पनिक रसीद मेल खाती है' },
};

function privateDocument(language: Language, nonce: string): string {
  const hi = language === 'hi';
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; connect-src 'none'"><style>*{box-sizing:border-box}body{margin:0;padding:22px;background:#f1f8f6;color:#132c36;font:16px/1.6 system-ui,sans-serif}h3{font-size:19px;margin:0 0 8px}p{font-size:14px;margin:8px 0 18px}label{display:block;font-size:14px;font-weight:650}input{display:block;width:100%;padding:12px;margin:8px 0 18px;border:1px solid #809b98;border-radius:8px;font:16px system-ui}button{min-height:46px;width:100%;border:0;border-radius:8px;padding:12px;background:#153c3c;color:white;font:650 15px system-ui;cursor:pointer}:focus-visible{outline:3px solid #00857b;outline-offset:3px}small{font-size:12px;display:block;margin-top:12px}</style></head><body><h3>${hi ? 'अलग अभ्यास स्क्रीन' : 'Isolated practice screen'}</h3><p>${hi ? 'केवल कोई बनाया हुआ शब्द लिखें। असली पासवर्ड, OTP या निजी जानकारी इस्तेमाल न करें।' : 'Type a made-up word only. Do not use a real password, OTP or personal detail.'}</p><div><label for="practice">${hi ? 'बनाया हुआ अभ्यास शब्द' : 'Made-up practice word'}</label><input id="practice" type="password" maxlength="32" autocomplete="off" spellcheck="false" required><button type="button">${hi ? 'पूरा हुआ — नियंत्रण वापस दें' : 'Done — return control'}</button><small id="hint">${hi ? 'केवल पूरा होने का संकेत बाहर जाएगा। शब्द मिटा दिया जाएगा।' : 'Only a completion signal leaves this screen. The word is cleared.'}</small></div><script>const nonce=${JSON.stringify(nonce)};const input=document.querySelector('input');function finish(){if(!input.value.trim()){input.focus();return;}input.value='';parent.postMessage({type:'synthetic-private-finished',nonce:nonce},'*');}document.querySelector('button').addEventListener('click',finish);input.addEventListener('keydown',function(event){if(event.key==='Enter'){event.preventDefault();finish();}});</script></body></html>`;
}

export default function AssistanceLab() {
  const [language, setLanguage] = useState<Language>('en');
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [session, setSession] = useState(() => createAssistanceSession('practice-initial'));
  const sessionRef = useRef(session);
  const portalRef = useRef<SyntheticPortal | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [privateNonce, setPrivateNonce] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [observation, setObservation] = useState<'blocked' | 'available' | null>(null);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editAction, setEditAction] = useState<AssistanceAction>(session.action);
  const actionHeading = useRef<HTMLHeadingElement>(null);

  const commit = useCallback((next: AssistanceSession) => {
    sessionRef.current = next;
    setSession(next); setReviewed(false); setError('');
    const records = portalRef.current?.snapshot() ?? [];
    setRecordCount(records.length);
    try { sessionStorage.setItem(CHECKPOINT_KEY, serializeAssistanceCheckpoint(next, records)); }
    catch { setStorageWarning(true); }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let next = createAssistanceSession(crypto.randomUUID());
      let records: ReturnType<SyntheticPortal['snapshot']> = [];
      try {
        const checkpoint = sessionStorage.getItem(CHECKPOINT_KEY);
        if (checkpoint) { const restored = restoreAssistanceCheckpoint(checkpoint); next = restored.session; records = restored.records; setResumed(true); }
      } catch { setStorageWarning(true); }
      portalRef.current = createSyntheticPortal(records);
      sessionRef.current = next; setSession(next); setEditAction(next.action); setRecordCount(records.length); setReady(true);
    });
    return () => { active = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (session.stage !== 'private') return;
    const receive = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== 'null' || !event.data || typeof event.data !== 'object') return;
      const data = event.data as Record<string, unknown>;
      if (Object.keys(data).length !== 2 || data.type !== 'synthetic-private-finished' || data.nonce !== privateNonce) return;
      try { commit(transitionAssistance(sessionRef.current, { type: 'finish-private' }, Date.now())); setObservation(null); }
      catch { setError('Private completion could not be accepted.'); }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [session.stage, privateNonce, commit]);

  function send(event: AssistanceEvent) {
    try { commit(transitionAssistance(sessionRef.current, event, Date.now())); setObservation(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('This practice step could not continue.', 'अभ्यास का यह चरण आगे नहीं बढ़ सका।')); }
  }
  function startPrivate() { setPrivateNonce(crypto.randomUUID()); send({ type: 'begin-private' }); }
  function startExecution() {
    try {
      const next = transitionAssistance(sessionRef.current, { type: 'execute' }, Date.now());
      commit(next);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (sessionRef.current.stage !== 'executing' || sessionRef.current.attempt?.executionKey !== next.attempt?.executionKey) return;
        try {
          const result = portalRef.current!.execute(sessionRef.current, Date.now());
          send(result.kind === 'timeout' ? { type: 'timeout' } : { type: 'receipt', receipt: result.receipt });
        } catch (cause) {
          send({ type: 'interrupt' });
          setError(cause instanceof Error ? cause.message : 'Synthetic execution was interrupted.');
        }
      }, 900);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review the practice action again.'); }
  }
  function interrupt() { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null; send({ type: 'interrupt' }); }
  function checkOutcome() {
    try {
      const checking = transitionAssistance(sessionRef.current, { type: 'check-outcome' }, Date.now());
      commit(checking);
      const found = portalRef.current!.checkOutcome(checking);
      commit(transitionAssistance(checking, { type: 'outcome', receipt: found }, Date.now()));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The synthetic record could not be checked.'); }
  }
  function reset(scenario: AssistanceScenario = session.scenario) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null; portalRef.current = createSyntheticPortal();
    const next = createAssistanceSession(crypto.randomUUID(), scenario);
    commit(next); setEditAction(next.action); setEditing(false); setObservation(null); setResumed(false);
  }
  function clearAndExit() {
    if (timerRef.current) clearTimeout(timerRef.current);
    try { sessionStorage.removeItem(CHECKPOINT_KEY); } catch { /* Navigation still exits the practice page. */ }
    window.location.assign('/demo');
  }
  const step = session.stage === 'review' ? 0 : session.stage === 'private' ? 1 : ['approval', 'approved'].includes(session.stage) ? 2 : 3;
  const canEdit = ['review', 'approval', 'approved', 'retry', 'complete'].includes(session.stage);
  const canReset = !['private', 'executing', 'checking', 'inconclusive'].includes(session.stage);
  const money = (amount: number) => new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount / 100);
  const recipient = (value: AssistanceAction['recipient']) => value === 'synthetic-renewal-desk' ? t('Synthetic renewal desk', 'काल्पनिक नवीनीकरण डेस्क') : t('Synthetic transfer desk', 'काल्पनिक ट्रांसफ़र डेस्क');

  return <PublicBetaShell language={language} setLanguage={setLanguage} service="Assistance lab" serviceHindi="सहायता अभ्यास" demo onQuickExit={clearAndExit}>
    <main className={styles.main}>
      <div className={styles.hero}><div><span className={styles.eyebrow}><FlaskConical size={17} />{t('SYNTHETIC ASSISTANCE LAB', 'काल्पनिक सहायता अभ्यास')}</span><h1>{t('Your action. Your control.', 'आपकी कार्रवाई। आपका नियंत्रण।')}</h1><p>{t('Try a guided action with a private turn, exact approval and a checked receipt. See what happens when a result is uncertain.', 'निजी चरण, स्पष्ट मंज़ूरी और रसीद की जाँच के साथ निर्देशित कार्रवाई आज़माएँ। देखें कि परिणाम स्पष्ट न हो तो क्या होता है।')}</p></div><div className={styles.boundary}><ShieldCheck size={22} /><strong>{t('Practice only', 'केवल अभ्यास')}</strong><span>{t('No payment. No government action.', 'कोई भुगतान या सरकारी कार्रवाई नहीं।')}</span></div></div>
      <p className={styles.intro}>{t('Everything below is a local simulation, including the portal and receipt. No model, credentials or real portal connection is used. Use fictional details only.', 'नीचे पोर्टल और रसीद समेत सब स्थानीय अभ्यास है। कोई मॉडल, लॉगिन जानकारी या असली पोर्टल कनेक्शन उपयोग नहीं होता। केवल काल्पनिक जानकारी रखें।')}</p>
      <div className={styles.toolbar}><label>{t('Try a scenario', 'अभ्यास चुनें')}<select disabled={!ready || !canReset} value={session.scenario} onChange={event => reset(event.target.value as AssistanceScenario)}><option value="success">{t('Matching receipt', 'मेल खाती रसीद')}</option><option value="mismatched-receipt">{t('Receipt does not match', 'रसीद मेल नहीं खाती')}</option><option value="timeout">{t('Portal times out', 'पोर्टल का समय समाप्त')}</option></select></label><button type="button" disabled={!ready || !canReset} onClick={() => reset()}><RotateCcw size={16} />{t('Reset practice', 'अभ्यास फिर शुरू करें')}</button></div>
      <ol className={styles.progress} aria-label={t('Practice steps', 'अभ्यास के चरण')}>{[t('Review', 'समीक्षा'), t('Private turn', 'निजी चरण'), t('Approve', 'मंज़ूरी'), t('Check outcome', 'परिणाम जाँचें')].map((label, index) => <li key={index} aria-current={step === index ? 'step' : undefined} data-done={index < step}><span>{index < step ? <Check size={15} /> : index + 1}</span>{label}</li>)}</ol>
      {storageWarning && <p className={styles.warning} role="status">{t('This tab could not save or read its practice checkpoint. Keep this page open to continue.', 'यह टैब अभ्यास की स्थिति सहेज या पढ़ नहीं सका। जारी रखने के लिए यह पेज खुला रखें।')}</p>}
      {resumed && <p className={styles.notice} role="status">{t('Practice restored in this tab. Private input and execution approvals are never restored. An interrupted action needs an outcome check.', 'इसी टैब में अभ्यास फिर खुला। निजी इनपुट और कार्रवाई की मंज़ूरी वापस नहीं आती। बाधित कार्रवाई का परिणाम जाँचना होगा।')}</p>}
      {error && <p className={styles.warning} role="alert">{error}</p>}
      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="assistance-stage-title">
          <span className={styles.eyebrow}>{t('SYNTHETIC PORTAL', 'काल्पनिक पोर्टल')}</span><h2 id="assistance-stage-title" ref={actionHeading} tabIndex={-1}>{stageText[session.stage][language]}</h2>
          {session.stage !== 'private' && <dl className={styles.summary} data-reviewed-action><div><dt>{t('Practice case', 'अभ्यास केस')}</dt><dd>{session.action.caseId} <small>· {t('revision', 'संशोधन')} {session.action.caseRevision}</small></dd></div><div><dt>{t('Recipient', 'प्राप्तकर्ता')}</dt><dd>{recipient(session.action.recipient)}</dd></div><div><dt>{t('Practice amount', 'अभ्यास की राशि')}</dt><dd>{money(session.action.amountPaise)} <small>{t('· no money moves', '· कोई पैसा नहीं जाएगा')}</small></dd></div><div className={styles.full}><dt>{t('Request to send in the simulation', 'अभ्यास में भेजा जाने वाला अनुरोध')}</dt><dd>{session.action.request}</dd></div></dl>}
          {editing && <form className={styles.editForm} onSubmit={event => { event.preventDefault(); try { commit(transitionAssistance(sessionRef.current, { type: 'edit', action: editAction }, Date.now())); setEditing(false); setObservation(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review these practice details.'); } }}>
            <h3>{t('Change the practice details', 'अभ्यास की जानकारी बदलें')}</h3><p>{t('Saving a change clears the previous approval and restarts review.', 'बदलाव सहेजने पर पुरानी मंज़ूरी हटेगी और समीक्षा फिर शुरू होगी।')}</p>
            <label>{t('Practice case', 'अभ्यास केस')}<select value={editAction.caseId} onChange={event => setEditAction({ ...editAction, caseId: event.target.value })}><option value="DEMO-RENEW-01">DEMO-RENEW-01</option><option value="DEMO-TRANSFER-02">DEMO-TRANSFER-02</option></select></label>
            <label>{t('Recipient', 'प्राप्तकर्ता')}<select value={editAction.recipient} onChange={event => setEditAction({ ...editAction, recipient: event.target.value as AssistanceAction['recipient'] })}><option value="synthetic-renewal-desk">{recipient('synthetic-renewal-desk')}</option><option value="synthetic-transfer-desk">{recipient('synthetic-transfer-desk')}</option></select></label>
            <label>{t('Practice amount', 'अभ्यास की राशि')}<select value={editAction.amountPaise} onChange={event => setEditAction({ ...editAction, amountPaise: Number(event.target.value) })}>{[0, 25_000, 50_000].map(value => <option key={value} value={value}>{money(value)}</option>)}</select></label>
            <label>{t('Fictional request', 'काल्पनिक अनुरोध')}<textarea rows={3} maxLength={500} value={editAction.request} onChange={event => setEditAction({ ...editAction, request: event.target.value })} required /></label><div className={styles.actions}><button className={styles.primary} type="submit">{t('Save changed details', 'बदली जानकारी सहेजें')}</button><button type="button" onClick={() => setEditing(false)}>{t('Cancel edit', 'बदलाव रद्द करें')}</button></div>
          </form>}
          {!editing && <>
            {session.stage === 'review' && <><p>{t('Check these fictional details, then enter the private practice screen. You will approve the exact action after returning.', 'काल्पनिक जानकारी जाँचें, फिर निजी अभ्यास स्क्रीन खोलें। वापस आने पर इसी कार्रवाई को मंज़ूरी देंगे।')}</p><button type="button" className={styles.primary} disabled={!ready} onClick={startPrivate}><LockKeyhole size={17} />{t('Continue to private practice', 'निजी अभ्यास में जाएँ')}</button></>}
            {session.stage === 'private' && <><p className={styles.privateStatus}><EyeOff size={20} />{t('Local observer paused. Private screen content cannot be read by the parent page.', 'स्थानीय निरीक्षक रुका है। मुख्य पेज निजी स्क्रीन की जानकारी नहीं पढ़ सकता।')}</p><iframe ref={iframeRef} title={t('Isolated private practice', 'अलग निजी अभ्यास')} sandbox="allow-scripts" srcDoc={privateDocument(language, privateNonce)} className={styles.privateFrame} /><button type="button" onClick={() => send({ type: 'cancel-private' })}>{t('Cancel private turn', 'निजी चरण रद्द करें')}</button></>}
            {session.stage === 'approval' && <><p>{t('Your private turn is finished. Review the case, recipient, amount and request above. Permission covers only these exact details and expires in five minutes.', 'आपका निजी चरण पूरा है। ऊपर केस, प्राप्तकर्ता, राशि और अनुरोध जाँचें। मंज़ूरी केवल इन्हीं विवरणों के लिए पाँच मिनट तक मान्य होगी।')}</p><label className={styles.check}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />{t('I reviewed this exact synthetic action.', 'मैंने इसी काल्पनिक कार्रवाई की समीक्षा की है।')}</label><button type="button" className={styles.primary} disabled={!reviewed} onClick={() => send({ type: 'approve', executionKey: crypto.randomUUID() })}>{t('Approve this practice action', 'इस अभ्यास कार्रवाई को मंज़ूरी दें')}</button></>}
            {session.stage === 'approved' && <><p className={styles.notice}>{t('Approval recorded for the details above. Editing them clears this permission.', 'ऊपर की जानकारी के लिए मंज़ूरी दर्ज हुई। जानकारी बदलने पर मंज़ूरी हट जाएगी।')}</p><div className={styles.actions}><button type="button" className={styles.primary} onClick={startExecution}>{t('Run in synthetic portal', 'काल्पनिक पोर्टल में चलाएँ')}<ArrowRight size={16} /></button><button type="button" onClick={() => send({ type: 'review-again' })}>{t('Review approval again', 'मंज़ूरी फिर जाँचें')}</button></div></>}
            {session.stage === 'executing' && <div role="status"><p>{t('The local simulation is running. Interrupt it to practise checking an uncertain outcome.', 'स्थानीय अभ्यास चल रहा है। अनिश्चित परिणाम की जाँच सीखने के लिए इसे रोक सकते हैं।')}</p><button type="button" onClick={interrupt}>{t('Interrupt practice action', 'अभ्यास कार्रवाई रोकें')}</button></div>}
            {session.stage === 'inconclusive' && <div className={styles.warning} role="status"><p>{session.reason === 'receipt-mismatch' ? t('The returned receipt does not match the approved details. It is not accepted as success.', 'लौटी रसीद मंज़ूर जानकारी से मेल नहीं खाती। इसे सफलता नहीं माना गया है।') : session.reason === 'timeout' ? t('The synthetic portal timed out. The action may already be recorded; do not repeat it yet.', 'काल्पनिक पोर्टल का समय समाप्त हुआ। कार्रवाई दर्ज हो सकती है; इसे अभी दोहराएँ नहीं।') : t('The practice action was interrupted. Its outcome must be checked before a retry.', 'अभ्यास कार्रवाई बाधित हुई। फिर कोशिश करने से पहले परिणाम जाँचना होगा।')}</p><button type="button" onClick={checkOutcome}>{t('Check synthetic outcome', 'काल्पनिक परिणाम जाँचें')}</button></div>}
            {session.stage === 'retry' && <><p className={styles.notice}>{t('The synthetic ledger confirms no action for this execution key. Review again and give fresh approval before retrying.', 'काल्पनिक रिकॉर्ड में इस कार्रवाई कुंजी पर कोई कार्रवाई नहीं है। फिर कोशिश करने से पहले दोबारा समीक्षा और नई मंज़ूरी दें।')}</p><button type="button" className={styles.primary} onClick={() => send({ type: 'review-again' })}>{t('Review before retrying', 'फिर कोशिश से पहले समीक्षा करें')}</button></>}
            {session.stage === 'complete' && <div className={styles.receipt} role="status"><Check size={25} /><div><strong>{t('Practice complete — receipt checked', 'अभ्यास पूरा — रसीद जाँची गई')}</strong><p>{t('The case, revision, recipient, amount, request and execution key all match.', 'केस, संशोधन, प्राप्तकर्ता, राशि, अनुरोध और कार्रवाई कुंजी सभी मेल खाते हैं।')}</p><code>{session.receipt?.reference}</code><small>{t('Synthetic receipt only. No real payment or submission happened.', 'केवल काल्पनिक रसीद। कोई असली भुगतान या आवेदन नहीं हुआ।')}</small></div></div>}
            {canEdit && <button type="button" className={styles.editButton} onClick={() => { setEditAction(session.action); setEditing(true); }}>{t('Change practice details', 'अभ्यास की जानकारी बदलें')}</button>}
          </>}
        </section>
        <aside className={styles.side} aria-label={t('Practice safeguards', 'अभ्यास की सुरक्षा')}>
          <section className={styles.observer} aria-labelledby="observer-title"><span className={styles.eyebrow}>{t('LOCAL OBSERVER DEMO', 'स्थानीय निरीक्षक का अभ्यास')}</span><h2 id="observer-title">{session.stage === 'private' ? t('Your private turn is hidden', 'आपका निजी चरण छिपा है') : t('See what can be observed', 'देखें क्या पढ़ा जा सकता है')}</h2><p>{t('This deterministic check demonstrates the observation boundary. No AI model is connected.', 'यह तय नियमों वाली जाँच दिखाती है कि क्या पढ़ा जा सकता है। कोई AI मॉडल नहीं जुड़ा है।')}</p><button type="button" disabled={!ready} onClick={() => { const result = observeAssistance(sessionRef.current, () => `Synthetic portal stage: ${sessionRef.current.stage}`); setObservation(result.blocked ? 'blocked' : 'available'); }}>{t('Try an observation', 'पढ़ने की कोशिश करें')}</button>{observation && <p className={observation === 'blocked' ? styles.warning : styles.notice} role="status" data-observation>{observation === 'blocked' ? t('Blocked: private input is not available to the observer. The reader was not called.', 'रोक दिया गया: निजी इनपुट निरीक्षक को उपलब्ध नहीं है। पढ़ने वाला फ़ंक्शन नहीं चला।') : t('Available: only the public synthetic workflow stage was read.', 'उपलब्ध: केवल काल्पनिक प्रक्रिया का सार्वजनिक चरण पढ़ा गया।')}</p>}</section>
          <section className={styles.proof}><h3>{t('One action, one record', 'एक कार्रवाई, एक रिकॉर्ड')}</h3><strong data-synthetic-record-count>{recordCount}</strong><p>{t('synthetic portal records in this practice run', 'इस अभ्यास में काल्पनिक पोर्टल रिकॉर्ड')}</p><small>{t('The same execution key cannot create a second record. An uncertain result is checked before retrying.', 'एक ही कार्रवाई कुंजी दूसरा रिकॉर्ड नहीं बना सकती। फिर कोशिश से पहले अनिश्चित परिणाम जाँचा जाता है।')}</small></section>
          <details className={styles.timeline}><summary>{t('Practice checkpoints', 'अभ्यास के चरण')} ({session.events.length})</summary><ol>{session.events.map((event, index) => <li key={index}>{eventLabel(event, language)}</li>)}</ol></details>
        </aside>
      </div>
      <p className={styles.footnote}>{t('The synthetic checkpoint stays in this tab’s session storage so a refresh can resume the exercise. Private input is never included. Reset practice to replace it, or Exit to clear it.', 'पेज फिर खुलने पर अभ्यास जारी रखने के लिए काल्पनिक स्थिति इसी टैब के सेशन स्टोरेज में रहती है। निजी इनपुट इसमें कभी नहीं आता। नया अभ्यास इसे बदलता है; बाहर निकलने पर यह मिटता है।')}</p>
      <a className={styles.back} href="/demo/test-lab">{t('Back to the evidence Test Lab', 'साक्ष्य टेस्ट लैब में लौटें')}<ArrowRight size={16} /></a>
    </main>
  </PublicBetaShell>;
}

function eventLabel(event: AssistanceSession['events'][number], language: Language): string {
  const labels: Record<AssistanceSession['events'][number], [string, string]> = {
    created: ['Practice started', 'अभ्यास शुरू हुआ'], edited: ['Details changed; approval cleared', 'जानकारी बदली; मंज़ूरी हटी'],
    'private-started': ['Private turn started; observation blocked', 'निजी चरण शुरू; पढ़ना रुका'], 'private-finished': ['Private completion received; no input retained', 'निजी चरण पूरा; इनपुट नहीं रखा'],
    'private-cancelled': ['Private turn cancelled', 'निजी चरण रद्द'], approved: ['Exact action approved', 'इसी कार्रवाई को मंज़ूरी मिली'],
    'execution-started': ['Synthetic action started', 'काल्पनिक कार्रवाई शुरू'], 'receipt-matched': ['Synthetic receipt matched', 'काल्पनिक रसीद मेल खाती है'],
    'receipt-mismatch': ['Receipt mismatch; outcome inconclusive', 'रसीद अलग; निष्कर्ष नहीं'], timeout: ['Timeout; outcome check required', 'समय समाप्त; परिणाम जाँचें'],
    interrupted: ['Interrupted; outcome check required', 'बाधा आई; परिणाम जाँचें'], 'outcome-check': ['Synthetic outcome checked', 'काल्पनिक परिणाम जाँचा'],
    'no-record': ['Synthetic ledger confirmed no record', 'काल्पनिक रिकॉर्ड में कार्रवाई नहीं मिली'], 'review-again': ['Fresh approval required', 'नई मंज़ूरी चाहिए'], resumed: ['Practice resumed', 'अभ्यास फिर शुरू'],
  };
  return labels[event][language === 'hi' ? 1 : 0];
}
