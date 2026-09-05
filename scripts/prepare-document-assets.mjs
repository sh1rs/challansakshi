import { createRequire } from 'node:module';
import { cp, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(project, 'package.json'));
const packageRoot = (name) => path.dirname(require.resolve(`${name}/package.json`));
const tesseract = packageRoot('tesseract.js');
const pdfjs = packageRoot('pdfjs-dist');
const coreRequire = createRequire(path.join(tesseract, 'package.json'));
const core = path.dirname(coreRequire.resolve('tesseract.js-core/package.json'));
const versionOf = async (root) => JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
if (await versionOf(tesseract) !== '7.0.0' || await versionOf(pdfjs) !== '6.3.289') {
  throw new Error('Document asset SDK versions do not match the pinned local reader.');
}
const output = path.join(project, 'public', 'document-assets');
const ocrOutput = path.join(output, 'tesseract-7.0.0');
const pdfOutput = path.join(output, 'pdfjs-6.3.289');
await mkdir(path.join(ocrOutput, 'core'), { recursive: true });
await mkdir(path.join(ocrOutput, 'lang'), { recursive: true });
await mkdir(pdfOutput, { recursive: true });
const copied = [];
async function assetBytes(source) {
  const info = await stat(source);
  if (info.isFile()) return info.size;
  const sizes = await Promise.all((await readdir(source)).map(name => assetBytes(path.join(source, name))));
  return sizes.reduce((sum, size) => sum + size, 0);
}
async function copyAsset(source, target) {
  await cp(source, target, { recursive: true });
  copied.push({ asset: path.relative(output, target), bytes: await assetBytes(source) });
}
await copyAsset(path.join(tesseract, 'dist', 'worker.min.js'), path.join(ocrOutput, 'worker.min.js'));
for (const filename of (await readdir(core)).filter(name => /^tesseract-core.*\.wasm(?:\.js)?$/.test(name)).sort()) {
  await copyAsset(path.join(core, filename), path.join(ocrOutput, 'core', filename));
}
for (const language of ['eng', 'hin']) {
  const languageRoot = packageRoot(`@tesseract.js-data/${language}`);
  if (await versionOf(languageRoot) !== '1.0.0') throw new Error('Language data version does not match the pinned local reader.');
  await copyAsset(path.join(languageRoot, '4.0.0_best_int', `${language}.traineddata.gz`), path.join(ocrOutput, 'lang', `${language}.traineddata.gz`));
}
await copyAsset(path.join(pdfjs, 'build', 'pdf.worker.min.mjs'), path.join(pdfOutput, 'pdf.worker.min.mjs'));
await copyAsset(path.join(pdfjs, 'cmaps'), path.join(pdfOutput, 'cmaps'));
// Package licence notices accompany the redistributed browser assets.
for (const [root, target, name] of [[tesseract, ocrOutput, 'LICENSE.md'], [core, path.join(ocrOutput, 'core'), 'LICENSE'], [pdfjs, pdfOutput, 'LICENSE']]) {
  await copyAsset(path.join(root, name), path.join(target, name));
}
console.log(JSON.stringify({ coreVersion: await versionOf(core), totalBytes: copied.reduce((sum, entry) => sum + entry.bytes, 0), assets: copied }, null, 2));
