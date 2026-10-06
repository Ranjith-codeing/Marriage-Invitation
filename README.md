# Ranjith R & Jayachitra S — Wedding Invitation

A cinematic, scroll-driven 3D wedding invitation. As the guest scrolls, the camera travels down a golden-hour garden path: wind-swept grass, coconut palms, butterflies, and flower beds of roses, jasmine and marigolds that bloom as you pass under the floral arches. It arrives at a South Indian mandapam that assembles itself, where Ranjith and Jayachitra stand in their wedding attire under a silk canopy. Petals shower over them, and the film ends under a moonlit sky as glowing lanterns rise.

**Live site:** https://ranjith-codeing.github.io/Marriage-Invitation/ (once GitHub Pages is enabled; see *Deploying to GitHub Pages*).

It's a fully static site (Vite + Three.js + GSAP), so it runs on GitHub Pages with no server.

- **Reception:** Saturday, 21 November 2026, 6:00 – 9:00 PM · Sukra Mahal, Pollachi
- **Wedding (Muhurtham):** Sunday, 22 November 2026, 6:00 – 7:30 AM · Arulmigu Sri Kalyana Vinayagar Kovil, Pollachi

Clicking **Enter Our Story** plays the whole film automatically, from the first scene to the last (see *Guided story*).

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

Requires Node.js 18+ (20 recommended).

---

## Editing wedding details

**Everything is in one file: [`src/config/wedding.js`](src/config/wedding.js).**

| What | Where |
|---|---|
| Names, dates, times, venues, addresses | `weddingDetails` |
| Google Maps links + exact pins | `weddingMapUrl` / `receptionMapUrl` and `weddingLocation` / `receptionLocation` (lat, lng) |
| Countdown + "Add to calendar" | `weddingStartISO` / `weddingEndISO`, `receptionStartISO` / `receptionEndISO` (India time, `+05:30`) |
| Story timeline | `story` |
| Event cards (order, extra events) | `events` |
| Venue cards & maps | `venues` |
| Captions ("Two hearts…" etc.) | `copy` |
| Link-preview image URL | `site` |

Any value that starts with **`ADD`** (like `'ADD TIME'`) shows as *"To be announced"*, and buttons that depend on it stay hidden until it's filled in. All details are currently filled in. The address lines were derived from the map pins (Pollachi – Valparai Road, Suleswaranpatti), so adjust the wording if you prefer a different form.

---

## Where to put your files

```
public/
├── images/
│   ├── couple/
│   │   ├── wedding-cutout.webp       ← background-removed photo shown in the 3D scene
│   │   └── portrait-watercolour.webp ← portrait in the "Our Story" section
│   ├── gallery/                 ← gallery photos (any number, any names)
│   └── og-cover.jpg             ← optional 1200×630 link-preview image
├── models/
│   ├── groom.glb                ← optional 3D models (see public/models/README.md)
│   └── bride.glb
├── audio/
│   └── wedding-music.mp3        ← optional background music
reference-photos/                ← private originals (git-ignored, never published)
```

New files are picked up automatically, with no code edits needed: a small Vite plugin ([`vite-plugins/publicManifest.js`](vite-plugins/publicManifest.js)) lists what's in `public/` at build time.

### Gallery photos

Drop JPG/PNG/WebP files into `public/images/gallery/`. They're shown in file-name order, so prefix them with `01-`, `02-`, … to control the sequence. Captions and alt text are optional and go in [`src/data/gallery.js`](src/data/gallery.js). Photos keep their natural shape (no cropping or distortion). Resize them to about 2000 px on the long edge before adding, to keep the site fast.

### How your photos are used

| Photo | Used for |
|---|---|
| `reference-photos/*` | Private originals. Git-ignored, never published |
| `public/images/couple/wedding-cutout.webp` | The wedding-attire portrait with its background removed (done locally on this computer). Stands on the mandapam platform in the 3D scene, turning gently to face the camera, colour-matched to each scene's light |
| `public/images/couple/portrait-watercolour.webp` | The framed portrait in "Our Story" |
| `public/images/gallery/*` | The gallery + lightbox (9 photos, optimised to WebP) |

**Using a different photo in the scene:**

1. Make a transparent cutout. Use any background remover (remove.bg, Canva, Photoshop), or run the bundled local tool:
   ```bash
   npm install --no-save @imgly/background-removal-node sharp@^0.33
   node tools/make-cutout.mjs reference-photos/your-photo.jpg public/images/couple/wedding-cutout.webp
   ```
2. In `src/config/assets.js` → `couplePhoto`, set `heightMeters` to the real height the photo covers: about `1.74` for a head-to-toe photo like the current one, about `0.9` for a mid-thigh crop. Set `flowers` to `'border'` (low flowers at your feet, for full-length photos) or `'bank'` (a waist-high flower bank that hides a cropped edge).

---

## 3D models (optional upgrade)

The site supports fully rigged, animated 3D characters. Put **`groom.glb`** and **`bride.glb`** in `public/models/`, and they replace the photo couple automatically. They play `Idle`, turn to each other with `LookAtPartner`, and use `Smile` and `WeddingPose`.

These models need a separate 3D step: an image-to-3D tool or a 3D artist, plus rigging, for example in Mixamo. A believable, rigged likeness can't be generated from a single photo inside a web project. The full spec (format, scale, clip names, compression) and how to get models made are in [`public/models/README.md`](public/models/README.md). If either file is missing or broken, the site quietly keeps using the photo.

