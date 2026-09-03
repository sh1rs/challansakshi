import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
  EXTENSION_SAFETY_LEDGER_KEY,
  NEEDS_REVIEW_WARNING_LIFETIME_MS,
  SAFETY_LEDGER_CAPACITY,
  SAFETY_LEDGER_SCHEMA,
  acknowledgeNeedsReview,
  armUnresolvedLive,
  assessSafetyLedgerLoad,
  nextSafetyLedgerCleanupAt,
  orphanUnresolvedLive,
  pruneSafetyLedgerAfterReconciliation,
  readSafetyLedger,
  resetSafetyLedgerForDeviceOwner,
  settleSafetyLedger,
  validateSafetyLedger,
  type NeedsReviewSafetyRecordV1,
  type ReplaySafetyRecordV1,
  type SafetyLedgerReadResult,
  type SafetyLedgerV1,
  type SettlementIntentV1,
  type UnresolvedLiveSafetyRecordV1,
} from '../src/safety-ledger';

const PACK_A = '11111111111111111111111111111111';
const PACK_B = '22222222222222222222222222222222';
const PACK_C = '33333333333333333333333333333333';
const NONCE_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const REPLAY_UNTIL = 1_800_000_000_000;
const WARNING_EXPIRES_AT = REPLAY_UNTIL + NEEDS_REVIEW_WARNING_LIFETIME_MS;
const NON_DATE_EPOCH_MS = Number.MAX_SAFE_INTEGER;

const emptyLedger = (): SafetyLedgerV1 => ({
  schema: SAFETY_LEDGER_SCHEMA,
  records: [],
});

const replay = <Outcome extends ReplaySafetyRecordV1['outcome'] = 'complete'>(
  packId = PACK_A,
  replayUntil = REPLAY_UNTIL,
  outcome: Outcome = 'complete' as Outcome,
): ReplaySafetyRecordV1 & Readonly<{ outcome: Outcome }> => ({
  state: 'replay', packId, replayUntil, outcome,
});

const live = (
  packId = PACK_A,
  replayUntil = REPLAY_UNTIL,
  armNonce = NONCE_A,
): UnresolvedLiveSafetyRecordV1 => ({ state: 'unresolved-live', armNonce, packId, replayUntil });

const warning = (
  packId = PACK_A,
  replayUntil = REPLAY_UNTIL,
  warningExpiresAt = WARNING_EXPIRES_AT,
): NeedsReviewSafetyRecordV1 => ({ state: 'needs-review', packId, replayUntil, warningExpiresAt });

const ready = (ledger: SafetyLedgerV1): SafetyLedgerReadResult => ({ status: 'ready', ledger });

type StorageFailure =
  | 'access'
  | 'read'
  | 'write'
  | 'readback'
  | 'missing-readback'
  | 'invalid-readback'
  | 'mismatched-readback'
  | null;

function makeLocalStorage(initial: unknown = undefined, failure: StorageFailure = null) {
  let stored = initial;
  let readCount = 0;
  const calls: Array<readonly [string, unknown]> = [];
  const api = {
    async setAccessLevel(options: unknown) {
      calls.push(['setAccessLevel', options]);
      if (failure === 'access') throw new Error('private platform detail');
    },
    async get(key: unknown) {
      calls.push(['get', key]);
      readCount += 1;
      if (failure === 'read' || (failure === 'readback' && readCount > 1)) {
        throw new Error('private platform detail');
      }
      if (failure === 'invalid-readback' && readCount > 1) {
        return { [EXTENSION_SAFETY_LEDGER_KEY]: { schema: 'invalid', records: [] } };
      }
      if (failure === 'missing-readback') return {};
      if (failure === 'mismatched-readback' && readCount > 1) {
        return { [EXTENSION_SAFETY_LEDGER_KEY]: emptyLedger() };
      }
      return stored === undefined ? {} : { [EXTENSION_SAFETY_LEDGER_KEY]: stored };
    },
    async set(items: Record<string, unknown>) {
      calls.push(['set', items]);
      if (failure === 'write') throw new Error('private platform detail');
      if (failure === 'missing-readback') return;
      stored = JSON.parse(JSON.stringify(items[EXTENSION_SAFETY_LEDGER_KEY]));
    },
    async remove(key: unknown) {
      calls.push(['remove', key]);
      throw new Error('local remove is forbidden');
    },
    async clear() {
      calls.push(['clear', null]);
      throw new Error('local clear is forbidden');
    },
  };
  return {
    api,
    calls,
    stored: () => stored,
  };
}

