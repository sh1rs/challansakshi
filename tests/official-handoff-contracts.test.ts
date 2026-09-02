import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ExtensionAssistCard,
  type ExtensionAssistCallbacks,
  type ExtensionAssistPresentation,
} from '../components/public-beta/ExtensionAssistCard';
import {
  OfficialHandoffPanel,
  type OfficialHandoffCallbacks,
  type OfficialHandoffDraft,
  type OfficialHandoffPanelProps,
} from '../components/public-beta/OfficialHandoffPanel';
import { getOfficialHandoffPresentation } from '../lib/citizen-review-presentation';
import {
  CURRENT_LEGACY_JURISDICTION_CODES,
  OFFICIAL_DESTINATIONS,
} from '../lib/official-destinations';
import {
  buildOfficialHandoffPack,
  type OfficialHandoffPack,
  type RealHandoffBuildInput,
} from '../lib/official-handoff';
import {
  createOfficialHandoffReceiptSession,
  recordCitizenReturn,
  recordOfficialLinkActivation,
} from '../lib/official-handoff-receipt';
import type { ActionReadyReviewFacts, ReviewFact } from '../lib/public-challan';

const NOW = '2026-09-03T10:30:00.000Z';
const OPENED_AT = '2026-09-03T11:00:00.000Z';
const RETURNED_AT = '2026-09-03T11:05:00.000Z';
const RESULT_REVISION = '11111111111111111111111111111111';
const PACK_REVISION = '22222222222222222222222222222222';

const panelSource = readFileSync(
  new URL('../components/public-beta/OfficialHandoffPanel.tsx', import.meta.url),
  'utf8',
);
const panelStyles = readFileSync(
  new URL('../components/public-beta/OfficialHandoffPanel.module.css', import.meta.url),
  'utf8',
);
const helperSource = readFileSync(
  new URL('../components/public-beta/ExtensionAssistCard.tsx', import.meta.url),
  'utf8',
);
const helperStyles = readFileSync(
  new URL('../components/public-beta/ExtensionAssistCard.module.css', import.meta.url),
  'utf8',
);
const privacySources = [
  '../lib/local-record-intake.ts',
  '../lib/evidence-intelligence.ts',
  '../components/public-beta/LocalRecordIntake.tsx',
  '../components/public-beta/CitizenReviewApp.tsx',
  './local-record-intake.test.ts',
  './evidence-intelligence.test.ts',
  './citizen-review-contracts.test.ts',
].map((path) => ({
  path,
  source: readFileSync(new URL(path, import.meta.url), 'utf8'),
}));

const fact = <T>(value: T, source: ReviewFact<T>['source']): ReviewFact<T> => ({
  value,
  source,
  confidence: 'high',
  limitation: 'Caller limitation is replaced before export.',
  confirmation: 'citizen-confirmed',
  reviewRevisionId: RESULT_REVISION,
});

const facts: ActionReadyReviewFacts = {
  reviewRevisionId: RESULT_REVISION,
  citizenVehicleClass: fact('four-wheeler', 'independent-vehicle-record'),
  observedEvidenceVehicleClass: fact('two-wheeler', 'official-evidence-image'),
  independentReadableVehicleRecord: fact(true, 'independent-vehicle-record'),
  supportedSignals: ['vehicle-class-conflict'],
};

const packConfirmation = {
  affectedPersonPresent: true,
  affectedPersonInspectedEvidence: true,
  affectedPersonInspectedReadableRecord: true,
  affectedPersonConfirmedEntitlement: true,
  affectedPersonRequestedPreparation: true,
  affectedPersonConfirmedPack: true,
} as const;

function nextgenPack(role: 'self' | 'present-helper' = 'self'): OfficialHandoffPack {
  const roleConfirmation = role === 'self'
    ? {
      role,
      affectedPersonInspectedEvidence: true,
      affectedPersonInspectedReadableRecord: true,
      affectedPersonConfirmedEntitlement: true,
      affectedPersonConfirmedPack: true,
    } as const
    : {
      role,
      ...packConfirmation,
    } as const;
  const input: RealHandoffBuildInput = {
    mode: 'real',
    sourceKind: 'official-service',
    route: OFFICIAL_DESTINATIONS.nextgen,
    jurisdictionConfirmation: { status: 'confirmed', code: 'KA' },
    now: NOW,
    facts,
    resultClass: 'possible-discrepancy',
    resultRevisionId: RESULT_REVISION,
    packRevisionId: PACK_REVISION,
    reviewedDescription: 'I request review of this record. The evidence appears to show a different vehicle.',
    confirmation: { status: 'confirmed', packRevisionId: PACK_REVISION, roleConfirmation },
    generatedAt: NOW,
  };
  const result = buildOfficialHandoffPack(input);
  expect(result.status).toBe('built');
  if (result.status !== 'built') throw new Error(`Expected authentic pack, got ${result.reason}`);
  return result.pack;
}

function destinationFor(pack: OfficialHandoffPack, serviceName = pack.destination.serviceName) {
  return {
    serviceName,
    purpose: pack.destination.purpose,
    domain: pack.destination.domain,
    lastVerifiedAt: pack.destination.lastVerifiedAt,
    canonicalUrl: pack.destination.canonicalUrl,
  } as const;
}

type EligibleOfficialHandoffDraft = Extract<OfficialHandoffDraft, { status: 'eligible' }>;

function eligibleDraft(
  pack: OfficialHandoffPack,
  overrides: Partial<EligibleOfficialHandoffDraft> = {},
): EligibleOfficialHandoffDraft {
  const draft: EligibleOfficialHandoffDraft = {
    status: 'eligible',
    eligibilityReason: 'action-ready',
    routeKey: 'nextgen',
    destination: destinationFor(pack),
    fallback: OFFICIAL_DESTINATIONS.nextgen.fallback,
    mappedCategory: null,
    normalizedDescription: pack.description,
    descriptionCodePointCount: Array.from(pack.description).length,
    descriptionError: null,
    checklist: pack.checklist,
    resultRevisionId: pack.resultRevisionId,
    packRevisionId: pack.packRevisionId,
    ...overrides,
  };
  return draft;
}

const extensionCallbacks: ExtensionAssistCallbacks = {
  onSupportedDesktopChange: () => undefined,
  onBoundedSafetyReviewChange: () => undefined,
  onAffectedPersonPresentChange: () => undefined,
  onAffectedPersonReviewedFieldsChange: () => undefined,
  onAffectedPersonRequestedPreparationChange: () => undefined,
  onPrepare: () => undefined,
  onClearPrepared: () => undefined,
};

