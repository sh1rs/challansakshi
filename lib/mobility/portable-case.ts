import { validateCase, type MobilityCase } from './cases';

export const PORTABLE_MAX_FILE_BYTES = 350_000;
const MAX_PLAINTEXT_BYTES = 240_000;
const ITERATIONS = 600_000;
const FORMAT = 'challansakshi-case';
const encoder = new TextEncoder();
const additionalData = encoder.encode('challansakshi-case:v1:PBKDF2-SHA256:600000:AES-GCM-256');
const FAIL = 'Could not open this case file. Check the passphrase and use an unchanged ChallanSakshi case file.';
type Envelope = { format: typeof FORMAT; version: 1; kdf: 'PBKDF2-SHA256'; iterations: typeof ITERATIONS; cipher: 'AES-GCM-256'; salt: string; iv: string; ciphertext: string };

function checkPassphrase(value: string) {
  if (typeof value !== 'string' || Array.from(value).length < 12 || Array.from(value).length > 128 || !value.trim()) throw new TypeError('Use a passphrase of 12 to 128 characters. Several unrelated random words are better than a familiar phrase.');
}
function checkedCase(value: unknown, now: number): MobilityCase {
  if (!Number.isFinite(now)) throw new TypeError('Use the current device time.');
  const item = validateCase(value);
  const updated = Date.parse(item.updatedAt);
  if (updated > now + 300_000) throw new TypeError('The case date is ahead of this device clock. Check the date before continuing.');
  if (now - updated >= 90 * 86_400_000) throw new TypeError('This case file has reached its original 90-day retention. Start a new preparation using the records you still hold.');
  return item;
}
function base64(bytes: Uint8Array): string {
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}
function decode(value: unknown, exactLength?: number): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new TypeError(FAIL);
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (base64(bytes) !== value || (exactLength !== undefined && bytes.length !== exactLength)) throw new TypeError(FAIL);
  return bytes;
}
async function key(passphrase: string, salt: Uint8Array<ArrayBuffer>, usage: 'encrypt' | 'decrypt') {
  const encoded = encoder.encode(passphrase);
  try {
    const material = await crypto.subtle.importKey('raw', encoded, 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
  } finally { encoded.fill(0); }
}

/** The visible preview and encrypted plaintext share this exact serializer. No storage or network. */
export function previewPortableCase(value: MobilityCase, now = Date.now()): string {
  const preview = JSON.stringify(checkedCase(value, now), null, 2);
  if (encoder.encode(preview).length > MAX_PLAINTEXT_BYTES) throw new TypeError('This case is too large for a portable file. Download a short brief instead.');
  return preview;
}

export async function sealPortableCase(value: MobilityCase, passphrase: string, now = Date.now()): Promise<string> {
  checkPassphrase(passphrase);
  // Snapshot before the first await; later editor changes cannot alter the reviewed payload.
  const bytes = encoder.encode(previewPortableCase(value, now));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  try {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, await key(passphrase, salt, 'encrypt'), bytes);
    const envelope: Envelope = { format: FORMAT, version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-GCM-256', salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(encrypted)) };
    const result = JSON.stringify(envelope);
    if (encoder.encode(result).length > PORTABLE_MAX_FILE_BYTES) throw new TypeError('This case is too large for a portable file.');
    return result;
  } finally { bytes.fill(0); }
}

export async function openPortableCase(serialized: string, passphrase: string, now = Date.now()): Promise<MobilityCase> {
  checkPassphrase(passphrase);
  if (typeof serialized !== 'string' || serialized.length > PORTABLE_MAX_FILE_BYTES || encoder.encode(serialized).length > PORTABLE_MAX_FILE_BYTES) throw new TypeError('Choose a case file smaller than 350 KB.');
  let envelope: Envelope;
  let salt: Uint8Array<ArrayBuffer>; let iv: Uint8Array<ArrayBuffer>; let ciphertext: Uint8Array<ArrayBuffer>;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError(FAIL);
    const input = parsed as Record<string, unknown>;
    if (Object.keys(input).sort().join(',') !== 'cipher,ciphertext,format,iterations,iv,kdf,salt,version' || input.format !== FORMAT || input.version !== 1 || input.kdf !== 'PBKDF2-SHA256' || input.iterations !== ITERATIONS || input.cipher !== 'AES-GCM-256') throw new TypeError(FAIL);
    envelope = input as Envelope;
    salt = decode(envelope.salt, 16); iv = decode(envelope.iv, 12); ciphertext = decode(envelope.ciphertext);
    if (ciphertext.length < 17 || ciphertext.length > MAX_PLAINTEXT_BYTES + 16) throw new TypeError(FAIL);
  } catch { throw new TypeError(FAIL); }
  let plaintext: Uint8Array<ArrayBuffer>;
  try {
    plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, await key(passphrase, salt, 'decrypt'), ciphertext));
  } catch { throw new TypeError(FAIL); }
  try {
    const result: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
    return checkedCase(result, now);
  } finally { plaintext.fill(0); }
}

/** Separate unsaved copy. Original timestamps and their retention are preserved. */
export function restoredCaseCopy(value: MobilityCase, now = Date.now()): MobilityCase {
  const item = checkedCase(value, now);
  return validateCase({ ...JSON.parse(JSON.stringify(item)), id: crypto.randomUUID() });
}
