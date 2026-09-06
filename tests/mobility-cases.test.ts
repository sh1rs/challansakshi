import { describe, expect, it } from 'vitest';
import {
  buildCaseNote,
  createCase,
  updateCase,
  validateCase,
  validateProfile,
  type MobilityCase,
} from '../lib/mobility/cases';

const CREATED_AT = '2026-09-06T08:00:00.000Z';

describe('mobility case domain', () => {
  it('creates a bounded local preparation record without manufacturing an official outcome', () => {
    const caseValue = createCase('challan-review', CREATED_AT, 'case-1');

    expect(caseValue).toEqual({
      version: 1,
      id: 'case-1',
      service: 'challan-review',
      title: 'Challan review',
      jurisdiction: '',
      facts: [],
      draft: '',
      status: 'preparing',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      followUpDate: '',
      reference: '',
      events: [{
        id: 'created',
        at: CREATED_AT,
        kind: 'created',
        text: 'Case preparation started.',
        basis: 'local',
      }],
      completedSteps: [],
    });
    expect(caseValue.events.some((event) => event.kind === 'citizen-report' || event.kind === 'official-opened')).toBe(false);
  });

  it('accepts document bridge fact keys and sanitizes whitespace without silently truncating content', () => {
    const value = createCase('challan-review', CREATED_AT, 'case-bridge');
    const checked = validateCase({
      ...value,
      title: '  Review Bengaluru notice  ',
      facts: [{
        key: 'notice.registration-number',
        label: '  Registration number  ',
        value: '  KA01AB3317  ',
        source: 'document',
        confirmed: true,
        sourceId: 'source-9f5715df-91b2-48b9-9470-5933cb0eaa77',
        page: 2,
      }],
    });

    expect(checked.title).toBe('Review Bengaluru notice');
    expect(checked.facts[0]).toEqual({
      key: 'notice.registration-number',
      label: 'Registration number',
      value: 'KA01AB3317',
      source: 'document',
      confirmed: true,
      sourceId: 'source-9f5715df-91b2-48b9-9470-5933cb0eaa77',
      page: 2,
    });

    expect(() => validateCase({ ...value, draft: 'x'.repeat(16_001) })).toThrow(/draft/i);
  });

  it('rejects unexpected secret-bearing fields, duplicate identifiers, bad dates and invalid provenance', () => {
    const value = createCase('challan-review', CREATED_AT, 'case-validation');

    expect(() => validateCase({ ...value, accessToken: 'secret' })).toThrow(/unexpected/i);
    expect(() => validateCase({
      ...value,
      facts: [{
        key: 'notice.number',
        label: 'Notice number',
        value: '123',
        source: 'portal',
        confirmed: false,
      }],
    })).toThrow(/source/i);
    expect(() => validateCase({
      ...value,
      events: [value.events[0], { ...value.events[0], text: 'Duplicate event' }],
    })).toThrow(/unique/i);
    expect(() => validateCase({ ...value, updatedAt: 'not-a-date' })).toThrow(/updatedAt/i);
    expect(() => createCase('fastag', '2026-02-31T08:00:00.000Z', 'case-impossible-date')).toThrow(/valid ISO timestamp/i);
  });

  it('retains an optional source fingerprint only with a valid linked source', () => {
    const value = createCase('challan-review', CREATED_AT, 'fingerprint-case');
    const fact = { key: 'notice.registration', label: 'Registration', value: 'KA01AB3317', source: 'document', confirmed: false, sourceId: 'source-one', sourceFingerprint: 'a'.repeat(64) };
    expect(validateCase({ ...value, facts: [fact] }).facts[0]).toEqual(fact);
    expect(validateCase({ ...value, facts: [{ ...fact, source: 'citizen' }] }).facts[0].sourceFingerprint).toBe(fact.sourceFingerprint);
    for (const sourceFingerprint of ['a'.repeat(63), 'A'.repeat(64), 'not-a-hash', '', null]) expect(() => validateCase({ ...value, facts: [{ ...fact, sourceFingerprint }] })).toThrow(/fingerprint/i);
    expect(() => validateCase({ ...value, facts: [{ ...fact, sourceId: undefined }] })).toThrow(/fingerprint/i);
  });

  it('updates only mutable fields and keeps a citizen-reported outcome distinct from official status', () => {
    const original = createCase('payment-status', CREATED_AT, 'case-payment');
    const updated = updateCase(
      original,
      { status: 'completed', reference: ' citizen note 44 ' },
      '2026-09-06T09:00:00.000Z',
      { kind: 'citizen-report', text: '  Citizen says the payment is visible.  ', basis: 'citizen-reported' },
    );

    expect(updated.reference).toBe('citizen note 44');
    expect(updated.events.at(-1)).toEqual({
      id: 'event-2',
      at: '2026-09-06T09:00:00.000Z',
      kind: 'citizen-report',
      text: 'Citizen says the payment is visible.',
      basis: 'citizen-reported',
    });
    expect(buildCaseNote(updated)).toContain('Citizen-reported update: Citizen says the payment is visible.');
    expect(buildCaseNote(updated)).not.toContain('Official status: completed');

    expect(() => updateCase(original, { id: 'replacement' } as never, '2026-09-06T09:00:00.000Z')).toThrow(/cannot be updated/i);
    expect(() => updateCase(
      original,
      {},
      '2026-09-06T09:00:00.000Z',
      { kind: 'citizen-report', text: 'Paid', basis: 'local' },
    )).toThrow(/citizen-reported/i);
  });

  it('does not let an update move time backwards or silently create an official event', () => {
    const original = createCase('vehicle-transfer', CREATED_AT, 'case-transfer');

    expect(() => updateCase(original, { status: 'ready' }, '2026-09-06T07:59:59.999Z')).toThrow(/earlier/i);
    const updated = updateCase(original, { status: 'ready' }, '2026-09-06T08:01:00.000Z');
    expect(updated.events).toHaveLength(1);
    expect(updated.events[0].kind).toBe('created');
  });

  it('generates an unused event id when imported history uses a non-sequential id', () => {
    const original = validateCase({
      ...createCase('vehicle-transfer', CREATED_AT, 'case-imported-events'),
      updatedAt: '2026-09-06T08:05:00.000Z',
      events: [
        createCase('vehicle-transfer', CREATED_AT, 'unused').events[0],
        { id: 'event-3', at: '2026-09-06T08:05:00.000Z', kind: 'updated', text: 'Imported update', basis: 'local' },
      ],
    });

    const updated = updateCase(original, {}, '2026-09-06T08:06:00.000Z', { kind: 'follow-up', text: 'Review later', basis: 'local' });

    expect(updated.events.at(-1)?.id).toBe('event-2');
  });

  it('validates reusable profile data with exact fields and unique vehicle ids', () => {
    const profile = validateProfile({
      version: 1,
      name: '  Asha Rao ',
      language: 'hi',
      vehicles: [{ id: 'vehicle-1', label: '  Family scooter ', registration: ' KA 01 AB 3317 ' }],
      address: '  Bengaluru, Karnataka ',
      updatedAt: CREATED_AT,
    });

    expect(profile.name).toBe('Asha Rao');
    expect(profile.vehicles[0]).toEqual({ id: 'vehicle-1', label: 'Family scooter', registration: 'KA 01 AB 3317' });
    expect(() => validateProfile({ ...profile, otp: '123456' })).toThrow(/unexpected/i);
    expect(() => validateProfile({ ...profile, vehicles: [profile.vehicles[0], profile.vehicles[0]] })).toThrow(/unique/i);
    expect(() => validateProfile({ ...profile, vehicles: Array.from({ length: 21 }, (_, index) => ({ id: `v-${index}`, label: 'Vehicle', registration: `KA01A${index}` })) })).toThrow(/20/);
  });

  it('rejects extra fields at every nested boundary', () => {
    const value: MobilityCase = createCase('fastag', CREATED_AT, 'case-nested');
    expect(() => validateCase({
      ...value,
      facts: [{ key: 'tag.id', label: 'Tag', value: 'A', source: 'citizen', confirmed: true, password: 'secret' }],
    })).toThrow(/unexpected/i);
    expect(() => validateCase({
      ...value,
      appointment: { at: '2026-09-08T10:00:00.000Z', venue: 'Office', instructions: 'Bring originals', cookie: 'secret' },
    })).toThrow(/unexpected/i);
  });
});
