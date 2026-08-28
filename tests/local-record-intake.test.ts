import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatLocalRecordSize, validateLocalRecordFile } from '../lib/local-record-intake';

const MiB = 1024 * 1024;
const intakeComponentSource = readFileSync(
  new URL('../components/public-beta/LocalRecordIntake.tsx', import.meta.url),
  'utf8',
);

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
});
