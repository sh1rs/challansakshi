import { cp, lstat, mkdir, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, runnerImport } from 'vite';

const expectedArgumentMessage = 'Expected exactly one build profile: synthetic-development or production-disabled.';
const allowedProfiles = Object.freeze(['synthetic-development', 'production-disabled']);
const args = process.argv.slice(2);
if (args.length !== 1 || !allowedProfiles.includes(args[0])) {
  throw new Error(expectedArgumentMessage);
}

const profileId = args[0];
const extensionRoot = fileURLToPath(new URL('..', import.meta.url));
const repositoryRoot = resolve(extensionRoot, '..');
const distRoot = resolve(extensionRoot, 'dist');
const outputDirectory = resolve(distRoot, profileId);
const expectedOutputDirectory = resolve(extensionRoot, 'dist', profileId);
if (outputDirectory !== expectedOutputDirectory || relative(distRoot, outputDirectory).split(sep).length !== 1) {
  throw new Error('Refusing an extension output outside the selected profile directory.');
}

const expectedLeaves = Object.freeze([
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

async function collectRegularFileLeaves(root, current = '') {
  const absolute = resolve(root, current);
  const entries = await readdir(absolute, { withFileTypes: true });
  const leaves = [];
  for (const entry of entries) {
    const child = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Generated extension output contains a symlink: ${child}`);
    if (entry.isDirectory()) leaves.push(...await collectRegularFileLeaves(root, child));
    else if (entry.isFile()) leaves.push(child);
    else throw new Error(`Generated extension output contains a non-file leaf: ${child}`);
  }
  return leaves.sort();
}

await mkdir(distRoot, { recursive: true });
const distStats = await lstat(distRoot);
if (!distStats.isDirectory() || distStats.isSymbolicLink() || await realpath(distRoot) !== distRoot) {
  throw new Error('Refusing an extension dist root that resolves through a symlink.');
}
await rm(outputDirectory, { recursive: true, force: true });

const viteConfigPath = resolve(extensionRoot, 'vite.config.ts');
const viteConfigModule = await runnerImport(viteConfigPath, {
  root: repositoryRoot,
  configFile: false,
  envFile: false,
  logLevel: 'warn',
});
const createExtensionViteConfig = viteConfigModule.module.createExtensionViteConfig;
if (typeof createExtensionViteConfig !== 'function') {
  throw new Error('Extension Vite configuration factory is unavailable.');
}

await build(createExtensionViteConfig(profileId, 'popup'));
await build(createExtensionViteConfig(profileId, 'worker'));

const manifestModule = await runnerImport(resolve(extensionRoot, 'src/manifest.ts'), {
  root: repositoryRoot,
  configFile: false,
  envFile: false,
  logLevel: 'warn',
});
const profile = manifestModule.module.getExtensionBuildProfile(profileId);
if (!profile) throw new Error('Selected extension build profile was not resolved.');
const manifest = manifestModule.module.buildManifest(profile);

await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await cp(resolve(extensionRoot, 'public/favicon.svg'), resolve(outputDirectory, 'favicon.svg'));
for (const size of [16, 32, 48, 128]) {
  const destination = resolve(outputDirectory, `icons/icon-${size}.png`);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(extensionRoot, `public/icons/icon-${size}.png`), destination);
}

const resolvedOutput = await realpath(outputDirectory);
if (resolvedOutput !== outputDirectory) throw new Error('Selected extension output resolved through a symlink.');
for (const leaf of expectedLeaves) {
  const stats = await lstat(resolve(outputDirectory, leaf));
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`Invalid generated extension leaf: ${leaf}`);
}
const actualLeaves = await collectRegularFileLeaves(outputDirectory);
if (JSON.stringify(actualLeaves) !== JSON.stringify(expectedLeaves)) {
  throw new Error(`Unexpected generated extension leaf set: ${JSON.stringify(actualLeaves)}`);
}

const manifestBytes = await readFile(resolve(outputDirectory, 'manifest.json'), 'utf8');
if (manifestBytes !== `${JSON.stringify(manifest, null, 2)}\n`) {
  throw new Error('Generated extension manifest bytes changed after writing.');
}
