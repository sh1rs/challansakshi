import { describe, expect, it, vi } from 'vitest';
import {
  assistanceActionFingerprint, createAssistanceSession, createSyntheticPortal, observeAssistance,
  restoreAssistanceCheckpoint, serializeAssistanceCheckpoint, transitionAssistance, validateAssistanceSession,
  type AssistanceAction, type AssistanceScenario,
} from '../lib/mobility/assistance';

const NOW = 1_788_690_000_000;
function session(scenario: AssistanceScenario = 'success') { return createAssistanceSession('practice-1', scenario); }
function awaitingApproval(scenario: AssistanceScenario = 'success') {
  return transitionAssistance(transitionAssistance(session(scenario), { type: 'begin-private' }, NOW), { type: 'finish-private' }, NOW);
}
function approved(scenario: AssistanceScenario = 'success') {
  return transitionAssistance(awaitingApproval(scenario), { type: 'approve', executionKey: 'execution-1' }, NOW);
}
function executing(scenario: AssistanceScenario = 'success') {
  return transitionAssistance(approved(scenario), { type: 'execute' }, NOW);
}

describe('synthetic citizen-controlled assistance', () => {
  it('requires review, private completion and explicit approval before an action can execute', () => {
    const start = session();
    expect(start.stage).toBe('review');
    for (const current of [start, transitionAssistance(start, { type: 'begin-private' }, NOW), awaitingApproval()]) {
      expect(() => transitionAssistance(current, { type: 'execute' }, NOW)).toThrow(/approval|stage/i);
    }
    expect(() => transitionAssistance(start, { type: 'approve', executionKey: 'execution-1' }, NOW)).toThrow(/stage/i);
    expect(executing().stage).toBe('executing');
  });

  it('blocks the observation reader while the citizen is in private mode', () => {
    const privateState = transitionAssistance(session(), { type: 'begin-private' }, NOW);
    const reader = vi.fn(() => 'PRIVATE-PRACTICE-WORD');
    const observation = observeAssistance(privateState, reader);
    expect(reader).not.toHaveBeenCalled();
    expect(observation).toEqual({ blocked: true, stage: 'private' });
    expect(JSON.stringify(observation)).not.toContain('PRIVATE-PRACTICE-WORD');
    expect(observeAssistance(awaitingApproval(), () => 'Synthetic portal ready.')).toMatchObject({ blocked: false, text: 'Synthetic portal ready.' });
  });

  it('accepts private completion without input values and rejects accidental private-value payloads', () => {
    const privateState = transitionAssistance(session(), { type: 'begin-private' }, NOW);
    expect(() => transitionAssistance(privateState, { type: 'finish-private', value: 'PRIVATE-PRACTICE-WORD' } as never, NOW)).toThrow(/unexpected|field/i);
    const finished = transitionAssistance(privateState, { type: 'finish-private' }, NOW);
    expect(finished.stage).toBe('approval');
    expect(finished.privateCompleted).toBe(true);
    expect(JSON.stringify(finished)).not.toContain('PRIVATE-PRACTICE-WORD');
  });

  it.each([
    { caseId: 'DEMO-TRANSFER-02' }, { caseRevision: 2 }, { recipient: 'synthetic-transfer-desk' },
    { amountPaise: 50_000 }, { request: 'A different fictional request.' },
  ] as Partial<AssistanceAction>[])('invalidates approval when reviewed action details change: %o', change => {
    const original = approved();
    const changed = transitionAssistance(original, { type: 'edit', action: { ...original.action, ...change } }, NOW);
    expect(changed.stage).toBe('review');
    expect(changed.approval).toBeNull();
    expect(changed.privateCompleted).toBe(false);
    expect(assistanceActionFingerprint(changed.action)).not.toBe(assistanceActionFingerprint(original.action));
    expect(() => transitionAssistance(changed, { type: 'execute' }, NOW)).toThrow(/approval|stage/i);
  });

  it('rejects forged approval bindings and expired approvals at the execution boundary', () => {
    const original = approved();
    expect(() => validateAssistanceSession({ ...original, action: { ...original.action, amountPaise: 99_900 } })).toThrow(/approval|binding/i);
    expect(() => transitionAssistance(original, { type: 'execute' }, NOW + 5 * 60_000)).toThrow(/expired/i);
    expect(() => createSyntheticPortal().execute(executing(), NOW + 5 * 60_000)).toThrow(/expired/i);
  });

  it('completes only after a receipt matches the full reviewed action', () => {
    const current = executing();
    const portal = createSyntheticPortal();
    const result = portal.execute(current, NOW);
    expect(result.kind).toBe('receipt');
    if (result.kind !== 'receipt') throw new Error('Expected a synthetic receipt.');
    const complete = transitionAssistance(current, { type: 'receipt', receipt: result.receipt }, NOW);
    expect(complete.stage).toBe('complete');
    expect(complete.receipt?.kind).toBe('synthetic');
    expect(complete.approval).toBeNull();
    expect(portal.snapshot()).toHaveLength(1);
  });

  it.each(['caseId', 'caseRevision', 'recipient', 'amountPaise', 'request', 'executionKey'] as const)('rejects a receipt with mismatched %s', field => {
    const current = executing();
    const result = createSyntheticPortal().execute(current, NOW);
    if (result.kind !== 'receipt') throw new Error('Expected a synthetic receipt.');
    const wrong = { ...result.receipt, [field]: field === 'amountPaise' ? 99_900 : field === 'caseRevision' ? 2 : field === 'recipient' ? 'synthetic-transfer-desk' : field === 'caseId' ? 'DEMO-TRANSFER-02' : 'different-value' };
    const resultState = transitionAssistance(current, { type: 'receipt', receipt: wrong }, NOW);
    expect(resultState.stage).toBe('inconclusive');
    expect(resultState.reason).toBe('receipt-mismatch');
    expect(() => transitionAssistance(resultState, { type: 'execute' }, NOW)).toThrow(/stage|check/i);
  });

  it('deduplicates the same execution key and rejects reusing it for different reviewed content', () => {
    const portal = createSyntheticPortal();
    const first = executing();
    const receipt = portal.execute(first, NOW);
    expect(portal.execute(first, NOW)).toMatchObject({ ...receipt, duplicate: true });
    expect(portal.snapshot()).toHaveLength(1);
    let changed = transitionAssistance(awaitingApproval(), { type: 'edit', action: { ...first.action, request: 'New practice request' } }, NOW);
    changed = transitionAssistance(changed, { type: 'begin-private' }, NOW);
    changed = transitionAssistance(changed, { type: 'finish-private' }, NOW);
    changed = transitionAssistance(changed, { type: 'approve', executionKey: 'execution-1' }, NOW);
    changed = transitionAssistance(changed, { type: 'execute' }, NOW);
    expect(() => portal.execute(changed, NOW)).toThrow(/execution key|different/i);
    expect(portal.snapshot()).toHaveLength(1);
  });

  it.each(['timeout', 'mismatched-receipt'] as const)('recovers %s by checking the existing outcome without a second execution', scenario => {
    const portal = createSyntheticPortal();
    let current = executing(scenario);
    const result = portal.execute(current, NOW);
    current = transitionAssistance(current, result.kind === 'timeout' ? { type: 'timeout' } : { type: 'receipt', receipt: result.receipt }, NOW);
    expect(current.stage).toBe('inconclusive');
    expect(() => transitionAssistance(current, { type: 'approve', executionKey: 'execution-2' }, NOW)).toThrow(/stage/i);
    expect(() => transitionAssistance(current, { type: 'edit', action: current.action }, NOW)).toThrow(/stage/i);
    current = transitionAssistance(current, { type: 'check-outcome' }, NOW);
    current = transitionAssistance(current, { type: 'outcome', receipt: portal.checkOutcome(current) }, NOW);
    expect(current.stage).toBe('complete');
    expect(portal.snapshot()).toHaveLength(1);
  });

  it('requires a confirmed absent synthetic outcome and a new explicit approval after an interrupted attempt', () => {
    const portal = createSyntheticPortal();
    let current = transitionAssistance(executing(), { type: 'interrupt' }, NOW);
    expect(current.stage).toBe('inconclusive');
    expect(current.reason).toBe('interrupted');
    expect(() => transitionAssistance(current, { type: 'review-again' }, NOW)).toThrow(/stage/i);
    current = transitionAssistance(current, { type: 'check-outcome' }, NOW);
    current = transitionAssistance(current, { type: 'outcome', receipt: portal.checkOutcome(current) }, NOW);
    expect(current.stage).toBe('retry');
    expect(current.approval).toBeNull();
    current = transitionAssistance(current, { type: 'review-again' }, NOW);
    expect(current.stage).toBe('approval');
    current = transitionAssistance(current, { type: 'approve', executionKey: 'execution-2' }, NOW);
    current = transitionAssistance(current, { type: 'execute' }, NOW);
    expect(portal.execute(current, NOW).kind).toBe('receipt');
    expect(portal.snapshot()).toHaveLength(1);
  });

  it('resumes a checkpoint interrupted during execution as inconclusive and retains the synthetic ledger', () => {
    const portal = createSyntheticPortal();
    const current = executing('timeout');
    portal.execute(current, NOW);
    const checkpoint = serializeAssistanceCheckpoint(current, portal.snapshot());
    const restored = restoreAssistanceCheckpoint(checkpoint);
    expect(restored.session.stage).toBe('inconclusive');
    expect(restored.session.reason).toBe('interrupted');
    expect(restored.session.approval).toBeNull();
    const checking = transitionAssistance(restored.session, { type: 'check-outcome' }, NOW);
    expect(createSyntheticPortal(restored.records).checkOutcome(checking)).not.toBeNull();
  });

  it('resumes private mode at review with no retained private completion or observation', () => {
    const current = transitionAssistance(session(), { type: 'begin-private' }, NOW);
    const checkpoint = serializeAssistanceCheckpoint(current, []);
    const restored = restoreAssistanceCheckpoint(checkpoint);
    expect(restored.session.stage).toBe('review');
    expect(restored.session.privateCompleted).toBe(false);
    expect(restored.session.approval).toBeNull();
  });

  it('never restores permission to execute from an approved checkpoint', () => {
    const restored = restoreAssistanceCheckpoint(serializeAssistanceCheckpoint(approved(), []));
    expect(restored.session.stage).toBe('approval');
    expect(restored.session.approval).toBeNull();
    expect(() => transitionAssistance(restored.session, { type: 'execute' }, NOW)).toThrow(/stage/i);
  });

  it('rejects malformed state, extra private fields, oversized histories and non-synthetic receipts', () => {
    expect(() => validateAssistanceSession({ ...session(), privateValue: 'do-not-retain' })).toThrow(/unexpected/i);
    expect(() => validateAssistanceSession({ ...session(), stage: 'complete' })).toThrow(/receipt|invariant/i);
    expect(() => validateAssistanceSession({ ...session(), events: Array(81).fill('created') })).toThrow(/80/i);
    expect(() => restoreAssistanceCheckpoint('{bad')).toThrow();
    expect(() => createSyntheticPortal([{ kind: 'official' } as never])).toThrow(/synthetic|receipt/i);
    expect(() => transitionAssistance(session(), { type: 'edit', action: { ...session().action, recipient: 'https://real.example' } } as never, NOW)).toThrow(/recipient/i);
  });

  it('does not mutate previous session values or accept a backwards approval clock', () => {
    const current = awaitingApproval();
    const snapshot = JSON.stringify(current);
    const next = transitionAssistance(current, { type: 'approve', executionKey: 'execution-1' }, NOW);
    expect(JSON.stringify(current)).toBe(snapshot);
    expect(() => transitionAssistance(next, { type: 'execute' }, NOW - 1)).toThrow(/clock|time/i);
    expect(next).not.toBe(current);
  });
});
