'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { calculateAuthorityWindow, type Language, type LocalizedText } from '../lib/domain';
import {
  calculatePostRejectionWindow,
  classifyResolutionIssue,
  paymentScenarios,
  reconcilePayment,
  resolutionIssues,
  resolutionRoutes,
  type PaymentFinding,
  type PaymentScenarioId,
  type ResolutionIssueId,
  type ResolutionStage,
} from '../lib/resolution';

type Pair = LocalizedText;

const referenceDate = '2026-08-27';

function local(value: Pair, language: Language): string {
  return value[language];
}

function stageLabel(stage: ResolutionStage, language: Language): string {
  const labels: Record<ResolutionStage, Pair> = {
    evidence: { en: 'Evidence', hi: 'सबूत' },
    authority: { en: 'Authority', hi: 'प्राधिकरण' },
    court: { en: 'Court', hi: 'अदालत' },
    payment: { en: 'Payment', hi: 'भुगतान' },
  };
  return local(labels[stage], language);
}

function BackButton({ onClick, language, destination }: { onClick: () => void; language: Language; destination?: 'desk' | 'order-review' }) {
  const label = destination === 'order-review'
    ? (language === 'hi' ? 'आदेश समीक्षा नोट पर वापस' : 'Back to Order Review Note')
    : destination === 'desk'
      ? (language === 'hi' ? 'रिज़ॉल्यूशन डेस्क पर वापस' : 'Back to Resolution Desk')
      : (language === 'hi' ? 'पीछे' : 'Back');
  return <button className="back-button" type="button" onClick={onClick}><span aria-hidden="true">←</span>{label}</button>;
}

