import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SyntheticTestLabApp, * as TestLabModule from '../components/test-lab/SyntheticTestLabApp';
import { syntheticEvaluationCases } from '../lib/synthetic-evidence-corpus';
import * as SyntheticLabState from '../lib/synthetic-lab-state';

const componentSource = readFileSync(
  new URL('../components/test-lab/SyntheticTestLabApp.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(
  new URL('../components/test-lab/SyntheticTestLabApp.module.css', import.meta.url),
  'utf8',
);
const demoSource = readFileSync(
  new URL('../components/ChallanSakshiApp.tsx', import.meta.url),
  'utf8',
);
const expectedOutcomeLabels = {
  'potential-evidence-discrepancy': 'Potential discrepancy',
  'appears-consistent': 'Appears consistent',
  inconclusive: 'Inconclusive',
} as const;

function mediaBlock(source: string, query: string) {
  const marker = `@media ${query}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return '';
  const openIndex = source.indexOf('{', markerIndex);
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  return '';
}

function ruleFor(source: string, selector: string) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').map((item) => item.trim()).includes(selector))
    .at(-1)?.[2] ?? '';
}

function caseButton(html: string, caseId: string) {
  const escapedId = caseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<button\\b[^>]*data-test-case="${escapedId}"[^>]*>[\\s\\S]*?<\\/button>`))?.[0] ?? '';
}

