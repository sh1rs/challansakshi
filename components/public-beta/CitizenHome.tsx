'use client';
import { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, CarFront, ChevronDown, CircleHelp, ClipboardCheck,
  FileSearch, FileText, Image, Landmark, MessageSquareWarning, ReceiptText,
  Route, Search, ShieldCheck, Upload,
} from 'lucide-react';
import { CitizenFooter, CitizenHeader } from '../shared/CitizenChrome';
import styles from './CitizenHome.module.css';

type Language = 'en' | 'hi';

const capabilities = [
  { id: 'verify', Icon: Search },
  { id: 'understand', Icon: FileText },
  { id: 'evidence', Icon: Image },
  { id: 'resolve', Icon: Route },
] as const;
const journeyIcons = [Upload, FileSearch, ClipboardCheck];
const situationIcons = [CircleHelp, CarFront, ReceiptText, MessageSquareWarning, Landmark];

const copy = {
  en: {
    eyebrow: 'Free civic help. Built for everyone.',
    heading: 'What happened with your challan?',
    supporting: 'A confusing notice should not leave you stuck. Understand your e-Challan, compare your records, and prepare your next step with confidence.',
    capabilities: [
      {
        title: 'Verify',
        question: 'Is this challan connected to you or your vehicle?',
        action: 'What to check',
        detail: 'Start with a record you obtained from an official service. Compare its vehicle registration, challan number, date and place with what you know. A message alone does not confirm the record.',
      },
      {
        title: 'Understand',
        question: 'What does the notice, payment status or court update say?',
        action: 'Read the details',
        detail: 'Bring your notice or screenshot to read its details with their source. Check the offence wording, amount and status against the original. If something is missing or unclear, confirm it with the official service.',
      },
      {
        title: 'Check evidence',
        question: 'Do the visible details agree with the record and your vehicle?',
        action: 'What to compare',
        detail: 'Compare the text and details you can identify in the supplied records and photographs. Keep unclear details marked as uncertain. A photograph may not show enough to establish what happened.',
      },
      {
        title: 'Resolve',
        question: 'What should you have ready for the official next step?',
        action: 'Plan your next step',
        detail: 'Gather the confirmed details, supporting records and questions you need to raise. Follow the issuing authority or court named in your record. You complete any payment or submission on the official service.',
      },
    ],
    review: 'Review my challan',
    reviewHint: 'Start with a notice, PDF or screenshot.',
    reassurance: 'No account needed · Documents read on this device by default',
    journeyHeading: 'From your document to a clearer next step',
    journeySupporting: 'Bring what you have. Check what it says. Decide how to proceed.',
    journey: [
      { title: 'Bring your record', body: 'Choose the notice, PDF or screenshot you received or saved from the official service.' },
      { title: 'Check the reading', body: 'Review details alongside their source. Correct anything unclear before you rely on it.' },
      { title: 'Prepare your next step', body: 'Keep the useful facts and questions together, then continue on the appropriate official service.' },
    ],
    manualPrompt: 'No usable document?',
    manualBody: 'You can enter the details yourself.',
    manualAction: 'Review manually',
    situationsHeading: 'Your situation might be…',
    situationsSupporting: 'A few things to look for before you act.',
    situations: [
      { title: 'I do not recognise this challan', body: 'Look up the record on the official service. Check the registration, date and place before deciding whether it relates to you.' },
      { title: 'The photograph may show another vehicle', body: 'Compare the visible registration and vehicle details with the notice. Keep the original image and note anything you cannot read clearly.' },
      { title: 'I already paid', body: 'Keep the payment receipt and transaction reference. Compare them with the current official status before making another payment.' },
      { title: 'My grievance was rejected', body: 'Read the reason given in the response. Keep that response with your original records and check the next route offered by the issuing authority.' },
      { title: 'My case moved to Virtual Court', body: 'Check the court and case details named in the notice. Use the relevant official court service to confirm the current status and available options.' },
    ],
    otherHeading: 'Something else to check?',
    messageTitle: 'Only have an SMS or a link?',
    messageBody: 'Check a pasted message on this device for suspicious links and requests, then find the official record.',
    messageAction: 'Check a message safely',
    fastagTitle: 'A FASTag transaction issue?',
    fastagBody: 'Compare the debit and transaction details, then find the appropriate official support route.',
    fastagAction: 'Check a FASTag transaction',
  },
  hi: {
    eyebrow: 'निःशुल्क नागरिक सहायता। सभी के लिए।',
    heading: 'आपके चालान के साथ क्या हुआ?',
    supporting: 'उलझन भरे नोटिस पर अटकें नहीं। अपना ई-चालान समझें, रिकॉर्ड की तुलना करें और अगले कदम की तैयारी करें।',
    capabilities: [
      {
        title: 'सत्यापित करें',
        question: 'क्या यह चालान आपसे या आपके वाहन से जुड़ा है?',
        action: 'क्या जाँचना है',
        detail: 'आधिकारिक सेवा से मिले रिकॉर्ड से शुरुआत करें। वाहन नंबर, चालान नंबर, तारीख और स्थान की तुलना अपनी जानकारी से करें। केवल संदेश मिलना रिकॉर्ड की पुष्टि नहीं करता।',
      },
      {
        title: 'समझें',
        question: 'नोटिस, भुगतान की स्थिति या अदालत का अपडेट क्या कहता है?',
        action: 'विवरण समझें',
        detail: 'नोटिस या स्क्रीनशॉट लाएँ और विवरण को उसके स्रोत के साथ पढ़ें। उल्लंघन का विवरण, राशि और स्थिति मूल रिकॉर्ड से मिलाएँ। कुछ अस्पष्ट या गायब हो तो आधिकारिक सेवा से पुष्टि करें।',
      },
      {
        title: 'सबूत जाँचें',
        question: 'क्या दिखाई देने वाली जानकारी रिकॉर्ड और आपके वाहन से मेल खाती है?',
        action: 'क्या तुलना करें',
        detail: 'दिए गए रिकॉर्ड और तस्वीरों में जो पाठ और विवरण आप पहचान सकते हैं, उनकी तुलना करें। अस्पष्ट विवरण को अनिश्चित ही रखें। तस्वीर में घटना की पुष्टि के लिए पर्याप्त जानकारी न भी हो सकती है।',
      },
      {
        title: 'अगला कदम चुनें',
        question: 'आधिकारिक अगले कदम के लिए क्या तैयार रखना चाहिए?',
        action: 'आगे की तैयारी',
        detail: 'पुष्टि किए गए विवरण, सहायक रिकॉर्ड और पूछने वाले सवाल साथ रखें। रिकॉर्ड में दिए जारीकर्ता विभाग या अदालत के निर्देश देखें। भुगतान या सबमिशन आप स्वयं आधिकारिक सेवा पर पूरा करते हैं।',
      },
    ],
    review: 'मेरे चालान की समीक्षा करें',
    reviewHint: 'नोटिस, PDF या स्क्रीनशॉट से शुरुआत करें।',
    reassurance: 'खाता ज़रूरी नहीं · दस्तावेज़ डिफ़ॉल्ट रूप से इसी डिवाइस पर पढ़े जाते हैं',
    journeyHeading: 'आपके दस्तावेज़ से एक स्पष्ट अगले कदम तक',
    journeySupporting: 'जो आपके पास है, उसे लाएँ। विवरण जाँचें। आगे बढ़ने का तरीका चुनें।',
    journey: [
      { title: 'अपना रिकॉर्ड लाएँ', body: 'मिला हुआ या आधिकारिक सेवा से सहेजा गया नोटिस, PDF या स्क्रीनशॉट चुनें।' },
      { title: 'पढ़े गए विवरण जाँचें', body: 'जानकारी को उसके स्रोत के साथ देखें। भरोसा करने से पहले अस्पष्ट विवरण सुधारें।' },
      { title: 'अगले कदम की तैयारी करें', body: 'ज़रूरी तथ्य और सवाल साथ रखें, फिर उचित आधिकारिक सेवा पर आगे बढ़ें।' },
    ],
    manualPrompt: 'उपयोग करने योग्य दस्तावेज़ नहीं है?',
    manualBody: 'आप विवरण स्वयं दर्ज कर सकते हैं।',
    manualAction: 'विवरण स्वयं भरें',
    situationsHeading: 'आपकी स्थिति हो सकती है…',
    situationsSupporting: 'कदम उठाने से पहले इन बातों पर ध्यान दें।',
    situations: [
      { title: 'मैं इस चालान को नहीं पहचानता', body: 'आधिकारिक सेवा पर रिकॉर्ड देखें। यह आपसे संबंधित है या नहीं, तय करने से पहले वाहन नंबर, तारीख और स्थान जाँचें।' },
      { title: 'तस्वीर में कोई दूसरा वाहन हो सकता है', body: 'दिखाई देने वाले वाहन नंबर और विवरण को नोटिस से मिलाएँ। मूल तस्वीर रखें और जो साफ़ न दिखे उसे नोट करें।' },
      { title: 'मैं भुगतान कर चुका हूँ', body: 'भुगतान की रसीद और लेन-देन संदर्भ रखें। दोबारा भुगतान करने से पहले इन्हें मौजूदा आधिकारिक स्थिति से मिलाएँ।' },
      { title: 'मेरी शिकायत अस्वीकार हो गई', body: 'जवाब में दिया कारण पढ़ें। जवाब को मूल रिकॉर्ड के साथ रखें और जारीकर्ता विभाग द्वारा बताया गया अगला रास्ता देखें।' },
      { title: 'मेरा मामला Virtual Court में चला गया', body: 'नोटिस में दिए अदालत और मामले के विवरण जाँचें। वर्तमान स्थिति और उपलब्ध विकल्पों की पुष्टि संबंधित आधिकारिक अदालत सेवा पर करें।' },
    ],
    otherHeading: 'कुछ और जाँचना है?',
    messageTitle: 'केवल SMS या लिंक मिला है?',
    messageBody: 'पेस्ट किए संदेश में संदिग्ध लिंक और माँगें इसी डिवाइस पर जाँचें, फिर आधिकारिक रिकॉर्ड तक पहुँचें।',
    messageAction: 'संदेश सुरक्षित ढंग से जाँचें',
    fastagTitle: 'FASTag लेन-देन की समस्या?',
    fastagBody: 'डेबिट और लेन-देन के विवरण की तुलना करें, फिर उचित आधिकारिक सहायता का रास्ता पाएँ।',
    fastagAction: 'FASTag लेन-देन जाँचें',
  },
} as const;

