'use client';

import { useEffect, useRef, useState } from 'react';
import { FileCheck2, FileSearch } from 'lucide-react';
import type { MobilityCase } from '../../lib/mobility/cases';
import { checkSourceFile, collectSourceFingerprints, SourceCheckError, type SourceCheckErrorCode, type SourceCheckResult, type SourceFingerprintCatalog } from '../../lib/mobility/source-check';
import styles from './SourceCheckPanel.module.css';

type Props = { caseValue: MobilityCase; language: 'en' | 'hi' };
export default function SourceCheckPanel(props: Props) {
  return <CurrentSourceCheck key={JSON.stringify(props.caseValue)} {...props} />;
}

function CurrentSourceCheck({ caseValue, language }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState('');
  const [result, setResult] = useState<SourceCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SourceCheckErrorCode | null>(null);
  const operation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  let catalog: SourceFingerprintCatalog | null;
  try { catalog = collectSourceFingerprints(caseValue); } catch { catalog = null; }

  useEffect(() => {
    const hide = () => {
      operation.current += 1; setOpen(false); setFilename(''); setResult(null); setBusy(false); setError(null);
      if (input.current) input.current.value = '';
    };
    window.addEventListener('pagehide', hide);
    return () => { operation.current += 1; window.removeEventListener('pagehide', hide); };
  }, []);

  function toggle(next: boolean) {
    operation.current += 1; setOpen(next); setFilename(''); setResult(null); setBusy(false); setError(null);
    if (input.current) input.current.value = '';
  }
  async function select(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    const run = ++operation.current;
    setFilename(''); setResult(null); setBusy(false); setError(null);
    if (!file || !catalog?.groups.length) return;
    setFilename(file.name); setBusy(true);
    try {
      const checked = await checkSourceFile(caseValue, file);
      if (run === operation.current) setResult(checked);
    } catch (cause) {
      if (run === operation.current) setError(cause instanceof SourceCheckError ? cause.code : 'hash-failed');
    } finally { if (run === operation.current) setBusy(false); }
  }
  const errors: Record<SourceCheckErrorCode, string> = {
    'invalid-case': t('Correct the case details before checking an original file.', 'मूल फ़ाइल जाँचने से पहले केस की जानकारी ठीक करें।'),
    'no-fingerprints': t('This case has no retained file fingerprints to compare.', 'इस केस में तुलना के लिए फ़ाइल फ़िंगरप्रिंट नहीं हैं।'),
    'invalid-file': t('Choose a non-empty PDF, PNG, JPEG or WebP up to 12 MiB.', '12 MiB तक की गैर-खाली PDF, PNG, JPEG या WebP चुनें।'),
    'read-failed': t('This file could not be read. Choose the original again.', 'यह फ़ाइल पढ़ी नहीं जा सकी। मूल फ़ाइल फिर चुनें।'),
    'crypto-unavailable': t('Local file checking is unavailable in this browser. Use a current browser on a secure connection.', 'इस ब्राउज़र में स्थानीय फ़ाइल जाँच उपलब्ध नहीं है। सुरक्षित कनेक्शन पर नया ब्राउज़र उपयोग करें।'),
    'hash-failed': t('The local check could not finish. Choose the file again when ready.', 'स्थानीय जाँच पूरी नहीं हुई। तैयार होने पर फ़ाइल फिर चुनें।'),
  };
  return <details className={styles.panel} open={open} onToggle={event => { if (event.currentTarget.open !== open) toggle(event.currentTarget.open); }}>
    <summary onClick={event => { event.preventDefault(); toggle(!open); }}><FileSearch size={17} aria-hidden="true" />{t('Check an original file against this case', 'इस केस से मूल फ़ाइल मिलाएँ')}</summary>
    {open && <div className={styles.body}>
      <p>{t('Choose an original you still hold. This device compares its SHA-256 fingerprint with the file fingerprints retained in this case. The file is not uploaded, read with OCR or added to the case.', 'अपने पास मौजूद मूल फ़ाइल चुनें। यह डिवाइस उसके SHA-256 फ़िंगरप्रिंट को केस में रखे फ़ाइल फ़िंगरप्रिंट से मिलाता है। फ़ाइल अपलोड नहीं होगी, OCR से नहीं पढ़ी जाएगी और केस में नहीं जुड़ेगी।')}</p>
      {!catalog ? <p role="alert" className={styles.warning}>{errors['invalid-case']}</p> : <>
        {catalog.missingFingerprintCount > 0 && <p className={styles.small}>{t(`${catalog.missingFingerprintCount} ${catalog.missingFingerprintCount === 1 ? 'document detail has' : 'document details have'} no retained file fingerprint and cannot be checked this way.`, `${catalog.missingFingerprintCount} दस्तावेज़ विवरणों में फ़ाइल फ़िंगरप्रिंट नहीं हैं; उन्हें इस तरह नहीं जाँचा जा सकता।`)}</p>}
        {catalog.groups.length === 0 ? <div className={styles.result}><p>{t('No original-file fingerprints were retained in this case. Older cases and manually entered details may not include them.', 'इस केस में मूल फ़ाइल के फ़िंगरप्रिंट नहीं रखे गए थे। पुराने केस और स्वयं दर्ज जानकारी में वे नहीं हो सकते।')}</p><a href="/review">{t('Review a document on this device', 'इस डिवाइस पर दस्तावेज़ की समीक्षा करें')}</a></div> : <>
          <p className={styles.small}>{t(`${catalog.groups.length} ${catalog.groups.length === 1 ? 'retained fingerprint covers' : 'retained fingerprints cover'} ${catalog.groups.reduce((count, group) => count + group.facts.length, 0)} case details. Repeated fingerprints are grouped together.`, `${catalog.groups.length} अलग फ़िंगरप्रिंट ${catalog.groups.reduce((count, group) => count + group.facts.length, 0)} केस विवरणों से जुड़े हैं। दोहराए फ़िंगरप्रिंट साथ रखे गए हैं।`)}</p>
          <input ref={input} className={styles.hiddenInput} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" aria-label={t('Original PDF or image to check locally', 'स्थानीय जाँच के लिए मूल PDF या तस्वीर')} onChange={event => { void select(event); }} />
          <button type="button" className={styles.primary} onClick={() => input.current?.click()}><FileCheck2 size={18} aria-hidden="true" />{t('Choose original to check locally', 'स्थानीय जाँच के लिए मूल फ़ाइल चुनें')}</button>
          <p className={styles.small}>{t('PDF, PNG, JPEG or WebP · up to 12 MiB. Only the filename and check result remain in this panel until you close it.', 'PDF, PNG, JPEG या WebP · 12 MiB तक। बंद करने तक इस पैनल में केवल फ़ाइल का नाम और जाँच का परिणाम रहेगा।')}</p>
          {filename && <p className={styles.filename}>{t('Selected file', 'चुनी फ़ाइल')}: <strong>{filename}</strong></p>}
          {busy && <p role="status">{t('Checking the file bytes on this device…', 'इसी डिवाइस पर फ़ाइल के बाइट जाँच रहे हैं…')}</p>}
          {result && <section className={styles.result} aria-label={t('Original-file check result', 'मूल फ़ाइल जाँच का परिणाम')}>
            <h3>{result.status === 'match' ? t('This file matches a retained fingerprint', 'यह फ़ाइल रखे हुए फ़िंगरप्रिंट से मेल खाती है') : t('This file does not match a retained fingerprint', 'यह फ़ाइल रखे हुए फ़िंगरप्रिंट से मेल नहीं खाती')}</h3>
            <p>{result.status === 'match' ? t('The file has the same bytes as the source represented by this retained fingerprint, even if its filename changed.', 'फ़ाइल के बाइट इस रखे हुए फ़िंगरप्रिंट के स्रोत जैसे हैं, भले ही फ़ाइल का नाम बदल गया हो।') : t('A different scan, screenshot, crop, re-saved PDF or another file can have a different fingerprint. This result does not show that anything was tampered with. Try the exact original used for the case.', 'अलग स्कैन, स्क्रीनशॉट, कटी तस्वीर, दोबारा सहेजा PDF या दूसरी फ़ाइल का फ़िंगरप्रिंट अलग हो सकता है। इससे छेड़छाड़ साबित नहीं होती। केस में उपयोग की गई वही मूल फ़ाइल आज़माएँ।')}</p>
            {result.matchedFacts.length > 0 && <><h4>{t('Case details linked to these bytes', 'इन बाइट से जुड़े केस विवरण')}</h4><ul>{result.matchedFacts.map(fact => <li key={fact.key}><strong>{fact.label}</strong>{fact.sourceId && <span>{t('Source reference', 'स्रोत संदर्भ')}: {fact.sourceId}{fact.page ? ` · ${t('page', 'पृष्ठ')} ${fact.page}` : ''}</span>}</li>)}</ul></>}
            <p className={styles.limitation}>{t('A byte match does not establish authenticity, the truth of the recorded details, independent evidence or official verification. A retained fingerprint is part of the case record and can itself be incorrect.', 'बाइट का मेल प्रामाणिकता, दर्ज विवरणों की सच्चाई, स्वतंत्र साक्ष्य या आधिकारिक सत्यापन साबित नहीं करता। रखा फ़िंगरप्रिंट केस रिकॉर्ड का हिस्सा है और वह भी गलत हो सकता है।')}</p>
            <details><summary>{t('See the SHA-256 fingerprint', 'SHA-256 फ़िंगरप्रिंट देखें')}</summary><code>{result.fingerprint}</code></details>
          </section>}
        </>}
      </>}
      {error && <p role="alert" className={styles.warning}>{errors[error]}</p>}
      <button type="button" onClick={() => toggle(false)}>{t('Close and clear this file check', 'बंद करें और फ़ाइल जाँच साफ़ करें')}</button>
    </div>}
  </details>;
}
