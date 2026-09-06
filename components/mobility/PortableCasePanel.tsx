'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Download, LockKeyhole, Upload } from 'lucide-react';
import type { MobilityCase } from '../../lib/mobility/cases';
import CaseAccountPreview from './CaseAccountPreview';
import { PORTABLE_MAX_FILE_BYTES, openPortableCase, previewPortableCase, restoredCaseCopy, sealPortableCase } from '../../lib/mobility/portable-case';
import styles from './PortableCasePanel.module.css';

type Language = 'en' | 'hi';
function readableError(cause: unknown) { return cause instanceof Error ? cause.message : 'The local encrypted file could not be processed.'; }
const subscribeToClient = () => () => {};
const clientReady = () => true;
const serverNotReady = () => false;

export function PortableCaseExport(props: { caseValue: MobilityCase; language: Language }) {
  // Changing any case detail discards the old review and cancels in-flight encryption.
  return <CurrentCaseExport key={JSON.stringify(props.caseValue)} {...props} />;
}

function CurrentCaseExport({ caseValue, language }: { caseValue: MobilityCase; language: Language }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const operation = useRef(0);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const activeUrls = urls.current;
    const clean = () => { operation.current += 1; activeUrls.forEach(url => URL.revokeObjectURL(url)); activeUrls.clear(); };
    const hide = () => { clean(); setOpen(false); setPreview(''); setPassphrase(''); setConfirmation(''); setReviewed(false); setBusy(false); setError(''); setMessage(''); };
    window.addEventListener('pagehide', hide);
    return () => { clean(); window.removeEventListener('pagehide', hide); };
  }, []);
  function reset() {
    operation.current += 1; urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
    setPreview(''); setPassphrase(''); setConfirmation(''); setReviewed(false); setBusy(false); setError(''); setMessage('');
  }
  function toggle(next: boolean) {
    setOpen(next); reset();
    if (next) { try { setPreview(previewPortableCase(caseValue)); } catch (cause) { setError(readableError(cause)); } }
  }
  function editPassword(value: string, confirm: boolean) {
    operation.current += 1; setBusy(false); setError(''); setMessage(''); setReviewed(false);
    if (confirm) setConfirmation(value); else setPassphrase(value);
  }
  async function download(event: React.FormEvent) {
    event.preventDefault(); if (!reviewed || !preview || busy) return;
    if (passphrase !== confirmation) { setError(t('Both passphrases must match.', 'दोनों पासफ़्रेज़ समान होने चाहिए।')); return; }
    const run = ++operation.current; setBusy(true); setError(''); setMessage('');
    try {
      const encrypted = await sealPortableCase(caseValue, passphrase);
      if (run !== operation.current) return;
      const url = URL.createObjectURL(new Blob([encrypted], { type: 'application/json' })); urls.current.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'my-encrypted-mobility-case.json'; anchor.click();
      setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1_000);
      setPassphrase(''); setConfirmation(''); setReviewed(false);
      setMessage(t('Encrypted case downloaded. Keep the passphrase separately; it cannot be recovered here.', 'एन्क्रिप्टेड केस डाउनलोड हुआ। पासफ़्रेज़ अलग रखें; यहाँ इसे वापस नहीं पाया जा सकता।'));
    } catch (cause) { if (run === operation.current) { setError(readableError(cause)); setPassphrase(''); setConfirmation(''); setReviewed(false); } }
    finally { if (run === operation.current) setBusy(false); }
  }
  return <details className={styles.panel} open={open} onToggle={event => { if (event.currentTarget.open !== open) toggle(event.currentTarget.open); }}>
    <summary onClick={event => { event.preventDefault(); toggle(!open); }}><LockKeyhole size={16} />{t('Move this case with an encrypted file', 'एन्क्रिप्टेड फ़ाइल से यह केस ले जाएँ')}</summary>
    {open && <div className={styles.body}>
      <p>{t('Review this exact case, then protect a portable copy with your own passphrase. Encryption happens on this device; nothing is uploaded.', 'यह पूरा केस जाँचें, फिर अपने पासफ़्रेज़ से साथ ले जाने वाली प्रति सुरक्षित करें। एन्क्रिप्शन इस डिवाइस पर होता है; कुछ अपलोड नहीं होता।')}</p>
      <p className={styles.notice}>{t('The case includes the readings, draft, timeline and any document fingerprint metadata shown below. Original files, your separate reusable profile, follow-up notes, linked plans and document reminders are excluded.', 'केस में नीचे दिखाई गई रीडिंग, मसौदा, घटनाक्रम और दस्तावेज़ फ़िंगरप्रिंट जानकारी शामिल है। मूल फ़ाइलें, अलग पुनः उपयोग प्रोफ़ाइल, फ़ॉलो-अप नोट, जुड़ी योजनाएँ और दस्तावेज़ अनुस्मारक शामिल नहीं हैं।')}</p>
      {preview && <><section className={styles.readable} aria-label={t('Review the case to encrypt', 'एन्क्रिप्ट होने वाले केस की समीक्षा')}><h3>{caseValue.title}</h3><CaseAccountPreview item={caseValue} language={language} /></section>
        <details className={styles.technical}><summary>{t('Full file data and technical identifiers', 'पूरी फ़ाइल जानकारी और तकनीकी पहचान')}</summary><label>{t('Exact case contents to encrypt', 'एन्क्रिप्ट करने के लिए केस की पूरी सामग्री')}<textarea aria-label={t('Exact case contents to encrypt', 'एन्क्रिप्ट करने के लिए केस की पूरी सामग्री')} className={styles.preview} readOnly rows={12} value={preview} spellCheck={false} /></label></details>
        <p>{t('Use several random words, 12–128 characters. A lost passphrase cannot be recovered. Downloaded copies remain until you delete them. Any case saved in this browser remains unencrypted.', 'कई यादृच्छिक शब्दों का 12–128 अक्षरों वाला पासफ़्रेज़ रखें। खोया पासफ़्रेज़ वापस नहीं मिल सकता। डाउनलोड प्रतियाँ आपके हटाने तक रहेंगी। इस ब्राउज़र में सहेजा केस बिना एन्क्रिप्शन ही रहेगा।')}</p>
        <form className={styles.form} onSubmit={download}>
          <label>{t('New file passphrase', 'नई फ़ाइल का पासफ़्रेज़')}<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={passphrase} onChange={event => editPassword(event.target.value, false)} /></label>
          <label>{t('Confirm file passphrase', 'फ़ाइल का पासफ़्रेज़ फिर लिखें')}<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={event => editPassword(event.target.value, true)} /></label>
          <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={event => { operation.current += 1; setBusy(false); setReviewed(event.target.checked); }} />{t('I reviewed the exact contents and choose to download this encrypted copy.', 'मैंने पूरी सामग्री जाँच ली है और यह एन्क्रिप्टेड प्रति डाउनलोड करना चाहता/चाहती हूँ।')}</label>
          <button type="submit" className={styles.primary} disabled={!reviewed || busy || passphrase.length < 12 || confirmation.length < 12}><Download size={16} />{busy ? t('Encrypting on this device…', 'इस डिवाइस पर एन्क्रिप्ट हो रहा है…') : t('Download reviewed encrypted case', 'जाँचा हुआ एन्क्रिप्टेड केस डाउनलोड करें')}</button>
        </form></>}
      {error && <p className={styles.warning} role="alert">{error}</p>}{message && <p className={styles.notice} role="status">{message}</p>}
      <button type="button" onClick={() => toggle(false)}>{t('Close and clear this file review', 'बंद करें और फ़ाइल समीक्षा साफ़ करें')}</button>
    </div>}
  </details>;
}

