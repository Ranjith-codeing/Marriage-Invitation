import { defineConfig } from 'vite';
import publicManifest from './vite-plugins/publicManifest.js';
import { weddingDetails, copy, site } from './src/config/wedding.js';

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const first = (name) => name.split(' ')[0];
const announced = (v) => v && !/^ADD\b/i.test(v);

/** Fills <title> and link-preview (Open Graph) tags from src/config/wedding.js. */
function weddingMeta() {
  return {
    name: 'wedding-meta',
    transformIndexHtml(html) {
      const title = `${first(weddingDetails.groom)} & ${first(weddingDetails.bride)} — ${copy.heroKicker}`;
      const when = announced(weddingDetails.weddingDate) ? ` · ${weddingDetails.weddingDate}` : '';
      const description = `${copy.invitationLine1} ${copy.invitationLine2}${when}`;
      const image = site.url ? new URL(site.shareImage, site.url).href : '';
      return html
        .replace(/%TITLE%/g, escape(title))
        .replace(/%DESCRIPTION%/g, escape(description))
        .replace('<!--OG_IMAGE-->', image ? `<meta property="og:image" content="${escape(image)}" />` : '');
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
