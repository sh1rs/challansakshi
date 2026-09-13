import vinextApp from 'vinext/server/app-router-entry';

import { buildProductionHttpsRedirect } from './lib/https-redirect';
import { applyHtmlResponsePolicy } from './lib/html-response-policy';
import { handleAccountRequest, type AccountEnv } from './lib/mobility/server/account';
import { applyWorkerResponsePolicy, unavailableResponse } from './lib/worker-response-policy';

type VinextFetch = typeof vinextApp.fetch;

const worker = {
  async fetch(
    request: Parameters<VinextFetch>[0],
    env: Parameters<VinextFetch>[1],
    ctx: Parameters<VinextFetch>[2],
  ): Promise<Response> {
    const redirect = buildProductionHttpsRedirect(request);

    if (redirect) {
      return applyWorkerResponsePolicy(request, redirect);
    }

    let response: Response;
    try {
      response = new URL(request.url).pathname.startsWith('/api/account/')
        ? await handleAccountRequest(request, (env ?? {}) as unknown as AccountEnv)
        : await vinextApp.fetch(request, env, ctx);
    } catch {
      // Exception messages can contain provider secrets or citizen content.
      // Keep recovery bounded and private; do not log the request or exception.
      response = unavailableResponse(request);
    }
    return applyWorkerResponsePolicy(request, applyHtmlResponsePolicy(request, response));
  },
};

export default worker;
