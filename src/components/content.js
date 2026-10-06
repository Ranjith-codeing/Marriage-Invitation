import { weddingDetails as W, copy, story, events, venues } from '../config/wedding.js';
import { assetUrl, portraits } from '../config/assets.js';
import { galleryImages, available } from '../data/publicAssets.js';
import { isAnnounced, firstName, escapeHtml as e } from '../utils/math.js';

const groom = firstName(W.groom);
const bride = firstName(W.bride);

/** Shows the value, or an elegant "To be announced" when it's still a placeholder. */
const tba = (v, label = 'To be announced') => (isAnnounced(v) ? e(v) : `<span class="tba">${label}</span>`);

/** Where a venue is: exact coordinates when known, otherwise its name + address. */
const place = (v) => (v.location ? `${v.location.lat},${v.location.lng}` : `${v.venue || v.name}, ${v.address}`);
const hasPlace = (v) => !!v.location || isAnnounced(v.address);

/** Turn-by-turn directions from the guest's location to the venue. */
export const mapsDirections = (v) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place(v))}`;
const mapsEmbed = (v) => `https://maps.google.com/maps?q=${encodeURIComponent(place(v))}&z=16&output=embed`;

const ornament = `<svg class="ornament" viewBox="0 0 120 12" aria-hidden="true"><path d="M0 6h48M72 6h48" stroke="currentColor" stroke-width=".6"/><path d="M60 1l5 5-5 5-5-5z" fill="none" stroke="currentColor" stroke-width=".8"/><circle cx="60" cy="6" r="1.2" fill="currentColor"/></svg>`;

export const navLinks = [
  ['invitation', 'Invitation'],
  ['story', 'Our Story'],
  ['events', 'Celebrations'],
  ['venue', 'Venue'],
  ...(galleryImages.length ? [['gallery', 'Gallery']] : []),
];

