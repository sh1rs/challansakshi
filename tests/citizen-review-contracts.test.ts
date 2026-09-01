import { readFileSync } from 'node:fs';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalRecordIntake, type LocalRecordSelection } from '../components/public-beta/LocalRecordIntake';
import { PublicBetaShell, SafetyBoundary } from '../components/public-beta/PublicBetaShell';
import { getCitizenReviewPresentation } from '../lib/citizen-review-presentation';

const reviewSource = readFileSync(
  new URL('../components/public-beta/CitizenReviewApp.tsx', import.meta.url),
  'utf8',
);
const presentationSource = readFileSync(
  new URL('../lib/citizen-review-presentation.ts', import.meta.url),
  'utf8',
);
const publicStyles = readFileSync(
  new URL('../components/public-beta/PublicBeta.module.css', import.meta.url),
  'utf8',
);
const chromeStyles = readFileSync(
  new URL('../components/shared/CitizenChrome.module.css', import.meta.url),
  'utf8',
);
const guidedStyles = readFileSync(
  new URL('../components/guided/GuidedStepHeader.module.css', import.meta.url),
  'utf8',
);
const securityConfig = readFileSync(
  new URL('../next.config.ts', import.meta.url),
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

  it('lets a message-only source reach the promised safe stop without evidence intake', () => {
    const sourceHandler = reviewSource.match(
      /const continueSource\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/,
    )?.[1] ?? '';
    const safeStopIndex = sourceHandler.indexOf("answers.sourceStatus === 'message-only'");
    const evidenceGateIndex = sourceHandler.indexOf('!recordSelection && !manualEntryMode');

    expect(safeStopIndex).toBeGreaterThanOrEqual(0);
    expect(evidenceGateIndex).toBeGreaterThanOrEqual(0);
    expect(safeStopIndex).toBeLessThan(evidenceGateIndex);
    expect(sourceHandler).toMatch(
      /if \(answers\.sourceStatus === 'message-only'\) \{\s*goToStep\('result'\);\s*return;/,
    );
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

  it('keeps the short browser-local boundary visible and discloses the full privacy qualifications', () => {
    const html = renderToStaticMarkup(createElement(
      SafetyBoundary,
      { language: 'en' },
      createElement('p', undefined, 'Keep this decision-critical warning visible.'),
    ));

    expect(html).toContain('Your files and answers stay in this browser. They are not uploaded.');
    expect(html).toContain('<summary>Privacy details</summary>');
    expect(html).toContain('hosting provider still receives ordinary page-request metadata');
    expect(html).toContain('Opening a PDF creates another browser-local tab');
    expect(html).toContain('Keep this decision-critical warning visible.');
    expect(html.indexOf('Keep this decision-critical warning visible.')).toBeGreaterThan(html.indexOf('</details>'));
  });

  it('makes the review route action-first while keeping named detail disclosures available', () => {
    expect(reviewSource).toMatch(/step === 'safety'[\s\S]*?<section className=\{`\$\{styles\.hero\}/);
    expect(reviewSource).toContain('Choose where to check');
    expect(reviewSource).toContain('How did you get this record?');
    expect(reviewSource).toContain('Add a record or enter facts');
    expect(reviewSource).toContain('More photo details');
    expect(reviewSource).toContain('Dates and notice details');
    expect(reviewSource).toContain('Other records');
    expect(reviewSource).toContain('Evidence details');
    expect(reviewSource).toContain('Review history');
    expect(reviewSource).toContain('Preview local summary');
    expect(presentationSource.match(/Based only on answers you confirmed/g)).toHaveLength(1);
  });

  it('keeps the official result route ahead of optional audit detail', () => {
    const result = reviewSource.slice(reviewSource.indexOf("{step === 'result' && ("));

    expect(result.indexOf('styles.officialHandoff')).toBeGreaterThanOrEqual(0);
    expect(result.indexOf('Evidence details')).toBeGreaterThan(result.indexOf('styles.officialHandoff'));
    expect(result.indexOf('Review history')).toBeGreaterThan(result.indexOf('styles.officialHandoff'));
    expect(result.indexOf('Preview local summary')).toBeGreaterThan(result.indexOf('styles.officialHandoff'));
  });

  it('keeps the /review credential warning outside the guide and privacy disclosures', () => {
    const reviewBoundary = reviewSource.match(/<SafetyBoundary\s+language=\{language\}>[\s\S]*?<\/SafetyBoundary>/)?.[0] ?? '';

    expect(reviewBoundary).toContain('Never enter a government password, CAPTCHA, OTP, Aadhaar, or payment credentials here.');
    expect(reviewBoundary).toContain('सरकारी पासवर्ड, CAPTCHA, OTP, Aadhaar या भुगतान क्रेडेंशियल यहाँ कभी दर्ज न करें।');
    expect(reviewBoundary.indexOf('Never enter a government password')).toBeGreaterThan(
      reviewBoundary.indexOf('<SafetyBoundary'),
    );
    expect(reviewBoundary.indexOf('Never enter a government password')).toBeGreaterThan(
      reviewBoundary.indexOf('>'),
    );
  });

  it('opens a selected PDF locally without contradicting the object-src security policy', () => {
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

    expect(securityConfig).toContain('"object-src \'none\'"');
    expect(html).toContain('href="blob:local-preview"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('चुना गया PDF स्थानीय रूप से खोलें');
    expect(html).toContain('PDF टैब स्वयं बंद करें');
    expect(html).not.toContain('<object');
    expect(reviewSource).not.toContain('<object');
    expect(reviewSource).toContain('Open selected PDF locally');
  });

  it('describes the selected-file boundary without denying ordinary hosting requests', () => {
    const shell = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: null,
      photograph: null,
      onRecordChange: () => undefined,
      onPhotographChange: () => undefined,
      language: 'en',
    }));

    expect(shell).toContain('No selected file or answer has been uploaded to ChallanSakshi or an authority');
    expect(shell).not.toContain('has left this browser tab');
    expect(shell).not.toContain('Nothing has left this device');
  });

  it('sets every reviewed essential 320px selector to at least 16px explicitly', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 420px)');
    const chromeMobile = mediaBlock(chromeStyles, '(max-width: 700px)');
    const chromeNarrow = mediaBlock(chromeStyles, '(max-width: 480px)');
    const guideMobile = mediaBlock(guidedStyles, '(max-width: 420px)');
    for (const selector of [
      '.heroCompact .lede',
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
      '.panel small',
      '.passport em',
      '.boundary strong',
    ]) {
      expectExplicitSixteenPixelRule(publicMobile, selector);
    }
    for (const selector of ['.headerButton', '.languages button', '.englishOnly']) {
      expectExplicitSixteenPixelRule(chromeMobile, selector);
    }
    expectExplicitSixteenPixelRule(chromeNarrow, '.publicBar');
    for (const selector of [
      '.guideTopline p',
      '.guideTopline span',
      '.primaryInstruction > span',
      '.status',
      '.guideDisclosure summary',
      '.detailLabel',
      '.detailsContent p',
      '.stepList li',
    ]) {
      expectExplicitSixteenPixelRule(guideMobile, selector);
    }
    expect(publicMobile).toMatch(/\.header\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(chromeStyles).toMatch(/\.headerButton[^}]*min-height:\s*48px/);
    expect(chromeStyles).toMatch(/\.languages button[^}]*min-height:\s*48px/);
    expect(guidedStyles).toMatch(/\.stepList li\s*\{[^}]*color:\s*#(?:[0-9a-f]{6})/);
  });

  it('prints only the clean evidence artifact, disclaimer, timeline, and evidence table', () => {
    expect(reviewSource).toMatch(/data-print-artifact/);
    expect(reviewSource).toMatch(/data-print-evidence/);
    expect(reviewSource).toMatch(/data-print-timeline/);
    expect(publicStyles).toMatch(/@media print[\s\S]*?\.app\s*>\s*\*\s*\{[^}]*display:\s*none\s*!important/);
    expect(publicStyles).toMatch(/@media print[\s\S]*?\[data-print-artifact\][^{]*\{[^}]*display:\s*block\s*!important/);
  });

  it('suppresses browser-native formatted printing on a shared device', () => {
    expect(reviewSource).toContain('data-device-context={device}');
    expect(reviewSource).toContain('data-shared-print-warning');
    expect(reviewSource).toContain('formatted printing are disabled for this shared-device review');
    expect(publicStyles).toMatch(
      /@media print[\s\S]*?\[data-device-context='shared'\]\s+\[data-print-result\]\s*\{[^}]*display:\s*none\s*!important/,
    );
    expect(publicStyles).toMatch(
      /@media print[\s\S]*?\[data-device-context='shared'\]\s+\[data-shared-print-warning\]\s*\{[^}]*display:\s*block\s*!important/,
    );
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
      'answers you confirmed',
    );
  });

  it('keeps essential privacy and safety reading copy readable and tappable at 320px', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 420px)');

    expect(publicStyles).toMatch(
      /\.brand\s*\{[^}]*min-height:\s*48px[^}]*display:\s*inline-flex/,
    );
    expectExplicitSixteenPixelRule(publicMobile, '.infoSection p');
    expectExplicitSixteenPixelRule(publicMobile, '.infoSection li');
    expectExplicitSixteenPixelRule(publicMobile, '.footerLinks a');
    expectExplicitSixteenPixelRule(publicMobile, '.footer p');
    expect(publicMobile).toMatch(
      /\.infoSection a\s*\{[^}]*display:\s*inline-flex[^}]*min-height:\s*48px/,
    );
    expect(publicMobile).toMatch(
      /\.footerLinks a\s*\{[^}]*display:\s*flex[^}]*min-height:\s*48px/,
    );
    expect(publicMobile).toMatch(
      /\.infoPage h1\s*\{[^}]*font-size:\s*(?:3[0-9]|[12][0-9])px[^}]*overflow-wrap:\s*anywhere/,
    );
  });

  it('stacks FASTag passport status inside each card on narrow screens', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 700px)');

    expect(publicMobile).toMatch(
      /\.passport article\s*\{[^}]*grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\)/,
    );
    expect(publicMobile).toMatch(
      /\.passport em\s*\{[^}]*grid-column:\s*2[^}]*justify-self:\s*start/,
    );
  });
});
