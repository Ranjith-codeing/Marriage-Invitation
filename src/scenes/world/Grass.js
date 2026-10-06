import * as THREE from 'three';
import { seededRandom } from '../../utils/math.js';
import { applyWind } from './wind.js';

/** A tapered, slightly curved blade, 1 m tall before scaling. */
function bladeGeometry() {
  const segs = 4;
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = 0.045 * (1 - t) + 0.004;
    const bend = t * t * 0.18;
    pos.push(-w, t, bend, w, t, bend);
    const shade = 0.45 + 0.6 * t;
    col.push(shade, shade, shade, shade, shade, shade);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // Upward normals: soft, even lighting from every viewing angle (no dark backfaces)
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill([0, 1, 0]).flat(), 3));
  g.setIndex(idx);
  return g;
}

/** Areas kept clear of grass: the path, the mandapam platform, the kolam. */
function blocked(x, z) {
  if (Math.abs(x) < 1.4 && z > 2.2) return true; // path
  if (Math.abs(x) < 3.05 && z > -2.6 && z < 3.1) return true; // mandapam + steps
  return false;
}

/**
 * Wind-swept grass: instanced blades in z-bands so whole bands behind the
 * camera are frustum-culled.
 *   kind 'lawn' — green lawn, densest near the garden path
 *   kind 'dune' — sparse straw-coloured sea oats on the beach dunes
 * `heightAt(x, z)` places each blade on uneven ground.
 */
export function createGrass({ count, kind = 'lawn', heightAt = () => 0 }) {
  const group = new THREE.Group();
  if (!count) return { group, update() {} };

  const rand = seededRandom(99);
  const material = applyWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }),
    { key: 'grass', factor: 'pow(clamp(transformed.y, 0.0, 1.0), 1.6)', amp: 0.11, freq: 1.9 }
  );
  const geometry = bladeGeometry();
  const bands = [];
  for (let z0 = -10; z0 < 50; z0 += 7.5) bands.push({ z0, z1: z0 + 7.5, items: [] });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const c = new THREE.Color();
  let placed = 0, guard = 0;
  const dune = kind === 'dune';
  while (placed < count && guard++ < count * 4) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = dune ? side * (5.5 + Math.pow(rand(), 0.8) * 16) : side * (1.35 + Math.pow(rand(), 1.7) * 15);
    const z = dune ? -3 + rand() * 50 : -10 + rand() * 60;
    if (dune ? Math.abs(x) < 6 && z < 3 : blocked(x, z)) continue;
    const band = bands[Math.min(bands.length - 1, Math.floor((z + 10) / 7.5))];
    band.items.push([x, z]);
    placed++;
  }

  for (const band of bands) {
    if (!band.items.length) continue;
    const mesh = new THREE.InstancedMesh(geometry, material, band.items.length);
    band.items.forEach(([x, z], i) => {
      const h = dune ? 0.35 + rand() * 0.45 : 0.18 + rand() * 0.32 + (Math.abs(x) > 6 ? rand() * 0.12 : 0);
      p.set(x, heightAt(x, z) - 0.02, z);
      q.setFromEuler(e.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25));
      m4.compose(p, q, s.set(0.8 + rand() * 0.6, h, 1));
      mesh.setMatrixAt(i, m4);
      if (dune) mesh.setColorAt(i, c.setHSL(0.11 + rand() * 0.05, 0.35 + rand() * 0.2, 0.5 + rand() * 0.15));
      else mesh.setColorAt(i, c.setHSL(0.2 + rand() * 0.07, 0.38 + rand() * 0.2, 0.36 + rand() * 0.14));
    });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group, update() {} };
}
