'use client';

import { useMemo, useState } from 'react';
import type { Language, LocalizedText } from '../lib/domain';
import type { DemoFixture } from '../lib/fixtures';
import {
  custodyScenarios,
  custodyScenarioAt,
  evaluateCustodyTimeline,
  type CaseAssessment,
  type CustodyAssessment,
  type CustodyFinding,
  type CustodyScenario,
  type CustodyScenarioId,
  type EvidencePassportSnapshot,
  type SuppliedEvidencePassport,
  type SuppliedEvidenceStatus,
} from '../lib/evidence-passport';
import {
  inspectSyntheticNotice,
  syntheticNoticeFixtures,
  type NoticeFixtureId,
  type NoticeRisk,
  type NoticeSignal,
} from '../lib/notice-safety';
import type { CaseLedgerEvent } from '../lib/case-ledger';
import { CaseLedgerTimeline } from './OrderEvidenceReview';

function local(value: LocalizedText, language: Language): string {
  return value[language];
}

const evidenceStatusCopy: Record<SuppliedEvidenceStatus, LocalizedText> = {
  'supplied-readable': { en: 'Supplied and readable', hi: 'दिया गया और पढ़ने योग्य' },
  'supplied-unclear': { en: 'Supplied but unclear', hi: 'दिया गया, पर अस्पष्ट' },
  'not-found': { en: 'Not found in supplied packet', hi: 'दिए पैकेट में नहीं मिला' },
  'not-applicable': { en: 'Not applicable here', hi: 'यहाँ लागू नहीं' },
  'verify-official': { en: 'Requires official verification', hi: 'आधिकारिक जाँच ज़रूरी' },
};

const custodyFindingCopy: Record<CustodyFinding, { title: LocalizedText; body: LocalizedText }> = {
  'temporal-conflict': {
    title: { en: 'Possible time-and-custody conflict', hi: 'समय और वाहन उपयोग में संभावित अंतर' },
    body: { en: 'The alleged event falls outside the confirmed interval in this supplied synthetic record.', hi: 'कथित घटना इस दिए काल्पनिक रिकॉर्ड की पक्की अवधि के बाहर आती है।' },
  },
  'insufficient-record': {
    title: { en: 'Custody boundary cannot be established', hi: 'वाहन उपयोग की समय-सीमा तय नहीं हो सकी' },
    body: { en: 'The supplied interval is missing, invalid, or not confirmed strongly enough for a date comparison.', hi: 'दी अवधि गायब, अमान्य या तारीख मिलाने के लिए पर्याप्त रूप से पक्की नहीं है।' },
  },
  'records-align': {
    title: { en: 'The supplied interval includes the event', hi: 'दी अवधि घटना को शामिल करती है' },
    body: { en: 'ChallanSakshi will not manufacture a custody-mismatch claim from these supplied records.', hi: 'ChallanSakshi इन दिए रिकॉर्ड से वाहन उपयोग में अंतर का दावा नहीं बनाएगा।' },
  },
};

