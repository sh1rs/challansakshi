import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import MobilityWorkspace from '../components/mobility/MobilityWorkspace';

// This private editor dependency uses the application's path alias, which the
// node-only test runner does not resolve. It must never render in public SSR.
vi.mock('../components/mobility/EffortPanel', () => ({
  default: () => { throw new Error('Private editing panels must not render during public SSR'); },
}));

describe('mobility public first load', () => {
  it('renders useful preparation guidance and native task links without reading a saved case', () => {
    const html = renderToStaticMarkup(createElement(MobilityWorkspace, { initialCaseId: 'private-case-do-not-render' }));
    const main = new JSDOM(html).window.document.querySelector('main')!;
    expect(main.textContent).toContain('driving-licence applications and renewals');
    expect(main.textContent).toContain('vehicle ownership transfers');
    expect(main.textContent).toContain('No account is required');
    expect(main.textContent).toContain('only after you choose to save them');
    expect([...main.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(['/review', '/fastag', '/message-check', '/sources']);
    expect(main.querySelectorAll('h1')).toHaveLength(1);
    expect(main.querySelector('[aria-busy="true"]')).toBeNull();
    expect(main.querySelector('noscript')?.textContent).toContain('JavaScript');
    expect(main.querySelector('input, textarea, select, button')).toBeNull();
    expect(html).not.toContain('private-case-do-not-render');
  });

  it('provides the same public destinations and privacy explanation in Hindi', () => {
    const html = renderToStaticMarkup(createElement(MobilityWorkspace, { language: 'hi' }));
    const main = new JSDOM(html).window.document.querySelector('main')!;
    expect(main.textContent).toContain('ड्राइविंग लाइसेंस');
    expect(main.textContent).toContain('खाते की ज़रूरत नहीं');
    expect([...main.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(['/review', '/fastag', '/message-check', '/sources']);
  });
});
