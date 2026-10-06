/**
 * Cinematic choreography. Each keyframe pins the full scene state to a point
 * in the page: `at` is a section's data-scene name, `f` the fraction (0–1)
 * through that section. Between keyframes everything is smoothly interpolated
 * (see Director.js), so scrolling literally plays the film forwards and backwards.
 *
 * The couple stand on the mandapam platform at the origin, facing +Z. The
 * camera is the guest: it starts far down the garden path and travels toward
 * them. Camera position is in orbit coordinates around the couple:
 *   az     — azimuth in radians (0 = straight down the path, + = their left)
 *   h      — camera height above the ground (m)
 *   dist   — horizontal distance from the couple (m)
 *   lookY  — height the camera looks at (m)
 * Story parameters (0–1):
 *   reveal — how visible the couple are     dof      — depth-of-field strength
 *   shower — petal shower over the couple   lanterns — sky lanterns (finale)
 */

const dusk = {
  skyTop: '#2b2348', skyHorizon: '#f0a070', skyBottom: '#3a2a2e',
  fogColor: '#8a5c4c', fogDensity: 0.02,
  sunColor: '#ffb27a', sun: 1.4, hemi: 0.45, exposure: 0.95, lamp: 0.4, night: 0.2,
};
const dark = {
  skyTop: '#060508', skyHorizon: '#1a1114', skyBottom: '#070506',
  fogColor: '#0c0809', fogDensity: 0.075,
  sunColor: '#ffb27a', sun: 0.12, hemi: 0.1, exposure: 0.85, lamp: 0, night: 0.05,
};
const golden = {
  skyTop: '#8fa6c4', skyHorizon: '#ffd09a', skyBottom: '#e0b98a',
  fogColor: '#f3cf9e', fogDensity: 0.0095,
  sunColor: '#ffd39a', sun: 2.8, hemi: 1.0, exposure: 1.05, lamp: 0, night: 0,
};
const garden = {
  ...golden,
  skyTop: '#9db4cc', skyHorizon: '#ffdcac', fogColor: '#f6d8ae', fogDensity: 0.0085, sun: 3.2,
};
const temple = {
  skyTop: '#8a6b73', skyHorizon: '#f2a766', skyBottom: '#c98a5c',
  fogColor: '#d79a6a', fogDensity: 0.014,
  sunColor: '#ffaf6c', sun: 2.1, hemi: 0.7, exposure: 1.0, lamp: 0.8, night: 0,
};
const moment = {
  skyTop: '#55394f', skyHorizon: '#e3966a', skyBottom: '#9a5e4c',
  fogColor: '#a46858', fogDensity: 0.02,
  sunColor: '#ff9d62', sun: 1.5, hemi: 0.55, exposure: 1.0, lamp: 1.1, night: 0.1,
};
const evening = {
  skyTop: '#241c33', skyHorizon: '#9c5a4c', skyBottom: '#2e1f26',
  fogColor: '#392630', fogDensity: 0.03,
  sunColor: '#ff9a62', sun: 0.55, hemi: 0.35, exposure: 0.95, lamp: 1.3, night: 0.45,
};
const night = {
  skyTop: '#03060f', skyHorizon: '#1a2340', skyBottom: '#070a14',
  fogColor: '#0a0e1b', fogDensity: 0.016,
  sunColor: '#9fb4ff', sun: 0.0, hemi: 0.22, exposure: 1.05, lamp: 1.6, night: 1,
};