const callbacks: OfficialHandoffCallbacks = {
  onDescriptionChange: () => undefined,
  onLookupValueChange: () => undefined,
  onAffectedPersonPresentChange: () => undefined,
  onAffectedPersonInspectedEvidenceChange: () => undefined,
  onAffectedPersonInspectedReadableRecordChange: () => undefined,
  onAffectedPersonConfirmedEntitlementChange: () => undefined,
  onAffectedPersonRequestedPreparationChange: () => undefined,
  onAffectedPersonConfirmedPackChange: () => undefined,
  onCopyField: () => undefined,
  onOfficialLinkActivate: () => undefined,
  onReturnStateChange: () => undefined,
  onReferenceLastFourChange: () => undefined,
  onReturnAffectedPersonPresentChange: () => undefined,
  onReturnRecordingRequestedChange: () => undefined,
  onReturnStateConfirmedChange: () => undefined,
  onReturnReferenceConfirmedChange: () => undefined,
  onRecordReturn: () => undefined,
  onDownloadReceipt: () => undefined,
};

const closedExtension: ExtensionAssistPresentation = {
  release: { status: 'closed', publicHelperAvailable: false, acquisition: null },
  preparationAllowedByController: false,
  supportedDesktopConfirmed: false,
  boundedSafetyReviewConfirmed: false,
  helperConfirmation: {
    affectedPersonPresent: false,
    affectedPersonReviewedFields: false,
    affectedPersonRequestedPreparation: false,
  },
  preparation: { status: 'idle' },
};

