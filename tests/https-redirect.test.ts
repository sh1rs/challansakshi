import { describe, expect, it } from 'vitest';
import { buildProductionHttpsRedirect } from '../lib/https-redirect';

describe('production HTTPS redirect', () => {
  it('redirects the public hostname from HTTP to the same HTTPS path and query', () => {
    const response = buildProductionHttpsRedirect(
      new Request('http://challansakshi.sh1rs.com/review?source=forwarded-message', {
        method: 'POST',
      }),
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe(
      'https://challansakshi.sh1rs.com/review?source=forwarded-message',
    );
  });

  it.each([
    'https://challansakshi.sh1rs.com/review',
    'http://localhost:3100/review',
    'http://preview.example.test/review',
  ])('does not redirect requests outside the production HTTP boundary: %s', (url) => {
    expect(buildProductionHttpsRedirect(new Request(url))).toBeNull();
  });
});
