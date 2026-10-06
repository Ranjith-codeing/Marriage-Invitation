import * as THREE from 'three';
import { cloudTexture } from '../../utils/textures.js';
import { seededRandom } from '../../utils/math.js';

/**
 * Soft cumulus clouds on the far horizon. They're tinted every frame from the
 * sky palette — glowing peach at golden hour, deep rose at dusk, faint
 * moonlit silhouettes at night — and drift slowly.
 */
export function createClouds({ count = 9 }) {
  const group = new THREE.Group();
  const rand = seededRandom(71);
  const maps = [cloudTexture(1), cloudTexture(2), cloudTexture(3)];
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const a = -1.25 + (i / Math.max(1, count - 1)) * 2.5 + (rand() - 0.5) * 0.2; // mostly ahead (−Z)
    const dist = 250 + rand() * 80;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: maps[i % maps.length], transparent: true, depthWrite: false, fog: false })
    );
    const w = 55 + rand() * 70;
    sprite.scale.set(w, w * (0.4 + rand() * 0.15), 1);
    sprite.position.set(Math.sin(a) * dist, 55 + rand() * 75, -Math.cos(a) * dist);
    sprite.renderOrder = -9;
    group.add(sprite);
    clouds.push({ sprite, drift: 0.4 + rand() * 0.8, x0: sprite.position.x });
  }

  const lit = new THREE.Color(), shade = new THREE.Color('#1f2742'), white = new THREE.Color('#ffffff');
  return {
    group,
    update(s, time) {
      lit.copy(s.skyHorizon).lerp(white, 0.35).lerp(s.sunColor, 0.25);
      lit.lerp(shade, s.night * 0.85);
      const opacity = 0.75 - s.night * 0.4;
      for (const c of clouds) {
        c.sprite.material.color.copy(lit);
        c.sprite.material.opacity = opacity;
        c.sprite.position.x = c.x0 + ((time * c.drift) % 60) - 30;
      }
    },
  };
}
