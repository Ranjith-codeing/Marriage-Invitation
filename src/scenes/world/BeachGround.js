import * as THREE from 'three';
import { seededRandom, smoothstep, clamp } from '../../utils/math.js';
import { sandTexture, plankTexture, blobShadowTexture } from '../../utils/textures.js';
import { blobGeometry } from './Garden.js';
import { PALETTE, pick } from './flora.js';

const ss = (a, b, v) => smoothstep(clamp((v - a) / (b - a)));

/** Sand height: flat around the aisle and pavilion, dunes to the sides, sloping into the sea. */
export function sandHeight(x, z) {
  const ax = Math.abs(x);
  let y = 0;
  y -= ss(-3, -12, z) * 0.6; // the beach slopes down into the water behind the pavilion
  const dunes = ss(5, 22, ax) * ss(-4, 8, z);
  y += dunes * (0.7 + 0.5 * Math.sin(x * 0.08 + 1.3) * Math.sin(z * 0.11 + 0.4));
  y += (Math.sin(x * 0.35 + z * 0.21) * 0.03 + Math.sin(x * 0.9 - z * 0.5) * 0.015) * ss(2.5, 5, ax);
  return y;
}

/**
 * Beach ground: dunes and a sloping sand shore (wet and darker near the
 * water), a teak boardwalk aisle with petals strewn along it, and smooth
 * rocks at the water's edge.
 */
export function createBeachGround() {
  const group = new THREE.Group();
  const rand = seededRandom(31);

  // Sand terrain
  const geo = new THREE.PlaneGeometry(260, 150, 160, 90).rotateX(-Math.PI / 2);
  geo.translate(0, 0, 18);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const dry = new THREE.Color('#ffffff'), wet = new THREE.Color('#a2876a'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, sandHeight(x, z));
    tmp.copy(dry).lerp(wet, ss(-4.5, -8.5, z));
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const sand = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: sandTexture(), vertexColors: true, roughness: 0.96 }));
  sand.receiveShadow = true;
  group.add(sand);

  // Teak boardwalk aisle
  const plankMat = new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.75 });
  const planks = [];
  for (let z = 2.98; z < 48; z += 0.24) planks.push(z);
  const plankMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.05, 0.2), plankMat, planks.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  planks.forEach((z, i) => {
    p.set((rand() - 0.5) * 0.02, 0.03, z);
    plankMesh.setMatrixAt(i, m4.compose(p, q.setFromEuler(e.set(0, (rand() - 0.5) * 0.012, 0)), s.set(1, 1, 1)));
  });
  plankMesh.receiveShadow = true;
  plankMesh.computeBoundingSphere();
  group.add(plankMesh);

  // Rose petals strewn along the aisle
  const petalCount = 320;
  const petalGeo = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
  petalGeo.scale(0.7, 1, 1);
  const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }), petalCount);
  const c = new THREE.Color();
  for (let i = 0; i < petalCount; i++) {
    const onWalk = rand() < 0.7;
    const x = onWalk ? (rand() - 0.5) * 2.1 : (rand() < 0.5 ? -1 : 1) * (1.15 + rand() * 1.2);
    const z = 3.2 + Math.pow(rand(), 1.4) * 40;
    p.set(x, (onWalk ? 0.058 : sandHeight(x, z) + 0.01) + rand() * 0.003, z);
    const k = 0.022 + rand() * 0.012;
    petals.setMatrixAt(i, m4.compose(p, q.setFromEuler(e.set((rand() - 0.5) * 0.3, rand() * 6, (rand() - 0.5) * 0.3)), s.set(k, k, k)));
    petals.setColorAt(i, c.set(pick([...PALETTE.rose, '#f7c531', '#fff6e8'], rand())));
  }
  petals.computeBoundingSphere();
  group.add(petals);

  // Smooth rocks at the water's edge
  const rocks = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (6 + rand() * 14), z = -6.5 - rand() * 5;
    const r = 0.5 + rand() * 1.1;
    rocks.push({ x, z, r });
  }
  const rockMesh = new THREE.InstancedMesh(blobGeometry(2, 11), new THREE.MeshStandardMaterial({ color: '#5d5248', roughness: 0.45 }), rocks.length);
  rocks.forEach(({ x, z, r }, i) => {
    p.set(x, sandHeight(x, z) - r * 0.25, z);
    rockMesh.setMatrixAt(i, m4.compose(p, q.setFromEuler(e.set(rand() * 0.3, rand() * 6, rand() * 0.3)), s.set(r * 1.3, r * 0.65, r)));
    rockMesh.setColorAt(i, c.setHSL(0.07 + rand() * 0.03, 0.12 + rand() * 0.08, 0.24 + rand() * 0.1));
  });
  rockMesh.castShadow = true;
  rockMesh.computeBoundingSphere();
  group.add(rockMesh);

  // Soft contact shadows under the rocks
  const shadow = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture(), color: '#000000', transparent: true, opacity: 0.4, depthWrite: false }),
    rocks.length
  );
  rocks.forEach(({ x, z, r }, i) => shadow.setMatrixAt(i, m4.compose(p.set(x, sandHeight(x, z) + 0.02, z), q.identity(), s.set(r * 3, 1, r * 2.4))));
  group.add(shadow);

  return { group, update() {} };
}
