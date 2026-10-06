/**
 * ─────────────────────────────────────────────────────────────
 *  WEDDING CONFIGURATION — the only file you need to edit.
 * ─────────────────────────────────────────────────────────────
 *  Any value that still starts with "ADD" is treated as "not yet
 *  announced": the site shows an elegant "To be announced" label
 *  and hides buttons (maps, calendar, directions) that depend on it.
 *
 *  This file is also read at build time (vite.config.js) to fill the
 *  page <title> and the link-preview text used by WhatsApp / social apps.
 */

export const weddingDetails = {
  groom: 'Ranjith R',
  bride: 'Jayachitra S',

  weddingDate: 'Sunday, 22 November 2026',
  weddingTime: 'ADD TIME', //        e.g. '6:00 AM – 7:30 AM (Muhurtham)'
  weddingVenue: 'Kalyana Vinayagar Kovil',
  weddingAddress: 'ADD ADDRESS', //  full address incl. town — enables the map & "Get Directions"

  receptionDate: 'Saturday, 21 November 2026',
  receptionTime: 'ADD TIME', //      e.g. '6:30 PM onwards'
  receptionVenue: 'Sukra Mahal',
  receptionAddress: 'ADD ADDRESS',

  /**
   * Used for the live countdown and "Add to calendar".
   *   Date only  → '2026-11-22'                   (all-day event)
   *   With time  → '2026-11-22T06:00:00+05:30'    (exact muhurtham time)
   * Leave empty ('') to hide both.
   */
  weddingDateISO: '2026-11-22',
};

/** Words & small copy used throughout the site. */
export const copy = {
  tamilTagline: 'திருமண அழைப்பிதழ்', // "Wedding Invitation" in Tamil
  heroKicker: 'Our Wedding',
  invitationLine1: 'Together with our families,',
  invitationLine2: 'we invite you to celebrate our wedding.',
  prologue: ['Two hearts…', 'Two journeys…', 'One beautiful beginning.'],
  gardenLine: 'And then, their paths crossed…',
  mandapamLine: 'Two families. One celebration.',
  momentLine: 'A new chapter begins…',
  finalLine: "We can't wait to celebrate with you.",
  signOff: 'With Love',
};

/**
 * "Our Story" timeline. Replace with your own milestones whenever you like —
 * add or remove entries freely. `when` is optional.
 */
export const story = [
  { when: '', title: 'Two lives', text: 'Growing up in different places, with different dreams — each quietly becoming who they were meant to be.' },
  { when: '', title: 'Two journeys', text: 'Paths that wandered, turned and, unknowingly, drew closer with every step.' },
  { when: '', title: 'One beautiful story', text: 'Blessed by our families, we now begin the most beautiful chapter of all — together.' },
];

/**
 * Events shown on the "Celebrations" timeline. Each pulls from weddingDetails
 * above, so you normally don't need to touch this. Add more events
 * (Nichayathartham, Mehendi, Sangeet…) by appending objects.
 */
export const events = [
  {
    id: 'reception',
    title: 'Reception',
    subtitle: 'An evening of celebration',
    date: weddingDetails.receptionDate,
    time: weddingDetails.receptionTime,
    venue: weddingDetails.receptionVenue,
    address: weddingDetails.receptionAddress,
  },
  {
    id: 'wedding',
    title: 'Wedding Ceremony',
    subtitle: 'Muhurtham',
    date: weddingDetails.weddingDate,
    time: weddingDetails.weddingTime,
    venue: weddingDetails.weddingVenue,
    address: weddingDetails.weddingAddress,
  },
];

/**
 * Venue section — one entry per venue. `mapEmbed: true` shows an embedded
 * Google Map once a real address is provided (no API key needed).
 */
export const venues = [
  { label: 'Wedding · 22 November', name: weddingDetails.weddingVenue, address: weddingDetails.weddingAddress, mapEmbed: true, notes: '' },
  { label: 'Reception · 21 November', name: weddingDetails.receptionVenue, address: weddingDetails.receptionAddress, mapEmbed: true, notes: '' },
];

/**
 * Optional public URL of the site, e.g. 'https://username.github.io/wedding-invitation/'.
 * Only used to build absolute link-preview image URLs (og:image).
 */
export const site = {
  url: '',
  shareImage: 'images/og-cover.jpg', // put a 1200×630 photo at public/images/og-cover.jpg
};