function header() {
  return `
  <header class="site-header" data-header>
    <a class="monogram" href="#home" aria-label="${e(groom)} and ${e(bride)} — back to top">${e(groom[0])}<em>&amp;</em>${e(bride[0])}</a>
    <nav class="site-nav" id="site-nav" aria-label="Sections">
      <ul>${navLinks.map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`).join('')}</ul>
    </nav>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle>
      <span class="sr-only">Menu</span><span class="menu-toggle__bar"></span><span class="menu-toggle__bar"></span>
    </button>
  </header>
  <div class="scroll-progress" aria-hidden="true"><span data-progress></span></div>`;
}

function hero() {
  return `
  <section class="hero" id="home" data-scene="hero" aria-label="${e(groom)} and ${e(bride)}">
    <div class="hero__inner">
      <p class="hero__tamil" lang="ta" data-hero-item>${e(copy.tamilTagline)}</p>
      <p class="eyebrow" data-hero-item>${e(copy.heroKicker)}</p>
      <h1 class="hero__names">
        <span class="hero__name" data-hero-item>${e(groom)}</span>
        <span class="hero__amp" data-hero-item aria-label="and">&amp;</span>
        <span class="hero__name" data-hero-item>${e(bride)}</span>
      </h1>
      ${isAnnounced(W.weddingDate) ? `<p class="hero__date" data-hero-item>${e(W.weddingDate)}</p>` : ''}
      <a class="btn btn--ghost hero__cta" href="#prologue" data-hero-item data-autoplay>Enter Our Story <span aria-hidden="true">↓</span></a>
    </div>
  </section>`;
}

/** Tall section with a sticky caption while the 3D scene plays behind it. */
function filmSection(id, scene, len, inner, label) {
  return `
  <section class="film" id="${id}" data-scene="${scene}" style="--len:${len}" aria-label="${e(label)}">
    <div class="film__sticky">${inner}</div>
  </section>`;
}

function filmSections() {
  const beats = copy.prologue.map((line, i) => `<p class="beat beat--${i}" data-beat>${e(line)}</p>`).join('');
  return [
    filmSection('prologue', 'prologue', 3, `<div class="beats">${beats}</div>`, 'Prologue'),
    filmSection('walk', 'walk', 2, `<p class="caption" data-caption><span>${e(groom)}</span> <em>&amp;</em> <span>${e(bride)}</span></p>`, 'Walking together'),
    filmSection('garden', 'garden', 2, `<p class="caption caption--large" data-caption>${e(copy.gardenLine)}</p>`, 'The garden'),
    filmSection('mandapam', 'mandapam', 2, `<p class="caption" data-caption>${e(copy.mandapamLine)}</p>`, 'The mandapam'),
    filmSection('moment', 'moment', 2.5, `<p class="caption caption--large" data-caption>${e(copy.momentLine)}</p>`, 'A new chapter'),
  ].join('');
}

function detailCard(label, value, sub = '') {
  return `
  <article class="detail-card reveal">
    <h3 class="detail-card__label">${label}</h3>
    <p class="detail-card__value">${value}</p>
    ${sub ? `<p class="detail-card__sub">${sub}</p>` : ''}
  </article>`;
}

function invitation() {
  const hasStart = !Number.isNaN(Date.parse(W.weddingStartISO));
  const hasCalendar = events.some((ev) => !Number.isNaN(Date.parse(ev.start)));
  return `
  <section class="panel" id="invitation" data-scene="invitation" aria-labelledby="invitation-title">
    <div class="panel__inner panel__inner--center" data-autoplay-hold="5">
      <p class="eyebrow reveal">${e(copy.tamilTagline)}</p>
      <h2 class="invite__names reveal" id="invitation-title">${e(W.groom)} <em>&amp;</em> ${e(W.bride)}</h2>
      <div class="reveal">${ornament}</div>
      <p class="invite__lead reveal">${e(copy.invitationLine1)}<br />${e(copy.invitationLine2)}</p>

      <div class="details-grid">
        ${events
          .map((ev) =>
            detailCard(
              e(ev.title),
              tba(ev.venue),
              `<span class="detail-card__date">${tba(ev.date)}</span><span class="detail-card__time">${isAnnounced(ev.time) ? e(ev.time) : `Time ${tba(ev.time, 'to be announced')}`}</span>`
            )
          )
          .join('')}
      </div>

      ${hasStart ? `<p class="countdown__title reveal">Counting down to the muhurtham</p><div class="countdown reveal" data-countdown="${e(W.weddingStartISO)}" aria-label="Countdown to the wedding"></div>` : ''}
      ${hasCalendar ? `<button type="button" class="btn btn--ghost reveal" data-add-calendar>Add to calendar</button>` : ''}
    </div>
  </section>`;
}

function storySection() {
  const photo = available.couplePortrait
    ? `<figure class="couple-photo reveal" data-tilt>
         <img src="${assetUrl(portraits.couple)}" alt="Watercolour portrait of ${e(groom)} and ${e(bride)}" loading="lazy" decoding="async" />
         <figcaption>${e(groom)} <em>&amp;</em> ${e(bride)}</figcaption>
       </figure>`
    : '';
  return `
  <section class="panel" id="story" data-scene="story" aria-labelledby="story-title">
    <div class="panel__inner">
      <p class="eyebrow reveal">Our Story</p>
      <h2 class="section-title reveal" id="story-title">Two lives. Two journeys.<br /><em>One beautiful story.</em></h2>
      <div class="story-layout ${photo ? 'has-photo' : ''}" data-autoplay-hold="3">
        ${photo}
        <ol class="timeline">
          ${story
            .map(
              (s) => `
            <li class="timeline__item reveal">
              ${s.when ? `<p class="timeline__when">${e(s.when)}</p>` : ''}
              <h3 class="timeline__title">${e(s.title)}</h3>
              <p class="timeline__text">${e(s.text)}</p>
            </li>`
            )
            .join('')}
        </ol>
      </div>
    </div>
  </section>`;
}

function eventsSection() {
  return `
  <section class="panel" id="events" data-scene="events" aria-labelledby="events-title">
    <div class="panel__inner">
      <p class="eyebrow reveal">Celebrations</p>
      <h2 class="section-title reveal" id="events-title">Join us as we <em>celebrate</em></h2>
      <div class="events" data-autoplay-hold="4">
        ${events
          .map(
            (ev) => `
          <article class="event-card reveal">
            <p class="event-card__subtitle">${e(ev.subtitle || '')}</p>
            <h3 class="event-card__title">${e(ev.title)}</h3>
            <dl class="event-card__meta">
              <div><dt>Date</dt><dd>${tba(ev.date)}</dd></div>
              <div><dt>Time</dt><dd>${tba(ev.time)}</dd></div>
              <div><dt>Venue</dt><dd>${tba(ev.venue)}</dd></div>
            </dl>
            ${hasPlace(ev) ? `<a class="btn btn--ghost btn--small" href="${mapsDirections(ev)}" target="_blank" rel="noopener">Get Directions</a>` : ''}
          </article>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function venueSection() {
  return `
  <section class="panel" id="venue" data-scene="venue" aria-labelledby="venue-title">
    <div class="panel__inner">
      <p class="eyebrow reveal">The Venues</p>
      <h2 class="section-title reveal" id="venue-title">Where we <em>celebrate</em></h2>
      <div class="venues" data-autoplay-hold="4">
        ${venues
          .map((v) => {
            const known = hasPlace(v);
            const when = [v.date, v.time].filter(isAnnounced).map(e).join(' · ');
            return `
          <article class="venue reveal">
            <div class="venue__map">
              ${
                known && v.mapEmbed
                  ? `<iframe title="Map showing ${e(v.name)}" data-src="${mapsEmbed(v)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
                  : `<div class="venue__placeholder" aria-hidden="true">${ornament}<p>Map coming soon</p></div>`
              }
            </div>
            <div class="venue__text">
              <p class="venue__label">${e(v.label)}</p>
              <h3 class="venue__name">${tba(v.name, 'Venue to be announced')}</h3>
              ${when ? `<p class="venue__when">${when}</p>` : ''}
              <p class="venue__address">${isAnnounced(v.address) ? e(v.address) : 'Full address coming soon.'}</p>
              ${v.notes ? `<p class="venue__notes">${e(v.notes)}</p>` : ''}
              <div class="venue__actions">
                ${known ? `<a class="btn btn--gold btn--small" href="${mapsDirections(v)}" target="_blank" rel="noopener">Get Directions</a>` : ''}
                ${v.mapUrl ? `<a class="btn btn--ghost btn--small" href="${e(v.mapUrl)}" target="_blank" rel="noopener">Open in Google Maps</a>` : ''}
              </div>
            </div>
          </article>`;
          })
          .join('')}
      </div>
    </div>
  </section>`;
}

function gallerySection() {
  if (!galleryImages.length) return '';
  return `
  <section class="panel" id="gallery" data-scene="gallery" aria-labelledby="gallery-title">
    <div class="panel__inner">
      <p class="eyebrow reveal">Gallery</p>
      <h2 class="section-title reveal" id="gallery-title">Moments <em>we treasure</em></h2>
      <ul class="gallery" data-gallery>
        ${galleryImages
          .map(
            (img, i) => `
          <li class="gallery__item reveal">
            <button type="button" class="gallery__button" data-index="${i}" aria-label="Open photo ${i + 1} of ${galleryImages.length}${img.caption ? ': ' + e(img.caption) : ''}">
              <img src="${assetUrl(img.path)}" alt="${e(img.alt)}" loading="lazy" decoding="async" />
            </button>
          </li>`
          )
          .join('')}
      </ul>
    </div>
    <dialog class="lightbox" data-lightbox aria-label="Photo viewer">
      <figure class="lightbox__figure">
        <img class="lightbox__img" alt="" data-lightbox-img />
        <figcaption class="lightbox__caption" data-lightbox-caption></figcaption>
      </figure>
      <button type="button" class="lightbox__btn lightbox__close" data-lightbox-close aria-label="Close">×</button>
      <button type="button" class="lightbox__btn lightbox__prev" data-lightbox-prev aria-label="Previous photo">‹</button>
      <button type="button" class="lightbox__btn lightbox__next" data-lightbox-next aria-label="Next photo">›</button>
      <p class="lightbox__count" data-lightbox-count aria-live="polite"></p>
    </dialog>
  </section>`;
}

function finale() {
  return `
  <section class="film film--finale" id="finale" data-scene="final" style="--len:2" aria-label="With love">
    <div class="film__sticky">
      <div class="finale">
        <p class="finale__line" data-finale>${e(copy.finalLine)}</p>
        <p class="finale__names" data-finale>${e(groom)} <em>&amp;</em> ${e(bride)}</p>
        <p class="finale__love" data-finale>${e(copy.signOff)} <span class="heart" aria-hidden="true">❤️</span></p>
      </div>
    </div>
  </section>
  <footer class="site-footer">
    <p>${e(W.groom)} &amp; ${e(W.bride)}</p>
  </footer>`;
}

function controls() {
  return `
  <div class="controls">
    <button type="button" class="control control--story" data-autoplay-control hidden aria-pressed="false">
      <span class="control__glyph" aria-hidden="true"></span>
      <span class="control__label" data-autoplay-label>Play story</span>
    </button>
    <button type="button" class="control control--source" data-music-source hidden>Score</button>
    <button type="button" class="control control--music" data-music hidden aria-pressed="false">
      <span class="control__icon" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="control__label" data-music-label>Music</span>
    </button>
    <button type="button" class="control control--top" data-back-to-top aria-label="Back to top" hidden>↑</button>
  </div>`;
}

export function renderContent(root) {
  root.innerHTML = `
    ${header()}
    <main id="main">
      ${hero()}
      ${filmSections()}
      ${invitation()}
      ${storySection()}
      ${eventsSection()}
      ${venueSection()}
      ${gallerySection()}
      ${finale()}
    </main>
    ${controls()}`;
}
