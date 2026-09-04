// Deterministic internal-review candidate pipeline for the production-disabled
// profile. `scan` validates the built directory through seventeen ordered
// closed checks and writes the frozen scan report; `package` revalidates
// everything, rebuilds identical archive bytes, and writes the ZIP plus its
// checksum sidecar. Nothing here is Store or public-release machinery.
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const yazl = require('yazl');

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(extensionRoot, '..');
const sourceDirectory = resolve(extensionRoot, 'dist/production-disabled');
const syntheticDirectory = resolve(extensionRoot, 'dist/synthetic-development');
const releaseDirectory = resolve(extensionRoot, 'release');
const candidateName = 'challansakshi-assisted-handoff-production-disabled-candidate';
const reportPath = resolve(releaseDirectory, `${candidateName}.scan-report.json`);
const zipPath = resolve(releaseDirectory, `${candidateName}.zip`);
const sidecarPath = resolve(releaseDirectory, `${candidateName}.sha256`);

const EXPECTED_LEAVES = Object.freeze([
  'favicon.svg',
  'icons/icon-128.png',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'manifest.json',
  'popup.css',
  'popup.html',
  'popup.js',
  'service-worker.js',
]);

const CANONICAL_ICON_HASHES = Object.freeze({
  'favicon.svg': '6f4d7c5e4eb17909bc8f9fb18f73e68e3120f082b3bed46bbf77ab4bdde0e7a1',
  'icons/icon-16.png': 'fc3770facd8c17e12e77c5233a3e8bf979176258280f9947c0fc0ac524d87690',
  'icons/icon-32.png': '2217c35895f334fcf7765b7b05a0910fad1f9b114c0472f976a4c4ec3cd0287c',
  'icons/icon-48.png': '40f0214e8effdc65dc81351d4c4d8a1b8c20d2406803e86a86c8b2dec3a54cb0',
  'icons/icon-128.png': '477490f1e21d5ad74b4af6bf3e20e49e1b6f9009db88fef409a28b683521b6ed',
});

const EXPECTED_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

const CHROME_CHAIN_ALLOWLIST = Object.freeze(new Set([
  'chrome.alarms.Alarm',
  'chrome.alarms.clear',
  'chrome.alarms.create',
  'chrome.alarms.onAlarm',
  'chrome.runtime.MessageSender',
  'chrome.runtime.lastError',
  'chrome.runtime.onInstalled',
  'chrome.runtime.onMessage',
  'chrome.runtime.onStartup',
  'chrome.runtime.sendMessage',
  'chrome.scripting.executeScript',
  'chrome.storage.local',
  'chrome.storage.session',
  'chrome.tabs.get',
  'chrome.tabs.onRemoved',
  'chrome.tabs.onReplaced',
  'chrome.tabs.query',
]));

const ALARM_NAMES = Object.freeze(new Set(['session-expiry', 'ledger-cleanup', 'attempt-watchdog']));

class CheckFailure extends Error {
  constructor(id) {
    super(id);
    this.checkId = id;
  }
}

function fail(id) {
  throw new CheckFailure(id);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function listLeaves(root) {
  const leaves = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const absolute = join(current, name);
      const stats = lstatSync(absolute);
      if (stats.isSymbolicLink()) fail('regular-files-only');
      if (stats.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!stats.isFile()) fail('regular-files-only');
      leaves.push(relative(root, absolute).split(sep).join('/'));
    }
  };
  walk(root);
  return leaves.sort();
}

function authoredSources() {
  const sourceRoot = resolve(extensionRoot, 'src');
  return readdirSync(sourceRoot)
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => ({
      name,
      text: readFileSync(resolve(sourceRoot, name), 'utf8'),
    }));
}

function parseSource(name, text) {
  return ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true);
}

