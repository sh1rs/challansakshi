import { describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createCase } from '../lib/mobility/cases';
import { ADVISER_DAILY_SITE_LIMIT, ADVISER_MODEL, buildAdviserContext, fingerprintAdviserContext, isSensitiveAdviserText, validateAdviserSuggestion } from '../lib/mobility/adviser';
import { handleAdviserRequest, type AdviserBinding } from '../lib/mobility/server/adviser';
const origin = 'https://example.test'; const now = Date.parse('2026-09-06T10:00:00Z');
const proposal = { question: 'Which detail would you like to correct?', steps: [{ text: 'Compare the date with your document.', sourceKeys: ['date'] }] };
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_mobility_accounts.sql', '0003_mobility_adviser.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  sqlite.prepare('INSERT INTO mobility_accounts VALUES(?,?,?,?,?)').run('owner', 'google-owner', 'Citizen', 'owner@example.test', now);
  const item = createCase('challan-review', new Date(now).toISOString(), 'case-one');
  item.facts = [{ key: 'date', label: 'Date', value: '2026-09-01', source: 'document', confirmed: false, sourceId: 'SECRET-DOCUMENT', sourceFingerprint: '123456789012' + 'a'.repeat(52) }, { key: 'private', label: 'Address', value: 'PRIVATE-ADDRESS', source: 'profile', confirmed: true }];
  item.draft = 'PRIVATE-DRAFT'; item.reference = 'PRIVATE-REFERENCE'; item.title = 'PRIVATE-TITLE';
  sqlite.prepare('INSERT INTO mobility_cases VALUES(?,?,?,?,?)').run('owner', item.id, 1, JSON.stringify(item), now);
  const db = { prepare(sql: string) { let values: (string | number | null)[] = []; const statement = { bind(...args: (string | number | null)[]) { values = args; return statement; }, async first() { return sqlite.prepare(sql).get(...values) ?? null; }, async run() { sqlite.prepare(sql).run(...values); return { success: true }; } }; return statement; } } as unknown as D1Database;
  const run = vi.fn<AdviserBinding['run']>().mockImplementation(async (_, input) => ({ response: JSON.stringify(input.max_tokens === 40 ? { acceptable: true } : proposal) }));
  const env = { MOBILITY_AI: { run }, MOBILITY_AI_ENABLED: 'true' };
  const input = () => ({ caseId: item.id, caseRevision: 1, factKeys: ['date'], includeDraft: false, language: 'en', consent: true, contextFingerprint: fingerprintAdviserContext(buildAdviserContext(item, ['date'], false, 'en')), requestId: crypto.randomUUID() });
  const call = (body = input(), options: { account?: string | null; requestOrigin?: string; signal?: AbortSignal; time?: number } = {}) => handleAdviserRequest(new Request(`${origin}/api/account/adviser`, { method: 'POST', headers: { origin: options.requestOrigin ?? origin, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: options.signal }), env, { db, account: options.account === null ? null : { id: options.account ?? 'owner' }, origin, now: options.time ?? now });
  return { sqlite, item, db, env, run, input, call };
}
describe('optional bounded two-pass AI adviser', () => {
  it('uses two separate roles with only the reviewed context and no case mutation', async () => {
    const { call, run, sqlite, item } = setup(); const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ verified: false, mode: 'cloud-ai', passes: ['preparation-writer', 'suggestion-critic'], suggestion: proposal });
    expect(run).toHaveBeenCalledTimes(2); expect(run.mock.calls[0][0]).toBe(ADVISER_MODEL);
    expect(run.mock.calls.map(call => call[1].max_tokens)).toEqual([400, 40]);
    expect(JSON.stringify(run.mock.calls)).not.toMatch(/PRIVATE-|SECRET-DOCUMENT|google-owner|owner@example/);
    expect(JSON.stringify(run.mock.calls)).not.toContain(item.facts[0].sourceFingerprint);
    expect(JSON.parse(sqlite.prepare('SELECT payload FROM mobility_cases').get()!.payload as string)).toEqual(item);
    expect(JSON.stringify(sqlite.prepare('SELECT * FROM mobility_ai_runs').all())).not.toMatch(/2026-09-01|Compare the date|PRIVATE-|question/);
  });
  it('stays disabled until both binding and explicit switch are present', async () => {
    const test = setup(); test.env.MOBILITY_AI_ENABLED = 'false'; expect((await test.call()).status).toBe(503); expect(test.run).not.toHaveBeenCalled();
    const response = await handleAdviserRequest(new Request(`${origin}/api/account/adviser/status`), {}, { db: test.db, account: null, now, origin });
    expect(await response.json()).toMatchObject({ available: false, authenticated: false });
  });
  it('enforces authentication, origin, owner scope, consent and exact preview', async () => {
    const test = setup();
    expect((await test.call(test.input(), { account: null })).status).toBe(401);
    expect((await test.call(test.input(), { requestOrigin: 'https://evil.test' })).status).toBe(403);
    expect((await test.call(test.input(), { account: 'stranger' })).status).toBe(404);
    expect((await test.call({ ...test.input(), consent: false })).status).toBe(400);
    expect((await test.call({ ...test.input(), contextFingerprint: 'a'.repeat(64) })).status).toBe(409);
    expect((await test.call({ ...test.input(), caseRevision: 2 })).status).toBe(409);
    expect((await test.call({ ...test.input(), factKeys: ['missing'] })).status).toBe(400);
    expect(test.run).not.toHaveBeenCalled();
    expect(test.sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_ai_runs').get()!.count).toBe(0);
  });
  it('does not retry a duplicate request and limits concurrent account requests', async () => {
    const test = setup(); const body = test.input();
    expect((await test.call(body)).status).toBe(200); expect((await test.call(body)).status).toBe(429);
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => test.call()));
    expect(outcomes.filter(response => response.status === 200)).toHaveLength(2);
    expect(outcomes.filter(response => response.status === 429)).toHaveLength(3);
    expect(test.run).toHaveBeenCalledTimes(6);
  });
  it('caps site usage across accounts and resets at the next UTC day', async () => {
    const test = setup();
    for (let i = 0; i < ADVISER_DAILY_SITE_LIMIT; i++) test.sqlite.prepare('INSERT INTO mobility_ai_runs VALUES(?,NULL,?,?,?)').run(crypto.randomUUID(), '2026-09-06', now, 'failed');
    expect((await test.call()).status).toBe(429);
    expect((await test.call(test.input(), { time: now + 86400000 })).status).toBe(200);
  });
  it('withholds malformed or unsupported source claims before the critic', async () => {
    const test = setup(); test.run.mockResolvedValueOnce({ response: JSON.stringify({ ...proposal, steps: [{ text: 'A claim', sourceKeys: ['invented-source'] }] }) });
    expect((await test.call()).status).toBe(503); expect(test.run).toHaveBeenCalledTimes(1);
    expect(test.sqlite.prepare('SELECT status FROM mobility_ai_runs').get()!.status).toBe('failed');
  });
  it('withholds suggestions rejected by the critic without returning their text', async () => {
    const test = setup(); test.run.mockResolvedValueOnce({ response: JSON.stringify(proposal) }).mockResolvedValueOnce({ response: '{"acceptable":false}' });
    const result = await test.call(); expect(result.status).toBe(503); expect(await result.text()).not.toContain(proposal.question);
  });
  it('invalidates slow advice when the owner changes the case', async () => {
    const test = setup(); test.run.mockImplementation(async (_, value) => {
      if (value.max_tokens === 40) test.sqlite.prepare('UPDATE mobility_cases SET revision=2').run();
      return { response: JSON.stringify(value.max_tokens === 40 ? { acceptable: true } : proposal) };
    });
    expect((await test.call()).status).toBe(503);
  });
  it('counts interrupted requests and avoids starting another model pass', async () => {
    const test = setup(); const controller = new AbortController();
    test.run.mockImplementation(async () => { controller.abort(); return { response: JSON.stringify(proposal) }; });
    expect((await test.call(test.input(), { signal: controller.signal })).status).toBe(503);
    expect(test.run).toHaveBeenCalledTimes(1);
    expect(test.sqlite.prepare('SELECT status FROM mobility_ai_runs').get()!.status).toBe('failed');
  });
  it('times out once without automatic retries or releasing a spent reservation', async () => {
    vi.useFakeTimers();
    try {
      const test = setup(); test.run.mockImplementation(() => new Promise(() => {}));
      const result = test.call(); await vi.advanceTimersByTimeAsync(20_001);
      expect((await result).status).toBe(503); expect(test.run).toHaveBeenCalledTimes(1);
      expect(test.sqlite.prepare('SELECT status FROM mobility_ai_runs').get()!.status).toBe('failed');
    } finally { vi.useRealTimers(); }
  });
  it('deleting an account anonymizes usage without reopening the site allowance', async () => {
    const test = setup(); await test.call(); test.sqlite.prepare('DELETE FROM mobility_accounts WHERE id=?').run('owner');
    expect(test.sqlite.prepare('SELECT account_id FROM mobility_ai_runs').get()!.account_id).toBeNull();
    expect(test.sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_ai_runs').get()!.count).toBe(1);
  });
  it('bounds selected content and treats outputs as data with strict schemas', () => {
    const { item } = setup(); expect(() => buildAdviserContext({ ...item, draft: 'x'.repeat(1201) }, [], true, 'en')).toThrow();
    expect(() => buildAdviserContext(item, ['date', 'date'], false, 'en')).toThrow();
    const context = buildAdviserContext(item, ['date'], false, 'hi');
    expect(() => validateAdviserSuggestion({ ...proposal, tools: ['pay'] }, context)).toThrow();
    expect(() => validateAdviserSuggestion({ ...proposal, question: 'x'.repeat(301) }, context)).toThrow();
    expect(() => validateAdviserSuggestion({ ...proposal, question: 'What is your OTP?' }, context)).toThrow();
    expect(() => buildAdviserContext({ ...item, draft: 'Use identity 1234 5678 9012' }, [], true, 'en')).toThrow();
    expect(() => buildAdviserContext({ ...item, facts: [{ key: 'x', label: 'Aadhaar', value: 'redacted', source: 'citizen', confirmed: true }] }, ['x'], false, 'en')).toThrow();
  });

  it('keeps common Indian decimal numeral forms and fullwidth identity numbers out of selected AI context', () => {
    const { item } = setup();
    const samples = [
      '१२३४ ५६७८ ९०१२', '౧౨౩౪ ౫౬౭౮ ౯౦౧౨', '১২৩৪ ৫৬৭৮ ৯০১২',
      '੧੨੩੪ ੫੬੭੮ ੯੦੧੨', '૧૨૩૪ ૫૬૭૮ ૯૦૧૨', '୧୨୩୪ ୫୬୭୮ ୯୦୧୨',
      '௧௨௩௪ ௫௬௭௮ ௯௦௧௨', '೧೨೩೪ ೫೬೭೮ ೯೦೧೨', '൧൨൩൪ ൫൬൭൮ ൯൦൧൨',
      '١٢٣٤ ٥٦٧٨ ٩٠١٢', '۱۲۳۴ ۵۶۷۸ ۹۰۱۲', '１２３４ ５６７８ ９０１２',
      '12३४ 5౬7৮ 90१2',
    ];
    for (const value of samples) {
      expect(isSensitiveAdviserText(value)).toBe(true);
      expect(() => buildAdviserContext({ ...item, facts: [{ key: 'number', label: 'Number', value, source: 'citizen', confirmed: true }] }, ['number'], false, 'hi')).toThrow(/identity numbers/);
    }
    expect(isSensitiveAdviserText('राशि ५०० और तारीख ०६-०९-२०२६')).toBe(false);
  });

  it('recognizes Hindi OTP, private-key and passcode labels even when their current values are short', () => {
    const { item } = setup();
    for (const label of ['ओटीपी', 'ओ टी पी', 'ओ.टी.पी.', 'पासकोड', 'पास कोड', 'निजी कुंजी', 'गुप्त कुंजी', 'प्राइवेट की', 'सीक्रेट की', 'Private key']) {
      expect(() => buildAdviserContext({ ...item, facts: [{ key: 'code', label, value: '123456', source: 'citizen', confirmed: true }] }, ['code'], false, 'hi')).toThrow(/secret credentials/);
    }
  });

  it('requires one final question marker and withholds multiple questions before another model pass', async () => {
    const test = setup();
    const context = buildAdviserContext(test.item, ['date'], false, 'en');
    for (const question of ['Which state? Which vehicle?', 'कौन सा राज्य？ कौन सा वाहन？', 'Which state? More instructions.', 'Which state', '?']) {
      expect(() => validateAdviserSuggestion({ ...proposal, question }, context)).toThrow();
    }
    expect(validateAdviserSuggestion({ ...proposal, question: 'Which state？' }, context).question).toBe('Which state？');
    test.run.mockResolvedValueOnce({ response: JSON.stringify({ ...proposal, question: 'Which state? Which vehicle?' }) });
    expect((await test.call()).status).toBe(503);
    expect(test.run).toHaveBeenCalledTimes(1);
    expect(test.sqlite.prepare('SELECT status FROM mobility_ai_runs').get()!.status).toBe('failed');
  });
});
