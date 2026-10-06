/**
 * Centralised asset configuration. Paths are relative to /public and are
 * resolved against the deployed base path, so they work on GitHub Pages
 * project sites (https://user.github.io/<repo>/) without changes.
 */

export const assetUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const models = {
  groom: {
    url: 'models/groom.glb',
    heightMeters: 1.76, // the model is uniformly scaled to this standing height
    rotationY: 0, // radians — use Math.PI if your model faces -Z instead of +Z
    stripRootMotion: true, // keeps any "Walk" clip in place
  },
  bride: {
    url: 'models/bride.glb',
    heightMeters: 1.65,
    rotationY: 0,
    stripRootMotion: true,
  },
  /**
   * Clip names searched for in each GLB (case-insensitive; exact matches win,
   * then partial matches such as "Armature|Walk").
   */
  clips: {
    idle: ['Idle'],
    walk: ['Walk'],
    walkSlow: ['WalkSlow', 'Walk_Slow', 'SlowWalk'],
    lookAtPartner: ['LookAtPartner', 'LookAt'],
    smile: ['Smile'],
    weddingPose: ['WeddingPose'],
  },
  /** Seconds to wait for the models before continuing with the photo couple. */
  timeoutSeconds: 30,
};

/**
 * The couple as they appear in the 3D scene until groom.glb + bride.glb exist:
 * a background-removed photograph standing on the mandapam platform.
 *
 *   cutout       — transparent PNG/WebP of the two of you (background removed)
 *   topMeters    — height of the top of the tallest head above the platform
 *   heightMeters — real-world height the cutout image covers (top → bottom edge)
 *   flowers      — what stands in front of you:
 *                  'border' low floral border (for head-to-toe photos)
 *                  'bank'   waist-high flower bank (for photos cropped at the waist/thigh)
 *                  'none'
 */
export const couplePhoto = {
  cutout: 'images/couple/wedding-cutout.webp',
  topMeters: 1.74,
  heightMeters: 1.74,
  flowers: 'border',
};

/**
 * Background music. The built-in score (src/audio/score.js) is always
 * available; drop your own track at public/audio/wedding-music.mp3 and guests
 * can switch between "Score" and "Song". `default` picks what plays first.
 */
export const audio = {
  music: 'audio/wedding-music.mp3',
  volume: 0.55, // song volume
  scoreVolume: 0.5, // built-in score volume
  default: 'score', // 'score' | 'song' (song only if the file exists)
};

/** Portrait for the "Our Story" section (shown only if the file exists). */
export const portraits = {
  couple: 'images/couple/portrait-watercolour.webp',
};
