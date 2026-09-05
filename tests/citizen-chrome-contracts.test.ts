// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { CitizenFooter, CitizenHeader } from '../components/shared/CitizenChrome';

const roots: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
});

function mountHeader(props: Partial<Parameters<typeof CitizenHeader>[0]> = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(createElement(CitizenHeader, { language: 'en', setLanguage: () => undefined, ...props })));
  return host;
}

describe('citizen chrome contracts', () => {
  it('uses one boundary paragraph followed by one Safety & privacy link', () => {
    const html = renderToStaticMarkup(createElement(CitizenFooter, { language: 'en' }));
    const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)];
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0][1].replace(/<[^>]+>/g, '')).toBe('Independent—not a government service. Documents are read on this device unless you choose cloud analysis for selected files. Nothing is filed, paid or submitted for you. No legal advice or guaranteed outcome.');
    expect(links.map((match) => [match[1], match[2]])).toEqual([['/safety', 'Safety &amp; privacy']]);
  });

  it('renders a faithful standalone Hindi boundary', () => {
    const html = renderToStaticMarkup(createElement(CitizenFooter, { language: 'hi' }));
    expect(html).toContain('स्वतंत्र—यह सरकारी सेवा नहीं है।');
    expect(html).toContain('जब तक आप चुनी फ़ाइलों के लिए क्लाउड विश्लेषण नहीं चुनते, दस्तावेज़ इसी डिवाइस पर पढ़े जाते हैं।');
    expect(html).toContain('आपके लिए कुछ भी फाइल, भुगतान या जमा नहीं किया जाता।');
    expect(html).toContain('कानूनी सलाह या नतीजे की गारंटी नहीं।');
    expect(html).not.toContain('Independent—not');
  });

  it('opens an accessible Menu and closes it with Escape while returning focus', () => {
    const host = mountHeader();
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-controls="citizen-navigation-menu"]');
    expect(trigger?.textContent).toBe('Menu');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    act(() => trigger?.click());
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    const menu = host.querySelector<HTMLElement>('#citizen-navigation-menu');
    expect(menu?.hidden).toBe(false);
    expect([...menu!.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual(['/', '/review', '/fastag', '/safety']);
    expect(menu?.querySelector('[role="group"][aria-label="Language"]')).not.toBeNull();
    expect(menu?.textContent).toContain('Dark mode');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Quick Exit outside Menu and ordinary utilities inside it', () => {
    const host = mountHeader({
      quickExit: createElement('button', { type: 'button', 'aria-label': 'Quick exit and clear this review' }, 'Exit'),
      utilities: createElement('button', { type: 'button' }, 'Reading preference'),
    });
    const header = host.querySelector('header')!;
    const menu = host.querySelector('#citizen-navigation-menu')!;
    expect(header.querySelector(':scope > [data-quick-exit]')?.textContent).toBe('Exit');
    expect(menu.textContent).toContain('Reading preference');
    expect(menu.textContent).not.toContain('Exit');
  });

  it('allows language selection directly from the closed header menu', () => {
    let selected = 'en';
    const host = mountHeader({ setLanguage: (language) => { selected = language; } });
    const selector = host.querySelector('select');
    expect(selector).not.toBeNull();
    expect(selector?.closest('#citizen-navigation-menu')).toBeNull();
    expect([...selector!.options].map((option) => [option.value, option.textContent])).toEqual([['en', 'EN'], ['hi', 'हिं']]);
    act(() => {
      selector!.value = 'hi';
      selector!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(selected).toBe('hi');
  });

  it('states FASTag English availability once inside Menu', () => {
    const host = mountHeader({ englishOnly: true });
    const menu = host.querySelector('#citizen-navigation-menu')!;
    expect(menu.textContent?.match(/FASTag check is currently available in English/g)).toHaveLength(1);
    expect(host.textContent).not.toContain('English-only safety beta');
    expect(host.querySelector('select[aria-label="Display language"]')).toBeNull();
  });
});
