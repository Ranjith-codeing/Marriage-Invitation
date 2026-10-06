import * as THREE from 'three';
import { createGround } from '../world/Ground.js';
import { createHorizon } from '../world/Horizon.js';
import { createGrass } from '../world/Grass.js';
import { createGarden } from '../world/Garden.js';
import { createMandapam } from '../world/Mandapam.js';
import { createButterflies } from '../world/Butterflies.js';
import { createFairyLights } from '../world/FairyLights.js';
import { createPalms } from '../world/Palms.js';
import { createBeachGround, sandHeight } from '../world/BeachGround.js';
import { createOcean } from '../world/Ocean.js';
import { createBeachHorizon } from '../world/BeachHorizon.js';
import { createAisleDecor } from '../world/AisleDecor.js';
import { createPavilion } from '../world/Pavilion.js';
import { seededRandom } from '../../utils/math.js';
export { SCENARIOS } from './scenarios.js';

/** Garden: lawn & path, palms, flower beds and arches, the temple mandapam, a gopuram on the horizon. */
function gardenWorld(q) {
  const ground = createGround();
  const horizon = createHorizon();
  const grass = createGrass({ count: q.grass });
  const garden = createGarden({ density: q.flowers });
  const mandapam = createMandapam({ lights: q.lampLights });
  const butterflies = createButterflies({ count: q.butterflies });
  const fairy = createFairyLights({ crowns: garden.crowns, eaves: mandapam.eaves });
  const parts = [ground, horizon, grass, garden, mandapam, butterflies, fairy];
  return { parts, fairy };
}

/** Beach: dunes and a boardwalk aisle, palms, torches and bouquets, the sea, a pavilion with drapes, a lighthouse. */
function beachWorld(q) {
  const rand = seededRandom(64);
  const ground = createBeachGround();
  const ocean = createOcean({ detail: q.post ? 1 : 0.6 });
  const horizon = createBeachHorizon();
  const grass = createGrass({ count: Math.round(q.grass * 0.12), kind: 'dune', heightAt: sandHeight });
  const decor = createAisleDecor();
  const pavilion = createPavilion({ lights: q.lampLights });
  const specs = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (3.6 + rand() * 2.4);
    const z = 4 + i * 3.4 + rand() * 1.2;
    specs.push({ x, z, y: sandHeight(x, z) - 0.05, h: 5.4 + rand() * 2.6, lean: side * (0.4 + rand() * 0.6), leanZ: -0.3 - rand() * 0.5 });
  }
  for (let i = 0; i < 6; i++) {
    // a few palms near the shore, leaning out over the sand toward the sea
    const side = i % 2 ? 1 : -1;
    const x = side * (6.5 + rand() * 10);
    const z = -2 - rand() * 4;
    specs.push({ x, z, y: sandHeight(x, z) - 0.05, h: 6 + rand() * 2.5, lean: side * (0.6 + rand() * 0.8), leanZ: -1.2 - rand() * 1.2 });
  }
  const palms = createPalms(specs, { seed: 8 });
  const fairy = createFairyLights({ crowns: palms.crowns.slice(0, 14), eaves: pavilion.eaves });
  const parts = [ground, ocean, horizon, grass, decor, pavilion, fairy, { group: palms.group }];
  return { parts, fairy };
}

/**
 * Builds a scenario's world. Returns one group plus a single update() that
 * drives every part, and dispose() to free GPU memory when switching scenes.
 */
export function createWorld(name, q) {
  const { parts, fairy } = (name === 'beach' ? beachWorld : gardenWorld)(q);
  const group = new THREE.Group();
  group.name = `world-${name}`;
  for (const part of parts) group.add(part.group || part.mesh || part.points);
  return {
    name,
    group,
    setPixelRatio: (pr) => fairy.setPixelRatio(pr),
    update(s, time, dt, camera) {
      for (const part of parts) part.update?.(s, time, dt, camera);
    },
    dispose() {
      group.traverse((o) => {
        if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) {
          for (const key of ['map', 'alphaMap', 'normalMap']) m[key]?.dispose?.();
          if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u.value?.isTexture) u.value.dispose();
          m.dispose();
        }
      });
    },
  };
}
