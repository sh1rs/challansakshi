'use client';

import { useState, type ReactNode } from 'react';
import type { Language } from '../../lib/domain';
import { CURRENT_EXTENSION_RELEASE_STATE, evaluatePublicExtensionRelease } from '../../lib/extension-release';
import { PublicBetaShell, publicBetaStyles as styles } from './PublicBetaShell';

function t(language: Language, en: string, hi: string) { return language === 'hi' ? hi : en; }

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.infoSection}><h2>{title}</h2>{children}</section>;
}

export function ExtensionInformationPage() {
  const [language, setLanguage] = useState<Language>('en');
  const release = evaluatePublicExtensionRelease(CURRENT_EXTENSION_RELEASE_STATE);
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="डेस्कटॉप सहायता">
    <main className={styles.infoPage}>
      <p className={styles.eyebrow}>{t(language, 'Optional desktop assistance', 'वैकल्पिक डेस्कटॉप सहायता')}</p>
      <h1>{t(language, 'Review the extension boundary before choosing it', 'एक्सटेंशन चुनने से पहले उसकी सीमा जाँचें')}</h1>
      <p>{t(language, 'The complete web review works without the extension. This optional desktop aid uses only reviewed fields that passed bounded safety checks. Those checks are not proof that free-text prose contains no sensitive information, so inspect every word yourself.', 'पूरी वेब समीक्षा एक्सटेंशन के बिना काम करती है। यह वैकल्पिक डेस्कटॉप सहायता केवल सीमित सुरक्षा जाँच से गुज़रे समीक्षित फ़ील्ड उपयोग करती है। ये जाँच संवेदनशील जानकारी न होने का प्रमाण नहीं हैं; हर शब्द स्वयं जाँचें।')}</p>
      <InfoSection title={t(language, 'Local data and intended recipient', 'स्थानीय डेटा और तय प्राप्तकर्ता')}>
        <p>{t(language, 'A confirmed description, an eligible category when supported, and the active official route are handled locally in your browser. The project developer is not a recipient. The official service is the only intended recipient, and its official page becomes the recipient only after you explicitly choose Fill.', 'पुष्ट विवरण, समर्थित होने पर योग्य श्रेणी और सक्रिय आधिकारिक रास्ता आपके ब्राउज़र में स्थानीय रूप से संभाले जाते हैं। प्रोजेक्ट डेवलपर प्राप्तकर्ता नहीं है। केवल आधिकारिक सेवा तय प्राप्तकर्ता है और आपके स्पष्ट रूप से भरें चुनने के बाद ही उसका आधिकारिक पेज प्राप्तकर्ता बनता है।')}</p>
      </InfoSection>
      <InfoSection title={t(language, 'Retention, recovery, and protected fields', 'अवधि, पुनर्प्राप्ति और सुरक्षित फ़ील्ड')}>
        <p>{t(language, 'These staged values remain for no more than 10 minutes from pack issue. Payload exists only in popup heap and session state: previewed values are ephemeral in the popup, while staged values remain in extension session storage until effective expiry. Exact tab and document bindings are separate browser-activity metadata, not citizen identifiers, and never enter persistent storage.', 'पैक जारी होने से staged मान अधिकतम दस मिनट रहते हैं। पेलोड केवल popup heap और session state में होता है: preview मान popup में क्षणिक रहते हैं और staged मान प्रभावी समाप्ति तक extension session storage में रहते हैं। ठीक tab और document binding अलग browser-activity metadata हैं, नागरिक पहचानकर्ता नहीं, और persistent storage में कभी नहीं जाते।')}</p>
        <p>{t(language, 'After a partial, indeterminate, or late attempt settles, only a payload-free replay-prevention record and warning may remain for up to 24 hours from settlement. An unresolved attempt is not cleared by time, browser or extension restart, reload, update, or disabling the extension.', 'आंशिक, अनिर्णायक या देर से हुए प्रयास के निपटने के बाद, निपटारे से अधिकतम 24 घंटे तक केवल पेलोड-रहित दोबारा उपयोग रोकने वाला रिकॉर्ड और चेतावनी रह सकते हैं। अनसुलझा प्रयास समय बीतने, ब्राउज़र या एक्सटेंशन दोबारा शुरू करने, रीलोड, अपडेट या एक्सटेंशन अक्षम करने से साफ़ नहीं होता।')}</p>
        <p>{t(language, 'Exceptional device-owner recovery means manually clearing extension storage or uninstalling the extension, and only after every relevant official tab and every browser process has been closed.', 'असाधारण डिवाइस-मालिक पुनर्प्राप्ति का अर्थ है एक्सटेंशन स्टोरेज को हाथ से साफ़ करना या एक्सटेंशन अनइंस्टॉल करना, और यह केवल हर संबंधित आधिकारिक टैब और हर ब्राउज़र प्रक्रिया बंद करने के बाद।')}</p>
        <p>{t(language, 'The helper leaves protected identity, authentication, declaration, and submission fields untouched. It does not submit, solve a CAPTCHA, enter an OTP, make a payment, or infer official acceptance.', 'सहायता सुरक्षित पहचान, प्रमाणीकरण, घोषणा और जमा करने वाले फ़ील्ड नहीं छूती। यह जमा, CAPTCHA हल, OTP दर्ज, भुगतान या आधिकारिक स्वीकृति का अनुमान नहीं करती।')}</p>
      </InfoSection>
      <InfoSection title={t(language, 'Mobile and unsupported-browser fallback', 'मोबाइल और असमर्थित ब्राउज़र विकल्प')}>
        <p>{t(language, 'On mobile or an unsupported browser, use the complete web field pack and its private-device copy aid, or manually transcribe the selectable text on a shared device.', 'मोबाइल या असमर्थित ब्राउज़र पर पूरा वेब फ़ील्ड पैक और निजी-डिवाइस कॉपी सहायता उपयोग करें, या साझा डिवाइस पर चुने जा सकने वाले पाठ को स्वयं लिखें।')}</p>
      </InfoSection>
      {release.status === 'public-enabled' ? (
        <p><a href={release.acquisition.storeUrl} target="_blank" rel="noreferrer">{t(language, 'Open approved store listing', 'स्वीकृत स्टोर सूची खोलें')}</a></p>
      ) : (
        <p role="status">{t(language, 'The optional desktop helper is not available for public installation in this release.', 'इस रिलीज़ में वैकल्पिक डेस्कटॉप सहायता सार्वजनिक इंस्टॉलेशन के लिए उपलब्ध नहीं है।')}</p>
      )}
    </main>
  </PublicBetaShell>;
}

