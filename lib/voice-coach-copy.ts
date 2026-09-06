type CopyLanguage = 'en' | 'hi' | 'te';

const copy = {
  unknown: {
    en: 'Try “What do I do here?”, “Show photo”, or “Edit amount”. I can guide the controls on this page.',
    hi: '“अब क्या करना है?”, “तस्वीर दिखाओ” या “राशि बदलो” कहें। मैं इस पेज पर मदद कर सकता हूँ।',
    te: '“ఇప్పుడు ఏం చేయాలి?”, “ఫోటో చూపించు” లేదా “మొత్తం మార్చు” అనండి. ఈ పేజీలో మీకు సహాయం చేస్తాను.',
  },
  busy: {
    en: 'Your document is still being read. Please wait for the details before changing them.',
    hi: 'दस्तावेज़ अभी पढ़ा जा रहा है। विवरण बदलने से पहले पढ़ना पूरा होने दें।',
    te: 'మీ పత్రాన్ని ఇంకా చదువుతున్నాం. వివరాలు మార్చే ముందు చదవడం పూర్తయ్యే వరకు వేచి ఉండండి.',
  },
  recovery: {
    en: 'There is a problem with the reading or correction. Check the message on this page. Try a clearer record, correct the value, or use manual review.',
    hi: 'पढ़ने या सुधार में समस्या है। पेज पर संदेश देखें। साफ़ रिकॉर्ड चुनें, मान सुधारें या मैन्युअल समीक्षा करें।',
    te: 'పత్రం చదవడంలో లేదా సవరణలో సమస్య ఉంది. పేజీలోని సందేశం చూడండి. స్పష్టమైన పత్రం ఎంచుకోండి, విలువ సరిచేయండి లేదా మాన్యువల్ సమీక్ష వాడండి.',
  },
  read: {
    en: 'Start by choosing your challan PDF or a clear image. The app reads the details on this device. You will check the readings next.',
    hi: 'चालान की PDF या साफ़ तस्वीर चुनें। ऐप इसी डिवाइस पर विवरण पढ़ेगा। फिर आप पढ़े गए विवरण जाँचेंगे।',
    te: 'ముందుగా మీ చలాన్ PDF లేదా స్పష్టమైన ఫోటో ఎంచుకోండి. ఈ పరికరంలోనే వివరాలు చదువుతాం. తర్వాత చదివిన వివరాలను మీరు తనిఖీ చేయండి.',
  },
  check: {
    en: 'Check the extracted details against each source. Open a source reading or edit a value that needs correcting. Use the page button when you have checked the readings.',
    hi: 'पढ़े गए विवरण मूल स्रोत से मिलाएँ। स्रोत खोलें या ज़रूरी मान सुधारें। जाँच पूरी होने पर पेज का बटन दबाएँ।',
    te: 'చదివిన వివరాలను అసలు పత్రంతో పోల్చండి. మూలం చూడండి లేదా అవసరమైన విలువ సరిచేయండి. వివరాలు తనిఖీ చేసిన తర్వాత పేజీలోని బటన్ వాడండి.',
  },
  prepared: {
    en: 'Your review note is prepared. Check it with your original records, then use the official service for your next step. You decide what to submit there.',
    hi: 'आपका समीक्षा नोट तैयार है। उसे मूल रिकॉर्ड से मिलाएँ, फिर अगले कदम के लिए आधिकारिक सेवा खोलें। वहाँ क्या जमा करना है, आप तय करेंगे।',
    te: 'మీ సమీక్ష నోట్ సిద్ధంగా ఉంది. అసలు పత్రాలతో పోల్చి, తర్వాతి చర్య కోసం అధికారిక సేవ వాడండి. అక్కడ ఏమి సమర్పించాలో మీరు నిర్ణయించండి.',
  },
  missingNotice: {
    en: 'A readable challan copy is missing. Choose it yourself using the challan control. You can also use manual review if you have no usable document.',
    hi: 'पढ़ने योग्य चालान कॉपी नहीं है। चालान वाले नियंत्रण से फ़ाइल स्वयं चुनें। उपयोगी दस्तावेज़ न हो तो मैन्युअल समीक्षा करें।',
    te: 'చదవగలిగే చలాన్ కాపీ లేదు. చలాన్ బటన్‌తో ఫైల్‌ను మీరే ఎంచుకోండి. సరైన పత్రం లేకుంటే మాన్యువల్ సమీక్ష వాడండి.',
  },
  missingRecord: {
    en: 'An independent vehicle record, such as your RC, would let you compare the registrations. You can continue without it, but the comparison may stay inconclusive.',
    hi: 'पंजीकरण मिलाने के लिए RC जैसा स्वतंत्र वाहन रिकॉर्ड मदद करेगा। उसके बिना आगे बढ़ सकते हैं, पर तुलना अनिर्णायक रह सकती है।',
    te: 'రిజిస్ట్రేషన్ వివరాలను పోల్చడానికి RC వంటి స్వతంత్ర వాహన రికార్డు ఉపయోగపడుతుంది. అది లేకున్నా కొనసాగవచ్చు, కానీ పోలిక స్పష్టంగా తేలకపోవచ్చు.',
  },
  missingPhoto: {
    en: 'Both record types are present. Check any uncertain readings against their sources. If your concern is the enforcement photo, open the photo area and add the image you have.',
    hi: 'दोनों तरह के रिकॉर्ड मौजूद हैं। अस्पष्ट विवरण स्रोत से जाँचें। चालान की तस्वीर पर सवाल हो तो तस्वीर वाला भाग खोलकर अपनी तस्वीर जोड़ें।',
    te: 'రెండు రకాల పత్రాలు ఉన్నాయి. సందేహంగా ఉన్న వివరాలను మూలాలతో పోల్చండి. చలాన్ ఫోటోపై సందేహం ఉంటే ఫోటో భాగం తెరిచి మీ దగ్గరున్న చిత్రాన్ని జోడించండి.',
  },
  missingUnknown: {
    en: 'The selected records and photo are present. Check unclear readings and the limitations shown on this page; their presence alone does not establish that all needed evidence is available.',
    hi: 'चुने गए रिकॉर्ड और तस्वीर मौजूद हैं। अस्पष्ट विवरण और पेज पर दी गई सीमाएँ जाँचें। केवल फ़ाइलें मौजूद होने से सभी ज़रूरी सबूत होने की पुष्टि नहीं होती।',
    te: 'ఎంచుకున్న పత్రాలు, ఫోటో ఉన్నాయి. స్పష్టంగా లేని వివరాలు, పేజీలోని పరిమితులు చూడండి. ఫైళ్లు ఉండటంతోనే అవసరమైన ఆధారాలన్నీ ఉన్నాయని చెప్పలేం.',
  },
  photo: {
    en: 'Here is the photo area. Choose or inspect the image yourself and compare what is visible with your records.',
    hi: 'तस्वीर वाला भाग यहाँ है। तस्वीर स्वयं चुनें या देखें और जो दिखता है उसे अपने रिकॉर्ड से मिलाएँ।',
    te: 'ఇది ఫోటో భాగం. మీరే చిత్రాన్ని ఎంచుకోండి లేదా పరిశీలించండి. కనిపించే వివరాలను మీ రికార్డులతో పోల్చండి.',
  },
  sources: {
    en: 'Here are your source records. Compare the reading with the original document and page.',
    hi: 'ये आपके स्रोत रिकॉर्ड हैं। पढ़े गए विवरण मूल दस्तावेज़ और पृष्ठ से मिलाएँ।',
    te: 'ఇవి మీ మూల పత్రాలు. చదివిన వివరాలను అసలు పత్రం, పేజీతో పోల్చండి.',
  },
  review: {
    en: 'Back to your document review. Check the sources before changing a reading.',
    hi: 'दस्तावेज़ की समीक्षा पर लौटें। विवरण बदलने से पहले स्रोत जाँचें।',
    te: 'పత్రాల సమీక్షకు తిరిగి వెళ్దాం. వివరాలు మార్చే ముందు మూలాలు చూడండి.',
  },
  uploadNotice: {
    en: 'Here is the challan control. Tap it to choose a PDF or image yourself.',
    hi: 'यह चालान वाला नियंत्रण है। PDF या तस्वीर स्वयं चुनने के लिए इसे दबाएँ।',
    te: 'ఇది చలాన్ బటన్. PDF లేదా ఫోటోను మీరే ఎంచుకోవడానికి దాన్ని నొక్కండి.',
  },
  uploadRecord: {
    en: 'Here is the vehicle record control. Tap it to choose your RC or other readable vehicle record yourself.',
    hi: 'यह वाहन रिकॉर्ड वाला नियंत्रण है। RC या पढ़ने योग्य वाहन रिकॉर्ड स्वयं चुनने के लिए इसे दबाएँ।',
    te: 'ఇది వాహన రికార్డు బటన్. RC లేదా చదవగలిగే వాహన పత్రాన్ని మీరే ఎంచుకోవడానికి దాన్ని నొక్కండి.',
  },
  edit: {
    en: 'The correction field is open. Say the value clearly, then check the editable suggestion against the source before applying it.',
    hi: 'सुधार का खांचा खुला है। मान साफ़ बोलें। सुझाव लागू करने से पहले उसे स्रोत से मिलाएँ; आप उसे बदल भी सकते हैं।',
    te: 'సవరణ ఖాళీ తెరిచాం. విలువ స్పష్టంగా చెప్పండి. సూచనను వర్తింపజేసే ముందు మూలంతో పోల్చండి; అవసరమైతే సవరించండి.',
  },
  clarifyField: {
    en: 'Which field do you mean? If both records have it, say “Edit challan registration” or “Edit RC registration”. You can also tap the exact field.',
    hi: 'कौन सा विवरण बदलना है? दोनों रिकॉर्ड में हो तो “चालान का पंजीकरण बदलो” या “RC का पंजीकरण बदलो” कहें। सही खांचे पर दबा भी सकते हैं।',
    te: 'ఏ వివరాన్ని మార్చాలి? రెండు పత్రాల్లో ఉంటే “చలాన్ రిజిస్ట్రేషన్ మార్చు” లేదా “RC రిజిస్ట్రేషన్ మార్చు” అనండి. కావలసిన ఖాళీని నొక్కవచ్చు.',
  },
  unavailableField: {
    en: 'I cannot identify one current field for that request. Tap the exact field you want to correct, or add a readable record first.',
    hi: 'इस अनुरोध के लिए एक मौजूदा खांचा नहीं मिला। सही खांचे पर दबाएँ या पहले पढ़ने योग्य रिकॉर्ड जोड़ें।',
    te: 'ఈ అభ్యర్థనకు సరిపోయే ఖాళీ కనిపించలేదు. సరిచేయాల్సిన ఖాళీని నొక్కండి లేదా ముందుగా చదవగలిగే పత్రం జోడించండి.',
  },
  suggestion: {
    en: 'This is an editable suggestion. Check it against the source, correct anything I misheard, then apply it yourself.',
    hi: 'यह बदलने योग्य सुझाव है। इसे स्रोत से मिलाएँ, गलत सुना हो तो सुधारें, फिर स्वयं लागू करें।',
    te: 'ఇది సవరించగల సూచన. మూలంతో పోల్చండి, తప్పుగా విన్నది ఉంటే సరిచేసి, మీరే వర్తింపజేయండి.',
  },
  invalidValue: {
    en: 'I could not identify one clear value for the open field. Say registration digits individually; use an exact numeric date, or type the value.',
    hi: 'खुले खांचे के लिए एक साफ़ मान नहीं समझ आया। पंजीकरण के अंक अलग-अलग बोलें; तारीख अंकों में दें या मान टाइप करें।',
    te: 'తెరిచిన ఖాళీకి స్పష్టమైన విలువ అర్థం కాలేదు. రిజిస్ట్రేషన్ అంకెలను విడిగా చెప్పండి; తేదీని అంకెల్లో ఇవ్వండి లేదా టైప్ చేయండి.',
  },
  openField: {
    en: 'Open the exact correction field first. A spoken value will only become a suggestion there; you check and apply it.',
    hi: 'पहले सही सुधार खांचा खोलें। बोला गया मान वहाँ सुझाव बनेगा; आप जाँचकर लागू करेंगे।',
    te: 'ముందుగా సరైన సవరణ ఖాళీ తెరవండి. చెప్పిన విలువ అక్కడ సూచనగా కనిపిస్తుంది; మీరు తనిఖీ చేసి వర్తింపజేయండి.',
  },
  ambiguous: {
    en: 'I have not changed anything. Give one clear instruction at a time, or use the page controls.',
    hi: 'कुछ नहीं बदला गया है। एक बार में एक साफ़ निर्देश दें या पेज के नियंत्रण इस्तेमाल करें।',
    te: 'ఏమీ మార్చలేదు. ఒక్కసారి ఒక స్పష్టమైన సూచన ఇవ్వండి లేదా పేజీలోని బటన్లు వాడండి.',
  },
  boundary: {
    en: 'Review and confirm records using the page controls. Any payment or submission is your choice on the official service. Voice only guides this review.',
    hi: 'रिकॉर्ड की जाँच और पुष्टि पेज के नियंत्रण से करें। भुगतान या जमा करने का निर्णय आधिकारिक सेवा पर आप करेंगे। आवाज़ केवल इस समीक्षा में मार्गदर्शन देती है।',
    te: 'పేజీలోని బటన్లతో రికార్డులు తనిఖీ చేసి నిర్ధారించండి. చెల్లింపు లేదా సమర్పణ అధికారిక సేవలో మీ నిర్ణయం. వాయిస్ ఈ సమీక్షలో మార్గదర్శనం మాత్రమే ఇస్తుంది.',
  },
  promptStep: { en: 'What do I do here?', hi: 'अब क्या करना है?', te: 'ఇప్పుడు ఏం చేయాలి?' },
  promptMissing: { en: 'What is missing?', hi: 'क्या बाकी है?', te: 'ఇంకా ఏమి కావాలి?' },
  promptPhoto: { en: 'Show photo', hi: 'तस्वीर दिखाओ', te: 'ఫోటో చూపించు' },
  promptSource: { en: 'Show sources', hi: 'स्रोत दिखाओ', te: 'సోర్స్ చూపించు' },
  promptBack: { en: 'Go back to review', hi: 'समीक्षा पर वापस जाओ', te: 'మళ్ళీ సమీక్ష చూపించు' },
} satisfies Record<string, Record<CopyLanguage, string>>;

export function coachText(key: keyof typeof copy, language: CopyLanguage): string { return copy[key][language]; }
