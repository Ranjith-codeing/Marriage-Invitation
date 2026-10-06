/** Header, mobile menu, scroll-progress bar, smooth anchor links, back-to-top. */
export function initNav({ reducedMotion }) {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('site-nav');
  const progress = document.querySelector('[data-progress]');
  const toTop = document.querySelector('[data-back-to-top]');
  const behavior = reducedMotion ? 'auto' : 'smooth';

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (open) nav.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMenu();
      toggle.focus();
    }
  });

  // Smooth in-page navigation that also moves keyboard focus to the section
  document.addEventListener('click', (ev) => {
    const link = ev.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    ev.preventDefault();
    closeMenu();
    target.scrollIntoView({ behavior, block: 'start' });
    history.replaceState(null, '', `#${id}`);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior });
    document.querySelector('.monogram')?.focus({ preventScroll: true });
  });

  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
    toTop.hidden = y < window.innerHeight * 1.5;
    lastY = y;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();
}
