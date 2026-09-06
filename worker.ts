import vinextApp from 'vinext/server/app-router-entry';

import { buildProductionHttpsRedirect } from './lib/https-redirect';
import { applyHtmlResponsePolicy } from './lib/html-response-policy';
import { handleAccountRequest, type AccountEnv } from './lib/mobility/server/account';

type VinextFetch = typeof vinextApp.fetch;

const worker = {
  async fetch(
    request: Parameters<VinextFetch>[0],
    env: Parameters<VinextFetch>[1],
    ctx: Parameters<VinextFetch>[2],
  ): Promise<Response> {
    const redirect = buildProductionHttpsRedirect(request);

    if (redirect) {
      return redirect;
    }

    if (new URL(request.url).pathname.startsWith('/api/account/')) {
      return handleAccountRequest(request, (env ?? {}) as unknown as AccountEnv);
    }

    return applyHtmlResponsePolicy(request, await vinextApp.fetch(request, env, ctx));
  },
};

export default worker;
