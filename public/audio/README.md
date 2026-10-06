# Background music

The site already has music: an original **background score** composed and played live in the browser
(`src/audio/score.js`), in raga Kalyani: tanpura drone, santoor/veena melodies, a bansuri love theme,
strings, temple bells and a soft mridangam pulse. It follows the film, quiet in the prologue, fuller at
the mandapam, the flute theme at "A new chapter begins…", softer while guests read the details. There
are no audio files to download and no licensing concerns.

## Adding your own song (optional)

Place a track here as:

```
public/audio/wedding-music.mp3
```

- The music control then shows a **Score / Song** switch so guests can choose.
  Set which plays first in `src/config/assets.js` → `audio.default` (`'score'` or `'song'`).
- Keep it under ~5 MB (128–160 kbps MP3 is plenty).
- The site is public, so only use music you have the right to publish (your own recording,
  a licensed track, or royalty-free music).

Music never autoplays with sound. It starts from **Open the invitation ♫** or the **Music** button,
and the choice is remembered for the browser session.
