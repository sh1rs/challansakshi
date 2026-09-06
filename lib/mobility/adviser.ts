import { sha256Hex } from '../local-sha256';
import { validateCase, type MobilityCase } from './cases';

export const ADVISER_MODEL = '@cf/meta/llama-3.2-3b-instruct';
export const ADVISER_DAILY_ACCOUNT_LIMIT = 3;
export const ADVISER_DAILY_SITE_LIMIT = 20;
export type AdviserContext = { service: string; jurisdiction: string; language: 'en' | 'hi'; facts: { key: string; label: string; value: string; source: string; confirmed: boolean }[]; draft: string };
export type AdviserSuggestion = { question: string; steps: { text: string; sourceKeys: string[] }[] };
// Decimal blocks used by common Indian scripts, including Urdu's Arabic forms.
// NFKC handles compatibility digits such as fullwidth and mathematical forms first.
const DECIMAL_ZEROES = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6, 0x1946, 0x1c50, 0xabc0];
function normaliseSafetyText(value: string): string {
  return Array.from(value.normalize('NFKC'), character => {
    const point = character.codePointAt(0)!;
    const zero = DECIMAL_ZEROES.find(start => point >= start && point <= start + 9);
    return zero === undefined ? character : String(point - zero);
  }).join('');
}
/** Conservative screening of familiar secrets and long numbers, not universal anonymization. */
export function isSensitiveAdviserText(value: string): boolean {
  const normalized = normaliseSafetyText(value);
  return /aadha?ar|आधार|password|पासवर्ड|\botps?\b|ओ[\s._-]*टी[\s._-]*पी|\bcvv\b|card[\s_-]*number|passcode|पास[\s_-]*कोड|(?:secret|private)[\s_-]*key|(?:निजी|गुप्त|प्राइवेट|सीक्रेट)[\s_-]*(?:कुंजी|की)/i.test(normalized) || /(?:\d[ -]?){12,}/.test(normalized);
}
export function buildAdviserContext(caseValue: MobilityCase, keys: string[], includeDraft: boolean, language: 'en' | 'hi'): AdviserContext {
  const item = validateCase(caseValue);
  if (!Array.isArray(keys) || keys.length > 8 || new Set(keys).size !== keys.length || keys.some(key => !item.facts.some(fact => fact.key === key))) throw new Error('Select up to eight current details.');
  if (typeof includeDraft !== 'boolean' || !['en', 'hi'].includes(language)) throw new Error('Invalid adviser options.');
  const context = { service: item.service, jurisdiction: item.jurisdiction, language,
    facts: item.facts.filter(fact => keys.includes(fact.key)).map(({ key, label, value, source, confirmed }) => ({ key, label, value, source, confirmed })), draft: includeDraft ? item.draft : '' };
  if (isSensitiveAdviserText(JSON.stringify(context))) throw new Error('Keep identity numbers and secret credentials out of AI requests.');
  if (context.facts.some(fact => fact.value.length > 400) || context.draft.length > 1200 || new TextEncoder().encode(JSON.stringify(context)).length > 6000) throw new Error('Select fewer or shorter details. The optional draft must be at most 1,200 characters.');
  return context;
}
export const fingerprintAdviserContext = (context: AdviserContext) => sha256Hex(JSON.stringify(context));
export function validateAdviserSuggestion(value: unknown, context: AdviserContext): AdviserSuggestion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid suggestion.');
  const record = value as Record<string, unknown>;
  const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) && !isSensitiveAdviserText(value);
  if (Object.keys(record).sort().join(',') !== 'question,steps' || !text(record.question, 300) || !Array.isArray(record.steps) || record.steps.length < 1 || record.steps.length > 3) throw new Error('Invalid suggestion.');
  const question = record.question.trim();
  if ((question.match(/[?？]/g) ?? []).length !== 1 || !/[?？]$/.test(question) || !question.slice(0, -1).trim()) throw new Error('Return exactly one question.');
  for (const step of record.steps) {
    if (!step || typeof step !== 'object' || Array.isArray(step) || Object.keys(step).sort().join(',') !== 'sourceKeys,text' || !text(step.text, 400) || !Array.isArray(step.sourceKeys) || step.sourceKeys.length > 8 || new Set(step.sourceKeys).size !== step.sourceKeys.length || step.sourceKeys.some((key: unknown) => typeof key !== 'string' || !context.facts.some(fact => fact.key === key))) throw new Error('Suggestion cites unavailable details.');
  }
  return record as AdviserSuggestion;
}
