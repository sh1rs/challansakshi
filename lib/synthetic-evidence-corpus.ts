import {
  compareSyntheticEvidence,
  type SyntheticEvidenceExtraction,
  type SyntheticObservation,
  type SyntheticObservationConfidence,
  type SyntheticObservationVisibility,
  type SyntheticOverallFinding,
  type SyntheticSourceDocument,
} from './synthetic-evidence-pipeline';

export interface SyntheticEvaluationCase {
  id: string;
  title: string;
  description: string;
  expectedOverall: SyntheticOverallFinding;
  extraction: SyntheticEvidenceExtraction;
}

function observation(
  value: string,
  source_document: SyntheticSourceDocument,
  evidence_reference: string,
  options: {
    confidence?: SyntheticObservationConfidence;
    visibility?: SyntheticObservationVisibility;
    limitation?: string;
  } = {},
): SyntheticObservation {
  return {
    value,
    source_document,
    confidence: options.confidence ?? 'high',
    visibility: options.visibility ?? 'clear',
    evidence_reference,
    limitation: options.limitation ?? '',
    user_confirmation_required: true,
  };
}

function baseExtraction(): SyntheticEvidenceExtraction {
  return {
    schema_version: '2.0',
    challan_document: {
      challan_number: observation('CS-LAB-2026-001', 'challan_document', 'Challan · header'),
      issue_date: observation('2026-08-20', 'challan_document', 'Challan · issue date'),
      alleged_registration: observation('KA 01 AB 3317', 'challan_document', 'Challan · alleged registration'),
      alleged_offence: observation('Riding without a protective helmet', 'challan_document', 'Challan · offence line'),
      amount: observation('INR 1000', 'challan_document', 'Challan · amount'),
      timestamp: observation('2026-08-20 11:08 IST', 'challan_document', 'Challan · event timestamp'),
      location: observation('Model Avenue, Pilot City', 'challan_document', 'Challan · event location'),
    },
    vehicle_record: {
      registration: observation('KA 01 AB 3317', 'vehicle_record', 'Vehicle record · registration'),
      vehicle_category: observation('Scooter', 'vehicle_record', 'Vehicle record · category'),
      colour: observation('Blue', 'vehicle_record', 'Vehicle record · colour'),
      make_model: observation('Honda Activa 6G', 'vehicle_record', 'Vehicle record · make and model'),
    },
    enforcement_image: {
      registration: observation('KA01AB3317', 'enforcement_image', 'Image · plate region'),
      vehicle_category: observation('Scooter', 'enforcement_image', 'Image · full vehicle'),
      colour: observation('Blue', 'enforcement_image', 'Image · body panel'),
      make_model: observation('Honda Activa 6G', 'enforcement_image', 'Image · body shape and badging'),
      timestamp: observation('20 Aug 2026 11:08 IST', 'enforcement_image', 'Image · timestamp overlay'),
      location: observation('Model Avenue Pilot City', 'enforcement_image', 'Image · location overlay'),
      offence_assessable: observation('yes', 'enforcement_image', 'Image · rider head area'),
    },
    limitations: [],
  };
}

function makeCase(
  id: string,
  title: string,
  description: string,
  expectedOverall: SyntheticOverallFinding,
  mutate?: (value: SyntheticEvidenceExtraction) => void,
): SyntheticEvaluationCase {
  const value = baseExtraction();
  mutate?.(value);
  return { id, title, description, expectedOverall, extraction: value };
}

