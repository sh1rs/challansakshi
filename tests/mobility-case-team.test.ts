// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCase, type MobilityCase } from '../lib/mobility/cases';
import { getService, SERVICE_KINDS } from '../lib/mobility/services';
import {
  fingerprintCaseTeamInput, runCaseTeam, runLocalCaseTeamRole,
  type CaseTeamRole, type CaseTeamRoleContext, type CaseTeamRoleOutput,
} from '../lib/mobility/case-team';
import CaseTeamPanel from '../components/mobility/CaseTeamPanel';

const NOW = '2026-09-06T08:00:00.000Z';
const makeCase = (patch: Partial<MobilityCase> = {}): MobilityCase => ({ ...createCase('challan-review', NOW, 'team-case'), ...patch });
const registration = (key: string, value: string, confirmed = true, sourceId = 'source-1') => ({ key, label: 'Registration', value, source: 'document' as const, confirmed, sourceId, page: 1 });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };

describe('bounded on-device case team', () => {
  it('rejects malformed cases before starting any role', async () => {
    let started = false;
    const runner = async (context: CaseTeamRoleContext) => { started = true; return runLocalCaseTeamRole(context); };
    for (const value of [null, {}, makeCase({ facts: 'bad' as never }), { ...makeCase(), secret: 'unexpected' }, makeCase({ facts: [registration('notice.registration', 'A'), registration('notice.registration', 'B')] })]) {
      await expect(runCaseTeam(value, { runners: { evidence: runner } })).rejects.toThrow();
    }
    expect(started).toBe(false);
    await expect(runCaseTeam(makeCase(), { language: 'xx' as never })).rejects.toThrow(/language/i);
  });

  it('rejects sparse input arrays and sparse role findings instead of reporting a completed check', async () => {
    await expect(runCaseTeam(makeCase({ facts: new Array(1) }))).rejects.toThrow();
    const result = await runCaseTeam(makeCase(), { runners: { evidence: async context => ({ role: context.role, inputFingerprint: context.inputFingerprint, findings: new Array(1) }) } });
    expect(result.roles.find(role => role.role === 'evidence')?.status).toBe('failed');
  });

  it('binds every result and source trace to the validated case and display language', async () => {
    const value = makeCase({ facts: [registration('notice.registration', 'KA01AB3317')] });
    const result = await runCaseTeam(value);
    expect(result.mode).toBe('on-device');
    expect(result.inputFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.roles.map(role => role.role)).toEqual(['evidence', 'planner', 'consistency', 'coach']);
    expect(result.roles.every(role => role.inputFingerprint === result.inputFingerprint && role.status === 'complete')).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every(finding => finding.inputFingerprint === result.inputFingerprint && finding.sourceKeys.length > 0 && finding.sourceKeys.every(key => result.sources.some(source => source.key === key)))).toBe(true);
    expect(result.sources.find(source => source.key === 'fact:notice.registration')).toMatchObject({ sourceId: 'source-1', page: 1, kind: 'fact' });
    expect(fingerprintCaseTeamInput({ ...value, reference: 'changed' })).not.toBe(result.inputFingerprint);
    expect(fingerprintCaseTeamInput(value, 'hi')).not.toBe(result.inputFingerprint);
    expect(fingerprintCaseTeamInput({ ...value, facts: [{ ...value.facts[0], confirmed: false }] })).not.toBe(result.inputFingerprint);
  });

  it('takes an immutable snapshot without mutating or persisting the caller case', async () => {
    const value = makeCase({ facts: [registration('notice.registration', 'KA01AB3317')] });
    const before = JSON.stringify(value);
    const result = await runCaseTeam(value, { runners: { evidence: async context => {
      expect(Object.isFrozen(context.caseValue)).toBe(true);
      expect(Object.isFrozen(context.caseValue.facts[0])).toBe(true);
      expect(() => { context.caseValue.facts[0].value = 'changed'; }).toThrow();
      return runLocalCaseTeamRole(context);
    } } });
    expect(result.status).toBe('complete');
    expect(JSON.stringify(value)).toBe(before);
  });

  it('keeps an in-flight run tied to its initial snapshot after the caller edits the original', async () => {
    const gate = deferred<void>();
    const entered = deferred<void>();
    const value = makeCase({ facts: [registration('notice.registration', 'KA01AB3317')] });
    const originalFingerprint = fingerprintCaseTeamInput(value);
    const pending = runCaseTeam(value, { runners: { evidence: async context => {
      entered.resolve(); await gate.promise;
      expect(context.caseValue.facts[0].value).toBe('KA01AB3317');
      return runLocalCaseTeamRole(context);
    } } });
    await entered.promise;
    value.facts[0].value = 'KA01AB3817';
    gate.resolve();
    const result = await pending;
    expect(result.inputFingerprint).toBe(originalFingerprint);
    expect(result.inputFingerprint).not.toBe(fingerprintCaseTeamInput(value));
  });

  it('starts the three independent roles in parallel and waits before synthesis', async () => {
    const gates = { evidence: deferred<void>(), planner: deferred<void>(), consistency: deferred<void>() };
    const started: CaseTeamRole[] = [];
    const runner = async (context: CaseTeamRoleContext) => {
      started.push(context.role);
      if (context.role !== 'coach') await gates[context.role].promise;
      else expect(context.previousRoles.every(role => role.status === 'complete')).toBe(true);
      return runLocalCaseTeamRole(context);
    };
    const pending = runCaseTeam(makeCase(), { runners: { evidence: runner, planner: runner, consistency: runner, coach: runner } });
    await Promise.resolve(); await Promise.resolve();
    expect(started).toEqual(['evidence', 'planner', 'consistency']);
    gates.planner.resolve(); gates.evidence.resolve();
    await Promise.resolve();
    expect(started).not.toContain('coach');
    gates.consistency.resolve();
    const result = await pending;
    expect(started).toEqual(['evidence', 'planner', 'consistency', 'coach']);
    expect(result.status).toBe('complete');
  });

  it('cancels even an uncooperative role and preserves already completed findings', async () => {
    const controller = new AbortController();
    const slow = deferred<CaseTeamRoleOutput>();
    const plannerDone = deferred<void>();
    let evidenceContext!: CaseTeamRoleContext;
    const pending = runCaseTeam(makeCase(), {
      signal: controller.signal,
      runners: { evidence: context => { evidenceContext = context; return slow.promise; } },
      onProgress: progress => { if (progress.roles.some(role => role.role === 'planner' && role.status === 'complete')) plannerDone.resolve(); },
    });
    await plannerDone.promise;
    controller.abort();
    const result = await pending;
    expect(result.status).toBe('cancelled');
    expect(result.roles.find(role => role.role === 'evidence')?.status).toBe('cancelled');
    expect(result.roles.find(role => role.role === 'planner')?.status).toBe('complete');
    expect(result.findings.some(finding => finding.code === 'service-plan')).toBe(true);
    expect(result.roles.find(role => role.role === 'coach')?.status).toBe('cancelled');
    const before = JSON.stringify(result);
    slow.resolve(await runLocalCaseTeamRole(evidenceContext));
    await Promise.resolve();
    expect(JSON.stringify(result)).toBe(before);
  });

  it('does not start any runner when already cancelled', async () => {
    const controller = new AbortController(); controller.abort();
    let started = false;
    const result = await runCaseTeam(makeCase(), { signal: controller.signal, runners: { evidence: async context => { started = true; return runLocalCaseTeamRole(context); } } });
    expect(started).toBe(false);
    expect(result.status).toBe('cancelled');
    expect(result.roles.every(role => role.status === 'cancelled')).toBe(true);
  });

  it('retains useful partial results without exposing an exception or accepting stale output', async () => {
    const result = await runCaseTeam(makeCase(), { runners: {
      evidence: async () => { throw new Error('private provider secret'); },
      consistency: async context => ({ ...await runLocalCaseTeamRole(context), inputFingerprint: 'old-case' }),
    } });
    expect(result.status).toBe('partial');
    expect(result.roles.filter(role => role.status === 'failed').map(role => role.role)).toEqual(['evidence', 'consistency']);
    expect(result.nextAction?.kind).toBe('step');
    expect(JSON.stringify(result)).not.toContain('private provider secret');
    expect(result.findings.some(finding => finding.code === 'service-plan')).toBe(true);
  });

  it('rejects malformed role outputs, invented sources and multiple coaching questions', async () => {
    for (const makeOutput of [
      () => null,
      (context: CaseTeamRoleContext) => ({ role: context.role, inputFingerprint: context.inputFingerprint, findings: [{ code: 'invented', severity: 'info', title: 'Fake', detail: 'Fake', sourceKeys: ['official:unlisted'], inputFingerprint: context.inputFingerprint }] }),
      (context: CaseTeamRoleContext) => ({ role: context.role, inputFingerprint: context.inputFingerprint, findings: [], nextAction: { kind: 'question', text: 'Which state? Which vehicle?', sourceKeys: ['case:jurisdiction'] } }),
    ]) {
      const result = await runCaseTeam(makeCase(), { runners: { coach: async context => makeOutput(context) as CaseTeamRoleOutput } });
      expect(result.roles.find(role => role.role === 'coach')?.status).toBe('failed');
      expect(result.status).toBe('partial');
    }
  });

  it('flags unconfirmed, source-less and empty readings without upgrading citizen confirmation into proof', async () => {
    const result = await runCaseTeam(makeCase({ facts: [
      registration('notice.registration', 'KA01AB3317', false),
      { ...registration('vehicle-record.registration', 'KA01AB3317'), sourceId: undefined },
      { key: 'profile.name', label: 'Name', value: 'Asha', source: 'profile', confirmed: true },
      { key: 'notice.amount', label: 'Amount', value: '', source: 'document', confirmed: true },
    ] }));
    expect(result.findings.map(finding => finding.code)).toEqual(expect.arrayContaining(['unconfirmed-reading', 'missing-source', 'empty-reading', 'citizen-provenance']));
    expect(result.nextAction?.kind).toBe('question');
    expect((result.nextAction?.text.match(/\?/g) ?? []).length).toBe(1);
    expect(result.findings.some(finding => finding.code === 'registration-conflict')).toBe(false);
  });

  it('flags differing confirmed registrations conservatively and preserves both source keys', async () => {
    const result = await runCaseTeam(makeCase({ facts: [registration('notice.registration', 'KA01AB3317'), registration('vehicle-record.registration', 'KA01AB3817', true, 'source-2')] }));
    const finding = result.findings.find(item => item.code === 'registration-conflict');
    expect(finding?.severity).toBe('attention');
    expect(finding?.sourceKeys).toEqual(['fact:notice.registration', 'fact:vehicle-record.registration']);
    expect(finding?.detail).toMatch(/does not establish/i);
    expect(result.nextAction?.kind).toBe('question');
  });

  it('never claims a confirmed mismatch from uncertain or malformed registration readings', async () => {
    for (const value of ['unreadable', 'KA01AB38?7', 'possibly KA01AB3817']) {
      const result = await runCaseTeam(makeCase({ facts: [registration('notice.registration', 'KA01AB3317'), registration('vehicle-record.registration', value)] }));
      expect(result.findings.some(finding => finding.code === 'registration-conflict')).toBe(false);
      expect(result.findings.some(finding => finding.code === 'registration-uncertain')).toBe(true);
    }
    const result = await runCaseTeam(makeCase({ facts: [registration('notice.registration', 'KA01AB3317'), registration('vehicle-record.registration', 'KA01AB3817', false)] }));
    expect(result.findings.some(finding => finding.code === 'registration-conflict')).toBe(false);
  });

  it('does not report a successful comparison when no comparable registration details exist', async () => {
    const result = await runCaseTeam(makeCase());
    const consistency = result.roles.find(role => role.role === 'consistency');
    expect(consistency?.findings[0].code).toBe('comparison-unavailable');
    expect(consistency?.findings[0].title).toBe('No registration comparison available');
    expect(consistency?.findings.some(finding => /no difference found/i.test(finding.title))).toBe(false);
  });

  it('detects stale draft registrations without treating any different quoted number as an official fact', async () => {
    const result = await runCaseTeam(makeCase({ facts: [registration('notice.registration', 'KA01AB3317')], draft: 'Please review registration KA01AB3817.' }));
    const finding = result.findings.find(item => item.code === 'draft-registration-review');
    expect(finding?.sourceKeys).toEqual(['case:draft', 'fact:notice.registration']);
    expect(finding?.severity).toBe('uncertain');
    const matching = await runCaseTeam(makeCase({ facts: [registration('notice.registration', 'KA 01 AB 3317')], draft: 'Please review KA01AB3317.' }));
    expect(matching.findings.some(item => item.code === 'draft-registration-review')).toBe(false);
  });

  it('flags directly contradictory comparison wording in English and Hindi', async () => {
    for (const draft of ['The reviewed registrations match.', 'जाँचे गए पंजीकरण मेल खाते हैं।']) {
      const result = await runCaseTeam(makeCase({ facts: [registration('notice.registration', 'KA01AB3317'), registration('vehicle-record.registration', 'KA01AB3817', true, 'source-2')], draft }));
      expect(result.findings.some(item => item.code === 'draft-comparison-review')).toBe(true);
    }
    const result = await runCaseTeam(makeCase({ facts: [registration('notice.registration', 'KA01AB3317'), registration('vehicle-record.registration', 'KA01AB3317', true, 'source-2')], draft: 'The registrations were read differently.' }));
    expect(result.findings.some(item => item.code === 'draft-comparison-review')).toBe(true);
    expect(result.nextAction?.kind).toBe('step');
  });

  it('uses the official catalogue for all nine plans without inferring jurisdiction from a plate', async () => {
    for (const service of SERVICE_KINDS) {
      const result = await runCaseTeam(makeCase({ service, facts: [registration('notice.registration', 'KA01AB3317')] }));
      const source = result.sources.find(item => item.kind === 'official');
      expect(source?.url).toBe(getService(service).sourceUrl);
      expect(result.findings.some(item => item.code === 'service-plan')).toBe(true);
      expect(result.findings.some(item => item.code === 'jurisdiction-needed')).toBe(true);
      expect(result.nextAction?.text).not.toContain('Karnataka');
    }
  });

  it('uses exactly one question or one next step in both languages and never certifies official completion', async () => {
    for (const language of ['en', 'hi'] as const) {
      const result = await runCaseTeam(makeCase({ jurisdiction: 'Karnataka', status: 'completed', reference: 'Citizen reference', completedSteps: getService('challan-review').steps.map(step => step.id) }), { language });
      expect(result.nextAction?.kind).toBe('step');
      expect(result.nextAction?.text.includes('?')).toBe(false);
      expect(result.findings.some(item => item.code === 'citizen-progress')).toBe(true);
      if (language === 'hi') expect(result.nextAction?.text).toMatch(/[\u0900-\u097f]/);
    }
  });

  it('keeps question punctuation inside supplied labels from creating multiple coaching questions', async () => {
    const result = await runCaseTeam(makeCase({ facts: [{ key: 'record.name', label: 'Name? Readable？', value: 'Asha', source: 'document', confirmed: false }] }));
    expect(result.status).toBe('complete');
    expect(result.nextAction?.kind).toBe('question');
    expect((result.nextAction?.text.match(/[?？]/g) ?? []).length).toBe(1);
  });

  it('does not allow a progress observer to mutate or derail the run', async () => {
    const result = await runCaseTeam(makeCase(), { onProgress: progress => {
      expect(Object.isFrozen(progress)).toBe(true);
      throw new Error('observer stopped');
    } });
    expect(result.status).toBe('complete');
  });
});

