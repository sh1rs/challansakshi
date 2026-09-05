import { readFileSync } from 'node:fs';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CitizenReviewApp from '../components/public-beta/CitizenReviewApp';
import { CitizenReviewCheck } from '../components/public-beta/CitizenReviewCheck';
import { LocalRecordIntake, type LocalRecordSelection } from '../components/public-beta/LocalRecordIntake';
import { PublicBetaShell } from '../components/public-beta/PublicBetaShell';
import { deriveCitizenReviewQuestionPlan } from '../lib/citizen-review-question-plan';
import { changeCitizenReviewAnswer, confirmCitizenReviewState, createCitizenReviewState, getCitizenReviewAnswers } from '../lib/citizen-review-state';
import { getCitizenReviewPresentation } from '../lib/citizen-review-presentation';

const reviewSource = readFileSync(new URL('../components/public-beta/CitizenReviewApp.tsx', import.meta.url), 'utf8');
const handoffControllerSource = readFileSync(new URL('../lib/citizen-review-handoff-controller.ts', import.meta.url), 'utf8');
const securityConfig = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');

describe('adaptive citizen review contracts', () => {
  it('starts at Check with no inferred role, device choice, or fact confirmation', () => {
    const state = createCitizenReviewState();
    expect(state).toMatchObject({ phase: 'check', role: 'unselected', confirmedFactsSignature: '', helperConfirmedSignature: '' });
    expect(reviewSource).toMatch(/useState<Device>\('unknown'\)/);
    expect(reviewSource).not.toContain('I understand this is manual self-review');
  });

  it('renders an accessible native-radio Check question without a preselected answer', () => {
    const state = createCitizenReviewState();
    const plan = deriveCitizenReviewQuestionPlan({ answers: getCitizenReviewAnswers(state), answeredQuestionIds: state.answeredQuestionIds, hasSelectedPhotograph: false });
    const html = renderToStaticMarkup(createElement(CitizenReviewCheck, {
      language: 'en', state, plan, onAnswer: () => undefined, expandedQuestion: 'source', onExpand: () => undefined,
    }));
    expect(html).toContain('<fieldset');
    expect(html).toContain('<legend');
    expect(html).toContain('Where did you open this challan?');
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).not.toContain('checked=""');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it('keeps failed validation in Check without selecting a role', () => {
    const state = createCitizenReviewState();
    const result = confirmCitizenReviewState(state, 'self');
    expect(result.missing).toEqual(['source']);
    expect(result.state).toBe(state);
    expect(result.state).toMatchObject({ phase: 'check', role: 'unselected', confirmedFactsSignature: '' });
  });

  it('turns message-only into a conservative Resolve safe stop without selecting a role', () => {
    const selected = changeCitizenReviewAnswer(createCitizenReviewState(), 'source', 'message-only');
    const result = confirmCitizenReviewState(selected, 'self');
    expect(result.missing).toEqual([]);
    expect(result.state).toMatchObject({ phase: 'resolve', role: 'unselected', confirmedFactsSignature: '', helperConfirmedSignature: '' });
  });

  it('renders initial Check with one footer boundary and no upfront consent', () => {
    const html = renderToStaticMarkup(createElement(CitizenReviewApp));
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
    expect(html).toContain('1 of 2 · Check');
    expect(html).toContain('Check your challan</h1>');
    expect(html).toContain('Where did you open this challan?');
    expect(html).not.toContain('I understand this is manual self-review');
    expect(footer).toContain('Independent—not a government service.');
    expect(footer).toContain('Documents are read on this device');
    expect(footer).toContain('Nothing is filed, paid or submitted for you.');
    expect(footer).toContain('No legal advice or guaranteed outcome.');
    expect(footer.match(/<p\b/g)).toHaveLength(1);
    expect(html.match(/data-product-boundary=/g)).toHaveLength(1);
    expect(footer.match(/href="\/safety"/g)).toHaveLength(1);
  });

  it('keeps Quick Exit localized in the dedicated shell slot', () => {
    const props: ComponentProps<typeof PublicBetaShell> = {
      language: 'hi', setLanguage: () => undefined, service: 'ChallanSakshi', serviceHindi: 'चालान साक्षी',
      onQuickExit: () => undefined, children: createElement('main'),
    };
    const html = renderToStaticMarkup(createElement(PublicBetaShell, props));
    expect(html).toContain('lang="hi"');
    expect(html).toContain('aria-label="तुरंत बाहर निकलें और यह समीक्षा साफ़ करें"');
    expect(html).toContain('>बाहर<');
  });

  it('integrates inactivity expiry with the single clear-and-exit path', () => {
    expect(reviewSource).toMatch(/startSharedDeviceInactivityGuard/);
    expect(reviewSource).toMatch(/windowTarget:\s*window/);
    expect(reviewSource).toMatch(/documentTarget:\s*document/);
    expect(reviewSource).toMatch(/onExpire:\s*\(\)\s*=>\s*clearAndExitRef\.current\(\)/);
    expect(reviewSource.match(/window\.location\.replace\('\/'\)/g)).toHaveLength(1);
    expect(getCitizenReviewPresentation('en', false).sharedInactivityNotice).toContain('clears after 10 minutes');
  });

  it('keeps the adapter free of network, storage, and credential authority', () => {
    expect(reviewSource).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
    expect(reviewSource).not.toMatch(/window\.open\s*\(/);
  });

  it('uses registry routes and keeps the controller browser-free', () => {
    expect(reviewSource).toMatch(/resolveCurrentOfficialAuxiliaryRoute/);
    expect(reviewSource).toMatch(/ALL_ISSUING_JURISDICTION_CODES/);
    expect(reviewSource).toMatch(/new Uint8Array\(16\)/);
    expect(reviewSource).toMatch(/crypto\.getRandomValues/);
    expect(handoffControllerSource).toMatch(/resolveOfficialDestination/);
    expect(handoffControllerSource).toMatch(/resolveCurrentOfficialAuxiliaryRoute/);
    expect(handoffControllerSource).not.toMatch(/navigator\.|window\.|document\.|URL\.createObjectURL/);
  });

  it('isolates external official and local-preview links from the opener', () => {
    expect(reviewSource).toMatch(/data-official-lookup[^>]*href=\{lookup\.canonicalUrl\}[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(reviewSource).toMatch(/href=\{selection\.previewUrl\} target="_blank" rel="noopener noreferrer"/);
  });

  it('opens a selected PDF locally under the object-src none policy', () => {
    const selection = {
      meta: { size: 1024, type: 'application/pdf', role: 'official-record', previewKind: 'pdf' }, previewUrl: 'blob:local-preview',
    } satisfies LocalRecordSelection;
    const html = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: selection, photograph: null, onRecordChange: () => undefined, onPhotographChange: () => undefined, language: 'hi',
    }));
    expect(securityConfig).toContain('"object-src \'none\'"');
    expect(html).toContain('href="blob:local-preview"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<object');
  });

  it('keeps intake copy local and free of upload claims', () => {
    const html = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: null, photograph: null, onRecordChange: () => undefined, onPhotographChange: () => undefined, language: 'en',
    }));
    expect(html).toContain('Choose challan copy');
    expect(html).toContain('Choose photo from the challan');
    expect(html).not.toMatch(/upload|submitted|authenticated/i);
  });

  it('keeps shared-device output suppressed and device choice explicit', () => {
    expect(reviewSource).toContain('data-device-context={device}');
    expect(reviewSource).toContain('data-shared-print-warning');
    expect(reviewSource).toContain('Copy, download and formatted print are off on shared devices.');
    expect(reviewSource).toMatch(/useState<Device>\('unknown'\)/);
    expect(reviewSource).toContain('Is this your own/private device or a shared device?');
  });

  it('uses only Check and Resolve presentation keys', () => {
    const presentation = getCitizenReviewPresentation('en', false);
    expect(Object.keys(presentation.stages)).toEqual(['check', 'resolve']);
    expect(presentation.stages.check.heading).toBe('Check your challan');
    expect(presentation.stages.resolve.heading).toBe('Your next step');
  });
});
