import {
  SYNTHETIC_EXPORT_SAFE_LIMITATIONS,
  type SyntheticReviewedFactProjection,
  type SyntheticReviewFact,
  type SyntheticReviewFactSource,
} from './official-handoff';

export const SYNTHETIC_SCHEMA_VERSION = '2.0' as const;

export const comparisonFields = [
  'registration',
  'vehicle_category',
  'colour',
  'make_model',
  'timestamp',
  'location',
] as const;

export const recordDetailFields = [
  'challan_number',
  'issue_date',
  'alleged_offence',
  'amount',
] as const;

export const challanComparisonFields = [
  'alleged_registration',
  'timestamp',
  'location',
] as const;

export const vehicleRecordFields = [
  'registration',
  'vehicle_category',
  'colour',
  'make_model',
] as const;

export type SyntheticComparisonField = (typeof comparisonFields)[number];
export type SyntheticRecordDetailField = (typeof recordDetailFields)[number];
export type SyntheticChallanComparisonField = (typeof challanComparisonFields)[number];
export type SyntheticVehicleRecordField = (typeof vehicleRecordFields)[number];
export type SyntheticSourceDocument = 'challan_document' | 'vehicle_record' | 'enforcement_image';
export type SyntheticObservationConfidence = 'high' | 'medium' | 'low';
export type SyntheticObservationVisibility = 'clear' | 'partial' | 'unclear' | 'not-visible';

export interface SyntheticObservation {
  value: string;
  source_document: SyntheticSourceDocument;
  confidence: SyntheticObservationConfidence;
  visibility: SyntheticObservationVisibility;
  evidence_reference: string;
  limitation: string;
  user_confirmation_required: true;
}

export type SyntheticChallanDocument = Record<
  SyntheticRecordDetailField | SyntheticChallanComparisonField,
  SyntheticObservation
>;

export type SyntheticVehicleRecord = Record<
  SyntheticVehicleRecordField,
  SyntheticObservation
>;

export type SyntheticEnforcementImage = Record<
  SyntheticComparisonField | 'offence_assessable',
  SyntheticObservation
>;

export interface SyntheticEvidenceExtraction {
  schema_version: typeof SYNTHETIC_SCHEMA_VERSION;
  challan_document: SyntheticChallanDocument;
  vehicle_record: SyntheticVehicleRecord;
  enforcement_image: SyntheticEnforcementImage;
  limitations: string[];
}

export type SyntheticComparisonState = 'match' | 'potential-mismatch' | 'inconclusive';
export type SyntheticOverallFinding =
  | 'appears-consistent'
  | 'potential-evidence-discrepancy'
  | 'inconclusive';

export interface SyntheticComparisonRow {
  field: SyntheticComparisonField;
  label: string;
  materiality: 'primary' | 'supporting';
  sources: Array<{
    label: 'Challan document' | 'Vehicle record' | 'Enforcement image';
    sourceDocument: SyntheticSourceDocument;
    value: string;
    confidence: SyntheticObservationConfidence;
    visibility: SyntheticObservationVisibility;
    evidenceReference: string;
    limitation: string;
  }>;
  state: SyntheticComparisonState;
  reasonCode:
    | 'normalized-values-match'
    | 'clear-values-conflict'
    | 'reference-not-clear-enough'
    | 'evidence-not-clear-enough';
  reason: string;
}

export interface SyntheticComparisonResult {
  overall: SyntheticOverallFinding;
  rows: SyntheticComparisonRow[];
  counts: {
    matches: number;
    potentialMismatches: number;
    inconclusive: number;
  };
  offenceAssessment: {
    state: 'assessable' | 'not-assessable' | 'inconclusive';
    source: 'enforcement_image';
    confidence: SyntheticObservationConfidence;
    evidenceReference: string;
    reason: string;
  };
  limitations: string[];
  decisionBoundary: string;
}

export interface SyntheticResolutionPath {
  id: 'prepare-official-review' | 'request-clarification' | 'no-dispute-basis-found';
  title: string;
  summary: string;
  nextActions: string[];
  officialHandoff: string;
}

const observationKeys = [
  'value',
  'source_document',
  'confidence',
  'visibility',
  'evidence_reference',
  'limitation',
  'user_confirmation_required',
] as const;

