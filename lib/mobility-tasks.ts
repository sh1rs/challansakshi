/** Explicitly opted-in checklist metadata only. Never stores evidence or extracted facts. */
export const TASK_STORAGE_KEY = 'challansakshi-private-tasks-v1';
export const TASK_KINDS = ['challan', 'fastag', 'reply', 'insurance', 'puc', 'licence'] as const;
export const TASK_STATUSES = ['preparing', 'ready', 'reported-submitted', 'reply-received', 'done'] as const;
export type MobilityTask = { id: string; kind: typeof TASK_KINDS[number]; status: typeof TASK_STATUSES[number]; followUpDate: string; createdAt: string; updatedAt: string };
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function validDate(value: unknown): value is string {
  return value === '' || typeof value === 'string' && /^20[2-3]\d-\d\d-\d\d$/.test(value) && value <= '2036-12-31' && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function checkedTask(input: unknown): MobilityTask {
  if (!input || typeof input !== 'object') throw new Error('Invalid checklist');
  const value = input as MobilityTask;
  if (typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(value.id) || !TASK_KINDS.includes(value.kind) || !TASK_STATUSES.includes(value.status) || !validDate(value.followUpDate) || !timestamp(value.createdAt) || !timestamp(value.updatedAt) || value.updatedAt < value.createdAt) throw new Error('Invalid checklist');
  const { id, kind, status, followUpDate, createdAt, updatedAt } = value;
  return { id, kind, status, followUpDate, createdAt, updatedAt };
}
export function createMobilityTask(input: Pick<MobilityTask, 'kind' | 'followUpDate'>, now: string, id: string): MobilityTask {
  return checkedTask({ ...input, id, status: 'preparing', createdAt: now, updatedAt: now });
}
export function updateMobilityTask(task: MobilityTask, patch: Partial<Pick<MobilityTask, 'status' | 'followUpDate'>>, now: string): MobilityTask {
  return checkedTask({ ...task, ...patch, updatedAt: now });
}
export function encodeTaskStore(tasks: MobilityTask[], now: string): string {
  if (!timestamp(now) || tasks.length > 20 || new Set(tasks.map(task => task.id)).size !== tasks.length) throw new Error('Invalid checklist');
  return JSON.stringify({ version: 1, savedAt: now, tasks: tasks.map(checkedTask) });
}
export function decodeTaskStore(raw: string | null, now: string): MobilityTask[] | null {
  if (!raw || raw.length > 40_000 || !timestamp(now)) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).sort().join(',') !== 'savedAt,tasks,version' || parsed.version !== 1 || !timestamp(parsed.savedAt) || !Array.isArray(parsed.tasks) || parsed.tasks.length > 20) return null;
    const age = Date.parse(now) - Date.parse(parsed.savedAt);
    if (age < 0 || age >= MAX_AGE_MS) return null;
    const tasks = parsed.tasks.map((task: unknown) => {
      if (!task || typeof task !== 'object' || Object.keys(task).sort().join(',') !== 'createdAt,followUpDate,id,kind,status,updatedAt') throw new Error('Invalid checklist');
      return checkedTask(task);
    }) as MobilityTask[];
    if (new Set(tasks.map(task => task.id)).size !== tasks.length || tasks.some(task => task.updatedAt > parsed.savedAt)) return null;
    return tasks;
  } catch { return null; }
}
export function taskNeedsAttention(task: MobilityTask, today: string): boolean {
  return task.status !== 'done' && Boolean(task.followUpDate) && task.followUpDate <= today;
}
