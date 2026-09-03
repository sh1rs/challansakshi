import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
  WORKER_REQUEST_SCHEMA,
  WORKER_RESPONSE_SCHEMA,
  buildAcknowledgeAffectedPersonInspectionRequest,
  buildClearStagedFieldsRequest,
  buildFillEmptyReviewedFieldsRequest,
  buildLoadReviewedFieldsRequest,
  buildPreviewCurrentPageRequest,
  buildResetForDeviceOwnerRequest,
  parseWorkerRequest,
  validatePopupSender,
  validateWorkerResponseForCommand,
  type WorkerCommand,
  type WorkerResponseState,
} from '../src/message-contract';

const GENERATION = '11111111111111111111111111111111';
const PACK_ID = '22222222222222222222222222222222';
const REPLAY_UNTIL = 1_800_000_000_000;
const WARNING_EXPIRES_AT = REPLAY_UNTIL + 86_400_000;

const binding = Object.freeze({
  schema: 'challansakshi.source-preview-binding/v1',
  sourceTabId: 17,
  sourceDocumentId: 'source-document-A',
  canonicalEnvelopeDigest: 'a'.repeat(64),
  previewNotAfterMs: REPLAY_UNTIL,
});

describe('closed worker request contract', () => {
  it('builds and parses the six payload-minimized requests with exact key order', () => {
    const requests = [
      buildPreviewCurrentPageRequest(17),
      buildLoadReviewedFieldsRequest(17, binding),
      buildFillEmptyReviewedFieldsRequest(29, GENERATION, PACK_ID, REPLAY_UNTIL),
      buildClearStagedFieldsRequest(GENERATION, PACK_ID, REPLAY_UNTIL),
      buildAcknowledgeAffectedPersonInspectionRequest(PACK_ID, REPLAY_UNTIL, WARNING_EXPIRES_AT),
      buildResetForDeviceOwnerRequest({
        schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
        type: 'reset-for-device-owner',
        allRelevantOfficialTabsAndBrowserProcessesClosed: true,
      }),
    ];

    expect(WORKER_REQUEST_SCHEMA).toBe('challansakshi.worker-request/v1');
    expect(requests.map(Object.keys)).toEqual([
      ['schema', 'command', 'actionTabId'],
      ['schema', 'command', 'actionTabId', 'sourcePreviewBinding'],
      ['schema', 'command', 'actionTabId', 'generation', 'packId', 'effectiveExpiresAtMs'],
      ['schema', 'command', 'generation', 'packId', 'effectiveExpiresAtMs'],
      ['schema', 'command', 'packId', 'replayUntil', 'warningExpiresAt'],
      ['schema', 'command', 'attestation'],
    ]);
    for (const request of requests) {
      expect(parseWorkerRequest(JSON.parse(JSON.stringify(request)))).toEqual(request);
      expect(Object.isFrozen(request)).toBe(true);
    }
    expect(Object.keys(binding)).toEqual([
      'schema', 'sourceTabId', 'sourceDocumentId', 'canonicalEnvelopeDigest', 'previewNotAfterMs',
    ]);
  });

  it('rejects reordered, extra, inherited, accessor, and value-bearing requests without invoking getters', () => {
    let getterCalls = 0;
    const accessor = Object.defineProperty({}, 'schema', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return WORKER_REQUEST_SCHEMA;
      },
    });
    const invalid = [
      accessor,
      Object.assign(Object.create({ schema: WORKER_REQUEST_SCHEMA }), {
        command: 'preview-current-page', actionTabId: 17,
      }),
      { command: 'preview-current-page', schema: WORKER_REQUEST_SCHEMA, actionTabId: 17 },
      { schema: WORKER_REQUEST_SCHEMA, command: 'preview-current-page', actionTabId: 17, extra: true },
      { schema: WORKER_REQUEST_SCHEMA, command: 'preview-current-page', actionTabId: Number.NaN },
      {
        schema: WORKER_REQUEST_SCHEMA,
        command: 'fill-empty-reviewed-fields',
        actionTabId: 29,
        generation: GENERATION,
        packId: PACK_ID,
        effectiveExpiresAtMs: REPLAY_UNTIL,
        description: 'must never cross this command',
      },
      {
        schema: WORKER_REQUEST_SCHEMA,
        command: 'load-reviewed-fields',
        actionTabId: 17,
        sourcePreviewBinding: { ...binding, sourceDocumentId: 'space is forbidden' },
      },
    ];
    for (const candidate of invalid) expect(parseWorkerRequest(candidate)).toBeNull();
    expect(getterCalls).toBe(0);
  });
});

