import type {
  ConfirmedVehicleFacts,
  EvidenceReadinessItem,
  ExtractedFact,
  FixtureId,
  LocalizedText,
} from './domain';

export interface EvidenceCardData {
  id: 'challan' | 'vehicle-record' | 'citizen-photo';
  title: LocalizedText;
  why: LocalizedText;
  kind: 'document' | 'record' | 'photo';
}

export interface DemoFixture {
  id: FixtureId;
  code: string;
  title: LocalizedText;
  shortDescription: LocalizedText;
  expectedFinding: 'mismatch' | 'inconclusive' | 'consistent';
  photoPanel: 'left' | 'centre' | 'right';
  ownerDisplay: string;
  issueDate: string;
  challanNumber: string;
  allegedRegistration: string;
  offence: LocalizedText;
  location: LocalizedText;
  incidentAt: string;
  timestamp: string;
  amount: string;
  authority: LocalizedText;
  imageNote: LocalizedText;
  confirmedFacts: ConfirmedVehicleFacts;
  extractedFacts: ExtractedFact[];
  evidenceCards: EvidenceCardData[];
  readiness: EvidenceReadinessItem[];
}

const sourceLabels = {
  challan: { en: 'Synthetic e-Challan', hi: 'सिंथेटिक ई-चालान' },
  record: { en: 'Synthetic vehicle record', hi: 'सिंथेटिक वाहन रिकॉर्ड' },
  photo: { en: 'Citizen vehicle photograph', hi: 'नागरिक की वाहन फ़ोटो' },
};

const evidenceCards: EvidenceCardData[] = [
  {
    id: 'challan',
    title: sourceLabels.challan,
    kind: 'document',
    why: {
      en: 'Shows the allegation, issue date, amount, and vehicle identifier recorded by the issuer.',
      hi: 'इसमें आरोप, जारी करने की तारीख, राशि और दर्ज किया गया वाहन नंबर दिखता है।',
    },
  },
  {
    id: 'vehicle-record',
    title: sourceLabels.record,
    kind: 'record',
    why: {
      en: 'Provides the citizen-confirmed registration, vehicle category, and colour for comparison.',
      hi: 'तुलना के लिए नागरिक द्वारा पुष्टि किया गया नंबर, वाहन प्रकार और रंग देता है।',
    },
  },
  {
    id: 'citizen-photo',
    title: sourceLabels.photo,
    kind: 'photo',
    why: {
      en: 'Adds a current visual reference without trying to prove ownership by itself.',
      hi: 'यह मौजूदा वाहन का दृश्य संदर्भ देता है, लेकिन अकेले मालिकाना हक साबित नहीं करता।',
    },
  },
];

const commonReadiness = (currentPhoto: boolean): EvidenceReadinessItem[] => [
  { id: 'challan-details', label: { en: 'Challan details', hi: 'चालान का विवरण' }, category: 'authority', status: 'present' },
  { id: 'enforcement-image', label: { en: 'Enforcement image', hi: 'प्रवर्तन की फ़ोटो' }, category: 'authority', status: 'present' },
  { id: 'vehicle-record', label: { en: 'Vehicle record', hi: 'वाहन रिकॉर्ड' }, category: 'citizen', status: 'present' },
  { id: 'current-photo', label: { en: 'Current vehicle photograph', hi: 'वाहन की मौजूदा फ़ोटो' }, category: 'citizen', status: currentPhoto ? 'present' : 'missing' },
  { id: 'confirmed-comparison', label: { en: 'Citizen-confirmed comparison', hi: 'नागरिक द्वारा पक्की की गई तुलना' }, category: 'citizen', status: 'present' },
  { id: 'location-evidence', label: { en: 'Additional time or location evidence', hi: 'समय या स्थान का अतिरिक्त सबूत' }, category: 'optional', status: 'optional' },
  { id: 'prior-ack', label: { en: 'Earlier grievance acknowledgement, if any', hi: 'पहले की शिकायत की रसीद, यदि हो' }, category: 'optional', status: 'optional' },
  { id: 'state-declaration', label: { en: 'State-specific declaration, if required', hi: 'राज्य के अनुसार घोषणा, यदि ज़रूरी हो' }, category: 'optional', status: 'optional' },
];