let local = makeLocalStorage();

beforeEach(() => {
  local = makeLocalStorage();
  vi.stubGlobal('chrome', { storage: { local: local.api } });
});

describe('closed payload-free ledger validation', () => {
  it('locks the frozen persistence contract to independent literals', () => {
    expect(EXTENSION_SAFETY_LEDGER_KEY).toBe('challansakshi.safety-ledger.v1');
    expect(SAFETY_LEDGER_SCHEMA).toBe('challansakshi.safety-ledger/v1');
    expect(DEVICE_OWNER_RESET_ATTESTATION_SCHEMA)
      .toBe('challansakshi.device-owner-reset-attestation/v1');
    expect(SAFETY_LEDGER_CAPACITY).toBe(32);
    expect(NEEDS_REVIEW_WARNING_LIFETIME_MS).toBe(86_400_000);
  });

  it('reconstructs and deeply freezes every exact persisted variant in lexicographic order', () => {
    const candidate = {
      schema: SAFETY_LEDGER_SCHEMA,
      records: [
        live(PACK_A),
        { state: 'unresolved-orphaned', packId: PACK_B, replayUntil: REPLAY_UNTIL },
      ],
    };
    // Only one global blocker is valid, so validate the remaining variants independently.
    const ledgers = [
      { schema: SAFETY_LEDGER_SCHEMA, records: [live()] },
      {
        schema: SAFETY_LEDGER_SCHEMA,
        records: [{ state: 'unresolved-orphaned', packId: PACK_A, replayUntil: REPLAY_UNTIL }],
      },
      { schema: SAFETY_LEDGER_SCHEMA, records: [warning()] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay()] },
      {
        schema: SAFETY_LEDGER_SCHEMA,
        records: [replay(PACK_A), replay(PACK_B, REPLAY_UNTIL + 1, 'inspected')],
      },
    ];

    expect(validateSafetyLedger(candidate)).toEqual({ status: 'quarantined' });
    for (const ledger of ledgers) {
      const result = validateSafetyLedger(ledger);
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') continue;
      expect(result.ledger).not.toBe(ledger);
      expect(Object.keys(result.ledger)).toEqual(['schema', 'records']);
      expect(Object.isFrozen(result.ledger)).toBe(true);
      expect(Object.isFrozen(result.ledger.records)).toBe(true);
      expect(result.ledger.records.every(Object.isFrozen)).toBe(true);
    }
  });

  it('rejects hostile records, wrong key order, malformed IDs/times/outcomes, and coercion without invoking accessors', () => {
    let getterCalls = 0;
    const accessor = Object.defineProperty({}, 'schema', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return SAFETY_LEDGER_SCHEMA;
      },
    });
    const wrongTopOrder = { records: [], schema: SAFETY_LEDGER_SCHEMA };
    const wrongRecordOrder = {
      schema: SAFETY_LEDGER_SCHEMA,
      records: [{ packId: PACK_A, state: 'replay', replayUntil: REPLAY_UNTIL, outcome: 'complete' }],
    };
    const sparse = new Array(1);
    const accessorRecords: unknown[] = [];
    Object.defineProperty(accessorRecords, '0', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error('must not invoke array accessors');
      },
    });
    const inherited = Object.assign(Object.create({ schema: SAFETY_LEDGER_SCHEMA }), { records: [] });
    const invalid = [
      null,
      [],
      accessor,
      wrongTopOrder,
      wrongRecordOrder,
      { schema: SAFETY_LEDGER_SCHEMA, records: sparse },
      { schema: SAFETY_LEDGER_SCHEMA, records: accessorRecords },
      inherited,
      { schema: SAFETY_LEDGER_SCHEMA, records: [], extra: true },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay('A'.repeat(32))] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay('1'.repeat(31))] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay(PACK_A, 0)] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay(PACK_A, Number.MAX_SAFE_INTEGER + 1)] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [{ ...replay(), outcome: 'success' }] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [warning(PACK_A, REPLAY_UNTIL, REPLAY_UNTIL)] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [live(PACK_A, REPLAY_UNTIL, 'b'.repeat(31))] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay(PACK_B), replay(PACK_A)] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay(PACK_A), replay(PACK_A)] },
      {
        schema: SAFETY_LEDGER_SCHEMA,
        records: Array.from({ length: SAFETY_LEDGER_CAPACITY + 1 }, (_, index) => replay(
          index.toString(16).padStart(32, '0'), REPLAY_UNTIL + index,
        )),
      },
      {
        schema: SAFETY_LEDGER_SCHEMA,
        records: [live(PACK_A), warning(PACK_B)],
      },
      new Proxy(emptyLedger(), {
        ownKeys: () => {
          throw new Error('must fail closed');
        },
      }),
      {
        schema: SAFETY_LEDGER_SCHEMA,
        records: [replay({ toString: () => PACK_A } as unknown as string)],
      },
    ];

    for (const candidate of invalid) {
      expect(() => validateSafetyLedger(candidate)).not.toThrow();
      expect(validateSafetyLedger(candidate)).toEqual({ status: 'quarantined' });
    }
    expect(getterCalls).toBe(0);
  });

  it('accepts all four replay outcomes and exactly 32 unique records', () => {
    for (const outcome of [
      'complete', 'inspected', 'closed-unresolved', 'cancelled-before-dispatch',
    ] as const) {
      expect(validateSafetyLedger({
        schema: SAFETY_LEDGER_SCHEMA,
        records: [replay(PACK_A, REPLAY_UNTIL, outcome)],
      }).status).toBe('ready');
    }
    const records = Array.from({ length: SAFETY_LEDGER_CAPACITY }, (_, index) => replay(
      index.toString(16).padStart(32, '0'), REPLAY_UNTIL + index,
    ));
    expect(validateSafetyLedger({ schema: SAFETY_LEDGER_SCHEMA, records }).status).toBe('ready');
  });

  it('rejects Date-unrepresentable safe integers in every persisted record time position', () => {
    const invalidRecords = [
      live(PACK_A, NON_DATE_EPOCH_MS),
      { state: 'unresolved-orphaned', packId: PACK_A, replayUntil: NON_DATE_EPOCH_MS },
      replay(PACK_A, NON_DATE_EPOCH_MS),
      warning(PACK_A, NON_DATE_EPOCH_MS - 1, NON_DATE_EPOCH_MS),
      warning(PACK_A, REPLAY_UNTIL, NON_DATE_EPOCH_MS),
    ];

    for (const record of invalidRecords) {
      const candidate = { schema: SAFETY_LEDGER_SCHEMA, records: [record] };
      expect(() => validateSafetyLedger(candidate)).not.toThrow();
      expect(validateSafetyLedger(candidate)).toEqual({ status: 'quarantined' });
    }
  });
});

