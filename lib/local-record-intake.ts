export type LocalRecordRole = 'official-record' | 'photograph';
export type LocalRecordPreviewKind = 'pdf' | 'image';

export type LocalRecordFileMeta = {
  name: string;
  size: number;
  type: string;
  role: LocalRecordRole;
  previewKind: LocalRecordPreviewKind;
};

export type LocalRecordValidation =
  | { ok: true; previewKind: LocalRecordPreviewKind }
  | { ok: false; reason: 'empty-file' | 'file-too-large' | 'unsupported-type' };

export const MAX_LOCAL_RECORD_BYTES = 12 * 1024 * 1024;

const acceptedTypes = new Map<string, LocalRecordPreviewKind>([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'image'],
  ['image/png', 'image'],
  ['image/webp', 'image'],
]);

export function validateLocalRecordFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept in the public selection contract; every approved type is valid for both roles.
  _role: LocalRecordRole,
): LocalRecordValidation {
  if (file.size === 0) return { ok: false, reason: 'empty-file' };
  if (file.size > MAX_LOCAL_RECORD_BYTES) return { ok: false, reason: 'file-too-large' };
  const previewKind = acceptedTypes.get(file.type);
  return previewKind ? { ok: true, previewKind } : { ok: false, reason: 'unsupported-type' };
}

export function formatLocalRecordSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${(bytes / 1024).toFixed(1)} KiB`;
}
