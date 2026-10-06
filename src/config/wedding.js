/**
 * ─────────────────────────────────────────────────────────────
 *  WEDDING CONFIGURATION — the only file you need to edit.
 * ─────────────────────────────────────────────────────────────
 *  Any value that still starts with "ADD" is treated as "not yet
 *  announced": the site shows an elegant "To be announced" label
 *  and hides buttons (maps, calendar, directions) that depend on it.
 *  Times are Indian Standard Time (+05:30).
 *
 *  This file is also read at build time (vite.config.js) to fill the
 *  page <title> and the link-preview text used by WhatsApp / social apps.
 */

export const weddingDetails = {
  groom: 'Ranjith R',
  bride: 'Jayachitra S',

  // Wedding (muhurtham)
  weddingDate: 'Sunday, 22 November 2026',
  weddingTime: '6:00 – 7:30 AM',
  weddingVenue: 'Arulmigu Sri Kalyana Vinayagar Kovil',
  weddingAddress: 'Suleswaranpatti, Pollachi – Valparai Road, Pollachi, Tamil Nadu',
  weddingMapUrl: 'https://maps.app.goo.gl/SPWLU4u996e4yPBt5', // "Open in Google Maps"
  weddingLocation: { lat: 10.6230959, lng: 77.0147345 }, //     embedded map + directions
  weddingStartISO: '2026-11-22T06:00:00+05:30', //              countdown + "Add to calendar"
  weddingEndISO: '2026-11-22T07:30:00+05:30',

  // Reception
  receptionDate: 'Saturday, 21 November 2026',
  receptionTime: '6:00 – 9:00 PM',
  receptionVenue: 'Sukra Mahal',
  receptionAddress: 'Suleswaranpatti, Pollachi – Valparai Road, Pollachi, Tamil Nadu',
  receptionMapUrl: 'https://maps.app.goo.gl/2BYHFNhgZtPMLwHm6',
  receptionLocation: { lat: 10.6258515, lng: 77.0138474 },
  receptionStartISO: '2026-11-21T18:00:00+05:30',
  receptionEndISO: '2026-11-21T21:00:00+05:30',
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
 * Events shown on the "Celebrations" cards and in "Add to calendar". Each pulls
 * from weddingDetails above, so you normally don't need to touch this. Add more
 * events (Nichayathartham, Mehendi, Sangeet…) by appending objects.
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
    mapUrl: weddingDetails.receptionMapUrl,
    location: weddingDetails.receptionLocation,
    start: weddingDetails.receptionStartISO,
    end: weddingDetails.receptionEndISO,
  },
  {
    id: 'wedding',
    title: 'Wedding Ceremony',
    subtitle: 'Muhurtham',
    date: weddingDetails.weddingDate,
    time: weddingDetails.weddingTime,
    venue: weddingDetails.weddingVenue,
    address: weddingDetails.weddingAddress,
    mapUrl: weddingDetails.weddingMapUrl,
    location: weddingDetails.weddingLocation,
    start: weddingDetails.weddingStartISO,
    end: weddingDetails.weddingEndISO,
  },
];

/** Venue cards, each with an embedded map, "Get Directions" and "Open in Google Maps". */
export const venues = events.map((ev) => ({
  label: ev.title,
  date: ev.date,
  time: ev.time,
  name: ev.venue,
  address: ev.address,
  mapUrl: ev.mapUrl,
  location: ev.location,
  mapEmbed: true,
  notes: '',
}));

/**
 * Optional public URL of the site, e.g. 'https://username.github.io/wedding-invitation/'.
 * Only used to build absolute link-preview image URLs (og:image).
 */
export const site = {
  url: 'https://ranjith-codeing.github.io/Marriage-Invitation/',
  shareImage: 'images/og-cover.jpg', // put a 1200×630 photo at public/images/og-cover.jpg
};
