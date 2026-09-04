import { readFileSync } from 'node:fs';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
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
import {
  activateCitizenReviewOfficialLink,
  buildCitizenReviewHandoffView,
  changeCitizenReviewPackPermission,
  confirmCitizenReviewHandoffPack,
  createCitizenReviewHandoffController,
  reconcileCitizenReviewCurrentPack,
} from '../lib/citizen-review-handoff-controller';
import type { ActionReadyReviewFacts, CitizenChallanAnswers, ReviewFact } from '../lib/public-challan';

const NOW = '2026-09-03T10:30:00.000Z';
const OPENED_AT = '2026-09-03T11:00:00.000Z';
const RETURNED_AT = '2026-09-03T11:05:00.000Z';
const RESULT_REVISION = '11111111111111111111111111111111';
const PACK_REVISION = '22222222222222222222222222222222';

const SELF_CONFIRMATION = 'I checked the evidence and my vehicle record, I am entitled to raise this matter, and I have reviewed this description.';
const HELPER_REVIEWED = 'The affected person is present, checked the evidence and their vehicle record, and confirmed they are entitled to raise this matter.';
const HELPER_CONFIRMED_PACK = 'They asked me to prepare this and have reviewed and confirmed this description.';
const HELPER_SUBMIT_BOUNDARY = 'The affected person—not the helper—must independently authenticate, declare, and submit on the official service.';
const HELPER_RETURN_CONFIRMATION = 'The affected person is still present and confirmed this return note (and the reference characters, if entered).';
const OPEN_HEADING = 'Open the official service';
const OPEN_BODY = 'Opens echallan.parivahan.nic.in in a new tab. Sign in, check every field, and submit there yourself. Nothing is sent from ChallanSakshi.';

const REMOVED_COPY = [
  'Optional challan number aid',
  'Challan number recorded in this review',
  'Copy challan number',
  'Clipboard history',
  'Keep this factual',
  'Before you leave',
  'You are leaving ChallanSakshi',
  'Review every field before leaving ChallanSakshi',
  'Check every field yourself. ChallanSakshi has not sent anything.',
  'Selected return note',
  'Citizen-reported; not verified by ChallanSakshi.',
  'Affected-person-reported; entered with a present helper.',
  'I inspected the supplied evidence.',
  'I reviewed and confirmed this field pack.',
  'The affected person is present.',
  'The affected person inspected the supplied evidence.',
  'The affected person asked me to prepare this information.',
  'The affected person reviewed and confirmed this field pack.',
  'The affected person is still present for this return note.',
  'The affected person asked me to record what happened.',
  'The affected person confirmed this exact return state.',
  'The affected person confirmed these exact last four characters.',
] as const;

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

const noPackConfirmation = {
  affectedPersonPresent: false,
  affectedPersonInspectedEvidence: false,
  affectedPersonInspectedReadableRecord: false,
  affectedPersonConfirmedEntitlement: false,
  affectedPersonRequestedPreparation: false,
  affectedPersonConfirmedPack: false,
} as const;

const helperReviewContext = {
  role: 'present-helper',
  deviceMode: 'private',
  safetyConsent: {
    manualReviewAcknowledged: true,
    minimumDataAcknowledged: true,
    affectedPersonPresentAcknowledged: true,
  },
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
  onOfficialLinkActivate: () => true,
  onReturnStateChange: () => undefined,
  onReferenceLastFourChange: () => undefined,
  onReturnAffectedPersonPresentChange: () => undefined,
  onReturnRecordingRequestedChange: () => undefined,
  onReturnStateConfirmedChange: () => undefined,
  onReturnReferenceConfirmedChange: () => undefined,
  onRecordReturn: () => undefined,
  onDownloadReceipt: () => undefined,
};

function recordingCallbacks(calls: string[]): OfficialHandoffCallbacks {
  const record = (name: string) => (checked: boolean) => {
    calls.push(`${name}:${checked}`);
  };
  return {
    ...callbacks,
    onAffectedPersonPresentChange: record('present'),
    onAffectedPersonInspectedEvidenceChange: record('evidence'),
    onAffectedPersonInspectedReadableRecordChange: record('record'),
    onAffectedPersonConfirmedEntitlementChange: record('entitlement'),
    onAffectedPersonRequestedPreparationChange: record('requested'),
    onAffectedPersonConfirmedPackChange: record('pack'),
    onReturnAffectedPersonPresentChange: record('return-present'),
    onReturnRecordingRequestedChange: record('return-requested'),
    onReturnStateConfirmedChange: record('return-state'),
    onReturnReferenceConfirmedChange: record('return-reference'),
  };
}

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
    returnReadiness: { status: 'blocked', reason: 'return-state-required' },
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

function checkboxTagForLabel(html: string, label: string): string {
  const labelIndex = html.indexOf(`<span>${label}</span>`);
  if (labelIndex < 0) return '';
  const opening = html.lastIndexOf('<input', labelIndex);
  const closing = html.indexOf('>', opening);
  return html.slice(opening, closing + 1);
}

function primaryActionCount(html: string): number {
  return html.match(/class="[^"]*primaryAction[^"]*"/g)?.length ?? 0;
}

function checkedCheckboxCount(html: string): number {
  return html.match(/type="checkbox" checked=""/g)?.length ?? 0;
}

function findReactElement(
  node: ReactNode,
  predicate: (element: ReactElement) => boolean,
): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findReactElement(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;
  return findReactElement((node.props as { children?: ReactNode }).children, predicate);
}

function confirmationHandler(tree: ReactNode, label: string): (checked: boolean) => void {
  const element = findReactElement(tree, (candidate) => (
    typeof candidate.type === 'function'
    && (candidate.props as { label?: string }).label === label
  ));
  expect(element, label).not.toBeNull();
  return (element!.props as { onChange: (checked: boolean) => void }).onChange;
}

