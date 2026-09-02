export type LocalRecordRole = 'official-record' | 'photograph';
export type LocalRecordPreviewKind = 'pdf' | 'image';
export const APPROVED_LOCAL_RECORD_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const);
export type ApprovedLocalRecordMimeType = typeof APPROVED_LOCAL_RECORD_MIME_TYPES[number];

export type LocalRecordFileMeta = {
  size: number;
  type: ApprovedLocalRecordMimeType;
  role: LocalRecordRole;
  previewKind: LocalRecordPreviewKind;
};

export type LocalRecordValidation =
  | { ok: true; type: ApprovedLocalRecordMimeType; previewKind: LocalRecordPreviewKind }
  | { ok: false; reason: 'empty-file' | 'file-too-large' | 'unsupported-type' };

export const MAX_LOCAL_RECORD_BYTES = 12 * 1024 * 1024;

const acceptedTypes = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
} as const satisfies Record<ApprovedLocalRecordMimeType, LocalRecordPreviewKind>;

export function validateLocalRecordFile(
  file: Pick<File, 'size' | 'type'>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept in the public selection contract; every approved type is valid for both roles.
  _role: LocalRecordRole,
): LocalRecordValidation {
  if (file.size === 0) return { ok: false, reason: 'empty-file' };
  if (file.size > MAX_LOCAL_RECORD_BYTES) return { ok: false, reason: 'file-too-large' };
  if (!APPROVED_LOCAL_RECORD_MIME_TYPES.includes(file.type as ApprovedLocalRecordMimeType)) {
    return { ok: false, reason: 'unsupported-type' };
  }
  const type = file.type as ApprovedLocalRecordMimeType;
  return { ok: true, type, previewKind: acceptedTypes[type] };
}

export function formatLocalRecordSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${(bytes / 1024).toFixed(1)} KiB`;
}
