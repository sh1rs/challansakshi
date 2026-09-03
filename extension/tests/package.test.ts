import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { inflateRawSync, crc32 } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const extensionRoot = resolve(repositoryRoot, 'extension');
const nodeExecutable = process.execPath;
const distRoot = resolve(extensionRoot, 'dist/production-disabled');
const releaseRoot = resolve(extensionRoot, 'release');
const candidateName = 'challansakshi-assisted-handoff-production-disabled-candidate';
const reportPath = resolve(releaseRoot, `${candidateName}.scan-report.json`);
const zipPath = resolve(releaseRoot, `${candidateName}.zip`);
const sidecarPath = resolve(releaseRoot, `${candidateName}.sha256`);

const expectedLeaves = [
  'favicon.svg',
  'icons/icon-128.png',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'manifest.json',
  'popup.css',
  'popup.html',
  'popup.js',
  'service-worker.js',
];

const expectedCheckIds = [
  'canonical-source-directory',
  'exact-leaf-set',
  'regular-files-only',
  'manifest-contract',
  'local-asset-closure',
  'canonical-icons',
  'declarative-surface-closure',
  'javascript-authority-closure',
  'chrome-api-allowlist',
  'local-storage-callsite-confinement',
  'scripting-callsite-confinement',
  'isolated-injection-targeting',
  'alarm-contract',
  'callback-message-contract',
  'network-deny',
  'bidirectional-profile-isolation',
  'deterministic-archive-contract',
];

function sha256(bytes: Buffer | string) {
  return createHash('sha256').update(bytes).digest('hex');
}