export function ResolutionDesk({ language, onBack, onOpenRoute, onStartEvidence }: {
  language: Language;
  onBack: () => void;
  onOpenRoute: (issueId: ResolutionIssueId) => void;
  onStartEvidence: (issueId: 'wrong-evidence' | 'unclear-evidence') => void;
}) {
  const [description, setDescription] = useState('');
  const [suggestion, setSuggestion] = useState<ReturnType<typeof classifyResolutionIssue> | null>(null);
  const [error, setError] = useState('');
  const suggestedIssue = suggestion ? resolutionIssues.find((item) => item.id === suggestion.issueId) : null;

  const submitTriage = () => {
    if (!description.trim()) {
      setError(language === 'hi' ? 'एक काल्पनिक स्थिति लिखें या नीचे का उदाहरण चुनें।' : 'Describe a fictional situation or choose an example below.');
      return;
    }
    setError('');
    setSuggestion(classifyResolutionIssue(description));
  };

  const chooseExample = (example: string) => {
    setDescription(example);
    setError('');
    setSuggestion(classifyResolutionIssue(example));
  };

  const openIssue = (event: MouseEvent<HTMLAnchorElement>, issueId: ResolutionIssueId) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (issueId === 'wrong-evidence' || issueId === 'unclear-evidence') onStartEvidence(issueId);
    else onOpenRoute(issueId);
  };

  return (
    <main className="screen-shell shell resolution-desk-screen" tabIndex={-1}>
      <BackButton onClick={onBack} language={language} />
      <section className="desk-heading">
        <div>
          <p className="eyebrow"><span />{language === 'hi' ? 'रिज़ॉल्यूशन डेस्क' : 'Resolution desk'}</p>
          <h1>{language === 'hi' ? 'ई-चालान की प्रक्रिया कहाँ अटकी?' : 'Where did the e-Challan journey get stuck?'}</h1>
          <p>{language === 'hi' ? 'काल्पनिक स्थिति चुनें। ChallanSakshi बताएगा कि कौन-से रिकॉर्ड मायने रखते हैं, वे क्या समर्थन कर सकते हैं और क्या साबित नहीं करते।' : 'Choose a fictional situation. ChallanSakshi shows which records matter, what they can support, and what they cannot prove.'}</p>
        </div>
        <div className="desk-scope-card">
          <span aria-hidden="true">7</span>
          <div><strong>{language === 'hi' ? 'पड़ाव, एक समाधान यात्रा' : 'moments in one resolution journey'}</strong><small>{language === 'hi' ? 'सबूत · प्राधिकरण · अदालत या भुगतान' : 'Evidence · authority · court or payment'}</small></div>
        </div>
      </section>

      <section className="triage-card" aria-labelledby="triage-title">
        <div className="triage-copy">
          <span className="synthetic-chip">{language === 'hi' ? 'केवल काल्पनिक उदाहरण' : 'FICTIONAL EXAMPLES ONLY'}</span>
          <h2 id="triage-title">{language === 'hi' ? 'अपनी समस्या सामान्य भाषा में लिखें' : 'Describe the problem in plain language'}</h2>
          <p>{language === 'hi' ? 'यह नियम-आधारित डेमो केवल एक सहायता रास्ता सुझाता है। यह कानूनी निष्कर्ष नहीं देता।' : 'This rules-based demo only suggests a help path. It does not make a legal conclusion.'}</p>
        </div>
        <p className="triage-privacy-inline" role="note">{language === 'hi' ? 'सिर्फ़ काल्पनिक शब्द लिखें—वाहन नंबर, नाम, OTP, भुगतान संदर्भ, इंजन या चेसिस नंबर नहीं।' : 'Use fictional words only—no vehicle number, name, OTP, payment reference, engine, or chassis number.'}</p>
        <div className="triage-input-row">
          <label htmlFor="resolution-description" className="sr-only">{language === 'hi' ? 'काल्पनिक समस्या' : 'Fictional problem'}</label>
          <textarea
            id="resolution-description"
            value={description}
            onChange={(event) => { setDescription(event.target.value); setSuggestion(null); setError(''); }}
            placeholder={language === 'hi' ? 'जैसे: भुगतान हो गया, पर स्थिति पेंडिंग है…' : 'For example: payment succeeded, but status is pending…'}
            maxLength={240}
          />
          <button type="button" className="button button-primary" onClick={submitTriage}>{language === 'hi' ? 'रास्ता सुझाएँ' : 'Suggest a route'} <span aria-hidden="true">→</span></button>
        </div>
        <div className="example-chips" aria-label={language === 'hi' ? 'काल्पनिक उदाहरण' : 'Fictional examples'}>
          {resolutionIssues.map((item) => <button type="button" key={item.id} onClick={() => chooseExample(local(item.example, language))}>{local(item.example, language)}</button>)}
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        {suggestedIssue && (
          <div className="triage-suggestion">
            <span className="route-icon" aria-hidden="true">{suggestedIssue.icon}</span>
            <div role="status">
              <small>{language === 'hi' ? 'मिलते शब्दों से सुझाया रास्ता' : 'Suggested from matched words'}</small>
              <strong>{local(suggestedIssue.title, language)}</strong>
              <p>{language === 'hi' ? `मिले संकेत: ${suggestion?.matchedTerms.join(', ')}। रास्ता खोलने से पहले आप इसकी पुष्टि करते हैं।` : `Matched cues: ${suggestion?.matchedTerms.join(', ')}. You confirm the route before it opens.`}</p>
            </div>
            <button type="button" onClick={() => suggestedIssue.id === 'wrong-evidence' || suggestedIssue.id === 'unclear-evidence' ? onStartEvidence(suggestedIssue.id) : onOpenRoute(suggestedIssue.id)}>{language === 'hi' ? 'इस रास्ते की पुष्टि करें' : 'Confirm this route'} <span aria-hidden="true">→</span></button>
          </div>
        )}
        {suggestion && !suggestedIssue && (
          <div className="triage-no-match" role="status">
            <span className="route-icon" aria-hidden="true">?</span>
            <div><small>{suggestion.confidence === 'ambiguous' ? (language === 'hi' ? 'एक से अधिक रास्ते बराबर मिले' : 'More than one route matched equally') : (language === 'hi' ? 'कोई भरोसेमंद रास्ता मेल नहीं खाया' : 'No confident route match')}</small><strong>{language === 'hi' ? 'नीचे के सात रास्तों में से खुद चुनें' : 'Choose from the seven routes below'}</strong><p>{suggestion.confidence === 'ambiguous'
              ? (language === 'hi' ? `संभावित क्षेत्र: ${suggestion.candidateIds.map((id) => local(resolutionIssues.find((item) => item.id === id)?.title ?? { en: id, hi: id }, language)).join(', ')}। डेमो आपके लिए इनमें से एक नहीं चुनेगा।` : `Possible areas: ${suggestion.candidateIds.map((id) => local(resolutionIssues.find((item) => item.id === id)?.title ?? { en: id, hi: id }, language)).join(', ')}. The demo will not choose between them for you.`)
              : (language === 'hi' ? 'डेमो आपकी बात को किसी वाहन बेमेल या कानूनी निष्कर्ष में नहीं बदलेगा।' : 'The demo will not turn an unmatched description into a vehicle-mismatch or legal conclusion.')}</p></div>
          </div>
        )}
      </section>

      <section className="route-catalogue" aria-labelledby="route-catalogue-title">
        <div className="section-heading">
          <p className="eyebrow"><span />{language === 'hi' ? 'सात काल्पनिक निर्देशित स्थितियाँ' : 'Seven fictional guided scenarios'}</p>
          <h2 id="route-catalogue-title">{language === 'hi' ? 'सबूत से सुरक्षित अगले कदम तक' : 'From supplied evidence to a safer next step'}</h2>
        </div>
        <div className="route-card-grid">
          {resolutionIssues.map((issue) => {
            const href = issue.id === 'wrong-evidence' || issue.id === 'unclear-evidence'
              ? `/demo#intake/${issue.id}`
              : `/demo#route/${issue.id}`;

            return (
              <a key={issue.id} className={`route-card route-stage-${issue.stage}`} href={href} onClick={(event) => openIssue(event, issue.id)}>
                <div className="route-card-top"><span className="route-icon" aria-hidden="true">{issue.icon}</span><small>{stageLabel(issue.stage, language)}</small></div>
                <h3>{local(issue.title, language)}</h3>
                <p>{local(issue.shortDescription, language)}</p>
                <span className="route-output">{local(issue.resultLabel, language)}</span>
                <span className="route-card-cta">{language === 'hi' ? 'काल्पनिक रास्ता खोलें' : 'Open fictional route'} <span aria-hidden="true">→</span></span>
              </a>
            );
          })}
        </div>
      </section>

      <div className="privacy-warning desk-warning" role="note"><span aria-hidden="true">!</span><div><strong>{language === 'hi' ? 'असली निजी जानकारी यहाँ न डालें' : 'Keep real personal data out'}</strong><p>{language === 'hi' ? 'असली वाहन नंबर, नाम, OTP, आधार, भुगतान संदर्भ, इंजन या चेसिस नंबर दर्ज न करें। यह डेस्क केवल काल्पनिक डेटा से चलता है।' : 'Do not enter a real registration, name, OTP, Aadhaar, payment reference, engine number, or chassis number. This desk runs only on fictional data.'}</p></div></div>
    </main>
  );
}

