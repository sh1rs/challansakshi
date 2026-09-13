type GuideText = readonly [english: string, hindi: string];

export type CivicGuide = {
  slug: string;
  title: GuideText;
  description: GuideText;
  answer: GuideText;
  readMinutes: number;
  publishedAt: string;
  updatedAt: string;
  steps: readonly { title: GuideText; body: GuideText }[];
  checklist: readonly GuideText[];
  caution: GuideText;
  nextAction: { href: string; label: GuideText };
  sources: readonly { title: string; url: string; note: GuideText }[];
  relatedSlugs: readonly string[];
};

/** Public preparation guidance. Sources explain the advice; they do not establish
 * a citizen's eligibility, a legal outcome, or a live official submission route. */
export const civicGuides: readonly CivicGuide[] = [
  {
    slug: 'wrong-e-challan',
    title: ['Wrong e-Challan? What to check before raising a grievance', 'ई-चालान गलत लग रहा है? शिकायत से पहले क्या जाँचें'],
    description: ['Compare a challan with your own records, keep unclear evidence separate from a confirmed discrepancy, and prepare a factual request for the appropriate official service.', 'चालान को अपने रिकॉर्ड से मिलाएँ, अस्पष्ट सबूत को पुष्टि किए अंतर से अलग रखें और उचित आधिकारिक सेवा के लिए तथ्यों पर आधारित अनुरोध तैयार करें।'],
    answer: ['Start by finding the record through an official service you open independently. Compare the challan number, vehicle registration, date, place and visible details with records you can check. A mismatch is something to investigate; it does not by itself prove that a challan is invalid. ChallanSakshi can help you organise those checks before you choose an official next step.', 'पहले स्वतंत्र रूप से खोली गई आधिकारिक सेवा पर रिकॉर्ड खोजें। चालान नंबर, वाहन नंबर, तारीख, स्थान और दिखाई देने वाले विवरण को जाँच सकने योग्य रिकॉर्ड से मिलाएँ। अंतर मिलने पर उसकी जाँच करनी चाहिए; केवल अंतर से चालान अमान्य साबित नहीं होता। आधिकारिक अगला कदम चुनने से पहले ChallanSakshi इन जाँचों को व्यवस्थित करने में मदद कर सकता है।'],
    readMinutes: 4,
    publishedAt: '2026-09-13',
    updatedAt: '2026-09-13',
    steps: [
      {
        title: ['Find the actual record', 'असली रिकॉर्ड तक पहुँचें'],
        body: ['Use the official service named by the issuing authority, starting from the official-sources directory if needed. A forwarded SMS or screenshot is not enough to establish the current record. Keep the original notice or download, the issuing authority and the source where you obtained it.', 'जारीकर्ता प्राधिकरण द्वारा बताई आधिकारिक सेवा उपयोग करें; ज़रूरत हो तो आधिकारिक स्रोत निर्देशिका से शुरू करें। फ़ॉरवर्ड किया SMS या स्क्रीनशॉट मौजूदा रिकॉर्ड की पुष्टि के लिए पर्याप्त नहीं है। मूल नोटिस या डाउनलोड, जारीकर्ता प्राधिकरण और रिकॉर्ड मिलने का स्रोत साथ रखें।'],
      },
      {
        title: ['Compare facts with their sources', 'तथ्यों को उनके स्रोत के साथ मिलाएँ'],
        body: ['Read the registration against an independent vehicle record you have permission to use. Compare other relevant details with your own records. Mark a blurred plate, missing photograph or uncertain date as unclear. If using document reading, correct extraction mistakes first; OCR output is not an independent source or proof.', 'वाहन नंबर को किसी स्वतंत्र वाहन रिकॉर्ड से मिलाएँ, जिसके उपयोग की आपको अनुमति है। अन्य प्रासंगिक विवरण अपने रिकॉर्ड से जाँचें। धुँधली प्लेट, गायब तस्वीर या अनिश्चित तारीख को अस्पष्ट चिह्नित करें। दस्तावेज़ रीडर उपयोग कर रहे हों तो पहले पढ़ने की गलतियाँ सुधारें; OCR का पाठ स्वतंत्र स्रोत या प्रमाण नहीं है।'],
      },
      {
        title: ['Write a short, specific request', 'छोटा और स्पष्ट अनुरोध लिखें'],
        body: ['State what the notice shows, what your other record shows, and what you want the authority to check. Separate observations from assumptions. Attach only relevant supporting material when the official service asks for it. If you already paid, include the receipt and reference in your comparison rather than treating payment status as settled.', 'लिखें कि नोटिस में क्या है, दूसरे रिकॉर्ड में क्या है और प्राधिकरण से किस बात की जाँच चाहते हैं। देखे गए तथ्य और अनुमान अलग रखें। आधिकारिक सेवा माँगे तभी प्रासंगिक सहायक सामग्री दें। भुगतान कर चुके हों तो स्थिति को तय मानने के बजाय रसीद और संदर्भ भी तुलना में रखें।'],
      },
      {
        title: ['Choose the right route and keep the response', 'सही रास्ता चुनें और जवाब सहेजें'],
        body: ['The national grievance page directs some jurisdictions to different services, including Delhi and NextGen eChallan. Check the current instructions through Official sources; follow any court information on your record. You complete verification and submission yourself. Keep the submitted text and acknowledgement, then compare a later reply with the points you raised.', 'राष्ट्रीय शिकायत पेज कुछ क्षेत्रों के लिए अलग सेवाएँ बताता है, जिनमें दिल्ली और NextGen eChallan शामिल हैं। आधिकारिक स्रोत पेज से मौजूदा निर्देश जाँचें; रिकॉर्ड में अदालत की जानकारी हो तो उसे देखें। सत्यापन और सबमिशन आप स्वयं पूरा करते हैं। भेजा गया पाठ और पावती रखें, फिर बाद के जवाब को अपने उठाए बिंदुओं से मिलाएँ।'],
      },
    ],
    checklist: [
      ['Original notice and where it came from', 'मूल नोटिस और वह कहाँ से मिला'],
      ['Challan number and issuing authority', 'चालान नंबर और जारीकर्ता प्राधिकरण'],
      ['Relevant independent record and the exact difference', 'प्रासंगिक स्वतंत्र रिकॉर्ड और सटीक अंतर'],
      ['Unclear details kept visibly uncertain', 'अस्पष्ट विवरण साफ़ तौर पर अनिश्चित चिह्नित'],
      ['Payment receipt or earlier acknowledgement, if relevant', 'प्रासंगिक होने पर भुगतान रसीद या पिछली पावती'],
    ],
    caution: ['This guide supports record checking and preparation. A photograph, OCR reading or registration match cannot establish legal validity, who was driving or an official outcome. Procedures depend on the authority and case; follow its current instructions for any applicable time limits or court requirements.', 'यह गाइड रिकॉर्ड जाँचने और तैयारी करने में मदद करता है। तस्वीर, OCR रीडिंग या वाहन नंबर का मेल कानूनी वैधता, चालक की पहचान या आधिकारिक परिणाम तय नहीं करता। प्रक्रिया प्राधिकरण और मामले पर निर्भर है; समय-सीमा या अदालत की ज़रूरतों के लिए उसके मौजूदा निर्देश देखें।'],
    nextAction: { href: '/review', label: ['Review my challan', 'मेरे चालान की समीक्षा करें'] },
    sources: [
      {
        title: 'MoRTH eChallan — grievance information',
        url: 'https://echallan.parivahan.gov.in/gsticket/',
        note: ['Official reference for grievance fields and jurisdiction-specific directions. It does not confirm that your case belongs on this form; check the current route in Official sources.', 'शिकायत के विवरण और क्षेत्र के अनुसार निर्देशों का आधिकारिक संदर्भ। इससे यह पुष्टि नहीं होती कि आपका मामला इसी फ़ॉर्म पर जाएगा; आधिकारिक स्रोत पेज पर मौजूदा रास्ता जाँचें।'],
      },
    ],
    relatedSlugs: ['fake-challan-message', 'fastag-wrong-deduction'],
  },
  {
    slug: 'fastag-wrong-deduction',
    title: ['FASTag charged twice or for the wrong journey? Check these records', 'FASTag से दो बार या गलत यात्रा का पैसा कटा? ये रिकॉर्ड जाँचें'],
    description: ['Compare FASTag debits, credits and journey details, then prepare a clear query for your issuer without assuming that a repeated amount proves a duplicate charge.', 'FASTag डेबिट, क्रेडिट और यात्रा के विवरण मिलाएँ, फिर जारीकर्ता के लिए स्पष्ट सवाल तैयार करें। एक जैसी राशि दो बार दिखना अपने आप दोहरी कटौती का प्रमाण नहीं है।'],
    answer: ['Start with the FASTag issuer’s transaction statement. Identify the debit you are questioning, compare it with the journey and check for a related credit or adjustment. Keep separate entries separate until their references and circumstances can be compared. ChallanSakshi helps organise the facts for an issuer query; the issuer and relevant operator investigate the transaction.', 'FASTag जारीकर्ता के लेन-देन विवरण से शुरुआत करें। जिस डेबिट पर सवाल है उसे पहचानें, यात्रा से मिलाएँ और संबंधित क्रेडिट या समायोजन देखें। अलग प्रविष्टियाँ अलग ही रखें, जब तक उनके संदर्भ और परिस्थितियाँ जाँची न जा सकें। ChallanSakshi जारीकर्ता से पूछने के लिए तथ्य व्यवस्थित करता है; लेन-देन की जाँच जारीकर्ता और संबंधित ऑपरेटर करते हैं।'],
    readMinutes: 4,
    publishedAt: '2026-09-13',
    updatedAt: '2026-09-13',
    steps: [
      {
        title: ['Get the statement behind the alert', 'अलर्ट के पीछे का विवरण लें'],
        body: ['Open your issuer’s official app or portal independently and keep the relevant statement entries. Record the transaction reference, amount, plaza and transaction time as shown. Keep the SMS as supporting material. If only the message arrival time is known, label it that way instead of assuming it is the journey time.', 'जारीकर्ता का आधिकारिक ऐप या पोर्टल स्वतंत्र रूप से खोलें और प्रासंगिक लेन-देन प्रविष्टियाँ रखें। जैसा दिखता है वैसा संदर्भ, राशि, प्लाज़ा और लेन-देन का समय लिखें। SMS को सहायक सामग्री के रूप में रखें। केवल संदेश आने का समय पता हो तो उसे वैसा ही लिखें; उसे यात्रा का समय न मानें।'],
      },
      {
        title: ['Compare the possible duplicate', 'संभावित दोहरी कटौती मिलाएँ'],
        body: ['For two debits, compare both references, dates, times, plazas and vehicle details with the trips you can account for. Equal amounts alone are not enough. If you paid cash as well, retain the cash receipt and compare its place and time. Mark missing information as unknown rather than filling the gaps from memory.', 'दो डेबिट हों तो दोनों संदर्भ, तारीख, समय, प्लाज़ा और वाहन विवरण उन यात्राओं से मिलाएँ जिनका रिकॉर्ड है। समान राशि पर्याप्त नहीं है। नकद भी दिया हो तो रसीद रखें और उसका स्थान व समय मिलाएँ। जानकारी गायब हो तो याद से खाली जगह भरने के बजाय उसे अज्ञात चिह्नित करें।'],
      },
      {
        title: ['Look for adjustments and explain the question', 'समायोजन देखें और सवाल स्पष्ट करें'],
        body: ['Review relevant credits, reversals and adjustments alongside the debits. Note which entry appears connected and which connection remains uncertain. Summarise the transaction you question, the evidence you have and what you want checked. For an amount or vehicle-class question, ask the issuer to clarify the recorded basis instead of declaring the charge incorrect.', 'डेबिट के साथ प्रासंगिक क्रेडिट, रिवर्सल और समायोजन देखें। लिखें कि कौन-सी प्रविष्टि संबंधित लगती है और किसका संबंध अनिश्चित है। सवाल वाले लेन-देन, उपलब्ध सबूत और अपेक्षित जाँच का सार बनाएँ। राशि या वाहन श्रेणी पर सवाल हो तो शुल्क को गलत घोषित करने के बजाय जारीकर्ता से दर्ज आधार स्पष्ट करने को कहें।'],
      },
      {
        title: ['Contact the appropriate support service', 'उचित सहायता सेवा से संपर्क करें'],
        body: ['Use your issuer’s official support channel; NPCI maintains an issuer helpline directory. IHMCL also describes 1033 support for FASTag and plaza issues on NHAI tolled stretches. Choose the channel that fits the issue and follow its current requirements. Keep the complaint reference and response with your records. A prepared query is not a submitted complaint.', 'जारीकर्ता का आधिकारिक सहायता चैनल उपयोग करें; NPCI जारीकर्ताओं की हेल्पलाइन निर्देशिका देता है। IHMCL, NHAI के टोल वाले मार्गों पर FASTag और प्लाज़ा समस्याओं के लिए 1033 सहायता भी बताता है। समस्या के अनुसार चैनल चुनें और उसके मौजूदा निर्देश मानें। शिकायत संदर्भ और जवाब रिकॉर्ड के साथ रखें। तैयार सवाल अपने आप जमा हुई शिकायत नहीं है।'],
      },
    ],
    checklist: [
      ['Issuer name and relevant statement entries', 'जारीकर्ता का नाम और प्रासंगिक लेन-देन प्रविष्टियाँ'],
      ['Both transaction references for a suspected duplicate', 'संभावित दोहरी कटौती के दोनों लेन-देन संदर्भ'],
      ['Plaza, recorded time, amount and vehicle details', 'प्लाज़ा, दर्ज समय, राशि और वाहन विवरण'],
      ['Related credits or adjustments, with uncertain links marked', 'संबंधित क्रेडिट या समायोजन; अनिश्चित संबंध चिह्नित'],
      ['Cash receipt and journey records, when relevant', 'प्रासंगिक होने पर नकद रसीद और यात्रा रिकॉर्ड'],
    ],
    caution: ['Two similar entries do not by themselves prove an incorrect deduction. This guide does not calculate a legally applicable fare or promise a refund. Requirements vary by issuer and issue; ask the official service about current complaint time limits and supporting records. Do not send account credentials or OTPs to ChallanSakshi.', 'दो मिलती-जुलती प्रविष्टियाँ अपने आप गलत कटौती साबित नहीं करतीं। यह गाइड कानूनी रूप से लागू किराया नहीं निकालता और रिफंड का वादा नहीं करता। ज़रूरतें जारीकर्ता और समस्या के अनुसार बदलती हैं; शिकायत की मौजूदा समय-सीमा और सहायक रिकॉर्ड आधिकारिक सेवा से पूछें। खाते की गोपनीय जानकारी या OTP ChallanSakshi को न दें।'],
    nextAction: { href: '/fastag', label: ['Check a FASTag transaction', 'FASTag लेन-देन जाँचें'] },
    sources: [
      {
        title: 'NPCI — FASTag issuer helpline directory',
        url: 'https://www.npci.org.in/product/netc/netc-fastag-helpline',
        note: ['Official issuer-contact directory. Check the current listing rather than relying on a copied phone number.', 'जारीकर्ता से संपर्क की आधिकारिक निर्देशिका। कॉपी किए फ़ोन नंबर पर निर्भर होने के बजाय मौजूदा सूची जाँचें।'],
      },
      {
        title: 'IHMCL — FASTag user guidance',
        url: 'https://ihmcl.co.in/fastag-user/',
        note: ['Background on statements, deduction questions and issuer support. Historical FAQ figures are not used here as current deadlines or refund promises.', 'लेन-देन विवरण, कटौती के सवाल और जारीकर्ता सहायता की पृष्ठभूमि। पुराने FAQ के आँकड़ों को यहाँ मौजूदा समय-सीमा या रिफंड वादे के रूप में उपयोग नहीं किया गया है।'],
      },
      {
        title: 'IHMCL — National Highways helpline 1033',
        url: 'https://ihmcl.co.in/24x7-national-highways-helpline-1033-page/',
        note: ['Explains highway and FASTag/plaza assistance on NHAI tolled stretches; it is not a universal bank-account dispute channel.', 'NHAI के टोल वाले मार्गों पर राजमार्ग और FASTag/प्लाज़ा सहायता समझाता है; यह हर बैंक-खाता विवाद के लिए सामान्य चैनल नहीं है।'],
      },
    ],
    relatedSlugs: ['wrong-e-challan', 'fake-challan-message'],
  },
  {
    slug: 'fake-challan-message',
    title: ['Is that e-Challan SMS genuine? Check safely before you act', 'क्या ई-चालान वाला SMS सही है? कदम उठाने से पहले सुरक्षित जाँचें'],
    description: ['Use an independent official route to check an unexpected challan message. Review warning signs without opening its links or treating a message checker as proof.', 'अचानक मिले चालान संदेश को स्वतंत्र आधिकारिक रास्ते से जाँचें। उसके लिंक खोले बिना चेतावनी संकेत देखें और संदेश जाँच के परिणाम को प्रमाण न मानें।'],
    answer: ['An unexpected challan SMS is a reason to check the official record, not proof that money is due. Avoid using the message itself as the route for verification. Open the relevant official service independently and compare the record with the message. A familiar name, logo or vehicle number in a message does not establish who sent it.', 'अचानक मिला चालान SMS आधिकारिक रिकॉर्ड जाँचने का कारण है, बकाया राशि का प्रमाण नहीं। सत्यापन के लिए उसी संदेश का रास्ता उपयोग करने से बचें। संबंधित आधिकारिक सेवा स्वतंत्र रूप से खोलें और रिकॉर्ड को संदेश से मिलाएँ। संदेश में परिचित नाम, लोगो या वाहन नंबर होने से भेजने वाले की पहचान साबित नहीं होती।'],
    readMinutes: 3,
    publishedAt: '2026-09-13',
    updatedAt: '2026-09-13',
    steps: [
      {
        title: ['Pause before following the message', 'संदेश के निर्देश मानने से पहले रुकें'],
        body: ['Do not install an app, open an attachment or share credentials because an unexpected message asks you to. The official eChallan portal warns about impersonating websites and apps, and requests for passwords, OTPs and payment details through unsolicited communications. Keep the original text so you can compare or report what was sent.', 'अचानक मिले संदेश के कहने पर ऐप इंस्टॉल न करें, अटैचमेंट न खोलें और गोपनीय जानकारी साझा न करें। आधिकारिक eChallan पोर्टल नकली वेबसाइटों और ऐप तथा अनचाहे संचार में पासवर्ड, OTP और भुगतान विवरण की माँग से सावधान करता है। मूल पाठ रखें ताकि उसे मिला सकें या बता सकें कि क्या भेजा गया था।'],
      },
      {
        title: ['Check the wording without opening links', 'लिंक खोले बिना संदेश पढ़ें'],
        body: ['Look for pressure to act immediately, requests for secret information, unexpected app downloads, and a web address whose actual domain differs from the claimed service. These are warning signs, not a verdict. ChallanSakshi can review pasted text with links kept inactive; it cannot authenticate the sender or certify a message as safe.', 'तुरंत कदम उठाने का दबाव, गोपनीय जानकारी की माँग, अनपेक्षित ऐप डाउनलोड और दावा की गई सेवा से अलग वास्तविक डोमेन देखें। ये चेतावनी संकेत हैं, अंतिम निष्कर्ष नहीं। ChallanSakshi पेस्ट किए पाठ को निष्क्रिय लिंक के साथ जाँच सकता है; वह भेजने वाले को प्रमाणित या संदेश को सुरक्षित घोषित नहीं कर सकता।'],
      },
      {
        title: ['Verify through a separate official route', 'अलग आधिकारिक रास्ते से पुष्टि करें'],
        body: ['Use Official sources to reach the appropriate public service, then follow the instructions there. Compare the challan number, vehicle and issuing authority with the record you find. A lookup problem or missing match is not proof of a scam; check the authority and available route. Handle any legitimate portal verification yourself on that portal.', 'उचित सार्वजनिक सेवा तक पहुँचने के लिए आधिकारिक स्रोत पेज उपयोग करें, फिर वहाँ के निर्देश देखें। मिले रिकॉर्ड से चालान नंबर, वाहन और जारीकर्ता प्राधिकरण मिलाएँ। खोज में समस्या या मेल न मिलना ठगी का प्रमाण नहीं है; प्राधिकरण और उपलब्ध रास्ता जाँचें। वैध पोर्टल का कोई भी सत्यापन उसी पोर्टल पर स्वयं करें।'],
      },
      {
        title: ['Keep a record if something is wrong', 'कुछ गलत लगे तो रिकॉर्ड रखें'],
        body: ['Preserve the message, sender information, visible address and any transaction reference without forwarding sensitive details publicly. The eChallan portal directs suspicious-activity reports to police authorities. If a fraudulent or unauthorised payment may have occurred, contact your bank through its independently obtained official channel; NPCI identifies the bank as the redressal route for those transactions.', 'निजी विवरण सार्वजनिक रूप से फ़ॉरवर्ड किए बिना संदेश, भेजने वाले की जानकारी, दिखाई देने वाला पता और कोई लेन-देन संदर्भ रखें। eChallan पोर्टल संदिग्ध गतिविधि की सूचना पुलिस प्राधिकारियों को देने को कहता है। धोखाधड़ी या अनधिकृत भुगतान की आशंका हो तो स्वतंत्र रूप से मिले आधिकारिक चैनल से बैंक से संपर्क करें; NPCI ऐसे लेन-देन के निवारण के लिए बैंक बताता है।'],
      },
    ],
    checklist: [
      ['Original message and sender details preserved', 'मूल संदेश और भेजने वाले का विवरण सुरक्षित'],
      ['Links and downloads left unopened during the check', 'जाँच के दौरान लिंक और डाउनलोड न खोले गए हों'],
      ['Official service opened independently', 'आधिकारिक सेवा स्वतंत्र रूप से खोली गई हो'],
      ['Message details compared with the official record', 'संदेश के विवरण आधिकारिक रिकॉर्ड से मिलाए गए हों'],
      ['Unclear findings kept uncertain; no invented safety verdict', 'अस्पष्ट निष्कर्ष अनिश्चित रहें; सुरक्षा का मनगढ़ंत दावा न हो'],
    ],
    caution: ['A warning-free result does not mean a message is genuine. Message text alone cannot establish a debt, legal status or sender identity. Do not paste passwords, OTPs, full payment-card details or other secrets into the checker. If you need to report an incident, use the appropriate official channel rather than the project feedback number.', 'चेतावनी न मिलने का मतलब संदेश सही होना नहीं है। केवल संदेश का पाठ बकाया, कानूनी स्थिति या भेजने वाले की पहचान तय नहीं कर सकता। जाँच में पासवर्ड, OTP, पूरा भुगतान-कार्ड विवरण या अन्य गोपनीय जानकारी पेस्ट न करें। घटना बतानी हो तो परियोजना प्रतिक्रिया नंबर के बजाय उचित आधिकारिक चैनल उपयोग करें।'],
    nextAction: { href: '/message-check', label: ['Check a message safely', 'संदेश सुरक्षित ढंग से जाँचें'] },
    sources: [
      {
        title: 'MoRTH eChallan — official impersonation warning',
        url: 'https://echallan.parivahan.gov.in/gsticket/',
        note: ['The official portal displays a warning about impersonating sites/apps and unsolicited requests for sensitive information. Use Official sources for the route appropriate to your record.', 'आधिकारिक पोर्टल नकली साइटों/ऐप और गोपनीय जानकारी की अनचाही माँग के बारे में चेतावनी दिखाता है। अपने रिकॉर्ड के उचित रास्ते के लिए आधिकारिक स्रोत पेज उपयोग करें।'],
      },
      {
        title: 'NPCI — complaint and transaction guidance',
        url: 'https://www.npci.org.in/register-a-complaint',
        note: ['Explains the role of the bank or member institution, and directs fraudulent, unidentified or unauthorised transaction complaints to the relevant bank.', 'बैंक या सदस्य संस्था की भूमिका समझाता है और धोखाधड़ी, अपरिचित या अनधिकृत लेन-देन की शिकायत के लिए संबंधित बैंक बताता है।'],
      },
    ],
    relatedSlugs: ['wrong-e-challan', 'fastag-wrong-deduction'],
  },
];

export function findCivicGuide(slug: string): CivicGuide | undefined {
  return civicGuides.find((guide) => guide.slug === slug);
}