export function PrivacyPage() {
  const [language, setLanguage] = useState<Language>('en');
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="गोपनीयता और डेटा नियंत्रण">
    <main className={styles.infoPage}>
      <p className={styles.eyebrow}>{t(language, 'Version 3 · reviewed 29 August 2026', 'संस्करण 3 · समीक्षा 29 अगस्त 2026')}</p>
      <h1>{t(language, 'Privacy that matches the implementation', 'गोपनीयता जो कार्यप्रणाली से मेल खाती है')}</h1>
      <p>{t(language, 'The real e-Challan review lets you deliberately select one official record and one supplied image for local preview. The real FASTag tool uses structured answers. Neither real flow has an account or case database, and both remain separate from the synthetic demo.', 'रियल ई-चालान समीक्षा में आप स्थानीय प्रीव्यू के लिए जानबूझकर एक आधिकारिक रिकॉर्ड और एक दी गई तस्वीर चुन सकते हैं। रियल FASTag टूल संरचित उत्तर उपयोग करता है। किसी भी रियल प्रवाह में अकाउंट या केस डेटाबेस नहीं है और दोनों सिंथेटिक डेमो से अलग रहते हैं।')}</p>

      <InfoSection title={t(language, 'Local files and real-mode answers', 'स्थानीय फ़ाइलें और रियल-मोड उत्तर')}>
        <ul>
          <li>{t(language, 'Each selected record or supplied image stays browser-local and is not uploaded to the ChallanSakshi server or sent to an AI model. This release does not run OCR on it.', 'हर चुना गया रिकॉर्ड या दी गई तस्वीर ब्राउज़र में स्थानीय रहती है और ChallanSakshi सर्वर पर अपलोड या AI मॉडल को नहीं भेजी जाती। यह रिलीज़ उस पर OCR नहीं चलाती।')}</li>
          <li>{t(language, 'Selecting a file does not authenticate its origin. Any source label records what the citizen says about the copy; it is not government verification.', 'फ़ाइल चुनना उसके स्रोत को प्रमाणित नहीं करता। स्रोत लेबल केवल कॉपी के बारे में नागरिक का कथन दर्ज करता है; यह सरकारी सत्यापन नहीं है।')}</li>
          <li>{t(language, 'Opening a selected PDF creates a separate browser-local tab. Quick exit cannot close or erase that tab; close the PDF tab yourself, especially on a shared device.', 'चुना गया PDF खोलने पर एक अलग ब्राउज़र-स्थानीय टैब बनता है। तुरंत बाहर निकलना उस टैब को बंद या मिटा नहीं सकता; खासकर साझा डिवाइस पर PDF टैब स्वयं बंद करें।')}</li>
          <li>{t(language, 'Answers and selected-file references are held in app page memory. They are not written by the real flow to localStorage, sessionStorage, cookies, a case URL, /api/analyze, or a case database.', 'उत्तर और चुनी फ़ाइल के संदर्भ ऐप पेज मेमोरी में रहते हैं। रियल प्रवाह उन्हें localStorage, sessionStorage, cookies, केस URL, /api/analyze या केस डेटाबेस में नहीं लिखता।')}</li>
          <li>{t(language, 'Reloading, closing the app tab, or Quick exit clears only the in-app copy. Shared-device mode disables this app’s summary copy, download, and formatted-print controls and attempts to leave after inactivity; close any separately opened PDF tab, then use Quick exit when finished.', 'रीलोड, ऐप टैब बंद या तुरंत बाहर निकलने पर केवल ऐप के अंदर की कॉपी साफ़ होती है। साझा-डिवाइस मोड ऐप के सारांश कॉपी, डाउनलोड और तैयार-प्रिंट नियंत्रण बंद करता है और निष्क्रियता के बाद बाहर निकलने का प्रयास करता है; अलग खोला PDF टैब बंद करें, फिर काम पूरा होने पर तुरंत बाहर निकलें।')}</li>
        </ul>
      </InfoSection>

      <InfoSection title={t(language, 'Hosting and technical request data', 'होस्टिंग और तकनीकी अनुरोध डेटा')}>
        <p>{t(language, 'Ordinary page requests still reach the infrastructure provider. To deliver and protect the site, that provider can receive technical data such as IP address, requested path, time, and browser or device information. ChallanSakshi does not guarantee how long the infrastructure provider retains technical logs.', 'सामान्य पेज अनुरोध फिर भी इन्फ्रास्ट्रक्चर प्रदाता तक पहुँचते हैं। साइट देने और सुरक्षित रखने के लिए प्रदाता IP पता, माँगा गया पथ, समय और ब्राउज़र या डिवाइस जानकारी जैसे तकनीकी डेटा प्राप्त कर सकता है। ChallanSakshi यह गारंटी नहीं देता कि प्रदाता तकनीकी लॉग कितने समय रखता है।')}</p>
        <p>{t(language, 'The non-public prototype embeds no third-party analytics, advertising pixels, chat widget, or social tracker.', 'गैर-सार्वजनिक प्रोटोटाइप में कोई तृतीय-पक्ष एनालिटिक्स, विज्ञापन पिक्सेल, चैट विजेट या सोशल ट्रैकर नहीं है।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Copies outside the app’s clear action', 'ऐप की सफ़ाई से बाहर की कॉपी')}>
        <p>{t(language, 'Downloads, screenshots, clipboard contents, print-to-PDF files, browser history, and device backups are outside ChallanSakshi’s deletion control. The app cannot erase copies created by the browser, operating system, another app, or the person using the device.', 'डाउनलोड, स्क्रीनशॉट, क्लिपबोर्ड सामग्री, प्रिंट-टू-PDF फ़ाइलें, ब्राउज़र इतिहास और डिवाइस बैकअप ChallanSakshi के मिटाने के नियंत्रण से बाहर हैं। ऐप ब्राउज़र, ऑपरेटिंग सिस्टम, दूसरे ऐप या डिवाइस उपयोगकर्ता द्वारा बनाई गई कॉपी नहीं मिटा सकता।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Synthetic demo storage', 'सिंथेटिक डेमो संग्रह')}>
        <p>
          {t(language, 'The separate ', 'अलग ')}<code>/demo</code>{t(language, ' walkthrough stores only its bundled fictional case state and reading preferences in this browser so judges and learners can resume it. Use its Reset control to remove that synthetic demo state. Never type real information into the synthetic Resolution Desk. The public ', ' वॉकथ्रू अपने बंडल किए गए काल्पनिक केस की स्थिति और पढ़ने की पसंद इस ब्राउज़र में रखता है ताकि जज और सीखने वाले इसे फिर शुरू कर सकें। उस सिंथेटिक डेमो स्थिति को हटाने के लिए Reset उपयोग करें। सिंथेटिक Resolution Desk में असली जानकारी कभी न लिखें। सार्वजनिक ')}<code>/demo/test-lab</code>{t(language, ' custom-image workbench keeps selected image bytes in the current tab and does not send them to the server or an AI model; observations are entered manually. Its ten bundled cases are fictional. A custom input is user-selected, must be synthetic, and ChallanSakshi cannot verify its provenance. A policy-limited model adapter exists for controlled local or separately access-protected testing, but both enabling switches are off in public production. Feature flags are not authentication. If deliberately enabled elsewhere, the two supplied texts and original image bytes—including embedded metadata—would pass through the Worker to OpenAI; store:false is not a promise of zero provider retention. TollSakshi’s three fictional fixtures stay in page memory and are persistently watermarked.', ' का कस्टम-इमेज कार्यक्षेत्र चुनी तस्वीर के बाइट्स मौजूदा टैब में रखता है और उन्हें सर्वर या AI मॉडल तक नहीं भेजता; अवलोकन हाथ से दर्ज किए जाते हैं। इसके दस बंडल मामले काल्पनिक हैं। कस्टम इनपुट उपयोगकर्ता चुनता है, वह सिंथेटिक होना चाहिए, और ChallanSakshi उसकी उत्पत्ति सत्यापित नहीं कर सकता। नियंत्रित स्थानीय या अलग पहचान-सुरक्षित परीक्षण के लिए नीति-सीमित मॉडल अडैप्टर कोड में है, लेकिन सार्वजनिक प्रोडक्शन में उसके दोनों स्विच बंद हैं। फीचर फ्लैग प्रमाणीकरण नहीं हैं। यदि उसे किसी अन्य सुरक्षित वातावरण में जानबूझकर चालू किया गया तो दोनों पाठ और मूल तस्वीर के बाइट्स—समेत एम्बेडेड मेटाडेटा—Worker के रास्ते OpenAI तक जाएँगे; store:false शून्य प्रदाता प्रतिधारण का वादा नहीं है। TollSakshi के तीन काल्पनिक fixtures पेज मेमोरी में रहते और लगातार वॉटरमार्क होते हैं।')}
        </p>
      </InfoSection>

      <InfoSection title={t(language, 'Information we intentionally refuse', 'जानकारी जिसे हम जानबूझकर नहीं लेते')}>
        <p>{t(language, 'In structured fields, enter only the requested masked or minimum values. Do not type names, contact details, full registration, challan, tag, or reference numbers, PAN, chassis or engine numbers, or bank or card details.', 'संरचित फ़ील्ड में केवल माँगी गई मास्क या न्यूनतम जानकारी दर्ज करें। नाम, संपर्क जानकारी, पूरा वाहन, चालान, टैग या रेफरेंस नंबर, PAN, चेसिस या इंजन नंबर, या बैंक अथवा कार्ड जानकारी न लिखें।')}</p>
        <p>{t(language, 'ChallanSakshi never requests a CAPTCHA, OTP, Aadhaar or VID, a government, bank, or FASTag password, or card or payment credentials. Complete any login, identity check, CAPTCHA, OTP, or payment only on the independently opened official service.', 'ChallanSakshi कभी CAPTCHA, OTP, Aadhaar या VID, सरकारी, बैंक या FASTag पासवर्ड, या कार्ड अथवा भुगतान क्रेडेंशियल नहीं माँगता। लॉगिन, पहचान जाँच, CAPTCHA, OTP या भुगतान केवल स्वतंत्र रूप से खोली गई आधिकारिक सेवा पर पूरा करें।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Capability and legal limits', 'क्षमता और कानूनी सीमाएँ')}>
        <p>{t(language, 'ChallanSakshi does not make a payment or submit a grievance, contest, court response, FASTag dispute, or other case action. Authorised government API access is not implemented. Results organise citizen-provided information; they do not authenticate a record, decide a case, or provide a legal guarantee.', 'ChallanSakshi भुगतान नहीं करता और शिकायत, चुनौती, अदालत जवाब, FASTag विवाद या कोई अन्य केस कार्रवाई जमा नहीं करता। अधिकृत सरकारी API पहुँच लागू नहीं है। नतीजे नागरिक द्वारा दी गई जानकारी व्यवस्थित करते हैं; वे रिकॉर्ड प्रमाणित, केस तय या कानूनी गारंटी नहीं देते।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Maintainer, correction, and release status', 'रखरखाव, सुधार और रिलीज़ स्थिति')}>
        <p>{t(language, 'Site operator: the independent ChallanSakshi public-interest project. No personal-data inbox or in-product feedback form is configured because an appropriate secure handling process is not yet in place. That also means this release currently has no project channel for receiving a security or correction report. Do not send case details to an unofficial person or address. If guidance appears unsafe or outdated, stop using it and use the independently verified official destination directly. A named response owner, non-personal-data incident channel, response target, and external privacy/legal review are required before general availability; this release remains a non-public prototype.', 'साइट संचालक: स्वतंत्र ChallanSakshi जनहित परियोजना। व्यक्तिगत-डेटा इनबॉक्स या इन-प्रोडक्ट फीडबैक फ़ॉर्म नहीं है क्योंकि उपयुक्त सुरक्षित प्रक्रिया अभी तैयार नहीं। इसलिए इस रिलीज़ में सुरक्षा या सुधार रिपोर्ट लेने का परियोजना चैनल भी नहीं है। मामले की जानकारी किसी अनौपचारिक व्यक्ति या पते पर न भेजें। मार्गदर्शन असुरक्षित या पुराना लगे तो उपयोग रोकें और स्वतंत्र रूप से सत्यापित आधिकारिक गंतव्य उपयोग करें। सामान्य उपलब्धता से पहले नामित प्रतिक्रिया मालिक, गैर-व्यक्तिगत-डेटा घटना चैनल, प्रतिक्रिया लक्ष्य और बाहरी गोपनीयता/कानूनी समीक्षा आवश्यक हैं; यह रिलीज़ एक गैर-सार्वजनिक प्रोटोटाइप बनी हुई है।')}</p>
      </InfoSection>

      <InfoSection title={t(language, 'Language status', 'भाषा स्थिति')}>
        <p>{t(language, 'The real e-Challan review, the flagship synthetic walkthrough, and these reading pages offer English and Hindi. FASTag and the new Evidence Test Lab remain English-only until their complete decision and artifact copy finishes Hindi safety review. If translated wording appears incomplete or unclear, use the English limitation and official-route text before acting.', 'रियल ई-चालान समीक्षा, मुख्य सिंथेटिक वॉकथ्रू और ये पठन पेज अंग्रेज़ी और हिंदी देते हैं। FASTag और नया Evidence Test Lab तब तक केवल अंग्रेज़ी हैं जब तक उनके पूरे निर्णय और आर्टिफैक्ट पाठ की हिंदी सुरक्षा समीक्षा पूरी नहीं होती। अनुवाद अधूरा या अस्पष्ट लगे तो कार्रवाई से पहले अंग्रेज़ी सीमा और आधिकारिक-रास्ता पाठ उपयोग करें।')}</p>
      </InfoSection>
    </main>
  </PublicBetaShell>;
}

