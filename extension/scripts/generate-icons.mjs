import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const sourcePath = fileURLToPath(new URL('../public/favicon.svg', import.meta.url));
const iconsDirectory = fileURLToPath(new URL('../public/icons/', import.meta.url));
const sizes = Object.freeze([16, 32, 48, 128]);
const pngOptions = Object.freeze({
  compressionLevel: 9,
  adaptiveFiltering: false,
  palette: false,
});

if (sharp.versions.sharp !== '0.34.5') {
  throw new Error('Icon generation requires sharp 0.34.5.');
}

const source = await readFile(sourcePath);
await mkdir(iconsDirectory, { recursive: true });
for (const size of sizes) {
  const outputPath = fileURLToPath(new URL(`../public/icons/icon-${size}.png`, import.meta.url));
  await sharp(source, { density: 384 })
    .resize(size, size, { fit: 'fill' })
    .png(pngOptions)
    .toFile(outputPath);
}