function chromeChainOf(node) {
  const parts = [];
  let cursor = node;
  while (ts.isPropertyAccessExpression(cursor)) {
    parts.unshift(cursor.name.text);
    cursor = cursor.expression;
  }
  if (ts.isIdentifier(cursor) && cursor.text === 'chrome') {
    parts.unshift('chrome');
    return parts;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The seventeen ordered checks.
// ---------------------------------------------------------------------------

function checkCanonicalSourceDirectory() {
  if (!existsSync(sourceDirectory)) fail('canonical-source-directory');
  let cursor = sourceDirectory;
  while (cursor.length >= repositoryRoot.length) {
    if (lstatSync(cursor).isSymbolicLink()) fail('canonical-source-directory');
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  if (realpathSync(sourceDirectory) !== join(realpathSync(repositoryRoot), 'extension', 'dist', 'production-disabled')) {
    fail('canonical-source-directory');
  }
  if (!lstatSync(sourceDirectory).isDirectory()) fail('canonical-source-directory');
}

function checkExactLeafSet(leaves) {
  if (JSON.stringify(leaves) !== JSON.stringify([...EXPECTED_LEAVES])) fail('exact-leaf-set');
}

function checkRegularFilesOnly(leaves, buffers) {
  for (const leaf of leaves) {
    const stats = lstatSync(resolve(sourceDirectory, leaf));
    if (!stats.isFile() || stats.isSymbolicLink()) fail('regular-files-only');
    if (buffers.get(leaf).length === 0) fail('regular-files-only');
  }
}

function checkManifestContract(buffers) {
  let manifest;
  try {
    manifest = JSON.parse(buffers.get('manifest.json').toString('utf8'));
  } catch {
    fail('manifest-contract');
  }
  const permissions = manifest.permissions;
  const valid = manifest.manifest_version === 3
    && manifest.name === 'ChallanSakshi Assisted Handoff'
    && manifest.minimum_chrome_version === '152'
    && Array.isArray(permissions)
    && JSON.stringify([...permissions].sort()) === JSON.stringify(['activeTab', 'alarms', 'scripting', 'storage'])
    && manifest.incognito === 'not_allowed'
    && manifest.background?.service_worker === 'service-worker.js'
    && manifest.background?.type === 'module'
    && manifest.action?.default_popup === 'popup.html'
    && manifest.content_security_policy?.extension_pages === EXPECTED_CSP
    && manifest.host_permissions === undefined
    && manifest.optional_permissions === undefined
    && manifest.optional_host_permissions === undefined;
  if (!valid) fail('manifest-contract');
}

function checkLocalAssetClosure(buffers) {
  const html = buffers.get('popup.html').toString('utf8');
  const css = buffers.get('popup.css').toString('utf8');
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/gu)].map((match) => match[1]);
  for (const reference of references) {
    if (!reference.startsWith('./')) fail('local-asset-closure');
    if (!['./popup.js', './popup.css', './favicon.svg'].includes(reference)) fail('local-asset-closure');
  }
  if (/https?:\/\/|\/\/|data:|blob:/u.test(html)) fail('local-asset-closure');
  if (/@import|url\s*\(|https?:/u.test(css)) fail('local-asset-closure');
}

function checkCanonicalIcons(buffers) {
  for (const [leaf, expected] of Object.entries(CANONICAL_ICON_HASHES)) {
    if (sha256(buffers.get(leaf)) !== expected) fail('canonical-icons');
  }
}

function checkDeclarativeSurfaceClosure(buffers) {
  const manifest = JSON.parse(buffers.get('manifest.json').toString('utf8'));
  for (const surface of [
    'content_scripts',
    'web_accessible_resources',
    'declarative_net_request',
    'externally_connectable',
    'devtools_page',
    'options_page',
    'options_ui',
    'chrome_url_overrides',
    'omnibox',
    'commands',
    'oauth2',
    'sandbox',
  ]) {
    if (surface in manifest) fail('declarative-surface-closure');
  }
  const html = buffers.get('popup.html').toString('utf8');
  if (/<a\s|<form|<base|<iframe|<object|<embed|http-equiv|<style|\sstyle="|\son[a-z]+="|target="|hidden/iu.test(html)) {
    fail('declarative-surface-closure');
  }
}

const GLOBAL_OBJECT_ROOTS = Object.freeze(new Set(['chrome', 'window', 'self', 'globalThis', 'document', 'top', 'parent', 'frames']));
// Authored fill-page code legitimately uses locals named parent/top (DOM walks,
// rect fields); the minifier renames locals, so built bytes enforce the full set.
const AUTHORED_IN_PLACE_ROOTS = Object.freeze(new Set(['chrome', 'window', 'self', 'globalThis', 'document', 'frames']));
const FORBIDDEN_BARE_GLOBALS_ALL = Object.freeze(new Set(['eval', 'importScripts', 'opener', 'frames']));
const FORBIDDEN_BARE_GLOBALS_BUILT = Object.freeze(new Set(['eval', 'importScripts', 'opener', 'frames', 'top', 'parent', 'Function']));
const FORBIDDEN_PROPERTY_NAMES = Object.freeze(new Set(['open', 'opener', 'defaultView', 'contentWindow', 'postMessage']));
const LOCATION_MEMBER_NAMES = Object.freeze(new Set(['href', 'hash', 'search', 'pathname', 'host', 'hostname', 'protocol', 'port']));

function chainRootIdentifier(node) {
  let root = node;
  while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)
    || ts.isParenthesizedExpression(root) || ts.isNonNullExpression(root) || ts.isAsExpression(root)) {
    root = root.expression;
  }
  return ts.isIdentifier(root) ? root.text : null;
}

