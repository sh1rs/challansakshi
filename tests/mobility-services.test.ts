import { describe, expect, it } from 'vitest';
import { getService, inferService, LIFE_EVENTS, SERVICE_KINDS } from '../lib/mobility/services';

describe('mobility task intake', () => {
  it.each([
    ['Please review my wrong challan', 'challan-review'],
    ['I want to pay my challan', 'challan-payment'],
    ['My challan payment failed and money was debited', 'payment-status'],
    ['FASTag toll payment failed', 'fastag'],
    ['I need to renew my driving licence', 'licence-renew'],
    ['Apply for a new driving license', 'licence-apply'],
    ['I bought a used car', 'vehicle-transfer'],
    ['I lost my driving licence', 'lost-documents'],
    ['Moving to another state', 'move-state'],
    ['मेरा चालान गलत है', 'challan-review'],
    ['ड्राइविंग लाइसेंस नवीनीकरण', 'licence-renew'],
    ['मेरे पैसे कट गए और रसीद नहीं मिली', 'payment-status'],
    ['दूसरे राज्य में जा रहा हूँ', 'move-state'],
  ])('infers an unambiguous request: %s', (text, kind) => {
    expect(inferService(text)).toEqual({ kind, choices: [kind] });
  });

  it('requires a choice when the licence stage is unknown', () => {
    expect(inferService('help with my licence')).toEqual({ kind: null, choices: ['licence-apply', 'licence-renew'] });
  });

  it('retains distinct services for a multi-intent request', () => {
    const result = inferService('I bought a used car and need to review its challan');
    expect(result.kind).toBeNull();
    expect(result.choices).toEqual(expect.arrayContaining(['vehicle-transfer', 'challan-review']));
  });

  it.each(['', 'hello', 'I lost my phone', 'remove my saved data'])('keeps unknown requests open instead of pretending certainty: %s', text => {
    expect(inferService(text)).toEqual({ kind: null, choices: [...SERVICE_KINDS] });
  });

  it('asks for a choice when payment and dispute intent conflict', () => {
    expect(inferService('pay this wrong challan').kind).toBeNull();
  });
});

describe('official preparation catalogue', () => {
  it('has bilingual actionable steps and an official source for every service', () => {
    expect(new Set(SERVICE_KINDS).size).toBe(9);
    for (const kind of SERVICE_KINDS) {
      const service = getService(kind);
      expect(service.kind).toBe(kind);
      expect(service.title.en).toBeTruthy(); expect(service.title.hi).toBeTruthy();
      expect(service.description.en).toBeTruthy(); expect(service.description.hi).toBeTruthy();
      const url = new URL(service.sourceUrl);
      expect(url.protocol).toBe('https:');
      expect(['echallan.parivahan.gov.in', 'parivahan.gov.in', 'mparivahan.parivahan.gov.in', 'www.npci.org.in']).toContain(url.hostname);
      expect(service.steps.length).toBeGreaterThanOrEqual(3);
      expect(new Set(service.steps.map(step => step.id)).size).toBe(service.steps.length);
      for (const step of service.steps) { expect(step.title.en).toBeTruthy(); expect(step.title.hi).toBeTruthy(); expect(step.detail.en).toBeTruthy(); expect(step.detail.hi).toBeTruthy(); }
    }
  });

  it('offers separate relevant service plans for each life event', () => {
    expect(LIFE_EVENTS).toHaveLength(5);
    for (const event of LIFE_EVENTS) {
      expect(event.services.length).toBeGreaterThan(0);
      expect(event.description.en).toBeTruthy(); expect(event.description.hi).toBeTruthy();
      event.services.forEach(kind => expect(getService(kind)).toBeTruthy());
    }
    expect(LIFE_EVENTS.find(event => event.id === 'learning')?.services).toEqual(['licence-apply']);
    expect(LIFE_EVENTS.find(event => event.id === 'selling')?.services).toEqual(['vehicle-transfer', 'fastag']);
  });

  it('rejects unrecognised service lookup', () => {
    expect(() => getService('toString' as never)).toThrow('Unknown mobility service');
  });
});