const publicEnabledExtension: ExtensionAssistPresentation = {
  release: {
    status: 'public-enabled',
    publicHelperAvailable: true,
    acquisition: {
      firstPartyLandingUrl: '/extension',
      extensionId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      storeUrl: 'https://chromewebstore.google.com/detail/challansakshi-assisted-handoff/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
  },
  preparationAllowedByController: true,
  supportedDesktopConfirmed: true,
  boundedSafetyReviewConfirmed: true,
  helperConfirmation: {
    affectedPersonPresent: true,
    affectedPersonReviewedFields: true,
    affectedPersonRequestedPreparation: true,
  },
  preparation: { status: 'idle' },
};

function panelProps(overrides: Partial<OfficialHandoffPanelProps> = {}): OfficialHandoffPanelProps {
  const pack = nextgenPack();
  return {
    language: 'en',
    simpleMode: false,
    reviewContext: {
      role: 'self',
      deviceMode: 'private',
      safetyConsent: {
        manualReviewAcknowledged: true,
        minimumDataAcknowledged: true,
        affectedPersonPresentAcknowledged: false,
      },
    },
    draft: eligibleDraft(pack),
    confirmedPack: pack,
    packConfirmation,
    copyStatus: { status: 'idle' },
    lookupValue: 'TEST-LOOKUP-42',
    officialLinkStatus: 'not-activated',
    receiptState: createOfficialHandoffReceiptSession(pack, 'private'),
    returnDraft: { selectedReturnState: null, referenceLastFour: '' },
    returnAuthorization: {
      affectedPersonPresent: false,
      affectedPersonRequestedReturnRecording: false,
      affectedPersonConfirmedReturnState: false,
      affectedPersonConfirmedReferenceFragment: false,
    },
    extension: closedExtension,
    callbacks,
    extensionCallbacks,
    ...overrides,
  };
}

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

function sectionMarkup(html: string, labelledBy: string): string {
  const start = html.indexOf(`aria-labelledby="${labelledBy}"`);
  if (start < 0) return '';
  const opening = html.lastIndexOf('<section', start);
  const closing = html.indexOf('</section>', start);
  return html.slice(opening, closing + '</section>'.length);
}

function openingTagForText(html: string, text: string): string {
  const textIndex = html.indexOf(text);
  if (textIndex < 0) return '';
  const opening = html.lastIndexOf('<', textIndex);
  const closing = html.indexOf('>', opening);
  return html.slice(opening, closing + 1);
}

function primaryActionCount(html: string): number {
  return html.match(/class="[^"]*primaryAction[^"]*"/g)?.length ?? 0;
}

describe('controlled official handoff presentation', () => {
  it('starts after the result with Prepared for and preserves the complete installation-free order', () => {
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps()));
    const ordered = [
      'Prepared for',
      'Official grievance service',
      'echallan.parivahan.nic.in',
      'Optional challan number aid',
      'Reviewed description',
      'Before you leave',
      'My case',
      'You are leaving ChallanSakshi',
      'Open NextGen e-Challan grievance service',
    ].map((text) => html.indexOf(text));

    expect(ordered.every((index) => index >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((left, right) => left - right));
    expect(html).not.toContain('Citizen-recorded material inconsistency');
    expect(html).not.toContain('The photo and vehicle record look different');
  });

  it('renders field-specific private copy controls and a polite non-destructive failure state', () => {
    const props = panelProps({
      copyStatus: { status: 'failed', field: 'description' },
    });
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, props));

    expect(html).toContain('Copy challan number');
    expect(html).toContain('Copy reviewed description');
    expect(html).toContain('TEST-LOOKUP-42');
    expect(html).toContain(props.draft.normalizedDescription);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Copy failed. The reviewed description remains visible and selectable; copy it manually. Nothing opened.');
    expect(html).toContain(`href="${props.draft.destination.canonicalUrl}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(panelSource).toMatch(/onCopyField\('description'\)/);
    expect(panelSource).not.toMatch(/onCopyField[\s\S]{0,180}onOfficialLinkActivate/);
  });

  it.each([
    ['en', 'failed', 'lookup', 'Copy failed. The challan number remains visible and selectable; copy it manually. Nothing opened.'],
    ['en', 'failed', 'category', 'Copy failed. The reviewed category remains visible and selectable; copy it manually. Nothing opened.'],
    ['en', 'failed', 'description', 'Copy failed. The reviewed description remains visible and selectable; copy it manually. Nothing opened.'],
    ['en', 'copied', 'lookup', 'Challan number copied. Nothing opened or was submitted.'],
    ['en', 'copied', 'category', 'Reviewed category copied. Nothing opened or was submitted.'],
    ['en', 'copied', 'description', 'Reviewed description copied. Nothing opened or was submitted.'],
    ['hi', 'failed', 'lookup', 'कॉपी नहीं हुई। चालान नंबर दिखता और चुना जा सकता है; इसे स्वयं कॉपी करें। कुछ नहीं खुला।'],
    ['hi', 'failed', 'category', 'कॉपी नहीं हुई। समीक्षित श्रेणी दिखती और चुनी जा सकती है; इसे स्वयं कॉपी करें। कुछ नहीं खुला।'],
    ['hi', 'failed', 'description', 'कॉपी नहीं हुई। समीक्षित विवरण दिखता और चुना जा सकता है; इसे स्वयं कॉपी करें। कुछ नहीं खुला।'],
    ['hi', 'copied', 'lookup', 'चालान नंबर कॉपी हुआ। कुछ नहीं खुला या जमा हुआ।'],
    ['hi', 'copied', 'category', 'समीक्षित श्रेणी कॉपी हुई। कुछ नहीं खुला या जमा हुआ।'],
    ['hi', 'copied', 'description', 'समीक्षित विवरण कॉपी हुआ। कुछ नहीं खुला या जमा हुआ।'],
  ] as const)('announces %s %s feedback once for the %s value', (language, status, field, expected) => {
    const pack = nextgenPack();
    const draft = eligibleDraft(pack, {
      mappedCategory: { label: 'Wrong Evidence Captured', value: 'Wrong Image' },
    });
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      language,
      draft,
      confirmedPack: pack,
      copyStatus: { status, field },
    })));
    const selectableValues = {
      lookup: 'TEST-LOOKUP-42',
      category: 'Wrong Image',
      description: draft.normalizedDescription,
    } as const;

    expect(html).toContain(selectableValues[field]);
    expect(html.split(expected)).toHaveLength(2);
    expect(html).toMatch(/role="status" aria-live="polite" aria-atomic="true"/);
    expect(html).toContain(`href="${draft.destination.canonicalUrl}"`);
    expect(html).toContain('target="_blank"');
  });

  it('announces successful lookup copy after the controller clears the sensitive lookup value', () => {
    const copiedStatus = { status: 'copied', field: 'lookup' } as const;
    const expected = 'Challan number copied. Nothing opened or was submitted.';
    const retainedHtml = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      copyStatus: copiedStatus,
    })));
    const clearedHtml = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      copyStatus: copiedStatus,
      lookupValue: null,
    })));

    expect(retainedHtml).toContain('TEST-LOOKUP-42');
    expect(clearedHtml).not.toContain('TEST-LOOKUP-42');
    expect(retainedHtml.split(expected)).toHaveLength(2);
    expect(clearedHtml.split(expected)).toHaveLength(2);
    expect(clearedHtml).toMatch(/aria-label="Copy status"[^>]*role="status" aria-live="polite" aria-atomic="true">Challan number copied/);
    expect(clearedHtml).toContain('Optional challan number aid');
    expect(clearedHtml).toMatch(/<input[^>]*autoComplete="off"[^>]*value=""/);
  });

  it('renders the only controlled ephemeral lookup input on private devices', () => {
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps()));
    expect(html).toMatch(/<input[^>]*autoComplete="off"[^>]*value="TEST-LOOKUP-42"/);
    expect(panelSource).toMatch(/onLookupValueChange/);
    expect(panelSource).toMatch(/onCopyField\('lookup'\)/);
    expect(panelSource).not.toMatch(/onCopyField\('lookup',/);
  });

  it('renders only the original typed fallback after the citizen reports portal-unavailable', () => {
    const pack = nextgenPack();
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft: eligibleDraft(pack, { fallback: OFFICIAL_DESTINATIONS.nextgen.fallback }),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      returnDraft: { selectedReturnState: 'portal-unavailable', referenceLastFour: '' },
    })));
    expect(html).toContain('The original official service did not work for you.');
    expect(html).toContain(OFFICIAL_DESTINATIONS.nextgen.canonicalUrl);
    expect(html).toContain(OFFICIAL_DESTINATIONS.nextgen.fallback.canonicalUrl);
    expect(html).not.toMatch(/government outage|service outage/i);
  });

  it('keeps the idle copy live region mounted without rendering a blank callout', () => {
    const idleHtml = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      copyStatus: { status: 'idle' },
    })));
    const copiedHtml = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      copyStatus: { status: 'copied', field: 'lookup' },
    })));
    const failedHtml = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      copyStatus: { status: 'failed', field: 'lookup' },
    })));
    const idleRegion = idleHtml.match(/<div[^>]*aria-label="Copy status"[^>]*><\/div>/)?.[0];
    const copiedRegion = copiedHtml.match(/<div[^>]*aria-label="Copy status"[^>]*>Challan number copied\.[^<]*<\/div>/)?.[0];
    const failedRegion = failedHtml.match(/<div[^>]*aria-label="Copy status"[^>]*>Copy failed\.[^<]*<\/div>/)?.[0];

    expect(idleRegion).toBeDefined();
    expect(idleRegion).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(idleRegion).toContain('copyStatusRegion');
    expect(idleRegion).not.toMatch(/_status_/);
    expect(copiedRegion).toContain('copyStatusRegion');
    expect(copiedRegion).toMatch(/_status_/);
    expect(failedRegion).toContain('copyStatusRegion');
    expect(failedRegion).toMatch(/_status_/);
    expect(panelStyles).toMatch(/\.copyStatusRegion\s*\{[^}]*margin:\s*0/);
    expect(panelStyles).not.toMatch(/\.copyStatusRegion\s*\{[^}]*(?:padding|background|border(?:-left)?):/);
    expect(panelStyles).toMatch(/\.status,[\s\S]*?\{[^}]*padding:\s*12px[^}]*background:[^}]*border-left:/);
  });

  it.each([
    ['en', false, 'A😀e\u0301', 4, '4 of 500 Unicode code points'],
    ['en', true, 'हिंदी', 5, '5 of 500 Unicode code points'],
    ['hi', false, 'A😀e\u0301', 4, '500 यूनिकोड कोड पॉइंट में से 4'],
    ['hi', true, 'हिंदी', 5, '500 यूनिकोड कोड पॉइंट में से 5'],
  ] as const)('announces the exact Unicode count in %s simple=%s', (language, simpleMode, description, count, expected) => {
    const pack = nextgenPack();
    const draft = eligibleDraft(pack, {
      normalizedDescription: description,
      descriptionCodePointCount: count,
    });
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      language,
      simpleMode,
      draft,
      confirmedPack: pack,
    })));
    const descriptionSection = sectionMarkup(html, 'handoff-description-heading');

    expect(Array.from(description)).toHaveLength(count);
    expect(descriptionSection).toContain(expected);
    expect(descriptionSection).toContain('role="status"');
    expect(descriptionSection).toContain('aria-live="polite"');
  });

  it('keeps shared-device values selectable while omitting lookup, clipboard, receipt, reference, and helper controls', () => {
    const pack = nextgenPack();
    const sharedReceipt = recordCitizenReturn(
      recordOfficialLinkActivation(
        createOfficialHandoffReceiptSession(pack, 'shared'),
        pack,
        OPENED_AT,
      ),
      pack,
      { selectedReturnState: 'not-submitted', localTimestamp: RETURNED_AT },
    );
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      reviewContext: {
        role: 'self',
        deviceMode: 'shared',
        safetyConsent: {
          manualReviewAcknowledged: true,
          minimumDataAcknowledged: true,
          affectedPersonPresentAcknowledged: false,
        },
      },
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      lookupValue: 'SHARED-LOOKUP-MUST-NOT-RENDER',
      officialLinkStatus: 'activated',
      receiptState: sharedReceipt,
      returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour: 'A7B9' },
      extension: publicEnabledExtension,
    })));

    expect(html).toContain('Select this reviewed description and type or paste it into the official service yourself.');
    expect(html).toContain(pack.description);
    expect(html).not.toMatch(/>Copy [^<]+</);
    expect(html).not.toContain('SHARED-LOOKUP-MUST-NOT-RENDER');
    expect(html).not.toContain('Download redacted continuation receipt');
    expect(html).not.toContain('Last 4 characters of the official reference');
    expect(html).not.toContain('Optional desktop helper');
  });

  it('shows return choices only after controlled link activation and private receipt download only after a valid recorded return', () => {
    const unopened = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps()));
    expect(unopened).not.toContain('What happened on the official service?');
    expect(unopened).not.toContain('Download redacted continuation receipt');

    const pack = nextgenPack();
    const activated = recordOfficialLinkActivation(
      createOfficialHandoffReceiptSession(pack, 'private'),
      pack,
      OPENED_AT,
    );
    const receipt = recordCitizenReturn(activated, pack, {
      selectedReturnState: 'acknowledgement-seen',
      localTimestamp: RETURNED_AT,
      referenceLastFour: 'A7B9',
    });
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      receiptState: receipt,
      returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour: 'A7B9' },
    })));

    for (const label of [
      'I saw an acknowledgement on the official service',
      'The official portal did not work for me',
      'I did not submit',
      'I need to correct my pack',
      'Last 4 characters of the official reference, recorded by you',
      'Citizen-reported; not verified by ChallanSakshi.',
      'Download redacted continuation receipt',
    ]) expect(html).toContain(label);
    expect(html).not.toContain('full reference');
    expect(html).not.toContain('screenshot');
  });

  it.each([
    ['en', false, {
      opened: 'Official service opened from this review. ChallanSakshi cannot see what happened there.',
      selected: 'Selected return note: I saw an acknowledgement on the official service. Citizen-reported and unverified; this does not show submission or acceptance.',
      recorded: 'Return note recorded in this tab only. Citizen-reported and unverified; not a submission or official acceptance.',
    }],
    ['en', true, {
      opened: 'Official service opened from this review. ChallanSakshi cannot see what happened there.',
      selected: 'You selected: I saw an acknowledgement. You reported this; it is not verified. ChallanSakshi did not see a submission or acceptance.',
      recorded: 'Your return note is recorded only on this tab and is not verified. ChallanSakshi did not submit it or verify acceptance.',
    }],
    ['hi', false, {
      opened: 'आधिकारिक सेवा इस समीक्षा से खोली गई। ChallanSakshi वहाँ हुई कार्रवाई नहीं देख सकता।',
      selected: 'चुना गया वापसी नोट: मुझे आधिकारिक सेवा पर पावती दिखी। नागरिक द्वारा बताया गया और असत्यापित; यह जमा या स्वीकृति नहीं दिखाता।',
      recorded: 'वापसी नोट केवल इस टैब में दर्ज हुआ। नागरिक द्वारा बताया गया और असत्यापित; यह जमा या आधिकारिक स्वीकृति नहीं है।',
    }],
    ['hi', true, {
      opened: 'आधिकारिक सेवा इस समीक्षा से खोली गई। ChallanSakshi वहाँ हुई कार्रवाई नहीं देख सकता।',
      selected: 'आपने चुना: मुझे पावती दिखी। यह आपने बताया है और सत्यापित नहीं है; ChallanSakshi ने जमा या स्वीकृति नहीं देखी।',
      recorded: 'आपका वापसी नोट केवल इस टैब में दर्ज है और सत्यापित नहीं है। ChallanSakshi ने इसे जमा नहीं किया या स्वीकृति सत्यापित नहीं की।',
    }],
  ] as const)('announces opened, selected, and local-recorded states in %s simple=%s', (language, simpleMode, expected) => {
    const pack = nextgenPack();
    const receipt = recordCitizenReturn(
      recordOfficialLinkActivation(createOfficialHandoffReceiptSession(pack, 'private'), pack, OPENED_AT),
      pack,
      { selectedReturnState: 'acknowledgement-seen', localTimestamp: RETURNED_AT },
    );
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      language,
      simpleMode,
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      receiptState: receipt,
      returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour: '' },
    })));

    expect(html).toContain(expected.opened);
    expect(html).toContain(expected.selected);
    expect(html).toContain(expected.recorded);
    expect(html.match(/role="status" aria-live="polite"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('submission observed');
    expect(html).not.toContain('officially accepted');
  });

  it.each([
    ['en', false, {
      selected: 'Selected return note for the affected person: I saw an acknowledgement on the official service. Affected-person-reported and entered by the present helper; unverified. This does not show submission or acceptance.',
      recorded: 'Return note recorded in this tab only for the affected person. Affected-person-reported and entered by the present helper; unverified. Not a submission or official acceptance.',
      forbiddenSelfAttribution: 'Citizen-reported and unverified',
    }],
    ['en', true, {
      selected: 'Selected for the present person: I saw an acknowledgement. The present person reported this; the helper only typed it. It is not verified, and ChallanSakshi did not see a submission or acceptance.',
      recorded: 'Return note for the present person is recorded only on this tab. The helper only typed it; it is not verified. ChallanSakshi did not submit it or verify acceptance.',
      forbiddenSelfAttribution: 'You reported this; it is not verified',
    }],
    ['hi', false, {
      selected: 'प्रभावित व्यक्ति के लिए चुना गया वापसी नोट: मुझे आधिकारिक सेवा पर पावती दिखी। प्रभावित व्यक्ति द्वारा बताया गया और मौजूद मददगार द्वारा दर्ज; असत्यापित। यह जमा या स्वीकृति नहीं दिखाता।',
      recorded: 'प्रभावित व्यक्ति का वापसी नोट केवल इस टैब में दर्ज हुआ। प्रभावित व्यक्ति द्वारा बताया गया और मौजूद मददगार द्वारा दर्ज; असत्यापित। यह जमा या आधिकारिक स्वीकृति नहीं है।',
      forbiddenSelfAttribution: 'नागरिक द्वारा बताया गया और असत्यापित',
    }],
    ['hi', true, {
      selected: 'मौजूद व्यक्ति के लिए चुना: मुझे पावती दिखी। मौजूद व्यक्ति ने बताया; मददगार ने केवल लिखा। यह सत्यापित नहीं है और ChallanSakshi ने जमा या स्वीकृति नहीं देखी।',
      recorded: 'मौजूद व्यक्ति का वापसी नोट केवल इस टैब में दर्ज है। मददगार ने केवल लिखा; यह सत्यापित नहीं है। ChallanSakshi ने इसे जमा नहीं किया या स्वीकृति सत्यापित नहीं की।',
      forbiddenSelfAttribution: 'यह आपने बताया है और सत्यापित नहीं है',
    }],
  ] as const)('attributes helper return announcements to the affected person in %s simple=%s', (language, simpleMode, expected) => {
    const pack = nextgenPack('present-helper');
    const receipt = recordCitizenReturn(
      recordOfficialLinkActivation(createOfficialHandoffReceiptSession(pack, 'private'), pack, OPENED_AT),
      pack,
      {
        selectedReturnState: 'acknowledgement-seen',
        localTimestamp: RETURNED_AT,
        helperConfirmation: {
          affectedPersonPresent: true,
          affectedPersonRequestedReturnRecording: true,
          affectedPersonConfirmedReturnState: true,
          affectedPersonConfirmedReferenceFragment: false,
        },
      },
    );
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      language,
      simpleMode,
      reviewContext: {
        role: 'present-helper',
        deviceMode: 'private',
        safetyConsent: {
          manualReviewAcknowledged: true,
          minimumDataAcknowledged: true,
          affectedPersonPresentAcknowledged: true,
        },
      },
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      receiptState: receipt,
      returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour: '' },
    })));

    expect(html).toContain(expected.selected);
    expect(html).toContain(expected.recorded);
    expect(html).not.toContain(expected.forbiddenSelfAttribution);
    expect(html).toContain(language === 'hi'
      ? simpleMode
        ? 'व्यक्ति को खुद साइन इन, घोषणा और आधिकारिक साइट पर जमा करना होगा; मददगार यह नहीं करेगा।'
        : 'मददगार नहीं, प्रभावित व्यक्ति को आधिकारिक सेवा पर स्वयं प्रमाणीकरण, घोषणा और जमा करना होगा।'
      : simpleMode
        ? 'The person—not the helper—must sign in, declare, and submit on the official site.'
        : 'The affected person—not the helper—must independently authenticate, declare, and submit on the official service.');
  });

  it('keeps helper pack and return authorizations as separate affected-person confirmations', () => {
    const pack = nextgenPack('present-helper');
    const activated = recordOfficialLinkActivation(
      createOfficialHandoffReceiptSession(pack, 'private'),
      pack,
      OPENED_AT,
    );
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      reviewContext: {
        role: 'present-helper',
        deviceMode: 'private',
        safetyConsent: {
          manualReviewAcknowledged: true,
          minimumDataAcknowledged: true,
          affectedPersonPresentAcknowledged: true,
        },
      },
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      receiptState: activated,
      returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour: '' },
    })));

    for (const label of [
      'The affected person is present.',
      'The affected person inspected the supplied evidence.',
      'The affected person inspected a readable comparison record.',
      'The affected person confirmed they are entitled to raise this matter.',
      'The affected person asked me to prepare this information.',
      'The affected person reviewed and confirmed this field pack.',
      'The affected person—not the helper—must independently authenticate, declare, and submit on the official service.',
      'The affected person is still present for this return note.',
      'The affected person asked me to record what happened.',
      'The affected person confirmed this exact return state.',
      'The affected person confirmed these exact last four characters.',
      'Affected-person-reported; entered with a present helper. Not verified by ChallanSakshi.',
    ]) expect(html).toContain(label);
  });

  it('groups the four return choices as one native radio fieldset', () => {
    const pack = nextgenPack();
    const activated = recordOfficialLinkActivation(
      createOfficialHandoffReceiptSession(pack, 'private'),
      pack,
      OPENED_AT,
    );
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      receiptState: activated,
    })));

    expect(html).toContain('<fieldset');
    expect(html).toContain('<legend>What happened on the official service?</legend>');
    expect(html.match(/name="official-handoff-return-state"/g)).toHaveLength(4);
  });

  it('keeps exactly one filled primary action across unopened, activated, and locally recorded states', () => {
    const pack = nextgenPack();
    const base = panelProps({
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      extension: publicEnabledExtension,
    });
    const unopened = renderToStaticMarkup(createElement(OfficialHandoffPanel, base));
    const activatedReceipt = recordOfficialLinkActivation(
      createOfficialHandoffReceiptSession(pack, 'private'),
      pack,
      OPENED_AT,
    );
    const activated = renderToStaticMarkup(createElement(OfficialHandoffPanel, {
      ...base,
      officialLinkStatus: 'activated',
      receiptState: activatedReceipt,
      returnDraft: { selectedReturnState: 'not-submitted', referenceLastFour: '' },
    }));
    const recordedReceipt = recordCitizenReturn(activatedReceipt, pack, {
      selectedReturnState: 'not-submitted',
      localTimestamp: RETURNED_AT,
    });
    const recorded = renderToStaticMarkup(createElement(OfficialHandoffPanel, {
      ...base,
      officialLinkStatus: 'activated',
      receiptState: recordedReceipt,
      returnDraft: { selectedReturnState: 'not-submitted', referenceLastFour: '' },
    }));

    expect(primaryActionCount(unopened)).toBe(1);
    expect(openingTagForText(unopened, 'Open NextGen e-Challan grievance service')).toContain('primaryAction');
    expect(openingTagForText(unopened, 'Review desktop helper and installation')).toContain('secondaryAction');
    expect(openingTagForText(unopened, 'Already installed? Prepare reviewed fields')).toContain('secondaryAction');

    expect(primaryActionCount(activated)).toBe(1);
    expect(openingTagForText(activated, 'Open NextGen e-Challan grievance service')).toContain('secondaryAction');
    expect(openingTagForText(activated, 'Record this return locally')).toContain('primaryAction');

    expect(primaryActionCount(recorded)).toBe(1);
    expect(openingTagForText(recorded, 'Open NextGen e-Challan grievance service')).toContain('secondaryAction');
    expect(openingTagForText(recorded, 'Record this return locally')).toContain('secondaryAction');
    expect(openingTagForText(recorded, 'Download redacted continuation receipt')).toContain('primaryAction');
  });

  it('renders Legacy only through an explicitly labelled presentation-only fixture while production issuance stays empty', () => {
    const authenticNextgen = nextgenPack();
    const PRESENTATION_ONLY_LEGACY_PACK_FIXTURE = Object.freeze({
      fixtureKind: 'presentation-only-legacy-pack',
    }) as unknown as OfficialHandoffPack;
    const legacyDraft = eligibleDraft(authenticNextgen, {
      routeKey: 'legacy',
      destination: {
        serviceName: 'National e-Challan grievance service',
        purpose: 'official-grievance-service',
        domain: 'echallan.parivahan.gov.in',
        lastVerifiedAt: '2026-09-02',
        canonicalUrl: 'https://echallan.parivahan.gov.in/gsticket',
      },
      mappedCategory: {
        label: 'Wrong Evidence Captured',
        value: 'Wrong Image',
      },
    });
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft: legacyDraft,
      confirmedPack: PRESENTATION_ONLY_LEGACY_PACK_FIXTURE,
    })));

    expect(CURRENT_LEGACY_JURISDICTION_CODES).toEqual([]);
    expect(html).toContain('Reviewed category');
    expect(html).toContain('Wrong Evidence Captured');
    expect(html).toContain('Wrong Image');
    expect(html).toContain('Copy reviewed category');
  });

  it.each([
    {
      status: 'manual',
      destinationKey: 'delhi-manual',
      expected: 'This official destination has no verified field-compatible form in this release. Use the official site and review its current options yourself.',
    },
    {
      status: 'unresolved',
      destinationKey: 'unresolved',
      expected: 'The issuing jurisdiction is not confirmed or no current verified route is available. Use only the official services directory.',
    },
    {
      status: 'abstained',
      destinationKey: 'nextgen',
      expected: 'This review does not support a confirmed field pack. Check the missing or unclear evidence before preparing official information.',
    },
  ] as const)('renders the closed $status presentation from the exact registry destination', ({ status, destinationKey, expected }) => {
    const pack = nextgenPack();
    const common = {
      mappedCategory: null,
      normalizedDescription: pack.description,
      descriptionCodePointCount: Array.from(pack.description).length,
      descriptionError: null,
      checklist: pack.checklist,
      resultRevisionId: pack.resultRevisionId,
      packRevisionId: pack.packRevisionId,
    } as const;
    const drafts = {
      manual: {
        ...common,
        fallback: OFFICIAL_DESTINATIONS['delhi-manual'].fallback,
        status: 'manual',
        eligibilityReason: 'manual-route-only',
        routeKey: 'delhi-manual',
        destination: OFFICIAL_DESTINATIONS['delhi-manual'],
      } satisfies OfficialHandoffDraft,
      unresolved: {
        ...common,
        fallback: OFFICIAL_DESTINATIONS.unresolved.fallback,
        status: 'unresolved',
        eligibilityReason: 'route-unresolved',
        routeKey: 'unresolved',
        destination: OFFICIAL_DESTINATIONS.unresolved,
      } satisfies OfficialHandoffDraft,
      abstained: {
        ...common,
        fallback: OFFICIAL_DESTINATIONS.nextgen.fallback,
        status: 'abstained',
        eligibilityReason: 'result-not-action-ready',
        routeKey: 'nextgen',
        destination: OFFICIAL_DESTINATIONS.nextgen,
      } satisfies OfficialHandoffDraft,
    };
    const draft = drafts[status];
    const expectedDestination = OFFICIAL_DESTINATIONS[destinationKey];
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft,
      confirmedPack: null,
      extension: publicEnabledExtension,
    })));

    expect(html).toContain('Prepared for');
    expect(html).toContain(expected);
    expect(html).toContain(expectedDestination.serviceName);
    expect(html).toContain(expectedDestination.domain);
    expect(html).toContain(`href="${expectedDestination.canonicalUrl}"`);
    expect(html).toContain(`data-purpose="${expectedDestination.purpose}"`);
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('Reviewed category');
    expect(html).not.toContain('Copy reviewed description');
    expect(html).not.toContain('Copy reviewed category');
    expect(html).not.toContain('Optional desktop helper');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });
});

describe('optional desktop helper presentation', () => {
  it('renders nothing for the checked-in closed release', () => {
    expect(renderToStaticMarkup(createElement(ExtensionAssistCard, {
      language: 'en',
      simpleMode: false,
      role: 'self',
      presentation: closedExtension,
      callbacks: extensionCallbacks,
    }))).toBe('');
  });

  it('keeps the state-free first-party review anchor separate and before preparation', () => {
    const html = renderToStaticMarkup(createElement(ExtensionAssistCard, {
      language: 'en',
      simpleMode: false,
      role: 'self',
      presentation: publicEnabledExtension,
      callbacks: extensionCallbacks,
    }));

    const reviewIndex = html.indexOf('Review desktop helper and installation');
    const prepareIndex = html.indexOf('Already installed? Prepare reviewed fields');
    expect(reviewIndex).toBeGreaterThanOrEqual(0);
    expect(prepareIndex).toBeGreaterThan(reviewIndex);
    expect(html).toContain('href="/extension"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).not.toContain('chrome-extension:');
    expect(html).not.toContain('Install from Chrome Web Store');
    expect(html).not.toContain('sideload');
  });

  it('keeps supported desktop, bounded review, and every present-helper permission separate', () => {
    const html = renderToStaticMarkup(createElement(ExtensionAssistCard, {
      language: 'en',
      simpleMode: false,
      role: 'present-helper',
      presentation: publicEnabledExtension,
      callbacks: extensionCallbacks,
    }));

    for (const label of [
      'I am using supported desktop Google Chrome. This is product support, not a security guarantee.',
      'I reviewed these fields and removed names, contact details, full vehicle, challan, reference or government-ID numbers, credentials, authentication codes, and payment information.',
      'The affected person is still present.',
      'The affected person separately reviewed and confirmed the exact fields.',
      'The affected person asked me to prepare, load, and place these fields.',
      'The affected person must inspect the result and independently authenticate, declare, and submit.',
    ]) expect(html).toContain(label);
  });

  it('mounts canonical prepared JSON only as one escaped text node under the two exact capsule markers', () => {
    const canonicalEnvelopeJson = '{"schema":"challansakshi.extension-handoff/v1","description":"&lt;not markup&gt;"}';
    const prepared: ExtensionAssistPresentation = {
      ...publicEnabledExtension,
      preparation: { status: 'prepared', canonicalEnvelopeJson },
    };
    const html = renderToStaticMarkup(createElement(ExtensionAssistCard, {
      language: 'en',
      simpleMode: false,
      role: 'self',
      presentation: prepared,
      callbacks: extensionCallbacks,
    }));

    expect(html).toContain('Prepared on this page only. Open the ChallanSakshi extension on this tab to preview and load the reviewed fields. Nothing has opened or been filled.');
    expect(html).toContain('data-challansakshi-extension-handoff="v1"');
    expect(html).toContain('data-challansakshi-extension-envelope="v1"');
    expect(html).toContain('&amp;lt;not markup&amp;gt;');
    expect(html).not.toContain('<script');
    expect(primaryActionCount(html)).toBe(0);
    expect(openingTagForText(html, 'Review desktop helper and installation')).toContain('secondaryAction');
    expect(openingTagForText(html, 'Already installed? Prepare reviewed fields')).toContain('secondaryAction');
    expect(openingTagForText(html, 'Clear prepared fields')).toContain('secondaryAction');
    expect(panelSource).not.toContain('dangerouslySetInnerHTML');
    expect(helperSource).not.toContain('dangerouslySetInnerHTML');
  });
});

describe('English, Hindi, and Simple Mode safety copy', () => {
  it.each([
    ['en', false, {
      safetyBoundary: 'Review every field before leaving ChallanSakshi. Nothing has been submitted.',
      selfRole: 'My case',
      helperRole: 'Helping someone present',
      helperSubmitBoundary: 'The affected person—not the helper—must independently authenticate, declare, and submit on the official service.',
      returnStates: ['I saw an acknowledgement on the official service', 'The official portal did not work for me', 'I did not submit', 'I need to correct my pack'],
      selfReturnBasis: 'Citizen-reported; not verified by ChallanSakshi.',
      helperReturnBasis: 'Affected-person-reported; entered with a present helper. Not verified by ChallanSakshi.',
      helperIndependence: 'The helper is optional. The complete field pack and official link work without it.',
    }],
    ['en', true, {
      safetyBoundary: 'Check every field yourself. ChallanSakshi has not sent anything.',
      selfRole: 'My case',
      helperRole: 'Helping someone present',
      helperSubmitBoundary: 'The person—not the helper—must sign in, declare, and submit on the official site.',
      returnStates: ['I saw an acknowledgement', 'The official site did not work', 'I did not send it', 'I need to fix my pack'],
      selfReturnBasis: 'You reported this. ChallanSakshi did not verify it.',
      helperReturnBasis: 'The present person reported this; the helper only typed it. ChallanSakshi did not verify it.',
      helperIndependence: 'This helper is optional. You can use the field pack and official link without it.',
    }],
    ['hi', false, {
      safetyBoundary: 'ChallanSakshi छोड़ने से पहले हर फ़ील्ड जाँचें। कुछ भी जमा नहीं हुआ है।',
      selfRole: 'मेरा मामला',
      helperRole: 'मौजूद व्यक्ति की मदद',
      helperSubmitBoundary: 'मददगार नहीं, प्रभावित व्यक्ति को आधिकारिक सेवा पर स्वयं प्रमाणीकरण, घोषणा और जमा करना होगा।',
      returnStates: ['मुझे आधिकारिक सेवा पर पावती दिखी', 'आधिकारिक पोर्टल मेरे लिए नहीं चला', 'मैंने जमा नहीं किया', 'मुझे अपने पैक में सुधार करना है'],
      selfReturnBasis: 'नागरिक द्वारा बताया गया; ChallanSakshi ने सत्यापित नहीं किया।',
      helperReturnBasis: 'प्रभावित व्यक्ति द्वारा बताया गया; मौजूद मददगार ने दर्ज किया। ChallanSakshi ने सत्यापित नहीं किया।',
      helperIndependence: 'मददगार वैकल्पिक है। पूरा फ़ील्ड पैक और आधिकारिक लिंक इसके बिना काम करते हैं।',
    }],
    ['hi', true, {
      safetyBoundary: 'हर फ़ील्ड खुद जाँचें। ChallanSakshi ने कुछ नहीं भेजा है।',
      selfRole: 'मेरा मामला',
      helperRole: 'मौजूद व्यक्ति की मदद',
      helperSubmitBoundary: 'व्यक्ति को खुद साइन इन, घोषणा और आधिकारिक साइट पर जमा करना होगा; मददगार यह नहीं करेगा।',
      returnStates: ['मुझे पावती दिखी', 'आधिकारिक साइट नहीं चली', 'मैंने नहीं भेजा', 'मुझे अपना पैक ठीक करना है'],
      selfReturnBasis: 'यह आपने बताया है। ChallanSakshi ने इसकी जाँच नहीं की।',
      helperReturnBasis: 'मौजूद व्यक्ति ने बताया; मददगार ने केवल लिखा। ChallanSakshi ने जाँच नहीं की।',
      helperIndependence: 'यह मददगार वैकल्पिक है। फ़ील्ड पैक और आधिकारिक लिंक इसके बिना भी काम करते हैं।',
    }],
  ] as const)('preserves every role, return, and helper boundary in %s simple=%s', (language, simpleMode, expected) => {
    const copy = getOfficialHandoffPresentation(language, simpleMode);
    expect(copy.safetyBoundary).toBe(expected.safetyBoundary);
    expect(copy.roles.self.heading).toBe(expected.selfRole);
    expect(copy.roles.helper.heading).toBe(expected.helperRole);
    expect(copy.roles.helper.submitBoundary).toBe(expected.helperSubmitBoundary);
    expect(Object.values(copy.returnStates)).toEqual(expected.returnStates);
    expect(copy.returnBasis.self).toBe(expected.selfReturnBasis);
    expect(copy.returnBasis.helper).toBe(expected.helperReturnBasis);
    expect(copy.helper.independence).toBe(expected.helperIndependence);
    expect(copy.purpose['official-service']).toBe(language === 'hi' ? 'आधिकारिक सेवा' : 'Official service');
    expect(Object.keys(copy.returnAnnouncements)).toEqual(['self', 'helper']);
    expect(Object.keys(copy.roles.helper.confirmations)).toEqual([
      'affectedPersonPresent',
      'affectedPersonInspectedEvidence',
      'affectedPersonInspectedReadableRecord',
      'affectedPersonConfirmedEntitlement',
      'affectedPersonRequestedPreparation',
      'affectedPersonConfirmedPack',
    ]);
    expect(Object.keys(copy.returnAuthorization)).toEqual([
      'affectedPersonPresent',
      'affectedPersonRequestedReturnRecording',
      'affectedPersonConfirmedReturnState',
      'affectedPersonConfirmedReferenceFragment',
    ]);
    expect(Object.keys(copy.helper.confirmations)).toEqual([
      'supportedDesktop',
      'boundedSafetyReview',
      'affectedPersonPresent',
      'affectedPersonReviewedFields',
      'affectedPersonRequestedPreparation',
    ]);
  });

  it.each([false, true])('contains no English fallback copy in Hindi simple=%s', (simpleMode) => {
    const copy = getOfficialHandoffPresentation('hi', simpleMode);
    const values: string[] = [];
    const collect = (value: unknown) => {
      if (typeof value === 'string') values.push(value);
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(copy);
    expect(values.length).toBeGreaterThan(40);
    expect(values.every((value) => /[\u0900-\u097f]/u.test(value))).toBe(true);
  });

  it.each([
    ['en', false], ['en', true], ['hi', false], ['hi', true],
  ] as const)('has a closed localized checklist in %s simple=%s', (language, simpleMode) => {
    const copy = getOfficialHandoffPresentation(language, simpleMode);
    for (const route of ['legacy', 'nextgen'] as const) {
      expect(copy.checklists[route]).toHaveLength(3);
      if (language === 'hi') {
        expect(copy.checklists[route].every((item) => /[\u0900-\u097f]/u.test(item))).toBe(true);
        expect(copy.checklists[route].join(' ')).not.toMatch(/Enter|Choose|Review|official service|attachment/);
      }
    }
  });
});

describe('presentation authority, privacy, and responsive contracts', () => {
  it('keeps both components free of decision, routing, browser, storage, network, and extension authority', () => {
    for (const source of [panelSource, helperSource]) {
      expect(source).not.toMatch(/\b(?:window|navigator|document|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket|EventSource)\b/);
      expect(source).not.toMatch(/\b(?:resolveOfficialDestination|buildOfficialHandoffPack|recordOfficialLinkActivation|recordCitizenReturn|serializeOfficialHandoffReceipt|buildRealExtensionHandoffEnvelope|evaluatePublicExtensionRelease)\b/);
      expect(source).not.toMatch(/\b(?:chrome|browser)\.(?:runtime|tabs|storage|scripting)/);
      expect(source).not.toMatch(/window\.open|chrome-extension:|dangerouslySetInnerHTML/);
    }
    expect(panelSource).toContain("import type { OfficialHandoffPack }");
    expect(panelSource).toContain("import type { OfficialHandoffReceiptState }");
    expect(helperSource).toContain("import type { PublicExtensionRelease }");
  });

  it('removes filename and File state from metadata, evidence inputs, selection state, signatures, and focused fixtures', () => {
    for (const { path, source } of privacySources) {
      expect(source, path).not.toMatch(/\b(?:recordName|photographName)\b/);
      expect(source, path).not.toMatch(/\.meta\.name\b/);
      expect(source, path).not.toMatch(/\bfile\s*:\s*File\b/);
      expect(source, path).not.toMatch(/Pick<File,\s*['"]name['"]/);
    }
    const reviewSource = privacySources.find(({ path }) => path.endsWith('CitizenReviewApp.tsx'))?.source ?? '';
    expect(reviewSource).toMatch(/recordSelected:\s*Boolean\(recordSelection\)/);
    expect(reviewSource).toMatch(/photographSelected:\s*Boolean\(photographSelection\)/);
    expect(reviewSource).not.toMatch(/recordSelection\?\.meta\.(?:type|size|previewKind)|photographSelection\?\.meta\.(?:type|size|previewKind)/);
  });

  it('uses the existing palette and list rhythm with selectable values, visible focus, 48px controls, and 16px narrow text', () => {
    expect(panelStyles).toMatch(/var\(--pb-(?:ink|muted|teal|teal-dark|navy|paper|card|line)\)/);
    expect(panelStyles).not.toMatch(/grid-template-columns:\s*repeat\(/);
    expect(panelStyles).toMatch(/\.selectableValue\s*\{[^}]*user-select:\s*text/);
    expect(panelStyles).toMatch(/\.(?:action|copyButton|officialAnchor)[^{]*\{[^}]*min-height:\s*(?:48|5\d)px/);
    expect(panelStyles).toMatch(/\.confirmation[^}]*min-height:\s*(?:48|5\d)px/);
    expect(panelStyles).toMatch(/\.returnChoice[^}]*min-height:\s*(?:48|5\d)px/);
    expect(panelStyles).toMatch(/\.primaryAction\s*\{[^}]*background:/);
    expect(panelStyles).toMatch(/\.secondaryAction\s*\{[^}]*background:/);
    expect(panelStyles).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    expect(helperStyles).toMatch(/\.action[^{]*\{[^}]*min-height:\s*(?:48|5\d)px/);
    expect(helperStyles).toMatch(/\.confirmation[^}]*min-height:\s*(?:48|5\d)px/);
    expect(helperStyles).toMatch(/\.secondaryAction\s*\{[^}]*background:/);
    expect(helperStyles).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    const panelMobile = mediaBlock(panelStyles, '(max-width: 420px)');
    const helperMobile = mediaBlock(helperStyles, '(max-width: 420px)');
    expect(panelMobile).toMatch(/font-size:\s*16px/);
    expect(helperMobile).toMatch(/font-size:\s*16px/);
    expect(helperStyles).toMatch(/\.capsule\s*\{[^}]*display:\s*none/);
  });
});
