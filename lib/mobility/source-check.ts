import { validateCase, type MobilityCase } from './cases';

export const MAX_SOURCE_CHECK_FILE_BYTES = 12 * 1024 * 1024;
const TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
export type SourceCheckFact = { key: string; label: string; sourceId?: string; page?: number };
export type SourceFingerprintGroup = { fingerprint: string; facts: SourceCheckFact[] };
export type SourceFingerprintCatalog = { groups: SourceFingerprintGroup[]; missingFingerprintCount: number };
export type SourceCheckResult = { status: 'match' | 'unmatched'; fingerprint: string; matchedFacts: SourceCheckFact[] };
export type SourceCheckFile = { size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> };
export type SourceCheckErrorCode = 'invalid-case' | 'no-fingerprints' | 'invalid-file' | 'read-failed' | 'crypto-unavailable' | 'hash-failed';

export class SourceCheckError extends Error {
  constructor(readonly code: SourceCheckErrorCode) { super(`Local source check could not complete: ${code}.`); }
}

/** Returns only retained source references, never fact values or original files. */
export function collectSourceFingerprints(caseValue: MobilityCase): SourceFingerprintCatalog {
  let item: MobilityCase;
  try { item = validateCase(caseValue); } catch { throw new SourceCheckError('invalid-case'); }
  const groups = new Map<string, SourceFingerprintGroup>();
  let missingFingerprintCount = 0;
  for (const fact of item.facts) {
    if (!fact.sourceFingerprint) { if (fact.source === 'document') missingFingerprintCount += 1; continue; }
    const group = groups.get(fact.sourceFingerprint) ?? { fingerprint: fact.sourceFingerprint, facts: [] };
    group.facts.push({ key: fact.key, label: fact.label, ...(fact.sourceId ? { sourceId: fact.sourceId } : {}), ...(fact.page ? { page: fact.page } : {}) });
    groups.set(group.fingerprint, group);
  }
  return { groups: [...groups.values()], missingFingerprintCount };
}

/** Explicitly selected bytes stay local; the temporary byte view is cleared after digest. */
export async function checkSourceFile(caseValue: MobilityCase, file: SourceCheckFile): Promise<SourceCheckResult> {
  // Capture validated references before the first await so callers cannot change a pending comparison.
  const catalog = collectSourceFingerprints(caseValue);
  if (!catalog.groups.length) throw new SourceCheckError('no-fingerprints');
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_SOURCE_CHECK_FILE_BYTES || !TYPES.has(file.type)) throw new SourceCheckError('invalid-file');
  if (!globalThis.crypto?.subtle) throw new SourceCheckError('crypto-unavailable');
  let bytes: Uint8Array<ArrayBuffer>;
  try { bytes = new Uint8Array(await file.arrayBuffer()); } catch { throw new SourceCheckError('read-failed'); }
  try {
    if (bytes.length !== file.size || bytes.length < 1 || bytes.length > MAX_SOURCE_CHECK_FILE_BYTES) throw new SourceCheckError('invalid-file');
    let digest: ArrayBuffer;
    try { digest = await crypto.subtle.digest('SHA-256', bytes); } catch { throw new SourceCheckError('hash-failed'); }
    const fingerprint = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    const match = catalog.groups.find(group => group.fingerprint === fingerprint);
    return { status: match ? 'match' : 'unmatched', fingerprint, matchedFacts: match?.facts ?? [] };
  } finally { bytes.fill(0); }
}