const fieldMetadata: Record<SyntheticComparisonField, {
  label: string;
  materiality: SyntheticComparisonRow['materiality'];
}> = {
  registration: { label: 'Registration', materiality: 'primary' },
  vehicle_category: { label: 'Vehicle type', materiality: 'primary' },
  colour: { label: 'Colour', materiality: 'supporting' },
  make_model: { label: 'Make / model', materiality: 'supporting' },
  timestamp: { label: 'Timestamp', materiality: 'supporting' },
  location: { label: 'Location', materiality: 'supporting' },
};

const unavailableValues = new Set([
  '',
  'unclear',
  'unreadable',
  'unknown',
  'notvisible',
  'notshown',
  'notavailable',
  'unavailable',
  'cannotdetermine',
  'na',
  'none',
]);

const unavailableValuePrefixes = [
  'notstated',
  'notprovided',
  'notspecified',
  'notdiscernible',
  'notreadable',
  'notavailable',
  'notvisible',
  'notshown',
  'cannotdetermine',
  'unabletodetermine',
  'unavailable',
] as const;

function isBoundedString(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.length <= maximumLength;
}

function readExactDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const entries: Array<readonly [string, unknown]> = [];
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
      entries.push([key, descriptor.value]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return null;
  }
}

function readObservation(
  value: unknown,
  source: SyntheticSourceDocument,
): SyntheticObservation | null {
  const observation = readExactDataRecord(value, observationKeys);
  if (!observation) return null;
  if (
    !isBoundedString(observation.value, 160)
    || observation.source_document !== source
    || (observation.confidence !== 'high'
      && observation.confidence !== 'medium'
      && observation.confidence !== 'low')
    || (observation.visibility !== 'clear'
      && observation.visibility !== 'partial'
      && observation.visibility !== 'unclear'
      && observation.visibility !== 'not-visible')
    || !isBoundedString(observation.evidence_reference, 160)
    || !isBoundedString(observation.limitation, 280)
    || observation.user_confirmation_required !== true
  ) return null;
  return {
    value: observation.value,
    source_document: source,
    confidence: observation.confidence,
    visibility: observation.visibility,
    evidence_reference: observation.evidence_reference,
    limitation: observation.limitation,
    user_confirmation_required: true,
  };
}

function readBoundedStringArray(value: unknown): string[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    if (value.length > 8) return null;
    const expectedKeys = [...value.keys()].map(String);
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== expectedKeys.length + 1
      || !keys.includes('length')
      || keys.some((key) => typeof key !== 'string' || (key !== 'length' && !expectedKeys.includes(key)))
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const items: string[] = [];
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)
        || !isBoundedString(descriptor.value, 280)) return null;
      items.push(descriptor.value);
    }
    return items;
  } catch {
    return null;
  }
}

function readSyntheticEvidenceExtraction(value: unknown): SyntheticEvidenceExtraction | null {
  const root = readExactDataRecord(value, [
    'schema_version',
    'challan_document',
    'vehicle_record',
    'enforcement_image',
    'limitations',
  ]);
  if (!root || root.schema_version !== SYNTHETIC_SCHEMA_VERSION) return null;
  const challanCandidate = readExactDataRecord(
    root.challan_document,
    [...recordDetailFields, ...challanComparisonFields],
  );
  const vehicleCandidate = readExactDataRecord(root.vehicle_record, vehicleRecordFields);
  const enforcementCandidate = readExactDataRecord(
    root.enforcement_image,
    [...comparisonFields, 'offence_assessable'],
  );
  const limitations = readBoundedStringArray(root.limitations);
  if (!challanCandidate || !vehicleCandidate || !enforcementCandidate || !limitations) return null;

  const challanEntries = [...recordDetailFields, ...challanComparisonFields].map((field) => {
    const observation = readObservation(challanCandidate[field], 'challan_document');
    return observation ? [field, observation] as const : null;
  });
  const vehicleEntries = vehicleRecordFields.map((field) => {
    const observation = readObservation(vehicleCandidate[field], 'vehicle_record');
    return observation ? [field, observation] as const : null;
  });
  const enforcementEntries = [...comparisonFields, 'offence_assessable' as const].map((field) => {
    const observation = readObservation(enforcementCandidate[field], 'enforcement_image');
    return observation ? [field, observation] as const : null;
  });
  if (
    challanEntries.some((entry) => entry === null)
    || vehicleEntries.some((entry) => entry === null)
    || enforcementEntries.some((entry) => entry === null)
  ) return null;
  const completeChallanEntries = challanEntries.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );
  const completeVehicleEntries = vehicleEntries.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );
  const completeEnforcementEntries = enforcementEntries.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );

  return {
    schema_version: SYNTHETIC_SCHEMA_VERSION,
    challan_document: Object.fromEntries(completeChallanEntries) as SyntheticChallanDocument,
    vehicle_record: Object.fromEntries(completeVehicleEntries) as SyntheticVehicleRecord,
    enforcement_image: Object.fromEntries(completeEnforcementEntries) as SyntheticEnforcementImage,
    limitations,
  };
}

