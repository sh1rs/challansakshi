import { describe, expect, it } from 'vitest';
import { decodeTaskStore, encodeTaskStore, createMobilityTask, updateMobilityTask, taskNeedsAttention, type MobilityTask } from '../lib/mobility-tasks';

const now = '2026-09-05T10:00:00.000Z';
const task = () => createMobilityTask({ kind: 'challan', followUpDate: '2026-09-06' }, now, 'task-one');
describe('private device task checklist', () => {
  it('stores only the allowlisted checklist without importing personal records', () => {
    const value = { ...task(), plate: 'KA01AB1234', note: 'private reply', file: 'notice.pdf' };
    const text = encodeTaskStore([value], now);
    expect(text).not.toMatch(/KA01|private reply|notice.pdf/);
    expect(decodeTaskStore(text, now)).toEqual([task()]);
  });
  it('requires real bounded dates and does not invent an official outcome', () => {
    expect(task().status).toBe('preparing');
    expect(() => createMobilityTask({ kind: 'challan', followUpDate: '2026-02-30' }, now, 'x')).toThrow();
    expect(() => createMobilityTask({ kind: 'challan', followUpDate: '2039-01-01' }, now, 'x')).toThrow();
    const changed = updateMobilityTask(task(), { status: 'reported-submitted' }, now);
    expect(changed.status).toBe('reported-submitted');
    expect(() => updateMobilityTask(task(), { status: 'authority-verified' as MobilityTask['status'] }, now)).toThrow();
  });
  it('rejects corrupt, unsupported, future, oversized and expired storage', () => {
    for (const raw of ['not-json', '{"version":2,"tasks":[]}', 'x'.repeat(40_001), null]) expect(decodeTaskStore(raw, now)).toBeNull();
    expect(decodeTaskStore(encodeTaskStore([task()], now), '2026-12-05T10:00:00.000Z')).toBeNull();
    expect(decodeTaskStore(encodeTaskStore([task()], now), '2026-09-04T10:00:00.000Z')).toBeNull();
    const bad = JSON.parse(encodeTaskStore([task()], now)); bad.tasks[0].kind = 'javascript:alert(1)';
    expect(decodeTaskStore(JSON.stringify(bad), now)).toBeNull();
  });
  it('bounds task count and rejects duplicate identities', () => {
    expect(() => encodeTaskStore(Array.from({ length: 21 }, (_, index) => ({ ...task(), id: `task-${index}` })), now)).toThrow();
    expect(() => encodeTaskStore([task(), task()], now)).toThrow();
  });
  it('attention is a user-chosen follow-up date, not a legal deadline', () => {
    expect(taskNeedsAttention(task(), '2026-09-06')).toBe(true);
    expect(taskNeedsAttention(task(), '2026-09-05')).toBe(false);
    expect(taskNeedsAttention({ ...task(), status: 'done' }, '2026-09-07')).toBe(false);
    expect(taskNeedsAttention({ ...task(), followUpDate: '' }, '2026-09-07')).toBe(false);
  });
});
