import { weddingDetails } from '../config/wedding.js';
import { firstName, escapeHtml } from '../utils/math.js';

/**
 * Premium loading screen: names, progress bar, drifting gold dust.
 * Resolves `waitForEntry()` when the guest chooses to enter (with or without music).
 */
export class Loader {
  constructor({ reducedMotion }) {
    this.el = document.getElementById('loader');
    this.bar = this.el.querySelector('[data-loader-bar]');
    this.pct = this.el.querySelector('[data-loader-pct]');
    this.text = this.el.querySelector('[data-loader-text]');
    this.enter = this.el.querySelector('[data-loader-enter]');
    const groom = escapeHtml(firstName(weddingDetails.groom));
    const bride = escapeHtml(firstName(weddingDetails.bride));
    this.el.querySelector('[data-loader-names]').innerHTML = `${groom}<em>&amp;</em>${bride}`;
    this.el.querySelector('[data-loader-monogram]').innerHTML = `
      <svg viewBox="0 0 120 120" width="92" height="92">
        <circle cx="60" cy="60" r="56" stroke-width="1.2" />
        <circle cx="60" cy="60" r="50" stroke-width="0.5" />
        <text x="41" y="69" font-size="34" text-anchor="middle">${groom[0]}</text>
        <text x="60" y="72" font-size="18" text-anchor="middle">&amp;</text>
        <text x="80" y="77" font-size="34" text-anchor="middle">${bride[0]}</text>
      </svg>`;
    this.shown = 0;
    if (!reducedMotion) this.dust();
  }

  set(p) {
    const v = Math.max(this.shown, Math.min(1, p));
    this.shown = v;
    this.bar.style.transform = `scaleX(${v})`;
    this.pct.textContent = `${Math.round(v * 100)}%`;
  }

  /** Show the entry buttons and wait for the guest's choice. */
  waitForEntry({ musicAvailable }) {
    this.set(1);
    this.text.textContent = 'You are cordially invited';
    this.pct.hidden = true;
    this.el.querySelector('.loader__bar').hidden = true;
    const musicBtn = this.enter.querySelector('[data-enter="music"]');
    const quietBtn = this.enter.querySelector('[data-enter="quiet"]');
    if (!musicAvailable) {
      musicBtn.innerHTML = 'Open the invitation';
      quietBtn.hidden = true;
    }
    this.enter.hidden = false;
    musicBtn.focus({ preventScroll: true });
    return new Promise((resolve) => {
      this.enter.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-enter]');
        if (btn) resolve({ withMusic: musicAvailable && btn.dataset.enter === 'music' });
      });
    });
  }

  hide() {
    this.el.classList.add('is-done');
    this.el.setAttribute('aria-hidden', 'true');
    cancelAnimationFrame(this.raf);
    setTimeout(() => this.el.remove(), 1400);
  }

  dust() {
    const canvas = this.el.querySelector('.loader__dust');
    const g = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
    };
    resize();
    addEventListener('resize', resize);
    const n = innerWidth < 700 ? 40 : 80;
    const motes = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.8, s: 0.02 + Math.random() * 0.05, p: Math.random() * 6,
    }));
    const draw = (t) => {
      g.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of motes) {
        m.y -= m.s * 0.004;
        if (m.y < -0.02) m.y = 1.02;
        const x = (m.x + Math.sin(t * 0.0003 + m.p) * 0.01) * canvas.width;
        const a = 0.25 + 0.35 * Math.sin(t * 0.001 + m.p);
        g.fillStyle = `rgba(216,181,106,${Math.max(0, a)})`;
        g.beginPath();
        g.arc(x, m.y * canvas.height, m.r * dpr, 0, Math.PI * 2);
        g.fill();
      }
      this.raf = requestAnimationFrame(draw);
    };
    this.raf = requestAnimationFrame(draw);
  }
}
