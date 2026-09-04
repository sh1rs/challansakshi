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

  it('uses the route-aware reconcile CTA instead of a fixed official-route promise', () => {
    const reconcile = tollSource.slice(
      tollSource.indexOf("{step === 'reconcile' &&"),
      tollSource.indexOf("{step === 'packet' &&"),
    );

    expect(reconcile).toContain('guide.ctaLabel');
    expect(reconcile).toContain("isNoDisputeOutcome ? 'परिणाम और सबूत सूची देखें'");
    expect(reconcile).not.toContain("t(language, 'Check evidence and official route', 'सबूत और आधिकारिक रास्ता देखें')");
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

  it('keeps no-dispute outcomes terminal while retaining the optional evidence passport', () => {
    const packet = tollSource.slice(tollSource.indexOf("{step === 'packet' &&"));
    const terminalOutcome = packet.indexOf('{isNoDisputeOutcome ?');
    const officialRoute = packet.indexOf('Primary official route');
    const passport = packet.indexOf('View all 14 evidence checks');

    expect(tollSource).toContain("const isNoDisputeOutcome = assessment.route === 'no-dispute';");
    expect(terminalOutcome).toBeGreaterThanOrEqual(0);
    expect(packet.slice(terminalOutcome, officialRoute)).toContain("assessment.finding === 'already-corrected'");
    expect(packet.slice(terminalOutcome, officialRoute)).toContain('A corresponding credit is already visible');
    expect(packet.slice(terminalOutcome, officialRoute)).toContain('The entered records appear consistent');
    expect(packet.slice(terminalOutcome, officialRoute)).toContain('No issuer dispute note prepared');
    expect(packet.slice(terminalOutcome, officialRoute)).not.toMatch(/primary official route|open the destination|preparation note|unresolved evidence/i);
    expect(officialRoute).toBeGreaterThan(terminalOutcome);
    expect(passport).toBeGreaterThan(officialRoute);
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

  it('opens the start step without hero chrome, boundary asides, or consent gates', () => {
    expect(tollSource).not.toContain('styles.hero');
    expect(tollSource).not.toContain('TollSafetyBoundary');
    expect(tollSource).not.toContain('consent.manual');
    expect(tollSource).not.toContain('consent.minimum');
    expect(tollSource).toContain("useState<Device>('private')");
    expect(tollSource).toContain("setDevice(event.target.checked ? 'shared' : 'private')");
    expect(tollSource).toContain('This is a shared or public device');
    expect(tollSource).toMatch(/device === 'shared' && <p className=\{styles\.restricted\}>/);
    expect(tollSource).toContain('copy and download stay disabled');
    expect(tollSource).toContain('A UPI PIN sends money; it is never needed to receive a refund.');
    expect(tollSource.indexOf('A UPI PIN sends money')).toBeLessThan(tollSource.indexOf('styles.sourceGrid'));
    expect(tollSource).toContain('{mode === \'synthetic\' && <p className={styles.restricted} role="status"><strong>SYNTHETIC FIXTURE — NOT A REAL TRANSACTION.</strong>');
  });

  it('keeps the anti-scam line beside the official route links and the IHMCL FAQ labelling', () => {
    const packet = tollSource.slice(tollSource.indexOf("{step === 'packet' &&"));
    const antiScam = packet.indexOf('Do not use a phone number or link copied from the debit message.');
    const routeLinks = packet.indexOf('<div className={styles.sourceGrid}>');

    expect(antiScam).toBeGreaterThanOrEqual(0);
    expect(routeLinks).toBeGreaterThan(antiScam);
    expect(packet).toContain('IHMCL’s FASTag FAQ currently says to report an incorrect deduction within 40 days of the transaction date');
    expect(packet).toContain('chargeback process normally takes up to 20–30 working days');
  });

  it('moves focus to the changed step heading without an animated jump and lands on the erroring record group', () => {
    expect(tollSource).toContain('heading.focus({ preventScroll: true });');
    expect(tollSource).toContain("(heading.closest('section') ?? heading).scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });");
    expect(tollSource).toContain("recordGroupRefs.current[group]?.querySelector('summary')?.focus();");
  });
});