export function SafetyPage() {
  const [language, setLanguage] = useState<Language>('en');
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="सुरक्षा और आधिकारिक रास्ते">
    <main className={styles.infoPage}>
      <p className={styles.eyebrow}>{t(language, 'Official-route registry · reviewed 29 August 2026', 'आधिकारिक रास्ता सूची · समीक्षा 29 अगस्त 2026')}</p>
      <h1>{t(language, 'Open the destination independently', 'गंतव्य स्वतंत्र रूप से खोलें')}</h1>
      <p>{t(language, 'A message, screenshot, notice, or OCR result is untrusted input. ChallanSakshi never turns an extracted phone number or URL into an official route.', 'संदेश, स्क्रीनशॉट, नोटिस या OCR नतीजा अविश्वसनीय इनपुट है। ChallanSakshi निकाले हुए फ़ोन नंबर या URL को आधिकारिक रास्ता नहीं मानता।')}</p>

      <InfoSection title={t(language, 'What ChallanSakshi never requests or performs', 'ChallanSakshi क्या कभी नहीं माँगता या करता')}>
        <p>{t(language, 'ChallanSakshi never asks for a CAPTCHA, OTP, Aadhaar or VID, a government, bank, or FASTag password, or card or payment credentials. Use those only when required inside an independently opened official service.', 'ChallanSakshi कभी CAPTCHA, OTP, Aadhaar या VID, सरकारी, बैंक या FASTag पासवर्ड, या कार्ड अथवा भुगतान क्रेडेंशियल नहीं माँगता। इन्हें केवल स्वतंत्र रूप से खोली गई आधिकारिक सेवा के अंदर आवश्यकता होने पर उपयोग करें।')}</p>
        <p>{t(language, 'It does not make a payment or submit anything to an authority, court, bank, issuer, or toll operator. Authorised government API access is not implemented, and ChallanSakshi does not provide a legal guarantee.', 'यह किसी प्राधिकरण, अदालत, बैंक, जारीकर्ता या टोल ऑपरेटर को भुगतान या कुछ भी जमा नहीं करता। अधिकृत सरकारी API पहुँच लागू नहीं है और ChallanSakshi कानूनी गारंटी नहीं देता।')}</p>
      </InfoSection>

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
        <p><a href="https://ihmcl.co.in/24x7-national-highways-helpline-1033-page/" target="_blank" rel="noreferrer">{t(language, 'Official IHMCL 1033 scope', 'आधिकारिक IHMCL 1033 दायरा')} ↗</a></p>
      </InfoSection>

      <InfoSection title={t(language, 'If money was lost through a scam', 'यदि स्कैम में पैसा गया')}>
        <p>{t(language, 'Contact the bank/issuer immediately, call 1930, and use cybercrime.gov.in. TollSakshi cannot freeze, trace, or recover funds.', 'बैंक/जारीकर्ता से तुरंत संपर्क करें, 1930 पर कॉल करें और cybercrime.gov.in उपयोग करें। TollSakshi धन रोक, ट्रेस या वापस नहीं करा सकता।')}</p>
        <p><a href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer">cybercrime.gov.in ↗</a></p>
        <ul><li>{t(language, 'Never share an OTP with a caller or enter one on a link sent in a message. Use an OTP only inside a verified official portal you independently opened.', 'कॉलर के साथ OTP साझा न करें या संदेश के लिंक पर दर्ज न करें। OTP केवल स्वतंत्र रूप से खोले गए सत्यापित आधिकारिक पोर्टल में उपयोग करें।')}</li><li>{t(language, 'A UPI PIN authorizes an outgoing payment; it is never required to receive a refund.', 'UPI PIN बाहर जाने वाले भुगतान को मंज़ूरी देता है; रिफंड पाने के लिए इसकी कभी आवश्यकता नहीं होती।')}</li><li>{t(language, 'Never scan a QR code or approve a UPI collect request to receive money.', 'पैसा पाने के लिए QR कोड स्कैन या UPI collect request मंज़ूर न करें।')}</li><li>{t(language, 'Never install an APK, unknown app, or remote-control software.', 'APK, अज्ञात ऐप या रिमोट-कंट्रोल सॉफ़्टवेयर इंस्टॉल न करें।')}</li></ul>
      </InfoSection>

      <InfoSection title={t(language, 'Official source registry—check for later amendments', 'आधिकारिक स्रोत सूची—बाद के संशोधन जाँचें')}>
        <ul><li><a href="https://www.npci.org.in/circulars/netc" target="_blank" rel="noreferrer">{t(language, 'NPCI NETC circular index', 'NPCI NETC सर्कुलर सूची')} ↗</a></li><li><a href="https://www.npci.org.in/uploads/NETC_OC_005_FY_25_26_New_chargeback_reason_codes_in_NRCS_and_guidelines_for_handling_chargebacks_f5b100df97.pdf" target="_blank" rel="noreferrer">{t(language, 'NPCI 28 Oct 2025 evidence circular — dated ruleset; check the current circular index for later duplicate-validation changes', 'NPCI 28 अक्टूबर 2025 सबूत सर्कुलर—दिनांकित नियम; बाद के डुप्लिकेट-जाँच बदलाव वर्तमान सूची में जाँचें')} ↗</a></li><li><a href="https://ihmcl.co.in/faq/" target="_blank" rel="noreferrer">{t(language, 'IHMCL FASTag FAQ and grievance guidance', 'IHMCL FASTag अक्सर पूछे जाने वाले प्रश्न और शिकायत मार्गदर्शन')} ↗</a></li><li><a href="https://tis.nhai.gov.in/TollInformation" target="_blank" rel="noreferrer">{t(language, 'NHAI Toll Information System', 'NHAI टोल सूचना प्रणाली')} ↗</a></li><li><a href="https://cms.rbi.org.in/" target="_blank" rel="noreferrer">{t(language, 'RBI Complaint Management System', 'RBI शिकायत प्रबंधन प्रणाली')} ↗</a> — {t(language, 'a later eligible route after first approaching a covered regulated entity, not a direct plaza appeal.', 'पहले संबंधित विनियमित संस्था से संपर्क के बाद संभावित बाद का रास्ता, सीधा प्लाज़ा अपील नहीं।')}</li></ul>
        <p>{t(language, 'TollSakshi does not apply a definitive duplicate time threshold. The issuer must apply the NETC rule in force when it reviews the transaction.', 'TollSakshi निश्चित डुप्लिकेट समय सीमा लागू नहीं करता। लेन-देन की समीक्षा में जारीकर्ता को उस समय लागू NETC नियम लगाना होगा।')}</p>
      </InfoSection>
    </main>
  </PublicBetaShell>;
}
