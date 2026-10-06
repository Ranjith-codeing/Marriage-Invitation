import * as THREE from 'three';
import { buildKeyframes, COLOR_KEYS } from './keyframes.js';
import { damp, smoothstep, clamp } from '../utils/math.js';

const CAMERA_KEYS = ['az', 'h', 'dist', 'lookY', 'fov'];
const NUMBER_KEYS = [
  ...CAMERA_KEYS, 'coupleZ', 'lookAt', 'face', 'pose', 'reveal', 'garden', 'mandap', 'petals', 'dim',
  'fogDensity', 'sun', 'hemi', 'exposure', 'lamp', 'night', 'dof', 'shower', 'lanterns',
];

/**
 * Resolves keyframes against the page's sections, interpolates the target
 * state for any film-time t, and eases the live state toward it so that
 * fast or jerky scrolling still produces smooth, cinematic motion.
 *
 * Numbers use a monotone cubic (Fritsch–Carlson) spline: velocity is
 * continuous through every keyframe — the camera glides instead of stopping
 * at each beat — and values never overshoot (no camera dipping into scenery).
 */
export class Director {
  constructor(timeline, keyframes = buildKeyframes()) {
    this.timeline = timeline;
    this.source = keyframes;
    this.target = this.blank();
    this.state = this.blank();
    this.resolve();
    this.sample(0, this.state);
  }

  blank() {
    const s = {};
    NUMBER_KEYS.forEach((k) => (s[k] = 0));
    COLOR_KEYS.forEach((k) => (s[k] = new THREE.Color()));
    return s;
  }

  /** Map keyframes onto film time; keyframes for missing sections are skipped. */
  resolve() {
    this.keys = this.source
      .map((k) => {
        const i = this.timeline.indexOf(k.at);
        if (i < 0) return null;
        const colors = {};
        COLOR_KEYS.forEach((c) => (colors[c] = new THREE.Color(k[c])));
        return { ...k, ...colors, t: i + k.f };
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);

    // Pre-compute monotone tangents for every numeric channel
    const keys = this.keys;
    const n = keys.length;
    this.tangents = {};
    for (const name of NUMBER_KEYS) {
      const v = keys.map((k) => k[name] ?? 0);
      const slope = [];
      for (let i = 0; i < n - 1; i++) slope.push((v[i + 1] - v[i]) / Math.max(1e-6, keys[i + 1].t - keys[i].t));
      const m = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        if (i === 0) m[i] = n > 1 ? slope[0] : 0;
        else if (i === n - 1) m[i] = slope[n - 2];
        else if (slope[i - 1] * slope[i] <= 0) m[i] = 0; // local extreme or flat: hold
        else m[i] = (slope[i - 1] + slope[i]) / 2;
      }
      // Fritsch–Carlson limiter keeps each segment monotone
      for (let i = 0; i < n - 1; i++) {
        if (slope[i] === 0) {
          m[i] = m[i + 1] = 0;
          continue;
        }
        const a = m[i] / slope[i], b = m[i + 1] / slope[i];
        const h = a * a + b * b;
        if (h > 9) {
          const tau = 3 / Math.sqrt(h);
          m[i] = tau * a * slope[i];
          m[i + 1] = tau * b * slope[i];
        }
      }
      this.tangents[name] = m;
    }
  }

  sample(t, out) {
    const keys = this.keys;
    const n = keys.length;
    let i = 0;
    if (t >= keys[n - 1].t) i = n - 1;
    else while (i < n - 2 && t > keys[i + 1].t) i++;

    if (t <= keys[0].t || i === n - 1) {
      const k = t <= keys[0].t ? keys[0] : keys[n - 1];
      for (const name of NUMBER_KEYS) out[name] = k[name] ?? 0;
      for (const name of COLOR_KEYS) out[name].copy(k[name]);
      return out;
    }

    const a = keys[i], b = keys[i + 1];
    const h = b.t - a.t;
    const u = clamp((t - a.t) / h);
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    for (const name of NUMBER_KEYS) {
      const m = this.tangents[name];
      out[name] = h00 * (a[name] ?? 0) + h10 * h * m[i] + h01 * (b[name] ?? 0) + h11 * h * m[i + 1];
    }
    const cu = smoothstep(u);
    for (const name of COLOR_KEYS) out[name].lerpColors(a[name], b[name], cu);
    return out;
  }

  /** Advance the live state toward the scroll target. */
  update(dt, t) {
    this.sample(t, this.target);
    const s = this.state, g = this.target;
    const camK = damp(2.4, dt);
    const envK = damp(1.8, dt);
    for (const k of NUMBER_KEYS) s[k] += (g[k] - s[k]) * (CAMERA_KEYS.includes(k) ? camK : envK);
    for (const k of COLOR_KEYS) s[k].lerp(g[k], envK);
    return s;
  }

  /** Switch to another scenario's keyframes (e.g. garden ↔ beach). */
  setKeyframes(keyframes) {
    this.source = keyframes;
    this.resolve();
  }

  /** Jump straight to the target (used on first frame and after resize). */
  snap(t) {
    this.sample(t, this.state);
  }
}