describe('raw trusted-context local I/O', () => {
  it('resolves TRUSTED_CONTEXTS before the first exact-key read and accepts true absence as empty', async () => {
    const accessFailure = makeLocalStorage(undefined, 'access');
    vi.stubGlobal('chrome', { storage: { local: accessFailure.api } });
    await expect(readSafetyLedger()).resolves.toEqual({
      status: 'unavailable', reason: 'access-level-failed',
    });
    expect(accessFailure.calls).toEqual([
      ['setAccessLevel', { accessLevel: 'TRUSTED_CONTEXTS' }],
    ]);

    local = makeLocalStorage();
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const result = await readSafetyLedger();
    expect(result).toEqual({ status: 'ready', ledger: emptyLedger() });
    expect(local.calls).toEqual([
      ['setAccessLevel', { accessLevel: 'TRUSTED_CONTEXTS' }],
      ['get', EXTENSION_SAFETY_LEDGER_KEY],
    ]);
  });

  it('distinguishes malformed present data from storage failure without leaking either', async () => {
    local = makeLocalStorage({ schema: 'old-or-invalid', records: [] });
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    await expect(readSafetyLedger()).resolves.toEqual({ status: 'quarantined' });

    local = makeLocalStorage(undefined, 'read');
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    await expect(readSafetyLedger()).resolves.toEqual({
      status: 'unavailable', reason: 'storage-read-failed',
    });
  });

  it('gates a direct mutation before its first local write or readback in a fresh worker lifetime', async () => {
    vi.resetModules();
    local = makeLocalStorage(emptyLedger());
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const isolated = await import('../src/safety-ledger');
    await expect(isolated.armUnresolvedLive(
      { status: 'ready', ledger: emptyLedger() }, live(),
    )).resolves.toMatchObject({ status: 'confirmed' });
    expect(local.calls.map(([operation]) => operation)).toEqual([
      'setAccessLevel', 'set', 'get',
    ]);
  });

  it.each([
    ['write', 'storage-write-failed'],
    ['readback', 'storage-readback-failed'],
    ['invalid-readback', 'readback-invalid'],
    ['mismatched-readback', 'readback-mismatch'],
  ] as const)('reports fixed %s failure without retry, removal, or raw output', async (failure, reason) => {
    local = makeLocalStorage(emptyLedger(), failure);
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const state = await readSafetyLedger();
    const result = await armUnresolvedLive(state, live());
    expect(result).toEqual({ status: 'unavailable', reason });
    expect(local.calls.filter(([operation]) => operation === 'set')).toHaveLength(1);
    expect(local.calls.some(([operation]) => operation === 'remove' || operation === 'clear')).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private platform detail');
  });

  it('rejects missing exact-key readback after writing canonical empty state', async () => {
    local = makeLocalStorage(warning(), 'missing-readback');
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const result = await acknowledgeNeedsReview(
      ready({ schema: SAFETY_LEDGER_SCHEMA, records: [warning()] }),
      { packId: PACK_A, replayUntil: REPLAY_UNTIL, warningExpiresAt: WARNING_EXPIRES_AT },
      REPLAY_UNTIL,
    );
    expect(result).toEqual({ status: 'unavailable', reason: 'readback-invalid' });
    expect(local.calls.map(([operation]) => operation)).toEqual([
      'set', 'get',
    ]);
    expect(JSON.stringify(result)).not.toContain('private platform detail');
  });
});

