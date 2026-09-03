import {
  buildSyntheticExtensionHandoffEnvelope,
  canonicalExtensionHandoffEnvelopeJson,
  generateOpaqueExtensionId,
  type ExtensionHandoffEnvelope,
  type SyntheticExtensionHandoffSource,
} from './extension-handoff-contract';
import { OFFICIAL_ROUTE_REGISTRY_VERSION } from './official-destinations';

export const SYNTHETIC_FIXTURE_REVIEWED_DESCRIPTION = 'The fictional enforcement image shows a four-wheeler while the fictional vehicle record shows a two-wheeler. Please review this vehicle-class mismatch.' as const;

export const SYNTHETIC_FIXTURE_COUNTER_TOKENS = Object.freeze([
  'input',
  'change',
  'blur',
  'keyboard',
  'custom',
  'link-click',
  'button-click',
  'submit',
  'form-effect',
  'autosave',
  'fetch',
  'xhr',
  'beacon',
  'history',
  'navigation',
  'upload',
  'download',
] as const);

export type SyntheticFixtureCounterToken = (typeof SYNTHETIC_FIXTURE_COUNTER_TOKENS)[number];

const protectedControls = Object.freeze([
  Object.freeze({
    id: 'challansakshi-protected-challan-number',
    element: 'input',
    type: 'text',
    name: 'protectedChallanNumber',
    label: 'Protected fictional challan number',
    initialValue: 'FICTIONAL-CHALLAN-0001',
    autoComplete: 'off',
  }),
  Object.freeze({
    id: 'challansakshi-protected-captcha',
    element: 'input',
    type: 'text',
    name: 'protectedCaptcha',
    label: 'Protected fictional CAPTCHA',
    initialValue: 'FICTIONAL-CAPTCHA',
    autoComplete: 'off',
  }),
  Object.freeze({
    id: 'challansakshi-protected-otp',
    element: 'input',
    type: 'text',
    name: 'protectedOtp',
    label: 'Protected fictional OTP',
    initialValue: 'FICTIONAL-OTP',
    autoComplete: 'one-time-code',
  }),
  Object.freeze({
    id: 'challansakshi-protected-aadhaar',
    element: 'input',
    type: 'text',
    name: 'protectedAadhaar',
    label: 'Protected fictional Aadhaar',
    initialValue: 'FICTIONAL-AADHAAR',
    autoComplete: 'off',
  }),
  Object.freeze({
    id: 'challansakshi-protected-payment',
    element: 'input',
    type: 'text',
    name: 'protectedPayment',
    label: 'Protected fictional payment',
    initialValue: 'FICTIONAL-PAYMENT',
    autoComplete: 'off',
  }),
  Object.freeze({
    id: 'challansakshi-protected-attachment',
    element: 'input',
    type: 'file',
    name: 'protectedAttachment',
    label: 'Protected fictional attachment',
    initialValue: '',
  }),
  Object.freeze({
    id: 'challansakshi-protected-declaration',
    element: 'input',
    type: 'checkbox',
    name: 'protectedDeclaration',
    label: 'Protected fictional declaration',
    initialChecked: false,
  }),
  Object.freeze({
    id: 'challansakshi-protected-submit',
    element: 'button',
    type: 'submit',
    name: '',
    label: 'Protected fictional Submit',
  }),
] as const);

const counters = Object.freeze(SYNTHETIC_FIXTURE_COUNTER_TOKENS.map((token) => Object.freeze({
  token,
  id: `challansakshi-fixture-counter-${token}`,
  markerAttribute: 'data-challansakshi-fixture-counter',
  markerValue: token,
})));

