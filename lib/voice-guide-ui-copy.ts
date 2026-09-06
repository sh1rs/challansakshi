export type VoiceUiLanguage = 'en' | 'hi' | 'te';

export interface VoiceUiCopy {
  title: string;
  intro: string;
  localOnly: string;
  language: string;
  start: string;
  stop: string;
  stopSpeaking: string;
  close: string;
  window: { title: string; move: string; moveHint: string; resize: string; minimize: string; restore: string; reset: string; keyboardHint: string };
  typeLabel: string;
  typePlaceholder: string;
  send: string;
  heard: string;
  editTranscript: string;
  useTranscript: string;
  assistant: string;
  downloadTitle: string;
  downloadBody: string;
  downloadConsent: string;
  downloadAction: string;
  downloadProgress: string;
  downloadCancel: string;
  deviceVoice: string;
  compactVoice: string;
  noVoice: string;
  unsupported: string;
  privacy: string;
  interruptHint: string;
  screenContext: string;
  modelReady: string;
  retry: string;
  suggestion: string;
  confirmSuggestion: string;
  discardSuggestion: string;
  pronunciationNote: string;
  state: Record<'idle' | 'loading' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error', string>;
  errors: Record<string, string>;
}

const COPY: Record<VoiceUiLanguage, VoiceUiCopy> = {
  en: {
    title: 'Your review companion',
    intro: 'Ask about this step. Speak, or type a question.',
    localOnly: 'On your device',
    language: 'Conversation language',
    start: 'Start conversation',
    stop: 'Turn mic off',
    stopSpeaking: 'Stop speaking',
    close: 'Close companion',
    window: { title: 'Ask Sakshi', move: 'Move companion', moveHint: 'Drag to move', resize: 'Resize companion', minimize: 'Minimize companion', restore: 'Restore companion', reset: 'Reset position and size', keyboardHint: 'Use arrow keys to move or resize. Hold Shift for larger steps.' },
    typeLabel: 'Your question',
    typePlaceholder: 'What should I check here?',
    send: 'Ask',
    heard: 'What I heard',
    editTranscript: 'Edit what I heard',
    useTranscript: 'Use this text',
    assistant: 'Companion',
    downloadTitle: 'Set up private voice',
    downloadBody: 'Download about 70 MB of speech files on first use. The first load may take a few minutes; later starts can use your browser’s cache. Model files come from Hugging Face. Your audio and document contents stay on this device.',
    downloadConsent: 'I agree to download the speech model using my data connection.',
    downloadAction: 'Download & start',
    downloadProgress: 'Getting voice ready…',
    downloadCancel: 'Cancel download',
    deviceVoice: 'Device voice',
    compactVoice: 'Compact local voice · robotic sound',
    noVoice: 'Speech is unavailable here. You can still read and type.',
    unsupported: 'This browser cannot run private voice. You can still type your question.',
    privacy: 'The companion knows this review’s step, field labels and status. It cannot see other tabs. Audio is processed locally and is not saved by ChallanSakshi.',
    interruptHint: 'Speak to interrupt. Use headphones if the mic picks up the reply.',
    screenContext: 'With you on this step',
    modelReady: 'Speech model ready',
    retry: 'Try again',
    suggestion: 'Suggested correction — check before applying',
    confirmSuggestion: 'Apply this correction',
    discardSuggestion: 'Keep current value',
    pronunciationNote: 'Hindi and Telugu guidance is a pilot. Check names and numbers carefully.',
    state: { idle: 'Ready when you are', loading: 'Getting voice ready', listening: 'Listening', transcribing: 'Reading your speech', thinking: 'Checking this step', speaking: 'Speaking', error: 'Voice needs attention' },
    errors: {
      'microphone-denied': 'Microphone access was denied. Allow it in your browser settings, or type your question.',
      'microphone-unavailable': 'No microphone is available. Connect one, or type your question.',
      'microphone-failed': 'The microphone could not start. Check that another app is not using it, then try again.',
      'model-load-failed': 'The speech model could not load. Check your connection and try again, or keep typing.',
      'model-failed': 'The speech model could not run on this device. You can keep using text.',
      'model-unavailable': 'The speech model is unavailable on this device. Try again, or keep typing.',
      'audio-unavailable': 'Your browser could not start audio. Check microphone access, or type your question.',
      'transcription-failed': 'I could not read that audio. Try a short sentence, or type it.',
      'no-speech': 'I did not catch any speech. Try again, or type your question.',
      'speech-unavailable': 'No local speech output is available. The reply is still shown below.',
      'speech-load-failed': 'The compact voice could not load. Check your connection and try again.',
      'speech-blocked': 'Your browser paused audio. Tap Start conversation or Ask to enable it.',
      'speech-failed': 'The spoken reply could not play. You can read the reply below.',
      'speech-timeout': 'Speech paused unexpectedly. Try again, or read the reply below.',
      'unsupported': 'Private voice is not supported in this browser. You can still type.',
      'unknown': 'Voice stopped unexpectedly. Try again, or continue by typing.',
    },
  },
  hi: {
    title: 'आपकी जाँच का साथी',
    intro: 'इस चरण के बारे में पूछें। बोलें या सवाल लिखें।',
    localOnly: 'आपके डिवाइस पर',
    language: 'बातचीत की भाषा',
    start: 'बातचीत शुरू करें',
    stop: 'माइक बंद करें',
    stopSpeaking: 'बोलना रोकें',
    close: 'साथी बंद करें',
    window: { title: 'साक्षी से पूछें', move: 'सहायक को खिसकाएँ', moveHint: 'पकड़कर खिसकाएँ', resize: 'सहायक का आकार बदलें', minimize: 'सहायक छोटा करें', restore: 'सहायक फिर खोलें', reset: 'जगह और आकार रीसेट करें', keyboardHint: 'खिसकाने या आकार बदलने के लिए तीर वाली कुंजियाँ दबाएँ। ज़्यादा बदलाव के लिए Shift दबाए रखें।' },
    typeLabel: 'आपका सवाल',
    typePlaceholder: 'यहाँ मुझे क्या जाँचना चाहिए?',
    send: 'पूछें',
    heard: 'मैंने यह सुना',
    editTranscript: 'सुनी गई बात सुधारें',
    useTranscript: 'यह पाठ इस्तेमाल करें',
    assistant: 'साथी',
    downloadTitle: 'निजी आवाज़ सुविधा तैयार करें',
    downloadBody: 'पहली बार आवाज़ के लिए लगभग 70 MB फ़ाइलें डाउनलोड होंगी। पहली बार कुछ मिनट लग सकते हैं; बाद में ब्राउज़र में सहेजी गई फ़ाइलें इस्तेमाल हो सकती हैं। मॉडल की फ़ाइलें Hugging Face से आती हैं। आपकी आवाज़ और दस्तावेज़ की जानकारी इसी डिवाइस पर रहती है।',
    downloadConsent: 'मैं अपने डेटा कनेक्शन से आवाज़ का मॉडल डाउनलोड करने के लिए सहमत हूँ।',
    downloadAction: 'डाउनलोड करके शुरू करें',
    downloadProgress: 'आवाज़ सुविधा तैयार हो रही है…',
    downloadCancel: 'डाउनलोड रद्द करें',
    deviceVoice: 'डिवाइस की आवाज़',
    compactVoice: 'छोटी स्थानीय आवाज़ · रोबोट जैसी ध्वनि',
    noVoice: 'यहाँ आवाज़ उपलब्ध नहीं है। आप पढ़ और लिख सकते हैं।',
    unsupported: 'यह ब्राउज़र निजी आवाज़ सुविधा नहीं चला सकता। आप सवाल लिख सकते हैं।',
    privacy: 'साथी इस जाँच के चरण, जानकारी के नाम और स्थिति को समझता है। वह दूसरे टैब नहीं देख सकता। आवाज़ इसी डिवाइस पर समझी जाती है और ChallanSakshi उसे सहेजता नहीं है।',
    interruptHint: 'बीच में बोलकर रोकें। अगर माइक जवाब की आवाज़ पकड़ता है, तो हेडफ़ोन लगाएँ।',
    screenContext: 'इस चरण में आपके साथ',
    modelReady: 'आवाज़ का मॉडल तैयार है',
    retry: 'फिर कोशिश करें',
    suggestion: 'सुझाया गया सुधार — लागू करने से पहले जाँचें',
    confirmSuggestion: 'यह सुधार लागू करें',
    discardSuggestion: 'मौजूदा जानकारी रखें',
    pronunciationNote: 'हिन्दी और तेलुगु मार्गदर्शन अभी परीक्षण में है। नाम और नंबर ध्यान से जाँचें।',
    state: { idle: 'जब आप तैयार हों', loading: 'आवाज़ सुविधा तैयार हो रही है', listening: 'सुन रहा हूँ', transcribing: 'आपकी बात समझ रहा हूँ', thinking: 'इस चरण की जाँच कर रहा हूँ', speaking: 'बोल रहा हूँ', error: 'आवाज़ सुविधा पर ध्यान दें' },
    errors: {
      'microphone-denied': 'माइक की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें या अपना सवाल लिखें।',
      'microphone-unavailable': 'माइक उपलब्ध नहीं है। माइक जोड़ें या अपना सवाल लिखें।',
      'microphone-failed': 'माइक शुरू नहीं हो सका। देखें कि कोई दूसरा ऐप माइक इस्तेमाल तो नहीं कर रहा, फिर कोशिश करें।',
      'model-load-failed': 'आवाज़ का मॉडल लोड नहीं हुआ। इंटरनेट जाँचकर फिर कोशिश करें या लिखकर जारी रखें।',
      'model-failed': 'इस डिवाइस पर आवाज़ का मॉडल नहीं चल सका। आप लिखकर जारी रख सकते हैं।',
      'model-unavailable': 'इस डिवाइस पर आवाज़ का मॉडल उपलब्ध नहीं है। फिर कोशिश करें या लिखकर जारी रखें।',
      'audio-unavailable': 'ब्राउज़र ऑडियो शुरू नहीं कर सका। माइक की अनुमति जाँचें या अपना सवाल लिखें।',
      'transcription-failed': 'मैं वह आवाज़ नहीं समझ सका। छोटा वाक्य बोलें या लिखें।',
      'no-speech': 'मुझे कोई बात सुनाई नहीं दी। फिर बोलें या सवाल लिखें।',
      'speech-unavailable': 'स्थानीय आवाज़ उपलब्ध नहीं है। जवाब नीचे लिखा है।',
      'speech-load-failed': 'छोटी आवाज़ सुविधा लोड नहीं हुई। इंटरनेट जाँचकर फिर कोशिश करें।',
      'speech-blocked': 'ब्राउज़र ने आवाज़ रोक दी। अनुमति के लिए बातचीत शुरू करें या पूछें पर टैप करें।',
      'speech-failed': 'जवाब की आवाज़ नहीं चल सकी। आप नीचे जवाब पढ़ सकते हैं।',
      'speech-timeout': 'आवाज़ अचानक रुक गई। फिर कोशिश करें या नीचे जवाब पढ़ें।',
      'unsupported': 'इस ब्राउज़र में निजी आवाज़ सुविधा उपलब्ध नहीं है। आप लिख सकते हैं।',
      'unknown': 'आवाज़ सुविधा अचानक रुक गई। फिर कोशिश करें या लिखकर जारी रखें।',
    },
  },
  te: {
    title: 'మీ పరిశీలన సహాయకుడు',
    intro: 'ఈ దశ గురించి అడగండి. మాట్లాడండి లేదా ప్రశ్న రాయండి.',
    localOnly: 'మీ పరికరంలోనే',
    language: 'సంభాషణ భాష',
    start: 'సంభాషణ ప్రారంభించండి',
    stop: 'మైక్ ఆపండి',
    stopSpeaking: 'మాట్లాడటం ఆపండి',
    close: 'సహాయకుడిని మూసివేయండి',
    window: { title: 'సాక్షిని అడగండి', move: 'సహాయకాన్ని జరపండి', moveHint: 'పట్టుకుని జరపండి', resize: 'సహాయకం పరిమాణం మార్చండి', minimize: 'సహాయకాన్ని చిన్నది చేయండి', restore: 'సహాయకాన్ని తిరిగి తెరవండి', reset: 'స్థానం, పరిమాణం రీసెట్ చేయండి', keyboardHint: 'జరపడానికి లేదా పరిమాణం మార్చడానికి బాణం కీలను వాడండి. పెద్ద మార్పుల కోసం Shift నొక్కి ఉంచండి.' },
    typeLabel: 'మీ ప్రశ్న',
    typePlaceholder: 'ఇక్కడ నేను ఏమి తనిఖీ చేయాలి?',
    send: 'అడగండి',
    heard: 'నేను విన్నది',
    editTranscript: 'విన్న మాటలను సవరించండి',
    useTranscript: 'ఈ వాక్యాన్ని ఉపయోగించండి',
    assistant: 'సహాయకుడు',
    downloadTitle: 'వ్యక్తిగత వాయిస్ సదుపాయం సిద్ధం చేయండి',
    downloadBody: 'మొదటిసారి వాయిస్ కోసం సుమారు 70 MB ఫైళ్లు డౌన్‌లోడ్ అవుతాయి. మొదటిసారి కొన్ని నిమిషాలు పట్టవచ్చు; తర్వాత బ్రౌజర్‌లో నిల్వ చేసిన ఫైళ్లను ఉపయోగించవచ్చు. మోడల్ ఫైళ్లు Hugging Face నుంచి వస్తాయి. మీ ఆడియో, పత్రాల సమాచారం ఈ పరికరంలోనే ఉంటాయి.',
    downloadConsent: 'నా డేటా కనెక్షన్‌తో వాయిస్ మోడల్‌ను డౌన్‌లోడ్ చేయడానికి అంగీకరిస్తున్నాను.',
    downloadAction: 'డౌన్‌లోడ్ చేసి ప్రారంభించండి',
    downloadProgress: 'వాయిస్ సదుపాయం సిద్ధమవుతోంది…',
    downloadCancel: 'డౌన్‌లోడ్ రద్దు చేయండి',
    deviceVoice: 'పరికరంలోని స్వరం',
    compactVoice: 'చిన్న స్థానిక స్వరం · రోబోట్‌లా వినిపిస్తుంది',
    noVoice: 'ఇక్కడ వాయిస్ అందుబాటులో లేదు. మీరు చదవవచ్చు, రాయవచ్చు.',
    unsupported: 'ఈ బ్రౌజర్‌లో వ్యక్తిగత వాయిస్ సదుపాయం పనిచేయదు. మీ ప్రశ్నను రాయవచ్చు.',
    privacy: 'సహాయకుడు ఈ పరిశీలన దశను, వివరాల పేర్లను, స్థితిని అర్థం చేసుకుంటాడు. ఇతర ట్యాబ్‌లను చూడలేడు. ఆడియోను ఈ పరికరంలోనే అర్థం చేసుకుంటాడు; ChallanSakshi దాన్ని నిల్వ చేయదు.',
    interruptHint: 'మధ్యలో మాట్లాడి ఆపవచ్చు. మైక్ సమాధానాన్ని కూడా వింటుంటే హెడ్‌ఫోన్లు వాడండి.',
    screenContext: 'ఈ దశలో మీతోనే',
    modelReady: 'వాయిస్ మోడల్ సిద్ధంగా ఉంది',
    retry: 'మళ్లీ ప్రయత్నించండి',
    suggestion: 'సూచించిన సవరణ — వర్తింపజేసే ముందు తనిఖీ చేయండి',
    confirmSuggestion: 'ఈ సవరణను వర్తింపజేయండి',
    discardSuggestion: 'ప్రస్తుత వివరాలనే ఉంచండి',
    pronunciationNote: 'హిందీ, తెలుగు మార్గదర్శకత్వం ఇంకా ప్రయోగ దశలో ఉంది. పేర్లు, నంబర్లను జాగ్రత్తగా తనిఖీ చేయండి.',
    state: { idle: 'మీరు సిద్ధమైనప్పుడు ప్రారంభించండి', loading: 'వాయిస్ సదుపాయం సిద్ధమవుతోంది', listening: 'వింటున్నాను', transcribing: 'మీ మాటలను అర్థం చేసుకుంటున్నాను', thinking: 'ఈ దశను తనిఖీ చేస్తున్నాను', speaking: 'మాట్లాడుతున్నాను', error: 'వాయిస్ సదుపాయాన్ని తనిఖీ చేయండి' },
    errors: {
      'microphone-denied': 'మైక్ అనుమతి లభించలేదు. బ్రౌజర్ సెట్టింగుల్లో అనుమతి ఇవ్వండి లేదా మీ ప్రశ్న రాయండి.',
      'microphone-unavailable': 'మైక్ అందుబాటులో లేదు. మైక్ కనెక్ట్ చేయండి లేదా మీ ప్రశ్న రాయండి.',
      'microphone-failed': 'మైక్ ప్రారంభం కాలేదు. మరో యాప్ మైక్ వాడుతోందేమో చూసి మళ్లీ ప్రయత్నించండి.',
      'model-load-failed': 'వాయిస్ మోడల్ లోడ్ కాలేదు. ఇంటర్నెట్ కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి లేదా రాయడం కొనసాగించండి.',
      'model-failed': 'ఈ పరికరంలో వాయిస్ మోడల్ పనిచేయలేదు. మీరు రాయడం కొనసాగించవచ్చు.',
      'model-unavailable': 'ఈ పరికరంలో వాయిస్ మోడల్ అందుబాటులో లేదు. మళ్లీ ప్రయత్నించండి లేదా రాయడం కొనసాగించండి.',
      'audio-unavailable': 'బ్రౌజర్ ఆడియోను ప్రారంభించలేకపోయింది. మైక్ అనుమతిని తనిఖీ చేయండి లేదా మీ ప్రశ్న రాయండి.',
      'transcription-failed': 'ఆ ఆడియో నాకు అర్థం కాలేదు. చిన్న వాక్యం చెప్పండి లేదా రాయండి.',
      'no-speech': 'నాకు మాటలు వినిపించలేదు. మళ్లీ చెప్పండి లేదా మీ ప్రశ్న రాయండి.',
      'speech-unavailable': 'స్థానిక వాయిస్ అందుబాటులో లేదు. సమాధానం కింద కనిపిస్తుంది.',
      'speech-load-failed': 'చిన్న స్వరం లోడ్ కాలేదు. ఇంటర్నెట్ కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
      'speech-blocked': 'బ్రౌజర్ ఆడియోను ఆపింది. ఆడియో కోసం సంభాషణ ప్రారంభించండి లేదా అడగండి బటన్ నొక్కండి.',
      'speech-failed': 'సమాధానం వినిపించలేదు. కింద ఉన్న సమాధానాన్ని చదవవచ్చు.',
      'speech-timeout': 'ఆడియో అనుకోకుండా ఆగింది. మళ్లీ ప్రయత్నించండి లేదా కింద సమాధానం చదవండి.',
      'unsupported': 'ఈ బ్రౌజర్‌లో వ్యక్తిగత వాయిస్ సదుపాయం లేదు. మీరు రాయవచ్చు.',
      'unknown': 'వాయిస్ అనుకోకుండా ఆగింది. మళ్లీ ప్రయత్నించండి లేదా రాయడం కొనసాగించండి.',
    },
  },
};

export function getVoiceUiCopy(language: VoiceUiLanguage): VoiceUiCopy {
  return COPY[language];
}