describe('load decisions, arming, and capacity', () => {
  it('applies quarantine/unavailable, blocker, same-pack replay, capacity, then allow precedence', () => {
    expect(assessSafetyLedgerLoad({ status: 'quarantined' }, PACK_A))
      .toEqual({ status: 'quarantined' });
    expect(assessSafetyLedgerLoad({
      status: 'unavailable', reason: 'storage-read-failed',
    }, PACK_A)).toEqual({ status: 'unavailable', reason: 'storage-read-failed' });
    expect(assessSafetyLedgerLoad(ready({
      schema: SAFETY_LEDGER_SCHEMA,
      records: [live(PACK_A)],
    }), PACK_A)).toEqual({ status: 'blocked', reason: 'global-blocker' });
    expect(assessSafetyLedgerLoad(ready({
      schema: SAFETY_LEDGER_SCHEMA,
      records: [replay(PACK_A)],
    }), PACK_A)).toEqual({ status: 'blocked', reason: 'same-pack-replay' });
    const full = {
      schema: SAFETY_LEDGER_SCHEMA,
      records: Array.from({ length: SAFETY_LEDGER_CAPACITY }, (_, index) => replay(
        index.toString(16).padStart(32, '0'), REPLAY_UNTIL + index,
      )),
    };
    expect(assessSafetyLedgerLoad(ready(full), 'f'.repeat(32)))
      .toEqual({ status: 'blocked', reason: 'capacity-reached' });
    expect(assessSafetyLedgerLoad(ready(emptyLedger()), PACK_A)).toEqual({ status: 'ready' });
  });

  it('arms one exact live blocker, writes sorted state, and confirms exact readback', async () => {
    local = makeLocalStorage({
      schema: SAFETY_LEDGER_SCHEMA,
      records: [replay(PACK_B)],
    });
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const state = await readSafetyLedger();
    const result = await armUnresolvedLive(state, live(PACK_A));
    expect(result).toEqual({
      status: 'confirmed',
      ledger: {
        schema: SAFETY_LEDGER_SCHEMA,
        records: [live(PACK_A), replay(PACK_B)],
      },
    });
    expect(local.stored()).toEqual((result as { ledger: SafetyLedgerV1 }).ledger);
    const setCall = local.calls.find(([operation]) => operation === 'set');
    expect(setCall?.[1]).toEqual({
      [EXTENSION_SAFETY_LEDGER_KEY]: (result as { ledger: SafetyLedgerV1 }).ledger,
    });
  });

  it('never evicts a blocker, replay, or active record to arm a new pack', async () => {
    for (const [ledger, expected] of [
      [{ schema: SAFETY_LEDGER_SCHEMA, records: [warning(PACK_A)] }, 'global-blocker'],
      [{ schema: SAFETY_LEDGER_SCHEMA, records: [replay(PACK_A)] }, 'same-pack-replay'],
      [{
        schema: SAFETY_LEDGER_SCHEMA,
        records: Array.from({ length: SAFETY_LEDGER_CAPACITY }, (_, index) => replay(
          index.toString(16).padStart(32, '0'), REPLAY_UNTIL + index,
        )),
      }, 'capacity-reached'],
    ] as const) {
      local = makeLocalStorage(ledger);
      vi.stubGlobal('chrome', { storage: { local: local.api } });
      const state = await readSafetyLedger();
      expect(await armUnresolvedLive(state, live(
        expected === 'same-pack-replay' ? PACK_A : 'f'.repeat(32),
      ))).toEqual({ status: 'blocked', reason: expected });
      expect(local.calls.filter(([operation]) => operation === 'set')).toHaveLength(0);
    }
  });
});

