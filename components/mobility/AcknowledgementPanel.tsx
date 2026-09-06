'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import type { CaseStatus, MobilityCase } from '../../lib/mobility/cases';
import { acknowledgementCaseFingerprint, acknowledgementContextPreview, acknowledgementStatusLabel, buildAcknowledgementReview, extractAcknowledgement, MAX_ACKNOWLEDGEMENT_TEXT, type AcknowledgementCandidate, type AcknowledgementKind, type AcknowledgementOptions, type AcknowledgementReview } from '../../lib/mobility/acknowledgement';
import styles from './AcknowledgementPanel.module.css';

export type AcknowledgementPanelProps = { caseValue: MobilityCase; language: 'en' | 'hi'; onApply: (review: AcknowledgementReview) => boolean };
const statuses: CaseStatus[] = ['preparing', 'ready', 'awaiting-response', 'needs-attention', 'completed'];
const emptyOptions = (): AcknowledgementOptions => ({ sourceLabel: '', selections: [], status: '', personalNote: '', replaceReference: false });

export default function AcknowledgementPanel(props: AcknowledgementPanelProps) {
  let fingerprint: string;
  try { fingerprint = acknowledgementCaseFingerprint(props.caseValue, props.language); }
  catch { return null; }
  return <CurrentAcknowledgement key={fingerprint} {...props} />;
}

