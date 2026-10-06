import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { framesAreLive } from '../utils/frame.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Keep GSAP ticking where animation frames are paused (e.g. embedded previews). */
export function keepTickerAlive() {
  let manual = 0;
  const check = async () => {
    const live = await framesAreLive(300);
    if (!live && !manual) manual = setInterval(() => gsap.ticker.tick(), 16); // time-based, so no speed-up
    if (live && manual) {
      clearInterval(manual);
      manual = 0;
    }
  };
  check();
  setInterval(check, 2000);
}

/** Opening title sequence — the first seconds after the curtain rises. */
export function playHeroIntro() {
  const tl = gsap.timeline({ delay: 0.25 });
  const names = gsap.utils.toArray('.hero__name');
  const others = gsap.utils.toArray('[data-hero-item]').filter((el) => !names.includes(el));
  gsap.set(names, { autoAlpha: 1 });
  const chars = names.flatMap((el) => SplitText.create(el, { type: 'chars', charsClass: 'char' }).chars);
  tl.fromTo('.hero__tamil, .hero .eyebrow', { autoAlpha: 0, y: 14, letterSpacing: '0.5em' }, { autoAlpha: 1, y: 0, letterSpacing: '', duration: 1.6, ease: 'power3.out', stagger: 0.15 });
  tl.fromTo(
    chars,
    { autoAlpha: 0, yPercent: 55, rotateX: -70, filter: 'blur(10px)' },
    { autoAlpha: 1, yPercent: 0, rotateX: 0, filter: 'blur(0px)', duration: 1.5, ease: 'expo.out', stagger: 0.045 },
    0.35
  );
  tl.fromTo('.hero__amp', { autoAlpha: 0, scale: 0.6, rotate: -12 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'back.out(1.6)' }, 0.75);
  tl.fromTo(
    others.filter((el) => !el.matches('.hero__tamil, .eyebrow, .hero__amp')),
    { autoAlpha: 0, y: 20, filter: 'blur(6px)' },
    { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', stagger: 0.18 },
    1.2
  );
  return tl;
}

/** Scroll-scrubbed captions for the film sections + reveal-on-enter for content. */
export function initReveals() {
  // Prologue: "Two hearts…" → "Two journeys…" → "One beautiful beginning."
  const beats = gsap.utils.toArray('#prologue [data-beat]');
  if (beats.length) {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#prologue', start: 'top top', end: 'bottom bottom', scrub: 0.8 },
    });
    beats.forEach((beat, i) => {
      const last = i === beats.length - 1;
      tl.fromTo(beat, { autoAlpha: 0, y: 30, letterSpacing: '0.12em' }, { autoAlpha: 1, y: 0, letterSpacing: '0.02em', duration: 1, ease: 'power2.out' });
      tl.to(beat, { autoAlpha: last ? 1 : 0, y: last ? 0 : -20, duration: last ? 1.4 : 0.8, ease: 'power1.in' }, '+=0.8');
    });
    tl.to(beats[beats.length - 1], { autoAlpha: 0, y: -20, duration: 0.8 });
  }

  // Single captions: words rise into place around the middle of each film section
  gsap.utils.toArray('.film [data-caption]').forEach((cap) => {
    const section = cap.closest('.film');
    gsap.set(cap, { autoAlpha: 1 });
    const { words } = SplitText.create(cap, { type: 'words', wordsClass: 'word' });
    gsap
      .timeline({ scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.8 } })
      .fromTo(words, { autoAlpha: 0, y: 34, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.12 }, 0.15)
      .to(words, { autoAlpha: 0, y: -24, filter: 'blur(6px)', duration: 0.6, stagger: 0.06 }, 1.7);
  });

  // Finale: lines appear one after another and stay
  const finale = gsap.utils.toArray('[data-finale]');
  if (finale.length) {
    gsap
      .timeline({ scrollTrigger: { trigger: '#finale', start: 'top 60%', end: 'center center', scrub: 1 } })
      .fromTo(finale, { autoAlpha: 0, y: 30, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', stagger: 0.5, duration: 1 });
  }

  // Content reveals
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
  });

  // Fade the hero copy away as the story begins
  gsap.to('.hero__inner', {
    autoAlpha: 0, y: -60, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true },
  });

  ScrollTrigger.refresh();
}

/** Subtle 3D tilt on the couple photo (fine pointers only). */
export function initTilt() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', (ev) => {
      const r = el.getBoundingClientRect();
      ry(((ev.clientX - r.left) / r.width - 0.5) * 8);
      rx(-((ev.clientY - r.top) / r.height - 0.5) * 8);
    });
    el.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

/** Loads the map iframe only when the venue section approaches the viewport. */
export function initLazyEmbeds() {
  const frames = document.querySelectorAll('iframe[data-src]');
  if (!frames.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.src = en.target.dataset.src;
        io.unobserve(en.target);
      });
    },
    { rootMargin: '400px 0px' }
  );
  frames.forEach((f) => io.observe(f));
}

export { ScrollTrigger };
