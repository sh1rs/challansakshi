/** Local, descriptive measurements. None establish readability, identity or origin. */
export type PhotoRegion = { x: number; y: number; width: number; height: number };
export type PhotoPoint = { x: number; y: number };
export type PhotoOrigin = 'unknown' | 'official-attachment' | 'own-supporting';
export type PhotoReference = { value: string; sourceId: string; page: number; fingerprint?: string };
export type PhotoObservation = {
  sourceId: string; origin: PhotoOrigin; originalWidth: number; originalHeight: number;
  region: PhotoRegion; assessment: 'readable' | 'unreadable' | 'unrelated'; reading: string;
  reference: PhotoReference | null;
};
const MAX_PIXELS = 12_000_000;
function dimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > MAX_PIXELS) throw new Error('Choose an image with up to 12 million pixels.');
  return { width, height };
}

/** Inspect the raster header before allowing the browser to decode it. */
export function readPhotoDimensions(bytes: Uint8Array, type: string): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === 'image/png' && bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) && view.getUint32(12) === 0x49484452) return dimensions(view.getUint32(16), view.getUint32(20));
  if (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
      offset += length;
    }
  }
  if (type === 'image/webp' && bytes.length >= 30 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
    const chunk = view.getUint32(12);
    if (chunk === 0x56503858) return dimensions(1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16));
    if (chunk === 0x5650384c && bytes[20] === 0x2f) return dimensions(1 + bytes[21] + ((bytes[22] & 0x3f) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0xf) << 10));
    if (chunk === 0x56503820 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return dimensions(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  throw new Error('The image header could not be read.');
}

export function boundPhotoRegion(region: PhotoRegion, width: number, height: number): PhotoRegion {
  dimensions(width, height);
  const integer = (value: number, fallback: number) => Number.isFinite(value) ? Math.floor(value) : fallback;
  const x = Math.max(0, Math.min(width - 1, integer(region.x, 0)));
  const y = Math.max(0, Math.min(height - 1, integer(region.y, 0)));
  return { x, y, width: Math.max(1, Math.min(width - x, integer(region.width, 1))), height: Math.max(1, Math.min(height - y, integer(region.height, 1))) };
}

/** Uses the displayed image bounds, including zoom and viewport scroll offsets. */
export function photoPointFromClient(clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }, width: number, height: number): PhotoPoint | null {
  if (![clientX, clientY, bounds.left, bounds.top, bounds.width, bounds.height, width, height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0 || width <= 0 || height <= 0) return null;
  return { x: Math.max(0, Math.min(width, (clientX - bounds.left) / bounds.width * width)), y: Math.max(0, Math.min(height, (clientY - bounds.top) / bounds.height * height)) };
}

/** A click or line does not replace the current area with an invented rectangle. */
export function photoRegionBetweenPoints(start: PhotoPoint, end: PhotoPoint, width: number, height: number): PhotoRegion | null {
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite) || Math.abs(start.x - end.x) < 1 || Math.abs(start.y - end.y) < 1) return null;
  const x = Math.floor(Math.min(start.x, end.x)); const y = Math.floor(Math.min(start.y, end.y));
  return boundPhotoRegion({ x, y, width: Math.ceil(Math.max(start.x, end.x)) - x, height: Math.ceil(Math.max(start.y, end.y)) - y }, width, height);
}

/** Variance of the 4-neighbour grayscale Laplacian on a bounded raster. No thresholds. */
export function measurePhotoSharpness(rgba: Uint8ClampedArray, width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 3 || height < 3 || width > 384 || height > 384 || rgba.length !== width * height * 4) throw new Error('Use a raster between 3 and 384 pixels per side.');
  const gray = (x: number, y: number) => { const i = (y * width + x) * 4; return .299 * rgba[i] + .587 * rgba[i + 1] + .114 * rgba[i + 2]; };
  let sum = 0; let squareSum = 0; let sampledPixels = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const value = gray(x - 1, y) + gray(x + 1, y) + gray(x, y - 1) + gray(x, y + 1) - 4 * gray(x, y);
    sum += value; squareSum += value * value; sampledPixels++;
  }
  const variance = Math.max(0, squareSum / sampledPixels - (sum / sampledPixels) ** 2);
  return { laplacianVariance: Math.round(variance * 10) / 10, sampledPixels };
}

