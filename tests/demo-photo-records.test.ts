// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChallanSakshiApp from '../components/ChallanSakshiApp';
import { fixtures } from '../lib/fixtures';
import { createSubmittedRevisionId } from '../lib/case-ledger';

const roots: ReturnType<typeof createRoot>[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: true, media, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true }));
  localStorage.clear();
  window.history.replaceState({}, '', '/demo');
});

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(createElement(ChallanSakshiApp)));
  act(() => vi.runOnlyPendingTimers());
  return host;
}

function click(host: HTMLElement, label: string) {
  const button = [...host.querySelectorAll('button')].find(control => control.textContent?.includes(label));
  expect(button).toBeDefined();
  act(() => button!.click());
}

describe('long demo photo records', () => {
  it.each([4, 5])('reopens an old v%s consistent source for review and preserves the original saved record', version => {
    const oldFacts = fixtures.consistent.extractedFacts.map(fact => ({
      ...fact,
      value: fact.value === 'TEST-26-SC-3317' ? 'TEST-26-SC-9024' : fact.value,
    }));
    const editedFacts = oldFacts.map(fact => fact.id === 'observed-colour' ? { ...fact, value: 'Teal' } : fact);
    const saved = JSON.stringify({
      version, language: 'en', fixtureId: 'consistent', step: 'tracking', facts: editedFacts,
      analysisFacts: oldFacts, confirmed: true, analysisMode: 'precomputed', trackingStage: 4,
      outcome: 'rejected', submittedFacts: editedFacts,
      submittedRevisionId: createSubmittedRevisionId('consistent', editedFacts),
      custodyScenarioId: 'sold-before-event', custodyReviewed: true, passportScopeReviewed: true,
      orderNoteCreated: true, orderLimitationConfirmed: true,
    });
    localStorage.setItem(`challansakshi-demo-v${version}`, saved);
    localStorage.setItem('unrelated-local-record', 'keep me');
    window.history.replaceState({}, '', '/demo#tracking');
    const host = mount();
    expect(host.querySelector('h1')?.textContent).toBe('Review the extracted facts');
    expect(host.querySelector<HTMLInputElement>('#fact-confirmation')?.checked).toBe(false);
    expect(host.querySelector<HTMLInputElement>('#fact-observed-registration')?.value).toBe('TEST-26-SC-3317');
    expect(host.querySelector<HTMLInputElement>('#fact-observed-colour')?.value).toBe('Teal');
    expect(host.textContent).toContain('The demo photograph changed');
    expect(host.textContent).toContain('Download previous saved demo');
    expect(window.location.hash).toBe('#review');
    const current = JSON.parse(localStorage.getItem('challansakshi-demo-v5')!);
    expect(current.previousConsistentSource).toBe(saved);
    expect(current.photoRevision).toBe('physical-plates-v2');
    expect(current.submittedFacts).toBeNull();
    expect(current.submittedRevisionId).toBeNull();
    expect(current.orderNoteCreated).toBe(false);
    expect(current.passportScopeReviewed).toBe(false);
    expect(current.custodyReviewed).toBe(false);
    expect(localStorage.getItem('unrelated-local-record')).toBe('keep me');
    click(host, 'See the evidence finding');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Confirm the review before continuing');
  });

  it.each([
    { version: 4, photoRevision: undefined },
    { version: 5, photoRevision: undefined },
    { version: 5, photoRevision: 'blank-plates-v1' },
  ])('re-reviews every old v$version photo revision while preserving fully customized registrations', ({ version, photoRevision }) => {
    const registrationIds = ['alleged-registration', 'observed-registration', 'record-registration'];
    const customFacts = fixtures.consistent.extractedFacts.map(fact => registrationIds.includes(fact.id) ? {
      ...fact,
      value: 'TEST-26-CUSTOM-1234',
      confidence: 'low' as const,
      uncertainty: { en: 'Citizen retained this uncertain reading.', hi: 'नागरिक ने यह अस्पष्ट रीडिंग रखी है।' },
    } : { ...fact });
    const saved = JSON.stringify({
      version, photoRevision, fixtureId: 'consistent', step: 'finding',
      facts: customFacts, analysisFacts: customFacts, submittedFacts: customFacts,
      submittedRevisionId: createSubmittedRevisionId('consistent', customFacts),
      confirmed: true, custodyReviewed: true, passportScopeReviewed: true,
      orderNoteCreated: true, orderLimitationConfirmed: true,
    });
    localStorage.setItem(`challansakshi-demo-v${version}`, saved);
    window.history.replaceState({}, '', '/demo#finding');

    const host = mount();

    expect(host.querySelector('h1')?.textContent).toBe('Review the extracted facts');
    expect(host.querySelector<HTMLInputElement>('#fact-confirmation')?.checked).toBe(false);
    expect(window.location.hash).toBe('#review');
    const current = JSON.parse(localStorage.getItem('challansakshi-demo-v5')!);
    expect(current.facts).toEqual(customFacts);
    expect(current.previousConsistentSource).toBe(saved);
    expect(current.confirmed).toBe(false);
    expect(current.photoRevision).toBe('physical-plates-v2');
    expect(current.submittedFacts).toBeNull();
    expect(current.submittedRevisionId).toBeNull();
    expect(current.orderNoteCreated).toBe(false);
    expect(current.orderLimitationConfirmed).toBe(false);
    expect(current.passportScopeReviewed).toBe(false);
    expect(current.custodyReviewed).toBe(false);
  });

  it.each([
    { fixtureId: 'mismatch' as const, photoRevision: undefined },
    { fixtureId: 'consistent' as const, photoRevision: 'physical-plates-v2' },
  ])('preserves a reviewed $fixtureId session outside the old consistent source revision', ({ fixtureId, photoRevision }) => {
    const facts = fixtures[fixtureId].extractedFacts.map(fact => ({ ...fact }));
    localStorage.setItem('challansakshi-demo-v5', JSON.stringify({ version: 5, fixtureId, photoRevision, facts, analysisFacts: facts, confirmed: true, step: 'finding' }));
    window.history.replaceState({}, '', '/demo#finding');
    mount();
    const current = JSON.parse(localStorage.getItem('challansakshi-demo-v5')!);
    expect(current.confirmed).toBe(true);
    expect(current.step).toBe('finding');
    expect(current.previousConsistentSource).toBeNull();
    expect(current.facts).toEqual(facts);
  });

  it('renders the raster with physical fictional plates without using a numeric CSS overlay as evidence', () => {
    const host = mount();
    const photo = host.querySelector<HTMLElement>('.evidence-scene .evidence-photo');
    expect(photo?.style.backgroundImage).toContain('/evidence-contact-sheet-plates-v2.png');
    expect(photo?.getAttribute('aria-label')).toMatch(/TEST-26-MC-3817.*fictional.*visible.*image/i);
    expect(photo?.textContent).not.toMatch(/TEST-26/);
  });

  it('keeps the consistent record aligned with the physical scooter plate in the reused image', () => {
    const host = mount();
    click(host, 'Explore the longer fictional walkthrough');
    click(host, 'Records appear consistent');
    expect(host.querySelector('#source-vehicle-record')?.textContent).toContain('TEST-26-SC-3317');
    expect(host.querySelector('#source-challan')?.textContent).toContain('TEST-26-SC-3317');
    expect(host.querySelector('#source-citizen-photo [role="img"]')?.getAttribute('aria-label')).toContain('TEST-26-SC-3317');
    expect(host.querySelector('#source-citizen-photo')?.textContent).toContain('not an independent citizen photograph');
  });
});
