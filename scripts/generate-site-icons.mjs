import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

// The approved Road & Record vector is the sole source for production symbols.
const publicDirectory = new URL('../public/', import.meta.url);
const mark = await readFile(new URL('brand/mark.svg', publicDirectory), 'utf8');
const body = mark.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, '').trim();
const paper = '#F7F4EB';
const ink = '#173741';
const teal = '#087A74';
const fontfile = fileURLToPath(new URL('brand/Manrope.ttf', publicDirectory));
// Give Fontconfig a bounded writable cache and only the bundled font directory.
// This also prevents host-installed fonts from changing the generated artwork.
const fontCache = await mkdtemp(join(tmpdir(), 'challansakshi-brand-fonts-'));
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const fontConfig = join(fontCache, 'fonts.conf');
await writeFile(fontConfig, '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>'+escapeXml(fileURLToPath(new URL('brand/', publicDirectory)))+'</dir><cachedir>'+escapeXml(fontCache)+'</cachedir></fontconfig>');
process.env.FONTCONFIG_FILE = fontConfig;
const svg = (contents, size = 64) => '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 64 64"><title>ChallanSakshi — Road and Record</title>'+contents+'</svg>';
const tile = svg('<rect width="64" height="64" rx="13" fill="'+paper+'"/>'+body);
const square = svg('<path fill="'+paper+'" d="M0 0h64v64H0z"/><g transform="translate(5 5) scale(.84375)">'+body+'</g>');
await mkdir(new URL('icons/', publicDirectory), { recursive: true });
await writeFile(new URL('favicon.svg', publicDirectory), tile);
await writeFile(new URL('brand/mark-monochrome.svg', publicDirectory), mark.replaceAll(teal, ink));
await writeFile(new URL('brand/logo-square.svg', publicDirectory), square);
for (const [path, size] of [['favicon-96x96.png', 96], ['apple-touch-icon.png', 180], ['icons/icon-192.png', 192], ['icons/icon-512.png', 512], ['brand/logo-square.png',512]]) {
  await sharp(Buffer.from(square)).resize(size, size).png().toFile(fileURLToPath(new URL(path, publicDirectory)));
}
// The entire symbol fits inside the central 80% safe circle when masked.
const maskable = svg('<path fill="'+paper+'" d="M0 0h64v64H0z"/><g transform="translate(14 14) scale(.5625)">'+body+'</g>');
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile(fileURLToPath(new URL('icons/icon-maskable-512.png', publicDirectory)));

// Embedded PNG frames retain native 16/32/48px rendering in older browsers.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(Buffer.from(tile)).resize(size, size).png().toBuffer()));
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

// Render from the bundled OFL font, independent of the host's default fonts.
async function lettering(text, size, color = ink, weight = 'bold') {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  return sharp({ text: { text: '<span foreground="'+color+'" weight="'+weight+'">'+escaped+'</span>', font: 'Manrope '+size, fontfile, rgba: true, dpi: 72 } }).png().toBuffer();
}
const symbol = await sharp(Buffer.from(mark)).resize(144, 144).png().toBuffer();
await sharp({ create: { width: 820, height: 180, channels: 4, background: paper } }).composite([
  { input: symbol, left: 12, top: 18 },
  { input: await lettering('ChallanSakshi', 62), left: 180, top: 38 },
  { input: await lettering('by sh1rs', 22, teal), left: 183, top: 115 },
]).png().toFile(fileURLToPath(new URL('brand/logo-lockup.png', publicDirectory)));

const social = sharp({ create: { width: 1200, height: 675, channels: 4, background: paper } }).composite([
  { input: await sharp(Buffer.from(mark)).resize(112, 112).png().toBuffer(), left: 60, top: 50 },
  { input: await lettering('ChallanSakshi', 56), left: 192, top: 60 },
  { input: await lettering('Evidence before action.', 22, teal, 'medium'), left: 196, top: 133 },
  { input: await lettering('Free help with challans,', 58), left: 68, top: 241 },
  { input: await lettering('FASTag & vehicle records.', 58), left: 68, top: 318 },
  { input: await lettering('Understand your records. Prepare your next step.', 27, ink, 'medium'), left: 72, top: 425 },
  { input: Buffer.from('<svg width="1056" height="1"><path stroke="#C8D8D2" d="M0 .5h1056"/></svg>'), left: 72, top: 531 },
  { input: await lettering('No sign-up needed · Independent civic tool', 23, teal), left: 72, top: 565 },
  { input: await lettering('By Shourya Banda · sh1rs', 20, ink, 'medium'), left: 72, top: 607 },
]);
await social.clone().png().toFile(fileURLToPath(new URL('og.png', publicDirectory)));
await social.clone().jpeg({ quality: 87, mozjpeg: true }).toFile(fileURLToPath(new URL('social-preview.jpg', publicDirectory)));
console.log('Generated Road & Record SVG, ICO, PNG, maskable, lockup and social assets.');