export function comparePhotoRegistration(reading: string, reference: string) {
  const normalize = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');
  const left = normalize(reading); const right = normalize(reference);
  const supported = (value: string) => /^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/.test(value);
  if (!supported(left) || !supported(right)) return { status: 'inconclusive' as const, left, right, positions: [] as number[] };
  const positions = Array.from({ length: Math.max(left.length, right.length) }, (_, index) => index).filter(index => left[index] !== right[index]);
  return { status: positions.length ? 'different' as const : 'match' as const, left, right, positions };
}

export function buildPhotoObservationNote(observation: PhotoObservation, language: 'en' | 'hi') {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const { region } = observation;
  const origin = observation.origin === 'official-attachment' ? t('Attached to official record, according to you; origin not verified', 'आपके अनुसार आधिकारिक रिकॉर्ड से संलग्न; स्रोत सत्यापित नहीं') : observation.origin === 'own-supporting' ? t('Your supporting image; origin not verified', 'आपके अनुसार सहायक तस्वीर; स्रोत सत्यापित नहीं') : t('Origin unknown; not verified', 'स्रोत अज्ञात; सत्यापित नहीं');
  const lines = [t('PHOTO OBSERVATION — confirmed by you', 'तस्वीर का अवलोकन — आपके अनुसार पुष्टि'), `${t('Source', 'स्रोत')}: ${observation.sourceId}`, origin,
    `${t('Original dimensions', 'मूल आकार')}: ${observation.originalWidth} × ${observation.originalHeight} px`,
    `${t('Selected area', 'चुना क्षेत्र')}: x=${region.x}, y=${region.y}; ${region.width} × ${region.height} px`,
    observation.assessment === 'readable' ? `${t('Your reading', 'आपके अनुसार पढ़ा नंबर')}: ${observation.reading}` : observation.assessment === 'unreadable' ? t('Marked unreadable by you. Obtain a clearer original; comparison remains inconclusive.', 'आपके अनुसार पढ़ने योग्य नहीं। स्पष्ट मूल तस्वीर लें; तुलना अनिर्णायक है।') : t('Marked unrelated by you. Ask the official service to clarify the attached evidence.', 'आपके अनुसार संबंधित नहीं। संलग्न साक्ष्य पर आधिकारिक सेवा से स्पष्टीकरण माँगें।'),
  ];
  if (observation.assessment === 'readable' && observation.reference) {
    const reference = observation.reference;
    const comparison = comparePhotoRegistration(observation.reading, reference.value);
    lines.push(`${t('Vehicle record', 'वाहन रिकॉर्ड')}: ${reference.value} (${reference.sourceId}, ${t('page', 'पृष्ठ')} ${reference.page})`);
    lines.push(comparison.status === 'match' ? t('The compared text matches.', 'तुलना किया गया पाठ मेल खाता है।') : comparison.status === 'different' ? t('The compared text differs. Recheck both originals.', 'तुलना किया गया पाठ अलग है। दोनों मूल स्रोत फिर जाँचें।') : t('Text comparison is inconclusive.', 'पाठ की तुलना अनिर्णायक है।'));
  }
  lines.push(t('This records your observations, not proof of vehicle identity, an offence, authenticity or challan validity. Originals are not included in this note.', 'यह आपका अवलोकन है; वाहन की पहचान, अपराध, प्रामाणिकता या चालान की वैधता का प्रमाण नहीं। इस नोट में मूल तस्वीर शामिल नहीं है।'));
  return lines.join('\n');
}
