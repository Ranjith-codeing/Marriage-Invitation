/**
 * requestAnimationFrame with a timer fallback. Some embedded browser views
 * (and pages reported as "hidden" while still on screen) stop delivering
 * animation frames; the fallback keeps scrolling and rendering alive there.
 * In a normal visible tab the animation frame always wins the race.
 * Returns a cancel function.
 */
export function onNextFrame(callback, fallbackMs = 40) {
  let done = false;
  const run = (time) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    callback(time ?? performance.now());
  };
  const raf = requestAnimationFrame(run);
  const timer = setTimeout(() => run(performance.now()), fallbackMs);
  return () => {
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
  };
}

/** True when animation frames are actually being delivered right now. */
export function framesAreLive(within = 250) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), within);
    requestAnimationFrame(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}
