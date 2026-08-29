import { describe, expect, it } from 'vitest';
import {
  MAX_SYNTHETIC_LAB_IMAGE_DIMENSION,
  MAX_SYNTHETIC_LAB_IMAGE_BYTES,
  MAX_SYNTHETIC_LAB_IMAGE_PIXELS,
  formatSyntheticLabImageSize,
  validateSyntheticLabImage,
  validateSyntheticLabImageContents,
} from '../lib/synthetic-lab-file';

function localImageFile(type: string, bytes: Uint8Array) {
  const ownedBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ownedBuffer).set(bytes);
  const blob = new Blob([ownedBuffer], { type });
  return {
    size: blob.size,
    type: blob.type,
    slice: blob.slice.bind(blob),
  };
}

function pngWithDimensions(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  // The content validator only reads the fixed PNG signature and IHDR metadata.
  bytes.set([0x08, 0x06, 0x00, 0x00, 0x00], 24);
  return bytes;
}

function jpegWithDimensions(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

describe('browser-local synthetic lab image preview', () => {
  it('accepts only bounded JPEG and PNG previews', () => {
    expect(validateSyntheticLabImage({ size: 1200, type: 'image/jpeg' })).toEqual({ ok: true });
    expect(validateSyntheticLabImage({ size: 1200, type: 'image/png' })).toEqual({ ok: true });
    expect(validateSyntheticLabImage({ size: 1200, type: 'image/webp' })).toEqual({ ok: false, reason: 'unsupported-type' });
    expect(validateSyntheticLabImage({ size: 1200, type: 'application/pdf' })).toEqual({ ok: false, reason: 'unsupported-type' });
    expect(validateSyntheticLabImage({ size: 1200, type: 'image/svg+xml' })).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('reads PNG and JPEG dimensions from bounded browser-local bytes', async () => {
    await expect(
      validateSyntheticLabImageContents(localImageFile('image/png', pngWithDimensions(640, 480))),
    ).resolves.toEqual({ ok: true, mimeType: 'image/png', width: 640, height: 480 });

    await expect(
      validateSyntheticLabImageContents(localImageFile('image/jpeg', jpegWithDimensions(1280, 720))),
    ).resolves.toEqual({ ok: true, mimeType: 'image/jpeg', width: 1280, height: 720 });
  });

  it('rejects malformed or truncated image bytes', async () => {
    await expect(
      validateSyntheticLabImageContents(localImageFile('image/png', Uint8Array.from([0x89, 0x50, 0x4e]))),
    ).resolves.toEqual({ ok: false, reason: 'invalid-image' });

    await expect(
      validateSyntheticLabImageContents(localImageFile('image/jpeg', Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]))),
    ).resolves.toEqual({ ok: false, reason: 'invalid-image' });
  });

  it('rejects a declared MIME type that does not match the byte signature', async () => {
    await expect(
      validateSyntheticLabImageContents(localImageFile('image/jpeg', pngWithDimensions(320, 240))),
    ).resolves.toEqual({ ok: false, reason: 'mime-mismatch' });

    await expect(
      validateSyntheticLabImageContents(localImageFile('image/png', jpegWithDimensions(320, 240))),
    ).resolves.toEqual({ ok: false, reason: 'mime-mismatch' });
  });

  it('rejects zero, over-dimension, and over-pixel images', async () => {
    await expect(
      validateSyntheticLabImageContents(localImageFile('image/png', pngWithDimensions(0, 480))),
    ).resolves.toEqual({ ok: false, reason: 'unsafe-dimensions' });

    await expect(
      validateSyntheticLabImageContents(
        localImageFile('image/jpeg', jpegWithDimensions(MAX_SYNTHETIC_LAB_IMAGE_DIMENSION + 1, 1)),
      ),
    ).resolves.toEqual({ ok: false, reason: 'unsafe-dimensions' });

    const overPixelWidth = 4000;
    const overPixelHeight = Math.floor(MAX_SYNTHETIC_LAB_IMAGE_PIXELS / overPixelWidth) + 1;
    await expect(
      validateSyntheticLabImageContents(
        localImageFile('image/png', pngWithDimensions(overPixelWidth, overPixelHeight)),
      ),
    ).resolves.toEqual({ ok: false, reason: 'unsafe-dimensions' });
  });

  it('keeps the content read bounded even when the content validator is called directly', async () => {
    const oversized = localImageFile(
      'image/png',
      new Uint8Array(MAX_SYNTHETIC_LAB_IMAGE_BYTES + 1),
    );
    await expect(validateSyntheticLabImageContents(oversized)).resolves.toEqual({
      ok: false,
      reason: 'file-too-large',
    });
  });

  it('rejects empty and oversized previews before creating an object URL', () => {
    expect(validateSyntheticLabImage({ size: 0, type: 'image/png' })).toEqual({ ok: false, reason: 'empty-file' });
    expect(validateSyntheticLabImage({ size: MAX_SYNTHETIC_LAB_IMAGE_BYTES + 1, type: 'image/png' })).toEqual({ ok: false, reason: 'file-too-large' });
  });

  it('formats size without requiring or returning a raw filename', () => {
    expect(formatSyntheticLabImageSize(1536)).toBe('1.5 KiB');
    expect(formatSyntheticLabImageSize(2 * 1024 * 1024)).toBe('2.0 MiB');
  });
});
