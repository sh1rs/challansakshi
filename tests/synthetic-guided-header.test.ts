import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as syntheticApp from '../components/ChallanSakshiApp';

describe('SyntheticGuidedHeader', () => {
  it('renders the passport walkthrough with an explicit synthetic boundary and current Finding stage', () => {
    const SyntheticGuidedHeader = (syntheticApp as Record<string, unknown>).SyntheticGuidedHeader as
      | ((props: { step: 'passport'; language: 'en' }) => ReturnType<typeof createElement>)
      | undefined;

    expect(SyntheticGuidedHeader).toBeTypeOf('function');

    const html = renderToStaticMarkup(createElement(SyntheticGuidedHeader!, {
      step: 'passport',
      language: 'en',
    }));

    expect(html).toContain('SYNTHETIC DEMO');
    expect(html).toContain('Synthetic demo progress');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Current: Finding');
    expect(html).toContain('Evidence passport');
  });
});
