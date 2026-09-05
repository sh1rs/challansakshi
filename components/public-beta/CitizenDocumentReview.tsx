'use client';
/* eslint-disable @next/next/no-img-element -- Memory-only previews must not pass through an image proxy. */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { FileText, ScanLine, ShieldCheck, ArrowUpRight, Download, ChevronRight } from 'lucide-react';
import { buildDocumentEvidenceNote, correctDocumentField, extractDocumentEvidence, type DocumentEvidence, type DocumentField, type DocumentReading } from '../../lib/document-evidence';
import { readLocalDocument } from '../../lib/local-document-reader';
import { getOfficialRouteFreshnessDelayMs, resolveCurrentOfficialAuxiliaryRoute } from '../../lib/official-destinations';
import { startSharedDeviceInactivityGuard } from '../../lib/shared-device-inactivity';
import { PublicBetaShell } from './PublicBetaShell';
import { useClientReady } from '../shared/useClientReady';
import styles from './CitizenDocumentReview.module.css';

type Language = 'en' | 'hi';
type Role = 'notice' | 'vehicle-record';
type Slot = { sourceId: string; previewUrl: string; pdf: boolean; reading?: DocumentReading; error?: string; busy: boolean };
const roles: Role[] = ['notice', 'vehicle-record'];
const t = (language: Language, en: string, hi: string) => language === 'hi' ? hi : en;
function fieldLabel(key: DocumentField['key'], language: Language) {
  const labels = { registration: ['Registration', 'पंजीकरण'], 'notice-number': ['Challan number', 'चालान संख्या'], date: ['Event date', 'घटना की तारीख'], amount: ['Amount', 'राशि'], offence: ['Recorded offence', 'दर्ज अपराध'], location: ['Location', 'स्थान'] };
  return labels[key][language === 'hi' ? 1 : 0];
}

