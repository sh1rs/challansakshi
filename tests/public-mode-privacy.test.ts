import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicModeFiles = [
  'components/public-beta/CitizenReviewApp.tsx',
  'components/public-beta/TollSakshiApp.tsx',
  'components/public-beta/PublicBetaShell.tsx',
  'lib/public-challan.ts',
  'lib/toll-domain.ts',
].map((path) => ({ path, source: readFileSync(join(process.cwd(), path), 'utf8') }));

describe('real-mode privacy isolation', () => {
  it('contains no client storage, document upload, raw paste, or network-send surface', () => {
    for (const { path, source } of publicModeFiles) {
      expect(source, path).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage\.|sessionStorage\.|document\.cookie/);
      expect(source, path).not.toMatch(/type=["']file["']|<textarea|dangerouslySetInnerHTML|\/api\/analyze/);
    }
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
});
