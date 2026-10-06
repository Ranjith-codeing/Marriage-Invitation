import { audio as audioConfig, assetUrl } from '../config/assets.js';
import { available } from '../data/publicAssets.js';

const KEY = 'wedding-music';

/**
 * Optional background music. Never autoplays with sound: it starts only from
 * a click (the "Open the invitation ♫" button or the ♫ Music control), and
 * the on/off choice is remembered for the browser session.
 */
export function initMusic() {
  const button = document.querySelector('[data-music]');
  const label = button.querySelector('[data-music-label]');
  if (!available.music) return { available: false, play() {}, preferred: false };

  let audio;
  const getAudio = () => {
    if (!audio) {
      audio = new Audio(assetUrl(audioConfig.music));
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
    }
    return audio;
  };

  const fade = (to, ms = 1200) => {
    const a = getAudio();
    const from = a.volume;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      a.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
      else if (to === 0) a.pause();
    };
    requestAnimationFrame(step);
  };

  const setUI = (playing) => {
    button.setAttribute('aria-pressed', String(playing));
    button.classList.toggle('is-playing', playing);
    label.textContent = playing ? 'Pause' : 'Music';
    button.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  };

  const play = async () => {
    try {
      await getAudio().play();
      fade(audioConfig.volume);
      setUI(true);
      sessionStorage.setItem(KEY, 'on');
    } catch {
      setUI(false); // blocked or file failed — stay quiet
    }
  };
  const pause = () => {
    fade(0, 700);
    setUI(false);
    sessionStorage.setItem(KEY, 'off');
  };

  button.hidden = false;
  setUI(false);
  button.addEventListener('click', () => (button.getAttribute('aria-pressed') === 'true' ? pause() : play()));
  document.addEventListener('visibilitychange', () => {
    if (!audio || button.getAttribute('aria-pressed') !== 'true') return;
    document.hidden ? audio.pause() : audio.play().catch(() => {});
  });

  return { available: true, play, preferred: sessionStorage.getItem(KEY) === 'on' };
}
