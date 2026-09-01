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

  it('keeps every canonical FASTag destination unchanged', () => {
    expect(tollSource).toContain('<a href="https://fastag.ihmcl.com" target="_blank" rel="noreferrer">');
    expect(tollSource).toContain('<a href="https://www.npci.org.in/product/netc/netc-fastag-helpline" target="_blank" rel="noreferrer">');
    expect(tollSource).toContain('<a href="https://www.npci.org.in/circulars/netc" target="_blank" rel="noreferrer">');
  });

  it('shows relevant comparison rows before the optional full check map', () => {
    const reconcile = tollSource.slice(tollSource.indexOf("{step === 'reconcile' &&"));
    const visibleMap = reconcile.indexOf('visibleMapRows.map');
    const allChecks = reconcile.indexOf('Show all checks');

    expect(visibleMap).toBeGreaterThanOrEqual(0);
    expect(allChecks).toBeGreaterThan(visibleMap);
    expect(reconcile.slice(allChecks)).toContain('mapRows.map');
  });

  it('orders the FASTag packet route first and audit detail last', () => {
    const packet = tollSource.slice(tollSource.indexOf("{step === 'packet' &&"));
    const route = packet.indexOf('{displayedRoute}');
    const noteStatus = packet.indexOf('Preparation note');
    const unresolved = packet.indexOf('Unresolved evidence');
    const passport = packet.indexOf('View all 14 evidence checks');
    const tracking = packet.indexOf('Tracking detail');
    const notePreview = packet.indexOf('View preparation note');
    const secondarySources = packet.indexOf('Other official sources');

    expect(route).toBeGreaterThanOrEqual(0);
    expect(noteStatus).toBeGreaterThan(route);
    expect(unresolved).toBeGreaterThan(noteStatus);
    expect(passport).toBeGreaterThan(unresolved);
    expect(tracking).toBeGreaterThan(passport);
    expect(notePreview).toBeGreaterThan(tracking);
    expect(secondarySources).toBeGreaterThan(notePreview);
  });

  it('keeps note export controls outside the optional plaintext preview', () => {
    const packet = tollSource.slice(tollSource.indexOf("{step === 'packet' &&"));
    const copy = packet.indexOf('Copy note');
    const download = packet.indexOf('Download .txt');
    const preview = packet.indexOf('View preparation note');

    expect(copy).toBeGreaterThanOrEqual(0);
    expect(download).toBeGreaterThan(copy);
    expect(preview).toBeGreaterThan(download);
    expect(packet.slice(preview)).toContain('<pre>{worksheet}</pre>');
  });
});