function CurrentAcknowledgement({ caseValue, language, onApply }: AcknowledgementPanelProps) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const id = useId(); const active = useRef(true);
  const [open, setOpen] = useState(false); const [text, setText] = useState('');
  const [options, setOptions] = useState<AcknowledgementOptions>(emptyOptions);
  const [preview, setPreview] = useState<AcknowledgementReview | null>(null);
  const [approved, setApproved] = useState(false); const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const extraction = extractAcknowledgement(text);
  const sourceContext = acknowledgementContextPreview(text);
  const labels: Record<AcknowledgementKind, string> = { reference: t('Reference', 'संदर्भ'), date: t('Date shown in the text', 'पाठ में दी तारीख'), amount: t('Amount shown in the text (INR)', 'पाठ में दी राशि (INR)') };
  const referenceCandidate = extraction.candidates.find(candidate => candidate.kind === 'reference' && options.selections.some(selection => selection.id === candidate.id));
  const selectedReference = referenceCandidate && options.selections.find(selection => selection.id === referenceCandidate.id)?.value.trim();
  const differentReference = Boolean(caseValue.reference && selectedReference && selectedReference !== caseValue.reference);

  function invalidate() { setPreview(null); setApproved(false); setError(''); setApplied(false); }
  function clear() { setText(''); setOptions(emptyOptions()); setPreview(null); setApproved(false); setError(''); setApplied(false); }
  useEffect(() => {
    active.current = true;
    const hide = () => { setOpen(false); clear(); };
    window.addEventListener('pagehide', hide);
    return () => { active.current = false; window.removeEventListener('pagehide', hide); };
  }, []);
  function changeOptions(patch: Partial<AcknowledgementOptions>) { invalidate(); setOptions(previous => ({ ...previous, ...patch })); }
  function choose(kind: AcknowledgementKind, candidate: AcknowledgementCandidate | null) {
    invalidate();
    const ids = extraction.candidates.filter(item => item.kind === kind).map(item => item.id);
    setOptions(previous => ({ ...previous, replaceReference: kind === 'reference' ? false : previous.replaceReference, selections: [...previous.selections.filter(selection => !ids.includes(selection.id)), ...(candidate ? [{ id: candidate.id, value: candidate.value }] : [])] }));
  }
  function showError(cause: unknown) {
    setError(language === 'hi' ? 'स्रोत का नाम, चुने मान, लंबाई और अपनी प्रगति जाँचें। अनिश्चित मान सुधारें या छोड़ दें; अलग संदर्भ इसी केस का है यह भी जाँचें।' : cause instanceof Error ? cause.message : 'Check the selected details again.');
  }
  function review() {
    try { setPreview(buildAcknowledgementReview(caseValue, text, options, language)); setApproved(false); setError(''); }
    catch (cause) { setPreview(null); setApproved(false); showError(cause); }
  }
  function apply() {
    if (!approved || !preview || !active.current) return;
    try {
      const exact = buildAcknowledgementReview(caseValue, text, options, language);
      if (JSON.stringify(exact) !== JSON.stringify(preview)) throw new Error('The review changed. Review this update again.');
      if (onApply(exact) === true) { if (active.current) { clear(); setApplied(true); } }
      else { setPreview(null); setApproved(false); setError(t('This update was not added. Check the current case and review again.', 'यह अपडेट नहीं जुड़ा। वर्तमान केस जाँचें और फिर समीक्षा करें।')); }
    } catch (cause) { setPreview(null); setApproved(false); showError(cause); }
  }
  return <details className={styles.panel} open={open} onToggle={event => { const next = event.currentTarget.open; setOpen(next); if (!next) clear(); }}>
    <summary><FileCheck2 size={17} aria-hidden="true" />{t('Review text from an acknowledgement', 'पावती के पाठ की समीक्षा करें')}</summary>
    {open && <div className={styles.body}>
      <p>{t('Paste text you copied yourself, name its source, then choose what belongs in this case. No page is opened or fetched. This cannot authenticate a receipt, confirm a payment or establish an official outcome.', 'स्वयं कॉपी किया पाठ चिपकाएँ, उसका स्रोत बताएँ और इस केस की जानकारी चुनें। कोई पृष्ठ खोला या मँगाया नहीं जाता। इससे रसीद, भुगतान या आधिकारिक परिणाम प्रमाणित नहीं होता।')}</p>
      <p className={styles.small}>{t('Keep passwords, OTPs, card details and unrelated personal data out. Only the exact note and reference you approve can enter this case; the full pasted text stays in this panel.', 'पासवर्ड, OTP, कार्ड विवरण और असंबंधित निजी जानकारी न डालें। केवल स्वीकृत पूरा नोट और संदर्भ केस में जुड़ सकते हैं; पूरा चिपकाया पाठ इस पैनल में रहता है।')}</p>
      <label>{t('Text I copied from the acknowledgement', 'पावती से मेरे द्वारा कॉपी किया पाठ')}<textarea rows={6} value={text} autoComplete="off" spellCheck={false} onChange={event => { invalidate(); setText(event.target.value); setOptions(previous => ({ ...emptyOptions(), sourceLabel: previous.sourceLabel })); }} /></label>
      <small>{text.length} / {MAX_ACKNOWLEDGEMENT_TEXT} {t('characters; longer text is not reviewed or shortened automatically', 'अक्षर; बड़े पाठ की समीक्षा या उसे अपने आप छोटा नहीं किया जाता')}</small>
      <label>{t('Where I copied this from', 'मैंने इसे कहाँ से कॉपी किया')}<input aria-label={t('Where I copied this from', 'मैंने इसे कहाँ से कॉपी किया')} aria-describedby={`${id}-source-help`} value={options.sourceLabel} autoComplete="off" placeholder={t('For example: receipt screen I opened myself', 'उदाहरण: स्वयं खोली रसीद की स्क्रीन')} onChange={event => changeOptions({ sourceLabel: event.target.value })} /><small id={`${id}-source-help`}>{t('Your source label, up to 120 characters. It is not an authenticated source.', 'आपके अनुसार स्रोत का नाम, अधिकतम 120 अक्षर। यह प्रमाणित स्रोत नहीं है।')}</small></label>
      {extraction.issue && <p className={styles.warning} role="alert">{t('This text exceeds the review limits or contains unsupported characters. Shorten or correct it; nothing has been selected.', 'यह पाठ समीक्षा सीमा से बड़ा है या इसमें असमर्थित अक्षर हैं। इसे छोटा या ठीक करें; कुछ चुना नहीं गया है।')}</p>}
      {!extraction.issue && text.trim() && <>
        {!extraction.candidates.length && <p>{t('No supported labelled readings were found. You can add your own short update below. No date, amount or reference will be guessed.', 'कोई समर्थित लेबल वाला मान नहीं मिला। नीचे अपना छोटा अपडेट लिख सकते हैं। तारीख, राशि या संदर्भ का अनुमान नहीं लगाया जाएगा।')}</p>}
        {sourceContext.contexts.length > 0 && <details className={styles.context}><summary>{t('See exact source context', 'स्रोत का पूरा संदर्भ देखें')}</summary>
          <p className={styles.small}>{t(`Showing the first ${sourceContext.contexts.length} of ${sourceContext.totalContexts} distinct source lines. The full text has ${sourceContext.totalOccurrences} labelled occurrences. All candidate readings remain below; the complete original text is above.`, `${sourceContext.totalContexts} अलग स्रोत पंक्तियों में से पहली ${sourceContext.contexts.length} दिखाई गई हैं। पूरे पाठ में ${sourceContext.totalOccurrences} लेबल वाले मान हैं। सभी मिले मान नीचे हैं; पूरा मूल पाठ ऊपर है।`)}</p>
          <div className={styles.contextText} tabIndex={0} role="region" aria-label={t('Bounded original source context', 'सीमित मूल स्रोत संदर्भ')}>{sourceContext.contexts.map(context => <pre key={`${context.start}-${context.end}`}>{context.highlights.map((span, index) => <Fragment key={`${span.start}-${span.end}`}>{text.slice(index === 0 ? context.start : context.highlights[index - 1].end, span.start)}<mark>{text.slice(span.start, span.end)}</mark></Fragment>)}{text.slice(context.highlights.at(-1)?.end ?? context.start, context.end)}</pre>)}</div>
        </details>}
        {(['reference', 'date', 'amount'] as const).map(kind => {
          const group = extraction.candidates.filter(candidate => candidate.kind === kind);
          if (!group.length) return null;
          return <fieldset className={styles.group} key={kind}><legend>{labels[kind]}</legend>
            {group.length > 1 && <p className={styles.warning}>{t('Different readings appear. Choose one for this case or leave them out; they have not been matched to an official record.', 'अलग-अलग मान दिखते हैं। इस केस के लिए एक चुनें या छोड़ दें; इनका किसी आधिकारिक रिकॉर्ड से मिलान नहीं हुआ है।')}</p>}
            <label className={styles.choice}><input type="radio" name={`${id}-${kind}`} checked={!group.some(candidate => options.selections.some(selection => selection.id === candidate.id))} onChange={() => choose(kind, null)} />{t('Leave out', 'छोड़ दें')} {labels[kind]}</label>
            {group.map((candidate, index) => {
              const selection = options.selections.find(value => value.id === candidate.id);
              return <div className={styles.reading} key={candidate.id}>
                <label className={styles.choice}><input type="radio" name={`${id}-${kind}`} checked={Boolean(selection)} onChange={() => choose(kind, candidate)} />{t('Use reading', 'यह मान लें')} {index + 1}: <span className={styles.value}>{candidate.value}</span></label>
                <small>{candidate.certainty === 'needs-correction' ? t('Uncertain or unsupported reading. Correct it from your source or leave it out.', 'अनिश्चित या असमर्थित मान। स्रोत देखकर सुधारें या छोड़ दें।') : t('A labelled reading, not verified by ChallanSakshi.', 'लेबल वाला मान; चालान साक्षी ने सत्यापन नहीं किया।')}{candidate.spans.length > 1 ? t(` Appears ${candidate.spans.length} times.`, ` ${candidate.spans.length} बार दिखता है।`) : ''}</small>
                {selection && <label>{t('Check or correct', 'जाँचें या सुधारें')}: {labels[kind]}<input aria-label={`${t('Reviewed', 'समीक्षा किया')} ${labels[kind]}`} autoComplete="off" spellCheck={false} value={selection.value} onChange={event => changeOptions({ selections: options.selections.map(value => value.id === candidate.id ? { ...value, value: event.target.value } : value), ...(kind === 'reference' ? { replaceReference: false } : {}) })} /><small>{kind === 'date' ? t('Use YYYY-MM-DD after checking the source. Ambiguous numeric dates are never reordered.', 'स्रोत जाँचकर YYYY-MM-DD लिखें। अस्पष्ट अंकों वाली तारीख का क्रम अपने आप नहीं बदला जाता।') : kind === 'amount' ? t('Use a number in INR, for example 500.00. It is only an amount you read, not payment confirmation.', 'INR में संख्या लिखें, जैसे 500.00। यह केवल पढ़ी राशि है, भुगतान की पुष्टि नहीं।') : t('Check the exact reference, including any letters, digits and separators.', 'अक्षर, अंक और विभाजकों सहित पूरा संदर्भ जाँचें।')}</small></label>}
              </div>;
            })}
          </fieldset>;
        })}
        {differentReference && <div className={styles.warning}><p>{t('This differs from the reference currently entered in this case:', 'यह केस में वर्तमान दर्ज संदर्भ से अलग है:')} <strong className={styles.value}>{caseValue.reference}</strong></p><label className={styles.choice}><input type="checkbox" checked={options.replaceReference} onChange={event => changeOptions({ replaceReference: event.target.checked })} />{t('I checked that this different reference belongs to this case and choose to replace the entered reference.', 'मैंने जाँचा है कि यह अलग संदर्भ इसी केस का है और दर्ज संदर्भ बदलना चाहता/चाहती हूँ।')}</label></div>}
        <label>{t('My short update (optional)', 'मेरा छोटा अपडेट (वैकल्पिक)')}<textarea aria-label={t('My short update (optional)', 'मेरा छोटा अपडेट (वैकल्पिक)')} aria-describedby={`${id}-note-help`} rows={3} value={options.personalNote} onChange={event => changeOptions({ personalNote: event.target.value })} /><small id={`${id}-note-help`}>{options.personalNote.length} / 350 {t('characters', 'अक्षर')}</small></label>
        <label>{t('Progress I want to report', 'मैं जिस प्रगति की सूचना देना चाहता/चाहती हूँ')}<select value={options.status} onChange={event => changeOptions({ status: event.target.value as CaseStatus | '' })}><option value="">{t('Choose my reported progress', 'अपनी रिपोर्ट की प्रगति चुनें')}</option>{statuses.map(status => <option key={status} value={status}>{acknowledgementStatusLabel(status, language)}</option>)}</select></label>
        <p className={styles.small}>{t('Words such as “paid”, “accepted” or “disposed” never choose your progress. This panel does not advise whether to pay, retry or take an official action.', '“भुगतान हुआ”, “स्वीकृत” या “निस्तारित” जैसे शब्द आपकी प्रगति नहीं चुनते। यह पैनल भुगतान, दोबारा प्रयास या आधिकारिक कार्रवाई की सलाह नहीं देता।')}</p>
        <button type="button" onClick={review}>{t('Review this update', 'इस अपडेट की समीक्षा करें')}</button>
      </>}
      {preview && <section className={styles.preview} aria-label={t('Exact update to add', 'जोड़ा जाने वाला पूरा अपडेट')}>
        <h3>{t('Check exactly what will enter the case', 'केस में जुड़ने वाली पूरी जानकारी जाँचें')}</h3>
        <p>{t('Reference after this update', 'इस अपडेट के बाद संदर्भ')}: <strong className={styles.value}>{preview.reference ?? (caseValue.reference || t('No reference entered', 'कोई संदर्भ दर्ज नहीं'))}</strong>{preview.reference === undefined && ` · ${t('unchanged', 'बिना बदलाव')}`}</p>
        <p>{t('Progress reported by you', 'आपके द्वारा बताई प्रगति')}: {acknowledgementStatusLabel(preview.status, language)}</p>
        <label>{t('Exact timeline note', 'समयरेखा का पूरा नोट')}<textarea rows={9} readOnly value={preview.note} /></label>
        <label className={styles.choice}><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} />{t('I reviewed this exact note, reference and progress, and choose to add my report to this case.', 'मैंने पूरा नोट, संदर्भ और प्रगति जाँची है और अपनी रिपोर्ट इस केस में जोड़ना चाहता/चाहती हूँ।')}</label>
        <button type="button" className={styles.primary} disabled={!approved} onClick={apply}>{t('Add my reviewed report', 'मेरी समीक्षा की गई रिपोर्ट जोड़ें')}</button>
        <small>{t('This updates the working case only. Private-device saving is a separate choice. The raw pasted text is not added to the case.', 'इससे केवल कार्यरत केस बदलता है। निजी डिवाइस पर सहेजना अलग विकल्प है। पूरा चिपकाया पाठ केस में नहीं जुड़ता।')}</small>
      </section>}
      {error && <p className={styles.warning} role="alert">{error}</p>}
      {applied && <p className={styles.notice} role="status">{t('Your reviewed report was added to the working case. Choose saving separately if you want to keep it.', 'समीक्षा की गई रिपोर्ट कार्यरत केस में जुड़ी। रखना हो तो अलग से सहेजना चुनें।')}</p>}
      <button type="button" onClick={() => { clear(); setOpen(false); }}>{t('Close and clear pasted text', 'बंद करें और चिपकाया पाठ साफ़ करें')}</button>
    </div>}
  </details>;
}