export function validateSyntheticEvidenceExtraction(value: unknown): value is SyntheticEvidenceExtraction {
  return readSyntheticEvidenceExtraction(value) !== null;
}

function blankObservation(source_document: SyntheticSourceDocument, evidence_reference: string): SyntheticObservation {
  return {
    value: '',
    source_document,
    confidence: 'low',
    visibility: 'not-visible',
    evidence_reference,
    limitation: 'No reviewed synthetic observation has been entered yet.',
    user_confirmation_required: true,
  };
}

export function createBlankSyntheticEvidenceExtraction(): SyntheticEvidenceExtraction {
  return {
    schema_version: SYNTHETIC_SCHEMA_VERSION,
    challan_document: Object.fromEntries(
      [...recordDetailFields, ...challanComparisonFields]
        .map((field) => [field, blankObservation('challan_document', `Challan · ${field.replaceAll('_', ' ')}`)]),
    ) as unknown as SyntheticChallanDocument,
    vehicle_record: Object.fromEntries(
      vehicleRecordFields
        .map((field) => [field, blankObservation('vehicle_record', `Vehicle record · ${field.replaceAll('_', ' ')}`)]),
    ) as unknown as SyntheticVehicleRecord,
    enforcement_image: Object.fromEntries(
      [...comparisonFields, 'offence_assessable']
        .map((field) => [field, blankObservation('enforcement_image', `Image · ${field.replaceAll('_', ' ')}`)]),
    ) as unknown as SyntheticEnforcementImage,
    limitations: ['Custom observations begin blank and remain inconclusive until the person reviews the test sources.'],
  };
}

function collapse(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, '');
}

function canonicalRegistration(value: string): string {
  return value.toLocaleUpperCase('en-IN').replace(/[^A-Z0-9]/g, '');
}

function canonicalCategory(value: string): string {
  const compact = collapse(value);
  const aliases: Array<[RegExp, string]> = [
    [/^(scooter|scooty|motorscooter|scooterliketwowheeler)$/, 'scooter'],
    [/^(motorcycle|motorbike|bike)$/, 'motorcycle'],
    [/^(car|motorcar|hatchback|sedan|saloon|suv|sportutilityvehicle|lmvcar)$/, 'car'],
    [/^(autorickshaw|rickshaw|thre wheeler|threewheeler)$/, 'auto-rickshaw'],
    [/^(truck|lorry|goodsvehicle)$/, 'truck'],
    [/^(bus|coach)$/, 'bus'],
    [/^(van|minivan)$/, 'van'],
    [/^(bicycle|cycle)$/, 'bicycle'],
  ];
  return aliases.find(([pattern]) => pattern.test(compact))?.[1] ?? compact;
}

function canonicalColour(value: string): string {
  const compact = collapse(value);
  const aliases: Record<string, string> = {
    grey: 'grey', gray: 'grey', metallicgrey: 'grey', silvergrey: 'grey',
    silver: 'silver', metallicsilver: 'silver',
    white: 'white', pearlwhite: 'white', offwhite: 'white',
    black: 'black', jetblack: 'black',
    blue: 'blue', navyblue: 'blue', darkblue: 'blue', lightblue: 'blue',
    red: 'red', maroon: 'red',
    green: 'green', yellow: 'yellow', orange: 'orange', brown: 'brown', beige: 'beige',
  };
  return aliases[compact] ?? compact;
}