describe('controlled official handoff presentation', () => {
  it('starts after the result with Prepared for and keeps the compact order down to the official anchor', () => {
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps()));
    const ordered = [
      'Prepared for',
      'NextGen e-Challan grievance service',
      'Official grievance service',
      'echallan.parivahan.nic.in',
      'Route last verified',
      'Reviewed description',
      'My case',
      SELF_CONFIRMATION,
      OPEN_HEADING,
      OPEN_BODY,
      'Open NextGen e-Challan grievance service',
    ].map((text) => html.indexOf(text));

    expect(ordered.every((index) => index >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((left, right) => left - right));
    expect(html).not.toContain('Citizen-recorded material inconsistency');
    expect(html).not.toContain('The photo and vehicle record look different');
    for (const removed of REMOVED_COPY) expect(html, removed).not.toContain(removed);
  });

  it('renders the private description copy control and a polite non-destructive failure state', () => {
    const props = panelProps({
      copyStatus: { status: 'failed', field: 'description' },
    });
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, props));

    expect(html).toContain('Copy reviewed description');
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

  it('preserves native anchor semantics, prevents an expired transition, and allows a current transition', () => {
    let controller = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
    });
    for (const key of [
      'affectedPersonInspectedEvidence',
      'affectedPersonInspectedReadableRecord',
      'affectedPersonConfirmedEntitlement',
    ] as const) controller = changeCitizenReviewPackPermission(controller, key, true, {
      resultRevisionId: controller.resultRevisionId,
      packRevisionId: PACK_REVISION,
    });
    const input = {
      answers: {
        sourceStatus: 'official-service',
        imageInspected: true,
        plateObservation: 'different',
        categoryObservation: 'match',
        colourObservation: 'match',
        offenceObservation: 'appears-visible',
        timestampStatus: 'displayed',
        locationStatus: 'displayed',
        ownRecordAvailable: 'present',
        noticeCopyAvailable: 'present',
        custodyRecordAvailable: 'not-applicable',
      },
      factsConfirmed: true,
      jurisdictionConfirmation: { status: 'confirmed', code: 'KA' },
      role: 'self',
      deviceMode: 'private',
      language: 'en',
      simpleMode: false,
      nowIso: NOW,
    } as const;
    let currentView = buildCitizenReviewHandoffView(controller, input);
    controller = confirmCitizenReviewHandoffPack(controller, {
      view: currentView,
      sourceKind: 'official-service',
      nowIso: NOW,
    });
    currentView = buildCitizenReviewHandoffView(controller, input);
    const expiredView = buildCitizenReviewHandoffView(controller, {
      ...input,
      nowIso: new Date(Date.parse(OFFICIAL_DESTINATIONS.nextgen.expiresAt) + 86_400_000).toISOString(),
    });

    for (const [label, actionView, expectedPrevented] of [
      ['expired', expiredView, true],
      ['current', currentView, false],
    ] as const) {
      let activationCalls = 0;
      const rendered = OfficialHandoffPanel(panelProps({
        draft: currentView.draft,
        confirmedPack: controller.confirmedPack,
        callbacks: {
          ...callbacks,
          onOfficialLinkActivate: () => {
            activationCalls += 1;
            const reconciled = reconcileCitizenReviewCurrentPack(controller, actionView, {
              resultRevisionId: '99999999999999999999999999999999',
              packRevisionId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            });
            if (reconciled !== controller) return false;
            return activateCitizenReviewOfficialLink(controller, actionView, actionView.nowIso) !== controller;
          },
        },
      }));
      const anchor = findReactElement(rendered, (element) => (
        element.type === 'a'
        && (element.props as { href?: string }).href === OFFICIAL_DESTINATIONS.nextgen.canonicalUrl
      ));
      expect(anchor, label).not.toBeNull();

      let prevented = false;
      const anchorProps = anchor!.props as {
        href: string;
        target: string;
        rel: string;
        onClick?: (event: { preventDefault: () => void }) => void;
      };
      anchorProps.onClick?.({ preventDefault: () => { prevented = true; } });

      expect(activationCalls, label).toBe(1);
      expect(prevented, label).toBe(expectedPrevented);
      expect(anchorProps.href).toBe(OFFICIAL_DESTINATIONS.nextgen.canonicalUrl);
      expect(anchorProps.target).toBe('_blank');
      expect(anchorProps.rel).toBe('noreferrer');
    }
  });

  it('collapses the self role into one checkbox that drives all four permission callbacks in order', () => {
    const calls: string[] = [];
    const unconfirmedProps = panelProps({
      confirmedPack: null,
      packConfirmation: noPackConfirmation,
      callbacks: recordingCallbacks(calls),
    });
    const rendered = OfficialHandoffPanel(unconfirmedProps);
    const html = renderToStaticMarkup(rendered);

    expect(html.match(/type="checkbox"/g)).toHaveLength(1);
    expect(checkedCheckboxCount(html)).toBe(0);
    expect(html).toContain(SELF_CONFIRMATION);
    expect(html).not.toContain(OPEN_HEADING);
    expect(html).not.toContain(OFFICIAL_DESTINATIONS.nextgen.canonicalUrl);

    const onChange = confirmationHandler(rendered, SELF_CONFIRMATION);
    onChange(true);
    expect(calls).toEqual(['evidence:true', 'record:true', 'entitlement:true', 'pack:true']);
    calls.length = 0;
    onChange(false);
    expect(calls).toEqual(['evidence:false', 'record:false', 'entitlement:false', 'pack:false']);

    expect(checkedCheckboxCount(renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps())))).toBe(1);
    for (const key of [
      'affectedPersonInspectedEvidence',
      'affectedPersonInspectedReadableRecord',
      'affectedPersonConfirmedEntitlement',
      'affectedPersonConfirmedPack',
    ] as const) {
      const partial = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
        packConfirmation: { ...packConfirmation, [key]: false },
      })));
      expect(checkedCheckboxCount(partial), key).toBe(0);
    }
  });

  it('collapses the helper role into two ordered checkboxes with the pack confirmation gated on the review', () => {
    const calls: string[] = [];
    const pack = nextgenPack('present-helper');
    const render = (confirmation: OfficialHandoffPanelProps['packConfirmation']) => {
      const props = panelProps({
        reviewContext: helperReviewContext,
        draft: eligibleDraft(pack),
        confirmedPack: confirmation.affectedPersonConfirmedPack ? pack : null,
        packConfirmation: confirmation,
        callbacks: recordingCallbacks(calls),
      });
      const tree = OfficialHandoffPanel(props);
      return { tree, html: renderToStaticMarkup(tree) };
    };

    const untouched = render(noPackConfirmation);
    expect(untouched.html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(checkedCheckboxCount(untouched.html)).toBe(0);
    expect(checkboxTagForLabel(untouched.html, HELPER_REVIEWED)).not.toContain('disabled=""');
    expect(checkboxTagForLabel(untouched.html, HELPER_CONFIRMED_PACK)).toContain('disabled=""');
    expect(untouched.html.indexOf(HELPER_CONFIRMED_PACK)).toBeLessThan(untouched.html.indexOf(HELPER_SUBMIT_BOUNDARY));
    expect(untouched.html.indexOf(HELPER_REVIEWED)).toBeLessThan(untouched.html.indexOf(HELPER_CONFIRMED_PACK));

    confirmationHandler(untouched.tree, HELPER_REVIEWED)(true);
    expect(calls).toEqual(['present:true', 'evidence:true', 'record:true', 'entitlement:true']);
    calls.length = 0;

    const reviewed = render({
      ...noPackConfirmation,
      affectedPersonPresent: true,
      affectedPersonInspectedEvidence: true,
      affectedPersonInspectedReadableRecord: true,
      affectedPersonConfirmedEntitlement: true,
    });
    expect(checkedCheckboxCount(reviewed.html)).toBe(1);
    expect(checkboxTagForLabel(reviewed.html, HELPER_REVIEWED)).toContain('checked=""');
    expect(checkboxTagForLabel(reviewed.html, HELPER_CONFIRMED_PACK)).not.toContain('disabled=""');
    expect(reviewed.html).not.toContain(OFFICIAL_DESTINATIONS.nextgen.canonicalUrl);

    confirmationHandler(reviewed.tree, HELPER_CONFIRMED_PACK)(true);
    expect(calls).toEqual(['requested:true', 'pack:true']);
    calls.length = 0;

    const confirmed = render(packConfirmation);
    expect(checkedCheckboxCount(confirmed.html)).toBe(2);
    expect(confirmed.html).toContain(`href="${OFFICIAL_DESTINATIONS.nextgen.canonicalUrl}"`);

    confirmationHandler(confirmed.tree, HELPER_REVIEWED)(false);
    expect(calls).toEqual(['present:false', 'evidence:false', 'record:false', 'entitlement:false']);
    calls.length = 0;
    confirmationHandler(confirmed.tree, HELPER_CONFIRMED_PACK)(false);
    expect(calls).toEqual(['requested:false', 'pack:false']);

    for (const removed of REMOVED_COPY) expect(confirmed.html, removed).not.toContain(removed);
  });

  it('shows only the re-confirmed helper presence as unchecked after departure invalidates every prior assertion', () => {
    const firstResultRevision = '33333333333333333333333333333333';
    const firstPackRevision = '44444444444444444444444444444444';
    let state = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
      role: 'present-helper',
    });
    for (const key of [
      'affectedPersonPresent',
      'affectedPersonInspectedEvidence',
      'affectedPersonInspectedReadableRecord',
      'affectedPersonConfirmedEntitlement',
      'affectedPersonRequestedPreparation',
    ] as const) {
      state = changeCitizenReviewPackPermission(state, key, true, {
        resultRevisionId: firstResultRevision,
        packRevisionId: firstPackRevision,
      });
    }
    const allPermitted = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      reviewContext: helperReviewContext,
      confirmedPack: null,
      packConfirmation: state.packConfirmation,
    })));
    expect(checkedCheckboxCount(allPermitted)).toBe(1);
    expect(checkboxTagForLabel(allPermitted, HELPER_REVIEWED)).toContain('checked=""');
    expect(checkboxTagForLabel(allPermitted, HELPER_CONFIRMED_PACK)).not.toContain('checked=""');
    expect(checkboxTagForLabel(allPermitted, HELPER_CONFIRMED_PACK)).not.toContain('disabled=""');

    state = changeCitizenReviewPackPermission(state, 'affectedPersonPresent', false, {
      resultRevisionId: '55555555555555555555555555555555',
      packRevisionId: '66666666666666666666666666666666',
    });
    state = changeCitizenReviewPackPermission(state, 'affectedPersonPresent', true, {
      resultRevisionId: '77777777777777777777777777777777',
      packRevisionId: '88888888888888888888888888888888',
    });
    const returned = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      reviewContext: helperReviewContext,
      confirmedPack: null,
      packConfirmation: state.packConfirmation,
    })));

    expect(checkedCheckboxCount(returned)).toBe(0);
    expect(checkboxTagForLabel(returned, HELPER_CONFIRMED_PACK)).toContain('disabled=""');
    expect(returned).toContain(HELPER_REVIEWED);
    expect(returned).toContain(HELPER_CONFIRMED_PACK);
  });

  it.each([
    ['en', 'failed', 'category', 'Copy failed. The reviewed category remains visible and selectable; copy it manually. Nothing opened.'],
    ['en', 'failed', 'description', 'Copy failed. The reviewed description remains visible and selectable; copy it manually. Nothing opened.'],
    ['en', 'copied', 'category', 'Reviewed category copied. Nothing opened or was submitted.'],
    ['en', 'copied', 'description', 'Reviewed description copied. Nothing opened or was submitted.'],
    ['hi', 'failed', 'category', 'कॉपी नहीं हुई। समीक्षित श्रेणी दिखती और चुनी जा सकती है; इसे स्वयं कॉपी करें। कुछ नहीं खुला।'],
    ['hi', 'failed', 'description', 'कॉपी नहीं हुई। समीक्षित विवरण दिखता और चुना जा सकता है; इसे स्वयं कॉपी करें। कुछ नहीं खुला।'],
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
      category: 'Wrong Image',
      description: draft.normalizedDescription,
    } as const;

    expect(html).toContain(selectableValues[field]);
    expect(html.split(expected)).toHaveLength(2);
    expect(html).toMatch(/role="status" aria-live="polite" aria-atomic="true"/);
    expect(html).toContain(`href="${draft.destination.canonicalUrl}"`);
    expect(html).toContain('target="_blank"');
  });

  it('renders no challan-number lookup aid and keeps a stale lookup copy status silent', () => {
    for (const copyStatus of [
      { status: 'idle' },
      { status: 'copied', field: 'lookup' },
      { status: 'failed', field: 'lookup' },
    ] as const) {
      const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({ copyStatus })));
      expect(html).not.toContain('TEST-LOOKUP-42');
      expect(html).not.toContain('Optional challan number aid');
      expect(html).not.toContain('Copy challan number');
      expect(html).not.toContain('Challan number copied');
      expect(html).not.toContain('The challan number remains visible');
      expect(html).not.toMatch(/<input[^>]*autoComplete="off"/);
      expect(html).not.toContain('id="handoff-lookup"');
      expect(html).toMatch(/<div[^>]*aria-label="Copy status"[^>]*role="status" aria-live="polite" aria-atomic="true"><\/div>/);
    }
    expect(panelSource).not.toMatch(/onLookupValueChange\(/);
    expect(panelSource).not.toMatch(/onCopyField\('lookup'/);
    expect(panelSource).not.toMatch(/copyLookup|lookupHeading|lookupLabel|lookupWarning/);
  });

  it.each([
    ['en', false], ['en', true], ['hi', false], ['hi', true],
  ] as const)('drops the clipboard warning, factual hint, checklist, and leaving boundary in %s simple=%s', (language, simpleMode) => {
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({ language, simpleMode })));
    expect(html).not.toMatch(/Clipboard history|क्लिपबोर्ड इतिहास/);
    expect(html).not.toMatch(/Keep this factual|इसे तथ्यात्मक रखें/);
    expect(html).not.toMatch(/Before you leave|जाने से पहले/);
    expect(html).not.toMatch(/You are leaving ChallanSakshi|आप ChallanSakshi छोड़ रहे हैं/);
    expect(html).not.toMatch(/Review every field before leaving|Check every field yourself\. ChallanSakshi has not sent anything|ChallanSakshi छोड़ने से पहले हर फ़ील्ड जाँचें|हर फ़ील्ड खुद जाँचें/);
    expect(html).not.toContain('<ul');
    expect(html).toContain(getOfficialHandoffPresentation(language, simpleMode).openHeading);
    expect(html).toContain(getOfficialHandoffPresentation(language, simpleMode).openBody.replace('{domain}', 'echallan.parivahan.nic.in'));
    expect(html).not.toContain('{domain}');
  });

  it('keeps description and category copy locked until the current confirmed pack is supplied', () => {
    const pack = nextgenPack();
    const draft = eligibleDraft(pack, {
      mappedCategory: { label: 'Reviewed category', value: 'Wrong Image' },
    });
    const locked = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft,
      confirmedPack: null,
    })));
    expect(locked).not.toContain('Copy reviewed description');
    expect(locked).not.toContain('Copy reviewed category');
    expect(locked).not.toContain(OPEN_HEADING);

    const ready = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({ draft, confirmedPack: pack })));
    expect(ready).toContain('Copy reviewed description');
    expect(ready).toContain('Copy reviewed category');
    expect(ready).toContain(OPEN_HEADING);
  });

  it.each(['abstained'] as const)('never exposes a grievance destination for %s results without a pack', (status) => {
    const pack = nextgenPack();
    const draft: OfficialHandoffDraft = {
      ...eligibleDraft(pack),
      status,
      eligibilityReason: 'result-not-action-ready',
    };
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft,
      confirmedPack: null,
    })));
    expect(html).not.toContain('Official grievance service');
    expect(html).not.toContain('NextGen e-Challan grievance service');
    expect(html).not.toContain(OFFICIAL_DESTINATIONS.nextgen.canonicalUrl);
  });

  it.each([
    ['consistent', { plateObservation: 'match' }],
    ['inconclusive', { plateObservation: 'unclear' }],
    ['missing-image', { imageInspected: false }],
    ['missing-readable-record', { ownRecordAvailable: 'missing' }],
    ['message-only', { sourceStatus: 'message-only' }],
  ] as const)('renders the real %s projection without a grievance destination', (_name, overrides) => {
    const answers: CitizenChallanAnswers = {
      sourceStatus: 'official-service',
      imageInspected: true,
      plateObservation: 'different',
      categoryObservation: 'match',
      colourObservation: 'match',
      offenceObservation: 'appears-visible',
      timestampStatus: 'displayed',
      locationStatus: 'displayed',
      ownRecordAvailable: 'present',
      noticeCopyAvailable: 'present',
      custodyRecordAvailable: 'not-applicable',
      ...overrides,
    };
    const state = createCitizenReviewHandoffController({
      resultRevisionId: RESULT_REVISION,
      packRevisionId: PACK_REVISION,
    });
    const view = buildCitizenReviewHandoffView(state, {
      answers,
      factsConfirmed: true,
      jurisdictionConfirmation: { status: 'confirmed', code: 'KA' },
      role: 'self',
      deviceMode: 'private',
      language: 'en',
      simpleMode: false,
      nowIso: NOW,
    });
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      draft: view.draft,
      confirmedPack: null,
      receiptState: null,
    })));

    expect(view.draft.status).toBe('abstained');
    expect(html).not.toContain(OFFICIAL_DESTINATIONS.nextgen.serviceName);
    expect(html).not.toContain(OFFICIAL_DESTINATIONS.nextgen.canonicalUrl);
    expect(html).not.toContain('data-purpose="official-grievance-service"');
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
      copyStatus: { status: 'copied', field: 'description' },
    })));
    const failedHtml = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      copyStatus: { status: 'failed', field: 'description' },
    })));
    const idleRegion = idleHtml.match(/<div[^>]*aria-label="Copy status"[^>]*><\/div>/)?.[0];
    const copiedRegion = copiedHtml.match(/<div[^>]*aria-label="Copy status"[^>]*>Reviewed description copied\.[^<]*<\/div>/)?.[0];
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
    expect(descriptionSection).toContain('<textarea');
    expect(descriptionSection).toContain(expected);
    expect(descriptionSection).toContain('role="status"');
    expect(descriptionSection).toContain('aria-live="polite"');
  });

  it('keeps shared-device values selectable while omitting clipboard, receipt, reference, and helper controls', () => {
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
      returnReadiness: { status: 'ready' },
    })));

    for (const label of [
      'I saw an acknowledgement on the official service',
      'The official portal did not work for me',
      'I did not submit',
      'I need to correct my pack',
      'Last 4 characters of the official reference, recorded by you',
      'Return note recorded in this tab only. Citizen-reported and unverified; not a submission or official acceptance.',
      'Download redacted continuation receipt',
    ]) expect(html).toContain(label);
    expect(html.match(/type="checkbox"/g)?.length ?? 0).toBe(1);
    expect(html).not.toContain('full reference');
    expect(html).not.toContain('screenshot');
    for (const removed of REMOVED_COPY) expect(html, removed).not.toContain(removed);
  });

  it.each([
    ['affected-person-present-required', 'The affected person must still be present.'],
    ['affected-person-recording-request-required', 'The affected person must confirm this return note.'],
    ['affected-person-return-state-confirmation-required', 'The affected person must confirm what happened.'],
    ['affected-person-reference-confirmation-required', 'The affected person must confirm the four reference characters.'],
    ['reference-fragment-incomplete', 'Enter exactly four reference characters or leave the field blank.'],
    ['return-state-required', 'Choose what happened on the official service.'],
  ] as const)('disables premature return recording and exposes the plain %s blocker', (reason, expected) => {
    const pack = nextgenPack('present-helper');
    const activated = recordOfficialLinkActivation(
      createOfficialHandoffReceiptSession(pack, 'private'),
      pack,
      OPENED_AT,
    );
    const html = renderToStaticMarkup(createElement(OfficialHandoffPanel, panelProps({
      reviewContext: helperReviewContext,
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      receiptState: activated,
      returnDraft: { selectedReturnState: 'not-submitted', referenceLastFour: '' },
      returnReadiness: { status: 'blocked', reason },
    })));
    expect(html).toContain(expected);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="handoff-return-readiness"/);
    expect(html).toContain('id="handoff-return-readiness"');
  });

  it.each([
    ['en', false, {
      opened: 'Official service opened from this review. ChallanSakshi cannot see what happened there.',
      recorded: 'Return note recorded in this tab only. Citizen-reported and unverified; not a submission or official acceptance.',
      dropped: ['Selected return note:', 'Citizen-reported and unverified; this does not show submission or acceptance.', 'Citizen-reported; not verified by ChallanSakshi.'],
    }],
    ['en', true, {
      opened: 'Official service opened from this review. ChallanSakshi cannot see what happened there.',
      recorded: 'Your return note is recorded only on this tab and is not verified. ChallanSakshi did not submit it or verify acceptance.',
      dropped: ['You selected:', 'You reported this; it is not verified.', 'You reported this. ChallanSakshi did not verify it.'],
    }],
    ['hi', false, {
      opened: 'आधिकारिक सेवा इस समीक्षा से खोली गई। ChallanSakshi वहाँ हुई कार्रवाई नहीं देख सकता।',
      recorded: 'वापसी नोट केवल इस टैब में दर्ज हुआ। नागरिक द्वारा बताया गया और असत्यापित; यह जमा या आधिकारिक स्वीकृति नहीं है।',
      dropped: ['चुना गया वापसी नोट:', 'नागरिक द्वारा बताया गया; ChallanSakshi ने सत्यापित नहीं किया।'],
    }],
    ['hi', true, {
      opened: 'आधिकारिक सेवा इस समीक्षा से खोली गई। ChallanSakshi वहाँ हुई कार्रवाई नहीं देख सकता।',
      recorded: 'आपका वापसी नोट केवल इस टैब में दर्ज है और सत्यापित नहीं है। ChallanSakshi ने इसे जमा नहीं किया या स्वीकृति सत्यापित नहीं की।',
      dropped: ['आपने चुना:', 'यह आपने बताया है। ChallanSakshi ने इसकी जाँच नहीं की।'],
    }],
  ] as const)('announces the opened line and exactly one recorded line in %s simple=%s', (language, simpleMode, expected) => {
    const pack = nextgenPack();
    const activatedReceipt = recordOfficialLinkActivation(createOfficialHandoffReceiptSession(pack, 'private'), pack, OPENED_AT);
    const receipt = recordCitizenReturn(
      activatedReceipt,
      pack,
      { selectedReturnState: 'acknowledgement-seen', localTimestamp: RETURNED_AT },
    );
    const base = panelProps({
      language,
      simpleMode,
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour: '' },
    });
    const selected = renderToStaticMarkup(createElement(OfficialHandoffPanel, { ...base, receiptState: activatedReceipt }));
    const recorded = renderToStaticMarkup(createElement(OfficialHandoffPanel, { ...base, receiptState: receipt }));

    expect(selected).toContain(expected.opened);
    expect(selected).not.toContain(expected.recorded);
    expect(recorded).toContain(expected.opened);
    expect(recorded.split(expected.recorded)).toHaveLength(2);
    expect(recorded.match(/role="status" aria-live="polite"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    for (const dropped of expected.dropped) {
      expect(selected, dropped).not.toContain(dropped);
      expect(recorded, dropped).not.toContain(dropped);
    }
    expect(recorded).not.toContain('submission observed');
    expect(recorded).not.toContain('officially accepted');
  });

  it.each([
    ['en', false, {
      recorded: 'Return note recorded in this tab only for the affected person. Affected-person-reported and entered by the present helper; unverified. Not a submission or official acceptance.',
      forbiddenSelfAttribution: 'Citizen-reported and unverified',
      submitBoundary: HELPER_SUBMIT_BOUNDARY,
      returnConfirmation: HELPER_RETURN_CONFIRMATION,
    }],
    ['en', true, {
      recorded: 'Return note for the present person is recorded only on this tab. The helper only typed it; it is not verified. ChallanSakshi did not submit it or verify acceptance.',
      forbiddenSelfAttribution: 'You reported this; it is not verified',
      submitBoundary: 'The person—not the helper—must sign in, declare, and submit on the official site.',
      returnConfirmation: 'The person is still here and confirmed this return note (and the reference characters, if entered).',
    }],
    ['hi', false, {
      recorded: 'प्रभावित व्यक्ति का वापसी नोट केवल इस टैब में दर्ज हुआ। प्रभावित व्यक्ति द्वारा बताया गया और मौजूद मददगार द्वारा दर्ज; असत्यापित। यह जमा या आधिकारिक स्वीकृति नहीं है।',
      forbiddenSelfAttribution: 'नागरिक द्वारा बताया गया और असत्यापित',
      submitBoundary: 'मददगार नहीं, प्रभावित व्यक्ति को आधिकारिक सेवा पर स्वयं प्रमाणीकरण, घोषणा और जमा करना होगा।',
      returnConfirmation: 'प्रभावित व्यक्ति अभी भी मौजूद है और उसने यह वापसी नोट (और दर्ज किए गए संदर्भ अक्षर, यदि कोई हों) पुष्ट किया है।',
    }],
    ['hi', true, {
      recorded: 'मौजूद व्यक्ति का वापसी नोट केवल इस टैब में दर्ज है। मददगार ने केवल लिखा; यह सत्यापित नहीं है। ChallanSakshi ने इसे जमा नहीं किया या स्वीकृति सत्यापित नहीं की।',
      forbiddenSelfAttribution: 'यह आपने बताया है और सत्यापित नहीं है',
      submitBoundary: 'व्यक्ति को खुद साइन इन, घोषणा और आधिकारिक साइट पर जमा करना होगा; मददगार यह नहीं करेगा।',
      returnConfirmation: 'व्यक्ति अभी भी यहाँ है और उसने यह वापसी नोट (और लिखे गए संदर्भ अक्षर, अगर कोई हों) पुष्ट किया है।',
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
      reviewContext: helperReviewContext,
      draft: eligibleDraft(pack),
      confirmedPack: pack,
      officialLinkStatus: 'activated',
      receiptState: receipt,
      returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour: '' },
    })));

    expect(html.split(expected.recorded)).toHaveLength(2);
    expect(html).not.toContain(expected.forbiddenSelfAttribution);
    expect(html.split(expected.submitBoundary)).toHaveLength(2);
    expect(html).toContain(expected.returnConfirmation);
  });

  it('collapses the helper return authorization into one checkbox that covers the reference fragment only when entered', () => {
    const pack = nextgenPack('present-helper');
    const activated = recordOfficialLinkActivation(
      createOfficialHandoffReceiptSession(pack, 'private'),
      pack,
      OPENED_AT,
    );
    const calls: string[] = [];
    const render = (
      referenceLastFour: string,
      returnAuthorization: OfficialHandoffPanelProps['returnAuthorization'],
    ) => {
      const tree = OfficialHandoffPanel(panelProps({
        reviewContext: helperReviewContext,
        draft: eligibleDraft(pack),
        confirmedPack: pack,
        officialLinkStatus: 'activated',
        receiptState: activated,
        returnDraft: { selectedReturnState: 'acknowledgement-seen', referenceLastFour },
        returnAuthorization,
        callbacks: recordingCallbacks(calls),
      }));
      return { tree, html: renderToStaticMarkup(tree) };
    };
    const none = {
      affectedPersonPresent: false,
      affectedPersonRequestedReturnRecording: false,
      affectedPersonConfirmedReturnState: false,
      affectedPersonConfirmedReferenceFragment: false,
    } as const;
    const withoutFragment = { ...none, affectedPersonPresent: true, affectedPersonRequestedReturnRecording: true, affectedPersonConfirmedReturnState: true } as const;

    const fragmentEntered = render('A1B2', none);
    expect(fragmentEntered.html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(checkboxTagForLabel(fragmentEntered.html, HELPER_RETURN_CONFIRMATION)).not.toContain('checked=""');
    confirmationHandler(fragmentEntered.tree, HELPER_RETURN_CONFIRMATION)(true);
    expect(calls).toEqual(['return-present:true', 'return-requested:true', 'return-state:true', 'return-reference:true']);
    calls.length = 0;
    confirmationHandler(fragmentEntered.tree, HELPER_RETURN_CONFIRMATION)(false);
    expect(calls).toEqual(['return-requested:false', 'return-state:false', 'return-reference:false']);
    calls.length = 0;

    const blank = render('', none);
    confirmationHandler(blank.tree, HELPER_RETURN_CONFIRMATION)(true);
    expect(calls).toEqual(['return-present:true', 'return-requested:true', 'return-state:true']);
    calls.length = 0;
    confirmationHandler(blank.tree, HELPER_RETURN_CONFIRMATION)(false);
    expect(calls).toEqual(['return-requested:false', 'return-state:false']);

    expect(checkboxTagForLabel(render('', withoutFragment).html, HELPER_RETURN_CONFIRMATION)).toContain('checked=""');
    expect(checkboxTagForLabel(render('A1B2', withoutFragment).html, HELPER_RETURN_CONFIRMATION)).not.toContain('checked=""');
    expect(checkboxTagForLabel(
      render('A1B2', { ...withoutFragment, affectedPersonConfirmedReferenceFragment: true }).html,
      HELPER_RETURN_CONFIRMATION,
    )).toContain('checked=""');
    for (const removed of REMOVED_COPY) expect(fragmentEntered.html, removed).not.toContain(removed);
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
    expect(html).toContain('Opens echallan.parivahan.gov.in in a new tab.');
  });

  it.each([
    {
      status: 'manual',
      destinationKey: 'delhi-manual',
      exposesRoute: true,
      expected: 'This official destination has no verified field-compatible form in this release. Use the official site and review its current options yourself.',
    },
    {
      status: 'unresolved',
      destinationKey: 'unresolved',
      exposesRoute: true,
      expected: 'The issuing jurisdiction is not confirmed or no current verified route is available. Use only the official services directory.',
    },
    {
      status: 'abstained',
      destinationKey: 'nextgen',
      exposesRoute: false,
      expected: 'This review does not support a confirmed field pack. Check the missing or unclear evidence before preparing official information.',
    },
  ] as const)('renders the closed $status presentation as one line with the anchor directly below', ({ status, destinationKey, exposesRoute, expected }) => {
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
    expect(html.split(expected)).toHaveLength(2);
    if (exposesRoute) {
      expect(html).toContain(expectedDestination.serviceName);
      expect(html).toContain(expectedDestination.domain);
      expect(html).toContain(`href="${expectedDestination.canonicalUrl}"`);
      expect(html).toContain(`data-purpose="${expectedDestination.purpose}"`);
      const reasonEnd = html.indexOf(expected) + expected.length;
      const anchorStart = html.indexOf('<a ', reasonEnd);
      expect(anchorStart).toBeGreaterThan(reasonEnd);
      expect(html.slice(reasonEnd, anchorStart)).not.toMatch(/<(?:h3|section|ul|fieldset)/);
      expect(primaryActionCount(html)).toBe(1);
    } else {
      expect(html).not.toContain(expectedDestination.serviceName);
      expect(html).not.toContain(expectedDestination.domain);
      expect(html).not.toContain(`href="${expectedDestination.canonicalUrl}"`);
      expect(html).not.toContain(`data-purpose="${expectedDestination.purpose}"`);
      expect(primaryActionCount(html)).toBe(0);
    }
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain(OPEN_HEADING);
    expect(html).not.toContain('Reviewed category');
    expect(html).not.toContain('Copy reviewed description');
    expect(html).not.toContain('Copy reviewed category');
    expect(html).not.toContain('Optional desktop helper');
    expect(html.includes('target="_blank"')).toBe(exposesRoute);
    expect(html.includes('rel="noreferrer"')).toBe(exposesRoute);
    for (const removed of REMOVED_COPY) expect(html, removed).not.toContain(removed);
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

  it('keeps every future helper consent mounted through one straight authorization sequence', () => {
    const sequence = [
      [false, false, false, false, false],
      [true, false, false, false, false],
      [true, true, false, false, false],
      [true, true, true, false, false],
      [true, true, true, true, false],
      [true, true, true, true, true],
    ] as const;

    for (const [desktop, bounded, present, reviewed, requested] of sequence) {
      const presentation: ExtensionAssistPresentation = {
        ...publicEnabledExtension,
        preparationAllowedByController: desktop && bounded && present && reviewed && requested,
        supportedDesktopConfirmed: desktop,
        boundedSafetyReviewConfirmed: bounded,
        helperConfirmation: {
          affectedPersonPresent: present,
          affectedPersonReviewedFields: reviewed,
          affectedPersonRequestedPreparation: requested,
        },
      };
      const html = renderToStaticMarkup(createElement(ExtensionAssistCard, {
        language: 'en',
        simpleMode: false,
        role: 'present-helper',
        presentation,
        callbacks: extensionCallbacks,
      }));

      expect(html.match(/type="checkbox"/g)).toHaveLength(5);
      const prepareTag = openingTagForText(html, 'Already installed? Prepare reviewed fields');
      expect(prepareTag.includes('disabled=""')).toBe(!presentation.preparationAllowedByController);
    }
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
      selfRole: 'My case',
      selfConfirmation: SELF_CONFIRMATION,
      helperRole: 'Helping someone present',
      helperReviewed: HELPER_REVIEWED,
      helperConfirmedPack: HELPER_CONFIRMED_PACK,
      helperSubmitBoundary: HELPER_SUBMIT_BOUNDARY,
      openHeading: OPEN_HEADING,
      openBody: 'Opens {domain} in a new tab. Sign in, check every field, and submit there yourself. Nothing is sent from ChallanSakshi.',
      returnStates: ['I saw an acknowledgement on the official service', 'The official portal did not work for me', 'I did not submit', 'I need to correct my pack'],
      returnConfirmation: HELPER_RETURN_CONFIRMATION,
      helperIndependence: 'The helper is optional. The complete field pack and official link work without it.',
    }],
    ['en', true, {
      selfRole: 'My case',
      selfConfirmation: 'I checked the evidence and my vehicle record, this matter is mine to raise, and I have read this description.',
      helperRole: 'Helping someone present',
      helperReviewed: 'The person is here, checked the evidence and their vehicle record, and confirmed this matter is theirs to raise.',
      helperConfirmedPack: 'They asked me to prepare this and have read and confirmed this description.',
      helperSubmitBoundary: 'The person—not the helper—must sign in, declare, and submit on the official site.',
      openHeading: OPEN_HEADING,
      openBody: 'Opens {domain} in a new tab. Sign in, check every field, and send it there yourself. ChallanSakshi sends nothing.',
      returnStates: ['I saw an acknowledgement', 'The official site did not work', 'I did not send it', 'I need to fix my pack'],
      returnConfirmation: 'The person is still here and confirmed this return note (and the reference characters, if entered).',
      helperIndependence: 'This helper is optional. You can use the field pack and official link without it.',
    }],
    ['hi', false, {
      selfRole: 'मेरा मामला',
      selfConfirmation: 'मैंने सबूत और अपना वाहन रिकॉर्ड जाँचा है, मुझे यह मामला उठाने का अधिकार है, और मैंने यह विवरण जाँच लिया है।',
      helperRole: 'मौजूद व्यक्ति की मदद',
      helperReviewed: 'प्रभावित व्यक्ति मौजूद है, उसने सबूत और अपना वाहन रिकॉर्ड जाँचा है, और पुष्टि की है कि उसे यह मामला उठाने का अधिकार है।',
      helperConfirmedPack: 'उन्होंने मुझसे इसे तैयार करने को कहा है और यह विवरण जाँचकर पुष्ट किया है।',
      helperSubmitBoundary: 'मददगार नहीं, प्रभावित व्यक्ति को आधिकारिक सेवा पर स्वयं प्रमाणीकरण, घोषणा और जमा करना होगा।',
      openHeading: 'आधिकारिक सेवा खोलें',
      openBody: '{domain} नए टैब में खुलेगा। वहाँ स्वयं साइन इन करें, हर फ़ील्ड जाँचें और जमा करें। ChallanSakshi से कुछ नहीं भेजा जाता।',
      returnStates: ['मुझे आधिकारिक सेवा पर पावती दिखी', 'आधिकारिक पोर्टल मेरे लिए नहीं चला', 'मैंने जमा नहीं किया', 'मुझे अपने पैक में सुधार करना है'],
      returnConfirmation: 'प्रभावित व्यक्ति अभी भी मौजूद है और उसने यह वापसी नोट (और दर्ज किए गए संदर्भ अक्षर, यदि कोई हों) पुष्ट किया है।',
      helperIndependence: 'मददगार वैकल्पिक है। पूरा फ़ील्ड पैक और आधिकारिक लिंक इसके बिना काम करते हैं।',
    }],
    ['hi', true, {
      selfRole: 'मेरा मामला',
      selfConfirmation: 'मैंने सबूत और अपना वाहन रिकॉर्ड देख लिया है, यह मामला उठाना मेरा हक़ है, और यह विवरण मैंने पढ़ लिया है।',
      helperRole: 'मौजूद व्यक्ति की मदद',
      helperReviewed: 'व्यक्ति यहाँ मौजूद है, उसने सबूत और अपना वाहन रिकॉर्ड देख लिया है, और कहा है कि यह मामला उठाना उसका हक़ है।',
      helperConfirmedPack: 'उन्होंने मुझसे इसे तैयार करने को कहा है और यह विवरण पढ़कर पुष्ट किया है।',
      helperSubmitBoundary: 'व्यक्ति को खुद साइन इन, घोषणा और आधिकारिक साइट पर जमा करना होगा; मददगार यह नहीं करेगा।',
      openHeading: 'आधिकारिक सेवा खोलें',
      openBody: '{domain} नए टैब में खुलेगा। वहाँ खुद साइन इन करें, हर फ़ील्ड देखें और जमा करें। ChallanSakshi कुछ नहीं भेजता।',
      returnStates: ['मुझे पावती दिखी', 'आधिकारिक साइट नहीं चली', 'मैंने नहीं भेजा', 'मुझे अपना पैक ठीक करना है'],
      returnConfirmation: 'व्यक्ति अभी भी यहाँ है और उसने यह वापसी नोट (और लिखे गए संदर्भ अक्षर, अगर कोई हों) पुष्ट किया है।',
      helperIndependence: 'यह मददगार वैकल्पिक है। फ़ील्ड पैक और आधिकारिक लिंक इसके बिना भी काम करते हैं।',
    }],
  ] as const)('preserves every role, return, and helper boundary in %s simple=%s', (language, simpleMode, expected) => {
    const copy = getOfficialHandoffPresentation(language, simpleMode);
    expect(copy.roles.self.heading).toBe(expected.selfRole);
    expect(copy.roles.self.confirmation).toBe(expected.selfConfirmation);
    expect(copy.roles.helper.heading).toBe(expected.helperRole);
    expect(copy.roles.helper.confirmations.affectedPersonPresentAndReviewed).toBe(expected.helperReviewed);
    expect(copy.roles.helper.confirmations.affectedPersonRequestedAndConfirmedPack).toBe(expected.helperConfirmedPack);
    expect(copy.roles.helper.submitBoundary).toBe(expected.helperSubmitBoundary);
    expect(copy.openHeading).toBe(expected.openHeading);
    expect(copy.openBody).toBe(expected.openBody);
    expect(copy.openBody).toContain('{domain}');
    expect(Object.values(copy.returnStates)).toEqual(expected.returnStates);
    expect(copy.returnAuthorization.affectedPersonConfirmedReturn).toBe(expected.returnConfirmation);
    expect(copy.helper.independence).toBe(expected.helperIndependence);
    expect(copy.purpose['official-service']).toBe(language === 'hi' ? 'आधिकारिक सेवा' : 'Official service');
    expect(Object.keys(copy.returnAnnouncements)).toEqual(['self', 'helper']);
    expect(Object.keys(copy.returnAnnouncements.self)).toEqual(['recorded']);
    expect(Object.keys(copy.returnAnnouncements.helper)).toEqual(['recorded']);
    expect(Object.keys(copy.roles.self)).toEqual(['heading', 'confirmation']);
    expect(Object.keys(copy.roles.helper.confirmations)).toEqual([
      'affectedPersonPresentAndReviewed',
      'affectedPersonRequestedAndConfirmedPack',
    ]);
    expect(Object.keys(copy.returnAuthorization)).toEqual(['affectedPersonConfirmedReturn']);
    expect(Object.keys(copy.copyFeedback)).toEqual(['category', 'description']);
    expect(Object.keys(copy.returnReadiness)).toEqual([
      'currentPackRequired',
      'officialLinkNotActivated',
      'returnStateRequired',
      'referenceFragmentIncomplete',
      'affectedPersonPresentRequired',
      'affectedPersonRecordingRequestRequired',
      'affectedPersonReturnStateConfirmationRequired',
      'affectedPersonReferenceConfirmationRequired',
    ]);
    expect(Object.keys(copy.helper.confirmations)).toEqual([
      'supportedDesktop',
      'boundedSafetyReview',
      'affectedPersonPresent',
      'affectedPersonReviewedFields',
      'affectedPersonRequestedPreparation',
    ]);
    for (const removedKey of [
      'lookupHeading', 'lookupLabel', 'lookupWarning', 'copyLookup',
      'descriptionHelp', 'checklistHeading', 'checklists',
      'safetyBoundary', 'leaveHeading', 'leaveBody', 'returnBasis',
    ]) expect(copy, removedKey).not.toHaveProperty(removedKey);
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

  it.each([false, true])('writes every new Hindi confirmation, open, and readiness string in Devanagari simple=%s', (simpleMode) => {
    const copy = getOfficialHandoffPresentation('hi', simpleMode);
    const english = getOfficialHandoffPresentation('en', simpleMode);
    const pairs: ReadonlyArray<readonly [string, string, string]> = [
      ['roles.self.confirmation', copy.roles.self.confirmation, english.roles.self.confirmation],
      ['roles.helper.confirmations.affectedPersonPresentAndReviewed', copy.roles.helper.confirmations.affectedPersonPresentAndReviewed, english.roles.helper.confirmations.affectedPersonPresentAndReviewed],
      ['roles.helper.confirmations.affectedPersonRequestedAndConfirmedPack', copy.roles.helper.confirmations.affectedPersonRequestedAndConfirmedPack, english.roles.helper.confirmations.affectedPersonRequestedAndConfirmedPack],
      ['roles.helper.submitBoundary', copy.roles.helper.submitBoundary, english.roles.helper.submitBoundary],
      ['openHeading', copy.openHeading, english.openHeading],
      ['openBody', copy.openBody, english.openBody],
      ['returnAuthorization.affectedPersonConfirmedReturn', copy.returnAuthorization.affectedPersonConfirmedReturn, english.returnAuthorization.affectedPersonConfirmedReturn],
      ['returnAnnouncements.self.recorded', copy.returnAnnouncements.self.recorded, english.returnAnnouncements.self.recorded],
      ['returnAnnouncements.helper.recorded', copy.returnAnnouncements.helper.recorded, english.returnAnnouncements.helper.recorded],
      ...Object.entries(copy.returnReadiness).map(([key, value]) => [
        `returnReadiness.${key}`,
        value,
        english.returnReadiness[key as keyof typeof english.returnReadiness],
      ] as const),
    ];
    for (const [key, hindi, englishValue] of pairs) {
      expect(hindi, key).toMatch(/[\u0900-\u097f]/u);
      expect(hindi, key).not.toBe(englishValue);
      expect(hindi, key).not.toMatch(/\b(?:the|and|official|service|person|confirm)\b/i);
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
    expect(panelSource).toMatch(/onClick=\{eligible \? \(event\) => \{\s*if \(!callbacks\.onOfficialLinkActivate\(\)\) event\.preventDefault\(\);\s*\} : undefined\}/);
    expect(panelSource.match(/onOfficialLinkActivate\(\)/g)).toHaveLength(1);
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

  it('uses the existing palette and compact rhythm with selectable values, visible focus, 48px controls, and 16px narrow text', () => {
    expect(panelStyles).toMatch(/var\(--pb-(?:ink|muted|teal|teal-dark|navy|paper|card|line)\)/);
    expect(panelStyles).not.toMatch(/grid-template-columns:\s*repeat\(/);
    expect(panelStyles).toMatch(/\.panel\s*\{[^}]*gap:\s*14px[^}]*padding:\s*18px/);
    expect(panelStyles).toMatch(/\.eyebrow\s*\{[^}]*font-size:\s*11px/);
    expect(panelStyles).toMatch(/\.fieldGroup,[\s\S]*?\{[^}]*padding-top:\s*12px/);
    expect(panelStyles).toMatch(/\.fieldGroup textarea\s*\{[^}]*min-height:\s*96px/);
    expect(panelStyles).toMatch(/\.selectableValue\s*\{[^}]*user-select:\s*text/);
    expect(panelStyles).toMatch(/\.(?:action|copyButton|officialAnchor)[^{]*\{[^}]*min-height:\s*(?:48|5\d)px/);
    expect(panelStyles).toMatch(/\.confirmation[^}]*min-height:\s*(?:48|5\d)px/);
    expect(panelStyles).toMatch(/\.returnChoice[^}]*min-height:\s*(?:48|5\d)px/);
    expect(panelStyles).toMatch(/\.primaryAction\s*\{[^}]*background:/);
    expect(panelStyles).toMatch(/\.secondaryAction\s*\{[^}]*background:/);
    expect(panelStyles).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    expect(panelStyles).not.toMatch(/\.(?:checklist|leaving)\b/);
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
