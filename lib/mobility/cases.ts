export type ServiceKind =
  | 'challan-review'
  | 'challan-payment'
  | 'payment-status'
  | 'fastag'
  | 'licence-apply'
  | 'licence-renew'
  | 'vehicle-transfer'
  | 'lost-documents'
  | 'move-state';

export type CaseStatus = 'preparing' | 'ready' | 'awaiting-response' | 'needs-attention' | 'completed';

export type CaseFact = {
  key: string;
  label: string;
  value: string;
  source: 'document' | 'citizen' | 'profile';
  confirmed: boolean;
  sourceId?: string;
  sourceFingerprint?: string;
  page?: number;
};

export type CaseEvent = {
  id: string;
  at: string;
  kind: 'created' | 'prepared' | 'updated' | 'official-opened' | 'citizen-report' | 'follow-up';
  text: string;
  basis: 'local' | 'citizen-reported';
};

export type MobilityCase = {
  version: 1;
  id: string;
  service: ServiceKind;
  title: string;
  jurisdiction: string;
  facts: CaseFact[];
  draft: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  followUpDate: string;
  reference: string;
  events: CaseEvent[];
  completedSteps: string[];
  appointment?: { at: string; venue: string; instructions: string };
};

export type MobilityProfile = {
  version: 1;
  name: string;
  language: 'en' | 'hi';
  vehicles: { id: string; label: string; registration: string }[];
  address: string;
  updatedAt: string;
};

export type CaseUpdateEvent = Pick<CaseEvent, 'kind' | 'text' | 'basis'>;

export type MobilityCasePatch = Partial<Pick<
  MobilityCase,
  | 'title'
  | 'jurisdiction'
  | 'facts'
  | 'draft'
  | 'status'
  | 'followUpDate'
  | 'reference'
  | 'completedSteps'
  | 'appointment'
>>;

export type CasePatch = MobilityCasePatch;

const SERVICE_KINDS: readonly ServiceKind[] = [
  'challan-review',
  'challan-payment',
  'payment-status',
  'fastag',
  'licence-apply',
  'licence-renew',
  'vehicle-transfer',
  'lost-documents',
  'move-state',
];

const CASE_STATUSES: readonly CaseStatus[] = [
  'preparing',
  'ready',
  'awaiting-response',
  'needs-attention',
  'completed',
];

const EVENT_KINDS: readonly CaseEvent['kind'][] = [
  'created',
  'prepared',
  'updated',
  'official-opened',
  'citizen-report',
  'follow-up',
];

const EVENT_BASES: readonly CaseEvent['basis'][] = ['local', 'citizen-reported'];
const FACT_SOURCES: readonly CaseFact['source'][] = ['document', 'citizen', 'profile'];
const LANGUAGES: readonly MobilityProfile['language'][] = ['en', 'hi'];

const CASE_KEYS = [
  'version',
  'id',
  'service',
  'title',
  'jurisdiction',
  'facts',
  'draft',
  'status',
  'createdAt',
  'updatedAt',
  'followUpDate',
  'reference',
  'events',
  'completedSteps',
  'appointment',
] as const;

const PATCH_KEYS = [
  'title',
  'jurisdiction',
  'facts',
  'draft',
  'status',
  'followUpDate',
  'reference',
  'completedSteps',
  'appointment',
] as const;

const MAX_FACTS = 100;
const MAX_EVENTS = 200;
const MAX_COMPLETED_STEPS = 100;
const MAX_VEHICLES = 20;
const CASE_REVISION = Symbol.for('challansakshi.mobility.case-revision');

const DEFAULT_TITLES: Record<ServiceKind, string> = {
  'challan-review': 'Challan review',
  'challan-payment': 'Challan payment plan',
  'payment-status': 'Payment status check',
  fastag: 'FASTag issue',
  'licence-apply': 'Driving licence application',
  'licence-renew': 'Driving licence renewal',
  'vehicle-transfer': 'Vehicle transfer',
  'lost-documents': 'Lost document plan',
  'move-state': 'Move-state vehicle plan',
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, label: string): UnknownRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, allowed: readonly string[], label: string, allowedSymbols: readonly symbol[] = []): void {
  const unexpected = Reflect.ownKeys(value).find((key) => (
    typeof key === 'string' ? !allowed.includes(key) : !allowedSymbols.includes(key)
  ));
  if (unexpected !== undefined) {
    throw new TypeError(`${label} has an unexpected field: ${String(unexpected)}.`);
  }
}