const monthNumbers: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function canonicalTimestamp(value: string): string {
  const iso = value.match(/(\d{4})[-/]([01]\d)[-/]([0-3]\d)[^0-9]+([0-2]\d):([0-5]\d)/);
  const human = value.match(/([0-3]?\d)\s+([A-Za-z]{3,9})\s+(\d{4})[^0-9]+([0-2]?\d):([0-5]\d)/);
  const timezoneMatch = value.match(/\b(IST|UTC|GMT)\b|([+-]\d{2}:?\d{2})\b/i);
  const timezone = timezoneMatch
    ? (timezoneMatch[1]?.toLocaleUpperCase('en-IN') ?? timezoneMatch[2].replace(/^(\D?\d{2})(\d{2})$/, '$1:$2'))
    : 'timezone-unspecified';
  const canonical = iso
    ? { year: iso[1], month: iso[2], day: iso[3], hour: iso[4], minute: iso[5] }
    : human && monthNumbers[human[2].slice(0, 3).toLocaleLowerCase('en-IN')]
      ? {
        year: human[3],
        month: monthNumbers[human[2].slice(0, 3).toLocaleLowerCase('en-IN')],
        day: human[1].padStart(2, '0'),
        hour: human[4].padStart(2, '0'),
        minute: human[5],
      }
      : null;
  if (canonical) {
    const date = new Date(`${canonical.year}-${canonical.month}-${canonical.day}T${canonical.hour}:${canonical.minute}:00Z`);
    const valid = Number.isFinite(date.getTime())
      && date.getUTCFullYear() === Number(canonical.year)
      && date.getUTCMonth() + 1 === Number(canonical.month)
      && date.getUTCDate() === Number(canonical.day)
      && date.getUTCHours() === Number(canonical.hour)
      && date.getUTCMinutes() === Number(canonical.minute);
    if (valid) return `${canonical.year}-${canonical.month}-${canonical.day}T${canonical.hour}:${canonical.minute}@${timezone}`;
  }
  return collapse(value);
}

function canonicalValue(field: SyntheticComparisonField, value: string): string {
  if (field === 'registration') return canonicalRegistration(value);
  if (field === 'vehicle_category') return canonicalCategory(value);
  if (field === 'colour') return canonicalColour(value);
  if (field === 'timestamp') return canonicalTimestamp(value);
  return collapse(value);
}

function observationIsConclusive(observation: SyntheticObservation): boolean {
  const compactValue = collapse(observation.value);
  return observation.visibility === 'clear'
    && observation.confidence !== 'low'
    && !unavailableValues.has(compactValue)
    && !unavailableValuePrefixes.some((prefix) => compactValue.startsWith(prefix));
}

export type SyntheticClassConflictProjectionResult =
  | Readonly<{ status: 'eligible'; facts: SyntheticReviewedFactProjection }>
  | Readonly<{
    status: 'abstained';
    reason:
      | 'invalid-result-revision'
      | 'confirmation-revision-mismatch'
      | 'class-facts-not-action-ready';
  }>;

export type SyntheticClassConflictProjectionInput = Readonly<{
  extraction: SyntheticEvidenceExtraction;
  resultRevisionId: string;
  confirmation: Readonly<{
    status: 'confirmed';
    resultRevisionId: string;
  }>;
}>;

type ExactSyntheticObservation = Readonly<{
  value: string;
  source: SyntheticSourceDocument;
  reference: string;
  limitation: string;
}>;

const exactClassConflictObservations = Object.freeze({
  recordRegistration: Object.freeze({
    value: 'KA 01 AB 3317',
    source: 'vehicle_record',
    reference: 'Vehicle record · registration',
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS['bundled-synthetic-vehicle-record'],
  }),
  recordCategory: Object.freeze({
    value: 'Two-wheeler',
    source: 'vehicle_record',
    reference: 'Vehicle record · category',
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS['bundled-synthetic-vehicle-record'],
  }),
  recordColour: Object.freeze({
    value: 'Blue',
    source: 'vehicle_record',
    reference: 'Vehicle record · colour',
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS['bundled-synthetic-vehicle-record'],
  }),
  recordMakeModel: Object.freeze({
    value: 'Honda Activa 6G',
    source: 'vehicle_record',
    reference: 'Vehicle record · make and model',
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS['bundled-synthetic-vehicle-record'],
  }),
  imageCategory: Object.freeze({
    value: 'Four-wheeler',
    source: 'enforcement_image',
    reference: 'Image · full vehicle',
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS['bundled-synthetic-evidence-image'],
  }),
  imageColour: Object.freeze({
    value: 'White',
    source: 'enforcement_image',
    reference: 'Image · body panel',
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS['bundled-synthetic-evidence-image'],
  }),
  imageMakeModel: Object.freeze({
    value: 'Maruti Swift',
    source: 'enforcement_image',
    reference: 'Image · body shape and badging',
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS['bundled-synthetic-evidence-image'],
  }),
} as const satisfies Record<string, ExactSyntheticObservation>);

