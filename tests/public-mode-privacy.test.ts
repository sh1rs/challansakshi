import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// These home/review/toll route modules are the complete real-mode boundary. Following every
// relative import/export keeps the audit current when a route gains a new local dependency.
const publicModeEntryPoints = [
  'app/page.tsx',
  'app/review/page.tsx',
  'app/fastag/page.tsx',
  'app/manual/challan/page.tsx',
  'app/toll/page.tsx',
] as const;
const localModulePattern = /(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g;

function workspacePath(absolutePath: string) {
  return relative(process.cwd(), absolutePath).split(sep).join('/');
}

function resolveLocalModule(importerPath: string, specifier: string) {
  const base = resolve(process.cwd(), dirname(importerPath), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, `${base}.css`, join(base, 'index.ts'), join(base, 'index.tsx')];
  return candidates.find((candidate) => existsSync(candidate));
}

function collectPublicModeFiles() {
  const pending: string[] = [...publicModeEntryPoints];
  const sources = new Map<string, string>();
  while (pending.length) {
    const path = pending.pop();
    if (!path || sources.has(path)) continue;
    const source = readFileSync(join(process.cwd(), path), 'utf8');
    sources.set(path, source);
    for (const match of source.matchAll(localModulePattern)) {
      const resolved = resolveLocalModule(path, match[1]);
      if (!resolved) throw new Error(`Unresolved local import ${match[1]} from ${path}`);
      pending.push(workspacePath(resolved));
    }
  }
  return [...sources].map(([path, source]) => ({ path, source }));
}

const publicModeFiles = collectPublicModeFiles();

describe('real-mode privacy isolation', () => {
  it('covers both real routes, compatibility aliases, components, and transitive local modules', () => {
    const inventoriedPaths = new Set(publicModeFiles.map(({ path }) => path));
    for (const requiredPath of [
      'app/review/page.tsx',
      'app/fastag/page.tsx',
      'app/manual/challan/page.tsx',
      'app/toll/page.tsx',
      'components/guided/GuidedStepHeader.tsx',
      'lib/citizen-home.ts',
      'lib/citizen-review-presentation.ts',
      'lib/domain.ts',
      'lib/guided-journey.ts',
      'lib/shared-device-inactivity.ts',
      'lib/toll-fixtures.ts',
    ]) {
      expect(inventoriedPaths.has(requiredPath), requiredPath).toBe(true);
    }
  });

  it('contains no network-send, persistence, analyze, raw paste, or unsafe HTML surface', () => {
    for (const { path, source } of publicModeFiles) {
      expect(source, path).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket\s*\(|EventSource\s*\(/);
      expect(source, path).not.toMatch(/localStorage\.|sessionStorage\.|document\.cookie|indexedDB|caches\.|serviceWorker/);
      expect(source, path).not.toMatch(/dangerouslySetInnerHTML|\/api\/analyze|navigator\.sendBeacon/);
      expect(source, path).not.toMatch(/contenteditable|contentEditable/);
      const textareas = source.match(/<textarea\b/g) ?? [];
      expect(textareas, path).toHaveLength(path === 'components/public-beta/OfficialHandoffPanel.tsx' ? 1 : 0);
    }
  });

  it('keeps raw selected filenames out of the complete real-mode graph', () => {
    for (const { path, source } of publicModeFiles) {
      expect(source, path).not.toMatch(/\b(?:file|selectedFile|recordSelection)\.name\b/);
      expect(source, path).not.toMatch(/recordSelection\.(?:meta\.)?(?:name|filename)|selectedFileName|rawFilename/);
    }
  });

  it('keeps case and identifier state out of URL, query, and browser history writes', () => {
    for (const { path, source } of publicModeFiles) {
      expect(source, path).not.toMatch(/history\.(?:pushState|replaceState)\s*\(|router\.(?:push|replace)\s*\(/);
      expect(source, path).not.toMatch(/(?:window\.)?location\.(?:search|hash|href)\s*=|window\.location\s*=/);
      expect(source, path).not.toMatch(/[?&](?:challan|vehicle|registration|plate|phone|email|case|notice|account|transaction|amount)=/i);
      for (const match of source.matchAll(/window\.location\.replace\(([^)]+)\)/g)) {
        expect(match[1].trim(), path).toBe("'/'");
      }
    }

    const queryReaders = publicModeFiles.filter(({ source }) => source.includes('URLSearchParams'));
    expect(queryReaders).toEqual([]);
    const reviewRoute = publicModeFiles.find(({ path }) => path === 'app/review/page.tsx')!.source;
    expect(reviewRoute).toContain('parseCitizenGoalValue(query.goal)');
    const queryKeys = publicModeFiles.flatMap(({ source }) => (
      [...source.matchAll(/[?&]([a-zA-Z0-9_-]+)=/g)].map((match) => match[1])
    ));
    expect(new Set(queryKeys)).toEqual(new Set(['goal']));
  });

  it('allows the native file input only inside controlled LocalRecordIntake', () => {
    for (const { path, source } of publicModeFiles) {
      if (path === 'components/public-beta/LocalRecordIntake.tsx') {
        expect(source, path).toMatch(/type=["']file["']/);
      } else {
        expect(source, path).not.toMatch(/type=["']file["']/);
      }
    }
  });

  it('allows object URLs only for controlled previews and existing local artifact downloads', () => {
    const allowed = new Set([
      'components/public-beta/CitizenReviewApp.tsx',
      'components/public-beta/LocalRecordIntake.tsx',
      'components/public-beta/TollSakshiApp.tsx',
    ]);
    for (const { path, source } of publicModeFiles) {
      if (!allowed.has(path)) expect(source, path).not.toMatch(/URL\.(?:create|revoke)ObjectURL/);
    }

    const intake = publicModeFiles.find((file) => file.path === 'components/public-beta/LocalRecordIntake.tsx')?.source ?? '';
    const citizen = publicModeFiles.find((file) => file.path === 'components/public-beta/CitizenReviewApp.tsx')?.source ?? '';
    const toll = publicModeFiles.find((file) => file.path === 'components/public-beta/TollSakshiApp.tsx')?.source ?? '';

    // Intake URLs preview a user-selected file. The two app URLs wrap generated
    // local text artifacts; none transmits or persists the selected file.
    expect(intake).toMatch(/URL\.createObjectURL\(file\)/);
    expect(citizen).toMatch(/new Blob\(\[summary\]/);
    expect(toll).toMatch(/new Blob\(\[worksheet\]/);
    expect(`${citizen}\n${intake}\n${toll}`).not.toMatch(/fetch\s*\([^)]*blob:|sendBeacon\s*\([^)]*blob:/);
  });

  it('uses no HTML form that could fall back to a URL or server submission', () => {
    for (const { path, source } of publicModeFiles) expect(source, path).not.toMatch(/<form\b/);
  });

  it('keeps the no-inspection boundary in both citizen artifacts', () => {
    expect(publicModeFiles.find((file) => file.path === 'lib/public-challan.ts')?.source).toContain('Based only on your answers. ChallanSakshi did not inspect');
    expect(publicModeFiles.find((file) => file.path === 'lib/toll-domain.ts')?.source).toContain('Based only on your answers. TollSakshi did not inspect');
  });

  it('does not ask for prohibited credentials or full financial identifiers', () => {
    const inputs = publicModeFiles.filter((file) => file.path.includes('App.tsx')).map((file) => file.source.match(/<input\b[^>]*>/g) ?? []).flat().join('\n');
    expect(inputs).not.toMatch(/otp|password|cvv|upi|aadhaar|account/i);
    expect(inputs).not.toMatch(/name=["'](?:name|phone|email|address|aadhaar|password)/i);
  });

  it('keeps the translated e-Challan flow bilingual while FASTag remains English-only', () => {
    const citizenApp = publicModeFiles.find((file) => file.path === 'components/public-beta/CitizenReviewApp.tsx')?.source;
    const tollApp = publicModeFiles.find((file) => file.path === 'components/public-beta/TollSakshiApp.tsx')?.source;
    expect(citizenApp, 'components/public-beta/CitizenReviewApp.tsx').not.toMatch(/<PublicBetaShell[^>]*englishOnly/);
    expect(tollApp, 'components/public-beta/TollSakshiApp.tsx').toMatch(/<PublicBetaShell[^>]*englishOnly/);
  });

  it('keeps FASTag manual entry compact now that the product boundary copy lives in the shared footer', () => {
    const tollApp = publicModeFiles.find((file) => file.path === 'components/public-beta/TollSakshiApp.tsx')?.source ?? '';

    expect(tollApp).not.toMatch(/\{step === 'start' && <section className=\{`\$\{styles\.hero\}/);
    expect(tollApp).not.toContain('TollSafetyBoundary');
    expect(tollApp).not.toContain('<SafetyBoundary');
    expect(tollApp).not.toContain('Opening a PDF creates another browser-local tab');
    expect(tollApp).toContain('Issue and source');
    expect(tollApp).toContain('Transaction details');
    expect(tollApp).toContain('Passing image');
    expect(tollApp).toContain('Extra check for this issue');
    expect(tollApp).toContain('Confirm one transaction');
    expect(tollApp).toMatch(/const showExtraCheck\s*=\s*\[[^\]]+\]\.includes\(answers\.concern\)/);
    expect(tollApp).toMatch(/\{showExtraCheck && <details[\s\S]*?Extra check for this issue/);
    expect(tollApp).toContain('<span>{showExtraCheck ? 5 : 4}</span>');
    expect(tollApp).not.toContain('<span>5</span><div><strong id="record-confirm-title"');
  });

  it('reopens the native disclosure that contains each transaction validation error', () => {
    const tollApp = publicModeFiles.find((file) => file.path === 'components/public-beta/TollSakshiApp.tsx')?.source ?? '';
    const helper = tollApp.match(/const showRecordError[\s\S]*?\n\s*};/)?.[0] ?? '';

    expect(helper).toMatch(/recordGroupRefs\.current\[group\]\?\.setAttribute\('open', ''\)/);
    expect(helper).toMatch(/setError\(message\)/);
    expect(tollApp).toContain("showRecordError('transaction'");
    expect(tollApp).toContain("showRecordError('issue'");
    expect(tollApp).toContain("showRecordError('confirm'");
  });
});