export const syntheticEvaluationCases: SyntheticEvaluationCase[] = [
  makeCase(
    'case-01-all-align',
    'All supplied fields align',
    'Formatting differs, but the six normalized values align and the alleged-offence area is visible.',
    'appears-consistent',
  ),
  makeCase(
    'case-02-registration-conflict',
    'One plate character differs',
    'The record ends in 3317 while the clear enforcement plate ends in 3817.',
    'potential-evidence-discrepancy',
    (value) => { value.enforcement_image.registration.value = 'KA01AB3817'; },
  ),
  makeCase(
    'case-03-registration-sources-conflict',
    'Challan and vehicle record disagree',
    'The challan alleges a plate ending 3817 while the vehicle record and image end 3317.',
    'potential-evidence-discrepancy',
    (value) => { value.challan_document.alleged_registration.value = 'KA 01 AB 3817'; },
  ),
  makeCase(
    'case-04-category-conflict',
    'Scooter versus motorcycle',
    'The vehicle record says scooter while the clear image observation says motorcycle.',
    'potential-evidence-discrepancy',
    (value) => { value.enforcement_image.vehicle_category.value = 'Motorcycle'; },
  ),
  makeCase(
    'case-05-unclear-evidence',
    'Plate and alleged offence are unclear',
    'Motion blur prevents a registration comparison, and the rider area needed to assess the allegation is outside the frame.',
    'inconclusive',
    (value) => {
      value.enforcement_image.registration = observation('Unreadable', 'enforcement_image', 'Image · plate region', {
        confidence: 'low', visibility: 'unclear', limitation: 'Motion blur obscures every plate character.',
      });
      value.enforcement_image.offence_assessable = observation('no', 'enforcement_image', 'Image · rider area', {
        limitation: 'The rider head area is outside the frame.',
      });
    },
  ),
  makeCase(
    'case-06-partial-plate',
    'Matching suffix only',
    'The last four characters align, but the full registration is outside the frame.',
    'inconclusive',
    (value) => {
      value.enforcement_image.registration = observation('3317', 'enforcement_image', 'Image · partial plate suffix', {
        confidence: 'medium', visibility: 'partial', limitation: 'Only the final four characters are visible.',
      });
    },
  ),
  makeCase(
    'case-07-model-formatting',
    'Make and model formatting agrees',
    'Punctuation and spacing differ, while the visible make and model still normalize to the same value.',
    'appears-consistent',
    (value) => {
      value.vehicle_record.make_model.value = 'Honda Activa-6G';
      value.enforcement_image.make_model.value = 'honda activa 6g';
    },
  ),
  makeCase(
    'case-08-time-location-conflict',
    'Time and location conflict',
    'The clear enforcement overlay differs from both the record time and location.',
    'potential-evidence-discrepancy',
    (value) => {
      value.enforcement_image.timestamp.value = '21 Aug 2026 17:42 IST';
      value.enforcement_image.location.value = 'Sample Road, Pilot City';
    },
  ),
  makeCase(
    'case-09-normalization',
    'Spacing and naming variants',
    'Equivalent plate spacing, grey spelling, and vehicle-category aliases should not create a false conflict.',
    'appears-consistent',
    (value) => {
      value.vehicle_record.vehicle_category.value = 'Motor car';
      value.enforcement_image.vehicle_category.value = 'Hatchback';
      value.vehicle_record.colour.value = 'Gray';
      value.enforcement_image.colour.value = 'Grey';
      value.challan_document.alleged_registration.value = 'ka-01-ab-3317';
      value.vehicle_record.registration.value = 'ka-01-ab-3317';
      value.enforcement_image.registration.value = 'KA 01 AB 3317';
    },
  ),
  makeCase(
    'case-10-colour-only-context',
    'Colour alone needs corroboration',
    'Registration and vehicle type align, but colour differs. The engine keeps this contextual instead of opening a dispute path.',
    'inconclusive',
    (value) => {
      value.enforcement_image.colour.value = 'White';
    },
  ),
];

export function runSyntheticEvaluationCorpus() {
  const cases = syntheticEvaluationCases.map((testCase) => {
    const actualOverall = compareSyntheticEvidence(testCase.extraction).overall;
    return {
      id: testCase.id,
      title: testCase.title,
      expectedOverall: testCase.expectedOverall,
      actualOverall,
      passed: actualOverall === testCase.expectedOverall,
    };
  });
  const passed = cases.filter((item) => item.passed).length;
  return {
    total: cases.length,
    passed,
    failed: cases.length - passed,
    cases,
  };
}