function isExactClassConflictObservation(
  observation: SyntheticObservation,
  expected: ExactSyntheticObservation,
): boolean {
  return observation.value === expected.value
    && observation.source_document === expected.source
    && observation.confidence === 'high'
    && observation.visibility === 'clear'
    && observation.evidence_reference === expected.reference
    && observation.limitation === expected.limitation
    && observation.user_confirmation_required === true;
}

/**
 * Projects the one bounded synthetic class-conflict proof into the neutral
 * revision-bearing fact shape. The caller must first record an exact human
 * confirmation for this result revision; medium-confidence aliases never pass.
 */
export function projectSyntheticClassConflictFacts(
  input: SyntheticClassConflictProjectionInput,
): SyntheticClassConflictProjectionResult {
  const wrapper = readExactDataRecord(input, [
    'extraction',
    'resultRevisionId',
    'confirmation',
  ]);
  if (!wrapper) return { status: 'abstained', reason: 'class-facts-not-action-ready' };
  const resultRevisionId = wrapper.resultRevisionId;
  if (typeof resultRevisionId !== 'string' || !/^[0-9a-f]{32}$/.test(resultRevisionId)) {
    return { status: 'abstained', reason: 'invalid-result-revision' };
  }
  const confirmation = readExactDataRecord(wrapper.confirmation, [
    'status',
    'resultRevisionId',
  ]);
  if (
    !confirmation
    || confirmation.status !== 'confirmed'
    || typeof confirmation.resultRevisionId !== 'string'
    || !/^[0-9a-f]{32}$/.test(confirmation.resultRevisionId)
    || confirmation.resultRevisionId !== resultRevisionId
  ) return { status: 'abstained', reason: 'confirmation-revision-mismatch' };

  const extraction = readSyntheticEvidenceExtraction(wrapper.extraction);
  if (
    !extraction
    || !isExactClassConflictObservation(
      extraction.vehicle_record.registration,
      exactClassConflictObservations.recordRegistration,
    )
    || !isExactClassConflictObservation(
      extraction.vehicle_record.vehicle_category,
      exactClassConflictObservations.recordCategory,
    )
    || !isExactClassConflictObservation(
      extraction.vehicle_record.colour,
      exactClassConflictObservations.recordColour,
    )
    || !isExactClassConflictObservation(
      extraction.vehicle_record.make_model,
      exactClassConflictObservations.recordMakeModel,
    )
    || !isExactClassConflictObservation(
      extraction.enforcement_image.vehicle_category,
      exactClassConflictObservations.imageCategory,
    )
    || !isExactClassConflictObservation(
      extraction.enforcement_image.colour,
      exactClassConflictObservations.imageColour,
    )
    || !isExactClassConflictObservation(
      extraction.enforcement_image.make_model,
      exactClassConflictObservations.imageMakeModel,
    )
  ) return { status: 'abstained', reason: 'class-facts-not-action-ready' };

  const fact = <T>(value: T, source: SyntheticReviewFactSource): SyntheticReviewFact<T> => Object.freeze({
    value,
    source,
    confidence: 'high' as const,
    limitation: SYNTHETIC_EXPORT_SAFE_LIMITATIONS[source],
    confirmation: 'citizen-confirmed' as const,
    reviewRevisionId: resultRevisionId,
  });
  const facts: SyntheticReviewedFactProjection = Object.freeze({
    reviewRevisionId: resultRevisionId,
    vehicleRecordClass: fact(
      'two-wheeler' as const,
      'bundled-synthetic-vehicle-record',
    ),
    evidenceImageClass: fact(
      'four-wheeler' as const,
      'bundled-synthetic-evidence-image',
    ),
    readableVehicleRecord: fact<true>(
      true,
      'bundled-synthetic-vehicle-record',
    ),
    supportedSignals: Object.freeze(['vehicle-class-conflict'] as const),
  });
  return Object.freeze({ status: 'eligible', facts });
}

function valuesMatch(field: SyntheticComparisonField, recordValue: string, evidenceValue: string): boolean {
  const left = canonicalValue(field, recordValue);
  const right = canonicalValue(field, evidenceValue);
  return left === right;
}

type ComparisonSource = SyntheticComparisonRow['sources'][number] & { observation: SyntheticObservation };

