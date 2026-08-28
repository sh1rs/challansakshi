import { readFileSync } from 'node:fs';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalRecordIntake, type LocalRecordSelection } from '../components/public-beta/LocalRecordIntake';
import { PublicBetaShell } from '../components/public-beta/PublicBetaShell';
import { getCitizenReviewPresentation } from '../lib/citizen-review-presentation';

const reviewSource = readFileSync(
  new URL('../components/public-beta/CitizenReviewApp.tsx', import.meta.url),
  'utf8',
);
const publicStyles = readFileSync(
  new URL('../components/public-beta/PublicBeta.module.css', import.meta.url),
  'utf8',
);
const guidedStyles = readFileSync(
  new URL('../components/guided/GuidedStepHeader.module.css', import.meta.url),
  'utf8',
);

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

function expectExplicitSixteenPixelRule(source: string, selector: string) {
  const matchingRule = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) => (
    match[1].split(',').map((item) => item.trim()).includes(selector)
  )).at(-1);
  expect(matchingRule?.[2], selector).toMatch(/font-size:\s*(?:1[6-9]|[2-9]\d)px/);
}

describe('citizen review release contracts', () => {
  it('derives confirmation and artifact readiness from the current signature', () => {
    expect(reviewSource).toMatch(/confirmedSignature/);
    expect(reviewSource).toMatch(/factsConfirmed\s*=\s*confirmedSignature\s*===\s*signature/);
    expect(reviewSource).not.toMatch(/\[factsConfirmed,\s*setFactsConfirmed\]\s*=\s*useState\(false\)/);
    expect(reviewSource).toMatch(/operationToken/);
    expect(reviewSource).toMatch(/signatureRef\.current\s*===\s*actionSignature/);
    expect(reviewSource).toMatch(
      /const changeHelperConfirmation[\s\S]*?invalidateArtifact\(\)[\s\S]*?setHelperSignature/,
    );
  });

  it('integrates the tested inactivity guard with the single clear-and-exit path', () => {
    expect(reviewSource).toMatch(/startSharedDeviceInactivityGuard/);
    expect(reviewSource).toMatch(/windowTarget:\s*window/);
    expect(reviewSource).toMatch(/documentTarget:\s*document/);
    expect(reviewSource).toMatch(/onExpire:\s*\(\)\s*=>\s*clearAndExitRef\.current\(\)/);
    expect(reviewSource).toMatch(/const clearAndExit/);
    expect(reviewSource.match(/window\.location\.replace\('\/'\)/g)).toHaveLength(1);
    expect(getCitizenReviewPresentation('en', false).sharedInactivityNotice).toBe(
      'For safety, this review clears after 10 minutes without deliberate activity.',
    );
    expect(getCitizenReviewPresentation('hi', true).sharedInactivityNotice).toBe(
      'सुरक्षा के लिए, 10 मिनट तक कोई जानबूझकर गतिविधि न होने पर यह समीक्षा साफ़ हो जाती है।',
    );
  });

  it('clears errors on stage changes and scopes them to the active stage', () => {
    expect(reviewSource).toMatch(/type ReviewError\s*=\s*\{\s*step:\s*Step;\s*message:\s*string/);
    expect(reviewSource).toMatch(/const goToStep/);
    expect(reviewSource).toMatch(/setError\(null\)/);
    expect(reviewSource).toMatch(/error\?\.step\s*===\s*step/);
    expect(reviewSource).toMatch(/const invalidate\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setError\(null\)/);
  });

  it('avoids claiming that the notice source itself was confirmed', () => {
    expect(reviewSource).toContain('Check the notice on an official service first');
    expect(reviewSource).toContain('पहले आधिकारिक सेवा पर नोटिस जाँचें');
    expect(reviewSource).not.toContain('पहले नोटिस के स्रोत की पुष्टि करें');
  });

  it('makes manual entry and a selected official record mutually exclusive', () => {
    const manualHandler = reviewSource.match(/const useManual\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/)?.[1] ?? '';
    expect(manualHandler).toMatch(/URL\.revokeObjectURL\(recordSelectionRef\.current\.previewUrl\)/);
    expect(manualHandler).toMatch(/setRecordSelection\(null\)/);
    expect(manualHandler).toMatch(/setManualEntryMode\(true\)/);
  });

  it('renders evidence as a native accessible table', () => {
    expect(reviewSource).toMatch(/buildCitizenEvidencePresentationView/);
    expect(reviewSource).toMatch(/<table\b/);
    expect(reviewSource).toMatch(/<caption\b/);
    expect(reviewSource).toMatch(/<thead\b/);
    expect(reviewSource).toMatch(/<th\s+scope="col"/);
    expect(reviewSource).toMatch(/<tbody\b/);
    expect(reviewSource).toMatch(/<td\b/);
    expect(reviewSource).not.toMatch(/role="table"/);
  });

  it('sets the public-beta root language and keeps localized Quick Exit text in the DOM', () => {
    const shellProps: ComponentProps<typeof PublicBetaShell> = {
      language: 'hi',
      setLanguage: () => undefined,
      service: 'ChallanSakshi',
      serviceHindi: 'चालान साक्षी',
      onQuickExit: () => undefined,
      children: createElement('main'),
    };
    const html = renderToStaticMarkup(createElement(PublicBetaShell, shellProps));

    expect(html).toContain('lang="hi"');
    expect(html).toContain('aria-label="चालान साक्षी होम"');
    expect(html).toContain('>तुरंत बाहर निकलें और साफ़ करें<');
    expect(getCitizenReviewPresentation('hi', false).table.sourceFallback).toBe(
      'नागरिक द्वारा दर्ज स्रोत',
    );
    expect(publicStyles).not.toMatch(/\.quickExit::(?:before|after)[^{]*\{[^}]*content\s*:/);
  });

  it('localizes the PDF preview label by record role', () => {
    const selection = {
      file: {} as File,
      meta: {
        name: 'challan.pdf',
        size: 1024,
        type: 'application/pdf',
        role: 'official-record',
        previewKind: 'pdf',
      },
      previewUrl: 'blob:local-preview',
    } satisfies LocalRecordSelection;
    const html = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: selection,
      photograph: null,
      onRecordChange: () => undefined,
      onPhotographChange: () => undefined,
      language: 'hi',
    }));

    expect(html).toContain('aria-label="आधिकारिक रिकॉर्ड PDF प्रीव्यू"');
    expect(reviewSource).toMatch(
      /aria-label=\{t\(language, `\$\{title\} PDF preview`, `\$\{title\} PDF प्रीव्यू`\)\}/,
    );
  });

  it('sets every reviewed essential 320px selector to at least 16px explicitly', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 420px)');
    const guideMobile = mediaBlock(guidedStyles, '(max-width: 420px)');
    for (const selector of [
      '.publicBar',
      '.heroCompact .lede',
      '.quickExit',
      '.simpleMode',
      '.languages button',
      '.button',
      '.buttonSecondary',
      '.buttonQuiet',
      '.actions a',
      '.choice',
      '.field input',
      '.field select',
      '.observationCard select',
      '.serviceGrid button',
      '.serviceGrid a',
      '.artifact pre',
    ]) {
      expectExplicitSixteenPixelRule(publicMobile, selector);
    }
    for (const selector of [
      '.guideTopline p',
      '.guideTopline span',
      '.primaryInstruction > span',
      '.guideDetails > div > span',
      '.guideDetails p',
      '.guideDetails strong',
    ]) {
      expectExplicitSixteenPixelRule(guideMobile, selector);
    }
    expect(publicMobile).toMatch(/\.header\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(publicStyles).toMatch(/\.quickExit[^}]*min-height:\s*48px/);
    expect(publicStyles).toMatch(/\.languages button[^}]*min-height:\s*48px/);
    expect(guidedStyles).toMatch(/\.stepList li\s*\{[^}]*color:\s*#(?:[0-9a-f]{6})/);
  });

  it('prints only the clean evidence artifact, disclaimer, timeline, and evidence table', () => {
    expect(reviewSource).toMatch(/data-print-artifact/);
    expect(reviewSource).toMatch(/data-print-evidence/);
    expect(reviewSource).toMatch(/data-print-timeline/);
    expect(publicStyles).toMatch(/@media print[\s\S]*?\.app\s*>\s*\*\s*\{[^}]*display:\s*none\s*!important/);
    expect(publicStyles).toMatch(/@media print[\s\S]*?\[data-print-artifact\][^{]*\{[^}]*display:\s*block\s*!important/);
  });

  it('routes stage presentation through keyed standard and simple copy', () => {
    expect(reviewSource).toMatch(/getCitizenReviewPresentation\(language,\s*simpleMode\)/);
    expect(reviewSource).toMatch(/presentation\.stages\.safety/);
    expect(reviewSource).toMatch(/presentation\.stages\.source/);
    expect(reviewSource).toMatch(/presentation\.stages\.observations/);
    expect(reviewSource).toMatch(/presentation\.stages\.result/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.established/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.unclear/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.missing/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.evidence/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.officialRoute/);
    expect(reviewSource).toMatch(/simpleTitle:/);
    expect(reviewSource).toMatch(/simpleMode\s*\?\s*copy\.simpleTitle/);
    expect(reviewSource).toMatch(/presentation\.resultLimitation/);
    expect(getCitizenReviewPresentation('en', true).resultLimitation).toBe(
      'This result uses only answers you checked. ChallanSakshi did not verify the records or decide the case.',
    );
    expect(getCitizenReviewPresentation('hi', true).resultLimitation).toBe(
      'यह नतीजा केवल आपके जाँचे उत्तर उपयोग करता है। ChallanSakshi ने रिकॉर्ड सत्यापित या केस तय नहीं किया।',
    );
    expect(getCitizenReviewPresentation('en', false).resultLimitation).toContain(
      'confirmed structured answers',
    );
  });

  it('keeps essential privacy and safety reading copy readable and tappable at 320px', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 420px)');

    expectExplicitSixteenPixelRule(publicMobile, '.infoSection p');
    expectExplicitSixteenPixelRule(publicMobile, '.infoSection li');
    expect(publicMobile).toMatch(
      /\.infoSection a\s*\{[^}]*display:\s*inline-flex[^}]*min-height:\s*48px/,
    );
  });
});