describe('pure popup sender validation', () => {
  it('accepts only the exact internal popup and never reads extra Chrome metadata', () => {
    let extraReads = 0;
    const sender = Object.defineProperties({}, {
      url: { enumerable: true, value: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html' },
      id: { enumerable: true, value: 'abcdefghijklmnopabcdefghijklmnop' },
      tab: {
        enumerable: true,
        get() {
          extraReads += 1;
          throw new Error('must not read');
        },
      },
    });
    expect(validatePopupSender(
      sender,
      'chrome-extension://abcdefghijklmnopabcdefghijklmnop',
    )).toBe(true);
    expect(extraReads).toBe(0);

    for (const url of [
      'https://abcdefghijklmnopabcdefghijklmnop/popup.html',
      'chrome-extension://abcdefghijklmnopabcdefghijklmnop/options.html',
      'chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html?x=1',
      'chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html#x',
      'chrome-extension://otherotherotherotherotherotherotheroth/popup.html',
    ]) {
      expect(validatePopupSender({
        url,
        id: 'abcdefghijklmnopabcdefghijklmnop',
      }, 'chrome-extension://abcdefghijklmnopabcdefghijklmnop')).toBe(false);
    }
  });
});

describe('command-aware worker response contract', () => {
  const fixed = (command: string, state: string) => ({
    schema: WORKER_RESPONSE_SCHEMA, command, state,
  });

  it('enforces the frozen command/state and warning code matrix', () => {
    expect(WORKER_RESPONSE_SCHEMA).toBe('challansakshi.worker-response/v1');
    expect(validateWorkerResponseForCommand(
      fixed('fill-empty-reviewed-fields', 'success'),
      'fill-empty-reviewed-fields',
    )).toEqual(fixed('fill-empty-reviewed-fields', 'success'));
    expect(validateWorkerResponseForCommand(
      fixed('clear-staged-fields', 'success'),
      'clear-staged-fields',
    )).toBeNull();
    expect(validateWorkerResponseForCommand(
      fixed('clear-staged-fields', 'empty'),
      'clear-staged-fields',
    )).toEqual(fixed('clear-staged-fields', 'empty'));

    const warning = {
      state: 'needs-review', packId: PACK_ID, replayUntil: REPLAY_UNTIL,
      warningExpiresAt: WARNING_EXPIRES_AT,
    };
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'partial',
      code: 'partial',
      warning,
    }, 'fill-empty-reviewed-fields')).not.toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'needs-review',
      code: 'indeterminate',
      warning,
    }, 'fill-empty-reviewed-fields')).not.toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'partial',
      code: 'late-complete',
      warning,
    }, 'fill-empty-reviewed-fields')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'needs-review',
      warning,
    }, 'preview-current-page')).not.toBeNull();
  });

  it('requires null command only for invalid sender/request and closes rejected-code compatibility', () => {
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: null,
      state: 'rejected',
      code: 'invalid-sender',
    }, null)).not.toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'clear-staged-fields',
      state: 'rejected',
      code: 'action-tab-mismatch',
    }, 'clear-staged-fields')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'acknowledge-affected-person-inspection',
      state: 'rejected',
      code: 'acknowledgement-not-available',
    }, 'acknowledge-affected-person-inspection')).not.toBeNull();
  });

  it('rejects every popup-visible epoch that built-in ISO conversion cannot represent', () => {
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'staged',
      generation: GENERATION,
      packId: PACK_ID,
      effectiveExpiresAtMs: Number.MAX_SAFE_INTEGER,
    }, 'preview-current-page')).toBeNull();

    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'source-preview',
      preview: {
        language: 'en',
        simpleMode: false,
        destinationName: 'Fictional destination fixture',
        routeKey: 'synthetic-fixture',
        routeRegistryVersion: 'challansakshi.official-routes/v1',
        adapterContractVersion: 'challansakshi.adapter-contract/v1',
        expiresAt: '2027-01-15T08:00:00.000Z',
        description: 'Please review the fictional mismatch.',
        categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
      },
      sourcePreviewBinding: binding,
    }, 'preview-current-page')).not.toBeNull();

    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'source-preview',
      preview: {
        language: 'en',
        simpleMode: false,
        destinationName: 'Fictional destination fixture',
        routeKey: 'synthetic-fixture',
        routeRegistryVersion: 'challansakshi.official-routes/v1',
        adapterContractVersion: 'challansakshi.adapter-contract/v1',
        expiresAt: '2027-01-15T08:00:00Z',
        description: 'Please review the fictional mismatch.',
        categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
      },
      sourcePreviewBinding: binding,
    }, 'preview-current-page')).toBeNull();
  });

  it('returns null rather than throwing for a stateful hostile response proxy', () => {
    let ownKeyReads = 0;
    const target = {
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'needs-review',
      warning: {
        state: 'needs-review', packId: PACK_ID, replayUntil: REPLAY_UNTIL,
        warningExpiresAt: WARNING_EXPIRES_AT,
      },
    };
    const hostile = new Proxy(target, {
      ownKeys(value) {
        ownKeyReads += 1;
        if (ownKeyReads > 1) throw new Error('revoked after discriminant read');
        return Reflect.ownKeys(value);
      },
    });
    expect(() => validateWorkerResponseForCommand(
      hostile,
      'fill-empty-reviewed-fields',
    )).not.toThrow();
    expect(validateWorkerResponseForCommand(
      new Proxy(target, {
        ownKeys(value) {
          ownKeyReads += 1;
          if (ownKeyReads > 2) throw new Error('revoked after discriminant read');
          return Reflect.ownKeys(value);
        },
      }),
      'fill-empty-reviewed-fields',
    )).toBeNull();
  });

  it('rejects a nonthrowing proxy that mutates its discriminant between closed reads', () => {
    const target = {
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'empty',
    };
    let stateReads = 0;
    const mutating = new Proxy(target, {
      getOwnPropertyDescriptor(value, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
        if (key !== 'state' || !descriptor || !('value' in descriptor)) return descriptor;
        stateReads += 1;
        return { ...descriptor, value: stateReads === 1 ? 'empty' : 'unsupported' };
      },
    });
    expect(validateWorkerResponseForCommand(mutating, 'preview-current-page')).toBeNull();
    expect(stateReads).toBe(2);
  });

  it('enforces the complete independent command/state matrix', () => {
    const commands: readonly WorkerCommand[] = [
      'preview-current-page',
      'load-reviewed-fields',
      'fill-empty-reviewed-fields',
      'clear-staged-fields',
      'acknowledge-affected-person-inspection',
      'reset-for-device-owner',
    ];
    const states: readonly WorkerResponseState[] = [
      'source-preview', 'staged', 'destination-preview', 'success', 'partial', 'needs-review',
      'unresolved-live', 'unresolved-orphaned', 'quarantined', 'expired', 'unsupported',
      'adapter-disabled', 'empty', 'rejected',
    ];
    const allowed: Readonly<Record<WorkerCommand, readonly WorkerResponseState[]>> = {
      'preview-current-page': [
        'source-preview', 'staged', 'destination-preview', 'needs-review', 'unresolved-live',
        'unresolved-orphaned', 'quarantined', 'expired', 'unsupported', 'adapter-disabled',
        'empty', 'rejected',
      ],
      'load-reviewed-fields': [
        'staged', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined',
        'expired', 'unsupported', 'adapter-disabled', 'rejected',
      ],
      'fill-empty-reviewed-fields': [
        'success', 'partial', 'needs-review', 'unresolved-live', 'unresolved-orphaned',
        'quarantined', 'expired', 'unsupported', 'adapter-disabled', 'rejected',
      ],
      'clear-staged-fields': [
        'empty', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined',
        'expired', 'rejected',
      ],
      'acknowledge-affected-person-inspection': [
        'empty', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined', 'rejected',
      ],
      'reset-for-device-owner': [
        'empty', 'needs-review', 'unresolved-live', 'unresolved-orphaned', 'quarantined', 'rejected',
      ],
    };
    const warning = {
      state: 'needs-review', packId: PACK_ID, replayUntil: REPLAY_UNTIL,
      warningExpiresAt: WARNING_EXPIRES_AT,
    };
    const sourcePreview = {
      language: 'en', simpleMode: false, destinationName: 'Fictional destination fixture',
      routeKey: 'synthetic-fixture', routeRegistryVersion: 'challansakshi.official-routes/v1',
      adapterContractVersion: 'challansakshi.adapter-contract/v1',
      expiresAt: '2027-01-15T08:00:00.000Z', description: 'Reviewed fictional description.',
      categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
    };
    const destinationPreview = {
      language: 'en', simpleMode: false, domain: '127.0.0.1:3000',
      purpose: 'Place the reviewed fictional category and description into the two blank synthetic fields.',
      adapterId: 'synthetic-fixture', adapterRevision: 'challansakshi.synthetic-destination/v1',
      lastVerifiedAt: '2026-09-03T00:00:00.000Z',
      adapterExpiresAt: '2026-10-03T00:00:00.000Z',
      description: 'Reviewed fictional description.',
      categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
    };
    const candidate = (command: WorkerCommand, state: WorkerResponseState): unknown => {
      if (state === 'source-preview') return {
        schema: WORKER_RESPONSE_SCHEMA, command, state, preview: sourcePreview,
        sourcePreviewBinding: binding,
      };
      if (state === 'staged') return {
        schema: WORKER_RESPONSE_SCHEMA, command, state,
        generation: GENERATION, packId: PACK_ID, effectiveExpiresAtMs: REPLAY_UNTIL,
      };
      if (state === 'destination-preview') return {
        schema: WORKER_RESPONSE_SCHEMA, command, state,
        generation: GENERATION, packId: PACK_ID, effectiveExpiresAtMs: REPLAY_UNTIL,
        preview: destinationPreview,
      };
      if (state === 'partial') return {
        schema: WORKER_RESPONSE_SCHEMA, command, state, code: 'partial', warning,
      };
      if (state === 'needs-review') return {
        schema: WORKER_RESPONSE_SCHEMA, command, state, warning,
      };
      if (state === 'rejected') return {
        schema: WORKER_RESPONSE_SCHEMA, command, state, code: 'operation-failed',
      };
      return { schema: WORKER_RESPONSE_SCHEMA, command, state };
    };
    for (const command of commands) {
      for (const state of states) {
        const validated = validateWorkerResponseForCommand(candidate(command, state), command);
        expect(Boolean(validated), `${command}/${state}`).toBe(allowed[command].includes(state));
      }
    }
  });

  it('enforces the complete independent rejected-code matrix and null-command family', () => {
    const matrix = {
      'preview-current-page': [
        'action-tab-mismatch', 'source-preview-rejected', 'source-unavailable',
        'source-binding-changed', 'replay-blocked', 'ledger-capacity-reached',
        'storage-unavailable', 'operation-failed',
      ],
      'load-reviewed-fields': [
        'action-tab-mismatch', 'source-preview-rejected', 'source-unavailable',
        'source-binding-changed', 'replay-blocked', 'ledger-capacity-reached',
        'secure-random-unavailable', 'storage-unavailable', 'operation-failed',
      ],
      'fill-empty-reviewed-fields': [
        'action-tab-mismatch', 'no-staged-fields', 'stale-session', 'source-unavailable',
        'source-binding-changed', 'destination-not-ready', 'secure-random-unavailable',
        'storage-unavailable', 'operation-failed',
      ],
      'clear-staged-fields': [
        'no-staged-fields', 'stale-session', 'storage-unavailable', 'operation-failed',
      ],
      'acknowledge-affected-person-inspection': [
        'storage-unavailable', 'acknowledgement-not-available', 'operation-failed',
      ],
      'reset-for-device-owner': ['storage-unavailable', 'reset-not-allowed', 'operation-failed'],
    } as const;
    const everyCode = [
      'invalid-sender', 'invalid-request', 'action-tab-mismatch', 'no-staged-fields',
      'stale-session', 'source-preview-rejected', 'source-unavailable', 'source-binding-changed',
      'destination-not-ready', 'replay-blocked', 'ledger-capacity-reached',
      'secure-random-unavailable', 'storage-unavailable', 'acknowledgement-not-available',
      'reset-not-allowed', 'operation-failed',
    ] as const;
    for (const [command, accepted] of Object.entries(matrix) as Array<[
      WorkerCommand, readonly string[],
    ]>) {
      for (const code of everyCode) {
        const response = {
          schema: WORKER_RESPONSE_SCHEMA, command, state: 'rejected', code,
        };
        expect(Boolean(validateWorkerResponseForCommand(response, command)), `${command}/${code}`)
          .toBe(accepted.includes(code));
      }
    }
    for (const code of everyCode) {
      const response = { schema: WORKER_RESPONSE_SCHEMA, command: null, state: 'rejected', code };
      expect(Boolean(validateWorkerResponseForCommand(response, null)), `null/${code}`)
        .toBe(code === 'invalid-sender' || code === 'invalid-request');
    }
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'rejected',
      code: 'invalid-sender',
    }, null)).toBeNull();
  });

  it('validates exact response and nested key order, deep-freezes output, and rejects hostile keys', () => {
    const candidate = {
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'source-preview',
      preview: {
        language: 'en', simpleMode: false, destinationName: 'Fictional destination fixture',
        routeKey: 'synthetic-fixture', routeRegistryVersion: 'challansakshi.official-routes/v1',
        adapterContractVersion: 'challansakshi.adapter-contract/v1',
        expiresAt: '2027-01-15T08:00:00.000Z', description: 'Reviewed fictional description.',
        categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
      },
      sourcePreviewBinding: binding,
    };
    const validated = validateWorkerResponseForCommand(candidate, 'preview-current-page');
    expect(validated).toEqual(candidate);
    expect(Object.isFrozen(validated)).toBe(true);
    if (validated?.state === 'source-preview') {
      expect(Object.isFrozen(validated.preview)).toBe(true);
      expect(Object.isFrozen(validated.sourcePreviewBinding)).toBe(true);
    }
    expect(validateWorkerResponseForCommand({
      command: candidate.command, schema: candidate.schema, state: candidate.state,
      preview: candidate.preview, sourcePreviewBinding: candidate.sourcePreviewBinding,
    }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand({ ...candidate, extra: true }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand(Object.assign(
      Object.create({ schema: WORKER_RESPONSE_SCHEMA }),
      { command: candidate.command, state: candidate.state, preview: candidate.preview,
        sourcePreviewBinding: candidate.sourcePreviewBinding },
    ), 'preview-current-page')).toBeNull();
    const symbol = Symbol('hidden');
    expect(validateWorkerResponseForCommand(
      Object.assign({ ...candidate }, { [symbol]: true }),
      'preview-current-page',
    )).toBeNull();
    const accessor = { ...candidate } as Record<string, unknown>;
    Object.defineProperty(accessor, 'preview', { enumerable: true, get: () => candidate.preview });
    expect(validateWorkerResponseForCommand(accessor, 'preview-current-page')).toBeNull();
  });

  it('reconstructs every response shape with exact top-level and nested key order', () => {
    const destinationPreview = {
      language: 'en',
      simpleMode: false,
      domain: '127.0.0.1:3000',
      purpose: 'Place the reviewed fictional category and description into the two blank synthetic fields.',
      adapterId: 'synthetic-fixture',
      adapterRevision: 'challansakshi.synthetic-destination/v1',
      lastVerifiedAt: '2026-09-03T00:00:00.000Z',
      adapterExpiresAt: '2026-10-03T00:00:00.000Z',
      description: 'Reviewed fictional description.',
      categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
    };
    const warning = {
      state: 'needs-review',
      packId: PACK_ID,
      replayUntil: REPLAY_UNTIL,
      warningExpiresAt: WARNING_EXPIRES_AT,
    };
    const candidates = [
      {
        value: {
          schema: WORKER_RESPONSE_SCHEMA, command: 'load-reviewed-fields', state: 'staged',
          generation: GENERATION, packId: PACK_ID, effectiveExpiresAtMs: REPLAY_UNTIL,
        },
        command: 'load-reviewed-fields',
        keys: ['schema', 'command', 'state', 'generation', 'packId', 'effectiveExpiresAtMs'],
      },
      {
        value: {
          schema: WORKER_RESPONSE_SCHEMA, command: 'preview-current-page',
          state: 'destination-preview', generation: GENERATION, packId: PACK_ID,
          effectiveExpiresAtMs: REPLAY_UNTIL, preview: destinationPreview,
        },
        command: 'preview-current-page',
        keys: [
          'schema', 'command', 'state', 'generation', 'packId', 'effectiveExpiresAtMs', 'preview',
        ],
      },
      {
        value: fixed('fill-empty-reviewed-fields', 'success'),
        command: 'fill-empty-reviewed-fields',
        keys: ['schema', 'command', 'state'],
      },
      {
        value: {
          schema: WORKER_RESPONSE_SCHEMA, command: 'fill-empty-reviewed-fields',
          state: 'partial', code: 'partial', warning,
        },
        command: 'fill-empty-reviewed-fields',
        keys: ['schema', 'command', 'state', 'code', 'warning'],
      },
      {
        value: {
          schema: WORKER_RESPONSE_SCHEMA, command: 'preview-current-page',
          state: 'needs-review', warning,
        },
        command: 'preview-current-page',
        keys: ['schema', 'command', 'state', 'warning'],
      },
      {
        value: {
          schema: WORKER_RESPONSE_SCHEMA, command: 'clear-staged-fields',
          state: 'rejected', code: 'stale-session',
        },
        command: 'clear-staged-fields',
        keys: ['schema', 'command', 'state', 'code'],
      },
    ] as const;

    for (const candidate of candidates) {
      const validated = validateWorkerResponseForCommand(candidate.value, candidate.command);
      expect(validated, candidate.command).not.toBeNull();
      expect(Object.keys(validated ?? {})).toEqual(candidate.keys);
      expect(Object.isFrozen(validated)).toBe(true);
      if (validated && 'preview' in validated) expect(Object.isFrozen(validated.preview)).toBe(true);
      if (validated && 'warning' in validated) expect(Object.isFrozen(validated.warning)).toBe(true);
    }
    const validatedDestination = validateWorkerResponseForCommand(
      candidates[1].value,
      'preview-current-page',
    );
    expect(validatedDestination?.state).toBe('destination-preview');
    if (validatedDestination?.state === 'destination-preview') {
      expect(Object.keys(validatedDestination.preview)).toEqual([
        'language', 'simpleMode', 'domain', 'purpose', 'adapterId', 'adapterRevision',
        'lastVerifiedAt', 'adapterExpiresAt', 'description', 'categoryPresentation',
      ]);
    }
    const immediate = validateWorkerResponseForCommand(
      candidates[3].value,
      'fill-empty-reviewed-fields',
    );
    if (immediate && 'warning' in immediate) {
      expect(Object.keys(immediate.warning)).toEqual([
        'state', 'packId', 'replayUntil', 'warningExpiresAt',
      ]);
    }
    expect(validateWorkerResponseForCommand({
      ...candidates[4].value,
      warning: {
        packId: PACK_ID,
        state: 'needs-review',
        replayUntil: REPLAY_UNTIL,
        warningExpiresAt: WARNING_EXPIRES_AT,
      },
    }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand({
      ...candidates[1].value,
      preview: {
        simpleMode: false,
        language: 'en',
        domain: destinationPreview.domain,
        purpose: destinationPreview.purpose,
        adapterId: destinationPreview.adapterId,
        adapterRevision: destinationPreview.adapterRevision,
        lastVerifiedAt: destinationPreview.lastVerifiedAt,
        adapterExpiresAt: destinationPreview.adapterExpiresAt,
        description: destinationPreview.description,
        categoryPresentation: destinationPreview.categoryPresentation,
      },
    }, 'preview-current-page')).toBeNull();
  });

  it('checks every exposed timestamp location and exact four-digit canonical DTO ISO', () => {
    const notRepresentable = Number.MAX_SAFE_INTEGER;
    expect(parseWorkerRequest({
      ...buildLoadReviewedFieldsRequest(17, binding),
      sourcePreviewBinding: { ...binding, previewNotAfterMs: notRepresentable },
    })).toBeNull();
    expect(parseWorkerRequest({
      ...buildFillEmptyReviewedFieldsRequest(29, GENERATION, PACK_ID, REPLAY_UNTIL),
      effectiveExpiresAtMs: notRepresentable,
    })).toBeNull();
    expect(parseWorkerRequest({
      ...buildClearStagedFieldsRequest(GENERATION, PACK_ID, REPLAY_UNTIL),
      effectiveExpiresAtMs: notRepresentable,
    })).toBeNull();
    expect(parseWorkerRequest({
      ...buildAcknowledgeAffectedPersonInspectionRequest(
        PACK_ID, REPLAY_UNTIL, WARNING_EXPIRES_AT,
      ),
      warningExpiresAt: notRepresentable,
    })).toBeNull();
    expect(parseWorkerRequest({
      ...buildAcknowledgeAffectedPersonInspectionRequest(
        PACK_ID, REPLAY_UNTIL, WARNING_EXPIRES_AT,
      ),
      replayUntil: notRepresentable,
      warningExpiresAt: notRepresentable,
    })).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'source-preview',
      preview: {
        language: 'en', simpleMode: false, destinationName: 'Fictional destination fixture',
        routeKey: 'synthetic-fixture', routeRegistryVersion: 'challansakshi.official-routes/v1',
        adapterContractVersion: 'challansakshi.adapter-contract/v1',
        expiresAt: '2027-01-15T08:00:00.000Z', description: 'Reviewed fictional description.',
        categoryPresentation: null,
      },
      sourcePreviewBinding: { ...binding, previewNotAfterMs: notRepresentable },
    }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'destination-preview',
      generation: GENERATION,
      packId: PACK_ID,
      effectiveExpiresAtMs: REPLAY_UNTIL,
      preview: {
        language: 'en', simpleMode: false, domain: '127.0.0.1:3000',
        purpose: 'Place the reviewed fictional category and description into the two blank synthetic fields.',
        adapterId: 'synthetic-fixture', adapterRevision: 'challansakshi.synthetic-destination/v1',
        lastVerifiedAt: '2026-09-03T00:00:00Z',
        adapterExpiresAt: '2026-10-03T00:00:00.000Z',
        description: 'Reviewed fictional description.',
        categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
      },
    }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'destination-preview',
      generation: GENERATION,
      packId: PACK_ID,
      effectiveExpiresAtMs: notRepresentable,
      preview: {
        language: 'en', simpleMode: false, domain: '127.0.0.1:3000',
        purpose: 'Place the reviewed fictional category and description into the two blank synthetic fields.',
        adapterId: 'synthetic-fixture', adapterRevision: 'challansakshi.synthetic-destination/v1',
        lastVerifiedAt: '2026-09-03T00:00:00.000Z',
        adapterExpiresAt: '2026-10-03T00:00:00.000Z',
        description: 'Reviewed fictional description.',
        categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
      },
    }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'destination-preview',
      generation: GENERATION,
      packId: PACK_ID,
      effectiveExpiresAtMs: REPLAY_UNTIL,
      preview: {
        language: 'en', simpleMode: false, domain: '127.0.0.1:3000',
        purpose: 'Place the reviewed fictional category and description into the two blank synthetic fields.',
        adapterId: 'synthetic-fixture', adapterRevision: 'challansakshi.synthetic-destination/v1',
        lastVerifiedAt: '2026-09-03T00:00:00.000Z',
        adapterExpiresAt: '2026-10-03T00:00:00Z',
        description: 'Reviewed fictional description.',
        categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
      },
    }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'source-preview',
      preview: {
        language: 'en', simpleMode: false, destinationName: 'Fictional destination fixture',
        routeKey: 'synthetic-fixture', routeRegistryVersion: 'challansakshi.official-routes/v1',
        adapterContractVersion: 'challansakshi.adapter-contract/v1',
        expiresAt: '+010000-01-01T00:00:00.000Z', description: 'Reviewed fictional description.',
        categoryPresentation: '4 Wheeler Challan On 2 Wheeler',
      },
      sourcePreviewBinding: binding,
    }, 'preview-current-page')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'needs-review',
      warning: {
        state: 'needs-review', packId: PACK_ID, replayUntil: REPLAY_UNTIL,
        warningExpiresAt: notRepresentable,
      },
    }, 'fill-empty-reviewed-fields')).toBeNull();
    expect(validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'needs-review',
      warning: {
        state: 'needs-review', packId: PACK_ID, replayUntil: notRepresentable,
        warningExpiresAt: notRepresentable,
      },
    }, 'fill-empty-reviewed-fields')).toBeNull();
  });

  it('exposes a command-correlated return type and the exact two-stage null fallback', () => {
    const preview = validateWorkerResponseForCommand({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'empty',
    }, 'preview-current-page');
    expectTypeOf(preview).not.toBeAny();
    if (preview) expectTypeOf(preview.command).toEqualTypeOf<'preview-current-page'>();

    const invalid = {
      schema: WORKER_RESPONSE_SCHEMA, command: null, state: 'rejected', code: 'invalid-request',
    };
    expect(validateWorkerResponseForCommand(invalid, 'preview-current-page')).toBeNull();
    const fallback = validateWorkerResponseForCommand(invalid, null);
    expect(fallback).not.toBeNull();
    if (fallback) {
      expectTypeOf(fallback.command).toEqualTypeOf<null>();
      expect(fallback.code).toBe('invalid-request');
    }
  });

  it('throws locally for invalid builder inputs instead of emitting malformed requests', () => {
    expect(() => buildPreviewCurrentPageRequest(-1)).toThrow(TypeError);
    expect(() => buildLoadReviewedFieldsRequest(17, {
      ...binding, sourceDocumentId: 'space is forbidden',
    })).toThrow(TypeError);
    expect(() => buildFillEmptyReviewedFieldsRequest(
      29, 'not-opaque', PACK_ID, REPLAY_UNTIL,
    )).toThrow(TypeError);
    expect(() => buildClearStagedFieldsRequest(
      GENERATION, PACK_ID, Number.MAX_SAFE_INTEGER,
    )).toThrow(TypeError);
    expect(() => buildAcknowledgeAffectedPersonInspectionRequest(
      PACK_ID, WARNING_EXPIRES_AT, REPLAY_UNTIL,
    )).toThrow(TypeError);
    expect(() => buildResetForDeviceOwnerRequest({
      schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
      type: 'reset-for-device-owner',
      allRelevantOfficialTabsAndBrowserProcessesClosed: false as true,
    })).toThrow(TypeError);
  });
});