function PaymentReconciliationDemo({ language }: { language: Language }) {
  const [scenarioId, setScenarioId] = useState<PaymentScenarioId>('status-conflict');
  const snapshot = paymentScenarios[scenarioId];
  const result = useMemo(() => reconcilePayment(snapshot), [snapshot]);
  const findingCopy: Record<PaymentFinding, { title: Pair; body: Pair }> = {
    'status-conflict': {
      title: { en: 'Supplied payment record and displayed status conflict', hi: 'दिया भुगतान रिकॉर्ड और दिखाई स्थिति आपस में नहीं मिलते' },
      body: { en: 'The fictional receipt records success while the dated status snapshot still says pending. Verify the pending transaction before paying again.', hi: 'काल्पनिक रसीद सफल बताती है, पर तारीख वाला स्थिति स्क्रीनशॉट पेंडिंग है। दोबारा भुगतान से पहले पेंडिंग लेन-देन जाँचें।' },
    },
    'cannot-reconcile': {
      title: { en: 'The supplied records cannot be reconciled reliably', hi: 'दिए रिकॉर्ड का भरोसेमंद मिलान नहीं हो सकता' },
      body: { en: 'The identifiers, amounts, or payment states do not support a reliable match. Do not rely on these records until the source details are verified.', hi: 'पहचान, रकम या भुगतान स्थिति भरोसेमंद मिलान का समर्थन नहीं करती। स्रोत की जानकारी सत्यापित होने तक इन रिकॉर्ड पर भरोसा न करें।' },
    },
    aligned: {
      title: { en: 'The supplied receipt and status appear aligned', hi: 'दी गई रसीद और स्थिति आपस में मिलती दिखती हैं' },
      body: { en: 'Both fictional records say paid. ChallanSakshi refuses to manufacture a payment complaint.', hi: 'दोनों काल्पनिक रिकॉर्ड भुगतान पूरा बताते हैं। ChallanSakshi भुगतान शिकायत नहीं गढ़ता।' },
    },
  };
  const finding = findingCopy[result.finding];
  const statusLabel = (value: typeof snapshot.displayedStatus) => {
    const labels = {
      pending: { en: 'Pending', hi: 'पेंडिंग' },
      paid: { en: 'Paid', hi: 'भुगतान पूरा' },
      'forwarded-to-virtual-court': { en: 'Forwarded to Virtual Court', hi: 'वर्चुअल कोर्ट भेजा गया' },
    } as const;
    return local(labels[value], language);
  };
  const receiptLabel = (value: typeof snapshot.receiptResult) => {
    const labels = {
      successful: { en: 'Successful', hi: 'सफल' },
      pending: { en: 'Pending', hi: 'पेंडिंग' },
      failed: { en: 'Failed', hi: 'असफल' },
    } as const;
    return local(labels[value], language);
  };

  return (
    <section className="payment-demo" aria-labelledby="payment-demo-title">
      <div className="card-title"><span>01</span><div><h2 id="payment-demo-title">{language === 'hi' ? 'रिकॉर्ड मिलान आज़माएँ' : 'Try the record reconciliation'}</h2><small>{language === 'hi' ? 'पूरी तरह काल्पनिक डेटा' : 'Entirely fictional data'}</small></div></div>
      <div className="scenario-switch" role="group" aria-label={language === 'hi' ? 'भुगतान उदाहरण' : 'Payment example'}>
        {(Object.keys(paymentScenarios) as PaymentScenarioId[]).map((id) => <button type="button" key={id} className={scenarioId === id ? 'active' : ''} aria-pressed={scenarioId === id} onClick={() => setScenarioId(id)}>{local(paymentScenarios[id].label, language)}</button>)}
      </div>
      <div className="payment-record-grid">
        <article><span>{language === 'hi' ? 'चालान रिकॉर्ड कहता है' : 'CHALLAN RECORD SAYS'}</span><strong>{snapshot.challanNumber}</strong><dl><div><dt>{language === 'hi' ? 'रकम' : 'Amount'}</dt><dd>₹{snapshot.challanAmountInr.toLocaleString('en-IN')}</dd></div><div><dt>{language === 'hi' ? 'स्थिति' : 'Status'}</dt><dd>{statusLabel(snapshot.displayedStatus)}</dd></div></dl></article>
        <article><span>{language === 'hi' ? 'रसीद कहती है' : 'RECEIPT SAYS'}</span><strong>{snapshot.receiptChallanNumber}</strong><dl><div><dt>{language === 'hi' ? 'रकम' : 'Amount'}</dt><dd>₹{snapshot.receiptAmountInr.toLocaleString('en-IN')}</dd></div><div><dt>{language === 'hi' ? 'नतीजा' : 'Result'}</dt><dd>{receiptLabel(snapshot.receiptResult)}</dd></div></dl><small>{snapshot.transactionReference}</small></article>
        <article><span>{language === 'hi' ? 'स्थिति स्क्रीनशॉट' : 'STATUS SNAPSHOT'}</span><strong>{statusLabel(snapshot.displayedStatus)}</strong><dl><div><dt>{language === 'hi' ? 'तारीख' : 'Captured'}</dt><dd>{language === 'hi' ? '27 अगस्त 2026' : '27 Aug 2026'}</dd></div><div><dt>{language === 'hi' ? 'भुगतान' : 'Payment'}</dt><dd>{language === 'hi' ? '24 अगस्त 2026' : '24 Aug 2026'}</dd></div></dl></article>
      </div>
      <div className={`payment-finding payment-finding-${result.finding}`}>
        <span aria-hidden="true">{result.finding === 'status-conflict' ? '!' : result.finding === 'cannot-reconcile' ? '?' : '✓'}</span>
        <div><small>{language === 'hi' ? 'नियम-आधारित नतीजा' : 'RULE-BASED FINDING'}</small><h3>{local(finding.title, language)}</h3><p>{local(finding.body, language)}</p><div className="comparison-checks"><b>{result.identifiersMatch ? '✓' : '×'} {language === 'hi' ? 'चालान पहचान' : 'Challan identifier'}</b><b>{result.amountsMatch ? '✓' : '×'} {language === 'hi' ? 'रकम' : 'Amount'}</b><b>i {language === 'hi' ? 'लाइव सत्यापन नहीं' : 'No live verification'}</b></div></div>
      </div>
    </section>
  );
}

