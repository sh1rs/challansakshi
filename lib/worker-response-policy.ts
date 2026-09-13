const apiPath = (request: Request) => /^\/api(?:\/|$)/.test(new URL(request.url).pathname);

/** Final protection also covers account handlers that bypass the page router. */
export function applyWorkerResponsePolicy(request: Request, response: Response): Response {
  // Keep streaming bodies untouched, including redirects and bodyless responses.
  const protectedResponse = new Response(response.body, response);
  const headers = protectedResponse.headers;
  const defaults: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (new URL(request.url).protocol === 'https:') defaults['Strict-Transport-Security'] = 'max-age=31536000';
  for (const [name, value] of Object.entries(defaults)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  if (apiPath(request)) {
    // An API response can carry private account or case data, including on errors.
    // CDN-specific directives otherwise take priority over Cache-Control.
    headers.set('Cache-Control', 'no-store');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  return protectedResponse;
}

/** Never expose exception messages, request URLs, account data or provider details. */
export function unavailableResponse(request: Request): Response {
  const message = 'ChallanSakshi is temporarily unavailable. Please try again shortly.';
  const isApi = apiPath(request);
  const headers = new Headers({
    'Content-Type': isApi ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Retry-After': '30',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
  const body = isApi ? JSON.stringify({ error: message, code: 'SERVICE_UNAVAILABLE' }) : `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Temporarily unavailable | ChallanSakshi</title>
<style>body{margin:0;background:#f5f5ee;color:#183b33;font:18px/1.6 system-ui,sans-serif}main{max-width:36rem;margin:12vh auto;padding:2rem}h1{font-size:clamp(2rem,6vw,3rem);line-height:1.15}a{color:inherit;text-underline-offset:.25em}a:focus-visible{outline:3px solid #276b58;outline-offset:6px}.brand{font-weight:750;letter-spacing:-.04em}</style></head>
<body><main><p class="brand">ChallanSakshi</p><h1>We couldn’t open this page just now.</h1><p>Please try again in a moment. If another tab contains unsaved work, keep that tab open.</p><p><a href="/">Return to the home page</a></p><p>An independent, free civic tool. No official action has been performed by this error page.</p></main></body></html>`;
  return new Response(request.method === 'HEAD' ? null : body, { status: 503, headers });
}