function textValue(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== 'string') throw new TypeError(`${label} must be text.`);
  const clean = value.trim();
  if (required && clean.length === 0) throw new TypeError(`${label} cannot be empty.`);
  if (clean.length > max) throw new TypeError(`${label} must be at most ${max} characters.`);
  if (/\0|[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(clean)) {
    throw new TypeError(`${label} contains unsupported control characters.`);
  }
  return clean;
}

function identifier(value: unknown, label: string, max = 80): string {
  const clean = textValue(value, label, max, true);
  if (!new RegExp(`^[A-Za-z0-9][A-Za-z0-9_-]{0,${max - 1}}$`, 'u').test(clean)) {
    throw new TypeError(`${label} contains unsupported characters.`);
  }
  return clean;
}

function factKey(value: unknown): string {
  const clean = textValue(value, 'Fact key', 80, true);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(clean)) {
    throw new TypeError('Fact key contains unsupported characters.');
  }
  return clean;
}

function validIsoTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/u.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');
  const offsetHour = Number(match[10] ?? '0');
  const offsetMinute = Number(match[11] ?? '0');
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1
    && month <= 12
    && day >= 1
    && day <= monthDays[month - 1]
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59;
}

function timestamp(value: unknown, label: string): string {
  const clean = textValue(value, label, 64, true);
  if (!validIsoTimestamp(clean)) {
    throw new TypeError(`${label} must be a valid ISO timestamp.`);
  }
  return clean;
}

function optionalDate(value: unknown, label: string): string {
  const clean = textValue(value, label, 10);
  if (clean === '') return clean;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(clean)) throw new TypeError(`${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${clean}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== clean) {
    throw new TypeError(`${label} must be a valid calendar date.`);
  }
  return clean;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new TypeError(`${label} is invalid.`);
  }
  return value as T;
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must be unique.`);
}

function validateFact(value: unknown, index: number): CaseFact {
  const input = record(value, `Fact ${index + 1}`);
  exactKeys(input, ['key', 'label', 'value', 'source', 'confirmed', 'sourceId', 'sourceFingerprint', 'page'], `Fact ${index + 1}`);
  if (typeof input.confirmed !== 'boolean') throw new TypeError(`Fact ${index + 1} confirmed must be boolean.`);
  const result: CaseFact = {
    key: factKey(input.key),
    label: textValue(input.label, `Fact ${index + 1} label`, 160, true),
    value: textValue(input.value, `Fact ${index + 1} value`, 2_000),
    source: enumValue(input.source, FACT_SOURCES, `Fact ${index + 1} source`),
    confirmed: input.confirmed,
  };
  if (input.sourceId !== undefined) result.sourceId = textValue(input.sourceId, `Fact ${index + 1} sourceId`, 160, true);
  if (input.sourceFingerprint !== undefined) {
    if (!result.sourceId || typeof input.sourceFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(input.sourceFingerprint)) throw new TypeError(`Fact ${index + 1} source fingerprint must be a SHA-256 value with a source identifier.`);
    result.sourceFingerprint = input.sourceFingerprint;
  }
  if (input.page !== undefined) {
    if (!Number.isInteger(input.page) || (input.page as number) < 1 || (input.page as number) > 10_000) {
      throw new TypeError(`Fact ${index + 1} page must be a positive integer.`);
    }
    result.page = input.page as number;
  }
  return result;
}

function validateEvent(value: unknown, index: number): CaseEvent {
  const input = record(value, `Event ${index + 1}`);
  exactKeys(input, ['id', 'at', 'kind', 'text', 'basis'], `Event ${index + 1}`);
  const event: CaseEvent = {
    id: identifier(input.id, `Event ${index + 1} id`),
    at: timestamp(input.at, `Event ${index + 1} at`),
    kind: enumValue(input.kind, EVENT_KINDS, `Event ${index + 1} kind`),
    text: textValue(input.text, `Event ${index + 1} text`, 1_000, true),
    basis: enumValue(input.basis, EVENT_BASES, `Event ${index + 1} basis`),
  };
  if (event.kind === 'citizen-report' && event.basis !== 'citizen-reported') {
    throw new TypeError('A citizen-report event must have citizen-reported basis.');
  }
  if (event.kind === 'created' && event.basis !== 'local') {
    throw new TypeError('A created event must have local basis.');
  }
  return event;
}

function validateAppointment(value: unknown): NonNullable<MobilityCase['appointment']> {
  const input = record(value, 'Appointment');
  exactKeys(input, ['at', 'venue', 'instructions'], 'Appointment');
  return {
    at: timestamp(input.at, 'Appointment at'),
    venue: textValue(input.venue, 'Appointment venue', 500, true),
    instructions: textValue(input.instructions, 'Appointment instructions', 2_000),
  };
}

