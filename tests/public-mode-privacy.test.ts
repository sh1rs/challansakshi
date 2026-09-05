import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMobilityTask, encodeTaskStore } from '../lib/mobility-tasks';
import { createTaskCalendar, parseTaskBackup } from '../lib/mobility-continuity';

// Public citizen journeys, including explicitly opted-in checklist storage. Following every
// relative import/export keeps the audit current when a route gains a new local dependency.
const publicModeEntryPoints = [
  'app/page.tsx',
  'app/review/page.tsx',
  'app/fastag/page.tsx',
  'app/manual/challan/page.tsx',
  'app/toll/page.tsx',
  'app/dashboard/page.tsx',
  'app/message-check/page.tsx',
  'app/reply-review/page.tsx',
  'app/sources/page.tsx',
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
      'components/public-beta/CitizenDocumentReview.tsx',
      'lib/local-document-reader.ts',
      'lib/document-evidence.ts',
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
      if (path !== 'components/public-beta/MobilityDashboard.tsx') expect(source, path).not.toMatch(/localStorage\.|sessionStorage\.|document\.cookie|indexedDB|caches\.|serviceWorker/);
      else expect(source, path).not.toMatch(/sessionStorage\.|document\.cookie|indexedDB|caches\.|serviceWorker/);
      expect(source, path).not.toMatch(/dangerouslySetInnerHTML|\/api\/analyze|navigator\.sendBeacon/);
      expect(source, path).not.toMatch(/contenteditable|contentEditable/);
      const textareas = source.match(/<textarea\b/g) ?? [];
      const count = ({ 'components/public-beta/OfficialHandoffPanel.tsx': 1, 'components/public-beta/MessageSafetyCheck.tsx': 1, 'components/public-beta/ReplyReview.tsx': 2 } as Record<string, number>)[path] ?? 0;
      expect(textareas, path).toHaveLength(count);
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

  it('allows native file inputs only inside controlled local intake, photo and checklist components', () => {
    for (const { path, source } of publicModeFiles) {
      if (path === 'components/public-beta/LocalRecordIntake.tsx' || path === 'components/public-beta/CitizenDocumentReview.tsx' || path === 'components/public-beta/EvidencePhotoWorkspace.tsx' || path === 'components/public-beta/MobilityDashboard.tsx') {
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
      'components/public-beta/CitizenDocumentReview.tsx',
      'components/public-beta/EvidencePhotoWorkspace.tsx',
      'components/public-beta/ReplyReview.tsx',
      'components/public-beta/MobilityDashboard.tsx',
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

  it('checklist exports exclude private records and restore rejects unrecognized private fields', () => {
    const now = '2026-09-05T10:00:00.000Z';
    const task = { ...createMobilityTask({ kind: 'challan', followUpDate: '2026-09-06' }, now, 'task-one'), plate: 'KA01ZZ1234', reply: 'PRIVATE_REPLY_SENTINEL', document: 'PRIVATE_DOCUMENT_SENTINEL' };
    const backup = encodeTaskStore([task], now);
    const calendar = createTaskCalendar(task, now, 'en');
    expect(`${backup}\n${calendar}`).not.toMatch(/KA01ZZ1234|PRIVATE_REPLY_SENTINEL|PRIVATE_DOCUMENT_SENTINEL/);
    expect(Object.keys(JSON.parse(backup).tasks[0]).sort()).toEqual(['createdAt', 'followUpDate', 'id', 'kind', 'status', 'updatedAt']);
    expect(parseTaskBackup(JSON.stringify({ version: 1, savedAt: now, tasks: [task] }), now)).toBeNull();
  });

  it('uses no HTML form that could fall back to a URL or server submission', () => {
    for (const { path, source } of publicModeFiles) {
      if (path !== 'components/public-beta/MobilityDashboard.tsx') expect(source, path).not.toMatch(/<form\b/);
      else { expect(source).toContain('event.preventDefault()'); expect(source).not.toMatch(/<(?:input|select|textarea)[^>]*\bname=/); }
    }
  });

  it('loads OCR locally with persistence off and versioned same-origin workers', () => {
    const reader = publicModeFiles.find(file => file.path === 'lib/local-document-reader.ts')!.source;
    expect(reader).toContain("cacheMethod: 'none'");
    expect(reader).toContain('workerBlobURL: false');
    expect(reader).toContain('window.location.origin');
    expect(reader).toContain('/document-assets/tesseract-7.0.0');
    expect(reader).toContain('/document-assets/pdfjs-6.3.289');
    expect(reader).not.toMatch(/https?:\/\//);
    expect(reader).toContain('options.signal');
    expect(reader).toContain('.terminate()');
    expect(reader).toContain('disableAutoFetch: true');
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

  it('offers Hindi in real reviews while preserving the English-only FASTag synthetic examples', () => {
    const citizenApp = publicModeFiles.find((file) => file.path === 'components/public-beta/CitizenReviewApp.tsx')?.source;
    const tollApp = publicModeFiles.find((file) => file.path === 'components/public-beta/TollSakshiApp.tsx')?.source;
    expect(citizenApp, 'components/public-beta/CitizenReviewApp.tsx').not.toMatch(/<PublicBetaShell[^>]*englishOnly/);
    expect(tollApp, 'components/public-beta/TollSakshiApp.tsx').toMatch(/<PublicBetaShell[^>]*englishOnly=\{synthetic\}/);
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