function isAssignmentTarget(node) {
  const parent = node.parent;
  return ts.isBinaryExpression(parent)
    && parent.left === node
    && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
    && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
}

function runAuthorityPass(file, lane) {
  const bareGlobals = lane === 'built' ? FORBIDDEN_BARE_GLOBALS_BUILT : FORBIDDEN_BARE_GLOBALS_ALL;
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      fail('javascript-authority-closure');
    }
    if (ts.isIdentifier(node) && bareGlobals.has(node.text)) {
      const parent = node.parent;
      const isPropertyName = (ts.isPropertyAccessExpression(parent) && parent.name === node)
        || (ts.isPropertyAssignment(parent) && parent.name === node)
        || (ts.isPropertySignature(parent) && parent.name === node)
        || ts.isQualifiedName(parent);
      if (!isPropertyName) fail('javascript-authority-closure');
    }
    if (ts.isStringLiteralLike(node) && (node.text === 'eval' || node.text === 'Function' || node.text === 'importScripts')) {
      fail('javascript-authority-closure');
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)
      && (node.expression.text === 'Function' || node.expression.text === 'XMLHttpRequest' || node.expression.text === 'WebSocket' || node.expression.text === 'EventSource')) {
      fail('javascript-authority-closure');
    }
    if (ts.isPropertyAccessExpression(node) && FORBIDDEN_PROPERTY_NAMES.has(node.name.text)) {
      fail('network-deny');
    }
    if (ts.isElementAccessExpression(node)) {
      const root = chainRootIdentifier(node.expression);
      if (root !== null && GLOBAL_OBJECT_ROOTS.has(root)) fail('javascript-authority-closure');
      if (ts.isStringLiteralLike(node.argumentExpression) && FORBIDDEN_PROPERTY_NAMES.has(node.argumentExpression.text)) {
        fail('network-deny');
      }
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'location') {
      const base = node.expression;
      const baseOk = ts.isIdentifier(base) && (base.text === 'self' || base.text === 'window');
      const parent = node.parent;
      const readOk = ts.isPropertyAccessExpression(parent)
        && parent.expression === node
        && !isAssignmentTarget(parent);
      const aliasOk = ts.isVariableDeclaration(parent) && parent.initializer === node;
      if (!baseOk || (!readOk && !aliasOk) || isAssignmentTarget(node)) fail('network-deny');
    }
    if (ts.isBinaryExpression(node)
      && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const target = node.left;
      const writtenName = ts.isPropertyAccessExpression(target)
        ? target.name.text
        : ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression)
          ? target.argumentExpression.text
          : null;
      if (writtenName !== null && (writtenName === 'location' || LOCATION_MEMBER_NAMES.has(writtenName))) {
        fail('network-deny');
      }
    }
    const inPlaceRoots = lane === 'built' ? GLOBAL_OBJECT_ROOTS : AUTHORED_IN_PLACE_ROOTS;
    if (ts.isIdentifier(node) && inPlaceRoots.has(node.text)) {
      const parent = node.parent;
      const isPropertyName = (ts.isPropertyAccessExpression(parent) && parent.name === node)
        || (ts.isPropertyAssignment(parent) && parent.name === node)
        || (ts.isPropertySignature(parent) && parent.name === node);
      const isChainBase = (ts.isPropertyAccessExpression(parent) && parent.expression === node)
        || ts.isQualifiedName(parent)
        || ts.isTypeOfExpression(parent);
      const isEqualityOperand = ts.isBinaryExpression(parent)
        && (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
          || parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken);
      // The one blessed argument position: getter-safe prototype invocation,
      // e.g. Document.prototype.querySelectorAll.call(document, selector).
      const isPrototypeCallArgument = node.text === 'document'
        && ts.isCallExpression(parent)
        && parent.arguments.includes(node)
        && ts.isPropertyAccessExpression(parent.expression)
        && parent.expression.name.text === 'call';
      if (!isPropertyName && !isChainBase && !isEqualityOperand && !isPrototypeCallArgument) {
        fail('javascript-authority-closure');
      }
    }
    if (node.kind === ts.SyntaxKind.WithStatement) fail('javascript-authority-closure');
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function parsedBundles(buffers) {
  return ['popup.js', 'service-worker.js'].map((leaf) => ({
    name: leaf,
    file: parseSource(leaf, buffers.get(leaf).toString('utf8')),
  }));
}