export default function CitizenHome({ initialLanguage = 'en' }: { initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const text = copy[language];

  return <div className={styles.page} lang={language}>
    <CitizenHeader language={language} setLanguage={setLanguage} />
    <main className={styles.main} lang={language}>
      <section className={styles.hero} aria-labelledby="citizen-home-heading">
        <div className={styles.heroIntro}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h1 id="citizen-home-heading">{text.heading}</h1>
        <p className={styles.supporting}>{text.supporting}</p>
        <div className={styles.startReview}>
          <a className={styles.primaryAction} href="/review"><FileSearch size={20} aria-hidden="true" /><span>{text.review}</span><ArrowRight size={20} aria-hidden="true" /></a>
          <p>{text.reviewHint}</p><a className={styles.secondaryAction} href="/mobility">{language === 'hi' ? 'मेरे मामले और दूसरे मोबिलिटी काम' : 'My cases and other mobility tasks'}<ArrowRight size={18} aria-hidden="true" /></a>
        </div>
        <p className={styles.reassurance}><ShieldCheck size={18} aria-hidden="true" /><span>{text.reassurance}</span></p>
        <div className={styles.heroNote}><span aria-hidden="true" className={styles.noteMark}>↳</span><span>{language === 'hi' ? 'आपकी जानकारी। आपका निर्णय। हर कदम पर आपका नियंत्रण।' : 'Your information. Your decision. You stay in control.'}</span></div>
        </div>
        <div className={styles.capabilityList}>
          <div className={styles.capabilityHeading}><span>{language === 'hi' ? 'यहाँ से आगे बढ़ें' : 'A little clarity goes a long way'}</span><span aria-hidden="true">01 — 04</span></div>
          {capabilities.map(({ id, Icon }, index) => {
            const capability = text.capabilities[index];
            return <details className={styles.capability} data-home-capability={id} key={id}>
              <summary>
                <span className={styles.capabilityIcon} aria-hidden="true"><Icon size={26} strokeWidth={1.7} /></span>
                <span className={styles.capabilityCopy}><span className={styles.capabilityTitle}>{capability.title}</span><span className={styles.capabilityQuestion}>{capability.question}</span></span>
                <span className={styles.disclosureAction}><span>{capability.action}</span><ChevronDown size={18} aria-hidden="true" /></span>
              </summary>
              <div className={styles.capabilityDetail}><p>{capability.detail}</p></div>
            </details>;
          })}
        </div>
      </section>

      <section className={styles.journey} aria-labelledby="citizen-journey-heading">
        <div className={styles.sectionHeading}><h2 id="citizen-journey-heading">{text.journeyHeading}</h2><p>{text.journeySupporting}</p></div>
        <ol>
          {text.journey.map((step, index) => {
            const Icon = journeyIcons[index];
            return <li key={index}>
              <div className={styles.journeyMarker}><span className={styles.stepNumber}>{index + 1}</span><Icon size={27} strokeWidth={1.6} aria-hidden="true" /></div>
              <div><h3>{step.title}</h3><p>{step.body}</p></div>
            </li>;
          })}
        </ol>
        <div className={styles.manualEntry}>
          <p><strong>{text.manualPrompt}</strong> <span>{text.manualBody}</span></p>
          <a href="/manual/challan">{text.manualAction}<ArrowRight size={18} aria-hidden="true" /></a>
        </div>
      </section>

      <div className={styles.helpGrid}>
        <section className={styles.situations} aria-labelledby="citizen-situations-heading">
          <div className={styles.sectionHeading}><h2 id="citizen-situations-heading">{text.situationsHeading}</h2><p>{text.situationsSupporting}</p></div>
          <div className={styles.situationList}>
            {text.situations.map((situation, index) => {
              const Icon = situationIcons[index];
              return <details className={styles.situation} key={index}>
                <summary><Icon size={20} aria-hidden="true" /><span>{situation.title}</span><ChevronDown size={18} aria-hidden="true" /></summary>
                <p>{situation.body}</p>
              </details>;
            })}
          </div>
        </section>

        <aside className={styles.otherChecks} aria-labelledby="citizen-other-heading">
          <h2 id="citizen-other-heading">{text.otherHeading}</h2>
          <div className={styles.doorway} data-tone="amber">
            <span className={styles.doorwayIcon}><MessageSquareWarning size={25} strokeWidth={1.7} aria-hidden="true" /></span>
            <div><h3>{text.messageTitle}</h3><p>{text.messageBody}</p><a href="/message-check">{text.messageAction}<ArrowUpRight size={18} aria-hidden="true" /></a></div>
          </div>
          <div className={styles.doorway}>
            <span className={styles.doorwayIcon}><ReceiptText size={25} strokeWidth={1.7} aria-hidden="true" /></span>
            <div><h3>{text.fastagTitle}</h3><p>{text.fastagBody}</p><a href="/fastag">{text.fastagAction}<ArrowUpRight size={18} aria-hidden="true" /></a></div>
          </div>
        </aside>
      </div>
      <section className={styles.followUp} aria-labelledby="follow-up-heading">
        <div className={styles.sectionHeading}><h2 id="follow-up-heading">{language === 'hi' ? 'अगले कदम तक साथ' : 'Stay with your next step'}</h2><p>{language === 'hi' ? 'उत्तर समझें, काम याद रखें और स्रोत जाँचें।' : 'Understand a reply, remember a follow-up, and see the sources behind the guidance.'}</p></div>
        <div className={styles.followUpLinks}>
          <a href="/reply-review"><MessageSquareWarning size={22} aria-hidden="true" /><span><strong>{language === 'hi' ? 'प्राधिकरण का उत्तर जाँचें' : 'Review an authority reply'}</strong><small>{language === 'hi' ? 'उत्तर के अंश अपने मुद्दों से जोड़ें।' : 'Link passages to the points you raised.'}</small></span><ArrowRight size={18} aria-hidden="true" /></a>
          <a href="/dashboard"><ClipboardCheck size={22} aria-hidden="true" /><span><strong>{language === 'hi' ? 'मेरी मोबिलिटी सूची' : 'My mobility checklist'}</strong><small>{language === 'hi' ? 'अपने निजी डिवाइस पर अगले कदम रखें।' : 'Keep next steps on your private device.'}</small></span><ArrowRight size={18} aria-hidden="true" /></a>
          <a href="/sources"><Landmark size={22} aria-hidden="true" /><span><strong>{language === 'hi' ? 'आधिकारिक स्रोत देखें' : 'Explore official sources'}</strong><small>{language === 'hi' ? 'रास्ते, समीक्षा की तारीख और सीमाएँ।' : 'Routes, review dates and limitations.'}</small></span><ArrowRight size={18} aria-hidden="true" /></a>
        </div>
      </section>
    </main>
    <CitizenFooter language={language} />
  </div>;
}
