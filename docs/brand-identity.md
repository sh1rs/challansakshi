# ChallanSakshi: Road & Record

On 13 September 2026, Shourya selected concept I: a road integrated with a challan/service ticket. The approved concept and a built-in image-generation refinement informed the production vector. The vector uses symmetric notches, two road dashes, and a broad silhouette suited to small screens. This mark identifies the independent project; it is not a government badge or proof that a record is verified.

## Source and exports

- `public/brand/mark.svg` is the editable 64-unit master with transparent surroundings.
- `scripts/generate-site-icons.mjs` produces the stable SVG/ICO/raster favicon files, Apple icon, PWA icons, square search logo, monochrome mark, wordmark lockup, and 1200×675 share artwork.
- `public/brand/logo-square.png` is the 512×512 organization-logo asset used by JSON-LD.
- `public/brand/logo-lockup.png` includes the wordmark and the by-sh1rs signature.
- Colors: teal `#087A74`, navy `#173741`, cream `#F7F4EB`.
- The maskable app icon fits the complete symbol within the central mask-safe circle.
- Manrope is bundled under the SIL Open Font License; see `public/brand/OFL-Manrope.txt`. Source: https://github.com/google/fonts/tree/main/ofl/manrope. The font is locally hosted; logo rendering does not contact a font provider.

Regenerate assets with `node scripts/generate-site-icons.mjs`. Inspect the 16px and 32px ICO frames at native size, the phone header, maskable icon, and social image before shipping changes. Keep public favicon URLs stable so crawlers can refresh them.

The concept boards and refinement PNG remain local in `output/brand-mockups/2026-09-13/`; they are design working files, not runtime assets.

## Final image refinement prompt

Built-in image-generation mode, with the selected I / Road & Record board as the edit reference:

Polish ONLY the selected I / ROAD & RECORD logo symbol from this reference. Preserve its core identity: a rounded upright teal ticket silhouette with side notches, a navy tapering road running through it, cream road edges and two center dashes. Remove all wordmark, labels, layout and mockups. Present one isolated final symbol centered and large on a solid fully opaque warm cream #F7F4EB square canvas. Precise symmetrical geometric paths, optical balance, consistent road-edge thickness, smooth corner radii, generous negative space. Reduce the extra notches at the bottom to a clean pair of equal shallow cutouts. Color exactly deep teal #087A74, navy #173741, cream #F7F4EB. Flat vector-like solid fills, no gradient, texture, shadows, gloss or alpha transparency. It should read immediately as a road integrated with a challan/service ticket. This is a polished evolution of the selected mark, not a new concept. No letters, text, dots, extra decoration or new symbolism.