export function PortableCaseImport({ language, onOpen }: { language: Language; onOpen: (value: MobilityCase) => boolean }) {
  // This browser-only file control is offered once its event handlers are ready.
  const ready = useSyncExternalStore(subscribeToClient, clientReady, serverNotReady);
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [open, setOpen] = useState(false);
  const [serialized, setSerialized] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [candidate, setCandidate] = useState<MobilityCase | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const operation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const hide = () => { operation.current += 1; setOpen(false); setSerialized(''); setPassphrase(''); setCandidate(null); setReviewed(false); setBusy(false); setError(''); setMessage(''); if (fileInput.current) fileInput.current.value = ''; };
    window.addEventListener('pagehide', hide);
    return () => { operation.current += 1; window.removeEventListener('pagehide', hide); };
  }, []);
  function reset() { operation.current += 1; setSerialized(''); setPassphrase(''); setCandidate(null); setReviewed(false); setBusy(false); setError(''); setMessage(''); if (fileInput.current) fileInput.current.value = ''; }
  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; reset(); if (!file) return;
    const run = operation.current; setBusy(true);
    try {
      if (file.size < 1 || file.size > PORTABLE_MAX_FILE_BYTES) throw new Error(t(`Choose a non-empty encrypted case file of at most ${PORTABLE_MAX_FILE_BYTES.toLocaleString('en-IN')} bytes.`, `अधिकतम ${PORTABLE_MAX_FILE_BYTES.toLocaleString('hi-IN')} बाइट की गैर-खाली एन्क्रिप्टेड केस फ़ाइल चुनें।`));
      const text = await file.text(); if (run === operation.current) { setSerialized(text); setMessage(t('Encrypted file loaded locally. Enter its passphrase to review the contents.', 'एन्क्रिप्टेड फ़ाइल स्थानीय रूप से खुली। सामग्री जाँचने के लिए उसका पासफ़्रेज़ लिखें।')); }
    } catch (cause) { if (run === operation.current) setError(readableError(cause)); }
    finally { if (run === operation.current) setBusy(false); }
  }
  async function decrypt(event: React.FormEvent) {
    event.preventDefault(); if (!serialized || busy) return;
    const run = ++operation.current; setBusy(true); setError(''); setMessage(''); setCandidate(null); setReviewed(false);
    try { const restored = await openPortableCase(serialized, passphrase); if (run === operation.current) { setCandidate(restored); setMessage(t('Decrypted locally for your review. This case has not been saved or opened.', 'आपकी समीक्षा के लिए स्थानीय रूप से डिक्रिप्ट हुआ। यह केस अभी सहेजा या खोला नहीं गया।')); } }
    catch (cause) { if (run === operation.current) setError(readableError(cause)); }
    finally { if (run === operation.current) { setPassphrase(''); setBusy(false); } }
  }
  function openDraft() {
    if (!candidate || !reviewed || busy) return;
    try {
      if (onOpen(restoredCaseCopy(candidate))) { reset(); setOpen(false); setMessage(t('Opened as a new unsaved draft. Review it and choose whether to save it on this device.', 'नए बिना सहेजे मसौदे के रूप में खुला। जाँचकर तय करें कि इसे इस डिवाइस पर सहेजना है या नहीं।')); }
    } catch (cause) { setError(readableError(cause)); }
  }
  let candidatePreview = ''; let previewError = '';
  if (candidate) { try { candidatePreview = previewPortableCase(candidate); } catch (cause) { previewError = readableError(cause); } }
  if (!ready) return null;
  return <div className={styles.import}>
    <details className={styles.panel} open={open} onToggle={event => { if (event.currentTarget.open !== open) { setOpen(event.currentTarget.open); reset(); } }}>
      <summary onClick={event => { event.preventDefault(); setOpen(!open); reset(); }}><Upload size={16} />{t('Open an encrypted case file', 'एन्क्रिप्टेड केस फ़ाइल खोलें')}</summary>
      {open && <div className={styles.body}>
        <p>{t('Choose a portable case file and decrypt it on this device. Its claims come from the file; they have not been verified by ChallanSakshi. No file or passphrase is uploaded.', 'साथ ले जाने वाली केस फ़ाइल चुनें और इस डिवाइस पर डिक्रिप्ट करें। दावे फ़ाइल से आए हैं; चालान साक्षी ने उन्हें सत्यापित नहीं किया है। फ़ाइल या पासफ़्रेज़ अपलोड नहीं होता।')}</p>
        <label>{t('Encrypted case file', 'एन्क्रिप्टेड केस फ़ाइल')}<input ref={fileInput} type="file" accept=".json,application/json" onChange={chooseFile} /></label>
        {serialized && <form className={styles.form} onSubmit={decrypt}>
          <label>{t('File passphrase', 'फ़ाइल का पासफ़्रेज़')}<input type="password" autoComplete="off" minLength={12} maxLength={128} required value={passphrase} onChange={event => { operation.current += 1; setBusy(false); setPassphrase(event.target.value); setCandidate(null); setReviewed(false); setError(''); setMessage(''); }} /></label>
          <button type="submit" disabled={busy || passphrase.length < 12}><LockKeyhole size={16} />{busy ? t('Decrypting on this device…', 'इस डिवाइस पर डिक्रिप्ट हो रहा है…') : t('Decrypt for review', 'समीक्षा के लिए डिक्रिप्ट करें')}</button>
        </form>}
        {candidate && <section className={styles.review} aria-label={t('Review imported case', 'आयातित केस की समीक्षा')}>
          <h3>{candidate.title}</h3><p>{t('Read the full contents below. Opening creates a new unsaved draft with a new identity; your existing cases stay intact. Original dates and their retention period are retained. Save separately only after your own review.', 'नीचे पूरी सामग्री पढ़ें। खोलने पर नई पहचान वाला बिना सहेजा मसौदा बनेगा; मौजूदा केस सुरक्षित रहेंगे। मूल तारीखें और उनकी संग्रह अवधि बनी रहेंगी। अपनी समीक्षा के बाद ही अलग से सहेजें।')}</p>
          {previewError ? <p className={styles.warning} role="alert">{previewError} {t('Close this review and reopen an eligible case file.', 'यह समीक्षा बंद करके मान्य केस फ़ाइल फिर खोलें।')}</p> : <><div className={styles.readable}><CaseAccountPreview item={candidate} language={language} /></div><details className={styles.technical}><summary>{t('Full file data and technical identifiers', 'पूरी फ़ाइल जानकारी और तकनीकी पहचान')}</summary><label>{t('Exact decrypted case contents', 'डिक्रिप्ट किए केस की पूरी सामग्री')}<textarea aria-label={t('Exact decrypted case contents', 'डिक्रिप्ट किए केस की पूरी सामग्री')} className={styles.preview} rows={12} readOnly value={candidatePreview} spellCheck={false} /></label></details></>}
          <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />{t('This is my private device. I reviewed this file and choose to open a new unsaved draft.', 'यह मेरा निजी डिवाइस है। मैंने फ़ाइल जाँची है और नया बिना सहेजा मसौदा खोलना चाहता/चाहती हूँ।')}</label>
          <button type="button" className={styles.primary} disabled={!reviewed || busy || !candidatePreview} onClick={openDraft}>{t('Open as a new unsaved draft', 'नया बिना सहेजा मसौदा खोलें')}</button>
        </section>}
        <p className={styles.small}>{t('Keep the original documents separately. Reusable profile details, follow-up notes, linked plans and document reminders are not restored. A forgotten passphrase cannot be recovered. Closing clears this decrypted preview and passphrase.', 'मूल दस्तावेज़ अलग रखें। पुनः उपयोग प्रोफ़ाइल, फ़ॉलो-अप नोट, जुड़ी योजनाएँ और दस्तावेज़ अनुस्मारक वापस नहीं आते। भूला पासफ़्रेज़ वापस नहीं मिल सकता। बंद करने पर यह डिक्रिप्टेड समीक्षा और पासफ़्रेज़ साफ़ होंगे।')}</p>
        {error && <p className={styles.warning} role="alert">{error}</p>}
        <button type="button" onClick={() => { reset(); setOpen(false); }}>{t('Close and clear imported contents', 'बंद करें और आयातित सामग्री साफ़ करें')}</button>
      </div>}
    </details>
    {message && <p className={styles.notice} role="status">{message}</p>}
  </div>;
}
