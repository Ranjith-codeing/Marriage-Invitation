# Background music

The site already has music: an original arrangement of **Pachelbel's Canon in D** (the composition is
public domain) for soft piano, warm strings, cello and celesta, synthesised live in the browser
(`src/audio/score.js`). It follows the film:
- the Canon's bass and arpeggios open the film
- the melody moves through the variations as the story plays
- the strings join in counter-melody at "A new chapter begins…"
- the music settles while guests read
- gentle surf plays underneath on the beach scene

There are no audio files to download and no licensing concerns.

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

Music never autoplays with sound. It starts from **Open the invitation ♫**, the **Music** button or
**Settings**, and the choice is remembered for the browser session.
