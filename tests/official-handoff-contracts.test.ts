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

function eligibleDraft(pack: OfficialHandoffPack, overrides: Partial<OfficialHandoffDraft> = {}): OfficialHandoffDraft {
  return {
    status: 'eligible',
    eligibilityReason: 'action-ready',
    routeKey: 'nextgen',
    destination: destinationFor(pack),
    mappedCategory: null,
    normalizedDescription: pack.description,
    descriptionCodePointCount: Array.from(pack.description).length,
    descriptionError: null,
    checklist: pack.checklist,
    resultRevisionId: pack.resultRevisionId,
    packRevisionId: pack.packRevisionId,
    ...overrides,
  } as OfficialHandoffDraft;
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
    expect(panelSource).toMatch(/onCopyField\('description',\s*draft\.normalizedDescription\)/);
    expect(panelSource).not.toMatch(/onCopyField[\s\S]{0,180}onOfficialLinkActivate/);
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
      'The official portal was unavailable',
      'I did not submit',
      'I need to correct my pack',
      'Last 4 characters of the official reference, recorded by you',
      'Citizen-reported; not verified by ChallanSakshi.',
      'Download redacted continuation receipt',
    ]) expect(html).toContain(label);
    expect(html).not.toContain('full reference');
    expect(html).not.toContain('screenshot');
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
    ['manual', 'manual-route-only', 'This official destination has no verified field-compatible form in this release. Use the official site and review its current options yourself.'],
    ['unresolved', 'route-unresolved', 'The issuing jurisdiction is not confirmed or no current verified route is available. Use only the official services directory.'],
    ['abstained', 'result-not-action-ready', 'This review does not support a confirmed field pack. Check the missing or unclear evidence before preparing official information.'],
  ] as const)('renders the closed %s presentation without category, draft field, or helper', (status, eligibilityReason, expected) => {
    const pack = nextgenPack();
    const draft = {
      ...eligibleDraft(pack),
      status,
      eligibilityReason,
      routeKey: status === 'manual' ? 'delhi-manual' : status === 'unresolved' ? 'unresolved' : 'nextgen',
      mappedCategory: null,
    } as OfficialHandoffDraft;
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft,
      confirmedPack: null,
      extension: publicEnabledExtension,
    })));

    expect(html).toContain('Prepared for');
    expect(html).toContain(expected);
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('Reviewed category');
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
      returnStates: ['I saw an acknowledgement on the official service', 'The official portal was unavailable', 'I did not submit', 'I need to correct my pack'],
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
      returnStates: ['मुझे आधिकारिक सेवा पर पावती दिखी', 'आधिकारिक पोर्टल उपलब्ध नहीं था', 'मैंने जमा नहीं किया', 'मुझे अपने पैक में सुधार करना है'],
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
    expect(panelStyles).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    expect(helperStyles).toMatch(/\.action[^{]*\{[^}]*min-height:\s*(?:48|5\d)px/);
    expect(helperStyles).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    const panelMobile = mediaBlock(panelStyles, '(max-width: 420px)');
    const helperMobile = mediaBlock(helperStyles, '(max-width: 420px)');
    expect(panelMobile).toMatch(/font-size:\s*16px/);
    expect(helperMobile).toMatch(/font-size:\s*16px/);
    expect(helperStyles).toMatch(/\.capsule\s*\{[^}]*display:\s*none/);
  });
});
