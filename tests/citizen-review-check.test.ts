// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitizenReviewCheck } from '../components/public-beta/CitizenReviewCheck';
import { changeCitizenReviewAnswer, createCitizenReviewState, getCitizenReviewAnswers, type CitizenReviewState } from '../lib/citizen-review-state';
import { deriveCitizenReviewQuestionPlan } from '../lib/citizen-review-question-plan';

const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => { for (const root of roots.splice(0)) act(() => root.unmount()); document.body.replaceChildren(); });
function mount(state = createCitizenReviewState(), overrides: Partial<Parameters<typeof CitizenReviewCheck>[0]> = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host); roots.push(root);
  const render = (next: CitizenReviewState, extra: Partial<Parameters<typeof CitizenReviewCheck>[0]> = {}) => act(() => root.render(createElement(CitizenReviewCheck, {
    language: 'en', state: next, plan: deriveCitizenReviewQuestionPlan({ answers: getCitizenReviewAnswers(next), answeredQuestionIds: next.answeredQuestionIds, hasSelectedPhotograph: next.photograph.present }), onAnswer: () => undefined, expandedQuestion: null, onExpand: () => undefined, ...overrides, ...extra,
  })));
  render(state); return { host, render };
}
describe('adaptive native review questions', () => {
  it('starts with one labelled source fieldset, three native radios, and no checked defaults', () => {
    const { host } = mount();
    expect(host.querySelectorAll('fieldset')).toHaveLength(1);
    expect(host.querySelector('#review-question-source legend')?.textContent).toBe('Where did you open this challan?');
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    expect(host.querySelectorAll('input:checked')).toHaveLength(0);
    expect([...host.querySelectorAll('input')].map(input => input.value)).toEqual(['official-service', 'downloaded-official-record', 'message-only']);
  });
  it('keeps the selected radio mounted and focused while compressing earlier answers', () => {
    const onAnswer = vi.fn(); const onExpand = vi.fn();
    const { host, render } = mount(createCitizenReviewState(), { onAnswer, onExpand });
    const selected = host.querySelector<HTMLInputElement>('#review-source-official-service')!;
    selected.focus(); act(() => selected.click());
    expect(onAnswer).toHaveBeenCalledWith('source', 'official-service');
    const state = changeCitizenReviewAnswer(createCitizenReviewState(), 'source', 'official-service');
    render(state);
    expect(host.querySelector('#review-source-official-service')).toBe(selected);
    expect(document.activeElement).toBe(selected);
    expect(selected.checked).toBe(true);
    const prior = host.querySelector('#review-question-source')!;
    expect([...prior.querySelectorAll<HTMLInputElement>('input:not(:checked)')].every(input => input.disabled && input.closest('label')?.hidden)).toBe(true);
    const change = prior.querySelector<HTMLButtonElement>('button')!;
    act(() => change.click()); expect(onExpand).toHaveBeenCalledWith('source');
    render(state, { expandedQuestion: 'source' });
    expect([...prior.querySelectorAll<HTMLInputElement>('input')].every(input => !input.disabled && !input.closest('label')?.hidden)).toBe(true);
    expect(host.querySelector('#review-question-own-record legend')?.textContent).toBe("Can you read your vehicle's RC or another independent vehicle record now?");
  });
  it('renders the plate access choice as one radio group and retains unavailable as its selected answer', () => {
    let state = changeCitizenReviewAnswer(createCitizenReviewState(), 'source', 'official-service');
    state = changeCitizenReviewAnswer(state, 'own-record', 'present');
    const { host, render } = mount(state);
    expect(host.querySelector('#review-question-plate legend')?.textContent).toBe('Compared with that record, what does the plate in the photo shown by the service or record you opened look like?');
    expect([...host.querySelectorAll<HTMLInputElement>('#review-question-plate input')].map(input => input.value)).toEqual(['different', 'match', 'not-visible', 'unavailable']);
    state = changeCitizenReviewAnswer(state, 'plate', 'unavailable'); render(state);
    expect(host.querySelector<HTMLInputElement>('#review-plate-unavailable')?.checked).toBe(true);
    expect(host.querySelector('#review-question-vehicle-category')).toBeNull();
  });
  it('renders Hindi labels and linked validation without changing radio values', () => {
    const { host } = mount(createCitizenReviewState(), { language: 'hi', errorQuestion: 'source', children: createElement('button', null, 'आगे बढ़ें') });
    expect(host.textContent).toContain('आपने यह चालान कहाँ खोला?');
    expect(host.textContent).toContain('मैंने आधिकारिक सेवा खोली');
    expect(host.textContent).not.toContain('Where did');
    expect(host.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe('review-question-source-error');
    expect(host.querySelector('#review-question-source-error')?.textContent).toContain('उत्तर');
    expect(host.lastElementChild?.textContent).toBe('आगे बढ़ें');
  });
});