function formatInstant(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export function ReadingDataOptions({
  language,
  easyRead,
  textFirst,
  onEasyReadChange,
  onTextFirstChange,
  onClearCase,
}: {
  language: Language;
  easyRead: boolean;
  textFirst: boolean;
  onEasyReadChange: (value: boolean) => void;
  onTextFirstChange: (value: boolean) => void;
  onClearCase: () => void;
}) {
  return (
    <details className="reading-options">
      <summary>{language === 'hi' ? 'पढ़ने और डेटा के विकल्प' : 'Reading & data options'}</summary>
      <div className="reading-options-panel">
        <button type="button" aria-pressed={easyRead} onClick={() => onEasyReadChange(!easyRead)}>
          <span><strong>{language === 'hi' ? 'सरल दृश्य' : 'Simpler view'}</strong><small>{language === 'hi' ? 'सरल भाषा का सार, खुला लेआउट और हर चरण के लिए साफ़ मार्गदर्शन।' : 'Plain-language summary, roomier layout, and clear guidance for each stage.'}</small></span>
          <b aria-hidden="true">{easyRead ? 'ON' : 'OFF'}</b>
        </button>
        <button type="button" aria-pressed={textFirst} onClick={() => onTextFirstChange(!textFirst)}>
          <span><strong>{language === 'hi' ? 'टेक्स्ट पहले · कम विज़ुअल' : 'Text first · fewer visuals'}</strong><small>{language === 'hi' ? 'फ़ोटो तभी लोड होगी जब आप उसे देखने का विकल्प चुनें।' : 'Demo photos stay unloaded until you choose to view them.'}</small></span>
          <b aria-hidden="true">{textFirst ? 'ON' : 'OFF'}</b>
        </button>
        <p>{language === 'hi' ? 'ये विकल्प केवल दिखावट बदलते हैं—तथ्य, समय-सीमा और नतीजा नहीं।' : 'These preferences change presentation only—not facts, clocks, or findings.'}</p>
        <button type="button" className="clear-case-button" onClick={onClearCase}>{language === 'hi' ? 'इस डिवाइस से स्थानीय केस हटाएँ' : 'Delete local case from this device'}</button>
      </div>
    </details>
  );
}

const noticeFixtureOrder: NoticeFixtureId[] = ['official-route', 'forwarded-unclear', 'apk-message'];

const noticeRiskCopy: Record<NoticeRisk, { title: LocalizedText; body: LocalizedText }> = {
  'pause-and-verify': {
    title: { en: 'Stop and verify independently', hi: 'रुकें और स्वतंत्र रूप से जाँचें' },
    body: { en: 'Do not use the supplied link, install the file, pay, or share a credential. Open the official service yourself.', hi: 'दिए लिंक का इस्तेमाल न करें, फ़ाइल इंस्टॉल न करें, भुगतान या गुप्त जानकारी साझा न करें। आधिकारिक सेवा स्वयं खोलें।' },
  },
  caution: {
    title: { en: 'Source needs independent verification', hi: 'स्रोत की स्वतंत्र जाँच ज़रूरी है' },
    body: { en: 'The destination is obscured or outside the recognised official route. Document the warning sign before acting.', hi: 'मंज़िल छिपी है या पहचाने आधिकारिक रास्ते से बाहर है। कार्रवाई से पहले चेतावनी दर्ज करें।' },
  },
  'no-obvious-indicator': {
    title: { en: 'No obvious warning sign in this synthetic example', hi: 'इस काल्पनिक उदाहरण में साफ़ चेतावनी संकेत नहीं मिला' },
    body: { en: 'The exact official host appears and no unsafe request was found. This does not authenticate the notice.', hi: 'सटीक आधिकारिक होस्ट दिखा और असुरक्षित अनुरोध नहीं मिला। इससे नोटिस असली साबित नहीं होता।' },
  },
};

const signalCopy: Record<NoticeSignal, LocalizedText> = {
  'apk-or-executable': { en: 'APK or executable request', hi: 'APK या executable का अनुरोध' },
  'shortened-link': { en: 'Shortened destination', hi: 'छोटा किया लिंक' },
  'lookalike-domain': { en: 'Lookalike domain wording', hi: 'मिलते-जुलते डोमेन शब्द' },
  'off-domain-link': { en: 'Not the official host', hi: 'आधिकारिक होस्ट नहीं' },
  'credential-request': { en: 'OTP or credential request', hi: 'OTP या गुप्त जानकारी का अनुरोध' },
  'remote-access-request': { en: 'Remote-access or screen-share request', hi: 'रिमोट एक्सेस या स्क्रीन साझा करने का अनुरोध' },
  'personal-payment-request': { en: 'Personal payment destination', hi: 'निजी भुगतान मंज़िल' },
  'urgency-language': { en: 'Urgency or threat wording', hi: 'जल्दी या धमकी वाली भाषा' },
  'official-domain': { en: 'Exact official host appears', hi: 'सटीक आधिकारिक होस्ट दिखा' },
  'insecure-link': { en: 'Link is not HTTPS', hi: 'लिंक HTTPS नहीं है' },
  'unexpected-port': { en: 'Unexpected network port', hi: 'असामान्य नेटवर्क पोर्ट' },
  'embedded-credentials': { en: 'Credentials embedded in link', hi: 'लिंक में गुप्त जानकारी जुड़ी है' },
  'punycode-domain': { en: 'Encoded lookalike domain', hi: 'कोड किया मिलते-जुलता डोमेन' },
};

export function NoticePreflight({ language, onContinue }: { language: Language; onContinue: () => void }) {
  const [fixtureId, setFixtureId] = useState<NoticeFixtureId>('official-route');
  const fixture = syntheticNoticeFixtures[fixtureId];
  const result = useMemo(() => inspectSyntheticNotice(fixture.message), [fixture]);
  const copy = noticeRiskCopy[result.risk];
  return (
    <section className="notice-preflight shell" aria-labelledby="notice-preflight-title">
      <div className="notice-preflight-heading">
        <div><p className="eyebrow"><span />{language === 'hi' ? 'लिंक खोलने से पहले' : 'BEFORE YOU TRUST A NOTICE'}</p><h2 id="notice-preflight-title">{language === 'hi' ? 'संदेश पर कार्रवाई करने से पहले चेतावनी संकेत देखें।' : 'Check warning signs before acting on a message.'}</h2><p>{language === 'hi' ? 'तीन पूरी तरह काल्पनिक संदेश। कोई दिया लिंक खोला या जाँचा नहीं जाता।' : 'Three entirely synthetic messages. No supplied destination is opened or fetched.'}</p></div>
        <span className="preflight-boundary">{language === 'hi' ? 'न लिंक प्रमाणपत्र · न धोखाधड़ी का फैसला' : 'NOT LINK CERTIFICATION · NOT A FRAUD VERDICT'}</span>
      </div>
      <div className="preflight-layout">
        <fieldset className="preflight-fixtures"><legend>{language === 'hi' ? 'काल्पनिक संदेश चुनें' : 'Choose a synthetic message'}</legend>{noticeFixtureOrder.map((id) => <label key={id}><input type="radio" name="notice-fixture" value={id} checked={fixtureId === id} onChange={() => setFixtureId(id)} /><span><strong>{local(syntheticNoticeFixtures[id].label, language)}</strong><small>{id === 'official-route' ? (language === 'hi' ? 'पहचाना डोमेन · कोई गुप्त जानकारी नहीं' : 'Recognised host · no credential request') : id === 'forwarded-unclear' ? (language === 'hi' ? 'छोटे लिंक के पीछे मंज़िल नहीं दिखती' : 'Destination hidden behind a short link') : (language === 'hi' ? 'APK और तुरंत कार्रवाई का दबाव' : 'APK plus immediate-action pressure')}</small></span></label>)}</fieldset>
        <article className={`preflight-result risk-${result.risk}`} aria-live="polite">
          <small>{language === 'hi' ? 'नियम-आधारित नतीजा' : 'DETERMINISTIC PREFLIGHT'}</small>
          <h3>{local(copy.title, language)}</h3>
          <p>{local(copy.body, language)}</p>
          <code>{fixture.message}</code>
          <div className="preflight-signals">{result.signals.map((signal) => <span key={signal}>{local(signalCopy[signal], language)}</span>)}</div>
          <p className="preflight-caveat">{language === 'hi' ? 'यह जाँच चेतावनी संकेत बताती है। यह लिंक को सुरक्षित प्रमाणित नहीं करती और धोखाधड़ी साबित नहीं करती।' : 'This check identifies warning signs. It does not certify a link as safe or prove fraud.'}</p>
          <div className="preflight-actions">
            <a className="button button-secondary" href="https://echallan.parivahan.gov.in/" target="_blank" rel="noreferrer">{language === 'hi' ? 'आधिकारिक सेवा स्वयं खोलें' : 'Open official service yourself'} ↗</a>
            {result.risk === 'pause-and-verify' && <a href="https://cybercrime.gov.in/Webform/cyber_suspect.aspx" target="_blank" rel="noreferrer">{language === 'hi' ? 'संदिग्ध पहचान रिपोर्ट करने का आधिकारिक रास्ता' : 'Official suspect-reporting route'} ↗</a>}
            {result.risk === 'no-obvious-indicator' && <button className="button button-primary" type="button" onClick={onContinue}>{language === 'hi' ? 'काल्पनिक सबूत समीक्षा जारी रखें' : 'Continue to fictional evidence review'} <span aria-hidden="true">→</span></button>}
          </div>
        </article>
      </div>
    </section>
  );
}

export function EvidencePassportStrip({ language, snapshot, assessment, onOpen }: {
  language: Language;
  snapshot: EvidencePassportSnapshot | null;
  assessment: CaseAssessment;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="passport-strip" onClick={onOpen}>
      <span className="passport-stamp" aria-hidden="true">EP</span>
      <span><small>{language === 'hi' ? 'स्थानीय सबूत रिकॉर्ड · सरकारी दस्तावेज़ नहीं' : 'LOCAL EVIDENCE PASSPORT · NOT GOVERNMENT-ISSUED'}</small><strong>{snapshot ? (language === 'hi' ? 'नागरिक-पुष्टि रिविज़न तैयार' : 'Citizen-confirmed revision ready') : (language === 'hi' ? 'ड्राफ़्ट समीक्षा पूरी करें' : 'Complete the draft review')}</strong><em>{assessment.grounds.length} {language === 'hi' ? 'सबूत से जुड़े समीक्षा बिंदु' : 'evidence-linked review point(s)'} · {snapshot?.revisionId ?? (language === 'hi' ? 'अभी फ्रीज़ नहीं' : 'not frozen yet')}</em></span>
      <b>{language === 'hi' ? 'खोलें' : 'Open'} →</b>
    </button>
  );
}

function Timeline({ scenario, assessment, language }: { scenario: CustodyScenario; assessment: CustodyAssessment; language: Language }) {
  const interval = scenario.intervals[0];
  const points = [
    { id: 'start', at: interval.startsAt, label: language === 'hi' ? 'दी अवधि शुरू' : 'Supplied interval starts' },
    { id: 'event', at: scenario.eventAt, label: language === 'hi' ? 'कथित घटना' : 'Alleged event' },
    ...(interval.endsAt ? [{ id: 'end', at: interval.endsAt, label: language === 'hi' ? 'दी अवधि समाप्त' : 'Supplied interval ends' }] : []),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return (
    <div className="custody-timeline">
      <ol>{points.map((point) => <li key={point.id} className={point.id === 'event' ? 'incident' : ''}><span aria-hidden="true" /><div><strong>{point.label}</strong><time dateTime={point.at}>{formatInstant(point.at, language)}</time></div></li>)}</ol>
      <dl><div><dt>{language === 'hi' ? 'स्रोत' : 'Source'}</dt><dd>{local(interval.sourceLabel, language)}</dd></div><div><dt>{language === 'hi' ? 'रिकॉर्ड स्थिति' : 'Record status'}</dt><dd>{interval.verificationStatus === 'confirmed' ? (language === 'hi' ? 'डेमो में पक्का' : 'Confirmed in demo') : (language === 'hi' ? 'अस्पष्ट / अपुष्ट' : 'Unclear / unverified')}</dd></div><div><dt>{language === 'hi' ? 'सबूत संदर्भ' : 'Evidence reference'}</dt><dd>{interval.evidenceReference}</dd></div></dl>
      {assessment.minutesFromClosestBoundary !== null && assessment.finding === 'temporal-conflict' && <p>{language === 'hi' ? `निकटतम पक्की सीमा से ${Math.round(assessment.minutesFromClosestBoundary / 60)} घंटे दूर।` : `${Math.round(assessment.minutesFromClosestBoundary / 60)} hours from the nearest confirmed boundary.`}</p>}
    </div>
  );
}

export function EvidencePassportScreen({
  language,
  fixture,
  suppliedEvidence,
  custodyScenarioId,
  custodyReviewed,
  scopeReviewed,
  snapshot,
  assessment,
  ledgerEvents,
  error,
  frozen = false,
  onCustodyScenarioChange,
  onCustodyReviewedChange,
  onScopeReviewedChange,
  onContinue,
  onBack,
  onDownloadText,
}: {
  language: Language;
  fixture: DemoFixture;
  suppliedEvidence: SuppliedEvidencePassport;
  custodyScenarioId: CustodyScenarioId;
  custodyReviewed: boolean;
  scopeReviewed: boolean;
  snapshot: EvidencePassportSnapshot | null;
  assessment: CaseAssessment;
  ledgerEvents: CaseLedgerEvent[];
  error: string;
  frozen?: boolean;
  onCustodyScenarioChange: (value: CustodyScenarioId) => void;
  onCustodyReviewedChange: (value: boolean) => void;
  onScopeReviewedChange: (value: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
  onDownloadText: () => void;
}) {
  const custodyScenario = snapshot?.custodyScenario ?? custodyScenarioAt(custodyScenarioId, fixture.incidentAt);
  const custodyAssessment = evaluateCustodyTimeline(custodyScenario);
  const findingCopy = custodyFindingCopy[custodyAssessment.finding];
  return (
    <main className="screen-shell shell evidence-passport-screen" tabIndex={-1}>
      <button className="back-button" type="button" onClick={onBack}><span aria-hidden="true">←</span>{frozen ? (language === 'hi' ? 'केस स्थिति पर वापस' : 'Back to case status') : (language === 'hi' ? 'नतीजे पर वापस' : 'Back to finding')}</button>
      <header className="passport-hero"><div><p className="eyebrow"><span />{language === 'hi' ? 'स्थानीय सबूत पासपोर्ट' : 'LOCAL EVIDENCE PASSPORT'}</p><h1>{language === 'hi' ? 'पहचान, समय और दिए रिकॉर्ड—एक साथ।' : 'Identity, time, and supplied records—together.'}</h1><p>{language === 'hi' ? 'नागरिक द्वारा जाँचे रिकॉर्ड को एक स्थानीय रिविज़न में जोड़ें। यह सरकारी पहचान, आधिकारिक सत्यापन या कानूनी कस्टडी श्रृंखला नहीं है।' : 'Organise citizen-reviewed records into one local revision. It is not government identity, official verification, or a legal chain of custody.'}</p></div><div className="passport-id"><span>LOCAL · SYNTHETIC</span><strong>{snapshot?.revisionId ?? 'DRAFT · NOT FROZEN'}</strong><small>{fixture.challanNumber}</small></div></header>

      <section className="passport-questions" aria-label={language === 'hi' ? 'तीन मुख्य सवाल' : 'Three core questions'}>
        <article><span>01</span><small>{language === 'hi' ? 'पहचान' : 'IDENTITY'}</small><strong>{assessment.visual.finding === 'mismatch' ? (language === 'hi' ? 'दिए वाहन विवरण अलग' : 'Supplied vehicle details differ') : assessment.visual.finding === 'inconclusive' ? (language === 'hi' ? 'फ़ोटो साफ़ नहीं' : 'Image remains unclear') : (language === 'hi' ? 'दिए वाहन विवरण मेल खाते हैं' : 'Supplied vehicle details align')}</strong></article>
        <article><span>02</span><small>{language === 'hi' ? 'समय और वाहन उपयोग' : 'TIME & CUSTODY'}</small><strong>{local(findingCopy.title, language)}</strong></article>
        <article><span>03</span><small>{language === 'hi' ? 'दिया रिकॉर्ड' : 'SUPPLIED PACKET'}</small><strong>{suppliedEvidence.counts['not-found']} {language === 'hi' ? 'चीज़ें दिए पैकेट में नहीं मिलीं' : 'items not found in the supplied packet'}</strong></article>
      </section>

      <section className="passport-section custody-section" aria-labelledby="custody-title">
        <div className="passport-section-heading"><span>01</span><div><h2 id="custody-title">{language === 'hi' ? 'वाहन संबंध और उपयोग समय' : 'Vehicle relationship & custody timeline'}</h2><p>{language === 'hi' ? 'यह केवल दिए समय रिकॉर्ड से तुलना है। यह ड्राइवर नहीं पहचानती और जिम्मेदारी तय नहीं करती।' : 'This compares only supplied time records. It does not identify the driver or decide responsibility.'}</p></div></div>
        <fieldset className="custody-scenarios" disabled={frozen}><legend>{language === 'hi' ? 'काल्पनिक संबंध उदाहरण' : 'Synthetic relationship scenario'}</legend>{(Object.keys(custodyScenarios) as CustodyScenarioId[]).map((id) => <label key={id}><input type="radio" name="custody-scenario" value={id} checked={custodyScenarioId === id} onChange={() => onCustodyScenarioChange(id)} /><span><strong>{local(custodyScenarios[id].title, language)}</strong><small>{local(custodyScenarios[id].shortDescription, language)}</small></span></label>)}</fieldset>
        <div className={`custody-finding finding-${custodyAssessment.finding}`}><div><small>{language === 'hi' ? 'नियम-आधारित समय तुलना' : 'DETERMINISTIC TIME COMPARISON'}</small><h3>{local(findingCopy.title, language)}</h3><p>{local(findingCopy.body, language)}</p></div><span>{custodyAssessment.finding === 'temporal-conflict' ? '!' : custodyAssessment.finding === 'records-align' ? '✓' : '?'}</span></div>
        <Timeline scenario={custodyScenario} assessment={custodyAssessment} language={language} />
        <label className="passport-confirmation"><input id="custody-confirmation" type="checkbox" checked={custodyReviewed} disabled={frozen} onChange={(event) => onCustodyReviewedChange(event.target.checked)} /><span><strong>{language === 'hi' ? 'मैंने इस काल्पनिक समय-रेखा और स्रोत को जाँचा।' : 'I reviewed this synthetic timeline and its source.'}</strong>{language === 'hi' ? ' इससे ड्राइवर, कानूनी मालिक या जिम्मेदार व्यक्ति तय नहीं होता।' : ' It does not determine the driver, legal owner, or responsible person.'}</span></label>
      </section>

      <section className="passport-section supplied-passport" aria-labelledby="supplied-passport-title">
        <div className="passport-section-heading"><span>02</span><div><h2 id="supplied-passport-title">{language === 'hi' ? 'दिए सबूत की पूर्णता सूची' : 'Supplied-evidence completeness passport'}</h2><p>{language === 'hi' ? 'यह बताता है कि इस काल्पनिक पैकेट में क्या मिला। यह कानूनी पर्याप्तता, असलियत या स्वीकार्यता तय नहीं करता।' : 'This records what appears in this fictional packet. It does not decide legal sufficiency, authenticity, or admissibility.'}</p></div></div>
        <div className="passport-counts">{(Object.keys(evidenceStatusCopy) as SuppliedEvidenceStatus[]).map((status) => <article key={status} className={`status-${status}`}><b>{suppliedEvidence.counts[status]}</b><span>{local(evidenceStatusCopy[status], language)}</span></article>)}</div>
        <div className="passport-evidence-list">{suppliedEvidence.elements.map((element) => <article key={element.id}><b>{element.id}</b><div><strong>{local(element.label, language)}</strong><small>{local(element.sourceReference, language)}</small><p>{local(element.note, language)}</p></div><span className={`passport-status status-${element.status}`}>{local(evidenceStatusCopy[element.status], language)}</span></article>)}</div>
        <label className="passport-confirmation"><input id="passport-scope-confirmation" type="checkbox" checked={scopeReviewed} disabled={frozen} onChange={(event) => onScopeReviewedChange(event.target.checked)} /><span><strong>{language === 'hi' ? 'मैंने केवल दिए काल्पनिक पैकेट का दायरा जाँचा।' : 'I reviewed the scope of the supplied fictional packet only.'}</strong>{language === 'hi' ? ' “नहीं मिला” का अर्थ यह नहीं कि रिकॉर्ड कहीं और मौजूद नहीं है या चालान अमान्य है।' : ' “Not found” does not mean the record does not exist elsewhere or that the challan is invalid.'}</span></label>
      </section>

      <section className="passport-section passport-history"><div className="passport-section-heading"><span>03</span><div><h2>{language === 'hi' ? 'स्थानीय सबूत इतिहास' : 'Local evidence history'}</h2><p>{language === 'hi' ? 'स्रोत, विश्लेषण, नागरिक पुष्टि और नियम अलग-अलग दर्ज हैं—आधिकारिक कस्टडी श्रृंखला नहीं।' : 'Source, analysis, citizen confirmation, and rules stay separate—not an official chain of custody.'}</p></div></div><CaseLedgerTimeline events={ledgerEvents} language={language} compact /></section>

      {error && <p className="order-form-error" role="alert">{error}</p>}
      <div className="passport-action-bar"><div><strong>{snapshot ? (frozen ? (language === 'hi' ? 'जमा किया स्थानीय रिविज़न · केवल पढ़ने के लिए' : 'Submitted local revision · read only') : (language === 'hi' ? 'स्थानीय पासपोर्ट रिविज़न तैयार' : 'Local passport revision ready')) : (language === 'hi' ? 'दो पुष्टियाँ बाकी हो सकती हैं' : 'Both review confirmations are required')}</strong><span>{snapshot?.revisionId ?? (language === 'hi' ? 'यह क्रिप्टोग्राफ़िक प्रमाण नहीं है।' : 'This is not a cryptographic integrity proof.')}</span></div><div>{snapshot && <button type="button" className="button button-secondary" onClick={onDownloadText}>{language === 'hi' ? 'टेक्स्ट पासपोर्ट' : 'Text passport'} ↓</button>}<button type="button" className="button button-primary" onClick={onContinue}>{frozen ? (language === 'hi' ? 'केस स्थिति पर लौटें' : 'Return to case status') : assessment.canPreparePack ? (language === 'hi' ? 'पैक की तैयारी देखें' : 'Review pack readiness') : (language === 'hi' ? 'सुरक्षित नतीजा देखें' : 'Review safe outcome')} <span aria-hidden="true">→</span></button></div></div>
    </main>
  );
}
