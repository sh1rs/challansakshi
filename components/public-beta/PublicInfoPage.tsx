'use client';

import { useState, type ReactNode } from 'react';
import type { Language } from '../../lib/domain';
import { PublicBetaShell, publicBetaStyles as styles } from './PublicBetaShell';

function t(language: Language, en: string, hi: string) { return language === 'hi' ? hi : en; }

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.infoSection}><h2>{title}</h2>{children}</section>;
}

export function PrivacyPage() {
  const [language, setLanguage] = useState<Language>('en');
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="गोपनीयता और डेटा नियंत्रण">
    <main className={styles.infoPage}>
      <p className={styles.eyebrow}>{t(language, 'Version 1 · reviewed 28 August 2026', 'संस्करण 1 · समीक्षा 28 अगस्त 2026')}</p>
      <h1>{t(language, 'Privacy that matches the implementation', 'गोपनीयता जो कार्यप्रणाली से मेल खाती है')}</h1>
      <p>{t(language, 'The real-mode Challan and FASTag tools are deliberately small: no accounts, no uploads, no pasted documents, no case database, and no AI analysis. This notice distinguishes those tools from the separate synthetic demo.', 'रियल-मोड चालान और FASTag टूल जानबूझकर छोटे हैं: कोई अकाउंट, अपलोड, पेस्ट दस्तावेज़, केस डेटाबेस या AI विश्लेषण नहीं। यह सूचना उन्हें अलग सिंथेटिक डेमो से अलग करती है।')}</p>

      <InfoSection title={t(language, 'What happens to real-mode answers', 'रियल-मोड उत्तरों का क्या होता है')}>
        <ul><li>{t(language, 'Answers are held only in the page’s in-memory React state.', 'उत्तर केवल पेज की इन-मेमोरी React स्थिति में रहते हैं।')}</li><li>{t(language, 'They are not written to localStorage, sessionStorage, cookies, a URL, our API route, or a case database.', 'वे localStorage, sessionStorage, cookies, URL, हमारी API या केस डेटाबेस में नहीं लिखे जाते।')}</li><li>{t(language, 'Reloading, closing the tab, or Quick exit clears them from the app. Shared-device mode disables this app’s copy/download controls and attempts to leave after about 10 minutes without pointer, keyboard, input, or touch activity; background timer throttling can delay that attempt, so use Quick exit. We cannot erase clipboard contents, downloads, screenshots, browser history, print queues, or backups.', 'रीलोड, टैब बंद या तुरंत बाहर निकलने पर वे ऐप से साफ़ होते हैं। साझा-डिवाइस मोड ऐप के कॉपी/डाउनलोड नियंत्रण बंद करता है और लगभग 10 मिनट तक पॉइंटर, कीबोर्ड, इनपुट या टच गतिविधि न होने पर बाहर निकलने का प्रयास करता है; बैकग्राउंड टाइमर में देरी हो सकती है, इसलिए तुरंत बाहर निकलें। हम क्लिपबोर्ड, डाउनलोड, स्क्रीनशॉट, ब्राउज़र इतिहास, प्रिंट कतार या बैकअप नहीं मिटा सकते।')}</li><li>{t(language, 'Real-mode answers are not sent to an AI model, authority, bank, toll operator, or analytics service by this application.', 'इस ऐप द्वारा रियल-मोड उत्तर AI मॉडल, प्राधिकरण, बैंक, टोल ऑपरेटर या एनालिटिक्स सेवा को नहीं भेजे जाते।')}</li></ul>
      </InfoSection>

      <InfoSection title={t(language, 'Hosting and technical request data', 'होस्टिंग और तकनीकी अनुरोध डेटा')}>
        <p>{t(language, 'This release is delivered from the chatgpt.site host named in the browser address bar. That hosting service necessarily receives technical request data—such as IP address, requested path, browser/device information, timestamps, and security logs—to deliver and protect the site. The project does not control or promise the host’s exact operational-log retention. Do not use the tool if that boundary is unacceptable.', 'यह रिलीज़ ब्राउज़र पता बार में दिखे chatgpt.site होस्ट से दी जाती है। साइट देने और सुरक्षित रखने के लिए वह होस्टिंग सेवा तकनीकी अनुरोध डेटा—जैसे IP पता, माँगा पथ, ब्राउज़र/डिवाइस जानकारी, समय और सुरक्षा लॉग—प्राप्त करती है। परियोजना होस्ट के सटीक लॉग प्रतिधारण को नियंत्रित या वादा नहीं करती। यह सीमा स्वीकार न हो तो टूल उपयोग न करें।')}</p>
        <p>{t(language, 'The public beta embeds no third-party analytics, advertising pixels, chat widget, or social tracker.', 'सार्वजनिक बीटा में कोई तृतीय-पक्ष एनालिटिक्स, विज्ञापन पिक्सेल, चैट विजेट या सोशल ट्रैकर नहीं है।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Synthetic demo storage', 'सिंथेटिक डेमो संग्रह')}>
        <p>{t(language, 'The separate homepage demo stores only its bundled fictional case state and reading preferences in this browser so judges and learners can resume the walkthrough. Use its Reset control to remove that synthetic demo state. Never type real information into the synthetic Resolution Desk. Its optional model-rerun route accepts only a bundled fictional fixture ID and image; live model reruns are disabled in the public production release. TollSakshi’s three fictional fixtures stay in page memory and are persistently watermarked.', 'अलग होमपेज डेमो अपने काल्पनिक केस की स्थिति और पढ़ने की पसंद इस ब्राउज़र में रखता है ताकि डेमो फिर शुरू हो सके। उसे हटाने के लिए Reset उपयोग करें। सिंथेटिक Resolution Desk में असली जानकारी कभी न लिखें। उसका वैकल्पिक मॉडल-रीरन रास्ता केवल बंडल काल्पनिक fixture ID और तस्वीर स्वीकार करता है; सार्वजनिक प्रोडक्शन रिलीज़ में लाइव मॉडल रीरन बंद हैं। TollSakshi के तीन काल्पनिक fixtures पेज मेमोरी में रहते और लगातार वॉटरमार्क होते हैं।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Information we intentionally refuse', 'जानकारी जिसे हम जानबूझकर नहीं लेते')}>
        <p>{t(language, 'Do not enter or paste names, phone/email/address, Aadhaar, PAN, full registration/challan/tag/reference numbers, RC or DL images, chassis/engine numbers, bank statements, card/account data, OTPs, passwords, CVV, PIN, or UPI PIN.', 'नाम, फ़ोन/ईमेल/पता, आधार, PAN, पूरा वाहन/चालान/टैग/रेफरेंस नंबर, RC/DL तस्वीर, चेसिस/इंजन नंबर, बैंक स्टेटमेंट, कार्ड/खाता डेटा, OTP, पासवर्ड, CVV, PIN या UPI PIN दर्ज या पेस्ट न करें।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Maintainer, correction, and release status', 'रखरखाव, सुधार और रिलीज़ स्थिति')}>
        <p>{t(language, 'Site operator: the independent ChallanSakshi public-interest project. No personal-data inbox or in-product feedback form is configured because an appropriate secure handling process is not yet in place. That also means this release currently has no project channel for receiving a security or correction report. Do not send case details to an unofficial person or address. If guidance appears unsafe or outdated, stop using it and use the independently verified official destination directly. A named response owner, non-personal-data incident channel, response target, and external privacy/legal review are required before general availability; this release remains public-interest early access.', 'साइट संचालक: स्वतंत्र ChallanSakshi जनहित परियोजना। व्यक्तिगत-डेटा इनबॉक्स या इन-प्रोडक्ट फीडबैक फ़ॉर्म नहीं है क्योंकि उपयुक्त सुरक्षित प्रक्रिया अभी तैयार नहीं। इसलिए इस रिलीज़ में सुरक्षा या सुधार रिपोर्ट लेने का परियोजना चैनल भी नहीं है। मामले की जानकारी किसी अनौपचारिक व्यक्ति या पते पर न भेजें। मार्गदर्शन असुरक्षित या पुराना लगे तो उपयोग रोकें और स्वतंत्र रूप से सत्यापित आधिकारिक गंतव्य उपयोग करें। सामान्य उपलब्धता से पहले नामित प्रतिक्रिया मालिक, गैर-व्यक्तिगत-डेटा घटना चैनल, प्रतिक्रिया लक्ष्य और बाहरी गोपनीयता/कानूनी समीक्षा आवश्यक हैं; यह रिलीज़ जनहित अर्ली एक्सेस है।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Language status', 'भाषा स्थिति')}>
        <p>{t(language, 'The two real-case workflows are English-only in this release because their rule explanations and downloadable artifacts have not completed Hindi safety review. The Privacy and Safety reading pages remain bilingual. Do not rely on a partial translation for consent or a case decision.', 'दोनों रियल-केस कार्यप्रवाह इस रिलीज़ में केवल अंग्रेज़ी हैं क्योंकि उनके नियम स्पष्टीकरण और डाउनलोड आर्टिफैक्ट की हिंदी सुरक्षा समीक्षा पूरी नहीं हुई। गोपनीयता और सुरक्षा पठन पेज द्विभाषी हैं। सहमति या मामले के निर्णय के लिए आंशिक अनुवाद पर निर्भर न करें।')}</p>
      </InfoSection>
    </main>
  </PublicBetaShell>;
}

