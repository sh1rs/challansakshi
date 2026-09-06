'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ClipboardCopy, Download, ListChecks } from 'lucide-react';
import type { MobilityCase } from '../../lib/mobility/cases';
import { buildFormCopyReview, collectFormCopyFields, isFormCopyReviewCurrent, type FormCopyCatalog, type FormCopyOptions, type FormCopyReview } from '../../lib/mobility/form-copy';
import styles from './FormCopyPanel.module.css';

export type FormCopyPanelProps = { caseValue: MobilityCase; language: 'en' | 'hi' };
export default function FormCopyPanel(props: FormCopyPanelProps) {
  let catalog: FormCopyCatalog;
  try { catalog = collectFormCopyFields(props.caseValue, props.language); }
  catch { return <details className={styles.panel}><summary>{props.language === 'hi' ? 'आधिकारिक फ़ॉर्म के लिए जानकारी कॉपी करें' : 'Copy details for an official form'}</summary><p>{props.language === 'hi' ? 'कॉपी तैयार करने से पहले केस की जानकारी ठीक करें।' : 'Correct the case details before preparing a copy.'}</p></details>; }
  return <CurrentFormCopy key={JSON.stringify([props.caseValue, props.language])} {...props} catalog={catalog} />;
}

function CurrentFormCopy({ caseValue, language, catalog }: FormCopyPanelProps & { catalog: FormCopyCatalog }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<FormCopyOptions>({ fieldKeys: [], draftText: '' });
  const [approval, setApproval] = useState<FormCopyReview | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const operation = useRef(0);
  const urls = useRef(new Set<string>());
  let preview: FormCopyReview | null = null;
  let previewError = false;
  if (open && options.fieldKeys.length) {
    try { preview = buildFormCopyReview(caseValue, options, language); } catch { previewError = true; }
  }
  const approved = Boolean(approval && preview && approval.binding === preview.binding);

  useEffect(() => {
    const activeUrls = urls.current;
    const cleanup = () => { operation.current += 1; activeUrls.forEach(url => URL.revokeObjectURL(url)); activeUrls.clear(); };
    const hide = () => { cleanup(); setOpen(false); setOptions({ fieldKeys: [], draftText: '' }); setApproval(null); setBusy(''); setMessage(''); setError(''); };
    window.addEventListener('pagehide', hide);
    return () => { cleanup(); window.removeEventListener('pagehide', hide); };
  }, []);

  function invalidate() { operation.current += 1; setApproval(null); setBusy(''); setMessage(''); setError(''); }
  function toggle(next: boolean) {
    invalidate(); setOpen(next); setOptions({ fieldKeys: [], draftText: '' });
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
  }
  function choose(key: string, included: boolean) {
    invalidate();
    setOptions(previous => ({
      fieldKeys: included ? [...previous.fieldKeys, key] : previous.fieldKeys.filter(value => value !== key),
      draftText: key === 'case:draft' ? (included ? caseValue.draft : '') : previous.draftText,
    }));
  }
  function currentApproval(): FormCopyReview | null {
    if (!approval || !approval.fields.length || !isFormCopyReviewCurrent(approval, caseValue, options, language)) {
      invalidate(); setError(t('The selected details changed. Review the current values again.', 'चुनी जानकारी बदल गई। वर्तमान मान फिर जाँचें।')); return null;
    }
    return approval;
  }
  async function copy(key: string, index: number) {
    if (busy) return;
    const reviewed = currentApproval(); const field = reviewed?.fields.find(value => value.key === key);
    if (!field) return;
    const run = ++operation.current; setBusy(key); setMessage(''); setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      // The user explicitly requested this exact value. Native writes already dispatched cannot be undone.
      await navigator.clipboard.writeText(field.value);
      if (run === operation.current) setMessage(t(`Copied ${field.label}. Paste it yourself into the matching field.`, `${field.label} कॉपी हुआ। उसे सही फ़ील्ड में स्वयं पेस्ट करें।`));
    } catch {
      if (run === operation.current) {
        setError(t('Copy was unavailable or blocked. The value below is selected so you can use your device’s Copy command.', 'कॉपी उपलब्ध नहीं थी या रोकी गई। नीचे का मान चुना है; डिवाइस के कॉपी विकल्प का उपयोग करें।'));
        const input = document.getElementById(`${id}-value-${index}`) as HTMLTextAreaElement | null;
        input?.focus(); input?.select();
      }
    } finally { if (run === operation.current) setBusy(''); }
  }
  function download() {
    if (busy) return;
    const reviewed = currentApproval(); if (!reviewed) return;
    setMessage(''); setError('');
    try {
      const url = URL.createObjectURL(new Blob([reviewed.text], { type: 'text/plain;charset=utf-8' })); urls.current.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'my-reviewed-form-details.txt'; anchor.click();
      setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1_000);
      setMessage(t('Your browser was asked to download the reviewed note. Keep the downloaded file private.', 'ब्राउज़र को समीक्षा किया नोट डाउनलोड करने के लिए कहा गया। डाउनलोड फ़ाइल निजी रखें।'));
    } catch { setError(t('The note could not be downloaded. Try again or copy the reviewed values individually.', 'नोट डाउनलोड नहीं हुआ। फिर कोशिश करें या समीक्षा किए मान अलग-अलग कॉपी करें।')); }
  }

  return <details className={styles.panel} open={open} onToggle={event => { if (event.currentTarget.open !== open) toggle(event.currentTarget.open); }}>
    <summary onClick={event => { event.preventDefault(); toggle(!open); }}><ClipboardCopy size={17} aria-hidden="true" />{t('Copy details for an official form', 'आधिकारिक फ़ॉर्म के लिए जानकारी कॉपी करें')}</summary>
    {open && <div className={styles.body}>
      <p>{t('Choose only what the form asks for, review the exact values, then copy one at a time. You decide where each value belongs; this does not fill or submit an official form.', 'फ़ॉर्म में माँगी जानकारी ही चुनें, पूरे मान जाँचें, फिर एक-एक करके कॉपी करें। कौन सा मान कहाँ जाएगा, आप तय करते हैं; इससे आधिकारिक फ़ॉर्म भरा या जमा नहीं होता।')}</p>
      {catalog.unconfirmedCount > 0 && <p className={styles.notice}>{t(`${catalog.unconfirmedCount} ${catalog.unconfirmedCount === 1 ? 'detail is' : 'details are'} still unconfirmed and unavailable here. Check and confirm those values in your case first.`, `${catalog.unconfirmedCount} विवरण अभी अपुष्ट हैं और यहाँ उपलब्ध नहीं हैं। पहले केस में उन्हें जाँचकर पुष्टि करें।`)}</p>}
      {!catalog.fields.length ? <p>{t('No confirmed values or entered case details are available to copy yet.', 'अभी कॉपी करने के लिए पुष्टि किए मान या दर्ज केस विवरण उपलब्ध नहीं हैं।')}</p> : <>
        <fieldset className={styles.options}><legend>{t('Choose details to include', 'शामिल करने के लिए जानकारी चुनें')}</legend>
          {catalog.fields.map(field => <label className={styles.choice} key={field.key}><input type="checkbox" checked={options.fieldKeys.includes(field.key)} onChange={event => choose(field.key, event.target.checked)} aria-label={`${t('Include', 'शामिल करें')} ${field.label}`} /><span><strong>{field.label}</strong>{field.source !== 'draft' && <span className={styles.value}>{field.value}</span>}<small>{field.provenance}</small>{(field.sourceId || field.page) && <small>{field.sourceId ? `${t('Linked source', 'जुड़ा स्रोत')}: ${field.sourceId}` : ''}{field.page ? ` · ${t('page', 'पृष्ठ')} ${field.page}` : ''}</small>}</span></label>)}
        </fieldset>
        {options.fieldKeys.includes('case:draft') && <label className={styles.draftLabel}>{t('Edit the wording for this copy', 'इस प्रति की भाषा संपादित करें')}<textarea aria-label={t('Edit the wording for this copy', 'इस प्रति की भाषा संपादित करें')} rows={6} maxLength={16_000} value={options.draftText} onChange={event => { invalidate(); setOptions(previous => ({ ...previous, draftText: event.target.value })); }} /><small>{t('These edits affect this copy only. Your case draft is unchanged.', 'ये बदलाव केवल इस प्रति के हैं। केस का मसौदा नहीं बदलेगा।')}</small></label>}
        {previewError && <p role="alert" className={styles.warning}>{t('Check the selected values. Selected draft wording cannot be empty or contain unsupported characters.', 'चुने मान जाँचें। चुने मसौदे की भाषा खाली नहीं हो सकती या उसमें असमर्थित अक्षर नहीं होने चाहिए।')}</p>}
        {preview && <section className={styles.preview} aria-label={t('Review values to copy', 'कॉपी करने वाले मान जाँचें')}>
          <h3><ListChecks size={17} aria-hidden="true" />{t('Review the exact selected values', 'पूरे चुने हुए मान जाँचें')}</h3>
          {preview.fields.map((field, index) => <div className={styles.reviewField} key={field.key}><label htmlFor={`${id}-value-${index}`}>{field.label}</label><textarea id={`${id}-value-${index}`} aria-label={`${t('Reviewed value', 'समीक्षा किया मान')}: ${field.label}`} readOnly rows={field.source === 'draft' ? 5 : field.value.length > 100 ? 3 : 2} value={field.value} /><small>{field.provenance}</small><button type="button" disabled={!approved || Boolean(busy)} onClick={() => { void copy(field.key, index); }}><ClipboardCopy size={16} aria-hidden="true" />{busy === field.key ? t('Copying…', 'कॉपी हो रहा है…') : `${t('Copy', 'कॉपी करें')} ${field.label}`}</button></div>)}
          <details className={styles.exact}><summary>{t('See the exact download text', 'डाउनलोड होने वाला पूरा पाठ देखें')}</summary><textarea aria-label={t('Exact reviewed note to download', 'डाउनलोड करने के लिए पूरा समीक्षा किया नोट')} readOnly rows={8} value={preview.text} /></details>
          <label className={styles.approval}><input type="checkbox" checked={approved} onChange={event => { operation.current += 1; setBusy(''); setMessage(''); setError(''); setApproval(event.target.checked ? preview : null); }} />{t('I reviewed these exact selected values and choose to copy or download them.', 'मैंने इन पूरे चुने मानों की समीक्षा की है और उन्हें कॉपी या डाउनलोड करना चाहता/चाहती हूँ।')}</label>
          <button type="button" className={styles.primary} disabled={!approved || Boolean(busy)} onClick={download}><Download size={17} aria-hidden="true" />{t('Download reviewed details', 'समीक्षा की जानकारी डाउनलोड करें')}</button>
        </section>}
        {!options.fieldKeys.length && <p className={styles.small}>{t('Nothing is selected. The clipboard is never read. Copying or downloading happens only when you choose the corresponding button.', 'अभी कुछ नहीं चुना है। क्लिपबोर्ड कभी पढ़ा नहीं जाता। संबंधित बटन चुनने पर ही कॉपी या डाउनलोड होता है।')}</p>}
      </>}
      {error && <p role="alert" className={styles.warning}>{error}</p>}{message && <p role="status" className={styles.notice}>{message}</p>}
      <p className={styles.small}>{t('Check the official form’s labels and instructions before pasting. Clipboard contents and downloaded files remain on your device until you replace or delete them.', 'पेस्ट करने से पहले आधिकारिक फ़ॉर्म के नाम और निर्देश जाँचें। क्लिपबोर्ड की सामग्री और डाउनलोड फ़ाइलें आपके बदलने या हटाने तक डिवाइस पर रहती हैं।')}</p>
      <button type="button" onClick={() => toggle(false)}>{t('Close and clear this copy review', 'बंद करें और कॉपी समीक्षा साफ़ करें')}</button>
    </div>}
  </details>;
}