---

## Guided story (auto-play)

**Enter Our Story** plays the film for the guest. It scrolls at a cinematic pace set per scene (slower for the emotional moments), glides into and pauses on the invitation card, story, celebrations and venues so they can be read, and finishes at the final night scene. It takes about a minute and a half.

- Any scroll, swipe, tap or key press hands control back to the guest instantly.
- A floating **Play / Pause** button resumes the tour; at the end it becomes **Replay**.
- Paces live in `src/components/autoplay.js` (`PACE`). Reading stops are marked with `data-autoplay-hold="seconds"` in `src/components/content.js`.
- With *reduce motion* enabled, the button simply jumps to the story without auto-scrolling.

---

## Music

Put an MP3 at `public/audio/wedding-music.mp3`. Guests then get **"Open the invitation ♫"** or **"Enter without music"**, plus a Music / Pause button. Nothing ever autoplays with sound, and the choice is remembered for the session. Without the file, all music controls hide themselves.

---

## Deploying to GitHub Pages

The included workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) builds and publishes the site on every push to `main`.

This project is connected to **`git@github.com:Ranjith-codeing/Marriage-Invitation.git`**.

1. On GitHub, open the repository's **Settings → Pages → Build and deployment → Source: GitHub Actions** (one-time).
2. Push to `main`. The **Actions** tab shows "Deploy to GitHub Pages" turning green (about 1 minute).
3. Your invitation is live at **https://ranjith-codeing.github.io/Marriage-Invitation/**.

To set it up from scratch somewhere else: `git init`, `git add .`, `git commit -m "Wedding invitation"`, `git branch -M main`, `git remote add origin <repo-url>`, `git push -u origin main`, then step 1 above.

To update later, edit and run `git add . && git commit -m "Update details" && git push`. The site redeploys automatically.

**Link previews (WhatsApp etc.):** sharing the link shows `public/images/og-cover.jpg`, a 1200×630 invitation card with your portrait, names and both events, plus a description listing both events. Replace the image file to change it. `site.url` in `wedding.js` must match the live URL.

> The site uses relative paths (`base: './'`) and no client-side routing, so it works under any repository name, and on a custom domain, without changes.

---

## Architecture

```
src/
├── main.js                  boot: loader → 3D scene → reveals; static fallback
├── config/
│   ├── wedding.js           ALL wedding content (names, dates, venues, story, copy)
│   └── assets.js            asset paths, model/photo/music settings
├── data/                    public-asset manifest helpers, gallery captions
├── components/              DOM: content renderer, loader, nav, guided auto-play, music, gallery, countdown + calendar, cursor glow
├── animations/
│   ├── scrollTimeline.js    scroll position → continuous "film time"
│   └── reveals.js           GSAP ScrollTrigger + SplitText reveals (letter-by-letter names, word captions)
├── scenes/
│   ├── Experience.js        renderer, sky-baked image lighting, post-processing, render loop, adaptive quality
│   ├── Director.js          monotone-spline keyframe interpolation + cinematic smoothing
│   ├── keyframes.js         the choreography: camera path, light, atmosphere, story beats per section
│   ├── post/DofPass.js      single-pass bokeh depth of field
│   ├── characters/          PhotoCouple (cutout + floral border), GLBCharacter (models), loader
│   └── world/               Sky, Clouds, Horizon (gopuram), Ground, Grass, Garden, flora (rose/jasmine/
│                            marigold geometry), wind (GPU sway), Mandapam, FairyLights, Butterflies,
│                            NightSky, Lanterns, Petals
├── utils/                   device/quality detection, math, procedural canvas textures
└── styles/main.css
```

**How the film works:** every page section has a `data-scene` name. `ScrollTimeline` turns the scroll position into a continuous value, and `Director` interpolates [`keyframes.js`](src/scenes/keyframes.js) at that value with a monotone cubic spline, so the camera glides through every beat instead of stopping at each one. It drives the camera orbit, sky colours, fog, sun, lamps, how far the garden has bloomed, how much of the mandapam is built, depth of field, the petal shower and the lantern release, and eases toward the result every frame, so even fast scrolling looks smooth. To re-choreograph a shot, edit a keyframe.

**Rendering:** the sky is re-baked into an environment map as its colours change, so brass, gold and the marble floor reflect the sunset and the night. A warm side-lit key light and cool ambient light give depth. On capable devices a post-processing chain adds MSAA anti-aliasing, cinematic depth of field (on the close-ups) and bloom. Grass, palm fronds, bushes, flowers, garlands and the silk canopy all sway in one coherent GPU wind, and a fine film grain finishes the frame.

**Performance:** the 3D code loads as a separate chunk. Quality tiers (high, medium, low) are picked from the device and control pixel ratio, post-processing, shadows, grass density and particle counts. If the frame rate drops, the scene steps its quality down by itself in three stages. Petals, stars, fireflies, grass and wind run entirely on the GPU, and textures (marble, silk, bark, monogram, clouds, butterflies) are drawn procedurally, so there's nothing extra to download. You can force a tier with `?quality=low|medium|high`.

**Accessibility:** semantic sections, skip link, keyboard-navigable menu and lightbox, visible focus states and alt text. With `prefers-reduced-motion` (or no WebGL), the site serves a calm static version with all text visible and no 3D.
