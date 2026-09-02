import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { LocalRecordIntake } from '../components/public-beta/LocalRecordIntake';
import {
  formatLocalRecordSize,
  validateLocalRecordFile,
  type ApprovedLocalRecordMimeType,
  type LocalRecordFileMeta,
} from '../lib/local-record-intake';

const MiB = 1024 * 1024;
const intakeComponentSource = readFileSync(
  new URL('../components/public-beta/LocalRecordIntake.tsx', import.meta.url),
  'utf8',
);
const intakeStyles = readFileSync(
  new URL('../components/public-beta/LocalRecordIntake.module.css', import.meta.url),
  'utf8',
);

function mediaBlock(source: string, query: string) {
  const marker = `@media ${query}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return '';
  const openIndex = source.indexOf('{', markerIndex);
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  return '';
}

describe('local official-record intake', () => {
  it('accepts only the approved PDF and image MIME types', () => {
    expect(validateLocalRecordFile({ size: 2 * MiB, type: 'application/pdf' }, 'official-record')).toEqual({ ok: true, type: 'application/pdf', previewKind: 'pdf' });
    expect(validateLocalRecordFile({ size: MiB, type: 'image/jpeg' }, 'photograph')).toEqual({ ok: true, type: 'image/jpeg', previewKind: 'image' });
    expect(validateLocalRecordFile({ size: MiB, type: 'image/png' }, 'photograph')).toEqual({ ok: true, type: 'image/png', previewKind: 'image' });
    expect(validateLocalRecordFile({ size: MiB, type: 'image/webp' }, 'photograph')).toEqual({ ok: true, type: 'image/webp', previewKind: 'image' });
    expect(validateLocalRecordFile({ size: 100, type: 'image/svg+xml' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
    expect(validateLocalRecordFile({ size: 100, type: 'text/html' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
    expect(validateLocalRecordFile({ size: 100, type: 'application/x-arbitrary' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('rejects empty and oversized files before preview', () => {
    expect(validateLocalRecordFile({ size: 0, type: 'application/pdf' }, 'official-record')).toEqual({ ok: false, reason: 'empty-file' });
    expect(validateLocalRecordFile({ size: 12 * MiB + 1, type: 'image/jpeg' }, 'photograph')).toEqual({ ok: false, reason: 'file-too-large' });
  });

  it('does not infer support from a filename extension', () => {
    expect(validateLocalRecordFile({ size: 20, type: 'application/octet-stream' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('stores exactly role, safe MIME type, size, and preview kind as selection metadata', () => {
    const metadata = {
      role: 'official-record',
      type: 'application/pdf',
      size: 2048,
      previewKind: 'pdf',
    } satisfies LocalRecordFileMeta;

    expect(Object.keys(metadata)).toEqual(['role', 'type', 'size', 'previewKind']);
    expectTypeOf<LocalRecordFileMeta['type']>().toEqualTypeOf<ApprovedLocalRecordMimeType>();
    expectTypeOf<Parameters<typeof validateLocalRecordFile>[0]>()
      .toEqualTypeOf<Pick<File, 'size' | 'type'>>();

    // @ts-expect-error Unsafe browser MIME strings cannot enter stored metadata.
    const unsafeSvgMetadataType: LocalRecordFileMeta['type'] = 'image/svg+xml';
    // @ts-expect-error Arbitrary browser MIME strings cannot enter stored metadata.
    const unsafeHtmlMetadataType: LocalRecordFileMeta['type'] = 'text/html';
    expect([unsafeSvgMetadataType, unsafeHtmlMetadataType]).toEqual(['image/svg+xml', 'text/html']);
    expect(intakeComponentSource).toMatch(/type:\s*validation\.type/);
    expect(intakeComponentSource).not.toMatch(/type:\s*file\.type/);
  });

  it('formats selected size without exposing file contents', () => {
    expect(formatLocalRecordSize(1536)).toBe('1.5 KiB');
    expect(formatLocalRecordSize(2 * MiB)).toBe('2.0 MiB');
  });

  it('keeps the visually hidden native file input out of keyboard tab order', () => {
    expect(intakeComponentSource).toMatch(
      /<input\s+[\s\S]*?className=\{styles\.visuallyHidden\}[\s\S]*?tabIndex=\{-1\}[\s\S]*?type="file"/,
    );
  });

  it('shows a compact local receipt and discloses the full processing mechanics', () => {
    const html = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: null,
      photograph: null,
      onRecordChange: () => undefined,
      onPhotographChange: () => undefined,
      language: 'en',
    }));

    expect(html).toContain('Local only · Not uploaded · Not saved');
    expect(html).toContain('Challan copy');
    expect(html).toContain('Photo from the challan');
    expect(html).toContain('<summary>How local review works</summary>');
    expect(html).toContain('No selected file or answer has been uploaded to ChallanSakshi or an authority');
  });

  it('renders only a generic selected-role label with safe type and size feedback', () => {
    const html = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: {
        meta: {
          role: 'official-record',
          type: 'application/pdf',
          size: 2048,
          previewKind: 'pdf',
        },
        previewUrl: 'blob:local-preview',
      },
      photograph: {
        meta: {
          role: 'photograph',
          type: 'image/webp',
          size: 4096,
          previewKind: 'image',
        },
        previewUrl: 'blob:local-photograph-preview',
      },
      onRecordChange: () => undefined,
      onPhotographChange: () => undefined,
      language: 'en',
    }));

    expect(html).toContain('Selected notice');
    expect(html).toContain('Selected photograph');
    expect(html).toContain('application/pdf');
    expect(html).toContain('2.0 KiB');
    expect(html).toContain('image/webp');
    expect(html).toContain('4.0 KiB');
  });

  it('keeps local-intake guidance and controls at 16px on narrow screens', () => {
    const mobile = mediaBlock(intakeStyles, '(max-width: 420px)');

    for (const selector of [
      '.receipt strong',
      '.mechanics summary',
      '.mechanics li',
      '.rowCopy p:last-child',
      '.choose',
      '.actions button',
      '.metadata strong',
      '.metadata span',
      '.preview p',
      '.error',
    ]) {
      expect(mobile, selector).toMatch(
        new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}[^{}]*\\{[^}]*font-size:\\s*16px`),
      );
    }
  });
});
