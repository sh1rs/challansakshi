import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDirectory = new URL('../public/', import.meta.url);
const mark = await readFile(new URL('favicon.svg', publicDirectory));
await mkdir(new URL('icons/', publicDirectory), { recursive: true });

// Raster variants preserve the existing approved vector brand at exact sizes.
for (const [path, size] of [['favicon-96x96.png', 96], ['apple-touch-icon.png', 180], ['icons/icon-192.png', 192], ['icons/icon-512.png', 512]]) {
  await sharp(mark).resize(size, size).png().toFile(fileURLToPath(new URL(path, publicDirectory)));
}
const maskableMark = await sharp(mark).resize(332, 332).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#087a74' } }).composite([{ input: maskableMark, gravity: 'centre' }]).png().toFile(fileURLToPath(new URL('icons/icon-maskable-512.png', publicDirectory)));

// ICO accepts PNG-compressed image payloads; retain three common browser sizes.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(mark).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i += 1) {
  const entry = 6 + 16 * i;
  header[entry] = sizes[i]; header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await writeFile(new URL('favicon.ico', publicDirectory), Buffer.concat([header, ...images]));

// Format-only optimisation of the existing 1200x675 social artwork.
await sharp(new URL('og.png', publicDirectory).pathname).jpeg({ quality: 86, mozjpeg: true }).toFile(fileURLToPath(new URL('social-preview.jpg', publicDirectory)));
console.log('Generated favicon, touch, maskable and social-share assets from the existing brand artwork.');