// The camera's journey: down the path, under the floral arches (z = 25, 17, 10.5 — keep
// |sin(az) × dist| under ~1 m there so the camera passes through the openings), into the mandapam.
const base = { coupleZ: 0, lookAt: 0, face: 0, pose: 0, dim: 0, dof: 0, shower: 0, lanterns: 0 };
export const keyframes = [
  { at: 'hero', f: 0, ...base, ...dusk, az: 0.0, h: 2.3, dist: 38, lookY: 2.6, fov: 38, reveal: 0, garden: 0.15, mandap: 0, petals: 0.35 },
  { at: 'prologue', f: 0.12, ...base, ...dark, az: 0.0, h: 1.6, dist: 33, lookY: 1.7, fov: 34, reveal: 0, garden: 0.1, mandap: 0, petals: 0.2 },
  { at: 'prologue', f: 0.9, ...base, ...dark, fogDensity: 0.03, hemi: 0.3, sun: 0.5, lamp: 0.7, az: 0.03, h: 1.6, dist: 27, lookY: 1.5, fov: 30, reveal: 1, garden: 0.2, mandap: 0.15, petals: 0.4 },
  { at: 'walk', f: 0.12, ...base, ...golden, az: 0.02, h: 1.55, dist: 22, lookY: 1.5, fov: 32, reveal: 1, garden: 0.4, mandap: 0.25, petals: 0.6 },
  { at: 'walk', f: 0.95, ...base, ...golden, az: -0.06, h: 1.45, dist: 15.5, lookY: 1.45, fov: 34, reveal: 1, garden: 0.6, mandap: 0.35, petals: 0.7 },
  { at: 'garden', f: 0.2, ...base, ...garden, az: 0.05, h: 1.3, dist: 12.5, lookY: 1.4, fov: 36, reveal: 1, garden: 1, mandap: 0.45, petals: 1 },
  { at: 'garden', f: 0.95, ...base, ...garden, az: -0.08, h: 1.5, dist: 9.5, lookY: 1.5, fov: 38, reveal: 1, garden: 1, mandap: 0.6, petals: 1 },
  { at: 'mandapam', f: 0.3, ...base, ...temple, az: -0.3, h: 0.65, dist: 7.8, lookY: 2.2, fov: 44, reveal: 1, garden: 1, mandap: 1, petals: 0.8, dof: 0.2 },
  { at: 'mandapam', f: 0.95, ...base, ...temple, az: -0.12, h: 1.15, dist: 6.3, lookY: 1.6, fov: 40, reveal: 1, garden: 1, mandap: 1, petals: 0.8, dof: 0.3 },
  { at: 'moment', f: 0.15, ...base, ...moment, face: 1, lookAt: 1, az: 0.34, h: 1.5, dist: 4.2, lookY: 1.22, fov: 34, reveal: 1, garden: 1, mandap: 1, petals: 0.6, dof: 1 },
  { at: 'moment', f: 0.55, ...base, ...moment, face: 1, lookAt: 1, az: 0.0, h: 1.45, dist: 3.9, lookY: 1.22, fov: 33, reveal: 1, garden: 1, mandap: 1, petals: 0.6, dof: 1, shower: 1 },
  { at: 'moment', f: 0.9, ...base, ...moment, face: 1, lookAt: 1, az: -0.34, h: 1.45, dist: 3.9, lookY: 1.22, fov: 32, reveal: 1, garden: 1, mandap: 1, petals: 0.6, dof: 1, shower: 1 },
  { at: 'invitation', f: 0.35, ...base, ...evening, pose: 1, az: 0.0, h: 2.0, dist: 8.5, lookY: 1.8, fov: 40, reveal: 1, garden: 1, mandap: 1, petals: 0.6, dim: 0.62 },
  { at: 'gallery', f: 0.5, ...base, ...evening, pose: 1, night: 0.7, skyTop: '#121528', az: -0.22, h: 2.3, dist: 10.5, lookY: 2.3, fov: 42, reveal: 1, garden: 1, mandap: 1, petals: 0.5, dim: 0.62 },
  { at: 'final', f: 0.4, ...base, ...night, pose: 1, az: 0.12, h: 1.2, dist: 5.4, lookY: 2.1, fov: 46, reveal: 1, garden: 1, mandap: 1, petals: 0.45, dof: 0.4, lanterns: 1 },
];

export const COLOR_KEYS = ['skyTop', 'skyHorizon', 'skyBottom', 'fogColor', 'sunColor'];