describe('case team panel', () => {
  const roots: ReturnType<typeof createRoot>[] = [];
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
  afterEach(() => { act(() => { roots.splice(0).forEach(root => root.unmount()); }); document.body.innerHTML = ''; vi.unstubAllGlobals(); });

  it('runs only after a click and removes stale results on a case edit without writing storage', async () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host); roots.push(root);
    const value = makeCase({ facts: [registration('notice.registration', 'KA01AB3317'), registration('vehicle-record.registration', 'KA01AB3817', true, 'source-2')] });
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    await act(async () => root.render(createElement(CaseTeamPanel, { caseValue: value, language: 'en' })));
    expect(host.textContent).toContain('On-device checks');
    expect(host.querySelector('[data-case-team-results]')).toBeNull();
    const button = [...host.querySelectorAll('button')].find(item => item.textContent === 'Check this case');
    await act(async () => button?.click());
    expect(host.querySelector('[data-case-team-results]')).not.toBeNull();
    expect(host.textContent).toContain('Registrations read differently');
    expect(host.textContent).toContain('Evidence checker');
    await act(async () => root.render(createElement(CaseTeamPanel, { caseValue: { ...value, draft: 'Edited request' }, language: 'en' })));
    expect(host.querySelector('[data-case-team-results]')).toBeNull();
    expect(host.textContent).toContain('Check this case');
    expect(storage).not.toHaveBeenCalled(); storage.mockRestore();
  });

  it('shows translated controls and accessible source details after a Hindi run', async () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host); roots.push(root);
    await act(async () => root.render(createElement(CaseTeamPanel, { caseValue: makeCase(), language: 'hi' })));
    await act(async () => host.querySelector('button')?.click());
    expect(host.textContent).toContain('साक्ष्य जाँचकर्ता');
    expect(host.querySelector('a[href="https://echallan.parivahan.gov.in/"]')).not.toBeNull();
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    expect(host.querySelector('summary')).not.toBeNull();
  });

  it('cancels an actual in-flight local run and displays a stopped status', async () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host); roots.push(root);
    await act(async () => root.render(createElement(CaseTeamPanel, { caseValue: makeCase(), language: 'en' })));
    act(() => host.querySelector('button')?.click());
    const stop = [...host.querySelectorAll('button')].find(button => button.textContent === 'Stop checking');
    expect(stop).toBeDefined();
    await act(async () => stop?.click());
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Check stopped');
    expect([...host.querySelectorAll('button')].some(button => button.textContent === 'Check again' && !button.disabled)).toBe(true);
  });

  it('discards in-flight results when the case or display language changes', async () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host); roots.push(root);
    const value = makeCase();
    await act(async () => root.render(createElement(CaseTeamPanel, { caseValue: value, language: 'en' })));
    act(() => host.querySelector('button')?.click());
    await act(async () => root.render(createElement(CaseTeamPanel, { caseValue: { ...value, jurisdiction: 'Karnataka' }, language: 'hi' })));
    expect(host.querySelector('[data-case-team-results]')).toBeNull();
    expect(host.textContent).toContain('यह केस जाँचें');
    expect(host.textContent).not.toContain('Evidence checker');
  });
});
