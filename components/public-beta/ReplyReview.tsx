'use client';
import { useCallback, useRef, useState } from 'react';
import type { Language } from '../../lib/domain';
import { buildReplyFollowUp, linkReplyPassage, type ReplyPassage, type ReplyPoint, type ReplyStatus } from '../../lib/reply-review';
import { PublicBetaShell, publicBetaStyles as styles } from './PublicBetaShell';
import { useClientReady } from '../shared/useClientReady';
import PrivateNotePrintButton from '../shared/PrivateNotePrintButton';
import { useUtilityPrivacy } from './ReplyReviewPrivacy';
import local from './MessageSafetyCheck.module.css';

const firstPoint = (): ReplyPoint => ({ id: '1', question: '', status: 'unreviewed' });
export default function ReplyReview() {
  const clientReady = useClientReady();
  const [language, setLanguage] = useState<Language>('en');
  const [reply, setReply] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [points, setPoints] = useState<ReplyPoint[]>([firstPoint()]);
  const [selection, setSelection] = useState<ReplyPassage | null>(null);
  const [prepared, setPrepared] = useState(false);
  const [privateDevice, setPrivateDevice] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(2);
  const clear = useCallback(() => { setReply(''); setSourceLabel(''); setPoints([firstPoint()]); setSelection(null); setPrepared(false); setPrivateDevice(false); nextId.current = 2; }, []);
  const ensureActive = useUtilityPrivacy(clear);
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const note = buildReplyFollowUp({ reply, sourceLabel, points }, language);
  const updatePoint = (id: string, changes: Partial<ReplyPoint>) => { setPrepared(false); setPoints(current => current.map(point => point.id === id ? { ...point, ...changes } : point)); };
  const changeReply = (value: string) => {
    setReply(value); setSelection(null); setPrepared(false);
    setPoints(current => current.map(point => ({ ...point, status: 'unreviewed', passage: undefined })));
  };
  const captureSelection = () => { const field = replyRef.current; if (field) setSelection(linkReplyPassage(reply, field.selectionStart, field.selectionEnd)); };
  const download = () => {
    if (!privateDevice || !prepared || !note || !ensureActive()) return;
    const url = URL.createObjectURL(new Blob([note], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'challansakshi-reply-review.txt';
    anchor.click(); URL.revokeObjectURL(url);
  };
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="Reply review" serviceHindi="उत्तर समीक्षा" onQuickExit={() => { clear(); window.location.replace('/'); }}>
    <main id="main-content" className={styles.main} tabIndex={-1}>
      <fieldset disabled={!clientReady} className={local.workspace} aria-label={t("Reply review", "उत्तर समीक्षा")} >
        <header className={local.intro}>
          <span className={styles.eyebrow}>{t('After a reply arrives', 'उत्तर मिलने के बाद')}</span>
          <h1>{t('Did the reply address your points?', 'क्या आपके बिंदुओं का उत्तर मिला?')}</h1>
          <p>{t('Match the points you raised to exact passages in the reply. You decide what is addressed or unclear, then prepare a focused follow-up.', 'उठाए गए बिंदुओं को उत्तर के सटीक अंशों से जोड़ें। आप तय करें कि क्या स्पष्ट हुआ और कहाँ स्पष्टीकरण चाहिए, फिर अगला नोट तैयार करें।')}</p>
          <p className={local.hint}>{t('Text stays on this page. Nothing is submitted or saved automatically. Exit or 10 minutes of inactivity clears it. Keep the complete original reply and attachments for context.', 'पाठ इसी पेज में रहता है। कुछ भी स्वतः भेजा या सहेजा नहीं जाता। बाहर जाने या 10 मिनट निष्क्रिय रहने पर साफ़ हो जाता है। संदर्भ के लिए पूरा मूल उत्तर और संलग्नक रखें।')}</p>
        </header>
        <div className={local.stack}>
          <section className={styles.panel} aria-labelledby="reply-source-title">
            <h2 id="reply-source-title" className={styles.decisionHeading}>{t('1. Add the reply you received', '1. मिला उत्तर जोड़ें')}</h2>
            <div className={local.stack}>
              <div className={local.field}>
                <label htmlFor="reply-source-label">{t('Source label (optional)', 'स्रोत का नाम (वैकल्पिक)')}</label>
                <input id="reply-source-label" maxLength={160} autoComplete="off" value={sourceLabel} onChange={event => { setSourceLabel(event.target.value); setPrepared(false); }} placeholder={t('For example: reply dated 4 September, page 1', 'उदाहरण: 4 सितंबर का उत्तर, पृष्ठ 1')} />
              </div>
              <div className={local.field}>
                <label htmlFor="reply-body">{t('Paste the reply text', 'उत्तर का पाठ पेस्ट करें')}</label>
                <textarea ref={replyRef} id="reply-body" rows={8} maxLength={12000} autoComplete="off" spellCheck={false} value={reply} onChange={event => changeReply(event.target.value)} onSelect={captureSelection} onKeyUp={captureSelection} onMouseUp={captureSelection} aria-describedby="reply-select-help" />
                <p id="reply-select-help" className={local.hint}>{t('To link evidence, select the relevant words here, then use “Link selected passage” under a point. Keyboard: hold Shift and use the arrow keys. You can return here for another selection.', 'साक्ष्य जोड़ने के लिए यहाँ संबंधित शब्द चुनें, फिर बिंदु के नीचे “चुना अंश जोड़ें” दबाएँ। कीबोर्ड: Shift दबाकर ऐरो कुंजियाँ उपयोग करें। दूसरे अंश के लिए यहाँ लौटें।')}</p>
                <p className={local.hint}>{reply.length}/12000</p>
              </div>
            </div>
          </section>
          <section className={styles.panel} aria-labelledby="reply-points-title">
            <h2 id="reply-points-title" className={styles.decisionHeading}>{t('2. Review up to five points', '2. अधिकतम पाँच बिंदु जाँचें')}</h2>
            <p className={styles.stepIntro}>{t('Use the questions or issues you actually raised. “Not found” means only that you did not find an answer in the supplied text; it does not prove a failure by the authority.', 'वही प्रश्न या मुद्दे लिखें जो आपने उठाए थे। “नहीं मिला” का अर्थ केवल इतना है कि दिए पाठ में आपको उत्तर नहीं मिला; यह प्राधिकरण की गलती का प्रमाण नहीं है।')}</p>
            <div className={local.stack}>
              {points.map((point, index) => <fieldset key={point.id} className={local.point}>
                <legend>{t(`Point ${index + 1}`, `बिंदु ${index + 1}`)}</legend>
                <div className={local.field}>
                  <label htmlFor={`reply-point-${point.id}`}>{t('What did you raise?', 'आपने क्या मुद्दा उठाया?')}</label>
                  <textarea id={`reply-point-${point.id}`} rows={2} maxLength={500} autoComplete="off" value={point.question} onChange={event => updatePoint(point.id, { question: event.target.value, status: 'unreviewed', passage: undefined })} />
                </div>
                <button type="button" className={styles.buttonSecondary} disabled={!selection || !point.question.trim()} onClick={() => { if (selection && reply.slice(selection.start, selection.end) === selection.text) updatePoint(point.id, { passage: selection, status: 'unreviewed' }); }}>{t(`Link selected passage to point ${index + 1}`, `चुना अंश बिंदु ${index + 1} से जोड़ें`)}</button>
                {point.passage && <div><blockquote className={local.quote}>{point.passage.text}</blockquote><p className={local.hint}>{t(`Reply text, characters ${point.passage.start + 1}–${point.passage.end}`, `उत्तर पाठ, अक्षर ${point.passage.start + 1}–${point.passage.end}`)}</p><button className={styles.buttonQuiet} type="button" onClick={() => updatePoint(point.id, { passage: undefined, status: 'unreviewed' })}>{t('Remove linked passage', 'जुड़ा अंश हटाएँ')}</button></div>}
                <div className={local.field}>
                  <label htmlFor={`reply-status-${point.id}`}>{t('My reading of this point', 'इस बिंदु पर मेरी समीक्षा')}</label>
                  <select id={`reply-status-${point.id}`} value={point.status} onChange={event => { const status = event.target.value as ReplyStatus; updatePoint(point.id, { status, ...(status === 'not-found' ? { passage: undefined } : {}) }); }}>
                    <option value="unreviewed">{t('Choose after reviewing', 'समीक्षा के बाद चुनें')}</option>
                    <option value="addressed" disabled={!point.passage}>{t('Addressed — passage linked', 'उत्तर मिला — अंश जुड़ा है')}</option>
                    <option value="unclear">{t('Unclear — needs clarification', 'अस्पष्ट — स्पष्टीकरण चाहिए')}</option>
                    <option value="not-found">{t('I did not find a response', 'मुझे उत्तर नहीं मिला')}</option>
                  </select>
                </div>
                {points.length > 1 && <button type="button" className={styles.buttonQuiet} onClick={() => { setPrepared(false); setPoints(current => current.filter(item => item.id !== point.id)); }}>{t(`Remove point ${index + 1}`, `बिंदु ${index + 1} हटाएँ`)}</button>}
              </fieldset>)}
            </div>
            <div className={styles.actions}>
              {points.length < 5 && <button type="button" className={styles.buttonSecondary} onClick={() => { setPrepared(false); setPoints(current => [...current, { id: String(nextId.current++), question: '', status: 'unreviewed' }]); }}>{t('Add another point', 'एक और बिंदु जोड़ें')}</button>}
              <button type="button" className={styles.button} disabled={!note} onClick={() => setPrepared(true)}>{t('Prepare my follow-up note', 'मेरा अगला नोट तैयार करें')}</button>
            </div>
            {!note && <p className={styles.fieldHint}>{t('Add a reply, then review every point. An addressed point needs an exact linked passage.', 'उत्तर जोड़ें, फिर हर बिंदु जाँचें। उत्तर मिले बिंदु के साथ सटीक अंश जोड़ना ज़रूरी है।')}</p>}
          </section>
          <div aria-live="polite">
            {prepared && note && <section className={styles.panel} aria-labelledby="reply-note-title">
              <h2 id="reply-note-title" className={styles.decisionHeading}>{t('3. Check your follow-up note', '3. अपना अगला नोट जाँचें')}</h2>
              <pre className={local.note} data-reply-note>{note}</pre>
              <fieldset className={local.device}>
                <legend>{t('Before saving a copy', 'प्रति सहेजने से पहले')}</legend>
                <div className={styles.summaryActions}>
                  <button type="button" className={`${styles.buttonSecondary} ${!privateDevice ? local.selected : ''}`} aria-pressed={!privateDevice} onClick={() => setPrivateDevice(false)}>{t('Shared device', 'साझा डिवाइस')}</button>
                  <button type="button" className={`${styles.buttonSecondary} ${privateDevice ? local.selected : ''}`} aria-pressed={privateDevice} onClick={() => setPrivateDevice(true)}>{t('My private device', 'मेरा निजी डिवाइस')}</button>
                </div>
                <p className={styles.fieldHint}>{t('A download may contain personal information and remains on your device after this page is cleared.', 'डाउनलोड में निजी जानकारी हो सकती है और पेज साफ़ करने के बाद भी यह डिवाइस पर रहेगा।')}</p>
                {privateDevice && <button type="button" data-reply-download className={styles.button} onClick={download}>{t('Download my note', 'मेरा नोट डाउनलोड करें')}</button>}
                <PrivateNotePrintButton note={note} language={language} privateDevice={privateDevice} onAuthorize={ensureActive} className={styles.buttonSecondary} />
                {privateDevice && <p className={styles.fieldHint}>{t('Your browser opens printing options; choose Save as PDF if available. Printed and saved copies remain after this page is cleared.', 'ब्राउज़र में प्रिंट विकल्प खुलेंगे; उपलब्ध हो तो PDF के रूप में सहेजें चुनें। प्रिंट और सहेजी प्रतियाँ पेज साफ़ होने के बाद भी रहती हैं।')}</p>}
              </fieldset>
              <p className={styles.fieldHint}>{t('Review and edit the downloaded text before using it through your existing official case channel. Check any deadline on the original notice. Nothing has been sent.', 'डाउनलोड का उपयोग अपने मौजूदा आधिकारिक केस चैनल पर करने से पहले जाँचें और संपादित करें। समय-सीमा मूल नोटिस पर देखें। कुछ भेजा नहीं गया है।')}</p>
            </section>}
          </div>
          <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={clear}>{t('Clear all text', 'सभी पाठ साफ़ करें')}</button><a className={styles.buttonQuiet} href="/review">{t('Review a challan', 'चालान की समीक्षा करें')}</a></div>
        </div>
      </fieldset>
    </main>
  </PublicBetaShell>;
}
