/** Soft golden glow following the cursor (desktop / fine pointers only). */
export function initCursorGlow(onMove) {
  const glow = document.querySelector('.cursor-glow');
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (!fine) {
    glow.remove();
    return;
  }
  let x = innerWidth / 2, y = innerHeight / 2, gx = x, gy = y, raf = 0;
  const loop = () => {
    gx += (x - gx) * 0.14;
    gy += (y - gy) * 0.14;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    raf = Math.abs(x - gx) + Math.abs(y - gy) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  window.addEventListener('pointermove', (ev) => {
    x = ev.clientX;
    y = ev.clientY;
    glow.classList.add('is-active');
    onMove?.((x / innerWidth) * 2 - 1, -((y / innerHeight) * 2 - 1));
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('is-active'));
}
