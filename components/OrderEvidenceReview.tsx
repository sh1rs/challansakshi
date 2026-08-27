'use client';

import { useState, type ReactNode } from 'react';
import type { Language } from '../lib/domain';
import type { CaseLedgerEvent, EvidenceIndexItem } from '../lib/case-ledger';
import { getLedgerActorLabel } from '../lib/case-ledger';
import type {
  OrderCompleteness,
  OrderEvidenceRow,
  OrderExtractedFact,
  OrderFactId,
  OrderMapReview,
  OrderMapStatus,
  SyntheticRejectedOrder,
} from '../lib/order-evidence';
import { orderStatusLabel } from '../lib/order-evidence';
import type { PostRejectionWindow } from '../lib/resolution';

const local = <T extends { en: string; hi: string }>(value: T, language: Language) => value[language];
const lockedOrderFactIds = new Set<OrderFactId>(['order-id', 'grievance-id', 'challan-id', 'outcome']);

function orderFactSourceLabel(source: string, language: Language): string {
  const headerLabels: Record<string, { en: string; hi: string }> = {
    'header.orderId': { en: 'Order header · Order ID', hi: 'आदेश शीर्ष भाग · आदेश संख्या' },
    'header.grievanceNumber': { en: 'Order header · Grievance ID', hi: 'आदेश शीर्ष भाग · आपत्ति संख्या' },
    'header.challanNumber': { en: 'Order header · e-Challan ID', hi: 'आदेश शीर्ष भाग · ई-चालान संख्या' },
    'header.orderDate': { en: 'Order header · Date', hi: 'आदेश शीर्ष भाग · तारीख' },
  };
  return headerLabels[source] ? local(headerLabels[source], language) : source;
}

function matchBasisLabel(basis: OrderEvidenceRow['matchBasis'], language: Language): string {
  const labels: Record<OrderEvidenceRow['matchBasis'], { en: string; hi: string }> = {
    'exact-identifier': { en: 'Exact identifier', hi: 'ठीक वही पहचान संख्या' },
    'direct-phrase': { en: 'Direct phrase', hi: 'सीधा वाक्यांश' },
    'possible-semantic-reference': { en: 'Possible semantic reference', hi: 'संभावित अर्थ-समान संदर्भ' },
    'no-supported-reference': { en: 'No supported reference', hi: 'समर्थित संदर्भ नहीं' },
  };
  return local(labels[basis], language);
}

function completenessLabel(value: OrderCompleteness, language: Language): string {
  const labels: Record<OrderCompleteness, { en: string; hi: string }> = {
    yes: { en: 'Citizen indicated the supplied order appears complete', hi: 'नागरिक के अनुसार दिया आदेश पूरा दिखता है' },
    no: { en: 'Pages or annexures missing', hi: 'पन्ने या परिशिष्ट नहीं मिले' },
    'not-sure': { en: 'Completeness not certain', hi: 'पूर्णता पक्की नहीं' },
  };
  return local(labels[value], language);
}

function evidenceSummaryLabel(summary: string, language: Language): string {
  if (language === 'en') return summary;
  if (summary === 'Synthetic') return 'सिंथेटिक';
  if (summary === 'Not submitted') return 'जमा नहीं हुआ';
  if (summary === 'Unavailable') return 'उपलब्ध नहीं';
  if (summary === 'Unavailable / unclear') return 'उपलब्ध नहीं / साफ़ नहीं';
  return summary;
}