function copyRevision(from: object, to: object): void {
  const descriptor = Object.getOwnPropertyDescriptor(from, CASE_REVISION);
  if (descriptor) Object.defineProperty(to, CASE_REVISION, descriptor);
}

export function createCase(service: ServiceKind, now: string, id: string): MobilityCase {
  const checkedService = enumValue(service, SERVICE_KINDS, 'Service');
  const checkedNow = timestamp(now, 'Created at');
  const checkedId = identifier(id, 'Case id');
  return {
    version: 1,
    id: checkedId,
    service: checkedService,
    title: DEFAULT_TITLES[checkedService],
    jurisdiction: '',
    facts: [],
    draft: '',
    status: 'preparing',
    createdAt: checkedNow,
    updatedAt: checkedNow,
    followUpDate: '',
    reference: '',
    events: [{ id: 'created', at: checkedNow, kind: 'created', text: 'Case preparation started.', basis: 'local' }],
    completedSteps: [],
  };
}

export function validateCase(value: unknown): MobilityCase {
  const input = record(value, 'Mobility case');
  exactKeys(input, CASE_KEYS, 'Mobility case', [CASE_REVISION]);
  if (input.version !== 1) throw new TypeError('Mobility case version must be 1.');
  if (!Array.isArray(input.facts) || input.facts.length > MAX_FACTS) {
    throw new TypeError(`Mobility case facts must contain at most ${MAX_FACTS} records.`);
  }
  if (!Array.isArray(input.events) || input.events.length === 0 || input.events.length > MAX_EVENTS) {
    throw new TypeError(`Mobility case events must contain 1 to ${MAX_EVENTS} records.`);
  }
  if (!Array.isArray(input.completedSteps) || input.completedSteps.length > MAX_COMPLETED_STEPS) {
    throw new TypeError(`Mobility case completedSteps must contain at most ${MAX_COMPLETED_STEPS} records.`);
  }

  const facts = input.facts.map(validateFact);
  unique(facts.map((fact) => fact.key), 'Fact keys');
  const events = input.events.map(validateEvent);
  unique(events.map((event) => event.id), 'Event ids');
  if (events[0].kind !== 'created' || events.some((event, index) => index > 0 && event.kind === 'created')) {
    throw new TypeError('Mobility case must have one created event first.');
  }
  const completedSteps = input.completedSteps.map((step, index) => identifier(step, `Completed step ${index + 1}`));
  unique(completedSteps, 'Completed step ids');

  const createdAt = timestamp(input.createdAt, 'createdAt');
  const updatedAt = timestamp(input.updatedAt, 'updatedAt');
  const createdTime = Date.parse(createdAt);
  const updatedTime = Date.parse(updatedAt);
  if (updatedTime < createdTime) throw new TypeError('updatedAt cannot be earlier than createdAt.');
  if (events[0].at !== createdAt) throw new TypeError('Created event timestamp must match createdAt.');
  let previousTime = createdTime;
  for (const event of events) {
    const eventTime = Date.parse(event.at);
    if (eventTime < previousTime || eventTime > updatedTime) {
      throw new TypeError('Event timestamps must be ordered between createdAt and updatedAt.');
    }
    previousTime = eventTime;
  }

  const result: MobilityCase = {
    version: 1,
    id: identifier(input.id, 'Case id'),
    service: enumValue(input.service, SERVICE_KINDS, 'Service'),
    title: textValue(input.title, 'Title', 160, true),
    jurisdiction: textValue(input.jurisdiction, 'Jurisdiction', 160),
    facts,
    draft: textValue(input.draft, 'Draft', 16_000),
    status: enumValue(input.status, CASE_STATUSES, 'Status'),
    createdAt,
    updatedAt,
    followUpDate: optionalDate(input.followUpDate, 'followUpDate'),
    reference: textValue(input.reference, 'Reference', 160),
    events,
    completedSteps,
  };
  if (input.appointment !== undefined) result.appointment = validateAppointment(input.appointment);
  copyRevision(input, result);
  return result;
}

