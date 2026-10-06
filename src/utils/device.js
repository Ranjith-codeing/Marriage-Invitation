/** Device capability detection → a quality tier that the 3D scene scales to. */

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const isTouchDevice = () =>
  window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * 'high'   — desktop / strong laptops: bloom, shadows, full particles
 * 'medium' — tablets, recent phones: no post-processing, fewer particles
 * 'low'    — older / low-memory phones: minimal particles, low pixel ratio
 */
export function detectQuality() {
  const params = new URLSearchParams(location.search);
  const forced = params.get('quality');
  if (['low', 'medium', 'high'].includes(forced)) return forced;

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // Chrome only; undefined elsewhere
  const small = Math.min(screen.width, screen.height) < 768;
  const touch = isTouchDevice();

  if (memory <= 2 || cores <= 3) return 'low';
  if (touch || small) return cores >= 8 && memory >= 6 ? 'medium' : 'low';
  return 'high';
}

export const QUALITY = {
  high: {
    dpr: 1.75, post: true, shadows: true, lampLights: 3, envEvery: 0.35,
    grass: 70000, flowers: 1, petals: 900, shower: 380, stars: 2400, fireflies: 140, butterflies: 12, lanterns: 40, clouds: 10,
  },
  medium: {
    dpr: 1.5, post: false, shadows: false, lampLights: 1, envEvery: 1.2,
    grass: 22000, flowers: 0.7, petals: 450, shower: 220, stars: 1400, fireflies: 80, butterflies: 8, lanterns: 26, clouds: 8,
  },
  low: {
    dpr: 1.15, post: false, shadows: false, lampLights: 0, envEvery: 2.5,
    grass: 6000, flowers: 0.45, petals: 200, shower: 120, stars: 800, fireflies: 40, butterflies: 4, lanterns: 14, clouds: 6,
  },
};
