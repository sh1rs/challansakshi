import vinextApp from 'vinext/server/app-router-entry';

import { buildProductionHttpsRedirect } from './lib/https-redirect';
import { applyHtmlResponsePolicy } from './lib/html-response-policy';

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

    return applyHtmlResponsePolicy(request, await vinextApp.fetch(request, env, ctx));
  },
};

export default worker;