export function updateCase(
  caseValue: MobilityCase,
  patch: MobilityCasePatch,
  now: string,
  event?: CaseUpdateEvent,
): MobilityCase {
  const current = validateCase(caseValue);
  const checkedPatch = record(patch, 'Case patch');
  const unexpected = Reflect.ownKeys(checkedPatch).find((key) => typeof key !== 'string' || !PATCH_KEYS.includes(key as typeof PATCH_KEYS[number]));
  if (unexpected !== undefined) throw new TypeError(`Case field ${String(unexpected)} cannot be updated.`);
  const checkedNow = timestamp(now, 'updatedAt');
  if (Date.parse(checkedNow) < Date.parse(current.updatedAt)) throw new TypeError('updatedAt cannot be earlier than the current case.');

  const nextEvents = [...current.events];
  if (event !== undefined) {
    const eventInput = record(event, 'Update event');
    exactKeys(eventInput, ['kind', 'text', 'basis'], 'Update event');
    if (eventInput.kind === 'created') throw new TypeError('A created event cannot be added during an update.');
    const usedEventIds = new Set(nextEvents.map((item) => item.id));
    let eventNumber = 2;
    while (usedEventIds.has(`event-${eventNumber}`)) eventNumber += 1;
    nextEvents.push(validateEvent({
      id: `event-${eventNumber}`,
      at: checkedNow,
      kind: eventInput.kind,
      text: eventInput.text,
      basis: eventInput.basis,
    }, nextEvents.length));
  }

  const merged: UnknownRecord = { ...current, ...checkedPatch, updatedAt: checkedNow, events: nextEvents };
  if (checkedPatch.appointment === undefined && Object.prototype.hasOwnProperty.call(checkedPatch, 'appointment')) {
    delete merged.appointment;
  }
  const result = validateCase(merged);
  copyRevision(caseValue, result);
  return result;
}

export function buildCaseNote(caseValue: MobilityCase, language: 'en' | 'hi' = 'en'): string {
  const checked = validateCase(caseValue);
  const checkedLanguage = enumValue(language, LANGUAGES, 'Language');
  const confirmed = checked.facts.filter((fact) => fact.confirmed);
  const citizenReports = checked.events.filter((event) => event.kind === 'citizen-report');
  const lines = checkedLanguage === 'hi'
    ? [
        checked.title,
        `सेवा: ${checked.service}`,
        `केस प्रगति: ${checked.status}`,
        checked.jurisdiction ? `क्षेत्र: ${checked.jurisdiction}` : '',
        confirmed.length ? 'नागरिक द्वारा पुष्टि किए गए तथ्य:' : '',
        ...confirmed.map((fact) => `- ${fact.label}: ${fact.value} (${fact.source})`),
        checked.draft ? `तैयार मसौदा:\n${checked.draft}` : '',
        ...citizenReports.map((event) => `नागरिक द्वारा बताई गई जानकारी: ${event.text}`),
        checked.reference ? `नागरिक संदर्भ: ${checked.reference}` : '',
        checked.followUpDate ? `फॉलो-अप: ${checked.followUpDate}` : '',
      ]
    : [
        checked.title,
        `Service: ${checked.service}`,
        `Case progress: ${checked.status}`,
        checked.jurisdiction ? `Jurisdiction: ${checked.jurisdiction}` : '',
        confirmed.length ? 'Citizen-confirmed facts:' : '',
        ...confirmed.map((fact) => `- ${fact.label}: ${fact.value} (${fact.source})`),
        checked.draft ? `Prepared draft:\n${checked.draft}` : '',
        ...citizenReports.map((event) => `Citizen-reported update: ${event.text}`),
        checked.reference ? `Citizen reference: ${checked.reference}` : '',
        checked.followUpDate ? `Follow-up: ${checked.followUpDate}` : '',
      ];
  return lines.filter(Boolean).join('\n');
}

export function validateProfile(value: unknown): MobilityProfile {
  const input = record(value, 'Mobility profile');
  exactKeys(input, ['version', 'name', 'language', 'vehicles', 'address', 'updatedAt'], 'Mobility profile');
  if (input.version !== 1) throw new TypeError('Mobility profile version must be 1.');
  if (!Array.isArray(input.vehicles) || input.vehicles.length > MAX_VEHICLES) {
    throw new TypeError(`Mobility profile vehicles must contain at most ${MAX_VEHICLES} records.`);
  }
  const vehicles = input.vehicles.map((value, index) => {
    const vehicle = record(value, `Vehicle ${index + 1}`);
    exactKeys(vehicle, ['id', 'label', 'registration'], `Vehicle ${index + 1}`);
    return {
      id: identifier(vehicle.id, `Vehicle ${index + 1} id`),
      label: textValue(vehicle.label, `Vehicle ${index + 1} label`, 160, true),
      registration: textValue(vehicle.registration, `Vehicle ${index + 1} registration`, 160, true),
    };
  });
  unique(vehicles.map((vehicle) => vehicle.id), 'Vehicle ids');
  return {
    version: 1,
    name: textValue(input.name, 'Profile name', 160),
    language: enumValue(input.language, LANGUAGES, 'Profile language'),
    vehicles,
    address: textValue(input.address, 'Profile address', 2_000),
    updatedAt: timestamp(input.updatedAt, 'Profile updatedAt'),
  };
}