function sourcesForField(
  extraction: SyntheticEvidenceExtraction,
  field: SyntheticComparisonField,
): ComparisonSource[] {
  const enforcement = extraction.enforcement_image[field];
  if (field === 'registration') {
    return [
      {
        label: 'Challan document',
        sourceDocument: 'challan_document',
        observation: extraction.challan_document.alleged_registration,
        value: extraction.challan_document.alleged_registration.value,
        confidence: extraction.challan_document.alleged_registration.confidence,
        visibility: extraction.challan_document.alleged_registration.visibility,
        evidenceReference: extraction.challan_document.alleged_registration.evidence_reference,
        limitation: extraction.challan_document.alleged_registration.limitation,
      },
      {
        label: 'Vehicle record',
        sourceDocument: 'vehicle_record',
        observation: extraction.vehicle_record.registration,
        value: extraction.vehicle_record.registration.value,
        confidence: extraction.vehicle_record.registration.confidence,
        visibility: extraction.vehicle_record.registration.visibility,
        evidenceReference: extraction.vehicle_record.registration.evidence_reference,
        limitation: extraction.vehicle_record.registration.limitation,
      },
      {
        label: 'Enforcement image',
        sourceDocument: 'enforcement_image',
        observation: enforcement,
        value: enforcement.value,
        confidence: enforcement.confidence,
        visibility: enforcement.visibility,
        evidenceReference: enforcement.evidence_reference,
        limitation: enforcement.limitation,
      },
    ];
  }

  const reference = field === 'timestamp' || field === 'location'
    ? extraction.challan_document[field]
    : extraction.vehicle_record[field];
  const referenceSource = field === 'timestamp' || field === 'location'
    ? { label: 'Challan document' as const, sourceDocument: 'challan_document' as const }
    : { label: 'Vehicle record' as const, sourceDocument: 'vehicle_record' as const };
  return [
    {
      ...referenceSource,
      observation: reference,
      value: reference.value,
      confidence: reference.confidence,
      visibility: reference.visibility,
      evidenceReference: reference.evidence_reference,
      limitation: reference.limitation,
    },
    {
      label: 'Enforcement image',
      sourceDocument: 'enforcement_image',
      observation: enforcement,
      value: enforcement.value,
      confidence: enforcement.confidence,
      visibility: enforcement.visibility,
      evidenceReference: enforcement.evidence_reference,
      limitation: enforcement.limitation,
    },
  ];
}

function compareField(
  field: SyntheticComparisonField,
  extraction: SyntheticEvidenceExtraction,
): SyntheticComparisonRow {
  const metadata = fieldMetadata[field];
  const sourceObservations = sourcesForField(extraction, field);
  const publicSources = sourceObservations.map((source) => ({
    label: source.label,
    sourceDocument: source.sourceDocument,
    value: source.value,
    confidence: source.confidence,
    visibility: source.visibility,
    evidenceReference: source.evidenceReference,
    limitation: source.limitation,
  }));
  const shared = {
    field,
    label: metadata.label,
    materiality: metadata.materiality,
    sources: publicSources,
  };

  if (field === 'registration') {
    const conclusiveSources = sourceObservations.filter((source) => observationIsConclusive(source.observation));
    for (let leftIndex = 0; leftIndex < conclusiveSources.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < conclusiveSources.length; rightIndex += 1) {
        if (!valuesMatch(field, conclusiveSources[leftIndex].value, conclusiveSources[rightIndex].value)) {
          return {
            ...shared,
            state: 'potential-mismatch',
            reasonCode: 'clear-values-conflict',
            reason: `The clear registration values from ${conclusiveSources[leftIndex].label.toLocaleLowerCase('en-IN')} and ${conclusiveSources[rightIndex].label.toLocaleLowerCase('en-IN')} differ. Unclear sources remain visible but cannot erase this evidence conflict.`,
          };
        }
      }
    }

    const unclearSource = sourceObservations.find((source) => !observationIsConclusive(source.observation));
    if (unclearSource) {
      const imageIsUnclear = unclearSource.sourceDocument === 'enforcement_image';
      return {
        ...shared,
        state: 'inconclusive',
        reasonCode: imageIsUnclear ? 'evidence-not-clear-enough' : 'reference-not-clear-enough',
        reason: unclearSource.observation.limitation
          || `The ${unclearSource.label.toLocaleLowerCase('en-IN')} does not provide a clear, reliable registration value.`,
      };
    }

    return {
      ...shared,
      state: 'match',
      reasonCode: 'normalized-values-match',
      reason: 'All 3 source values align after deterministic formatting normalization.',
    };
  }

  const unclearReference = sourceObservations.find((source) => source.sourceDocument !== 'enforcement_image'
    && !observationIsConclusive(source.observation));
  if (unclearReference) {
    return {
      ...shared,
      state: 'inconclusive',
      reasonCode: 'reference-not-clear-enough',
      reason: unclearReference.observation.limitation
        || `The ${unclearReference.label.toLocaleLowerCase('en-IN')} does not provide a clear, reliable value for this field.`,
    };
  }
  const imageSource = sourceObservations.find((source) => source.sourceDocument === 'enforcement_image');
  if (!imageSource || !observationIsConclusive(imageSource.observation)) {
    return {
      ...shared,
      state: 'inconclusive',
      reasonCode: 'evidence-not-clear-enough',
      reason: imageSource?.observation.limitation || 'The supplied image does not provide a clear, reliable value for this field.',
    };
  }
  const [first, ...others] = sourceObservations;
  if (others.every((source) => valuesMatch(field, first.value, source.value))) {
    return {
      ...shared,
      state: 'match',
      reasonCode: 'normalized-values-match',
      reason: `All ${sourceObservations.length} source values align after deterministic formatting normalization.`,
    };
  }
  return {
    ...shared,
    state: 'potential-mismatch',
    reasonCode: 'clear-values-conflict',
    reason: `The clear values supplied by ${sourceObservations.length} sources do not all agree. This is an evidence observation, not a legal conclusion.`,
  };
}

