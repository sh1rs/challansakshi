export const MAX_SYNTHETIC_LAB_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_SYNTHETIC_LAB_IMAGE_DIMENSION = 4096;
export const MAX_SYNTHETIC_LAB_IMAGE_PIXELS = 12_000_000;

export type SyntheticLabImageType = 'image/jpeg' | 'image/png';

export type SyntheticLabImageValidationReason =
  | 'empty-file'
  | 'file-too-large'
  | 'unsupported-type';

export type SyntheticLabImageValidation =
  | { ok: true }
  | { ok: false; reason: SyntheticLabImageValidationReason };

export type SyntheticLabImageContentValidation =
  | { ok: true; mimeType: SyntheticLabImageType; width: number; height: number }
  | {
      ok: false;
      reason:
        | SyntheticLabImageValidationReason
        | 'invalid-image'
        | 'mime-mismatch'
        | 'unsafe-dimensions';
    };

type BrowserLocalImageFile = Pick<File, 'size' | 'type' | 'slice'>;

type DetectedImage = {
  mimeType: SyntheticLabImageType;
  width: number;
  height: number;
};

const acceptedPreviewTypes = new Set<SyntheticLabImageType>(['image/jpeg', 'image/png']);

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

const jpegStartOfFrameMarkers = new Set([
  0xc0,
  0xc1,
  0xc2,
  0xc3,
  0xc5,
  0xc6,
  0xc7,
  0xc9,
  0xca,
  0xcb,
  0xcd,
  0xce,
  0xcf,
]);

export function validateSyntheticLabImage(file: Pick<File, 'size' | 'type'>): SyntheticLabImageValidation {
  if (file.size === 0) return { ok: false, reason: 'empty-file' };
  if (file.size > MAX_SYNTHETIC_LAB_IMAGE_BYTES) return { ok: false, reason: 'file-too-large' };
  if (!acceptedPreviewTypes.has(file.type as SyntheticLabImageType)) {
    return { ok: false, reason: 'unsupported-type' };
  }
  return { ok: true };
}

function hasBytes(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + expected.length) return false;
  return expected.every((value, index) => bytes[offset + index] === value);
}

function readPngDimensions(bytes: Uint8Array): DetectedImage | null {
  // A PNG must begin with its eight-byte signature followed immediately by
  // the fixed 13-byte IHDR chunk. Width and height are unsigned big-endian
  // integers in the first eight bytes of IHDR data.
  if (bytes.length < 33 || !hasBytes(bytes, pngSignature)) return null;
  if (!hasBytes(bytes, [0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8)) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    mimeType: 'image/png',
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function readJpegDimensions(bytes: Uint8Array): DetectedImage | null {
  if (!hasBytes(bytes, [0xff, 0xd8])) return null;

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;

    // Standalone markers carry no length field. Encountering SOS or EOI
    // before a Start Of Frame means the dimensions were not established.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (marker === 0xd9 || marker === 0xda || marker === 0x00) return null;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (jpegStartOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      return {
        mimeType: 'image/jpeg',
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }

    offset += segmentLength;
  }

  return null;
}

function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (hasBytes(bytes, pngSignature)) return readPngDimensions(bytes);
  if (hasBytes(bytes, [0xff, 0xd8])) return readJpegDimensions(bytes);
  return null;
}

/**
 * Validate the bytes used for a browser-local preview without uploading them.
 * Callers should run `validateSyntheticLabImage` first for instant feedback;
 * this function repeats that gate so a direct call remains bounded to 4 MiB.
 */
export async function validateSyntheticLabImageContents(
  file: BrowserLocalImageFile,
): Promise<SyntheticLabImageContentValidation> {
  const cheapValidation = validateSyntheticLabImage(file);
  if (!cheapValidation.ok) return cheapValidation;

  // `File#slice` prevents a caller-supplied Blob implementation from making
  // this validator read beyond the already-enforced maximum file size.
  const bytes = new Uint8Array(
    await file.slice(0, MAX_SYNTHETIC_LAB_IMAGE_BYTES + 1).arrayBuffer(),
  );
  if (bytes.byteLength === 0) return { ok: false, reason: 'empty-file' };
  if (bytes.byteLength > MAX_SYNTHETIC_LAB_IMAGE_BYTES) {
    return { ok: false, reason: 'file-too-large' };
  }

  const detected = detectImage(bytes);
  if (!detected) return { ok: false, reason: 'invalid-image' };
  if (detected.mimeType !== file.type) return { ok: false, reason: 'mime-mismatch' };

  const { width, height } = detected;
  if (
    width === 0 ||
    height === 0 ||
    width > MAX_SYNTHETIC_LAB_IMAGE_DIMENSION ||
    height > MAX_SYNTHETIC_LAB_IMAGE_DIMENSION ||
    width * height > MAX_SYNTHETIC_LAB_IMAGE_PIXELS
  ) {
    return { ok: false, reason: 'unsafe-dimensions' };
  }

  return { ok: true, ...detected };
}

export function formatSyntheticLabImageSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${(bytes / 1024).toFixed(1)} KiB`;
}