function runScript(...args: string[]) {
  return spawnSync(nodeExecutable, [resolve(extensionRoot, 'scripts/package.mjs'), ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

function runBuild(profile: string) {
  return spawnSync(nodeExecutable, [resolve(extensionRoot, 'scripts/build.mjs'), profile], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

function expectOk(result: ReturnType<typeof runScript>, label: string) {
  expect(result.status, `${label}\n${result.stdout}\n${result.stderr}`).toBe(0);
}

type ZipEntry = {
  name: string;
  method: number;
  flags: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  dosTime: number;
  dosDate: number;
  externalAttributes: number;
  localHeaderOffset: number;
  data: Buffer;
};

/** Independent central-directory + local-record parser; throws on any contract breach. */
function parseZip(zip: Buffer) {
  expect(zip.includes(Buffer.from('504b0607', 'hex'))).toBe(false);
  expect(zip.includes(Buffer.from('504b0606', 'hex'))).toBe(false);
  let eocd = -1;
  for (let index = zip.length - 22; index >= 0; index -= 1) {
    if (zip.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  expect(eocd, 'end of central directory must exist').toBeGreaterThanOrEqual(0);
  expect(zip.readUInt16LE(eocd + 4), 'disk number').toBe(0);
  expect(zip.readUInt16LE(eocd + 6), 'central directory disk').toBe(0);
  const entryCount = zip.readUInt16LE(eocd + 10);
  expect(zip.readUInt16LE(eocd + 8), 'disk entries equals total entries').toBe(entryCount);
  const centralSize = zip.readUInt32LE(eocd + 12);
  const centralOffset = zip.readUInt32LE(eocd + 16);
  expect(zip.readUInt16LE(eocd + 20), 'zip comment length').toBe(0);
  expect(eocd, 'no trailing bytes after EOCD').toBe(zip.length - 22);
  expect(centralOffset + centralSize, 'central directory ends at EOCD').toBe(eocd);

  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    expect(zip.readUInt32LE(cursor), 'central header signature').toBe(0x02014b50);
    const flags = zip.readUInt16LE(cursor + 8);
    const method = zip.readUInt16LE(cursor + 10);
    const dosTime = zip.readUInt16LE(cursor + 12);
    const dosDate = zip.readUInt16LE(cursor + 14);
    const crc = zip.readUInt32LE(cursor + 16);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const uncompressedSize = zip.readUInt32LE(cursor + 24);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    expect(zip.readUInt16LE(cursor + 34), 'entry disk number').toBe(0);
    const internalAttributes = zip.readUInt16LE(cursor + 36);
    const externalAttributes = zip.readUInt32LE(cursor + 38);
    const localHeaderOffset = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    expect(extraLength, `${name} central extra field`).toBe(0);
    expect(commentLength, `${name} entry comment`).toBe(0);
    expect(internalAttributes, `${name} internal attributes`).toBe(0);
    expect(flags & 0x0008, `${name} data-descriptor flag`).toBe(0);

    expect(zip.readUInt32LE(localHeaderOffset), `${name} local signature`).toBe(0x04034b50);
    const localFlags = zip.readUInt16LE(localHeaderOffset + 6);
    const localMethod = zip.readUInt16LE(localHeaderOffset + 8);
    const localTime = zip.readUInt16LE(localHeaderOffset + 10);
    const localDate = zip.readUInt16LE(localHeaderOffset + 12);
    const localCrc = zip.readUInt32LE(localHeaderOffset + 14);
    const localCompressed = zip.readUInt32LE(localHeaderOffset + 18);
    const localUncompressed = zip.readUInt32LE(localHeaderOffset + 22);
    const localNameLength = zip.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zip.readUInt16LE(localHeaderOffset + 28);
    const localName = zip
      .subarray(localHeaderOffset + 30, localHeaderOffset + 30 + localNameLength)
      .toString('utf8');
    expect(localName, 'local and central names agree').toBe(name);
    expect(localExtraLength, `${name} local extra field`).toBe(0);
    expect(localMethod, `${name} local method agrees`).toBe(method);
    expect(localFlags, `${name} local flags agree`).toBe(flags);
    expect(localCrc, `${name} local crc agrees`).toBe(crc);
    expect(localCompressed, `${name} local compressed size agrees`).toBe(compressedSize);
    expect(localUncompressed, `${name} local uncompressed size agrees`).toBe(uncompressedSize);
    expect(localTime, `${name} local dos time agrees`).toBe(dosTime);
    expect(localDate, `${name} local dos date agrees`).toBe(dosDate);

    const dataStart = localHeaderOffset + 30 + localNameLength;
    const data = zip.subarray(dataStart, dataStart + compressedSize);
    entries.push({
      name,
      method,
      flags,
      crc,
      compressedSize,
      uncompressedSize,
      dosTime,
      dosDate,
      externalAttributes,
      localHeaderOffset,
      data: Buffer.from(data),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  expect(cursor, 'central directory size consumed exactly').toBe(centralOffset + centralSize);
  return entries;
}

function cleanRelease() {
  rmSync(releaseRoot, { recursive: true, force: true });
}

afterEach(() => {
  const symlinkGuard = `${distRoot}.real`;
  if (existsSync(symlinkGuard)) {
    rmSync(distRoot, { force: true, recursive: false });
    renameSync(symlinkGuard, distRoot);
  }
});

describe('deterministic production-disabled candidate pipeline', () => {
  it('produces the exact three outputs with a frozen scan report and a byte-deterministic archive over two serial cycles', () => {
    const cycles: Array<{ zip: Buffer; report: string; sidecar: string }> = [];
    for (let cycle = 0; cycle < 2; cycle += 1) {
      expectOk(runBuild('production-disabled'), `build cycle ${cycle}`);
      cleanRelease();
      expectOk(runScript('scan'), `scan cycle ${cycle}`);
      expect(existsSync(reportPath), 'scan writes the report').toBe(true);
      expect(existsSync(zipPath), 'scan must not write the archive').toBe(false);
      expect(existsSync(sidecarPath), 'scan must not write the sidecar').toBe(false);
      expectOk(runScript('package'), `package cycle ${cycle}`);
      cycles.push({
        zip: readFileSync(zipPath),
        report: readFileSync(reportPath, 'utf8'),
        sidecar: readFileSync(sidecarPath, 'utf8'),
      });
    }
    expect(cycles[1]!.zip.equals(cycles[0]!.zip), 'cycle ZIP bytes identical').toBe(true);
    expect(cycles[1]!.report, 'cycle report bytes identical').toBe(cycles[0]!.report);
    expect(cycles[1]!.sidecar, 'cycle sidecar bytes identical').toBe(cycles[0]!.sidecar);

    const releaseLeaves = readdirSync(releaseRoot).sort();
    expect(releaseLeaves).toEqual([
      `${candidateName}.scan-report.json`,
      `${candidateName}.sha256`,
      `${candidateName}.zip`,
    ]);

    const zip = cycles[1]!.zip;
    const entries = parseZip(zip);
    expect(entries.map((entry) => entry.name)).toEqual(expectedLeaves);
    expect([...entries.map((entry) => entry.name)].sort()).toEqual(entries.map((entry) => entry.name));
    for (const entry of entries) {
      expect(entry.name, 'no unsafe path shapes').not.toMatch(/^\/|^[A-Za-z]:|\\|(^|\/)\.\.?(\/|$)|\/$/u);
      expect(entry.method, `${entry.name} deflate`).toBe(8);
      expect(entry.dosTime, `${entry.name} fixed DOS time`).toBe(0);
      expect(entry.dosDate, `${entry.name} fixed DOS date 1980-01-01`).toBe(0x0021);
      expect(entry.externalAttributes >>> 16, `${entry.name} unix mode 0644`).toBe(0o100644);
      expect(entry.externalAttributes & 0xffff, `${entry.name} no DOS attribute bits`).toBe(0);
      const inflated = inflateRawSync(entry.data);
      expect(inflated.length, `${entry.name} uncompressed size`).toBe(entry.uncompressedSize);
      expect(crc32(inflated) >>> 0, `${entry.name} crc`).toBe(entry.crc);
      const distBytes = readFileSync(resolve(distRoot, entry.name));
      expect(inflated.equals(distBytes), `${entry.name} bytes match the built leaf`).toBe(true);
    }

    const sidecar = cycles[1]!.sidecar;
    expect(sidecar).toBe(`${sha256(zip)}  ${candidateName}.zip\n`);
    expect(sidecar).toMatch(/^[0-9a-f]{64} {2}[^/\\]+\n$/u);

    const reportText = cycles[1]!.report;
    expect(reportText.endsWith('\n'), 'report ends with one LF').toBe(true);
    expect(reportText.endsWith('\n\n'), 'report ends with exactly one LF').toBe(false);
    const report = JSON.parse(reportText) as Record<string, unknown>;
    expect(Object.keys(report)).toEqual([
      'schema',
      'status',
      'profile',
      'candidate',
      'sourceDirectory',
      'archivePath',
      'archiveSha256',
      'entries',
      'checks',
    ]);
    expect(report.schema).toBe('challansakshi.extension-package-scan/v1');
    expect(report.status).toBe('pass');
    expect(report.profile).toBe('production-disabled');
    expect(report.candidate).toBe(candidateName);
    expect(report.sourceDirectory).toBe('extension/dist/production-disabled');
    expect(report.archivePath).toBe(`extension/release/${candidateName}.zip`);
    expect(report.archiveSha256).toBe(sha256(zip));
    expect(JSON.stringify(report, null, 2) + '\n', 'two-space indentation').toBe(reportText);

    const reportEntries = report.entries as Array<Record<string, unknown>>;
    expect(reportEntries.map((entry) => entry.path)).toEqual(expectedLeaves);
    for (const entry of reportEntries) {
      expect(Object.keys(entry)).toEqual(['path', 'size', 'sha256']);
      const distBytes = readFileSync(resolve(distRoot, entry.path as string));
      expect(entry.size).toBe(distBytes.length);
      expect(entry.sha256).toBe(sha256(distBytes));
    }

    const checks = report.checks as Array<Record<string, unknown>>;
    expect(checks.map((check) => check.id)).toEqual(expectedCheckIds);
    for (const check of checks) {
      expect(Object.keys(check)).toEqual(['id', 'status']);
      expect(check.status).toBe('pass');
    }

    expect(reportText).not.toMatch(/store|web store|public|eligible/iu);
    expect(reportText).not.toContain(repositoryRoot);
    expect(reportText).not.toContain('Users');
  });

  it('rejects missing, extra, unknown, and caller-path arguments without touching outputs', () => {
    expectOk(runBuild('production-disabled'), 'build for rejection cases');
    cleanRelease();
    for (const args of [[], ['scan', 'package'], ['pack'], ['publish'], ['store'], ['scan', distRoot], ['package', '/tmp/elsewhere']]) {
      const result = runScript(...args);
      expect(result.status, `args ${JSON.stringify(args)} must fail`).not.toBe(0);
    }
    expect(existsSync(releaseRoot) ? readdirSync(releaseRoot) : []).toEqual([]);
  });

  it('fails closed on a symlinked source root and removes only its stale report', () => {
    expectOk(runBuild('production-disabled'), 'build before symlink case');
    cleanRelease();
    mkdirSync(releaseRoot, { recursive: true });
    writeFileSync(reportPath, '{"stale":true}\n');
    writeFileSync(zipPath, 'sentinel-zip');
    writeFileSync(sidecarPath, 'sentinel-sidecar');
    renameSync(distRoot, `${distRoot}.real`);
    symlinkSync(`${distRoot}.real`, distRoot);
    try {
      const result = runScript('scan');
      expect(result.status, 'symlinked root must fail').not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).not.toContain(`${distRoot}.real`);
      expect(existsSync(reportPath), 'stale report removed').toBe(false);
      expect(readFileSync(zipPath, 'utf8'), 'zip untouched').toBe('sentinel-zip');
      expect(readFileSync(sidecarPath, 'utf8'), 'sidecar untouched').toBe('sentinel-sidecar');
    } finally {
      rmSync(distRoot, { force: true });
      renameSync(`${distRoot}.real`, distRoot);
      cleanRelease();
    }
  });

  it('refuses to package when the report is stale relative to the current directory', () => {
    expectOk(runBuild('production-disabled'), 'build before staleness case');
    cleanRelease();
    expectOk(runScript('scan'), 'baseline scan');
    const tampered = readFileSync(reportPath, 'utf8').replace(/"archiveSha256": "[0-9a-f]{64}"/u, `"archiveSha256": "${'0'.repeat(64)}"`);
    writeFileSync(reportPath, tampered);
    const result = runScript('package');
    expect(result.status, 'package must revalidate the report').not.toBe(0);
    expect(existsSync(zipPath)).toBe(false);
    expect(existsSync(sidecarPath)).toBe(false);
    cleanRelease();
  });

  it('keeps the packaged source strictly the production-disabled family', () => {
    expectOk(runBuild('production-disabled'), 'build for family scan');
    cleanRelease();
    expectOk(runScript('scan'), 'family scan');
    expectOk(runScript('package'), 'family package');
    const entries = parseZip(readFileSync(zipPath));
    const textBytes = entries
      .filter((entry) => !entry.name.endsWith('.png'))
      .map((entry) => inflateRawSync(entry.data).toString('utf8'))
      .join('\n');
    expect(textBytes).toContain('internal-disabled');
    expect(textBytes).not.toContain('127.0.0.1');
    expect(textBytes).not.toContain('synthetic-fixture');
    const distLstat = lstatSync(distRoot);
    expect(distLstat.isDirectory()).toBe(true);
    cleanRelease();
  });
});