function assessOffence(observation: SyntheticObservation): SyntheticComparisonResult['offenceAssessment'] {
  const shared = {
    source: 'enforcement_image' as const,
    confidence: observation.confidence,
    evidenceReference: observation.evidence_reference,
  };
  if (!observationIsConclusive(observation)) {
    return {
      ...shared,
      state: 'inconclusive',
      reason: observation.limitation || 'The image is not clear enough to assess whether the alleged offence is visible.',
    };
  }
  const answer = collapse(observation.value);
  if (answer === 'yes') {
    return {
      ...shared,
      state: 'assessable',
      reason: 'The relevant visual area appears present enough for a citizen to review. This does not decide whether an offence occurred.',
    };
  }
  if (answer === 'no') {
    return {
      ...shared,
      state: 'not-assessable',
      reason: 'The supplied image does not contain enough visible context to assess the alleged offence.',
    };
  }
  return {
    ...shared,
    state: 'inconclusive',
    reason: observation.limitation || 'The available image does not support a reliable offence-visibility observation.',
  };
}

export function compareSyntheticEvidence(extraction: SyntheticEvidenceExtraction): SyntheticComparisonResult {
  const rows = comparisonFields.map((field) => compareField(field, extraction));
  const counts = {
    matches: rows.filter((row) => row.state === 'match').length,
    potentialMismatches: rows.filter((row) => row.state === 'potential-mismatch').length,
    inconclusive: rows.filter((row) => row.state === 'inconclusive').length,
  };
  const offenceAssessment = assessOffence(extraction.enforcement_image.offence_assessable);
  const primaryMismatchCount = rows.filter((row) => row.state === 'potential-mismatch' && row.materiality === 'primary').length;
  const supportingMismatchCount = rows.filter((row) => row.state === 'potential-mismatch' && row.materiality === 'supporting').length;
  const hasCorroboratedMismatch = primaryMismatchCount > 0 || supportingMismatchCount >= 2;
  const hasContextOnlyConflict = !hasCorroboratedMismatch && supportingMismatchCount > 0;
  const overall: SyntheticOverallFinding = hasCorroboratedMismatch
    ? 'potential-evidence-discrepancy'
    : counts.inconclusive > 0 || offenceAssessment.state !== 'assessable' || hasContextOnlyConflict
      ? 'inconclusive'
      : 'appears-consistent';

  return {
    overall,
    rows,
    counts,
    offenceAssessment,
    limitations: [...new Set([
      ...extraction.limitations,
      ...rows.filter((row) => row.state === 'inconclusive').map((row) => row.reason),
      ...(offenceAssessment.state === 'assessable' ? [] : [offenceAssessment.reason]),
      ...(hasContextOnlyConflict ? ['A single supporting-field conflict needs corroboration from a primary identifier or another independent field.'] : []),
    ])],
    decisionBoundary: 'ChallanSakshi compares supplied observations only. It does not determine validity, guilt, innocence, or a legal outcome.',
  };
}

