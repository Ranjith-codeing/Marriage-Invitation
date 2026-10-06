import { weddingDetails as W } from '../config/wedding.js';
import { isAnnounced } from '../utils/math.js';

/** Live countdown (only rendered when weddingDateISO is set). */
export function initCountdown() {
  const iso = W.weddingDateISO;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  // A date-only value counts down to the start of that day (guest's local time)
  const startOf = () => (dateOnly ? new Date(`${iso}T00:00:00`) : new Date(iso));

  const el = document.querySelector('[data-countdown]');
  if (el) {
    const target = startOf().getTime();
    const units = [['Days', 86400000], ['Hours', 3600000], ['Minutes', 60000], ['Seconds', 1000]];
    const render = () => {
      let diff = target - Date.now();
      if (diff <= 0) {
        el.innerHTML = '<p class="countdown__done">Today we begin our forever ✨</p>';
        clearInterval(timer);
        return;
      }
      el.innerHTML = units
        .map(([label, ms]) => {
          const v = Math.floor(diff / ms);
          diff -= v * ms;
          return `<div class="countdown__unit"><span class="countdown__num">${String(v).padStart(2, '0')}</span><span class="countdown__label">${label}</span></div>`;
        })
        .join('');
    };
    const timer = setInterval(render, 1000);
    render();
  }

  // "Add to calendar" — generates an .ics file in the browser (no server needed)
  document.querySelector('[data-add-calendar]')?.addEventListener('click', () => {
    const start = startOf();
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const day = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const when = dateOnly
      ? [`DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(new Date(start.getTime() + 86400000))}`]
      : [`DTSTART:${fmt(start)}`, `DTEND:${fmt(new Date(start.getTime() + 3 * 3600000))}`];
    const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1');
    const location = [W.weddingVenue, W.weddingAddress].filter(isAnnounced).join(', ');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//EN', 'BEGIN:VEVENT',
      `UID:${fmt(start)}-wedding@invitation`, `DTSTAMP:${fmt(new Date())}`,
      ...when,
      `SUMMARY:${esc(`Wedding of ${W.groom} & ${W.bride}`)}`,
      location ? `LOCATION:${esc(location)}` : '',
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'wedding.ics' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