function checkJavascriptAuthorityClosure(buffers, sources) {
  for (const { name, text } of sources) {
    runAuthorityPass(parseSource(name, text), 'authored');
  }
  for (const bundle of parsedBundles(buffers)) {
    runAuthorityPass(bundle.file, 'built');
  }
  for (const leaf of ['popup.js', 'service-worker.js']) {
    const text = buffers.get(leaf).toString('utf8');
    if (/\beval\b|new\s+Function\b|\bFunction\s*\(|\bimportScripts\b|\bimport\s*\(/u.test(text)) {
      fail('javascript-authority-closure');
    }
  }
}

function runChromeAllowlistPass(file) {
  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node) && !ts.isPropertyAccessExpression(node.parent)) {
      const chain = chromeChainOf(node);
      if (chain && chain.length < 3) fail('chrome-api-allowlist');
      if (chain && chain.length >= 3 && !CHROME_CHAIN_ALLOWLIST.has(chain.slice(0, 3).join('.'))) {
        fail('chrome-api-allowlist');
      }
    }
    if (ts.isElementAccessExpression(node)) {
      const root = chainRootIdentifier(node);
      if (root === 'chrome') fail('chrome-api-allowlist');
    }
    if (ts.isQualifiedName(node)) {
      const parts = [];
      let cursor = node;
      while (ts.isQualifiedName(cursor)) {
        parts.unshift(cursor.right.text);
        cursor = cursor.left;
      }
      if (ts.isIdentifier(cursor) && cursor.text === 'chrome') {
        parts.unshift('chrome');
        if (parts.length >= 3 && !CHROME_CHAIN_ALLOWLIST.has(parts.slice(0, 3).join('.'))) {
          fail('chrome-api-allowlist');
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function checkChromeApiAllowlist(buffers, sources) {
  for (const { name, text } of sources) {
    runChromeAllowlistPass(parseSource(name, text));
  }
  for (const bundle of parsedBundles(buffers)) {
    runChromeAllowlistPass(bundle.file);
  }
  for (const leaf of ['popup.js', 'service-worker.js']) {
    const text = buffers.get(leaf).toString('utf8');
    for (const match of text.matchAll(/chrome\.[A-Za-z]+\.[A-Za-z]+/gu)) {
      if (!CHROME_CHAIN_ALLOWLIST.has(match[0])) fail('chrome-api-allowlist');
    }
    if (/\bchrome\.[A-Za-z_$]+(?![.A-Za-z_$])/u.test(text)) fail('chrome-api-allowlist');
  }
}

function checkLocalStorageCallsiteConfinement(sources) {
  for (const { name, text } of sources) {
    if (name === 'safety-ledger.ts') {
      if (!text.includes('chrome.storage.local')) fail('local-storage-callsite-confinement');
      continue;
    }
    if (/storage\.local/u.test(text)) fail('local-storage-callsite-confinement');
  }
}

function checkScriptingCallsiteConfinement(sources) {
  for (const { name, text } of sources) {
    if (name === 'service-worker.ts') continue;
    if (/chrome\.scripting/u.test(text)) fail('scripting-callsite-confinement');
  }
}

function checkIsolatedInjectionTargeting(sources) {
  const worker = sources.find((source) => source.name === 'service-worker.ts');
  if (!worker) fail('isolated-injection-targeting');
  const file = parseSource(worker.name, worker.text);
  let executeScriptCalls = 0;
  let documentTargeted = 0;
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const chain = chromeChainOf(node.expression);
      if (chain && chain.join('.') === 'chrome.scripting.executeScript') {
        executeScriptCalls += 1;
        const options = node.arguments[0];
        if (!options || !ts.isObjectLiteralExpression(options)) fail('isolated-injection-targeting');
        const optionText = options.getText(file);
        if (!/world:\s*'ISOLATED'/u.test(optionText)) fail('isolated-injection-targeting');
        const usesFrames = /frameIds:\s*\[0\]/u.test(optionText);
        const usesDocuments = /documentIds:\s*\[/u.test(optionText);
        if (usesFrames === usesDocuments) fail('isolated-injection-targeting');
        if (usesDocuments) documentTargeted += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (executeScriptCalls === 0 || documentTargeted !== 1) fail('isolated-injection-targeting');
}

function checkAlarmContract(sources) {
  const worker = sources.find((source) => source.name === 'service-worker.ts');
  const file = parseSource(worker.name, worker.text);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const chain = chromeChainOf(node.expression);
      const joined = chain ? chain.join('.') : null;
      if (joined === 'chrome.alarms.create') {
        const [nameArgument, optionsArgument] = node.arguments;
        if (!nameArgument || !ts.isStringLiteral(nameArgument) || !ALARM_NAMES.has(nameArgument.text)) {
          fail('alarm-contract');
        }
        if (!optionsArgument || !ts.isObjectLiteralExpression(optionsArgument)) fail('alarm-contract');
        const optionText = optionsArgument.getText(file).replace(/\s+/gu, ' ').trim();
        if (!/^\{ ?when(?: ?: ?[^,}]+)? ?\}$/u.test(optionText)) fail('alarm-contract');
        if (/periodInMinutes|delayInMinutes/u.test(optionText)) fail('alarm-contract');
      }
      if (joined === 'chrome.alarms.clear') {
        const [nameArgument] = node.arguments;
        if (!nameArgument || !ts.isStringLiteral(nameArgument) || !ALARM_NAMES.has(nameArgument.text)) {
          fail('alarm-contract');
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function checkCallbackMessageContract(sources) {
  const worker = sources.find((source) => source.name === 'service-worker.ts');
  const file = parseSource(worker.name, worker.text);
  let listeners = 0;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const target = node.expression;
      if (target.name.text === 'addListener') {
        const chain = chromeChainOf(target.expression);
        if (chain && chain.join('.') === 'chrome.runtime.onMessage') {
          listeners += 1;
          const [listener] = node.arguments;
          if (!listener || (!ts.isFunctionExpression(listener) && !ts.isArrowFunction(listener))) {
            fail('callback-message-contract');
          }
          if (listener.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) {
            fail('callback-message-contract');
          }
          const listenerText = listener.getText(file);
          if (!/return\s+true;/u.test(listenerText)) fail('callback-message-contract');
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (listeners !== 1) fail('callback-message-contract');
}

const NETWORK_FORBIDDEN = /\bfetch\b|XMLHttpRequest|\bWebSocket\b|EventSource|sendBeacon|\bImage\b|window\.open|self\.open|globalThis\.open|[^A-Za-z_$.]open(?!\s+[a-z])\b|document\.cookie|\blocalStorage\b|\bsessionStorage\b|indexedDB|location\.assign|location\.replace|location\.href\s*=[^=]|navigator\.|serviceWorker\.register/u;
const SYNTHETIC_URL_PREFIX = 'http://127.0.0.1:3000';

function assertUrlIdentityClosure(text, allowedPrefixes, label) {
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>\\]+/gu)) {
    if (!allowedPrefixes.some((prefix) => match[0].startsWith(prefix))) fail(label);
  }
}

function checkNetworkDeny(buffers, sources) {
  for (const { name, text } of sources) {
    if (NETWORK_FORBIDDEN.test(text)) fail('network-deny');
    void name;
    assertUrlIdentityClosure(text, [SYNTHETIC_URL_PREFIX], 'network-deny');
  }
  for (const leaf of ['popup.js', 'service-worker.js']) {
    const text = buffers.get(leaf).toString('utf8');
    if (NETWORK_FORBIDDEN.test(text)) fail('network-deny');
    assertUrlIdentityClosure(text, [], 'network-deny');
  }
}

function checkBidirectionalProfileIsolation(buffers) {
  const productionText = EXPECTED_LEAVES
    .filter((leaf) => !leaf.endsWith('.png'))
    .map((leaf) => buffers.get(leaf).toString('utf8'))
    .join('\n');
  if (!productionText.includes('challansakshi.sh1rs.com')) fail('bidirectional-profile-isolation');
  if (!productionText.includes('echallan.parivahan.gov.in')) fail('bidirectional-profile-isolation');
  if (!productionText.includes('internal-disabled')) fail('bidirectional-profile-isolation');
  if (productionText.includes('127.0.0.1')) fail('bidirectional-profile-isolation');
  if (productionText.includes('synthetic-fixture')) fail('bidirectional-profile-isolation');

  if (!existsSync(syntheticDirectory)) fail('bidirectional-profile-isolation');
  const syntheticLeaves = listLeaves(syntheticDirectory);
  if (JSON.stringify(syntheticLeaves) !== JSON.stringify([...EXPECTED_LEAVES])) {
    fail('bidirectional-profile-isolation');
  }
  const syntheticText = syntheticLeaves
    .filter((leaf) => !leaf.endsWith('.png'))
    .map((leaf) => readFileSync(resolve(syntheticDirectory, leaf), 'utf8'))
    .join('\n');
  if (!syntheticText.includes('127.0.0.1')) fail('bidirectional-profile-isolation');
  if (!syntheticText.includes('synthetic-fixture')) fail('bidirectional-profile-isolation');
  // The SVG XML namespace is an identifier, not a fetchable network identity.
  assertUrlIdentityClosure(syntheticText, [SYNTHETIC_URL_PREFIX, 'http://www.w3.org/2000/svg'], 'bidirectional-profile-isolation');
  if (syntheticText.includes('challansakshi.sh1rs.com')) fail('bidirectional-profile-isolation');
  if (syntheticText.includes('echallan.parivahan.gov.in')) fail('bidirectional-profile-isolation');
}

function buildArchiveBytes(leaves, buffers) {
  return new Promise((resolveBytes, rejectBytes) => {
    const zipfile = new yazl.ZipFile();
    for (const leaf of leaves) {
      zipfile.addBuffer(Buffer.from(buffers.get(leaf)), leaf, {
        mode: 0o100644,
        mtime: new Date(1980, 0, 1, 0, 0, 0),
        compressionLevel: 9,
        forceDosTimestamp: true,
      });
    }
    zipfile.end();
    const chunks = [];
    zipfile.outputStream.on('data', (chunk) => chunks.push(chunk));
    zipfile.outputStream.on('error', rejectBytes);
    zipfile.outputStream.on('end', () => resolveBytes(Buffer.concat(chunks)));
  });
}

function validateArchiveShape(zip) {
  if (zip.includes(Buffer.from('504b0606', 'hex')) || zip.includes(Buffer.from('504b0607', 'hex'))) {
    fail('deterministic-archive-contract');
  }
  let eocd = -1;
  for (let index = zip.length - 22; index >= 0; index -= 1) {
    if (zip.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd !== zip.length - 22) fail('deterministic-archive-contract');
  if (zip.readUInt16LE(eocd + 10) !== EXPECTED_LEAVES.length) fail('deterministic-archive-contract');
  if (zip.readUInt16LE(eocd + 20) !== 0) fail('deterministic-archive-contract');
}

async function checkDeterministicArchiveContract(leaves, buffers) {
  const first = await buildArchiveBytes(leaves, buffers);
  const second = await buildArchiveBytes(leaves, buffers);
  if (!first.equals(second)) fail('deterministic-archive-contract');
  validateArchiveShape(first);
  return first;
}

// ---------------------------------------------------------------------------
// Pipeline stages.
// ---------------------------------------------------------------------------

async function runScanChecks() {
  checkCanonicalSourceDirectory();
  const leaves = listLeaves(sourceDirectory);
  checkExactLeafSet(leaves);
  const buffers = new Map(leaves.map((leaf) => [leaf, readFileSync(resolve(sourceDirectory, leaf))]));
  checkRegularFilesOnly(leaves, buffers);
  checkManifestContract(buffers);
  checkLocalAssetClosure(buffers);
  checkCanonicalIcons(buffers);
  checkDeclarativeSurfaceClosure(buffers);
  const sources = authoredSources();
  checkJavascriptAuthorityClosure(buffers, sources);
  checkChromeApiAllowlist(buffers, sources);
  checkLocalStorageCallsiteConfinement(sources);
  checkScriptingCallsiteConfinement(sources);
  checkIsolatedInjectionTargeting(sources);
  checkAlarmContract(sources);
  checkCallbackMessageContract(sources);
  checkNetworkDeny(buffers, sources);
  checkBidirectionalProfileIsolation(buffers);
  const archiveBytes = await checkDeterministicArchiveContract(leaves, buffers);
  return { leaves, buffers, archiveBytes };
}

function renderReport(leaves, buffers, archiveBytes) {
  const report = {
    schema: 'challansakshi.extension-package-scan/v1',
    status: 'pass',
    profile: 'production-disabled',
    candidate: candidateName,
    sourceDirectory: 'extension/dist/production-disabled',
    archivePath: `extension/release/${candidateName}.zip`,
    archiveSha256: sha256(archiveBytes),
    entries: leaves.map((leaf) => ({
      path: leaf,
      size: buffers.get(leaf).length,
      sha256: sha256(buffers.get(leaf)),
    })),
    checks: [
      'canonical-source-directory',
      'exact-leaf-set',
      'regular-files-only',
      'manifest-contract',
      'local-asset-closure',
      'canonical-icons',
      'declarative-surface-closure',
      'javascript-authority-closure',
      'chrome-api-allowlist',
      'local-storage-callsite-confinement',
      'scripting-callsite-confinement',
      'isolated-injection-targeting',
      'alarm-contract',
      'callback-message-contract',
      'network-deny',
      'bidirectional-profile-isolation',
      'deterministic-archive-contract',
    ].map((id) => ({ id, status: 'pass' })),
  };
  return `${JSON.stringify(report, null, 2)}\n`;
}

async function commandScan() {
  let scan;
  try {
    scan = await runScanChecks();
  } catch (error) {
    if (existsSync(reportPath)) rmSync(reportPath, { force: true });
    throw error;
  }
  mkdirSync(releaseDirectory, { recursive: true });
  writeFileSync(reportPath, renderReport(scan.leaves, scan.buffers, scan.archiveBytes));
  process.stdout.write(`scan pass: ${candidateName}\n`);
}

async function commandPackage() {
  const scan = await runScanChecks();
  const expectedReport = renderReport(scan.leaves, scan.buffers, scan.archiveBytes);
  if (!existsSync(reportPath)) fail('deterministic-archive-contract');
  const onDiskReport = readFileSync(reportPath, 'utf8');
  if (onDiskReport !== expectedReport) fail('deterministic-archive-contract');
  rmSync(zipPath, { force: true });
  rmSync(sidecarPath, { force: true });
  const prospectiveDigest = sha256(scan.archiveBytes);
  writeFileSync(zipPath, scan.archiveBytes);
  writeFileSync(sidecarPath, `${prospectiveDigest}  ${candidateName}.zip\n`);
  const rereadZip = readFileSync(zipPath);
  const rereadSidecar = readFileSync(sidecarPath, 'utf8');
  const rereadDigest = sha256(rereadZip);
  if (
    rereadDigest !== prospectiveDigest
    || rereadSidecar !== `${prospectiveDigest}  ${candidateName}.zip\n`
    || rereadDigest !== JSON.parse(onDiskReport).archiveSha256
  ) {
    rmSync(zipPath, { force: true });
    rmSync(sidecarPath, { force: true });
    fail('deterministic-archive-contract');
  }
  process.stdout.write(`package pass: ${candidateName}\n`);
}

const commandArguments = process.argv.slice(2);
if (commandArguments.length !== 1 || !['scan', 'package'].includes(commandArguments[0])) {
  process.stderr.write('Expected exactly one command: scan or package.\n');
  process.exit(1);
}

try {
  if (commandArguments[0] === 'scan') await commandScan();
  else await commandPackage();
} catch (error) {
  const id = error instanceof CheckFailure ? error.checkId : 'pipeline';
  process.stderr.write(`candidate ${commandArguments[0]} failed: ${id}\n`);
  process.exit(1);
}
