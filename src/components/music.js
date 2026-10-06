import { audio as audioConfig, assetUrl } from '../config/assets.js';
import { available } from '../data/publicAssets.js';
import { WeddingScore } from '../audio/score.js';

const KEY = 'wedding-music';

/**
 * Background music with two sources:
 *   score — the built-in cinematic score that follows the film (always available)
 *   song  — your own track at public/audio/wedding-music.mp3 (optional)
 * Nothing ever autoplays with sound: music starts only from a click, and the
 * on/off + source choice is remembered for the browser session.
 */
export function initMusic({ getScene }) {
  const button = document.querySelector('[data-music]');
  const label = button.querySelector('[data-music-label]');
  const sourceButton = document.querySelector('[data-music-source]');
  const hasSong = available.music;
  const score = new WeddingScore({ getScene, volume: audioConfig.scoreVolume });

  const saved = sessionStorage.getItem(`${KEY}-source`);
  let source = hasSong && (saved || audioConfig.default) === 'song' ? 'song' : 'score';
  let playing = false;
  let song;

  const songElement = () => {
    if (!song) {
      song = new Audio(assetUrl(audioConfig.music));
      song.loop = true;
      song.preload = 'auto';
      song.volume = 0;
    }
    return song;
  };
  const fadeSong = (to, ms) => {
    const a = songElement();
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

  const startSource = async (src) => {
    if (src === 'score') await score.start();
    else {
      await songElement().play();
      fadeSong(audioConfig.volume, 1200);
    }
  };
  const stopSource = (src) => {
    if (src === 'score') score.stop();
    else if (song) fadeSong(0, 700);
  };

  const setUI = () => {
    button.setAttribute('aria-pressed', String(playing));
    button.classList.toggle('is-playing', playing);
    label.textContent = playing ? 'Pause' : 'Music';
    button.setAttribute('aria-label', playing ? 'Pause music' : `Play ${source === 'song' ? 'our song' : 'the background score'}`);
    if (sourceButton) {
      sourceButton.hidden = !hasSong;
      sourceButton.textContent = source === 'song' ? 'Song' : 'Score';
      sourceButton.setAttribute('aria-label', `Playing ${source === 'song' ? 'our song' : 'the background score'} — switch to ${source === 'song' ? 'the background score' : 'our song'}`);
    }
  };

  const play = async () => {
    try {
      await startSource(source);
      playing = true;
      sessionStorage.setItem(KEY, 'on');
    } catch {
      playing = false; // blocked by the browser or the file failed — stay quiet
    }
    setUI();
  };
  const pause = () => {
    stopSource(source);
    playing = false;
    sessionStorage.setItem(KEY, 'off');
    setUI();
  };
  const switchSource = async () => {
    const next = source === 'song' ? 'score' : 'song';
    if (playing) {
      stopSource(source);
      source = next;
      try {
        await startSource(next);
      } catch {
        playing = false;
      }
    } else source = next;
    sessionStorage.setItem(`${KEY}-source`, source);
    setUI();
  };

  button.hidden = false;
  setUI();
  button.addEventListener('click', () => (playing ? pause() : play()));
  sourceButton?.addEventListener('click', switchSource);
  document.addEventListener('visibilitychange', () => {
    if (!playing) return;
    if (source === 'score') score.setHidden(document.hidden);
    else if (song) document.hidden ? song.pause() : song.play().catch(() => {});
  });

  return {
    available: true,
    play,
    pause,
    isPlaying: () => playing,
    toggle: () => (playing ? pause() : play()),
    setScenario: (name) => score.setScenario(name),
    preferred: sessionStorage.getItem(KEY) === 'on',
  };
}