export function decideSyntheticResolutionPath(result: SyntheticComparisonResult): SyntheticResolutionPath {
  if (result.overall === 'potential-evidence-discrepancy') {
    return {
      id: 'prepare-official-review',
      title: 'Prepare a fact-based review request',
      summary: 'One or more clear source values differ. Preserve both sources, confirm the observations, and use the official review route shown on the genuine record.',
      nextActions: [
        'Review and correct every extracted value before relying on the comparison.',
        'Keep the original record and enforcement evidence unchanged.',
        'Create the source-linked action pack, then continue on the genuine official portal yourself.',
      ],
      officialHandoff: 'Continue only through the official service named on the independently verified record.',
    };
  }
  if (result.overall === 'inconclusive') {
    return {
      id: 'request-clarification',
      title: 'Get clearer evidence or clarification first',
      summary: 'The supplied sources do not support a reliable comparison for every required field. Do not invent missing details.',
      nextActions: [
        'Open the original record and evidence on the genuine official service.',
        'Look for a clearer image, complete plate view, timestamp, or location record.',
        'Use the official clarification or review option if the evidence remains incomplete.',
      ],
      officialHandoff: 'Use the verified official portal to request clarification or review the available options.',
    };
  }
  return {
    id: 'no-dispute-basis-found',
    title: 'No evidence-based discrepancy found',
    summary: 'The supplied vehicle fields align and the alleged-offence area appears assessable. ChallanSakshi will not invent a dispute.',
    nextActions: [
      'Verify the amount, status, deadline, and payment history on the genuine official portal.',
      'Use only the official payment or case route shown there.',
      'Keep the receipt or acknowledgement if you take action.',
    ],
    officialHandoff: 'Continue to the genuine official service to verify status and act.',
  };
}

function safePackText(value: string, maximumLength = 280): string {
  const withoutLocalReferences = value
    .replace(/(?:blob|data|file|filesystem):[^\s]*/gi, '[omitted local reference]')
    .replace(/https?:\/\/[^\s]+|www\.[^\s]+/gi, '[omitted web address]')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return withoutLocalReferences.slice(0, maximumLength).trim() || '[not observed]';
}

function overallLabel(overall: SyntheticOverallFinding): string {
  if (overall === 'potential-evidence-discrepancy') return 'Potential evidence discrepancy';
  if (overall === 'appears-consistent') return 'Supplied evidence appears consistent';
  return 'Evidence is inconclusive';
}

export function buildSyntheticActionPack(
  extraction: SyntheticEvidenceExtraction,
  result: SyntheticComparisonResult,
  path: SyntheticResolutionPath,
): string {
  const lines = [
    'CHALLANSAKSHI — SYNTHETIC EVIDENCE ACTION PACK',
    '',
    'LAB BOUNDARY',
    'Prepared from user-reviewed test material. Bundled fixtures are fictional; ChallanSakshi cannot verify the provenance of a custom input. Nothing was submitted, authenticated, paid, or sent to a government system.',
    '',
    'RECORD DETAILS',
    `Challan reference: ${safePackText(extraction.challan_document.challan_number.value)}`,
    `Issue date: ${safePackText(extraction.challan_document.issue_date.value)}`,
    `Alleged offence: ${safePackText(extraction.challan_document.alleged_offence.value)}`,
    `Amount: ${safePackText(extraction.challan_document.amount.value)}`,
    '',
    'SOURCE-LINKED COMPARISON',
    ...result.rows.flatMap((row) => [
      `${row.label}: ${row.state}`,
      ...row.sources.map((source) => `  ${source.label}: ${safePackText(source.value)} · ${source.confidence} confidence · ${source.visibility} · ${safePackText(source.evidenceReference)} · Limit: ${safePackText(source.limitation)}`),
      `  Why: ${safePackText(row.reason)}`,
    ]),
    '',
    'OBSERVATION SUMMARY',
    overallLabel(result.overall),
    `${result.counts.potentialMismatches} potential discrepancies · ${result.counts.inconclusive} inconclusive fields · ${result.counts.matches} matching fields`,
    `Offence visibility: ${result.offenceAssessment.state} — ${safePackText(result.offenceAssessment.reason)}`,
    '',
    'LIMITATIONS',
    ...(result.limitations.length > 0
      ? result.limitations.map((limitation) => `- ${safePackText(limitation)}`)
      : ['- No additional limitations were recorded after review.']),
    '',
    'DETERMINISTIC NEXT STEP',
    path.title,
    path.summary,
    ...path.nextActions.map((action, index) => `${index + 1}. ${action}`),
    path.officialHandoff,
    '',
    'IMPORTANT LIMIT',
    'This is not a legal conclusion. ChallanSakshi does not decide whether a challan is valid, illegal, correct, or cancellable, and does not determine guilt or innocence.',
  ];
  return lines.join('\n');
}
