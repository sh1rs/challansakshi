import { describe, expect, it } from 'vitest';
import { boundPhotoRegion, comparePhotoRegistration, measurePhotoSharpness, readPhotoDimensions, buildPhotoObservationNote, photoPointFromClient, photoRegionBetweenPoints, type PhotoObservation } from '../lib/evidence-photo-tools';

describe('local photo evidence boundaries', () => {
  it('maps pointer positions through zoomed and scrolled image bounds into original pixels', () => {
    expect(photoPointFromClient(120, 160, { left: -80, top: 60, width: 1600, height: 800 }, 800, 400)).toEqual({ x: 100, y: 50 });
    expect(photoPointFromClient(-100, 900, { left: -80, top: 60, width: 1600, height: 800 }, 800, 400)).toEqual({ x: 0, y: 400 });
    expect(photoPointFromClient(120, 160, { left: 0, top: 0, width: 0, height: 800 }, 800, 400)).toBeNull();
    expect(photoPointFromClient(NaN, 160, { left: 0, top: 0, width: 800, height: 400 }, 800, 400)).toBeNull();
  });
  it('allows reverse drags, covers selected pixels and rejects zero-size rectangles', () => {
    expect(photoRegionBetweenPoints({ x: 700.2, y: 280.8 }, { x: 100.4, y: 180.1 }, 800, 400)).toEqual({ x: 100, y: 180, width: 601, height: 101 });
    expect(photoRegionBetweenPoints({ x: 0, y: 0 }, { x: 800, y: 400 }, 800, 400)).toEqual({ x: 0, y: 0, width: 800, height: 400 });
    expect(photoRegionBetweenPoints({ x: 20, y: 20 }, { x: 20, y: 50 }, 800, 400)).toBeNull();
    expect(photoRegionBetweenPoints({ x: 20, y: 20 }, { x: 20, y: 20 }, 800, 400)).toBeNull();
  });
  it('keeps a selected area inside the original pixels, including invalid input', () => {
    expect(boundPhotoRegion({ x: 99, y: -4, width: 80, height: 0 }, 100, 50)).toEqual({ x: 99, y: 0, width: 1, height: 1 });
    expect(boundPhotoRegion({ x: NaN, y: Infinity, width: 20.8, height: 10.2 }, 100, 50)).toEqual({ x: 0, y: 0, width: 20, height: 10 });
    expect(() => boundPhotoRegion({ x: 0, y: 0, width: 1, height: 1 }, 0, 50)).toThrow();
  });
  it('measures local pixel variation without manufacturing a quality classification', () => {
    const flat = new Uint8ClampedArray(10 * 10 * 4).fill(255);
    expect(measurePhotoSharpness(flat, 10, 10)).toEqual({ laplacianVariance: 0, sampledPixels: 64 });
    const edges = flat.slice();
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (x % 2) edges.fill(0, (y * 10 + x) * 4, (y * 10 + x) * 4 + 3);
    expect(measurePhotoSharpness(edges, 10, 10).laplacianVariance).toBeGreaterThan(0);
    expect(() => measurePhotoSharpness(flat, 500, 500)).toThrow();
    expect(() => measurePhotoSharpness(flat, 2, 2)).toThrow();
  });
  it('compares only full supported registrations without inventing O/0 substitutions', () => {
    expect(comparePhotoRegistration('ka 01 ab 1234', 'KA-01-AB-1234').status).toBe('match');
    expect(comparePhotoRegistration('KA01AB3817', 'KA01AB3317')).toMatchObject({ status: 'different', positions: [7] });
    expect(comparePhotoRegistration('KAO1AB1234', 'KA01AB1234').status).toBe('inconclusive');
    expect(comparePhotoRegistration('1234', '1234').status).toBe('inconclusive');
    expect(comparePhotoRegistration('21BH1234AA', '21BH1234AB').positions).toEqual([9]);
  });
  it('rejects oversized or malformed images before decoding', () => {
    const png = new Uint8Array(24); png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer); view.setUint32(12, 0x49484452); view.setUint32(16, 1200); view.setUint32(20, 800);
    expect(readPhotoDimensions(png, 'image/png')).toEqual({ width: 1200, height: 800 });
    view.setUint32(16, 999999); expect(() => readPhotoDimensions(png, 'image/png')).toThrow();
    expect(() => readPhotoDimensions(new Uint8Array([1, 2]), 'image/jpeg')).toThrow();
  });
  it('preserves self-declared origin, source, crop and uncertainty in exported observations', () => {
    const observation: PhotoObservation = { sourceId: 'local-source-1', origin: 'official-attachment', originalWidth: 1200, originalHeight: 800, region: { x: 20, y: 30, width: 100, height: 25 }, assessment: 'unreadable', reading: '', reference: null };
    const note = buildPhotoObservationNote(observation, 'en');
    expect(note).toContain('local-source-1'); expect(note).toContain('100 × 25');
    expect(note).toContain('not verified'); expect(note).toContain('Marked unreadable by you');
    expect(note).not.toContain('match');
    expect(buildPhotoObservationNote(observation, 'hi')).toContain('आपके अनुसार');
  });
});
