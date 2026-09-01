import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalRecordIntake } from '../components/public-beta/LocalRecordIntake';
import { formatLocalRecordSize, validateLocalRecordFile } from '../lib/local-record-intake';

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
    expect(validateLocalRecordFile({ name: 'challan.pdf', size: 2 * MiB, type: 'application/pdf' }, 'official-record')).toMatchObject({ ok: true, previewKind: 'pdf' });
    expect(validateLocalRecordFile({ name: 'evidence.webp', size: MiB, type: 'image/webp' }, 'photograph')).toMatchObject({ ok: true, previewKind: 'image' });
    expect(validateLocalRecordFile({ name: 'notice.svg', size: 100, type: 'image/svg+xml' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('rejects empty and oversized files before preview', () => {
    expect(validateLocalRecordFile({ name: 'empty.pdf', size: 0, type: 'application/pdf' }, 'official-record')).toEqual({ ok: false, reason: 'empty-file' });
    expect(validateLocalRecordFile({ name: 'large.jpg', size: 12 * MiB + 1, type: 'image/jpeg' }, 'photograph')).toEqual({ ok: false, reason: 'file-too-large' });
  });

  it('does not infer support from a filename extension', () => {
    expect(validateLocalRecordFile({ name: 'challan.pdf', size: 20, type: 'application/octet-stream' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
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
