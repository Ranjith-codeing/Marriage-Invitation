import * as THREE from 'three';
import { clamp, easeOutCubic, seededRandom } from '../../utils/math.js';
import { glowTexture } from '../../utils/textures.js';
import { roseGeometry, jasmineGeometry, leafGeometry, floraMaterial, PALETTE, pick } from './flora.js';
import { applyWind } from './wind.js';

const V = (x, y) => new THREE.Vector2(x, y);

/**
 * Beach aisle décor: white pedestals topped with bouquets of roses and
 * jasmine (they bloom as the guest approaches — driven by `garden`), and
 * bamboo torches whose flames light up at dusk.
 */
export function createAisleDecor() {
  const group = new THREE.Group();
  const rand = seededRandom(23);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), c = new THREE.Color();

  // Pedestals
  const stands = [];
  for (let z = 9.2; z < 44; z += 3.2) for (const x of [-1.5, 1.5]) stands.push(new THREE.Vector3(x, 0, z));
  const pedestalGeo = new THREE.LatheGeometry([V(0, 0), V(0.17, 0), V(0.17, 0.05), V(0.08, 0.1), V(0.06, 0.7), V(0.12, 0.78), V(0.2, 0.86), V(0.0, 0.86)], 20);
  const pedestals = new THREE.InstancedMesh(pedestalGeo, new THREE.MeshStandardMaterial({ color: '#f5f0e6', roughness: 0.4 }), stands.length);
  stands.forEach((p, i) => pedestals.setMatrixAt(i, m4.makeTranslation(p.x, 0.06, p.z)));
  pedestals.castShadow = true;
  pedestals.computeBoundingSphere();
  group.add(pedestals);

  // Bouquets (grow with the scene's `garden` value)
  const bloomMat = applyWind(floraMaterial(), { key: 'aisle-bloom', factor: '0.5', amp: 0.025, freq: 2.0 });
  const kinds = { rose: [], jasmine: [], leaf: [] };
  stands.forEach((p, s) => {
    const delay = 0.08 + (1 - p.z / 42) * 0.35; // nearer the pavilion blooms last
    for (let i = 0; i < 46; i++) {
      const d = new THREE.Vector3(rand() - 0.5, rand() * 0.9, rand() - 0.5).normalize();
      const at = new THREE.Vector3(p.x, 0.98, p.z).add(d.clone().multiplyScalar(0.12 + rand() * 0.12));
      const rot = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
      const roll = rand();
      if (roll < 0.45) kinds.rose.push({ pos: at, rot, size: 0.06 + rand() * 0.02, delay, color: pick(s % 3 === 0 ? PALETTE.rose.slice(3) : PALETTE.rose, rand()) });
      else if (roll < 0.75) kinds.jasmine.push({ pos: at, rot, size: 0.045, delay, color: pick(PALETTE.jasmine, rand()) });
      else kinds.leaf.push({ pos: at, rot, size: 0.11, delay, color: pick(PALETTE.leaf, rand()) });
    }
  });
  const geos = { rose: roseGeometry(), jasmine: jasmineGeometry(), leaf: leafGeometry() };
  const growables = Object.entries(kinds).map(([kind, items]) => {
    const mesh = new THREE.InstancedMesh(geos[kind], bloomMat, items.length);
    items.forEach((it, i) => mesh.setColorAt(i, c.set(it.color)));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return { mesh, items };
  });
  const grow = (f) => {
    for (const { mesh, items } of growables) {
      items.forEach((it, i) => {
        const k = Math.max(0.0001, easeOutCubic(clamp((f - it.delay) / 0.4)));
        mesh.setMatrixAt(i, m4.compose(it.pos, q.setFromEuler(it.rot), sc.setScalar(it.size * k)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  grow(1);
  growables.forEach(({ mesh }) => mesh.computeBoundingSphere());
  grow(0);

  // Bamboo torches
  const torchSpots = [];
  for (let z = 10.8; z < 42; z += 6.4) for (const x of [-2.25, 2.25]) torchSpots.push(new THREE.Vector3(x, 0, z));
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.7, 8);
  poleGeo.translate(0, 0.85, 0);
  const cupGeo = new THREE.CylinderGeometry(0.075, 0.05, 0.16, 12);
  cupGeo.translate(0, 1.78, 0);
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: '#9b7b4c', roughness: 0.8 }), torchSpots.length);
  const cups = new THREE.InstancedMesh(cupGeo, new THREE.MeshStandardMaterial({ color: '#5c4128', roughness: 0.7 }), torchSpots.length);
  torchSpots.forEach((p, i) => {
    poles.setMatrixAt(i, m4.makeTranslation(p.x, 0, p.z));
    cups.setMatrixAt(i, m4.makeTranslation(p.x, 0, p.z));
  });
  poles.computeBoundingSphere();
  cups.computeBoundingSphere();
  group.add(poles, cups);
  const glow = glowTexture();
  const flames = torchSpots.map((p) => {
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ff9c3d', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    flame.position.set(p.x, 1.98, p.z);
    group.add(flame);
    return flame;
  });

  let last = -1;
  return {
    group,
    update(s, time) {
      if (Math.abs(s.garden - last) > 0.002) {
        last = s.garden;
        grow(s.garden);
      }
      const on = clamp(s.lamp * 0.9 + s.night * 0.6 + 0.12);
      flames.forEach((f, i) => {
        const flicker = 0.85 + Math.sin(time * 8 + i * 1.3) * 0.1 + Math.sin(time * 19 + i) * 0.05;
        f.material.opacity = on;
        f.scale.set(0.22 * flicker, 0.42 * flicker, 1);
      });
    },
  };
}