function PanelButton({ children, onClick, variant = 'primary', type = 'button', disabled = false }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return <button className={`button button-${variant}`} type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function CaseLedgerTimeline({ events, language, compact = false }: { events: CaseLedgerEvent[]; language: Language; compact?: boolean }) {
  return (
    <ol className={`case-ledger ${compact ? 'compact' : ''}`} aria-label={language === 'hi' ? 'स्थानीय डेमो केस इतिहास' : 'Local demo case history'}>
      {events.map((event) => (
        <li key={event.id}>
          <span className="ledger-sequence" aria-hidden="true">{String(event.sequence).padStart(2, '0')}</span>
          <div>
            <strong>{local(event.label, language)}</strong>
            <p>{local(event.detail, language)}</p>
            <small><time dateTime={event.recordedOn}>{event.recordedOn}</time> · {local(getLedgerActorLabel(event.actor), language)}{event.revisionId ? ` · ${event.revisionId}` : ''}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

function OrderSource({ order, language }: { order: SyntheticRejectedOrder; language: Language }) {
  return (
    <article className="order-source-card" aria-labelledby="order-source-heading">
      <div className="order-source-top">
        <span>{language === 'hi' ? 'मूल स्रोत बदला नहीं जा सकता' : 'Locked source'}</span>
        <b>{language === 'hi' ? 'काल्पनिक आदेश' : 'FICTIONAL ORDER'}</b>
      </div>
      <header>
        <p>{language === 'hi' ? 'सिंथेटिक पायलट यातायात प्राधिकरण' : 'SYNTHETIC PILOT TRAFFIC AUTHORITY'}</p>
        <h2 id="order-source-heading" lang="en">{order.heading.en}</h2>
        {language === 'hi' && <small lang="hi"><b>{order.heading.hi}</b> · सुविधा के लिए हिंदी रूपांतरण; मूल अंग्रेज़ी का स्थान नहीं लेता</small>}
      </header>
      <dl className="order-identifiers">
        <div><dt>{language === 'hi' ? 'आदेश' : 'Order'}</dt><dd>{order.id}</dd></div>
        <div><dt>{language === 'hi' ? 'आपत्ति' : 'Grievance'}</dt><dd>{order.grievanceNumber}</dd></div>
        <div><dt>{language === 'hi' ? 'ई-चालान' : 'e-Challan'}</dt><dd>{order.challanNumber}</dd></div>
        <div><dt>{language === 'hi' ? 'तारीख' : 'Date'}</dt><dd>{order.orderDate}</dd></div>
      </dl>
      <div className="order-paragraphs">
        {order.paragraphs.map((paragraph) => (
          <p id={`order-paragraph-${paragraph.id}`} tabIndex={-1} key={paragraph.id}>
            <b>{paragraph.id}</b><span className="order-original" lang="en">{paragraph.text.en}</span>
            {language === 'hi' && <span className="order-translation" lang="hi"><small>हिंदी रूपांतरण</small>{paragraph.text.hi}</span>}
          </p>
        ))}
      </div>
      <footer>{language === 'hi' ? 'आधिकारिक दस्तावेज़ नहीं · किसी सरकारी सिस्टम से संपर्क नहीं हुआ' : 'NOT AN OFFICIAL DOCUMENT · NO GOVERNMENT SYSTEM CONTACTED'}</footer>
    </article>
  );
}

export function OrderReviewScreen({
  language,
  order,
  extractedFacts,
  confirmedFactIds,
  completeness,
  error,
  onFactChange,
  onFactConfirmation,
  onCompletenessChange,
  onContinue,
  onBack,
}: {
  language: Language;
  order: SyntheticRejectedOrder;
  extractedFacts: OrderExtractedFact[];
  confirmedFactIds: string[];
  completeness: OrderCompleteness | null;
  error: string;
  onFactChange: (id: string, value: string) => void;
  onFactConfirmation: (id: string, checked: boolean) => void;
  onCompletenessChange: (value: OrderCompleteness) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const confirmed = new Set(confirmedFactIds);
  return (
    <main className="screen-shell order-review-screen" tabIndex={-1}>
      <button className="back-button" type="button" onClick={onBack}><span aria-hidden="true">←</span>{language === 'hi' ? 'स्थिति पर वापस जाएँ' : 'Back to tracking'}</button>
      <div className="order-review-hero">
        <div>
          <p className="eyebrow"><span />{language === 'hi' ? 'आदेश–सबूत मिलान' : 'ORDER-TO-EVIDENCE REVIEW'}</p>
          <h1>{language === 'hi' ? 'दिए गए आदेश में आपके सबूतों का उल्लेख कहाँ है?' : 'Where does the supplied order mention your evidence?'}</h1>
          <p>{language === 'hi' ? 'काल्पनिक आदेश को अपने पक्के किए सबूत पैक से मिलाएँ। ChallanSakshi संदर्भ सुझाता है; हर मिलान की जाँच आप करेंगे।' : 'Compare the fictional order with your citizen-confirmed evidence pack. ChallanSakshi suggests references; you verify every mapping.'}</p>
        </div>
        <div className="order-stepper" aria-label={language === 'hi' ? 'समीक्षा के चरण' : 'Review steps'}>
          <b>1</b><span>{language === 'hi' ? 'आदेश' : 'Order'}</span><i />
          <b>2</b><span>{language === 'hi' ? 'सबूत मिलान' : 'Evidence map'}</span><i />
          <b>3</b><span>{language === 'hi' ? 'समीक्षा नोट' : 'Review note'}</span>
        </div>
      </div>

      <div className="order-safety-banner">
        <span aria-hidden="true">i</span>
        <div><strong>{language === 'hi' ? 'काल्पनिक आदेश · केवल पाठ की समीक्षा' : 'FICTIONAL ORDER · TEXT-ONLY REVIEW'}</strong><p>{language === 'hi' ? 'यह केवल दिए गए पाठ का मिलान करता है। यह तय नहीं करता कि आदेश कानूनी रूप से पर्याप्त, सही या वैध है।' : 'This maps only the supplied text. It does not assess whether the order is legally sufficient, correct, or valid.'}</p></div>
      </div>

      <section className="order-review-layout">
        <div className="order-source-sticky"><OrderSource order={order} language={language} /></div>
        <form className="order-fact-review" onSubmit={(event) => { event.preventDefault(); onContinue(); }}>
          <header><span>01</span><div><h2>{language === 'hi' ? 'दिए गए आदेश में लिखी बातें जाँचें' : 'Verify what the supplied order says'}</h2><p>{language === 'hi' ? 'ज़रूरत हो तो निकाली गई तारीख और विवरण सुधारें। जुड़े केस नंबर और नतीजा स्रोत से लॉक हैं; मूल काल्पनिक आदेश नहीं बदलेगा।' : 'Correct the extracted date or narrative if needed. Linked case IDs and outcome stay locked to the source; the original fictional order remains unchanged.'}</p></div></header>
          <div className="order-fact-list">
            {extractedFacts.map((fact) => {
              const locked = lockedOrderFactIds.has(fact.id);
              return (
              <article key={fact.id} className={`${confirmed.has(fact.id) ? 'confirmed' : ''} ${locked ? 'locked' : ''}`}>
                <label htmlFor={`order-fact-${fact.id}`}>{local(fact.label, language)}</label>
                {fact.id === 'reason' || fact.id === 'next-route'
                  ? <textarea id={`order-fact-${fact.id}`} value={fact.value} maxLength={600} rows={fact.id === 'reason' ? 3 : 4} onChange={(event) => onFactChange(fact.id, event.target.value)} />
                  : <input id={`order-fact-${fact.id}`} type={fact.id === 'order-date' ? 'date' : 'text'} value={fact.value} maxLength={160} readOnly={locked} aria-readonly={locked} onChange={(event) => onFactChange(fact.id, event.target.value)} />}
                <small>{language === 'hi' ? 'आदेश स्रोत' : 'Order source'}: {fact.sourceParagraphs.length ? fact.sourceParagraphs.map((source) => orderFactSourceLabel(source, language)).join(', ') : (language === 'hi' ? 'शीर्ष भाग' : 'header')}{locked ? ` · ${language === 'hi' ? 'स्रोत से लॉक' : 'source-locked'}` : ''}</small>
                <label className="row-confirmation"><input type="checkbox" checked={confirmed.has(fact.id)} onChange={(event) => onFactConfirmation(fact.id, event.target.checked)} /><span>{language === 'hi' ? 'मैंने इस जानकारी को दिए आदेश से मिलाया है।' : 'I checked this fact against the supplied order.'}</span></label>
              </article>
            );})}
          </div>

          <fieldset className="order-completeness">
            <legend>{language === 'hi' ? 'क्या आपको मिला पूरा आदेश यही है?' : 'Is this the complete order supplied to you?'}</legend>
            <p>{language === 'hi' ? 'यह उत्तर तय करता है कि “नहीं मिला” का दायरा पूरा आदेश है या केवल दिए गए पन्ने।' : 'This answer scopes “not found” to the complete order or only the supplied pages.'}</p>
            {([
              ['yes', { en: 'Yes, this appears complete', hi: 'हाँ, यही पूरा आदेश दिखता है' }],
              ['no', { en: 'No, pages or annexures are missing', hi: 'नहीं, कुछ पन्ने या परिशिष्ट नहीं मिले' }],
              ['not-sure', { en: 'I’m not sure', hi: 'मुझे पक्का नहीं है' }],
            ] as const).map(([value, label]) => <label key={value}><input type="radio" name="order-completeness" value={value} checked={completeness === value} onChange={() => onCompletenessChange(value)} /><span>{local(label, language)}</span></label>)}
          </fieldset>

          {error && <p className="order-form-error" role="alert">{error}</p>}
          <div className="page-actions"><PanelButton variant="secondary" onClick={onBack}>{language === 'hi' ? 'वापस' : 'Back'}</PanelButton><PanelButton type="submit">{language === 'hi' ? 'सबूत मिलान देखें' : 'Review evidence map'} <span aria-hidden="true">→</span></PanelButton></div>
        </form>
      </section>
    </main>
  );
}

function statusCopy(status: OrderMapStatus, language: Language): string {
  if (status === 'mentioned') return language === 'hi' ? 'दिए आदेश में सीधा या साफ़ समान संदर्भ है।' : 'The supplied order contains a direct or clearly equivalent reference.';
  if (status === 'unclear') return language === 'hi' ? 'संभावित संदर्भ है, लेकिन संबंध स्पष्ट नहीं है।' : 'The text may refer to this point, but the connection is not explicit.';
  return language === 'hi' ? 'दिए पाठ में सीधा संदर्भ नहीं मिला; यह दूसरे रिकॉर्ड पर निष्कर्ष नहीं है।' : 'No explicit reference was found in the supplied text; this says nothing about another record.';
}

export function OrderMapScreen({
  language,
  order,
  completeness,
  rows,
  reviews,
  evidenceIndex,
  ledgerEvents,
  postClock,
  limitationConfirmed,
  noteCreated,
  note,
  clarificationDraft,
  error,
  copied,
  onReviewChange,
  onLimitationConfirmation,
  onCreateNote,
  onCopyClarification,
  onDownloadNote,
  onDownloadManifest,
  onDownloadCalendar,
  onOpenRoute,
  onBack,
}: {
  language: Language;
  order: SyntheticRejectedOrder;
  completeness: OrderCompleteness;
  rows: OrderEvidenceRow[];
  reviews: Record<string, OrderMapReview>;
  evidenceIndex: EvidenceIndexItem[];
  ledgerEvents: CaseLedgerEvent[];
  postClock: PostRejectionWindow;
  limitationConfirmed: boolean;
  noteCreated: boolean;
  note: string;
  clarificationDraft: string | null;
  error: string;
  copied: boolean;
  onReviewChange: (rowId: string, patch: Partial<OrderMapReview>) => void;
  onLimitationConfirmation: (checked: boolean) => void;
  onCreateNote: () => void;
  onCopyClarification: () => void;
  onDownloadNote: () => void;
  onDownloadManifest: () => void;
  onDownloadCalendar: () => void;
  onOpenRoute: () => void;
  onBack: () => void;
}) {
  const [sourceOrigin, setSourceOrigin] = useState<string | null>(null);
  const counts = rows.reduce((result, row) => {
    const status = reviews[row.id]?.status ?? row.suggestedStatus;
    result[status] += 1;
    return result;
  }, { mentioned: 0, unclear: 0, 'not-found': 0 });
  const reviewedCount = rows.filter((row) => reviews[row.id]?.confirmed).length;
  const focusParagraph = (paragraphId: string, rowId: string) => {
    setSourceOrigin(rowId);
    const target = document.getElementById(`map-order-paragraph-${paragraphId}`);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  };
  const returnToMapping = () => {
    if (!sourceOrigin) return;
    const target = document.getElementById(`mapping-card-${sourceOrigin}`);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    setSourceOrigin(null);
  };
  return (
    <main className="screen-shell order-map-screen" tabIndex={-1}>
      <button className="back-button" type="button" onClick={onBack}><span aria-hidden="true">←</span>{language === 'hi' ? 'आदेश की जानकारी पर वापस' : 'Back to order facts'}</button>
      <div className="order-review-hero compact">
        <div><p className="eyebrow"><span />{language === 'hi' ? 'सुझाया गया सबूत उल्लेख मानचित्र' : 'SUGGESTED EVIDENCE MENTION MAP'}</p><h1>{language === 'hi' ? 'सबूत के हर बिंदु को आदेश के पाठ से मिलाएँ।' : 'Trace each evidence point into the order text.'}</h1><p>{language === 'hi' ? 'यह टेक्स्ट कवरेज है, कानूनी पर्याप्तता का स्कोर नहीं। सुझाई स्थिति और अनुच्छेद की जाँच आप करेंगे।' : 'This is textual coverage, not a legal-adequacy score. You verify the suggested status and paragraph references.'}</p></div>
        <div className="map-progress" role="status"><b>{reviewedCount}/{rows.length}</b><span>{language === 'hi' ? 'मिलान जाँचे गए' : 'mappings reviewed'}</span></div>
      </div>

      <aside className="critical-caveat"><strong>{language === 'hi' ? 'ज़रूरी सीमा' : 'Critical limitation'}</strong><p>{language === 'hi' ? '“इस पाठ में नहीं मिला” का अर्थ यह नहीं कि प्राधिकरण ने उस बिंदु पर विचार नहीं किया या आदेश अमान्य है। वह किसी परिशिष्ट, दूसरे पन्ने या अन्य आधिकारिक रिकॉर्ड में हो सकता है।' : '“Not found in this text” does not mean the authority ignored the point or that the order is invalid. The point may appear in an annexure, another page, or another official record.'}</p></aside>

      <section className="map-summary" aria-label={language === 'hi' ? 'अभी चुनी स्थितियों का सार' : 'Current selected-status summary'}>
        <article><b>{counts.mentioned}</b><span>{language === 'hi' ? 'स्पष्ट उल्लेख' : 'Explicitly mentioned'}</span><small>{statusCopy('mentioned', language)}</small></article>
        <article><b>{counts.unclear}</b><span>{language === 'hi' ? 'संदर्भ साफ़ नहीं' : 'Reference unclear'}</span><small>{statusCopy('unclear', language)}</small></article>
        <article><b>{counts['not-found']}</b><span>{orderStatusLabel('not-found', language, completeness)}</span><small>{statusCopy('not-found', language)}</small></article>
      </section>

      <section className="order-map-layout">
        <aside className="map-order-source" aria-labelledby="map-order-heading">
          <div className="map-source-heading"><span>{language === 'hi' ? `O1–O${order.paragraphs.length} · बदला नहीं जा सकता` : `O1–O${order.paragraphs.length} · LOCKED SOURCE`}</span><h2 id="map-order-heading">{language === 'hi' ? 'काल्पनिक आदेश का पाठ' : 'Fictional order text'}</h2></div>
          {language === 'hi' && <p className="map-translation-note">पहली पंक्ति मूल अंग्रेज़ी है; नीचे का हिंदी पाठ केवल सुविधा के लिए है।</p>}
          {order.paragraphs.map((paragraph) => <p id={`map-order-paragraph-${paragraph.id}`} tabIndex={-1} key={paragraph.id}><b>{paragraph.id}</b><span className="order-original" lang="en">{paragraph.text.en}</span>{language === 'hi' && <span className="order-translation" lang="hi"><small>हिंदी रूपांतरण</small>{paragraph.text.hi}</span>}</p>)}
          {sourceOrigin && <button className="source-return" type="button" onClick={returnToMapping}>{language === 'hi' ? `${sourceOrigin} मिलान पर वापस जाएँ` : `Return to mapping ${sourceOrigin}`} <span aria-hidden="true">↓</span></button>}
        </aside>

        <div className="mapping-cards">
          {rows.map((row) => {
            const review = reviews[row.id] ?? { status: row.suggestedStatus, reasonRefs: row.suggestedReasonRefs, confirmed: false };
            const needsReference = review.status !== 'not-found';
            const rowReferenceValid = needsReference ? review.reasonRefs.length > 0 : review.reasonRefs.length === 0;
            return (
              <article className={`mapping-card status-${review.status} ${review.confirmed ? 'confirmed' : ''}`} id={`mapping-card-${row.id}`} tabIndex={-1} key={row.id}>
                <header><span>{row.id}</span><div><small>{language === 'hi' ? 'जमा किया बिंदु' : 'Submitted point'}</small><h2>{local(row.label, language)}</h2></div><b>{orderStatusLabel(review.status, language, completeness)}</b></header>
                <p className="submitted-point">{local(row.submittedPoint, language)}</p>
                <div className="evidence-chips" aria-label={language === 'hi' ? 'सबूत के स्रोत' : 'Evidence sources'}>{row.evidenceIds.map((id) => <span key={id}>{id}</span>)}</div>
                <details open={!review.confirmed}>
                  <summary>{language === 'hi' ? 'यह मिलान क्यों और कहाँ से?' : 'Why this mapping and where from?'}</summary>
                  <p>{local(row.explanation, language)}</p>
                  <dl><div><dt>{language === 'hi' ? 'मिलान का आधार' : 'Match basis'}</dt><dd>{matchBasisLabel(row.matchBasis, language)}</dd></div><div><dt>{language === 'hi' ? 'सुझाई स्थिति' : 'Suggested status'}</dt><dd>{orderStatusLabel(row.suggestedStatus, language, completeness)}</dd></div></dl>
                </details>
                <fieldset className="status-choice" aria-describedby={`status-help-${row.id}`}>
                  <legend>{review.confirmed ? (language === 'hi' ? 'नागरिक द्वारा जाँची स्थिति' : 'Citizen-reviewed status') : (language === 'hi' ? 'जाँच के लिए चुनी स्थिति' : 'Selected status to verify')}</legend>
                  <p id={`status-help-${row.id}`}>{language === 'hi' ? 'केवल दिए पाठ के आधार पर एक स्थिति चुनें।' : 'Choose one status based only on the supplied text.'}</p>
                  {(['mentioned', 'unclear', 'not-found'] as const).map((status) => <label key={status}><input type="radio" name={`status-${row.id}`} value={status} checked={review.status === status} onChange={() => onReviewChange(row.id, { status, reasonRefs: status === 'not-found' ? [] : review.reasonRefs.length ? review.reasonRefs : row.suggestedReasonRefs, confirmed: false })} /><span>{orderStatusLabel(status, language, completeness)}</span></label>)}
                </fieldset>
                  {needsReference && <fieldset className="paragraph-choice"><legend>{language === 'hi' ? 'आदेश के अनुच्छेद' : 'Order paragraphs'}</legend>{order.paragraphs.map((paragraph) => <div className="paragraph-option" key={paragraph.id}><input type="checkbox" aria-label={language === 'hi' ? `${paragraph.id} को आदेश संदर्भ के रूप में चुनें` : `Use ${paragraph.id} as an order reference`} checked={review.reasonRefs.includes(paragraph.id)} onChange={(event) => onReviewChange(row.id, { reasonRefs: event.target.checked ? [...review.reasonRefs, paragraph.id] : review.reasonRefs.filter((id) => id !== paragraph.id), confirmed: false })} /><button type="button" aria-label={language === 'hi' ? `आदेश अनुच्छेद ${paragraph.id} खोलें` : `Open order paragraph ${paragraph.id}`} onClick={() => focusParagraph(paragraph.id, row.id)}>{paragraph.id}</button></div>)}</fieldset>}
                {!rowReferenceValid && <p className="row-reference-error">{language === 'hi' ? 'इस स्थिति के लिए कम से कम एक आदेश अनुच्छेद चुनें।' : 'Select at least one order paragraph for this status.'}</p>}
                <label className="row-confirmation"><input type="checkbox" checked={review.confirmed} disabled={!rowReferenceValid} onChange={(event) => onReviewChange(row.id, { confirmed: event.target.checked })} /><span>{language === 'hi' ? 'मैंने इस मिलान को आदेश के पाठ से जाँच लिया है।' : 'I checked this mapping against the order text.'}</span></label>
              </article>
            );
          })}
        </div>
      </section>

      <label className="limitation-confirmation"><input type="checkbox" checked={limitationConfirmed} onChange={(event) => onLimitationConfirmation(event.target.checked)} /><span><strong>{language === 'hi' ? 'दायरे की पुष्टि' : 'Scope confirmation'}</strong>{language === 'hi' ? 'मैं समझता/समझती हूँ कि यह मिलान केवल दिए आदेश के पाठ का वर्णन करता है। यह कानूनी आकलन नहीं है और दूसरे रिकॉर्ड में क्या हो सकता है, यह नहीं बताता।' : 'I understand that this map describes only the supplied order text. It is not a legal assessment and does not show what may exist in another record.'}</span></label>
      {error && <p className="order-form-error" role="alert">{error}</p>}

      {!noteCreated && <div className="create-note-bar"><div><b>{reviewedCount} / {rows.length}</b><span>{language === 'hi' ? 'हर मिलान और दायरे की सीमा जाँचें।' : 'Review every mapping and the scope limitation.'}</span></div><PanelButton onClick={onCreateNote}>{language === 'hi' ? 'मेरा समीक्षा नोट बनाएँ' : 'Create my review note'} <span aria-hidden="true">→</span></PanelButton></div>}

      {noteCreated && (
        <section className="order-note" id="order-review-note" tabIndex={-1} aria-labelledby="order-review-note-heading">
          <header><div><span>{language === 'hi' ? 'नागरिक द्वारा पक्का रिकॉर्ड' : 'CITIZEN-CONFIRMED RECORD'}</span><h2 id="order-review-note-heading">{language === 'hi' ? 'आदेश समीक्षा नोट' : 'Order Review Note'}</h2><p>{language === 'hi' ? 'यह अपील, कानूनी राय या आधिकारिक फाइलिंग नहीं है।' : 'Not an appeal, legal opinion, or official filing.'}</p></div><b>challansakshi.order-review.v1</b></header>
          <div className="note-grid">
            <article><small>{language === 'hi' ? 'आदेश' : 'Order'}</small><strong>{order.id}</strong><span>{postClock.orderDate}</span></article>
            <article><small>{language === 'hi' ? 'पन्नों का दायरा' : 'Document scope'}</small><strong>{completenessLabel(completeness, language)}</strong><span>{language === 'hi' ? 'नागरिक का जवाब' : 'Citizen supplied answer'}</span></article>
            <article><small>{language === 'hi' ? 'मिलान' : 'Mappings'}</small><strong>{rows.length}</strong><span>{language === 'hi' ? 'सभी नागरिक द्वारा जाँचे गए' : 'all citizen-reviewed'}</span></article>
          </div>
          <section className="note-map"><h3>{language === 'hi' ? 'पक्की उल्लेख सूची' : 'Confirmed mention map'}</h3>{rows.map((row) => <div key={row.id}><b>{row.id}</b><span>{local(row.label, language)}</span><strong>{orderStatusLabel(reviews[row.id].status, language, completeness)}</strong><small>{reviews[row.id].reasonRefs.join(', ') || (language === 'hi' ? 'कोई अनुच्छेद नहीं' : 'No paragraph')}</small></div>)}</section>
          <section className="post-order-note-clock"><div><small>{language === 'hi' ? 'काल्पनिक आदेश तारीख' : 'Fictional order date'}</small><strong>{postClock.orderDate}</strong></div><span aria-hidden="true">→</span><div className="post-clock-days"><b>{postClock.daysRemaining}</b><small>{language === 'hi' ? 'अनुमानित दिन बाकी' : 'indicative days left'}</small></div><span aria-hidden="true">→</span><div><small>{language === 'hi' ? 'अनुमानित D+30 सीमा' : 'Indicative D+30 boundary'}</small><strong>{postClock.indicativeBoundary}</strong></div><p>{language === 'hi' ? 'यह डेमो गणना है। मौजूदा आधिकारिक समय-सीमा और राज्य का रास्ता जाँचें।' : 'This is a demo calculation. Verify the current official cutoff and state-specific route.'}</p></section>
          <details className="plain-note"><summary>{language === 'hi' ? 'पूरा टेक्स्ट नोट देखें' : 'View plain-text note'}</summary><pre>{note}</pre></details>
          {clarificationDraft ? <section className="clarification-draft"><h3>{language === 'hi' ? 'तटस्थ कारण स्पष्टीकरण अनुरोध' : 'Neutral reason clarification request'}</h3><p>{language === 'hi' ? 'यह केवल दर्ज कारण समझने के लिए है; कोई अपील या कानूनी दावा नहीं।' : 'This seeks clarity on recorded reasons only; it is not an appeal or legal claim.'}</p><pre>{clarificationDraft}</pre><PanelButton variant="secondary" onClick={onCopyClarification}>{copied ? (language === 'hi' ? 'कॉपी हुआ' : 'Copied') : (language === 'hi' ? 'तटस्थ अनुरोध कॉपी करें' : 'Copy neutral request')}</PanelButton></section> : <p className="no-clarification">{language === 'hi' ? 'दिए पाठ में हर मिलाए गए बिंदु का स्पष्ट संदर्भ है। कोई गायब-संदर्भ अनुरोध नहीं बनाया गया।' : 'The supplied text explicitly refers to every mapped point. No missing-reference request was created.'}</p>}
          <div className="note-actions"><PanelButton variant="secondary" onClick={onDownloadNote}>{language === 'hi' ? 'समीक्षा नोट (.json)' : 'Download review note (.json)'} ↓</PanelButton><PanelButton variant="secondary" onClick={() => window.print()}>{language === 'hi' ? 'प्रिंट / PDF' : 'Print / save PDF'} ↗</PanelButton><PanelButton variant="secondary" onClick={onDownloadCalendar}>{language === 'hi' ? 'समय-स्मरण (.ics)' : 'Calendar reminder (.ics)'} ↓</PanelButton><PanelButton variant="secondary" onClick={onDownloadManifest}>{language === 'hi' ? 'पूरा केस रिकॉर्ड' : 'Full case record'} ↓</PanelButton><PanelButton onClick={onOpenRoute}>{language === 'hi' ? 'फैसले के बाद रास्ते देखें' : 'Continue to post-decision routes'} →</PanelButton></div>
        </section>
      )}

      <section className="ledger-panel"><div className="card-title"><span>03</span><div><h2>{language === 'hi' ? 'पता लगाने योग्य स्थानीय डेमो इतिहास' : 'Traceable local demo history'}</h2><small>{language === 'hi' ? 'आधिकारिक रिकॉर्ड या कानूनी कस्टडी-श्रृंखला नहीं' : 'Not an official record or legal chain of custody'}</small></div></div><CaseLedgerTimeline events={ledgerEvents} language={language} compact /></section>
      <div className="evidence-registry"><h2>{language === 'hi' ? 'जमा सबूत सूची' : 'Submitted evidence index'}</h2>{evidenceIndex.map((item) => <article key={item.id}><b>{item.id}</b><span>{local(item.label, language)}</span><small>{evidenceSummaryLabel(item.summary, language)}</small></article>)}</div>
    </main>
  );
}
