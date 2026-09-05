'use client';
/* eslint-disable @next/next/no-img-element -- Selected image previews remain on this device. */
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ImagePlus, ScanLine } from 'lucide-react';
import { boundPhotoRegion, comparePhotoRegistration, measurePhotoSharpness, readPhotoDimensions, photoPointFromClient, photoRegionBetweenPoints, type PhotoObservation, type PhotoOrigin, type PhotoReference, type PhotoRegion, type PhotoPoint } from '../../lib/evidence-photo-tools';
import styles from './EvidencePhotoWorkspace.module.css';

type Source = { id: string; url: string; bitmap: ImageBitmap; width: number; height: number; fingerprint?: string };
type Drag = { pointerId: number; sourceId: string; start: PhotoPoint; clientX: number; clientY: number; previous: PhotoRegion; target: HTMLDivElement };
type Props = { language: 'en' | 'hi'; reference: PhotoReference | null; onChange: (observation: PhotoObservation | null) => void };
export default function EvidencePhotoWorkspace({ language, reference, onChange }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [source, setSource] = useState<Source | null>(null);
  const [region, setRegion] = useState<PhotoRegion>({ x: 0, y: 0, width: 1, height: 1 });
  const [origin, setOrigin] = useState<PhotoOrigin>('unknown');
  const [reading, setReading] = useState('');
  const [confirmed, setConfirmed] = useState<PhotoObservation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [measurement, setMeasurement] = useState<{ value: number; width: number; height: number } | null>(null);
  const selected = useRef<Source | null>(null);
  const drag = useRef<Drag | null>(null);
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const cropCanvas = useRef<HTMLCanvasElement>(null);
  const summary = useRef<HTMLElement>(null);
  const referenceKey = reference ? `${reference.sourceId}:${reference.page}:${reference.value}:${reference.fingerprint ?? ''}` : '';
  const previousReference = useRef(referenceKey);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (previousReference.current === referenceKey) return;
    previousReference.current = referenceKey;
    setConfirmed(null); onChangeRef.current(null);
  }, [referenceKey]);
  useEffect(() => {
    const dispose = () => {
      generation.current++;
      const pending = drag.current; drag.current = null;
      if (pending?.target.hasPointerCapture(pending.pointerId)) pending.target.releasePointerCapture(pending.pointerId);
      if (selected.current) { selected.current.bitmap.close(); URL.revokeObjectURL(selected.current.url); selected.current = null; }
    };
    const hide = () => { dispose(); setSelecting(false); setSource(null); setReading(''); setConfirmed(null); setLoading(false); setMeasurement(null); };
    window.addEventListener('pagehide', hide);
    return () => { window.removeEventListener('pagehide', hide); dispose(); };
  }, []);
  useEffect(() => {
    const canvas = cropCanvas.current;
    if (!source || !canvas) return;
    const frame = requestAnimationFrame(() => {
    let sample: HTMLCanvasElement | null = null;
    try {
      const scale = Math.min(1, 720 / Math.max(region.width, region.height));
      canvas.width = Math.max(1, Math.round(region.width * scale)); canvas.height = Math.max(1, Math.round(region.height * scale));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(source.bitmap, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);
      const sampleScale = Math.min(1, 384 / Math.max(region.width, region.height));
      const width = Math.floor(region.width * sampleScale); const height = Math.floor(region.height * sampleScale);
      if (width < 3 || height < 3) { setMeasurement(null); return; }
      sample = document.createElement('canvas'); sample.width = width; sample.height = height;
      const sampleContext = sample.getContext('2d', { willReadFrequently: true, alpha: false });
      if (!sampleContext) throw new Error('Canvas unavailable');
      sampleContext.drawImage(source.bitmap, region.x, region.y, region.width, region.height, 0, 0, width, height);
      const measured = measurePhotoSharpness(sampleContext.getImageData(0, 0, width, height).data, width, height);
      setMeasurement({ value: measured.laplacianVariance, width, height });
    } catch { setMeasurement(null); }
    finally { if (sample) { sample.width = 0; sample.height = 0; } }
    });
    return () => cancelAnimationFrame(frame);
  }, [source, region]);
  const invalidate = () => { setConfirmed(null); onChange(null); };
  const stopSelection = (restore: boolean) => {
    const pending = drag.current; drag.current = null; setSelecting(false);
    if (pending && restore && selected.current?.id === pending.sourceId) setRegion(pending.previous);
    if (pending?.target.hasPointerCapture(pending.pointerId)) pending.target.releasePointerCapture(pending.pointerId);
  };
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selecting || !source || drag.current || event.button !== 0 || !event.isPrimary) return;
    const start = photoPointFromClient(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), source.width, source.height);
    if (!start) return;
    event.preventDefault(); event.currentTarget.parentElement?.focus({ preventScroll: true });
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { return; }
    drag.current = { pointerId: event.pointerId, sourceId: source.id, start, clientX: event.clientX, clientY: event.clientY, previous: { ...region }, target: event.currentTarget };
    invalidate();
  };
  const dragRegion = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pending = drag.current;
    if (!pending || !source || pending.pointerId !== event.pointerId || pending.sourceId !== selected.current?.id) return null;
    // A tap or a nearly straight gesture keeps the existing crop.
    if (Math.abs(event.clientX - pending.clientX) < 3 || Math.abs(event.clientY - pending.clientY) < 3) return null;
    const end = photoPointFromClient(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), source.width, source.height);
    return end ? photoRegionBetweenPoints(pending.start, end, source.width, source.height) : null;
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    event.preventDefault(); const next = dragRegion(event);
    if (next) setRegion(next);
  };
  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    event.preventDefault(); const next = dragRegion(event);
    if (next) setRegion(next);
    stopSelection(!next);
  };
  const clear = () => {
    generation.current++;
    stopSelection(false);
    if (selected.current) { selected.current.bitmap.close(); URL.revokeObjectURL(selected.current.url); selected.current = null; }
    setSource(null); setReading(''); setOrigin('unknown'); setZoom(1); setLoading(false); setError(''); setMeasurement(null); invalidate();
  };
  const select = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!file) return;
    // Any attempted replacement requires a fresh confirmation, even if the new file is rejected.
    invalidate();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 12 * 1024 * 1024) {
      setError(t('Choose a JPEG, PNG or WebP up to 12 MiB. Any previous image is still shown; check it again before using a reading.', '12 MiB तक का JPEG, PNG या WebP चुनें। पिछली तस्वीर अभी दिख रही हो तो उसका पढ़ा नंबर उपयोग करने से पहले फिर जाँचें।')); return;
    }
    clear(); const request = generation.current; setLoading(true);
    const timeout = window.setTimeout(() => {
      if (request === generation.current) { generation.current++; setLoading(false); setError(t('Opening this image took too long. Try a smaller copy.', 'तस्वीर खुलने में बहुत समय लगा। छोटी कॉपी आज़माएँ।')); }
    }, 20_000);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (request !== generation.current) return;
      readPhotoDimensions(bytes, file.type);
      let fingerprint: string | undefined;
      if (crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      }
      if (request !== generation.current) return;
      const bitmap = await createImageBitmap(file);
      if (request !== generation.current) { bitmap.close(); return; }
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 12_000_000) { bitmap.close(); throw new Error('Image too large'); }
      const next = { id: crypto.randomUUID(), url: URL.createObjectURL(file), bitmap, width: bitmap.width, height: bitmap.height, fingerprint };
      selected.current = next; setSource(next); setRegion({ x: 0, y: 0, width: next.width, height: next.height });
    } catch {
      if (request === generation.current) setError(t('Could not open this image. Use a supported image with up to 12 million pixels, or continue with manual review.', 'तस्वीर नहीं खुली। 1.2 करोड़ पिक्सेल तक की समर्थित तस्वीर लें, या मैन्युअल समीक्षा करें।'));
    } finally { clearTimeout(timeout); if (request === generation.current) setLoading(false); }
  };
  const sameSource = Boolean(source?.fingerprint && reference?.fingerprint && source.fingerprint === reference.fingerprint);
  const independentReference = sameSource ? null : reference;
  const comparison = comparePhotoRegistration(confirmed?.reading ?? '', confirmed?.reference?.value ?? '');
  const readingSupported = comparePhotoRegistration(reading, reading).status === 'match';
  const confirm = (assessment: PhotoObservation['assessment']) => {
    if (!source || (assessment === 'readable' && (!readingSupported || origin === 'unknown'))) return;
    const observation: PhotoObservation = { sourceId: source.id, origin, originalWidth: source.width, originalHeight: source.height, region: { ...region }, assessment, reading: assessment === 'readable' ? reading.trim().toUpperCase() : '', reference: assessment === 'readable' ? independentReference : null };
    setConfirmed(observation); onChange(observation);
  };
  return <details className={styles.workspace} data-evidence-photo onKeyDown={event => { if (event.key === 'Escape' && selecting) { event.preventDefault(); stopSelection(true); } }}>
    <summary ref={summary}><ImagePlus size={19} aria-hidden="true" /><span>{t('Inspect an evidence photo', 'साक्ष्य तस्वीर जाँचें')}<small>{t('Optional · zoom, select an area and record what you see', 'वैकल्पिक · ज़ूम करें, क्षेत्र चुनें और अपना अवलोकन दर्ज करें')}</small></span></summary>
    <div className={styles.content}>
      <p>{t('Use the original attached image if available. Your supporting photo has a different role. Nothing is uploaded or saved automatically.', 'उपलब्ध हो तो मूल संलग्न तस्वीर लें। आपकी सहायक तस्वीर की भूमिका अलग है। कुछ भी अपलोड या अपने आप सहेजा नहीं जाता।')}</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label={t('Choose evidence photo', 'साक्ष्य तस्वीर चुनें')} className={styles.fileInput} data-photo-file onChange={event => { void select(event); }} tabIndex={-1} />
      <div className={styles.actions}><button type="button" onClick={() => input.current?.click()}>{source ? t('Replace photo', 'तस्वीर बदलें') : t('Choose photo', 'तस्वीर चुनें')}</button>{(source || loading) && <button type="button" onClick={() => { summary.current?.focus(); clear(); }}>{loading ? t('Cancel photo', 'तस्वीर रद्द करें') : t('Remove photo', 'तस्वीर हटाएँ')}</button>}</div>
      {loading && <p role="status">{t('Opening on this device…', 'इसी डिवाइस पर खोल रहे हैं…')}</p>}
      {error && <p role="alert" className={styles.attention}>{error}</p>}
      {source && <>
        <label className={styles.label} htmlFor="photo-origin">{t('Where is this image from?', 'यह तस्वीर कहाँ से है?')}</label>
        <select id="photo-origin" value={origin} onChange={event => { setOrigin(event.target.value as PhotoOrigin); invalidate(); }}>
          <option value="unknown">{t('I have not identified the source', 'मैंने स्रोत नहीं पहचाना है')}</option>
          <option value="official-attachment">{t('Attached to the official record', 'आधिकारिक रिकॉर्ड से संलग्न')}</option>
          <option value="own-supporting">{t('My own supporting image', 'मेरी सहायक तस्वीर')}</option>
        </select>
        <p className={styles.caption}>{t('The origin is your statement; this tool cannot verify it.', 'स्रोत आपके कथन पर है; यह टूल उसे सत्यापित नहीं करता।')}</p>
        <div className={styles.previewHeading}><strong>{t('Original image', 'मूल तस्वीर')}</strong><label>{t('Zoom', 'ज़ूम')}<select aria-label={t('Original image zoom', 'मूल तस्वीर ज़ूम')} value={zoom} onChange={event => { stopSelection(true); setZoom(Number(event.target.value)); }}><option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option></select></label></div>
        <div className={styles.selectTools}><button type="button" aria-pressed={selecting} onClick={() => selecting ? stopSelection(true) : setSelecting(true)}>{selecting ? t('Cancel selection', 'क्षेत्र चुनना रद्द करें') : t('Select an area', 'क्षेत्र चुनें')}</button><p role="status">{selecting ? t('Drag across the image to frame one plate. Release to finish; Esc cancels.', 'एक प्लेट चुनने के लिए तस्वीर पर उँगली या माउस खींचें। छोड़ने पर पूरा होगा; Esc से रद्द करें।') : t('Drag to select, or adjust the pixel values below. Zoomed images can be scrolled.', 'खींचकर चुनें या नीचे पिक्सेल मान बदलें। ज़ूम की तस्वीर स्क्रॉल कर सकते हैं।')}</p></div>
        <div className={styles.viewport} tabIndex={0} role="region" aria-label={t('Original image; scroll to inspect when zoomed', 'मूल तस्वीर; ज़ूम करने पर स्क्रॉल करके जाँचें')}>
          <div className={styles.original} data-photo-selecting={selecting} style={{ width: `${zoom * 100}%` }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={event => { if (drag.current?.pointerId === event.pointerId) stopSelection(true); }} onLostPointerCapture={event => { if (drag.current?.pointerId === event.pointerId) stopSelection(true); }}><img src={source.url} draggable={false} alt={t('Selected original evidence image', 'चुनी मूल साक्ष्य तस्वीर')} /><div className={styles.selection} aria-hidden="true" style={{ left: `${region.x / source.width * 100}%`, top: `${region.y / source.height * 100}%`, width: `${region.width / source.width * 100}%`, height: `${region.height / source.height * 100}%` }} /></div>
        </div>
        <p className={styles.caption}>{source.width} × {source.height} {t('original pixels · outline marks the selected area', 'मूल पिक्सेल · रेखा चुने क्षेत्र को दिखाती है')}</p>
        <fieldset className={styles.region}><legend><ScanLine size={17} aria-hidden="true" />{t('Select the relevant area', 'संबंधित क्षेत्र चुनें')}</legend><p>{t('Use the arrow keys or enter pixel values. Select one vehicle’s plate; keep the original context above.', 'तीर कुंजियों से या पिक्सेल मान भरकर क्षेत्र चुनें। एक वाहन की प्लेट चुनें; ऊपर मूल संदर्भ रखें।')}</p>
          {(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>{key === 'x' ? t('Left', 'बाएँ') : key === 'y' ? t('Top', 'ऊपर') : key === 'width' ? t('Width', 'चौड़ाई') : t('Height', 'ऊँचाई')}<input type="number" inputMode="numeric" data-photo-region={key} value={region[key]} min={key === 'x' || key === 'y' ? 0 : 1} max={key === 'x' ? source.width - 1 : key === 'y' ? source.height - 1 : key === 'width' ? source.width - region.x : source.height - region.y} onChange={event => { setRegion(boundPhotoRegion({ ...region, [key]: event.target.valueAsNumber }, source.width, source.height)); invalidate(); }} /></label>)}
        </fieldset>
        <div className={styles.crop}><strong>{t('Selected area · cropped view', 'चुना क्षेत्र · काटा हुआ दृश्य')}</strong><canvas ref={cropCanvas} role="img" aria-label={t('Selected crop; the original remains unchanged above', 'चुना क्षेत्र; ऊपर मूल तस्वीर अपरिवर्तित है')} /><p>{region.width} × {region.height} {t('pixels in the original', 'मूल तस्वीर में पिक्सेल')}</p></div>
        <details className={styles.measurements}><summary>{t('Pixel measurements', 'पिक्सेल माप')}</summary><p>{measurement ? t(`Edge variation: ${measurement.value} (Laplacian variance), sampled at ${measurement.width} × ${measurement.height} pixels.`, `किनारों में बदलाव: ${measurement.value} (लैप्लेशियन विचरण), ${measurement.width} × ${measurement.height} पिक्सेल पर मापा।`) : t('This area is too small to measure, or measurement is unavailable.', 'क्षेत्र मापने के लिए बहुत छोटा है या माप उपलब्ध नहीं है।')}</p><p>{t('This is a pixel measurement, not a readability score. Noise, resizing and contrast affect it; it cannot establish the characters, relevance or authenticity.', 'यह पिक्सेल माप है, पढ़ने योग्य होने का स्कोर नहीं। नॉइज़, आकार और कंट्रास्ट इसे बदलते हैं; इससे अक्षर, प्रासंगिकता या प्रामाणिकता तय नहीं होती।')}</p></details>
        <label className={styles.label} htmlFor="photo-reading">{t('Registration you can read in this area', 'इस क्षेत्र में आप जो पंजीकरण पढ़ सकते हैं')}</label>
        <input id="photo-reading" value={reading} maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="KA01AB1234" onChange={event => { setReading(event.target.value); invalidate(); }} />
        <p className={styles.caption}>{t('Enter only visible characters. Do not guess O/0 or I/1. A partial or unsupported number stays inconclusive.', 'केवल दिख रहे अक्षर भरें। O/0 या I/1 का अनुमान न लगाएँ। अधूरा या असमर्थित नंबर अनिर्णायक रहता है।')}</p>
        {reference && <p className={styles.reference}>{t('From your vehicle record', 'आपके वाहन रिकॉर्ड से')}: <strong>{reference.value}</strong><small>{t('Page', 'पृष्ठ')} {reference.page} · {t('Check this reading against the vehicle-record source above.', 'ऊपर वाहन रिकॉर्ड के मूल स्रोत से इसे जाँचें।')}</small></p>}
        {sameSource && <p className={styles.attention}>{t('This is the same file as the vehicle record. Use a separate source for comparison.', 'यह वाहन रिकॉर्ड वाली ही फ़ाइल है। तुलना के लिए अलग स्रोत लें।')}</p>}
        {!reference && <p className={styles.caption}>{t('Add a vehicle record above to compare the registration.', 'पंजीकरण की तुलना के लिए ऊपर वाहन रिकॉर्ड जोड़ें।')}</p>}
        <button type="button" className={styles.primary} disabled={!readingSupported || origin === 'unknown'} onClick={() => confirm('readable')}>{t('I checked the sources — use my reading', 'मैंने स्रोत जाँचे — मेरा पढ़ा नंबर उपयोग करें')}</button>
        <div className={styles.recovery}><button type="button" onClick={() => confirm('unreadable')}>{t('I cannot read this area', 'मैं यह क्षेत्र नहीं पढ़ पा रहा हूँ')}</button><button type="button" onClick={() => confirm('unrelated')}>{t('This photo seems unrelated', 'यह तस्वीर संबंधित नहीं लगती')}</button></div>
        {confirmed && <div className={styles.result} role="status" data-photo-confirmed>
          <strong>{confirmed.assessment === 'unreadable' ? t('Marked unclear by you', 'आपके अनुसार अस्पष्ट') : confirmed.assessment === 'unrelated' ? t('Marked unrelated by you', 'आपके अनुसार संबंधित नहीं') : comparison.status === 'different' ? t('The compared text differs', 'तुलना किया गया पाठ अलग है') : comparison.status === 'match' ? t('The compared text matches', 'तुलना किया गया पाठ मेल खाता है') : t('Your reading is recorded', 'आपका पढ़ा नंबर दर्ज है')}</strong>
          {confirmed.assessment === 'readable' && comparison.status !== 'inconclusive' && <div className={styles.comparison}>{[comparison.left, comparison.right].map((value, row) => <p key={row}><span>{row === 0 ? t('Your photo reading', 'तस्वीर में आपका पढ़ा नंबर') : t('Vehicle record', 'वाहन रिकॉर्ड')}</span><code>{Array.from(value).map((character, index) => comparison.positions.includes(index) ? <mark key={index}>{character}</mark> : <span key={index}>{character}</span>)}</code></p>)}</div>}
          <p>{confirmed.assessment === 'unreadable' ? t('Look for an original or higher-resolution copy in the official record. Keep the outcome inconclusive until the characters can be checked.', 'आधिकारिक रिकॉर्ड से मूल या बेहतर तस्वीर लें। अक्षर जाँचने तक परिणाम अनिर्णायक रखें।') : confirmed.assessment === 'unrelated' ? origin === 'own-supporting' ? t('Replace an accidentally selected image. Keep relevant supporting material separately.', 'गलती से चुनी तस्वीर बदलें। संबंधित सहायक सामग्री अलग रखें।') : t('If this was attached to the official record, preserve it and ask the official service to clarify its connection to the notice.', 'यदि यह आधिकारिक रिकॉर्ड में संलग्न थी, इसे सुरक्षित रखें और आधिकारिक सेवा से चालान से इसका संबंध स्पष्ट करने को कहें।') : t('This is your confirmed text observation. It does not establish vehicle identity, an offence or validity. It will be included when you prepare your document note.', 'यह आपके अनुसार पुष्टि किया गया पाठ है। इससे वाहन की पहचान, अपराध या वैधता तय नहीं होती। दस्तावेज़ नोट तैयार करने पर यह शामिल होगा।')}</p>
        </div>}
      </>}
    </div>
  </details>;
}
