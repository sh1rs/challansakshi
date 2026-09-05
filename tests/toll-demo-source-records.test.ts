// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TollSakshiApp from '../components/public-beta/TollSakshiApp';

const roots: ReturnType<typeof createRoot>[] = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(synthetic: boolean): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(createElement<NonNullable<Parameters<typeof TollSakshiApp>[0]>>(TollSakshiApp, { synthetic })));
  return host;
}

function click(host: HTMLElement, label: string) {
  const button = [...host.querySelectorAll('button')].find(control => control.textContent?.includes(label));
  expect(button).toBeDefined();
  act(() => button!.click());
}

function preview(host: HTMLElement): HTMLElement {
  const records = host.querySelector<HTMLElement>('[aria-labelledby="toll-sample-records-title"]');
  expect(records, 'The selected demo must show source records outside the editable form').not.toBeNull();
  return records!;
}

describe('FASTag synthetic source records', () => {
  it('shows the selected fictional debit and source observations before starting', () => {
    const records = preview(mount(true));
    expect(records.textContent).toContain('SYNTHETIC');
    expect(records.textContent).toContain('Demo Bank');
    expect(records.textContent).toContain('₹135');
    expect(records.textContent).toContain('Sakshi Toll Plaza (fictional)');
    expect(records.textContent).toContain('4721');
    expect(records.textContent).toContain('2248');
    expect(records.textContent).toContain('8034');
    expect(records.querySelector('time')?.dateTime).toBe('2026-08-25T09:14');
    expect(records.textContent).toContain('Linked vehicle: blue hatchback. Passing image: white SUV.');
  });

  it('replaces source records when a different fixture is selected without inventing missing debit details', () => {
    const host = mount(true);
    click(host, 'Possible duplicate');
    const duplicate = preview(host);
    expect(duplicate.textContent).toContain('₹190');
    expect(duplicate.textContent).toContain('Nayi Disha Plaza (fictional)');
    expect(duplicate.textContent).not.toContain('Sakshi Toll Plaza (fictional)');
    expect(duplicate.textContent).not.toContain('white SUV');
    expect([...duplicate.querySelectorAll('time')].map(time => time.dateTime)).toEqual(['2026-08-24T18:05', '2026-08-24T18:11']);
    expect(duplicate.textContent).toContain('Second debit amount / reference');
    expect(duplicate.textContent).toContain('Not supplied in this fixture');
    click(host, 'Records align');
    const aligned = preview(host);
    expect(aligned.textContent).toContain('₹110');
    expect(aligned.textContent).toContain('Seva Setu Plaza (fictional)');
    expect(aligned.textContent).toContain('Tag, image, class, reader time, and debit agree.');
    expect(aligned.textContent).not.toContain('Second debit amount / reference');
  });

  it('keeps the original source visible before the editable records and preserves the selected fixture fields', () => {
    const host = mount(true);
    click(host, 'Possible duplicate');
    click(host, 'Start transaction check');
    const records = preview(host);
    const issuer = host.querySelector('#issuer');
    if (!(issuer instanceof HTMLSelectElement)) throw new Error('Expected an official record source selector');
    expect(issuer.value).toBe('Demo Bank');
    expect(host.querySelector<HTMLInputElement>('#tagSuffix')?.value).toBe('6190');
    expect(records.compareDocumentPosition(issuer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const amount = host.querySelector<HTMLInputElement>('#amount')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(amount, '220');
      amount.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(amount.value).toBe('220');
    expect(preview(host).textContent).toContain('₹190');
    expect(preview(host).textContent).not.toContain('₹220');
  });

  it('never displays synthetic source records in the real FASTag workflow', () => {
    const host = mount(false);
    expect(host.querySelector('[aria-labelledby="toll-sample-records-title"]')).toBeNull();
    expect(host.textContent).not.toContain('Demo Bank');
    click(host, 'Start transaction check');
    expect(host.querySelector('[aria-labelledby="toll-sample-records-title"]')).toBeNull();
    expect(host.querySelector<HTMLInputElement>('#amount')?.value).toBe('');
    expect(host.querySelector<HTMLInputElement>('#tagSuffix')?.value).toBe('');
    expect(host.textContent).not.toContain('Demo Bank');
  });
});