export default function CitizenDocumentReview({ initialNowIso = new Date().toISOString() }: { initialNowIso?: string }) {
  const clientReady = useClientReady();
  const [language, setLanguage] = useState<Language>('en');
  const [slots, setSlots] = useState<Partial<Record<Role, Slot>>>({});
  const [evidence, setEvidence] = useState<DocumentEvidence>({ fields: [], comparison: 'inconclusive', limitations: [] });
  const [prepared, setPrepared] = useState(false);
  const [device, setDevice] = useState<'unknown' | 'private' | 'shared'>('unknown');
  const [editing, setEditing] = useState<string | null>(null);
  const [correction, setCorrection] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(initialNowIso);
  const selections = useRef<Partial<Record<Role, Slot>>>({});
  const controllers = useRef<Partial<Record<Role, AbortController>>>({});
  const corrections = useRef<Record<string, string>>({});
  const inputs = useRef<Partial<Record<Role, HTMLInputElement | null>>>({});
  const heading = useRef<HTMLHeadingElement>(null);

  const release = (role: Role) => {
    controllers.current[role]?.abort();
    delete controllers.current[role];
    const previous = selections.current[role];
    if (previous) {
      URL.revokeObjectURL(previous.previewUrl);
      for (const id of Object.keys(corrections.current)) if (id.startsWith(`${previous.sourceId}:`)) delete corrections.current[id];
    }
    delete selections.current[role];
  };
  const clear = () => {
    roles.forEach(release); corrections.current = {};
    setSlots({}); setEvidence({ fields: [], comparison: 'inconclusive', limitations: [] });
    setPrepared(false); setEditing(null); setCorrection(''); setDevice('unknown'); setError('');
  };
  const quickExit = () => { clear(); window.location.replace('/'); };
  useEffect(() => {
    const onHide = () => {
      roles.forEach(role => { controllers.current[role]?.abort(); const slot = selections.current[role]; if (slot) URL.revokeObjectURL(slot.previewUrl); });
      controllers.current = {}; selections.current = {}; corrections.current = {};
      setSlots({}); setEvidence({ fields: [], comparison: 'inconclusive', limitations: [] });
      setPrepared(false); setEditing(null); setCorrection(''); setDevice('unknown'); setError('');
    };
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); roles.forEach(role => { controllers.current[role]?.abort(); const slot = selections.current[role]; if (slot) URL.revokeObjectURL(slot.previewUrl); }); };
  }, []);
  useEffect(() => {
    const update = () => setNow(new Date().toISOString());
    const timer = window.setTimeout(update, Math.min(60_000, getOfficialRouteFreshnessDelayMs(prepared ? 'national-services-directory' : 'national-record-lookup', now) ?? 60_000));
    window.addEventListener('focus', update);
    return () => { clearTimeout(timer); window.removeEventListener('focus', update); };
  }, [now, prepared]);
  useEffect(() => {
    const guard = startSharedDeviceInactivityGuard({ windowTarget: window, documentTarget: document, isVisible: () => document.visibilityState === 'visible', onExpire: () => { roles.forEach(role => { controllers.current[role]?.abort(); const slot = selections.current[role]; if (slot) URL.revokeObjectURL(slot.previewUrl); }); window.location.replace('/'); } });
    return () => guard.stop();
  }, []);
  const publish = () => {
    setSlots({ ...selections.current });
    let next = extractDocumentEvidence(roles.flatMap(role => selections.current[role]?.reading ? [selections.current[role]!.reading!] : []));
    for (const [id, value] of Object.entries(corrections.current)) {
      if (next.fields.some(field => field.id === id)) next = correctDocumentField(next, id, value);
    }
    setEvidence(next);
    setPrepared(false); setEditing(null); setCorrection(''); setError('');
  };
  const remove = (role: Role) => { heading.current?.focus({ preventScroll: true }); release(role); publish(); };
  const select = async (event: ChangeEvent<HTMLInputElement>, role: Role) => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!file) return;
    // One expensive reader at a time keeps memory bounded on small phones.
    if (roles.some(other => other !== role && selections.current[other]?.busy)) return;
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 12 * 1024 * 1024) {
      setError(t(language, 'Choose a PDF, PNG, JPEG or WebP up to 12 MiB.', '12 MiB तक का PDF, PNG, JPEG या WebP चुनें।')); return;
    }
    release(role);
    const controller = new AbortController(); controllers.current[role] = controller;
    const sourceId = crypto.randomUUID();
    selections.current[role] = { sourceId, previewUrl: URL.createObjectURL(file), pdf: file.type === 'application/pdf', busy: true };
    publish();
    try {
      // Both scripts are available regardless of the language used for the interface.
      const reading = await readLocalDocument(file, { sourceId, role, language: 'hi', signal: controller.signal, onProgress: () => undefined });
      if (controller.signal.aborted || selections.current[role]?.sourceId !== sourceId) return;
      selections.current[role] = { ...selections.current[role]!, reading, busy: false }; publish();
    } catch {
      if (controller.signal.aborted || selections.current[role]?.sourceId !== sourceId) return;
      selections.current[role] = { ...selections.current[role]!, busy: false, error: t(language, 'Could not read this file. Try a clearer image or use manual review.', 'फ़ाइल पढ़ी नहीं जा सकी। साफ़ तस्वीर या मैन्युअल समीक्षा आज़माएँ।') }; publish();
    }
  };
  const busy = roles.some(role => slots[role]?.busy);
  const hasRead = roles.some(role => slots[role]?.reading);
  const currentRoute = resolveCurrentOfficialAuxiliaryRoute(prepared ? 'national-services-directory' : 'national-record-lookup', now);
  const official = currentRoute.status === 'current' ? currentRoute.route : null;
  const openOfficial = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const fresh = resolveCurrentOfficialAuxiliaryRoute(prepared ? 'national-services-directory' : 'national-record-lookup', new Date().toISOString());
    if (fresh.status !== 'current' || fresh.route.canonicalUrl !== official?.canonicalUrl) { event.preventDefault(); setNow(new Date().toISOString()); }
  };
  const applyCorrection = () => {
    if (!editing) return;
    try { setEvidence(correctDocumentField(evidence, editing, correction)); corrections.current[editing] = correction; setEditing(null); setCorrection(''); setPrepared(false); setError(''); }
    catch { setError(t(language, 'Use the value shown in the source. The format could not be read.', 'स्रोत में दिखा मान उपयोग करें। प्रारूप पढ़ा नहीं जा सका।')); }
  };
  const note = buildDocumentEvidenceNote(evidence, language);
  const download = () => {
    if (!prepared || device !== 'private' || busy || editing) return;
    const url = URL.createObjectURL(new Blob([note], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'challansakshi-document-review.txt'; anchor.click(); URL.revokeObjectURL(url);
  };
  const title = prepared ? t(language, 'Your next step, prepared', 'आपका अगला कदम तैयार है') : t(language, 'Start with your challan', 'अपने चालान से शुरू करें');
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="चालान साक्षी" onQuickExit={quickExit} preserveScroll>
    <main className={styles.main} inert={!clientReady} data-document-review data-document-has-reading={hasRead} data-document-stage={prepared ? 'prepared' : 'read'} data-document-device={device}>
      <p className={styles.printWarning}>{t(language, 'Document printing is off. Use the review on this device.', 'दस्तावेज़ प्रिंट बंद है। इसी डिवाइस पर समीक्षा देखें।')}</p>
      {prepared && device === 'private' && <pre className={styles.printNote}>{note}</pre>}
      <div className={styles.kicker}><ScanLine size={18} aria-hidden="true" />{t(language, 'Read · Check · Prepare', 'पढ़ें · जाँचें · तैयार करें')}</div>
      <h1 ref={heading} tabIndex={-1}>{title}</h1>
      <p className={styles.intro}>{prepared ? t(language, 'Keep your records together and continue through the official service.', 'रिकॉर्ड साथ रखें और आधिकारिक सेवा से आगे बढ़ें।') : t(language, 'Add a PDF or image. We’ll read the details; you check only what needs attention.', 'PDF या तस्वीर जोड़ें। हम विवरण पढ़ेंगे; आप केवल ज़रूरी सुधार जाँचें।')}</p>
      {!prepared && <>
        <section className={styles.intake} aria-label={t(language, 'Your documents', 'आपके दस्तावेज़')}>
          {roles.map(role => <div className={styles.fileRow} key={role}>
            <FileText size={23} aria-hidden="true" className={role === 'notice' ? styles.teal : styles.amber} />
            <div className={styles.fileCopy}><strong>{role === 'notice' ? t(language, 'Challan copy', 'चालान की कॉपी') : t(language, 'Vehicle record', 'वाहन रिकॉर्ड')}</strong><small>{role === 'notice' ? t(language, 'PDF, screenshot or photograph', 'PDF, स्क्रीनशॉट या तस्वीर') : t(language, 'Optional · RC to compare registration', 'वैकल्पिक · पंजीकरण मिलाने के लिए RC')}</small></div>
            <input ref={node => { inputs.current[role] = node; }} data-document-role={role} disabled={!clientReady || (busy && !slots[role]?.busy)} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" aria-label={role === 'notice' ? t(language, 'Choose challan', 'चालान चुनें') : t(language, 'Choose vehicle record', 'वाहन रिकॉर्ड चुनें')} className={styles.fileInput} tabIndex={-1} onChange={event => { void select(event, role); }} />
            <button className={role === 'notice' && !slots[role] ? styles.primary : styles.secondary} type="button" disabled={!clientReady || (busy && !slots[role]?.busy)} onClick={() => inputs.current[role]?.click()}>{slots[role] ? t(language, 'Replace', 'बदलें') : t(language, 'Choose', 'चुनें')}</button>
            {slots[role] && <div className={styles.fileStatus}>
              <span role="status">{slots[role]!.busy ? t(language, 'Reading on this device… First use downloads the reader. You can cancel below.', 'इसी डिवाइस पर पढ़ रहे हैं… पहली बार रीडर डाउनलोड होगा। नीचे रद्द कर सकते हैं।') : slots[role]!.error ?? t(language, 'Read on this device', 'इसी डिवाइस पर पढ़ा गया')}</span>
              <button type="button" className={styles.textButton} onClick={() => remove(role)}>{role === 'notice' ? t(language, 'Remove challan', 'चालान हटाएँ') : t(language, 'Remove vehicle record', 'वाहन रिकॉर्ड हटाएँ')}</button>
            </div>}
          </div>)}
        </section>
        <div className={styles.localState}><ShieldCheck size={18} aria-hidden="true" /><span>{t(language, 'On-device reading · no upload', 'डिवाइस पर पढ़ना · कोई अपलोड नहीं')}</span></div>
      </>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!prepared && hasRead && !busy && <section className={styles.result} aria-labelledby="document-result-title">
        <div className={styles.resultHeader}><span className={styles.eyebrow}>{t(language, 'What we read', 'हमने क्या पढ़ा')}</span><h2 id="document-result-title">{evidence.comparison === 'different' ? t(language, 'The registrations differ', 'पंजीकरण अलग हैं') : evidence.comparison === 'match' ? t(language, 'The registrations match', 'पंजीकरण मेल खाते हैं') : evidence.fields.length ? t(language, 'Your document details', 'आपके दस्तावेज़ का विवरण') : t(language, 'We need a clearer reading', 'हमें और स्पष्ट जानकारी चाहिए')}</h2></div>
        <p>{evidence.comparison === 'different' ? t(language, 'The number read from the challan differs from your vehicle record. Check both readings before using the note.', 'चालान से पढ़ा नंबर वाहन रिकॉर्ड से अलग है। नोट उपयोग करने से पहले दोनों जाँचें।') : evidence.comparison === 'match' ? t(language, 'Only the registration was compared. This does not confirm the photo, offence or validity of the challan.', 'केवल पंजीकरण की तुलना हुई। इससे तस्वीर, अपराध या चालान की वैधता की पुष्टि नहीं होती।') : t(language, 'Add a readable vehicle record for comparison. Unclear readings stay uncertain.', 'तुलना के लिए पढ़ने योग्य वाहन रिकॉर्ड जोड़ें। अस्पष्ट जानकारी अनिश्चित रहेगी।')}</p>
        {evidence.fields.length > 0 && <div className={styles.fields}>{evidence.fields.map(field => <div className={styles.field} key={field.id}>
          <div><span>{fieldLabel(field.key, language)}</span><strong>{field.value}</strong><small>{field.role === 'notice' ? t(language, 'Challan', 'चालान') : t(language, 'Vehicle record', 'वाहन रिकॉर्ड')} · {t(language, 'page', 'पृष्ठ')} {field.page} · {field.method === 'pdf-text' ? t(language, 'PDF text', 'PDF पाठ') : field.method === 'citizen-correction' ? t(language, 'Your correction', 'आपका सुधार') : t(language, 'On-device OCR', 'डिवाइस OCR')}{field.confidence === 'needs-review' ? t(language, ' · check this reading', ' · इसे जाँचें') : ''}</small></div>
          <button type="button" className={styles.textButton} aria-label={`${t(language, 'Correct', 'सुधारें')}: ${fieldLabel(field.key, language)} ${field.role}`} onClick={() => { setEditing(field.id); setCorrection(field.value); setPrepared(false); }}>{t(language, 'Correct', 'सुधारें')}</button>
          {editing === field.id && <div className={styles.correction}><label htmlFor="document-correction">{t(language, 'Value shown in this source', 'इस स्रोत में दिखा मान')}</label><input id="document-correction" value={correction} maxLength={120} autoComplete="off" spellCheck={false} onChange={event => setCorrection(event.target.value)} /><button type="button" className={styles.secondary} onClick={applyCorrection}>{t(language, 'Save correction', 'सुधार सहेजें')}</button><button type="button" className={styles.textButton} onClick={() => { setEditing(null); setCorrection(''); setError(''); }}>{t(language, 'Cancel', 'रद्द करें')}</button></div>}
        </div>)}</div>}
        {evidence.limitations.length > 0 && <p className={styles.attention}>{t(language, 'Part of this evidence needs checking. Only readable, unambiguous fields are compared. Open the source below or use manual review for the rest.', 'इस साक्ष्य के कुछ हिस्से जाँचने हैं। केवल स्पष्ट, पढ़ने योग्य जानकारी की तुलना हुई। नीचे स्रोत देखें या बाकी के लिए मैन्युअल समीक्षा करें।')}</p>}
        <details className={styles.sources}><summary>{t(language, 'See the source documents', 'स्रोत दस्तावेज़ देखें')}</summary>{roles.map(role => slots[role]?.reading && <div key={role}><h3>{role === 'notice' ? t(language, 'Challan source', 'चालान स्रोत') : t(language, 'Vehicle-record source', 'वाहन रिकॉर्ड स्रोत')}</h3>{slots[role]!.pdf ? <p><a href={slots[role]!.previewUrl} target="_blank" rel="noopener noreferrer">{t(language, 'Open PDF on this device', 'इसी डिवाइस पर PDF खोलें')}</a><small>{t(language, 'Close that separate tab yourself after checking.', 'जाँच के बाद अलग टैब स्वयं बंद करें।')}</small></p> :   <img src={slots[role]!.previewUrl} alt={role === 'notice' ? t(language, 'Selected challan source', 'चुना चालान स्रोत') : t(language, 'Selected vehicle record source', 'चुना वाहन रिकॉर्ड स्रोत')} />}</div>)}</details>
        {evidence.fields.length > 0 && <><p className={styles.confirmHelp}>{t(language, 'Confirm these are the right records, you have permission to use them, and you checked the readings.', 'पुष्टि करें कि ये सही रिकॉर्ड हैं, आपको इन्हें उपयोग करने की अनुमति है और आपने विवरण जाँचे हैं।')}</p><button type="button" className={styles.primary} disabled={editing !== null} onClick={() => { heading.current?.focus({ preventScroll: true }); setPrepared(true); }}>{t(language, 'I checked these readings — prepare my note', 'मैंने विवरण जाँचे — मेरा नोट तैयार करें')}<ChevronRight size={19} aria-hidden="true" /></button></>}
      </section>}
      {prepared && <section className={styles.prepared}>
        <div className={styles.nextStep}><span className={styles.eyebrow}>{t(language, 'Do this next', 'अब यह करें')}</span><h2>{evidence.comparison === 'different' ? t(language, 'Ask for a record check', 'रिकॉर्ड की जाँच का अनुरोध करें') : t(language, 'Check the official record', 'आधिकारिक रिकॉर्ड जाँचें')}</h2><p>{t(language, 'Take the note and original documents to the appropriate service. You review the form and choose any submission there.', 'नोट और मूल दस्तावेज़ उपयुक्त सेवा पर साथ रखें। फ़ॉर्म और जमा करने का निर्णय वहाँ आप करेंगे।')}</p>{official && <a className={styles.primary} href={official.canonicalUrl} onClick={openOfficial} onAuxClick={openOfficial} target="_blank" rel="noopener noreferrer">{t(language, 'Open the official service', 'आधिकारिक सेवा खोलें')}<ArrowUpRight size={19} aria-hidden="true" /></a>}</div>
        <details open className={styles.sources}><summary>{t(language, 'Your prepared review note', 'आपका तैयार समीक्षा नोट')}</summary><pre data-document-note>{note}</pre></details>
        <fieldset className={styles.device}><legend>{t(language, 'Where are you using this?', 'आप यह कहाँ उपयोग कर रहे हैं?')}</legend><button type="button" className={styles.secondary} aria-pressed={device === 'private'} onClick={() => setDevice('private')}>{t(language, 'My private device', 'मेरा निजी डिवाइस')}</button><button type="button" className={styles.secondary} aria-pressed={device === 'shared'} onClick={() => setDevice('shared')}>{t(language, 'Shared device', 'साझा डिवाइस')}</button></fieldset>
        {device === 'private' && <><button data-document-download type="button" className={styles.primary} onClick={download}><Download size={19} aria-hidden="true" />{t(language, 'Save review note', 'समीक्षा नोट सहेजें')}</button><small>{t(language, 'The saved file contains these extracted identifiers. Quick exit cannot delete downloaded copies.', 'सहेजी फ़ाइल में ये पहचाने गए नंबर होंगे। तुरंत बाहर निकलने से डाउनलोड की गई कॉपी नहीं मिटती।')}</small></>}
        {device === 'shared' && <p>{t(language, 'Read the note here. Saving is off on shared devices; use Exit when finished.', 'नोट यहीं पढ़ें। साझा डिवाइस पर सहेजना बंद है; काम पूरा होने पर बाहर निकलें।')}</p>}
        <button type="button" className={styles.secondary} onClick={() => { heading.current?.focus({ preventScroll: true }); setPrepared(false); }}>{t(language, 'Review documents', 'दस्तावेज़ जाँचें')}</button>
      </section>}
      <div className={styles.alternatives}>
        {!hasRead && official && <a href={official.canonicalUrl} target="_blank" rel="noopener noreferrer" onClick={openOfficial} onAuxClick={openOfficial}>{t(language, 'Need your challan? Open the official record', 'चालान चाहिए? आधिकारिक रिकॉर्ड खोलें')}<ArrowUpRight size={17} aria-hidden="true" /></a>}
        <a href="/manual/challan">{t(language, 'No usable documents? Review manually', 'दस्तावेज़ नहीं हैं? मैन्युअल समीक्षा करें')}<ChevronRight size={17} aria-hidden="true" /></a>
        <details><summary>{t(language, 'What can this reader check?', 'यह रीडर क्या जाँच सकता है?')}</summary><p>{t(language, 'Labelled registration, challan number, event date, amount, offence and location. Up to three pages per document. Local OCR reads text, not vehicle type or whether an offence happened. It does not verify government origin or calculate a legal deadline.', 'पंजीकरण, चालान संख्या, घटना की तारीख, राशि, अपराध और स्थान के लेबल। हर दस्तावेज़ के अधिकतम तीन पृष्ठ। स्थानीय OCR पाठ पढ़ता है; वाहन प्रकार या अपराध होने का निर्णय नहीं करता। यह सरकारी उत्पत्ति या कानूनी समय सीमा सत्यापित नहीं करता।')}</p><p>{t(language, 'Cloud vision is not available on this deployment. No selected document is sent to an AI provider.', 'इस डिप्लॉयमेंट पर क्लाउड विज़न उपलब्ध नहीं है। चुना दस्तावेज़ AI प्रदाता को नहीं भेजा जाता।')}</p></details>
      </div>
    </main>
  </PublicBetaShell>;
}
