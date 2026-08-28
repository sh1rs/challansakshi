import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tollSource = readFileSync(
  new URL('../components/public-beta/TollSakshiApp.tsx', import.meta.url),
  'utf8',
);

describe('TollSakshi official route links', () => {
  it('uses the canonical IHMCL 1033 destination as a protected external link', () => {
    expect(tollSource).toContain(
      '<a href="https://ihmcl.co.in/24x7-national-highways-helpline-1033-page/" target="_blank" rel="noreferrer">',
    );
    expect(tollSource).not.toContain(
      '<a href="https://ihmcl.co.in/24x7-national-highways-helpline-1033/"',
    );
  });
});
