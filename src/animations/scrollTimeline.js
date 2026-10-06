/**
 * Converts the page scroll position into a continuous "film time" t:
 * section i spans [i, i+1). The scroll anchor slides from the top of the
 * viewport (start of page) to the bottom (end of page), so the first and
 * last sections both play from 0 → 1 completely.
 */
export class ScrollTimeline {
  constructor(sections) {
    this.sections = sections; // [{ name, el }]
    this.bounds = [];
    this.measure = this.measure.bind(this);
    this.measure();
    window.addEventListener('resize', this.measure, { passive: true });
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(this.measure);
      this.ro.observe(document.body);
    }
  }

  measure() {
    const y = window.scrollY;
    this.bounds = this.sections.map(({ el }) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + y, height: Math.max(1, r.height) };
    });
    this.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  /** Index of a section by data-scene name (or -1). */
  indexOf(name) {
    return this.sections.findIndex((s) => s.name === name);
  }

  get t() {
    const y = window.scrollY;
    const anchor = y + window.innerHeight * Math.min(1, y / this.maxScroll);
    const b = this.bounds;
    for (let i = b.length - 1; i >= 0; i--) {
      if (anchor >= b[i].top) return i + Math.min(1, (anchor - b[i].top) / b[i].height);
    }
    return 0;
  }

  get progress() {
    return Math.min(1, Math.max(0, window.scrollY / this.maxScroll));
  }
}