describe('settlement, orphaning, acknowledgement, and cleanup', () => {
  const completeIntent = (): SettlementIntentV1 => ({
    cause: 'injection-result',
    terminal: replay(PACK_A, REPLAY_UNTIL, 'complete'),
  });

  it('accepts only exact cause/terminal pairings and replaces only the matching live marker', async () => {
    const valid: SettlementIntentV1[] = [
      completeIntent(),
      { cause: 'injection-result', terminal: warning() },
      {
        cause: 'cancelled-before-dispatch',
        terminal: replay(PACK_A, REPLAY_UNTIL, 'cancelled-before-dispatch'),
      },
      {
        cause: 'destination-tab-removed',
        terminal: replay(PACK_A, REPLAY_UNTIL, 'closed-unresolved'),
      },
    ];
    for (const intent of valid) {
      local = makeLocalStorage({ schema: SAFETY_LEDGER_SCHEMA, records: [live()] });
      vi.stubGlobal('chrome', { storage: { local: local.api } });
      const state = await readSafetyLedger();
      const result = await settleSafetyLedger(state, live(), intent);
      expect(result).toEqual({
        status: 'confirmed',
        ledger: { schema: SAFETY_LEDGER_SCHEMA, records: [intent.terminal] },
      });
    }

    const invalid = [
      { cause: 'injection-result', terminal: replay(PACK_A, REPLAY_UNTIL, 'inspected') },
      {
        cause: 'cancelled-before-dispatch',
        terminal: replay(PACK_A, REPLAY_UNTIL, 'complete'),
      },
      {
        cause: 'destination-tab-removed',
        terminal: warning(),
      },
      { terminal: replay(), cause: 'injection-result' },
      { ...completeIntent(), extra: true },
    ];
    for (const intent of invalid) {
      expect(await settleSafetyLedger(
        ready({ schema: SAFETY_LEDGER_SCHEMA, records: [live()] }), live(),
        intent as SettlementIntentV1,
      )).toEqual({ status: 'quarantined' });
    }
  });

  it('allows no-record cancellation, accepts an already-written exact terminal, and quarantines all other correlations', async () => {
    const cancelled: SettlementIntentV1 = {
      cause: 'cancelled-before-dispatch',
      terminal: replay(PACK_A, REPLAY_UNTIL, 'cancelled-before-dispatch'),
    };
    expect((await settleSafetyLedger(ready(emptyLedger()), live(), cancelled)).status).toBe('confirmed');
    expect(await settleSafetyLedger(ready({
      schema: SAFETY_LEDGER_SCHEMA,
      records: [cancelled.terminal],
    }), live(), cancelled)).toEqual({
      status: 'confirmed',
      ledger: { schema: SAFETY_LEDGER_SCHEMA, records: [cancelled.terminal] },
    });

    for (const ledger of [
      emptyLedger(),
      { schema: SAFETY_LEDGER_SCHEMA, records: [live(PACK_A, REPLAY_UNTIL, 'b'.repeat(32))] },
      { schema: SAFETY_LEDGER_SCHEMA, records: [replay(PACK_A, REPLAY_UNTIL, 'inspected')] },
    ]) {
      expect(await settleSafetyLedger(ready(ledger), live(), completeIntent()))
        .toEqual({ status: 'quarantined' });
    }
  });

  it('quarantines Date-unrepresentable settlement terminal times without throwing', async () => {
    const cases = [
      {
        expected: live(PACK_A, NON_DATE_EPOCH_MS),
        intent: {
          cause: 'injection-result',
          terminal: replay(PACK_A, NON_DATE_EPOCH_MS, 'complete'),
        },
      },
      {
        expected: live(PACK_A, NON_DATE_EPOCH_MS - 1),
        intent: {
          cause: 'injection-result',
          terminal: warning(PACK_A, NON_DATE_EPOCH_MS - 1, NON_DATE_EPOCH_MS),
        },
      },
      {
        expected: live(PACK_A, NON_DATE_EPOCH_MS),
        intent: {
          cause: 'cancelled-before-dispatch',
          terminal: replay(PACK_A, NON_DATE_EPOCH_MS, 'cancelled-before-dispatch'),
        },
      },
      {
        expected: live(PACK_A, NON_DATE_EPOCH_MS),
        intent: {
          cause: 'destination-tab-removed',
          terminal: replay(PACK_A, NON_DATE_EPOCH_MS, 'closed-unresolved'),
        },
      },
    ] as const;

    for (const { expected, intent } of cases) {
      const state = ready({ schema: SAFETY_LEDGER_SCHEMA, records: [expected] });
      await expect(settleSafetyLedger(state, expected, intent)).resolves
        .toEqual({ status: 'quarantined' });
    }
  });

  it('returns invalid-input for Date-unrepresentable operation times', async () => {
    await expect(pruneSafetyLedgerAfterReconciliation(
      ready(emptyLedger()), NON_DATE_EPOCH_MS,
    )).resolves.toEqual({ status: 'blocked', reason: 'invalid-input' });
    await expect(acknowledgeNeedsReview(
      ready({ schema: SAFETY_LEDGER_SCHEMA, records: [warning()] }),
      { packId: PACK_A, replayUntil: REPLAY_UNTIL, warningExpiresAt: WARNING_EXPIRES_AT },
      NON_DATE_EPOCH_MS,
    )).resolves.toEqual({ status: 'blocked', reason: 'invalid-input' });
  });

  it('persists an expired terminal during reconciliation before pruning it in a separate confirmed write', async () => {
    const expiredAt = REPLAY_UNTIL - 1;
    const expectedLive = live(PACK_A, expiredAt);
    const intent: SettlementIntentV1 = {
      cause: 'destination-tab-removed',
      terminal: replay(PACK_A, expiredAt, 'closed-unresolved'),
    };
    local = makeLocalStorage({ schema: SAFETY_LEDGER_SCHEMA, records: [expectedLive] });
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const state = await readSafetyLedger();
    const settled = await settleSafetyLedger(state, expectedLive, intent);
    expect(settled.status).toBe('confirmed');
    if (settled.status !== 'confirmed') return;
    expect(local.calls.filter(([operation]) => operation === 'set').map(([, payload]) => payload))
      .toEqual([{ [EXTENSION_SAFETY_LEDGER_KEY]: {
        schema: SAFETY_LEDGER_SCHEMA, records: [intent.terminal],
      } }]);

    local = makeLocalStorage(settled.ledger);
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const pruned = await pruneSafetyLedgerAfterReconciliation(ready(settled.ledger), REPLAY_UNTIL);
    expect(pruned).toEqual({ status: 'confirmed', ledger: emptyLedger() });
    expect(local.calls.filter(([operation]) => operation === 'set').map(([, payload]) => payload))
      .toEqual([{ [EXTENSION_SAFETY_LEDGER_KEY]: emptyLedger() }]);
  });

  it('orphan conversion requires confirmed session absence and strips only the nonce', async () => {
    local = makeLocalStorage({ schema: SAFETY_LEDGER_SCHEMA, records: [live()] });
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const state = await readSafetyLedger();
    expect(await orphanUnresolvedLive(state, live(), false)).toEqual({ status: 'quarantined' });
    const result = await orphanUnresolvedLive(state, live(), true);
    expect(result).toEqual({
      status: 'confirmed',
      ledger: {
        schema: SAFETY_LEDGER_SCHEMA,
        records: [{ state: 'unresolved-orphaned', packId: PACK_A, replayUntil: REPLAY_UNTIL }],
      },
    });
    expect(JSON.stringify(result)).not.toContain(NONCE_A);
  });

  it('acknowledges only the exact active warning and never invents inspection on expiry', async () => {
    const acknowledgement = { packId: PACK_A, replayUntil: REPLAY_UNTIL, warningExpiresAt: WARNING_EXPIRES_AT };
    local = makeLocalStorage({ schema: SAFETY_LEDGER_SCHEMA, records: [warning()] });
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const state = await readSafetyLedger();
    expect(await acknowledgeNeedsReview(state, acknowledgement, REPLAY_UNTIL - 1)).toEqual({
      status: 'confirmed',
      ledger: {
        schema: SAFETY_LEDGER_SCHEMA,
        records: [replay(PACK_A, REPLAY_UNTIL, 'inspected')],
      },
    });

    local = makeLocalStorage({ schema: SAFETY_LEDGER_SCHEMA, records: [warning()] });
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const afterReplay = await acknowledgeNeedsReview(
      await readSafetyLedger(), acknowledgement, REPLAY_UNTIL,
    );
    expect(afterReplay).toEqual({ status: 'confirmed', ledger: emptyLedger() });

    expect(await acknowledgeNeedsReview(
      ready({ schema: SAFETY_LEDGER_SCHEMA, records: [warning()] }),
      { ...acknowledgement, warningExpiresAt: WARNING_EXPIRES_AT + 1 },
      REPLAY_UNTIL,
    )).toEqual({ status: 'blocked', reason: 'acknowledgement-not-available' });
  });

  it('prunes replay and warnings at exact deadlines while unresolved variants stay pinned forever', async () => {
    const ledger = {
      schema: SAFETY_LEDGER_SCHEMA,
      records: [
        live('0'.repeat(32), 1),
        replay(PACK_A, REPLAY_UNTIL),
        replay(PACK_B, REPLAY_UNTIL + 1),
      ],
    };
    local = makeLocalStorage(ledger);
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    expect(await pruneSafetyLedgerAfterReconciliation(
      await readSafetyLedger(), REPLAY_UNTIL,
    )).toEqual({
      status: 'confirmed',
      ledger: { schema: SAFETY_LEDGER_SCHEMA, records: [live('0'.repeat(32), 1), replay(PACK_B, REPLAY_UNTIL + 1)] },
    });

    const warningLedger = { schema: SAFETY_LEDGER_SCHEMA, records: [warning()] };
    expect((await pruneSafetyLedgerAfterReconciliation(
      ready(warningLedger), WARNING_EXPIRES_AT - 1,
    ) as { ledger: SafetyLedgerV1 }).ledger.records).toEqual([warning()]);
    local = makeLocalStorage(warningLedger);
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    expect(await pruneSafetyLedgerAfterReconciliation(
      await readSafetyLedger(), WARNING_EXPIRES_AT,
    )).toEqual({ status: 'confirmed', ledger: emptyLedger() });
  });

  it('returns only the next replay or warning cleanup timestamp and ignores unresolved times', () => {
    expect(nextSafetyLedgerCleanupAt(ready(emptyLedger())))
      .toEqual({ status: 'ready', nextCleanupAt: null });
    expect(nextSafetyLedgerCleanupAt(ready({
      schema: SAFETY_LEDGER_SCHEMA,
      records: [live(PACK_A, 1)],
    }))).toEqual({ status: 'ready', nextCleanupAt: null });
    expect(nextSafetyLedgerCleanupAt(ready({
      schema: SAFETY_LEDGER_SCHEMA,
      records: [replay(PACK_A, REPLAY_UNTIL + 1), replay(PACK_B, REPLAY_UNTIL)],
    }))).toEqual({ status: 'ready', nextCleanupAt: REPLAY_UNTIL });
    expect(nextSafetyLedgerCleanupAt(ready({
      schema: SAFETY_LEDGER_SCHEMA,
      records: [warning(PACK_A, REPLAY_UNTIL, WARNING_EXPIRES_AT)],
    }))).toEqual({ status: 'ready', nextCleanupAt: WARNING_EXPIRES_AT });
  });
});

