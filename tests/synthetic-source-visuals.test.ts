// @vitest-environment jsdom
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TestCaseWorkbench, SyntheticJudgeProofView } from '../components/test-lab/SyntheticTestLabApp';
import { syntheticEvaluationCases } from '../lib/synthetic-evidence-corpus';
import { createSyntheticJudgeProofState, reduceSyntheticJudgeProofState } from '../lib/synthetic-lab-state';

function parse(html: string) { return new DOMParser().parseFromString(html, 'text/html'); }

describe('visible synthetic sources', () => {
  it.each(syntheticEvaluationCases)('$id keeps original documents and scene visible above editable observations', testCase => {
    const doc = parse(renderToStaticMarkup(createElement(TestCaseWorkbench, { testCase })));
    const bundle = doc.querySelector('[data-synthetic-source-bundle]');
    expect(bundle).not.toBeNull();
    expect(bundle?.textContent).toContain('Fictional challan');
    expect(bundle?.textContent).toContain(testCase.extraction.challan_document.challan_number.value);
    expect(bundle?.textContent).toContain('Fictional vehicle record');
    expect(bundle?.querySelector('img')?.getAttribute('src')).not.toBe('/demo-vehicle-scenes.png');
    expect(bundle?.textContent).toContain('not a live AI reading');
  });

  it('shows a car, not a motorcycle, for the four-wheeler conflict', () => {
    const doc = parse(renderToStaticMarkup(createElement(TestCaseWorkbench, { testCase: syntheticEvaluationCases[3] })));
    expect(doc.querySelector('[data-synthetic-source-bundle] img')?.getAttribute('alt')).toContain('white hatchback');
  });

  it('keeps the normalization case internally coherent as a grey car', () => {
    expect(syntheticEvaluationCases[8].extraction.vehicle_record.make_model.value).toBe('Maruti Swift');
    expect(syntheticEvaluationCases[8].extraction.enforcement_image.make_model.value).toBe('maruti swift');
  });

  it('shows both matching scene types in the initial proof pair', () => {
    const started = reduceSyntheticJudgeProofState(createSyntheticJudgeProofState(syntheticEvaluationCases[3]), { type: 'START_90_SECOND_PROOF' });
    const doc = parse(renderToStaticMarkup(createElement(SyntheticJudgeProofView, { state: started, dispatch: () => {} })));
    expect(doc.querySelectorAll('[data-synthetic-photo]')).toHaveLength(2);
    expect(doc.querySelectorAll('[data-synthetic-photo]')[1]?.getAttribute('aria-label')).toContain('white hatchback');
  });

  it.each([
    [0, 'blue-clear-3317', 'KA01AB3317'],
    [1, 'blue-clear-3817', 'KA01AB3817'],
    [2, 'blue-clear-3317', 'KA01AB3317'],
    [3, 'white-car-3317', 'KA01AB3317'],
    [4, 'blue-unreadable', 'unreadable'],
    [5, 'blue-partial-3317', '3317'],
    [6, 'blue-clear-3317', 'KA01AB3317'],
    [7, 'blue-clear-3317', 'KA01AB3317'],
    [8, 'grey-car-3317', 'KA01AB3317'],
    [9, 'white-scooter-3317', 'KA01AB3317'],
  ] as const)('case %i selects the raster with its actual plate and visibility', (index, scene, plate) => {
    const doc = parse(renderToStaticMarkup(createElement(TestCaseWorkbench, { testCase: syntheticEvaluationCases[index] })));
    const photo = doc.querySelector('[data-synthetic-source-bundle] [data-synthetic-photo]');
    expect(photo?.getAttribute('data-scene-id')).toBe(scene);
    expect(photo?.getAttribute('data-image-registration')).toBe(plate);
    const source = photo?.querySelector('img')?.getAttribute('src');
    expect(source).toBe(`/demo-plates/${scene}-v2.webp`);
    // A case loads its one original image, not the entire multi-megabyte atlas.
    const image = readFileSync(`${process.cwd()}/public${source}`);
    expect(image.subarray(8, 12).toString()).toBe('WEBP');
    expect(image.byteLength).toBeLessThan(650_000);
    expect(photo?.querySelector('img')?.getAttribute('alt')).toContain(plate === 'unreadable' ? 'unreadable' : plate);
    if (index === 5) expect(photo?.className).not.toContain('uncertain');
  });

  it('keeps original photo pixels and titles unchanged after the proof edits its observations', () => {
    const started = reduceSyntheticJudgeProofState(createSyntheticJudgeProofState(syntheticEvaluationCases[3]), { type: 'START_90_SECOND_PROOF' });
    const compared = reduceSyntheticJudgeProofState(started, { type: 'CONFIRM_AND_COMPARE', resultRevisionId: '11111111111111111111111111111111' });
    const packed = reduceSyntheticJudgeProofState(compared, { type: 'CONFIRM_SYNTHETIC_PACK', packRevisionId: '22222222222222222222222222222222', generatedAt: '2026-09-05T10:00:00.000Z' });
    const opened = reduceSyntheticJudgeProofState(packed, { type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' });
    const recorded = reduceSyntheticJudgeProofState(opened, { type: 'RECORD_SYNTHETIC_RETURN' });
    const corrected = reduceSyntheticJudgeProofState(recorded, { type: 'CORRECT_IMAGE_OBSERVATIONS' });
    const before = parse(renderToStaticMarkup(createElement(SyntheticJudgeProofView, { state: started, dispatch: () => {} })));
    const after = parse(renderToStaticMarkup(createElement(SyntheticJudgeProofView, { state: corrected, dispatch: () => {} })));
    expect(corrected.draft.enforcement_image.colour.value).toBe('Blue');
    expect(after.querySelectorAll('[data-synthetic-photo]')[1]?.outerHTML).toBe(before.querySelectorAll('[data-synthetic-photo]')[1]?.outerHTML);
    expect(after.querySelectorAll('[data-synthetic-photo]')[1]?.parentElement?.textContent).toContain('White Maruti Swift');
    expect(after.body.textContent).toContain('original synthetic photos stay unchanged');
  });
});
