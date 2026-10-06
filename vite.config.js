import { defineConfig } from 'vite';
import publicManifest from './vite-plugins/publicManifest.js';
import { weddingDetails, copy, site, events } from './src/config/wedding.js';

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const first = (name) => name.split(' ')[0];
const announced = (v) => v && !/^ADD\b/i.test(v);

/** Fills <title> and link-preview (Open Graph) tags from src/config/wedding.js. */
function weddingMeta() {
  return {
    name: 'wedding-meta',
    transformIndexHtml(html) {
      const title = `${first(weddingDetails.groom)} & ${first(weddingDetails.bride)} — ${copy.heroKicker}`;
      // e.g. "Reception: Saturday, 21 November 2026, 6:00 – 9:00 PM, Sukra Mahal"
      const lines = events
        .filter((ev) => announced(ev.date))
        .map((ev) => [ev.date, ev.time, ev.venue].filter(announced).join(', ').replace(/^/, `${ev.title}: `));
      const description = [`${copy.invitationLine1} ${copy.invitationLine2}`, ...lines].join(' · ');
      const image = site.url ? new URL(site.shareImage, site.url).href : '';
      const meta = image
        ? [
            `<meta property="og:image" content="${escape(image)}" />`,
            '<meta property="og:image:width" content="1200" />',
            '<meta property="og:image:height" content="630" />',
            `<meta property="og:url" content="${escape(site.url)}" />`,
            `<meta name="twitter:image" content="${escape(image)}" />`,
          ].join('\n    ')
        : '';
      return html
        .replace(/%TITLE%/g, escape(title))
        .replace(/%DESCRIPTION%/g, escape(description))
        .replace('<!--OG_IMAGE-->', meta);
    },
  };
}

export default defineConfig({
  // Relative base: works for user sites (user.github.io) and project sites
  // (user.github.io/<repo>/) alike, with no repo name hard-coded.
  base: './',
  plugins: [publicManifest(), weddingMeta()],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks: { three: ['three'], gsap: ['gsap'] } },
    },
  },
});