describe('exceptional device-owner reset', () => {
  const attestation = {
    schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
    type: 'reset-for-device-owner',
    allRelevantOfficialTabsAndBrowserProcessesClosed: true,
  } as const;

  it('requires the exact plain ordered attestation and independently confirmed missing session', async () => {
    const invalid = [
      { ...attestation, allRelevantOfficialTabsAndBrowserProcessesClosed: 1 },
      { ...attestation, extra: true },
      {
        type: 'reset-for-device-owner',
        schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
        allRelevantOfficialTabsAndBrowserProcessesClosed: true,
      },
      Object.assign(Object.create({}), attestation),
      new Proxy(attestation, { ownKeys: () => { throw new Error('must fail closed'); } }),
    ];
    for (const candidate of invalid) {
      await expect(resetSafetyLedgerForDeviceOwner(
        { status: 'quarantined' }, true, candidate,
      )).resolves.toEqual({ status: 'blocked', reason: 'reset-not-allowed' });
    }
    await expect(resetSafetyLedgerForDeviceOwner(
      { status: 'quarantined' }, { valueOf: () => true }, attestation,
    )).resolves.toEqual({ status: 'blocked', reason: 'reset-not-allowed' });
    await expect(resetSafetyLedgerForDeviceOwner(
      { status: 'quarantined' }, false, attestation,
    )).resolves.toEqual({ status: 'blocked', reason: 'reset-not-allowed' });
  });

  it('replaces quarantined reserved-key data with canonical empty state only after both reset proofs', async () => {
    local = makeLocalStorage({ privateInvalidBlob: true });
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    const state = await readSafetyLedger();
    expect(state).toEqual({ status: 'quarantined' });
    expect(await resetSafetyLedgerForDeviceOwner(state, true, attestation)).toEqual({
      status: 'confirmed', ledger: emptyLedger(),
    });
    expect(local.stored()).toEqual(emptyLedger());
  });

  it('removes only a valid orphan and preserves all replay records', async () => {
    const ledger = {
      schema: SAFETY_LEDGER_SCHEMA,
      records: [
        replay(PACK_A),
        { state: 'unresolved-orphaned' as const, packId: PACK_B, replayUntil: REPLAY_UNTIL + 1 },
        replay(PACK_C, REPLAY_UNTIL + 2, 'closed-unresolved'),
      ],
    };
    local = makeLocalStorage(ledger);
    vi.stubGlobal('chrome', { storage: { local: local.api } });
    expect(await resetSafetyLedgerForDeviceOwner(
      await readSafetyLedger(), true, attestation,
    )).toEqual({
      status: 'confirmed',
      ledger: { schema: SAFETY_LEDGER_SCHEMA, records: [ledger.records[0], ledger.records[2]] },
    });
  });

  it('never resets valid live, warning, replay-only, empty, or unavailable state', async () => {
    for (const state of [
      ready(emptyLedger()),
      ready({ schema: SAFETY_LEDGER_SCHEMA, records: [live()] }),
      ready({ schema: SAFETY_LEDGER_SCHEMA, records: [warning()] }),
      ready({ schema: SAFETY_LEDGER_SCHEMA, records: [replay()] }),
    ]) {
      expect(await resetSafetyLedgerForDeviceOwner(state, true, attestation))
        .toEqual({ status: 'blocked', reason: 'reset-not-allowed' });
    }
    expect(await resetSafetyLedgerForDeviceOwner({
      status: 'unavailable', reason: 'storage-read-failed',
    }, true, attestation)).toEqual({ status: 'unavailable', reason: 'storage-read-failed' });
  });
});

describe('audited ownership and privacy surface', () => {
  it('keeps every local-storage call in this module and has no removal/clear or forbidden record vocabulary', () => {
    const sourceRoot = resolve(import.meta.dirname, '../src');
    const sources = readdirSync(sourceRoot)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => [name, readFileSync(resolve(sourceRoot, name), 'utf8')] as const);
    expect(sources.filter(([, source]) => source.includes('chrome.storage.local')).map(([name]) => name))
      .toEqual(['safety-ledger.ts']);
    const ledgerSource = sources.find(([name]) => name === 'safety-ledger.ts')?.[1] ?? '';
    expect(ledgerSource).not.toMatch(/storage\.local\.(?:remove|clear)\s*\(/);
    for (const forbidden of [
      'description', 'digest', 'route', 'issue', 'sourceTabId', 'destinationTabId',
      'documentId', 'attemptId', 'attemptNotAfterMs', 'deadline', 'selector', 'envelope',
      'credential', 'secret', 'captcha', 'otp', 'payment',
    ]) {
      expect(ledgerSource.toLowerCase(), forbidden).not.toContain(forbidden.toLowerCase());
    }
  });
});