function judgeEntry(html: string) {
  return html.match(/<section\b[^>]*data-challansakshi-judge-entry="v1"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';
}

type SelectionState = {
  filter: 'all' | 'potential-evidence-discrepancy' | 'appears-consistent' | 'inconclusive';
  selectedId: string;
  selectionRequest: number;
  focusTargetId: string | null;
  announcement: string;
};

type SelectionTransition = (
  state: SelectionState,
  action:
    | { type: 'filter'; filter: SelectionState['filter'] }
    | { type: 'case'; caseId: string }
    | { type: 'start-proof' },
) => SelectionState;

function selectionTransition() {
  return Reflect.get(TestLabModule, 'transitionTestLabSelection') as SelectionTransition | undefined;
}

function proofApis() {
  const create = Reflect.get(SyntheticLabState, 'createSyntheticJudgeProofState') as undefined | ((testCase: (typeof syntheticEvaluationCases)[number]) => unknown);
  const reduce = Reflect.get(SyntheticLabState, 'reduceSyntheticJudgeProofState') as undefined | ((state: unknown, action: Record<string, unknown>) => unknown);
  const View = Reflect.get(TestLabModule, 'SyntheticJudgeProofView') as undefined | ComponentType<{
    state: unknown;
    dispatch: (action: unknown) => void;
  }>;
  expect(create).toBeTypeOf('function');
  expect(reduce).toBeTypeOf('function');
  expect(View).toBeTypeOf('function');
  if (!create || !reduce || !View) throw new Error('Missing synthetic proof API.');
  return { create, reduce, View };
}

function proofStates() {
  const { create, reduce, View } = proofApis();
  const flagship = syntheticEvaluationCases.find((item) => item.id === 'case-04-category-conflict');
  expect(flagship).toBeDefined();
  if (!flagship) throw new Error('Missing flagship case.');
  const started = reduce(create(flagship), { type: 'START_90_SECOND_PROOF' });
  const compared = reduce(started, {
    type: 'CONFIRM_AND_COMPARE',
    resultRevisionId: '11111111111111111111111111111111',
  });
  const packed = reduce(compared, {
    type: 'CONFIRM_SYNTHETIC_PACK',
    packRevisionId: '22222222222222222222222222222222',
    generatedAt: '2026-09-03T10:30:00.000Z',
  });
  const opened = reduce(packed, { type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' });
  const returned = reduce(opened, { type: 'RECORD_SYNTHETIC_RETURN' });
  const corrected = reduce(returned, { type: 'CORRECT_IMAGE_OBSERVATIONS' });
  const complete = reduce(corrected, {
    type: 'CONFIRM_AND_COMPARE',
    resultRevisionId: '33333333333333333333333333333333',
  });
  const guardrails = reduce(complete, { type: 'SHOW_GUARDRAILS' });
  const extension = reduce(guardrails, { type: 'OPEN_EXTENSION_SIMULATION' });
  return { View, started, compared, packed, opened, returned, corrected, complete, guardrails, extension };
}

function renderProof(View: ComponentType<{ state: unknown; dispatch: (action: unknown) => void }>, state: unknown) {
  return renderToStaticMarkup(createElement(View, { state, dispatch: () => undefined }));
}

describe('synthetic Test Lab product contract', () => {
  it('opens on one compact citizen problem pair boundary and primary 90-second action', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));
    const entry = judgeEntry(html);

    expect(entry).not.toBe('');
    expect(entry).toContain('Does this fictional image show the same vehicle as the record?');
    expect(entry).toContain('Synthetic demonstration data');
    expect(entry).toContain('Blue Honda Activa 6G · Two-wheeler');
    expect(entry).toContain('White Maruti Swift · Four-wheeler');
    expect(entry).toContain('AI extracts');
    expect(entry).toContain('Rules compare');
    expect(entry).toContain('Citizen controls');
    expect(entry.match(/<button\b/g)).toHaveLength(1);
    expect(entry.match(/primaryButton/g)).toHaveLength(1);
    expect(entry).toContain('>Start the 90-second proof</button>');
    expect(entry).not.toMatch(/10 fictional cases|Run all 10 cases|Open flagship walkthrough/);

    const suiteIndex = html.indexOf('id="suite-heading"');
    expect(suiteIndex).toBeGreaterThan(html.indexOf('data-challansakshi-judge-entry="v1"'));
    expect(html.indexOf('Run all 10 cases')).toBeGreaterThan(suiteIndex);
    expect(html.indexOf('10 fictional cases')).toBeGreaterThan(suiteIndex);
  });

  it('renders ten fully clickable fictional cases inside the shared demo boundary', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(html).toContain('data-product-mode="demo"');
    expect(html).toContain('Synthetic Evidence Test Lab');
    expect(html).toContain('10 fictional cases');
    expect(html.match(/data-test-case=/g)).toHaveLength(10);
    expect(html).toContain('Run all 10 cases');
    expect(html).toContain('English-only safety beta');
    expect(html).toContain('Nothing is filed, paid, authenticated, or sent to a government system');
    expect(html).toMatch(/<p class="[^"]*selectionStatus[^"]*" role="status" aria-live="polite">/);
  });

  it('keeps long descriptions out of unselected case cards and reveals the selected description in the workbench', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));
    const selectedId = 'case-02-registration-conflict';

    for (const testCase of syntheticEvaluationCases) {
      const card = caseButton(html, testCase.id);
      expect(card, testCase.id).not.toBe('');
      expect(card, testCase.id).toContain(testCase.title);
      expect(card, testCase.id).toContain(`Expected: ${expectedOutcomeLabels[testCase.expectedOverall]}`);
      if (testCase.id !== selectedId) expect(card, testCase.id).not.toContain(testCase.description);
    }

    const selected = syntheticEvaluationCases.find((testCase) => testCase.id === selectedId);
    expect(selected).toBeDefined();
    expect(html).toContain(selected?.description);
  });

  it('announces an excluding filter and auto-selected case without requesting workbench focus', () => {
    const transition = selectionTransition();

    expect(transition).toBeTypeOf('function');
    if (!transition) return;

    expect(transition({
      filter: 'all',
      selectedId: 'case-02-registration-conflict',
      selectionRequest: 4,
      focusTargetId: null,
      announcement: '',
    }, { type: 'filter', filter: 'inconclusive' })).toEqual({
      filter: 'inconclusive',
      selectedId: 'case-05-unclear-evidence',
      selectionRequest: 4,
      focusTargetId: null,
      announcement: 'Inconclusive filter applied. 3 matching cases. Selected TL-05: Plate and alleged offence are unclear.',
    });
  });

  it('requests workbench focus only for direct case-card activation', () => {
    const transition = selectionTransition();

    expect(transition).toBeTypeOf('function');
    if (!transition) return;

    expect(transition({
      filter: 'all',
      selectedId: 'case-02-registration-conflict',
      selectionRequest: 4,
      focusTargetId: null,
      announcement: 'Previous announcement',
    }, { type: 'case', caseId: 'case-01-all-align' })).toEqual({
      filter: 'all',
      selectedId: 'case-01-all-align',
      selectionRequest: 5,
      focusTargetId: 'case-01-all-align',
      announcement: '',
    });
  });

  it('selects case 04 for proof start without duplicating the proof live announcement', () => {
    const transition = selectionTransition();

    expect(transition).toBeTypeOf('function');
    if (!transition) return;

    expect(transition({
      filter: 'inconclusive',
      selectedId: 'case-05-unclear-evidence',
      selectionRequest: 4,
      focusTargetId: 'case-05-unclear-evidence',
      announcement: 'Previous selection announcement',
    }, { type: 'start-proof' })).toEqual({
      filter: 'all',
      selectedId: 'case-04-category-conflict',
      selectionRequest: 5,
      focusTargetId: null,
      announcement: '',
    });
  });

  it('makes the Evidence → Explain → Verify → Act sequence explicit without a tall guided header', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    for (const phase of ['Evidence', 'Explain', 'Verify', 'Act']) expect(html).toContain(`>${phase}<`);
    expect(html).toContain('Review every source value before comparison');
    expect(html).not.toContain('STEP 1 OF 6');
  });

  it('does not reveal a selected-case engine finding before the human confirmation gate', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(componentSource).not.toContain('compareSyntheticEvidence(testCase.extraction)');
    expect(html).toContain('Human confirmation required');
    expect(html).not.toMatch(/Engine\s*<b>Potential discrepancy<\/b>/);
  });

  it('renders every record fact that can enter the action pack before confirmation', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    for (const field of ['challan_number', 'issue_date', 'alleged_offence', 'amount']) {
      expect(html).toContain(`data-record-detail="${field}"`);
    }
    expect(html).toContain('Record facts used in the action pack');
    expect(html).toContain('four record facts, six comparison groups');
  });

  it('keeps the public custom-image path browser-local and never calls the analysis endpoint', () => {
    expect(componentSource).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|\/api\/analyze/);
    expect(componentSource).toContain('URL.createObjectURL');
    expect(componentSource).toContain('URL.revokeObjectURL');

    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));
    expect(html).toContain('not uploaded, stored, or sent to AI');
    expect(html).toContain('Public live uploads remain off');
  });

  it('does not claim that a custom user-selected image has verified synthetic provenance', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(html).toContain('ChallanSakshi cannot verify its provenance');
    expect(html).toContain('The selected image is not transmitted by this lab');
    expect(html).not.toContain('Nothing leaves this browser tab');
    expect(html).not.toContain('Synthetic preview ready');
  });

  it('links the flagship walkthrough to the separate test lab', () => {
    expect(demoSource).toMatch(/href="\/demo\/test-lab"/);
    expect(renderToStaticMarkup(createElement(SyntheticTestLabApp))).toContain('Start the 90-second proof');
    expect(demoSource).toContain('Start the 90-second proof');
  });

  it('renders the exact six-beat proof progressively with one persistent proof live region', () => {
    const states = proofStates();
    const stages = [
      states.started,
      states.compared,
      states.packed,
      states.opened,
      states.returned,
      states.corrected,
      states.complete,
    ];
    const combined = stages.map((state) => renderProof(states.View, state)).join('\n');

    for (const contract of [
      ['challansakshi-proof-case-heading', '1. Review the synthetic pair'],
      ['challansakshi-proof-evidence-heading', '2. Confirm the source-linked observations'],
      ['challansakshi-proof-finding-heading', '3. See the bounded finding'],
      ['challansakshi-proof-handoff-heading', '4. Try the web handoff'],
      ['challansakshi-proof-return-heading', 'Official handoff simulation'],
      ['challansakshi-proof-correction-heading', '5. Correct and recompute'],
      ['challansakshi-proof-reconfirm-heading', 'Reconfirm the corrected observations'],
      ['challansakshi-proof-boundary-heading', '6. AI extracts. Rules compare. You control the handoff.'],
    ] as const) {
      expect(combined).toContain(`id="${contract[0]}"`);
      expect(combined).toContain(contract[1]);
    }

    for (const state of stages) {
      const html = renderProof(states.View, state);
      expect(html.match(/data-challansakshi-proof-status=/g)).toHaveLength(1);
      expect(html.match(/aria-live="polite"/g)).toHaveLength(1);
    }
    expect(combined).toContain('Pre-authored bundled synthetic observations · no model call in this proof.');
    expect(combined).toContain('Bundled fictional vehicle-record observation; not independent or official verification.');
    expect(combined).toContain('Bundled fictional image observation; no live model or government request ran in this proof.');
    expect(combined).toContain('Synthetic demonstration data');
    expect(combined).toContain('Web handoff · works everywhere');
    expect(combined).toContain('Synthetic citizen-recorded example');
    expect(combined).toContain('No government request is made');
  });

  it('keeps guardrails ordered and the fictional extension simulation skippable after the timed core', () => {
    const states = proofStates();
    const before = renderProof(states.View, states.complete);
    const guardrails = renderProof(states.View, states.guardrails);
    const extension = renderProof(states.View, states.extension);

    expect(before).toContain('Show guardrails');
    expect(before).not.toContain('Open optional synthetic extension simulation');
    expect(before).not.toContain('id="challansakshi-proof-extension-heading"');
    expect(guardrails).toContain('id="challansakshi-proof-guardrails-heading"');
    expect(guardrails).toContain('Guardrails: abstain when the evidence does not support action');
    expect(guardrails.indexOf('TL-05')).toBeLessThan(guardrails.indexOf('TL-01'));
    expect(guardrails).toContain('Open optional synthetic extension simulation');
    expect(extension).toContain('id="challansakshi-proof-extension-heading"');
    expect(extension).toContain('Synthetic extension simulation');
    expect(extension).toContain('/demo/extension-fixture/source');
    expect(extension).toContain('/demo/extension-fixture/destination');
    expect(extension).toContain('Real official adapters remain disabled until verified and approved.');
  });

  it('provides visible focus indication for every programmatically focused proof heading', () => {
    expect(styles).toMatch(/\.proofLane\s+\[tabindex=['"]-1['"]\]:focus\s*\{/);
    expect(styles).toMatch(/outline:\s*3px solid/);
    expect(styles).toMatch(/outline-offset:\s*5px/);
  });

  it('keeps the judge entry vertically isolated and fluid at 390px 320px and zoom-equivalent widths', () => {
    expect(ruleFor(styles, '.judgeEntry')).toMatch(/min-height:\s*calc\(100svh\s*-\s*\d+px\)/);
    expect(ruleFor(styles, '.judgeEntry')).toMatch(/align-content:\s*center/);
    expect(ruleFor(styles, '.judgePair strong')).toMatch(/overflow-wrap:\s*anywhere/);

    const mobile = mediaBlock(styles, '(max-width: 560px)');
    expect(ruleFor(mobile, '.judgePair')).toMatch(/grid-template-columns:\s*1fr/);
    expect(ruleFor(mobile, '.judgeEntry .primaryButton')).toMatch(/min-height:\s*48px/);
    expect(ruleFor(mobile, '.judgeEntry .primaryButton')).toMatch(/font-size:\s*16px/);

    const narrow = mediaBlock(styles, '(max-width: 390px)');
    expect(ruleFor(narrow, '.judgeEntry')).toMatch(/padding-inline:\s*0/);
    const narrowest = mediaBlock(styles, '(max-width: 320px)');
    expect(ruleFor(narrowest, '.judgeEntry')).toMatch(/min-width:\s*0/);
  });

  it('keeps lab controls at 48px and essential copy at 16px on narrow screens', () => {
    const mobile = mediaBlock(styles, '(max-width: 560px)');

    for (const selector of [
      '.primaryButton',
      '.secondaryButton',
      '.filterButton',
      '.caseButton',
      '.confirmButton',
      '.localChoose',
      '.fieldInput',
      '.fieldSelect',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/min-height:\s*48px/);
    }

    for (const selector of [
      '.heroLead',
      '.caseButton',
      '.caseButton > span',
      '.liveRegion',
      '.workbench p',
      '.fieldInput',
      '.fieldSelect',
      '.privacyNote',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/font-size:\s*16px/);
    }
  });

  it('uses text as well as colour for every result state and disables motion when requested', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(html).toContain('Potential discrepancy');
    expect(html).toContain('Appears consistent');
    expect(html).toContain('Inconclusive');
    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(componentSource).toContain('Actual:');
    expect(componentSource).toContain('Expected:');
    expect(componentSource).toContain("result.passed ? 'PASS' : 'FAIL'");
  });
});
