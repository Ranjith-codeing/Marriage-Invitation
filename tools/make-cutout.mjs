/**
 * Removes the background from a photo of the couple and saves a transparent
 * WebP for the 3D scene. Runs entirely on your computer — nothing is uploaded.
 *
 * One-time setup (not added to package.json, so the website stays lightweight):
 *   npm install --no-save @imgly/background-removal-node sharp@^0.33
 *
 * Usage:
 *   node tools/make-cutout.mjs reference-photos/couple-front.webp public/images/couple/couple-cutout.webp
 */
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';

const [, , input, output = 'public/images/couple/couple-cutout.webp'] = process.argv;
if (!input) {
  console.error('Usage: node tools/make-cutout.mjs <input-photo> [output.webp]');
  process.exit(1);
}

const png = await sharp(input).png().toBuffer();
const blob = await removeBackground(new Blob([png], { type: 'image/png' }), {
  model: 'medium',
  output: { format: 'image/png', quality: 1 },
});
const cut = Buffer.from(await blob.arrayBuffer());
const { height } = await sharp(cut).metadata();
await sharp(cut)
  .trim({ threshold: 1 })
  .resize({ height: Math.min(1400, height), withoutEnlargement: true })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(output);
console.log(`Saved ${output}`);