function fact(
  id: string,
  label: LocalizedText,
  value: string,
  source: ExtractedFact['source'],
  confidence: ExtractedFact['confidence'],
  visibility: ExtractedFact['visibility'],
  evidenceRef: string,
  uncertainty?: LocalizedText,
): ExtractedFact {
  return { id, label, value, source, confidence, visibility, evidenceRef, uncertainty, userConfirmationRequired: true };
}

export const fixtures: Record<FixtureId, DemoFixture> = {
  mismatch: {
    id: 'mismatch',
    code: 'CASE A',
    title: { en: 'Clear vehicle mismatch', hi: 'वाहन में साफ़ अंतर' },
    shortDescription: { en: 'Blue scooter record, white motorcycle image', hi: 'रिकॉर्ड में नीला स्कूटर, फ़ोटो में सफ़ेद मोटरसाइकिल' },
    expectedFinding: 'mismatch',
    photoPanel: 'left',
    ownerDisplay: 'Asha · demo citizen',
    issueDate: '2026-08-20',
    challanNumber: 'CS-DEMO-260820-A',
    allegedRegistration: 'TEST-26-SC-3317',
    offence: { en: 'Riding without a protective helmet', hi: 'सुरक्षा हेलमेट के बिना वाहन चलाना' },
    location: { en: 'Demo Junction, Pilot City', hi: 'डेमो जंक्शन, पायलट सिटी' },
    incidentAt: '2026-08-20T09:42:00+05:30',
    timestamp: '20 Aug 2026 · 09:42 IST',
    amount: '₹1,000',
    authority: { en: 'Synthetic Pilot Traffic Authority', hi: 'सिंथेटिक पायलट यातायात प्राधिकरण' },
    imageNote: {
      en: 'Clear enough to compare the vehicle category, colour, and registration. It does not establish the rider’s identity.',
      hi: 'वाहन का प्रकार, रंग और नंबर मिलाने के लिए फ़ोटो काफ़ी साफ़ है। इससे चालक की पहचान साबित नहीं होती।',
    },
    confirmedFacts: {
      registeredPlate: 'TEST-26-SC-3317',
      registeredCategory: 'Scooter',
      registeredColour: 'Blue',
      observedPlate: 'TEST-26-MC-3817',
      observedCategory: 'Motorcycle',
      observedColour: 'White',
      offenceAssessable: 'no',
      observedPlateVisibility: 'clear',
      observedCategoryVisibility: 'clear',
      observedColourVisibility: 'clear',
    },
    extractedFacts: [
      fact('challan-number', { en: 'Challan number', hi: 'चालान नंबर' }, 'CS-DEMO-260820-A', 'challan', 'high', 'clear', 'Challan · header'),
      fact('issue-date', { en: 'Issue date', hi: 'जारी होने की तारीख' }, '20 Aug 2026', 'challan', 'high', 'clear', 'Challan · issue block'),
      fact('alleged-registration', { en: 'Registration on challan', hi: 'चालान पर वाहन नंबर' }, 'TEST-26-SC-3317', 'challan', 'high', 'clear', 'Challan · vehicle line'),
      fact('offence', { en: 'Alleged offence', hi: 'बताया गया उल्लंघन' }, 'Riding without a protective helmet', 'challan', 'high', 'clear', 'Challan · offence line'),
      fact('observed-registration', { en: 'Registration visible in image', hi: 'फ़ोटो में दिखता वाहन नंबर' }, 'TEST-26-MC-3817', 'enforcement', 'high', 'clear', 'Enforcement image · plate region'),
      fact('observed-category', { en: 'Vehicle category in image', hi: 'फ़ोटो में वाहन का प्रकार' }, 'Motorcycle', 'enforcement', 'high', 'clear', 'Enforcement image · full vehicle'),
      fact('observed-colour', { en: 'Vehicle colour in image', hi: 'फ़ोटो में वाहन का रंग' }, 'White', 'enforcement', 'high', 'clear', 'Enforcement image · body panel'),
      fact('offence-visible', { en: 'Is the alleged offence assessable?', hi: 'क्या बताया गया उल्लंघन दिख रहा है?' }, 'No — rider is not reliably visible', 'enforcement', 'medium', 'partial', 'Enforcement image · rider area', { en: 'The image does not establish who was riding.', hi: 'फ़ोटो से यह तय नहीं होता कि वाहन कौन चला रहा था।' }),
      fact('record-registration', { en: 'Registered vehicle identifier', hi: 'रिकॉर्ड में वाहन नंबर' }, 'TEST-26-SC-3317', 'vehicle-record', 'high', 'clear', 'Vehicle record · identifier'),
      fact('record-category', { en: 'Registered category', hi: 'रिकॉर्ड में वाहन का प्रकार' }, 'Scooter', 'vehicle-record', 'high', 'clear', 'Vehicle record · category'),
      fact('record-colour', { en: 'Registered colour', hi: 'रिकॉर्ड में वाहन का रंग' }, 'Blue', 'vehicle-record', 'high', 'clear', 'Vehicle record · colour'),
      fact('record-owner', { en: 'Owner display name', hi: 'मालिक का डेमो नाम' }, 'Asha · demo citizen', 'vehicle-record', 'high', 'clear', 'Vehicle record · owner'),
    ],
    evidenceCards,
    readiness: commonReadiness(true),
  },
  inconclusive: {
    id: 'inconclusive',
    code: 'CASE B',
    title: { en: 'Image too unclear', hi: 'फ़ोटो बहुत धुंधली है' },
    shortDescription: { en: 'Plate unreadable, alleged offence not assessable', hi: 'नंबर पढ़ा नहीं जा सकता, उल्लंघन दिखता नहीं' },
    expectedFinding: 'inconclusive',
    photoPanel: 'centre',
    ownerDisplay: 'Kabir · demo citizen',
    issueDate: '2026-08-20',
    challanNumber: 'CS-DEMO-260820-B',
    allegedRegistration: 'TEST-26-SC-4412',
    offence: { en: 'Signal-line violation', hi: 'सिग्नल लाइन का उल्लंघन' },
    location: { en: 'Sample Road, Pilot City', hi: 'सैंपल रोड, पायलट सिटी' },
    incidentAt: '2026-08-20T18:16:00+05:30',
    timestamp: '20 Aug 2026 · 18:16 IST',
    amount: '₹500',
    authority: { en: 'Synthetic Pilot Traffic Authority', hi: 'सिंथेटिक पायलट यातायात प्राधिकरण' },
    imageNote: {
      en: 'Motion blur prevents a reliable plate reading. The image does not clearly show the stop line or signal phase.',
      hi: 'मोशन ब्लर के कारण नंबर भरोसे से नहीं पढ़ा जा सकता। स्टॉप लाइन या सिग्नल की स्थिति भी साफ़ नहीं है।',
    },
    confirmedFacts: {
      registeredPlate: 'TEST-26-SC-4412',
      registeredCategory: 'Scooter',
      registeredColour: 'Red',
      observedPlate: 'Unreadable',
      observedCategory: 'Scooter-like two-wheeler',
      observedColour: 'Unclear',
      offenceAssessable: 'unclear',
      observedPlateVisibility: 'unclear',
      observedCategoryVisibility: 'partial',
      observedColourVisibility: 'unclear',
    },
    extractedFacts: [
      fact('challan-number', { en: 'Challan number', hi: 'चालान नंबर' }, 'CS-DEMO-260820-B', 'challan', 'high', 'clear', 'Challan · header'),
      fact('issue-date', { en: 'Issue date', hi: 'जारी होने की तारीख' }, '20 Aug 2026', 'challan', 'high', 'clear', 'Challan · issue block'),
      fact('alleged-registration', { en: 'Registration on challan', hi: 'चालान पर वाहन नंबर' }, 'TEST-26-SC-4412', 'challan', 'high', 'clear', 'Challan · vehicle line'),
      fact('offence', { en: 'Alleged offence', hi: 'बताया गया उल्लंघन' }, 'Signal-line violation', 'challan', 'high', 'clear', 'Challan · offence line'),
      fact('observed-registration', { en: 'Registration visible in image', hi: 'फ़ोटो में दिखता वाहन नंबर' }, 'Unreadable', 'enforcement', 'low', 'unclear', 'Enforcement image · plate region', { en: 'Motion blur obscures every character.', hi: 'मोशन ब्लर के कारण कोई अक्षर साफ़ नहीं है।' }),
      fact('observed-category', { en: 'Vehicle category in image', hi: 'फ़ोटो में वाहन का प्रकार' }, 'Scooter-like two-wheeler', 'enforcement', 'medium', 'partial', 'Enforcement image · silhouette'),
      fact('observed-colour', { en: 'Vehicle colour in image', hi: 'फ़ोटो में वाहन का रंग' }, 'Unclear', 'enforcement', 'low', 'unclear', 'Enforcement image · body area'),
      fact('offence-visible', { en: 'Is the alleged offence assessable?', hi: 'क्या बताया गया उल्लंघन दिख रहा है?' }, 'Unclear — road signal context is missing', 'enforcement', 'low', 'not-visible', 'Enforcement image · road context'),
      fact('record-registration', { en: 'Registered vehicle identifier', hi: 'रिकॉर्ड में वाहन नंबर' }, 'TEST-26-SC-4412', 'vehicle-record', 'high', 'clear', 'Vehicle record · identifier'),
      fact('record-category', { en: 'Registered category', hi: 'रिकॉर्ड में वाहन का प्रकार' }, 'Scooter', 'vehicle-record', 'high', 'clear', 'Vehicle record · category'),
      fact('record-colour', { en: 'Registered colour', hi: 'रिकॉर्ड में वाहन का रंग' }, 'Red', 'vehicle-record', 'high', 'clear', 'Vehicle record · colour'),
      fact('record-owner', { en: 'Owner display name', hi: 'मालिक का डेमो नाम' }, 'Kabir · demo citizen', 'vehicle-record', 'high', 'clear', 'Vehicle record · owner'),
    ],
    evidenceCards,
    readiness: [
      ...commonReadiness(true),
      { id: 'clearer-image', label: { en: 'Clearer original enforcement image or clarification', hi: 'साफ़ मूल प्रवर्तन फ़ोटो या स्पष्टीकरण' }, category: 'authority', status: 'missing' },
    ],
  },
  consistent: {
    id: 'consistent',
    code: 'CASE C',
    title: { en: 'Records appear consistent', hi: 'रिकॉर्ड आपस में मिलते हैं' },
    shortDescription: { en: 'Registration, category, colour, and allegation align', hi: 'नंबर, वाहन प्रकार, रंग और आरोप मेल खाते हैं' },
    expectedFinding: 'consistent',
    photoPanel: 'right',
    ownerDisplay: 'Meera · demo citizen',
    issueDate: '2026-08-20',
    challanNumber: 'CS-DEMO-260820-C',
    allegedRegistration: 'TEST-26-SC-9024',
    offence: { en: 'Riding without a protective helmet', hi: 'सुरक्षा हेलमेट के बिना वाहन चलाना' },
    location: { en: 'Model Avenue, Pilot City', hi: 'मॉडल एवेन्यू, पायलट सिटी' },
    incidentAt: '2026-08-20T11:08:00+05:30',
    timestamp: '20 Aug 2026 · 11:08 IST',
    amount: '₹1,000',
    authority: { en: 'Synthetic Pilot Traffic Authority', hi: 'सिंथेटिक पायलट यातायात प्राधिकरण' },
    imageNote: {
      en: 'The vehicle details appear consistent and the synthetic image appears to show the alleged helmet-related fact. This is not a legal conclusion.',
      hi: 'वाहन का विवरण मिलता है और सिंथेटिक फ़ोटो में हेलमेट से जुड़ी बताई गई बात दिखती है। यह कानूनी निष्कर्ष नहीं है।',
    },
    confirmedFacts: {
      registeredPlate: 'TEST-26-SC-9024',
      registeredCategory: 'Scooter',
      registeredColour: 'Blue',
      observedPlate: 'TEST-26-SC-9024',
      observedCategory: 'Scooter',
      observedColour: 'Blue',
      offenceAssessable: 'yes',
      observedPlateVisibility: 'clear',
      observedCategoryVisibility: 'clear',
      observedColourVisibility: 'clear',
    },
    extractedFacts: [
      fact('challan-number', { en: 'Challan number', hi: 'चालान नंबर' }, 'CS-DEMO-260820-C', 'challan', 'high', 'clear', 'Challan · header'),
      fact('issue-date', { en: 'Issue date', hi: 'जारी होने की तारीख' }, '20 Aug 2026', 'challan', 'high', 'clear', 'Challan · issue block'),
      fact('alleged-registration', { en: 'Registration on challan', hi: 'चालान पर वाहन नंबर' }, 'TEST-26-SC-9024', 'challan', 'high', 'clear', 'Challan · vehicle line'),
      fact('offence', { en: 'Alleged offence', hi: 'बताया गया उल्लंघन' }, 'Riding without a protective helmet', 'challan', 'high', 'clear', 'Challan · offence line'),
      fact('observed-registration', { en: 'Registration visible in image', hi: 'फ़ोटो में दिखता वाहन नंबर' }, 'TEST-26-SC-9024', 'enforcement', 'high', 'clear', 'Enforcement image · plate region'),
      fact('observed-category', { en: 'Vehicle category in image', hi: 'फ़ोटो में वाहन का प्रकार' }, 'Scooter', 'enforcement', 'high', 'clear', 'Enforcement image · full vehicle'),
      fact('observed-colour', { en: 'Vehicle colour in image', hi: 'फ़ोटो में वाहन का रंग' }, 'Blue', 'enforcement', 'high', 'clear', 'Enforcement image · body panel'),
      fact('offence-visible', { en: 'Is the alleged offence assessable?', hi: 'क्या बताया गया उल्लंघन दिख रहा है?' }, 'Yes — synthetic rider appears without a helmet', 'enforcement', 'high', 'clear', 'Enforcement image · rider area'),
      fact('record-registration', { en: 'Registered vehicle identifier', hi: 'रिकॉर्ड में वाहन नंबर' }, 'TEST-26-SC-9024', 'vehicle-record', 'high', 'clear', 'Vehicle record · identifier'),
      fact('record-category', { en: 'Registered category', hi: 'रिकॉर्ड में वाहन का प्रकार' }, 'Scooter', 'vehicle-record', 'high', 'clear', 'Vehicle record · category'),
      fact('record-colour', { en: 'Registered colour', hi: 'रिकॉर्ड में वाहन का रंग' }, 'Blue', 'vehicle-record', 'high', 'clear', 'Vehicle record · colour'),
      fact('record-owner', { en: 'Owner display name', hi: 'मालिक का डेमो नाम' }, 'Meera · demo citizen', 'vehicle-record', 'high', 'clear', 'Vehicle record · owner'),
    ],
    evidenceCards,
    readiness: commonReadiness(true),
  },
};

export const fixtureList = Object.values(fixtures);
