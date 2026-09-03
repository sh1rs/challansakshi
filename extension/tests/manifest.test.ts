import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  EXTENSION_BUILD_PROFILE_IDS,
  EXTENSION_BUILD_PROFILE_SCHEMA,
  buildManifest,
  getExtensionBuildProfile,
  validateEnvelopeForBuildProfile,
} from '../src/manifest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const extensionRoot = resolve(repositoryRoot, 'extension');
const nodeExecutable = process.execPath;

const exactManifest = (name: string) => ({
  manifest_version: 3,
  name,
  version: '0.1.0',
  description: 'Places reviewed ChallanSakshi description text and, when supported, category into blank fields after explicit approval.',
  minimum_chrome_version: '152',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_title: 'ChallanSakshi Assisted Handoff',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    },
  },
  background: {
    service_worker: 'service-worker.js',
    type: 'module',
  },
  permissions: ['activeTab', 'scripting', 'storage', 'alarms'],
  incognito: 'not_allowed',
  content_security_policy: {
    extension_pages: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'",
  },
});

const forbiddenManifestKeys = [
  'host_permissions',
  'optional_host_permissions',
  'content_scripts',
  'externally_connectable',
  'web_accessible_resources',
  'update_url',
  'sandbox',
] as const;

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function regularFileLeaves(root: string, relative = ''): string[] {
  const absolute = resolve(root, relative);
  const entries = readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink: ${child}`);
    if (entry.isDirectory()) return regularFileLeaves(root, child);
    if (!entry.isFile()) throw new Error(`Unexpected non-file leaf: ${child}`);
    return child;
  }).sort();
}

function fileDigests(root: string): Record<string, string> {
  return Object.fromEntries(regularFileLeaves(root).map((leaf) => [
    leaf,
    sha256(readFileSync(resolve(root, leaf))),
  ]));
}

function runBuild(...args: string[]) {
  return spawnSync(nodeExecutable, [resolve(extensionRoot, 'scripts/build.mjs'), ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

describe('closed extension build profiles', () => {
  it('selects only the two mutually exclusive checked-in profiles', () => {
    expect(EXTENSION_BUILD_PROFILE_SCHEMA).toBe('challansakshi.extension-build-profile/v1');
    expect(EXTENSION_BUILD_PROFILE_IDS).toEqual([
      'synthetic-development',
      'production-disabled',
    ]);

    const synthetic = getExtensionBuildProfile('synthetic-development');
    const production = getExtensionBuildProfile('production-disabled');
    expect(synthetic).toMatchObject({
      schema: 'challansakshi.extension-build-profile/v1',
      id: 'synthetic-development',
      envelopeMode: 'synthetic',
      packageName: 'ChallanSakshi Assisted Handoff — Synthetic Development',
      visibleEnvironmentLabel: 'Synthetic development · fictional fixtures only',
      manifestVersion: '0.1.0',
      minimumChromeVersion: '152',
      validatorProfile: 'synthetic-development',
    });
    expect(production).toMatchObject({
      schema: 'challansakshi.extension-build-profile/v1',
      id: 'production-disabled',
      envelopeMode: 'real',
      packageName: 'ChallanSakshi Assisted Handoff',
      visibleEnvironmentLabel: 'Production disabled · internal review only',
      manifestVersion: '0.1.0',
      minimumChromeVersion: '152',
      validatorProfile: 'production-disabled',
    });
    expect(synthetic?.sourceRegistry).toEqual({
      protocol: 'http:',
      hostname: '127.0.0.1',
      port: '3000',
      pathname: '/demo/extension-fixture/source',
      allowedSearches: [''],
    });
    expect(production?.sourceRegistry).toEqual({
      protocol: 'https:',
      hostname: 'challansakshi.sh1rs.com',
      port: '',
      pathname: '/review',
      allowedSearches: ['', '?goal=verify', '?goal=understand', '?goal=evidence', '?goal=resolve'],
    });
    expect(synthetic?.adapterRegistry).toEqual([{
      id: 'synthetic-fixture',
      routeKey: 'synthetic-fixture',
      releaseState: 'synthetic',
      enabled: true,
      supportedFields: ['category', 'description'],
      destination: {
        protocol: 'http:',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/demo/extension-fixture/destination',
      },
    }]);
    expect(production?.adapterRegistry).toEqual([
      {
        id: 'legacy-national-grievance',
        routeKey: 'legacy',
        releaseState: 'internal-disabled',
        enabled: false,
        supportedFields: [],
        reason: 'verification-evidence-missing',
        destination: {
          protocol: 'https:',
          hostname: 'echallan.parivahan.gov.in',
          port: '',
          pathname: '/gsticket',
        },
      },
      {
        id: 'nextgen-national-grievance',
        routeKey: 'nextgen',
        releaseState: 'internal-disabled',
        enabled: false,
        supportedFields: [],
        reason: 'verification-evidence-missing',
        destination: {
          protocol: 'https:',
          hostname: 'echallan.parivahan.nic.in',
          port: '',
          pathname: '/grievance',
        },
      },
    ]);

    for (const invalid of [undefined, null, '', 'all', 'production-candidate', {}, { id: 'synthetic-development' }]) {
      expect(getExtensionBuildProfile(invalid)).toBeNull();
    }
    expect(synthetic).not.toBe(production);
    expect(Object.isFrozen(synthetic)).toBe(true);
    expect(Object.isFrozen(production)).toBe(true);
  });

  it('binds the shared envelope validator to the selected profile mode', () => {
    const nowMs = Date.UTC(2026, 8, 3, 8, 0, 0);
    const common = {
      schema: 'challansakshi.extension-handoff/v1',
      packId: '00112233445566778899aabbccddeeff',
      resultRevisionId: '11112222333344445555666677778888',
      packRevisionId: '9999aaaabbbbccccddddeeeeffff0000',
      routeRegistryVersion: 'challansakshi.official-routes/v1',
      adapterContractVersion: 'challansakshi.adapter-contract/v1',
      description: 'Please review the fictional vehicle-class mismatch.',
      descriptionDigest: '2904ce189e9e2a9e7f7d59ef19b3ae9298caaff1e5158927e602029ce9f06763',
      language: 'en',
      simpleMode: false,
      confirmed: true,
      deviceMode: 'private',
      issuedAt: '2026-09-03T08:00:00.000Z',
      expiresAt: '2026-09-03T08:10:00.000Z',
    } as const;
    const syntheticEnvelope = {
      ...common,
      mode: 'synthetic',
      routeKey: 'synthetic-fixture',
      issueCode: 'four-wheeler-on-two-wheeler',
    };
    const realEnvelope = {
      ...common,
      mode: 'real',
      routeKey: 'nextgen',
      issueCode: null,
    };

    expect(validateEnvelopeForBuildProfile('synthetic-development', realEnvelope, nowMs, nowMs)).toEqual({
      status: 'rejected',
      reason: 'profile-mismatch',
    });
    expect(validateEnvelopeForBuildProfile('production-disabled', syntheticEnvelope, nowMs, nowMs)).toEqual({
      status: 'rejected',
      reason: 'profile-mismatch',
    });
    expect(validateEnvelopeForBuildProfile('synthetic-development', syntheticEnvelope, nowMs, nowMs).status).toBe('accepted');
    expect(validateEnvelopeForBuildProfile('production-disabled', realEnvelope, nowMs, nowMs).status).toBe('accepted');
    expect(validateEnvelopeForBuildProfile('all', syntheticEnvelope, nowMs, nowMs)).toEqual({
      status: 'rejected',
      reason: 'invalid-build-profile',
    });
  });
});

describe('exact generated manifest', () => {
  it('emits the complete least-authority manifest from the closed profile', () => {
    for (const profileId of EXTENSION_BUILD_PROFILE_IDS) {
      const profile = getExtensionBuildProfile(profileId);
      expect(profile).not.toBeNull();
      const manifest = buildManifest(profile);
      expect(manifest).toEqual(exactManifest(profile?.packageName ?? ''));
      expect(Object.keys(manifest)).toEqual([
        'manifest_version',
        'name',
        'version',
        'description',
        'minimum_chrome_version',
        'icons',
        'action',
        'background',
        'permissions',
        'incognito',
        'content_security_policy',
      ]);
      expect(manifest.permissions).not.toContain('tabs');
      expect(manifest.permissions).not.toContain('clipboardRead');
      expect(manifest.permissions).not.toContain('clipboardWrite');
      for (const key of forbiddenManifestKeys) expect(manifest).not.toHaveProperty(key);
    }
  });

  it('rejects forged, incomplete, accessor-backed, and extra-key profile inputs', () => {
    const synthetic = getExtensionBuildProfile('synthetic-development');
    expect(synthetic).not.toBeNull();
    expect(() => buildManifest(null)).toThrow('Invalid extension build profile.');
    expect(() => buildManifest({ ...synthetic, minimumChromeVersion: '151' })).toThrow('Invalid extension build profile.');
    expect(() => buildManifest({ ...synthetic, runtimeProfile: 'production-disabled' })).toThrow('Invalid extension build profile.');

    const accessor = Object.fromEntries(Object.entries(synthetic ?? {}));
    Object.defineProperty(accessor, 'id', { enumerable: true, get: () => 'synthetic-development' });
    expect(() => buildManifest(accessor)).toThrow('Invalid extension build profile.');
  });
});

describe('canonical extension identity assets', () => {
  it('keeps the canonical inert SVG bytes and deterministic sharp PNG fixtures', async () => {
    expect(sharp.versions.sharp).toBe('0.34.5');
    const favicon = readFileSync(resolve(extensionRoot, 'public/favicon.svg'));
    expect(sha256(favicon)).toBe('6f4d7c5e4eb17909bc8f9fb18f73e68e3120f082b3bed46bbf77ab4bdde0e7a1');
    const svgText = favicon.toString('utf8');
    expect(svgText).not.toMatch(/<script|<image|\bhref\s*=|@font-face|\burl\s*\(|\bdata:/iu);

    execFileSync(nodeExecutable, [resolve(extensionRoot, 'scripts/generate-icons.mjs')], {
      cwd: repositoryRoot,
      stdio: 'pipe',
    });
    const expected = new Map([
      [16, 'fc3770facd8c17e12e77c5233a3e8bf979176258280f9947c0fc0ac524d87690'],
      [32, '2217c35895f334fcf7765b7b05a0910fad1f9b114c0472f976a4c4ec3cd0287c'],
      [48, '40f0214e8effdc65dc81351d4c4d8a1b8c20d2406803e86a86c8b2dec3a54cb0'],
      [128, '477490f1e21d5ad74b4af6bf3e20e49e1b6f9009db88fef409a28b683521b6ed'],
    ]);
    for (const [size, digest] of expected) {
      const filename = resolve(extensionRoot, `public/icons/icon-${size}.png`);
      const bytes = readFileSync(filename);
      const metadata = await sharp(bytes).metadata();
      const stats = statSync(filename);
      expect(sha256(bytes)).toBe(digest);
      expect(metadata).toMatchObject({ format: 'png', width: size, height: size });
      expect(stats.size).toBeGreaterThan(100);
    }
  });
});

describe('isolated profile build script', () => {
  it('exposes the fixed root commands without adding synthetic output to build:all', () => {
    const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts).toMatchObject({
      'extension:typecheck': 'tsc -p extension/tsconfig.json --noEmit',
      'extension:test': 'vitest run --config extension/vitest.config.ts',
      'extension:build:synthetic': 'node extension/scripts/build.mjs synthetic-development',
      'extension:build:production-disabled': 'node extension/scripts/build.mjs production-disabled',
      'extension:browser': 'playwright test --config extension/playwright.config.ts --project=loaded-package-standalone',
      'extension:browser:strict': 'playwright test --config extension/playwright.config.ts --project=loaded-package-chromium-152-required',
      'extension:scan': 'node extension/scripts/package.mjs scan',
      'extension:package': 'node extension/scripts/package.mjs package',
      'build:all': 'vinext build && node extension/scripts/build.mjs production-disabled',
    });
    expect(packageJson.scripts['extension:verify']).toBe(
      'tsc -p extension/tsconfig.json --noEmit && vitest run --config extension/vitest.config.ts && node extension/scripts/build.mjs synthetic-development && node extension/scripts/build.mjs production-disabled && node extension/scripts/package.mjs scan && playwright test --config extension/playwright.config.ts --project=loaded-package-chromium-152-required',
    );
    expect(packageJson.scripts['build:all']).not.toContain('synthetic');
  });

  it('rejects missing, extra, unknown, and aggregate profile arguments', () => {
    for (const args of [[], ['all'], ['unknown'], ['synthetic-development', 'production-disabled']]) {
      const result = runBuild(...args);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('Expected exactly one build profile: synthetic-development or production-disabled.');
    }
  });

  it('emits only the exact stable regular-file leaf set for each selected profile', () => {
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

    let syntheticDigests: Record<string, string> | null = null;
    for (const profileId of EXTENSION_BUILD_PROFILE_IDS) {
      const result = runBuild(profileId);
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      const output = resolve(extensionRoot, 'dist', profileId);
      expect(regularFileLeaves(output)).toEqual(expectedLeaves);
      expect(JSON.parse(readFileSync(resolve(output, 'manifest.json'), 'utf8'))).toEqual(
        exactManifest(getExtensionBuildProfile(profileId)?.packageName ?? ''),
      );
      expect(readFileSync(resolve(output, 'favicon.svg'))).toEqual(
        readFileSync(resolve(extensionRoot, 'public/favicon.svg')),
      );
      if (profileId === 'synthetic-development') syntheticDigests = fileDigests(output);
      if (profileId === 'production-disabled') {
        expect(fileDigests(resolve(extensionRoot, 'dist/synthetic-development'))).toEqual(syntheticDigests);
      }
    }

    const syntheticArtifact = regularFileLeaves(resolve(extensionRoot, 'dist/synthetic-development'))
      .filter((leaf) => !leaf.endsWith('.png'))
      .map((leaf) => readFileSync(resolve(extensionRoot, 'dist/synthetic-development', leaf), 'utf8'))
      .join('\n');
    const productionArtifact = regularFileLeaves(resolve(extensionRoot, 'dist/production-disabled'))
      .filter((leaf) => !leaf.endsWith('.png'))
      .map((leaf) => readFileSync(resolve(extensionRoot, 'dist/production-disabled', leaf), 'utf8'))
      .join('\n');
    expect(syntheticArtifact).toContain('127.0.0.1');
    expect(syntheticArtifact).toContain('synthetic-fixture');
    expect(syntheticArtifact).not.toContain('challansakshi.sh1rs.com');
    expect(syntheticArtifact).not.toContain('echallan.parivahan.gov.in');
    expect(productionArtifact).toContain('challansakshi.sh1rs.com');
    expect(productionArtifact).toContain('echallan.parivahan.gov.in');
    expect(productionArtifact).toContain('internal-disabled');
    expect(productionArtifact).not.toContain('127.0.0.1');
    expect(productionArtifact).not.toContain('synthetic-fixture');
  });
});