export function SafetyPage() {
  const [language, setLanguage] = useState<Language>('en');
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="सुरक्षा और आधिकारिक रास्ते">
    <main className={styles.infoPage}>
      <p className={styles.eyebrow}>{t(language, 'Official-route registry · reviewed 28 August 2026', 'आधिकारिक रास्ता सूची · समीक्षा 28 अगस्त 2026')}</p>
      <h1>{t(language, 'Open the destination independently', 'गंतव्य स्वतंत्र रूप से खोलें')}</h1>
      <p>{t(language, 'A message, screenshot, notice, or OCR result is untrusted input. ChallanSakshi never turns an extracted phone number or URL into an official route.', 'संदेश, स्क्रीनशॉट, नोटिस या OCR नतीजा अविश्वसनीय इनपुट है। ChallanSakshi निकाले हुए फ़ोन नंबर या URL को आधिकारिक रास्ता नहीं मानता।')}</p>

      <InfoSection title={t(language, 'e-Challan', 'ई-चालान')}>
        <p>{t(language, 'Use the official e-Challan or the responsible state/UT service you independently locate. Nothing from the manual review is transferred.', 'आधिकारिक ई-चालान या स्वतंत्र रूप से मिली जिम्मेदार राज्य/केंद्रशासित सेवा उपयोग करें। मैन्युअल समीक्षा से कुछ स्थानांतरित नहीं होता।')}</p>
        <p><a href="https://echallan.parivahan.gov.in/" target="_blank" rel="noreferrer">echallan.parivahan.gov.in ↗</a></p>
        <p>{t(language, 'A Virtual Court or physical-court notice may follow a different procedure. ChallanSakshi does not determine jurisdiction, appealability, or legal deadlines. If a date is today, a vehicle is detained, or a court appearance is involved, prioritize the official record and qualified assistance.', 'वर्चुअल कोर्ट या भौतिक अदालत नोटिस की प्रक्रिया अलग हो सकती है। ChallanSakshi क्षेत्राधिकार, अपील या कानूनी समय सीमा तय नहीं करता। तारीख आज हो, वाहन रोका गया हो या अदालत पेशी हो तो आधिकारिक रिकॉर्ड और योग्य सहायता को प्राथमिकता दें।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'FASTag money issue', 'FASTag राशि समस्या')}>
        <p>{t(language, 'For a bank-issued FASTag debit, duplicate, recharge, refund, tag-mapping, class, pass, or account-status issue, contact the issuing bank first; it reviews the account and may raise the applicable NETC dispute. For a bank-neutral NHAI FASTag or NHAI Prepaid Wallet, use the verified IHMCL customer portal or 1033. If the same event also involved a plaza or road problem on an NHAI tolled stretch, report that separately to 1033 and keep both acknowledgements. Never use a phone number copied from the debit message.', 'बैंक द्वारा जारी FASTag के डेबिट, दोहरे डेबिट, रिचार्ज, रिफंड, टैग मैपिंग, श्रेणी, पास या खाता स्थिति के लिए पहले जारीकर्ता बैंक से संपर्क करें; वह खाता जाँचता और लागू NETC विवाद उठा सकता है। बैंक-न्यूट्रल NHAI FASTag या NHAI Prepaid Wallet के लिए सत्यापित IHMCL ग्राहक पोर्टल या 1033 उपयोग करें। उसी घटना में NHAI टोल मार्ग पर प्लाज़ा या सड़क समस्या भी हो तो उसे अलग से 1033 पर रिपोर्ट करें और दोनों स्वीकृतियाँ रखें। डेबिट संदेश से कॉपी फ़ोन नंबर कभी उपयोग न करें।')}</p>
        <p><a href="https://www.npci.org.in/product/netc/netc-fastag-helpline" target="_blank" rel="noreferrer">{t(language, 'NPCI current issuer directory', 'NPCI वर्तमान जारीकर्ता निर्देशिका')} ↗</a></p>
        <p><a href="https://www.npci.org.in/register-a-complaint" target="_blank" rel="noreferrer">{t(language, 'NPCI complaint bridge', 'NPCI शिकायत पुल')} ↗</a> — {t(language, 'NPCI says the relevant member remains responsible for resolution.', 'NPCI के अनुसार संबंधित सदस्य समाधान के लिए जिम्मेदार रहता है।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'National Highway plaza or road issue', 'राष्ट्रीय राजमार्ग प्लाज़ा या सड़क समस्या')}>
        <p>{t(language, '1033 provides FASTag-related complaint and query support, toll-charge queries, feedback about toll-plaza and highway facilities, road-condition reporting, and emergency support to road users on NHAI’s tolled stretches. It does not adjudicate the issuing bank’s account dispute, and it should not be assumed to cover every state, city, parking, or private plaza. For a bank-issued FASTag financial issue, contact the issuer separately and keep both acknowledgements.', '1033 NHAI के टोल मार्गों पर FASTag शिकायत/प्रश्न, टोल शुल्क, टोल-प्लाज़ा व राजमार्ग सुविधाओं की प्रतिक्रिया, सड़क स्थिति रिपोर्ट और आपात सहायता देता है। यह जारीकर्ता बैंक के खाता विवाद का निर्णय नहीं करता और हर राज्य, शहर, पार्किंग या निजी प्लाज़ा पर लागू नहीं माना जाना चाहिए। बैंक द्वारा जारी FASTag की वित्तीय समस्या के लिए जारीकर्ता से अलग संपर्क करें और दोनों स्वीकृतियाँ रखें।')}</p>
        <p><a href="https://ihmcl.co.in/24x7-national-highways-helpline-1033/" target="_blank" rel="noreferrer">{t(language, 'Official IHMCL 1033 scope', 'आधिकारिक IHMCL 1033 दायरा')} ↗</a></p>
      </InfoSection>

      <InfoSection title={t(language, 'If money was lost through a scam', 'यदि स्कैम में पैसा गया')}>
        <p>{t(language, 'Contact the bank/issuer immediately, call 1930, and use cybercrime.gov.in. TollSakshi cannot freeze, trace, or recover funds.', 'बैंक/जारीकर्ता से तुरंत संपर्क करें, 1930 पर कॉल करें और cybercrime.gov.in उपयोग करें। TollSakshi धन रोक, ट्रेस या वापस नहीं करा सकता।')}</p>
        <p><a href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer">cybercrime.gov.in ↗</a></p>
        <ul><li>{t(language, 'Never share an OTP with a caller or enter one on a link sent in a message. Use an OTP only inside a verified official portal you independently opened.', 'कॉलर के साथ OTP साझा न करें या संदेश के लिंक पर दर्ज न करें। OTP केवल स्वतंत्र रूप से खोले गए सत्यापित आधिकारिक पोर्टल में उपयोग करें।')}</li><li>{t(language, 'A UPI PIN authorizes an outgoing payment; it is never required to receive a refund.', 'UPI PIN बाहर जाने वाले भुगतान को मंज़ूरी देता है; रिफंड पाने के लिए इसकी कभी आवश्यकता नहीं होती।')}</li><li>{t(language, 'Never scan a QR code or approve a UPI collect request to receive money.', 'पैसा पाने के लिए QR कोड स्कैन या UPI collect request मंज़ूर न करें।')}</li><li>{t(language, 'Never install an APK, unknown app, or remote-control software.', 'APK, अज्ञात ऐप या रिमोट-कंट्रोल सॉफ़्टवेयर इंस्टॉल न करें।')}</li></ul>
      </InfoSection>

      <InfoSection title={t(language, 'Official source registry—check for later amendments', 'आधिकारिक स्रोत सूची—बाद के संशोधन जाँचें')}>
        <ul><li><a href="https://www.npci.org.in/circulars/netc" target="_blank" rel="noreferrer">{t(language, 'NPCI NETC circular index', 'NPCI NETC सर्कुलर सूची')} ↗</a></li><li><a href="https://www.npci.org.in/uploads/NETC_OC_005_FY_25_26_New_chargeback_reason_codes_in_NRCS_and_guidelines_for_handling_chargebacks_f5b100df97.pdf" target="_blank" rel="noreferrer">{t(language, 'NPCI 28 Oct 2025 evidence circular — dated ruleset; check the current circular index for later duplicate-validation changes', 'NPCI 28 अक्टूबर 2025 सबूत सर्कुलर—दिनांकित नियम; बाद के डुप्लिकेट-जाँच बदलाव वर्तमान सूची में जाँचें')} ↗</a></li><li><a href="https://ihmcl.co.in/fastag-user/" target="_blank" rel="noreferrer">{t(language, 'IHMCL FASTag user guidance', 'IHMCL FASTag उपयोगकर्ता जानकारी')} ↗</a></li><li><a href="https://tis.nhai.gov.in/TollInformation" target="_blank" rel="noreferrer">{t(language, 'NHAI Toll Information System', 'NHAI टोल सूचना प्रणाली')} ↗</a></li><li><a href="https://cms.rbi.org.in/" target="_blank" rel="noreferrer">{t(language, 'RBI Complaint Management System', 'RBI शिकायत प्रबंधन प्रणाली')} ↗</a> — {t(language, 'a later eligible route after first approaching a covered regulated entity, not a direct plaza appeal.', 'पहले संबंधित विनियमित संस्था से संपर्क के बाद संभावित बाद का रास्ता, सीधा प्लाज़ा अपील नहीं।')}</li></ul>
        <p>{t(language, 'TollSakshi does not apply a definitive duplicate time threshold. The issuer must apply the NETC rule in force when it reviews the transaction.', 'TollSakshi निश्चित डुप्लिकेट समय सीमा लागू नहीं करता। लेन-देन की समीक्षा में जारीकर्ता को उस समय लागू NETC नियम लगाना होगा।')}</p>
      </InfoSection>
    </main>
  </PublicBetaShell>;
}
