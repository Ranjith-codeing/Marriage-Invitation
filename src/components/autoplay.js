/**
 * "Enter Our Story" → plays the whole film by scrolling for the guest, from
 * the hero to the final scene, at a cinematic pace per section. It eases into
 * and pauses on the reading stops (elements with data-autoplay-hold="seconds"),
 * and stops the moment the guest takes over (scroll, swipe, tap or key press).
 * A floating Play / Pause button lets them hand control back at any time.
 */

// Scroll speed per scene, in viewport-heights per second
const PACE = {
  hero: 0.45,
  prologue: 0.32,
  walk: 0.34,
  garden: 0.32,
  mandapam: 0.3,
  moment: 0.26,
  invitation: 0.32,
  story: 0.38,
  events: 0.38,
  venue: 0.38,
  gallery: 0.45,
  final: 0.24,
};
const KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);

export function initAutoplay({ reducedMotion }) {
  const trigger = document.querySelector('[data-autoplay]');
  const control = document.querySelector('[data-autoplay-control]');
  if (!trigger || !control || reducedMotion) return;
  const label = control.querySelector('[data-autoplay-label]');

  let playing = false;
  let raf = 0;
  let last = 0;
  let speed = 0;
  let y = 0;
  let holdLeft = 0;
  let sections = [];
  let holds = [];

  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

  const measure = () => {
    const vh = innerHeight;
    sections = [...document.querySelectorAll('[data-scene]')].map((el) => ({
      scene: el.dataset.scene,
      top: el.getBoundingClientRect().top + scrollY,
    }));
    const done = new Set(holds.filter((h) => h.done).map((h) => h.el));
    holds = [...document.querySelectorAll('[data-autoplay-hold]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top + scrollY;
        // Centre short elements in the viewport; for tall ones, stop with their top in view
        const stop = r.height < vh * 0.86 ? top + r.height / 2 - vh / 2 : top - vh * 0.08;
        return { el, y: Math.max(0, stop), seconds: Number(el.dataset.autoplayHold) || 3, done: done.has(el) };
      })
      .sort((a, b) => a.y - b.y);
  };

  const sceneAt = (pos) => {
    const mid = pos + innerHeight / 2;
    for (let i = sections.length - 1; i >= 0; i--) if (mid >= sections[i].top) return sections[i].scene;
    return 'hero';
  };

  const setUI = (state) => {
    control.hidden = false;
    control.dataset.state = state;
    control.setAttribute('aria-pressed', String(state === 'playing'));
    label.textContent = state === 'playing' ? 'Pause' : state === 'ended' ? 'Replay' : 'Play story';
    control.setAttribute('aria-label', state === 'playing' ? 'Pause the story' : state === 'ended' ? 'Replay the story from the beginning' : 'Continue playing the story');
  };

  const step = (now) => {
    if (!playing) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    raf = requestAnimationFrame(step);

    if (holdLeft > 0) {
      holdLeft -= dt;
      speed = 0;
      return;
    }
    const vh = innerHeight;
    const max = maxScroll();
    let target = (PACE[sceneAt(y)] ?? 0.32) * vh;

    // Glide into the next reading stop, then hold there
    const next = holds.find((h) => !h.done && h.y > y - 1);
    if (next) {
      const dist = next.y - y;
      if (dist <= 1.5) {
        y = next.y;
        window.scrollTo(0, y);
        next.done = true;
        holdLeft = next.seconds;
        return;
      }
      target = Math.min(target, Math.max(vh * 0.04, dist * 1.6));
    }
    target = Math.min(target, Math.max(vh * 0.03, (max - y) * 1.5)); // ease out at the very end

    speed += (target - speed) * Math.min(1, dt * 2.2); // smooth acceleration
    y = Math.min(max, y + speed * dt);
    window.scrollTo(0, y);
    if (y >= max - 0.5) finish();
  };

  const play = () => {
    measure();
    y = scrollY;
    holds.forEach((h) => {
      if (h.y < y - 2) h.done = true;
    });
    playing = true;
    speed = 0;
    holdLeft = 0;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
    setUI('playing');
  };

  const pause = () => {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(raf);
    setUI('paused');
  };

  const finish = () => {
    playing = false;
    cancelAnimationFrame(raf);
    setUI('ended');
  };

  trigger.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation(); // the guided tour replaces the plain anchor jump
    holds = [];
    play();
  });

  control.addEventListener('click', () => {
    if (control.dataset.state === 'playing') pause();
    else if (control.dataset.state === 'ended') {
      window.scrollTo(0, 0);
      holds = [];
      requestAnimationFrame(play);
    } else play();
  });

  // The guest takes over: any deliberate input pauses the tour
  const takeOver = (ev) => {
    if (!playing) return;
    if (ev.type === 'keydown' && !KEYS.has(ev.key)) return;
    if (ev.target instanceof Element && ev.target.closest('.controls')) return;
    pause();
  };
  addEventListener('wheel', takeOver, { passive: true });
  addEventListener('touchstart', takeOver, { passive: true });
  addEventListener('pointerdown', takeOver, { passive: true });
  addEventListener('keydown', takeOver);
  addEventListener('resize', () => playing && measure(), { passive: true });
  // Lazy images (e.g. the gallery) change the page height mid-tour: re-measure the stops
  if ('ResizeObserver' in window) new ResizeObserver(() => playing && measure()).observe(document.body);
}