function formatCalendarDate(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function PostRejectionClock({ language, orderDate, reviewReferenceDate }: { language: Language; orderDate: string; reviewReferenceDate: string }) {
  const clock = calculatePostRejectionWindow(orderDate, reviewReferenceDate);
  const statusText = clock.status === 'open'
    ? (language === 'hi' ? `${clock.daysRemaining} अनुमानित दिन बाकी` : `${clock.daysRemaining} indicative days remaining`)
    : clock.status === 'final-day'
      ? (language === 'hi' ? 'अनुमानित अंतिम दिन' : 'Indicative final day')
      : (language === 'hi' ? 'बताई अवधि बीत गई—आधिकारिक स्थिति जाँचें' : 'Stated period passed—verify official status');
  return (
    <>
      <section className="post-order-clock">
        <div><small>{language === 'hi' ? 'काल्पनिक आदेश' : 'FICTIONAL ORDER'}</small><strong>{formatCalendarDate(clock.orderDate, language)}</strong></div>
        <span aria-hidden="true">→</span>
        <div className="post-order-days"><b>{clock.daysRemaining}</b><small>{statusText}</small></div>
        <div><small>{language === 'hi' ? 'D+30 सीमा' : 'D+30 BOUNDARY'}</small><strong>{formatCalendarDate(clock.indicativeBoundary, language)}</strong></div>
        <p>{language === 'hi' ? 'केंद्रीय नियम के आधार पर पारदर्शी डेमो गणना। कटऑफ़ और राज्य की प्रक्रिया आधिकारिक आदेश/पोर्टल पर जाँचें।' : 'Transparent demo calculation from the central rule. Verify the cutoff and state implementation on the official order or portal.'}</p>
      </section>
      <section className="post-rejection-choices" aria-labelledby="post-rejection-choices-title">
        <div className="card-title"><span>01</span><div><h2 id="post-rejection-choices-title">{language === 'hi' ? 'दो तटस्थ आधिकारिक रास्ते' : 'Two neutral official routes'}</h2><small>{language === 'hi' ? 'चुनाव नागरिक का है' : 'The choice belongs to the citizen'}</small></div></div>
        <div><article><span aria-hidden="true">₹</span><strong>{language === 'hi' ? 'भुगतान का रास्ता' : 'Payment route'}</strong><p>{language === 'hi' ? 'आदेश में दिखी रकम और मौजूदा आधिकारिक स्थिति जाँचें।' : 'Verify the amount in the order and the current official status.'}</p></article><article><span aria-hidden="true">§</span><strong>{language === 'hi' ? 'अदालत में आवेदन का रास्ता' : 'Court-application route'}</strong><p>{language === 'hi' ? 'केंद्रीय नियम 50% जमा की प्रक्रिया बताता है; सही अदालत और जमा का तरीका राज्य से सत्यापित करें।' : 'The central rule describes a 50% deposit process; verify the appropriate court and state-specified method.'}</p></article></div>
        <p>{language === 'hi' ? 'यह रास्तों का तटस्थ नक्शा है, कानूनी सलाह या किसी एक रास्ते की सिफारिश नहीं।' : 'This is a neutral map of the stated routes—not legal advice or a recommendation to choose either one.'}</p>
      </section>
    </>
  );
}

function AuthorityResponseClock({ language }: { language: Language }) {
  const clock = calculateAuthorityWindow('2026-08-27', '2026-09-27');
  return (
    <section className="post-order-clock authority-response-demo">
      <div><small>{language === 'hi' ? 'काल्पनिक पावती' : 'FICTIONAL ACKNOWLEDGEMENT'}</small><strong>{language === 'hi' ? '27 अगस्त 2026' : '27 Aug 2026'}</strong></div>
      <span aria-hidden="true">→</span>
      <div className="post-order-days"><b>{clock.elapsedDays}</b><small>{language === 'hi' ? 'कैलेंडर दिन बीते' : 'calendar days elapsed'}</small></div>
      <div><small>{language === 'hi' ? '27 सितंबर की स्थिति' : 'STATUS ON 27 SEP'}</small><strong>{language === 'hi' ? 'कोई फैसला दर्ज नहीं' : 'No decision recorded'}</strong></div>
      <p>{language === 'hi' ? 'बताई 30-दिन सीमा से 1 दिन आगे का काल्पनिक उदाहरण। यह अपने आप कानूनी या लाइव पोर्टल नतीजा नहीं है।' : 'Fictional example one day beyond the stated 30-day boundary. This is not an automatic legal or live-portal conclusion.'}</p>
    </section>
  );
}

function CourtHandoff({ language }: { language: Language }) {
  const steps: Pair[] = [
    { en: 'Search the official service with an accepted identifier', hi: 'स्वीकार्य पहचान से आधिकारिक सेवा पर खोजें' },
    { en: 'Verify access only on the official service', hi: 'पहुँच का सत्यापन केवल आधिकारिक सेवा पर करें' },
    { en: 'Choose the displayed payment or request-to-contest action', hi: 'दिखी भुगतान या आपत्ति कार्रवाई चुनें' },
    { en: 'Record the assigned physical court and date', hi: 'मिली भौतिक अदालत और तारीख लिख लें' },
  ];
  return (
    <section className="court-handoff">
      <div className="card-title"><span>01</span><div><h2>{language === 'hi' ? 'आधिकारिक हैंडऑफ़ क्रम' : 'Official handoff sequence'}</h2><small>{language === 'hi' ? 'प्रोटोटाइप कोई केस दाखिल नहीं करता' : 'The prototype never files a case'}</small></div></div>
      <ol>{steps.map((item, index) => <li key={item.en}><span>{index + 1}</span><strong>{local(item, language)}</strong></li>)}</ol>
      <div className="fictional-court-card"><span className="synthetic-chip">{language === 'hi' ? 'काल्पनिक हैंडऑफ़' : 'FICTIONAL HANDOFF'}</span><small>{language === 'hi' ? 'यदि आपत्ति का अनुरोध किया जाए' : 'IF A CONTEST IS REQUESTED'}</small><strong>{language === 'hi' ? 'भौतिक अदालत और तारीख केवल आधिकारिक सेवा तय करती है' : 'Physical court and date are assigned only by the official service'}</strong><p>{language === 'hi' ? 'ChallanSakshi यहाँ कोई अदालत, तारीख या केस नंबर गढ़ता नहीं।' : 'ChallanSakshi does not invent a court, date, or case number here.'}</p></div>
    </section>
  );
}

export function ResolutionRouteView({ language, issueId, onBack, onStartEvidence, postRejectionContext }: {
  language: Language;
  issueId: ResolutionIssueId;
  onBack: () => void;
  onStartEvidence: (issueId: 'wrong-evidence' | 'unclear-evidence') => void;
  postRejectionContext?: { orderDate: string; referenceDate: string };
}) {
  const route = resolutionRoutes[issueId];
  const issue = resolutionIssues.find((item) => item.id === issueId) ?? resolutionIssues[0];
  const stages: ResolutionStage[] = ['evidence', 'authority', 'court', 'payment'];
  const activePostRejectionContext = postRejectionContext ?? { orderDate: referenceDate, referenceDate };
  const linkedPostDecisionClock = issueId === 'grievance-rejected'
    ? calculatePostRejectionWindow(activePostRejectionContext.orderDate, activePostRejectionContext.referenceDate)
    : null;

  const downloadRoute = () => {
    const record = {
      artifact: 'ChallanSakshi fictional route note',
      generatedOn: issueId === 'grievance-rejected' ? activePostRejectionContext.referenceDate : referenceDate,
      syntheticOnly: true,
      issue: issue.id,
      stage: route.eyebrow.en,
      suppliedRecord: route.suppliedRecord.en,
      nextSteps: route.doNow.map((item) => item.en),
      keepReady: route.keepReady.map((item) => item.en),
      limitation: route.cannotConclude.en,
      avoid: route.avoid.en,
      officialLinks: route.officialLinks,
      postDecisionClock: linkedPostDecisionClock,
      disclaimer: 'Information only. Not legal advice. Verify current official routes and deadlines.',
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `challansakshi-route-${issue.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  };

  return (
    <main className="screen-shell shell resolution-route-screen" tabIndex={-1}>
      <BackButton onClick={onBack} language={language} destination={postRejectionContext ? 'order-review' : 'desk'} />
      <nav className="journey-map" aria-label={language === 'hi' ? 'समस्या का क्षेत्र' : 'Problem area'}>
        {stages.map((stage) => <span key={stage} className={issue.stage === stage ? 'active' : ''} aria-current={issue.stage === stage ? 'page' : undefined}><b aria-hidden="true">{stage === 'evidence' ? 'E' : stage === 'authority' ? 'A' : stage === 'court' ? '§' : '₹'}</b>{stageLabel(stage, language)}</span>)}
      </nav>

      <section className={`route-hero route-stage-${issue.stage}`}>
        <span className="route-hero-icon" aria-hidden="true">{issue.icon}</span>
        <div><p>{local(route.eyebrow, language)}</p><h1>{local(route.title, language)}</h1><span>{local(route.summary, language)}</span></div>
      </section>

      {issueId === 'grievance-rejected' && <PostRejectionClock language={language} orderDate={activePostRejectionContext.orderDate} reviewReferenceDate={activePostRejectionContext.referenceDate} />}
      {issueId === 'no-recorded-decision' && <AuthorityResponseClock language={language} />}
      {issueId === 'virtual-court' && <CourtHandoff language={language} />}
      {issueId === 'payment-pending' && <PaymentReconciliationDemo language={language} />}

      <div className="route-detail-grid">
        <section className="route-next-card">
          <div className="card-title"><span>{['grievance-rejected', 'virtual-court', 'payment-pending'].includes(issueId) ? '02' : '01'}</span><div><h2>{language === 'hi' ? 'अभी क्या करें' : 'What to do now'}</h2><small>{language === 'hi' ? 'तथ्य-आधारित, तटस्थ कदम' : 'Factual, neutral steps'}</small></div></div>
          <ol>{route.doNow.map((item, index) => <li key={item.en}><span>{index + 1}</span><p>{local(item, language)}</p></li>)}</ol>
        </section>
        <aside className="route-record-card">
          <span className="synthetic-chip">{language === 'hi' ? 'काल्पनिक रिकॉर्ड' : 'FICTIONAL RECORD'}</span>
          <small>{language === 'hi' ? 'दिया रिकॉर्ड कहता है' : 'SUPPLIED RECORD SAYS'}</small>
          <h2>{local(route.suppliedRecord, language)}</h2>
          <div><strong>{language === 'hi' ? 'सुरक्षित रखें' : 'Keep ready'}</strong><ul>{route.keepReady.map((item) => <li key={item.en}>{local(item, language)}</li>)}</ul></div>
        </aside>
      </div>

      <section className="route-boundaries">
        <article><span aria-hidden="true">?</span><div><h2>{language === 'hi' ? 'यह क्या तय नहीं कर सकता' : 'What this cannot conclude'}</h2><p>{local(route.cannotConclude, language)}</p></div></article>
        <article className="route-avoid"><span aria-hidden="true">!</span><div><h2>{language === 'hi' ? 'यह न करें' : 'Avoid this'}</h2><p>{local(route.avoid, language)}</p></div></article>
      </section>

      <section className="official-handoff">
        <div><p className="eyebrow"><span />{language === 'hi' ? 'आधिकारिक हैंडऑफ़' : 'Official handoff'}</p><h2>{language === 'hi' ? 'अगली कार्रवाई आधिकारिक सेवा पर ही पूरी करें' : 'Complete the next action only on the official service'}</h2><p>{language === 'hi' ? 'नीचे के लिंक जानकारी और मौजूदा स्थिति जाँचने के लिए हैं। ChallanSakshi कोई लॉगिन, OTP, भुगतान या फाइलिंग नहीं संभालता।' : 'These links are for information and current-status verification. ChallanSakshi never handles a login, OTP, payment, or filing.'}</p></div>
        <div className="official-link-stack">{route.officialLinks.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{local(link.label, language)} <span aria-hidden="true">↗</span></a>)}</div>
      </section>

      <div className="route-actions">
        {(issueId === 'wrong-evidence' || issueId === 'unclear-evidence') && <button type="button" className="button button-primary" onClick={() => onStartEvidence(issueId)}>{language === 'hi' ? 'सबूत डेमो खोलें' : 'Open the evidence demo'} <span aria-hidden="true">→</span></button>}
        <button type="button" className="button button-secondary" onClick={downloadRoute}>{language === 'hi' ? 'काल्पनिक रास्ता नोट डाउनलोड करें' : 'Download fictional route note'} <span aria-hidden="true">↓</span></button>
        <button type="button" className="button button-quiet" onClick={onBack}>{postRejectionContext ? (language === 'hi' ? 'आदेश समीक्षा नोट पर वापस' : 'Return to Order Review Note') : (language === 'hi' ? 'दूसरी समस्या चुनें' : 'Choose another problem')}</button>
      </div>
    </main>
  );
}
