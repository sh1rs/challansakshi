#!/usr/bin/env node
/** Read-only maintainer check. A successful HTTP response is never a purpose review. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_TIMEOUT_MS = 15_000;

/** Load the single import-free maintained registry, without executing a server build. */
export async function loadApprovedRoutes() {
  const source = await readFile(resolve(ROOT, 'lib/official-destinations.ts'), 'utf8');
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  const registry = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
  const all = [...Object.values(registry.OFFICIAL_AUXILIARY_ROUTES), ...Object.values(registry.OFFICIAL_DESTINATIONS)];
  const unique = [...new Map(all.map(route => [route.canonicalUrl, route])).values()];
  return unique.map(route => ({
    url: route.canonicalUrl,
    domain: route.domain,
    purpose: route.purpose,
    evidenceRef: route.evidenceRef,
    lastReviewedOn: route.lastVerifiedAt,
    reviewExpiresOn: route.expiresAt,
  }));
}

function approvedUrl(value, approved) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash
      && (!url.port || url.port === '443') && approved.has(url.href);
  } catch { return false; }
}

/** Only exact registry URLs are fetched. A changed redirect is recorded, never followed. */
export async function checkOfficialRoute(route, approved, {
  fetchImpl = fetch,
  timeoutMs = 8_000,
  maxRedirects = 2,
} = {}) {
  const result = {
    ...route,
    reachability: 'unavailable',
    purposeVerification: 'not-performed',
    httpStatus: null,
    redirects: [],
    observation: '',
  };
  if (!approvedUrl(route.url, approved) || new URL(route.url).hostname !== route.domain) {
    return { ...result, observation: 'URL is not an exact approved HTTPS registry route.' };
  }
  const budget = Math.min(Math.max(Number(timeoutMs) || 8_000, 1), MAX_TIMEOUT_MS);
  const redirectLimit = Math.min(Math.max(Number(maxRedirects) || 0, 0), 3);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    for (let attempt = 0; attempt <= redirectLimit; attempt++) {
      const response = await fetchImpl(route.url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'ChallanSakshi-RouteReview/1.0', Accept: 'text/html' },
      });
      result.httpStatus = response.status;
      // Do not retain page content, cookie headers, identifiers or tracking tokens.
      if (response.body) await response.body.cancel();
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) return { ...result, reachability: 'needs-review', observation: 'Redirect response omitted its destination.' };
        let destination;
        try { destination = new URL(location, route.url); }
        catch { return { ...result, reachability: 'needs-review', observation: 'Redirect destination is malformed.' }; }
        const original = new URL(route.url);
        const hostChanged = destination.host !== original.host;
        const pathChanged = destination.pathname !== original.pathname;
        // Query values are deliberately omitted from the local report.
        result.redirects.push({
          destinationOrigin: destination.origin,
          destinationPath: destination.pathname,
          hasQuery: Boolean(destination.search),
          hostChanged,
          pathChanged,
        });
        if (destination.href !== route.url || !approvedUrl(destination.href, approved)) {
          return { ...result, reachability: 'needs-review', observation: 'Redirect changed the approved URL; manual host, path and purpose review required. Destination was not fetched.' };
        }
        if (attempt === redirectLimit) return { ...result, reachability: 'needs-review', observation: 'Redirect limit reached.' };
        continue;
      }
      return {
        ...result,
        reachability: response.ok ? 'reachable' : 'unavailable',
        observation: response.ok
          ? 'HTTP response received. Purpose, service behavior and jurisdiction coverage have not been reverified.'
          : `HTTP ${response.status}. This check does not establish whether the service is unavailable to citizens.`,
      };
    }
    return result;
  } catch {
    return { ...result, observation: controller.signal.aborted ? 'Check timed out within the bounded request budget.' : 'Network check failed from this environment; citizen availability is unknown.' };
  } finally { clearTimeout(timer); }
}

export async function runOfficialRouteChecks({ fetchImpl = fetch, now = new Date(), timeoutMs = 8_000 } = {}) {
  const routes = await loadApprovedRoutes();
  const approved = new Set(routes.map(route => route.url));
  // A small fixed registry and sequential requests avoid bursts at official services.
  const results = [];
  for (const route of routes) results.push(await checkOfficialRoute(route, approved, { fetchImpl, timeoutMs }));
  return {
    schemaVersion: 'challansakshi.route-reachability-report/v1',
    checkedAt: now.toISOString(),
    purposeVerification: 'not-performed',
    registryMutated: false,
    limitations: 'Network observations only. A maintainer must review official page purpose, issuing-jurisdiction scope and evidence before changing registry dates. No citizen data was used.',
    results,
  };
}

async function main() {
  if (process.argv.length > 2) throw new Error('This checker takes no URLs or arguments; edit the reviewed registry through the normal review process.');
  const report = await runOfficialRouteChecks();
  const outputDirectory = resolve(ROOT, 'qa/official-route-checks');
  await mkdir(outputDirectory, { recursive: true });
  const output = resolve(outputDirectory, `${report.checkedAt.replace(/[:.]/g, '-')}.json`);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`Read-only route observations saved to ${output}\n`);
  process.stdout.write(`${report.results.filter(result => result.reachability === 'reachable').length}/${report.results.length} routes returned successful HTTP responses. Purpose verification was not performed; registry dates were not changed.\n`);
  if (report.results.some(result => result.reachability !== 'reachable')) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