export const SYNTHETIC_EXTENSION_FIXTURE = Object.freeze({
  source: Object.freeze({
    url: 'http://127.0.0.1:3000/demo/extension-fixture/source',
    path: '/demo/extension-fixture/source',
    rootAttribute: 'data-challansakshi-extension-handoff',
    envelopeAttribute: 'data-challansakshi-extension-envelope',
    markerValue: 'v1',
  }),
  destination: Object.freeze({
    url: 'http://127.0.0.1:3000/demo/extension-fixture/destination',
    path: '/demo/extension-fixture/destination',
    form: Object.freeze({
      id: 'challansakshi-synthetic-destination-form',
      selector: 'challansakshi-synthetic-destination-form',
      name: 'challansakshiSyntheticDestination',
      method: 'post',
      action: '/demo/extension-fixture/destination',
      markerAttribute: 'data-challansakshi-fixture-form',
      markerValue: 'v1',
    }),
    category: Object.freeze({
      containerAttribute: 'data-challansakshi-fixture-container',
      containerValue: 'category',
      id: 'challansakshi-synthetic-category',
      name: 'syntheticCategory',
      label: 'Fictional review category',
      options: Object.freeze([
        Object.freeze({ value: '', label: 'Choose a fictional category' }),
        Object.freeze({
          value: '4 Wheeler Challan On 2 Wheeler',
          label: '4 Wheeler Challan On 2 Wheeler',
        }),
      ]),
    }),
    description: Object.freeze({
      containerAttribute: 'data-challansakshi-fixture-container',
      containerValue: 'description',
      id: 'challansakshi-synthetic-description',
      name: 'syntheticDescription',
      label: 'Fictional reviewed description',
      minLength: 1,
      maxLength: 500,
      required: true,
      initialValue: '',
    }),
    protectedControls,
    untouchedSentence: 'Untouched: challan number, CAPTCHA, OTP, Aadhaar, payment, attachment, declaration, Submit',
    counterTokens: SYNTHETIC_FIXTURE_COUNTER_TOKENS,
    counters,
    eventSequence: Object.freeze({
      markerAttribute: 'data-challansakshi-fixture-event-sequence',
      markerValue: 'true',
    }),
    reset: Object.freeze({
      id: 'challansakshi-fixture-reset',
      label: 'Reset fictional fixture baseline',
    }),
    ready: Object.freeze({
      attribute: 'data-challansakshi-fixture-ready',
      value: 'true',
    }),
    customEvents: Object.freeze([
      'challansakshi-fixture-custom',
      'challansakshi-fixture-autosave',
    ] as const),
    baselineDispatchedEventSequence: Object.freeze([] as string[]),
  }),
});

export type SyntheticFixtureInstrumentationState = Readonly<{
  counters: Readonly<Record<SyntheticFixtureCounterToken, number>>;
  dispatchedEventSequence: readonly string[];
  ready: boolean;
  inert: boolean;
}>;

function zeroCounters(): Readonly<Record<SyntheticFixtureCounterToken, number>> {
  return Object.freeze(Object.fromEntries(
    SYNTHETIC_FIXTURE_COUNTER_TOKENS.map((token) => [token, 0]),
  ) as Record<SyntheticFixtureCounterToken, number>);
}

export function createSyntheticFixtureInstrumentationState(): SyntheticFixtureInstrumentationState {
  return Object.freeze({
    counters: zeroCounters(),
    dispatchedEventSequence: Object.freeze([]),
    ready: false,
    inert: true,
  });
}

export function resetSyntheticFixtureInstrumentationState(): SyntheticFixtureInstrumentationState {
  return Object.freeze({
    counters: zeroCounters(),
    dispatchedEventSequence: Object.freeze([]),
    ready: true,
    inert: false,
  });
}

export type SyntheticExtensionFixtureCapsule = Readonly<{
  envelope: ExtensionHandoffEnvelope;
  canonicalJson: string;
}>;

const MAX_DISTINCT_ID_ATTEMPTS = 8;

function distinctOpaqueId(excluded: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < MAX_DISTINCT_ID_ATTEMPTS; attempt += 1) {
    const candidate = generateOpaqueExtensionId();
    if (!excluded.has(candidate)) return candidate;
  }
  throw new Error('Could not generate distinct secure synthetic fixture IDs.');
}

/** Builds only on invocation so no static build or module import can mint a live capsule. */
export function createSyntheticExtensionFixtureCapsule(): SyntheticExtensionFixtureCapsule {
  const nowMs = Date.now();
  if (!Number.isSafeInteger(nowMs)) throw new Error('A safe current millisecond clock is required.');
  const issuedAt = new Date(nowMs).toISOString();
  const resultRevisionId = distinctOpaqueId(new Set());
  const packRevisionId = distinctOpaqueId(new Set([resultRevisionId]));
  const source: SyntheticExtensionHandoffSource = Object.freeze({
    resultRevisionId,
    packRevisionId,
    routeRegistryVersion: OFFICIAL_ROUTE_REGISTRY_VERSION,
    description: SYNTHETIC_FIXTURE_REVIEWED_DESCRIPTION,
    confirmed: true,
    issuedAt,
    routeKey: 'synthetic-fixture',
    issueCode: 'four-wheeler-on-two-wheeler',
  });

  for (let attempt = 0; attempt < MAX_DISTINCT_ID_ATTEMPTS; attempt += 1) {
    const built = buildSyntheticExtensionHandoffEnvelope(source, {
      language: 'en',
      simpleMode: false,
      nowMs,
    });
    if (built.status !== 'built') {
      throw new Error(`Could not construct the synthetic fixture capsule: ${built.reason}.`);
    }
    if (built.envelope.packId === resultRevisionId || built.envelope.packId === packRevisionId) continue;
    return Object.freeze({
      envelope: built.envelope,
      canonicalJson: canonicalExtensionHandoffEnvelopeJson(built.envelope),
    });
  }
  throw new Error('Could not generate distinct secure synthetic fixture IDs.');
}
