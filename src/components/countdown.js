import { events, weddingDetails as W } from '../config/wedding.js';
import { isAnnounced } from '../utils/math.js';

/** Live countdown to the muhurtham + "Add to calendar" (.ics built in the browser). */
export function initCountdown() {
  const el = document.querySelector('[data-countdown]');
  if (el) {
    const target = Date.parse(el.dataset.countdown);
    const units = [['Days', 86400000], ['Hours', 3600000], ['Minutes', 60000], ['Seconds', 1000]];
    let timer = 0;
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
    timer = setInterval(render, 1000);
    render();
  }

  // One .ics file with every event that has a start time (reception + wedding)
  document.querySelector('[data-add-calendar]')?.addEventListener('click', () => {
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const stamp = fmt(new Date());
    const vevents = events
      .filter((ev) => !Number.isNaN(Date.parse(ev.start)))
      .map((ev) => {
        const start = new Date(ev.start);
        const end = Number.isNaN(Date.parse(ev.end)) ? new Date(start.getTime() + 3 * 3600000) : new Date(ev.end);
        const location = [ev.venue, ev.address].filter(isAnnounced).join(', ');
        return [
          'BEGIN:VEVENT',
          `UID:${ev.id}-${fmt(start)}@ranjith-jayachitra`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${fmt(start)}`,
          `DTEND:${fmt(end)}`,
          `SUMMARY:${esc(`${ev.title} — ${W.groom} & ${W.bride}`)}`,
          location ? `LOCATION:${esc(location)}` : '',
          ev.mapUrl ? `URL:${ev.mapUrl}` : '',
          ev.mapUrl ? `DESCRIPTION:${esc(`Map: ${ev.mapUrl}`)}` : '',
          'END:VEVENT',
        ].filter(Boolean);
      });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ranjith & Jayachitra//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', ...vevents.flat(), 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'ranjith-jayachitra-wedding.ics' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
