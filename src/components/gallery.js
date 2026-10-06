import { galleryImages } from '../data/publicAssets.js';
import { assetUrl } from '../config/assets.js';

/** Masonry gallery + native <dialog> lightbox with keyboard and swipe support. */
export function initGallery() {
  const grid = document.querySelector('[data-gallery]');
  const box = document.querySelector('[data-lightbox]');
  if (!grid || !box) return;

  const img = box.querySelector('[data-lightbox-img]');
  const caption = box.querySelector('[data-lightbox-caption]');
  const count = box.querySelector('[data-lightbox-count]');
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + galleryImages.length) % galleryImages.length;
    const item = galleryImages[index];
    img.classList.remove('is-loaded');
    img.onload = () => img.classList.add('is-loaded');
    img.src = assetUrl(item.path);
    img.alt = item.alt;
    caption.textContent = item.caption;
    count.textContent = `${index + 1} / ${galleryImages.length}`;
    const multiple = galleryImages.length > 1;
    box.querySelector('[data-lightbox-prev]').hidden = !multiple;
    box.querySelector('[data-lightbox-next]').hidden = !multiple;
  };

  grid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-index]');
    if (!btn) return;
    opener = btn;
    show(Number(btn.dataset.index));
    box.showModal();
    document.body.classList.add('lightbox-open');
  });

  const close = () => box.close();
  box.addEventListener('close', () => {
    document.body.classList.remove('lightbox-open');
    opener?.focus();
  });
  box.querySelector('[data-lightbox-close]').addEventListener('click', close);
  box.querySelector('[data-lightbox-prev]').addEventListener('click', () => show(index - 1));
  box.querySelector('[data-lightbox-next]').addEventListener('click', () => show(index + 1));
  box.addEventListener('click', (ev) => {
    if (ev.target === box) close(); // click on backdrop
  });
  box.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') show(index - 1);
    if (ev.key === 'ArrowRight') show(index + 1);
  });

  // Swipe
  let x0 = null, y0 = null;
  box.addEventListener('touchstart', (ev) => {
    x0 = ev.touches[0].clientX;
    y0 = ev.touches[0].clientY;
  }, { passive: true });
  box.addEventListener('touchend', (ev) => {
    if (x0 === null) return;
    const dx = ev.changedTouches[0].clientX - x0;
    const dy = ev.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
    x0 = y0 = null;
  });
}
