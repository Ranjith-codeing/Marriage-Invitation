import { files } from 'virtual:public-manifest';
import { models, audio, portraits, couplePhoto } from '../config/assets.js';
import { captions } from './gallery.js';

const has = (path) => files.some((f) => f.path === path);
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

/** Turns "03-temple-visit.jpg" into "Temple visit". */
const titleFromFile = (file) => {
  const base = file.split('/').pop().replace(IMAGE, '').replace(/^\d+[-_ ]*/, '').replace(/[-_]+/g, ' ').trim();
  return base ? base[0].toUpperCase() + base.slice(1) : '';
};

export const galleryImages = files
  .filter((f) => f.path.startsWith('images/gallery/') && IMAGE.test(f.path))
  .map((f) => {
    const name = f.path.split('/').pop();
    const caption = captions[name] ?? '';
    return { path: f.path, caption, alt: caption || titleFromFile(name) || 'Ranjith and Jayachitra' };
  });

export const available = {
  groomModel: has(models.groom.url),
  brideModel: has(models.bride.url),
  music: has(audio.music),
  couplePortrait: has(portraits.couple),
  coupleCutout: has(couplePhoto.cutout),
};

export const modelBytes = {
  groom: files.find((f) => f.path === models.groom.url)?.size ?? 0,
  bride: files.find((f) => f.path === models.bride.url)?.size ?? 0,
};
