import './styles/main.css';

import { renderContent } from './components/content.js';
import { Loader } from './components/loader.js';
import { initNav } from './components/nav.js';
import { initMusic } from './components/music.js';
import { initGallery } from './components/gallery.js';
import { initCountdown } from './components/countdown.js';
import { initCursorGlow } from './components/cursor.js';
import { initAutoplay } from './components/autoplay.js';
import { ScrollTimeline } from './animations/scrollTimeline.js';
import { prefersReducedMotion, supportsWebGL, detectQuality } from './utils/device.js';

const MIN_LOADER_MS = 2200;

// The film always starts from the beginning
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/** Fine film grain for the cinematic overlay (generated, nothing to download). */
function makeGrain() {
  const size = 160;
  const c = Object.assign(document.createElement('canvas'), { width: size, height: size });
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
}

async function boot() {
  const reducedMotion = prefersReducedMotion();
  const cinematic = !reducedMotion && supportsWebGL();
  const root = document.documentElement;
  root.classList.add(cinematic ? 'is-cinematic' : 'is-static');
  if (!reducedMotion) root.classList.add('motion');
  makeGrain();

  const started = performance.now();
  const loader = new Loader({ reducedMotion });

  renderContent(document.getElementById('app'));
  initNav({ reducedMotion });
  initGallery();
  initCountdown();
  // Which story scene is on screen (the score follows it)
  const sceneEls = [...document.querySelectorAll('[data-scene]')];
  const getScene = () => {
    if (document.body.classList.contains('is-loading')) return 'hero';
    const mid = innerHeight / 2;
    let name = 'hero';
    for (const el of sceneEls) if (el.getBoundingClientRect().top <= mid) name = el.dataset.scene;
    return name;
  };
  const music = initMusic({ getScene });

  const fontsReady = document.fonts?.ready.catch(() => {}) ?? Promise.resolve();
  let experience = null;
  let reveals = null;

  if (cinematic) {
    // 3D + animation code is split into its own chunks and loaded in parallel
    const [{ Experience }, revealsModule] = await Promise.all([import('./scenes/Experience.js'), import('./animations/reveals.js')]);
    reveals = revealsModule;
    loader.set(0.08);
    const sections = [...document.querySelectorAll('[data-scene]')].map((el) => ({ name: el.dataset.scene, el }));
    const timeline = new ScrollTimeline(sections);
    const dim = document.querySelector('.scene-dim');

    experience = new Experience(document.getElementById('scene'), {
      quality: detectQuality(),
      timeline,
      onFrame: (s) => (dim.style.opacity = s.dim.toFixed(3)),
    });
    if (import.meta.env.DEV) window.__experience = experience; // debugging aid (dev server only)
    try {
      const { coupleMode } = await experience.load((p) => loader.set(0.08 + p * 0.86));
      console.info(`[couple] Showing the couple as: ${coupleMode}`);
    } catch (err) {
      console.error('[scene] 3D scene failed to start — showing the static version.', err);
      experience = null;
      root.classList.replace('is-cinematic', 'is-static');
    }
  }

  await fontsReady;
  loader.set(1);
  const wait = MIN_LOADER_MS - (performance.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  if (!location.hash) window.scrollTo(0, 0);

  const { withMusic } = await loader.waitForEntry({ musicAvailable: music.available });
  if (withMusic) music.play();

  document.body.classList.remove('is-loading');
  loader.hide();
  experience?.start();
  initAutoplay({ reducedMotion });

  if (reveals) {
    initCursorGlow((x, y) => experience?.setPointer(x, y));
    reveals.initReveals();
    reveals.initTilt();
    reveals.initLazyEmbeds();
    reveals.playHeroIntro();
  } else {
    root.classList.remove('motion'); // show all text immediately in the static version
    const { initLazyEmbeds } = await import('./animations/reveals.js');
    initLazyEmbeds();
  }
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

boot();
