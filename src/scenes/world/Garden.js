import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom, clamp, easeOutCubic } from '../../utils/math.js';
import { frondTexture, barkTexture, blobShadowTexture } from '../../utils/textures.js';
import { roseGeometry, jasmineGeometry, marigoldGeometry, leafGeometry, floraMaterial, PALETTE, pick } from './flora.js';
import { applyWind } from './wind.js';

export const ARCH_Z = [10.5, 17, 25];
export const ARCH_SPAN = 1.55;
export const ARCH_POST = 1.9;

/** Soft, organic blob (smooth-shaded, gently lumpy) used for bushes and tree canopies. */
function blobGeometry(detail = 3, seed = 1) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g); // shared vertices → smooth shading
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 2) * Math.sin(v.z * 3.3 + seed * 3) * 0.12 +
      Math.sin(v.x * 7.0 + v.z * 5.0 + seed) * 0.035;
    v.multiplyScalar(1 + n);
    p.setXYZ(i, v.x, v.y * 0.92, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A coconut-palm frond, bent into an arching, drooping curve along +Z. */
function frondGeometry() {
  const L = 3.0, W = 1.1;
  const g = new THREE.PlaneGeometry(W, L, 4, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = (p.getY(i) + L / 2) / L;
    const along = t * L;
    p.setXYZ(i, x * (1 - t * 0.55), along * 0.45 - t * t * L * 0.75 + Math.abs(x) * 0.28, along);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The garden the camera travels through: flower beds of roses, jasmine and
 * marigolds that bloom as you scroll, floral arches over the path, coconut
 * palms and broadleaf trees — all swaying in a gentle breeze.
 */
export function createGarden({ density = 1 }) {
  const group = new THREE.Group();
  const rand = seededRandom(42);
  const growables = []; // { mesh, items: [{ pos, rot, scale, delay }] }
  const shadows = []; // [x, z, radius]
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), c = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0);

  const bloomMat = applyWind(floraMaterial(), { key: 'bloom', factor: 'clamp(wOrigin.y / 1.4, 0.0, 1.0)', amp: 0.035, freq: 2.2 });
  const leafMat = applyWind(floraMaterial({ roughness: 0.7 }), { key: 'leaf', factor: 'clamp(wOrigin.y / 1.4, 0.0, 1.0)', amp: 0.035, freq: 2.2 });

  // ── Flower beds ──
  const bushCount = Math.round(190 * density);
  const bushes = [];
  for (let i = 0; i < bushCount; i++) {
    const s = rand() < 0.5 ? -1 : 1;
    const x = s * (1.75 + Math.pow(rand(), 1.6) * 6.5);
    const z = Math.abs(x) > 3.6 ? -6 + rand() * 56 : 3.8 + rand() * 46; // keep clear of the mandapam
    const r = 0.32 + rand() * 0.42;
    bushes.push({ pos: new THREE.Vector3(x, r * 0.45, z), rot: new THREE.Euler(0, rand() * 6, 0), scale: new THREE.Vector3(r * 1.35, r * 0.95, r * 1.25), delay: 0.05 + rand() * 0.35 });
    shadows.push([x, z, r * 1.9]);
  }
  const bushMat = applyWind(new THREE.MeshStandardMaterial({ roughness: 0.85 }), {
    key: 'bush',
    factor: 'clamp(transformed.y * 0.5 + 0.5, 0.0, 1.0) * 0.6',
    amp: 0.05,
    freq: 2.0,
  });
  const bushMesh = new THREE.InstancedMesh(blobGeometry(2, 3), bushMat, bushes.length);
  bushes.forEach((_, i) => bushMesh.setColorAt(i, c.setHSL(0.24 + rand() * 0.06, 0.32 + rand() * 0.15, 0.19 + rand() * 0.08)));
  bushMesh.receiveShadow = true;
  growables.push({ mesh: bushMesh, items: bushes });

  // Each bush flowers in one variety: rose, jasmine or marigold
  const kinds = { rose: [], jasmine: [], marigold: [], leaf: [] };
  const facing = (normal) => new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, normal));
  bushes.forEach((b) => {
    const r = rand();
    const kind = r < 0.45 ? 'rose' : r < 0.75 ? 'jasmine' : 'marigold';
    const roseColor = pick(PALETTE.rose, rand());
    const n = (kind === 'jasmine' ? 22 : 13) + Math.floor(rand() * 8);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const up = 0.25 + rand() * 0.72;
      const normal = new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - up * up), up, Math.sin(a) * Math.sqrt(1 - up * up));
      const size = kind === 'jasmine' ? 0.035 + rand() * 0.015 : kind === 'rose' ? 0.05 + rand() * 0.025 : 0.035 + rand() * 0.015;
      kinds[kind].push({
        pos: normal.clone().multiply(b.scale).add(b.pos),
        rot: facing(normal),
        scale: new THREE.Vector3(size, size, size),
        delay: b.delay + 0.08 + rand() * 0.12,
        color: kind === 'rose' ? roseColor : pick(PALETTE[kind], rand()),
      });
    }
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const normal = new THREE.Vector3(Math.cos(a), 0.1 + rand() * 0.5, Math.sin(a)).normalize();
      const size = 0.08 + rand() * 0.05;
      kinds.leaf.push({
        pos: normal.clone().multiply(b.scale).multiplyScalar(0.95).add(b.pos),
        rot: facing(normal),
        scale: new THREE.Vector3(size, size, size),
        delay: b.delay,
        color: pick(PALETTE.leaf, rand()),
      });
    }
  });

  // ── Floral arches over the path ──
  const archMat = new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.35, metalness: 0.25 });
  const archGroups = [];
  for (const z of ARCH_Z) {
    const arch = new THREE.Group();
    arch.position.z = z;
    const curve = new THREE.Mesh(new THREE.TorusGeometry(ARCH_SPAN, 0.045, 8, 40, Math.PI), archMat);
    curve.position.y = ARCH_POST;
    arch.add(curve);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, ARCH_POST, 10), archMat);
      post.position.set(s * ARCH_SPAN, ARCH_POST / 2, 0);
      arch.add(post);
    }
    archGroups.push(arch);
    group.add(arch);

    // Flowers live in world space (instanced), so they bloom with the garden
    const total = Math.PI * ARCH_SPAN + ARCH_POST * 2;
    for (let k = 0; k < 260; k++) {
      const u = k / 259;
      const d = u * total;
      let p;
      if (d < ARCH_POST) p = new THREE.Vector3(-ARCH_SPAN, d, 0);
      else if (d < ARCH_POST + Math.PI * ARCH_SPAN) {
        const a = Math.PI - (d - ARCH_POST) / ARCH_SPAN;
        p = new THREE.Vector3(Math.cos(a) * ARCH_SPAN, ARCH_POST + Math.sin(a) * ARCH_SPAN, 0);
      } else p = new THREE.Vector3(ARCH_SPAN, ARCH_POST - (d - ARCH_POST - Math.PI * ARCH_SPAN), 0);
      p.add(new THREE.Vector3((rand() - 0.5) * 0.17, (rand() - 0.5) * 0.17, z + (rand() - 0.5) * 0.2));
      const rot = new THREE.Euler(rand() * 6, rand() * 6, rand() * 6);
      const delay = 0.25 + u * 0.3;
      const roll = k % 5;
      if (roll === 0 || roll === 3) kinds.leaf.push({ pos: p, rot, scale: new THREE.Vector3(0.11, 0.11, 0.11), delay, color: pick(PALETTE.leaf, rand()) });
      else if (roll === 1) kinds.rose.push({ pos: p, rot, scale: new THREE.Vector3(0.07, 0.07, 0.07), delay, color: pick(PALETTE.rose.slice(3), rand()) });
      else kinds.jasmine.push({ pos: p, rot, scale: new THREE.Vector3(0.05, 0.05, 0.05), delay, color: pick(PALETTE.jasmine, rand()) });
    }
  }

  const geos = { rose: roseGeometry(), jasmine: jasmineGeometry(), marigold: marigoldGeometry(), leaf: leafGeometry() };
  for (const [kind, items] of Object.entries(kinds)) {
    const mesh = new THREE.InstancedMesh(geos[kind], kind === 'leaf' ? leafMat : bloomMat, items.length);
    items.forEach((it, i) => mesh.setColorAt(i, c.set(it.color)));
    growables.push({ mesh, items });
  }

  // ── Coconut palms lining the path ──
  const palms = [];
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1;
    palms.push({ x: s * (3.4 + rand() * 2.2), z: 4 + i * 3.6 + rand() * 1.5, h: 5.2 + rand() * 2.4, lean: s * (0.5 + rand() * 0.7), rot: rand() * 6 });
  }
  const trunkGeos = palms.map((p) => {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(p.lean * 0.15, p.h * 0.55, 0), new THREE.Vector3(p.lean, p.h, 0));
    const geo = new THREE.TubeGeometry(curve, 16, 0.14, 9, false);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k) / p.h;
      const t = curve.getPoint(THREE.MathUtils.clamp(y, 0, 1));
      const f = 1 - y * 0.35 + (y < 0.06 ? (0.06 - y) * 4 : 0); // taper + flared base
      pos.setXYZ(k, t.x + (pos.getX(k) - t.x) * f, pos.getY(k), t.z + (pos.getZ(k) - t.z) * f);
    }
    geo.computeVertexNormals();
    geo.translate(p.x, 0, p.z);
    shadows.push([p.x + p.lean * 0.6, p.z, 1.6]);
    return geo;
  });
  const trunks = new THREE.Mesh(mergeGeometries(trunkGeos), new THREE.MeshStandardMaterial({ map: barkTexture(), roughness: 0.95 }));
  trunks.castShadow = true;
  group.add(trunks);

  const frondsPer = 13;
  const frondMat = applyWind(
    new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 }),
    { key: 'frond', factor: 'pow(clamp(transformed.z / 3.0, 0.0, 1.0), 2.0)', amp: 0.28, freq: 1.25 }
  );
  const frondMesh = new THREE.InstancedMesh(frondGeometry(), frondMat, palms.length * frondsPer);
  const coconutMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: '#5b4a2c', roughness: 0.6 }), palms.length * 5);
  const crowns = [];
  palms.forEach((p, i) => {
    const top = new THREE.Vector3(p.x + p.lean, p.h, p.z);
    crowns.push(top.clone());
    for (let k = 0; k < frondsPer; k++) {
      const yaw = p.rot + (k / frondsPer) * Math.PI * 2 + rand() * 0.3;
      const pitch = -0.3 + rand() * 0.4 + (k % 3 === 0 ? -0.35 : 0);
      q.setFromEuler(e.set(pitch, yaw, 0, 'YXZ'));
      const sz = 0.85 + rand() * 0.3;
      frondMesh.setMatrixAt(i * frondsPer + k, m4.compose(top, q, sc.set(sz, sz, sz)));
    }
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + p.rot;
      coconutMesh.setMatrixAt(i * 5 + k, m4.makeTranslation(top.x + Math.cos(a) * 0.15, top.y - 0.22, top.z + Math.sin(a) * 0.15));
    }
  });
  frondMesh.castShadow = true;
  group.add(frondMesh, coconutMesh);

  // ── Broadleaf trees further out ──
  const trees = [];
  for (let i = 0; i < Math.round(40 * Math.max(0.6, density)); i++) {
    const s = rand() < 0.5 ? -1 : 1;
    trees.push({ x: s * (9 + rand() * 16), z: -22 + rand() * 90, h: 2.6 + rand() * 2.4, r: 1.5 + rand() * 1.4 });
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.24, 1, 8), new THREE.MeshStandardMaterial({ color: '#5a4434', roughness: 1 }), trees.length);
  const lobes = 4;
  const canopyMat = applyWind(new THREE.MeshStandardMaterial({ roughness: 0.9 }), {
    key: 'canopy',
    factor: 'clamp(transformed.y * 0.5 + 0.5, 0.0, 1.0)',
    amp: 0.09,
    freq: 0.9,
  });
  const canopyMesh = new THREE.InstancedMesh(blobGeometry(3, 7), canopyMat, trees.length * lobes);
  trees.forEach((t, i) => {
    trunkMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.h / 2, t.z), q.identity(), sc.set(1, t.h, 1)));
    const hue = 0.24 + rand() * 0.07, sat = 0.38 + rand() * 0.15, lum = 0.15 + rand() * 0.07;
    for (let k = 0; k < lobes; k++) {
      const a = (k / lobes) * Math.PI * 2 + i;
      const off = k === 0 ? new THREE.Vector3(0, t.r * 0.55, 0) : new THREE.Vector3(Math.cos(a) * t.r * 0.55, t.r * (0.15 + rand() * 0.3), Math.sin(a) * t.r * 0.55);
      const r = t.r * (k === 0 ? 0.9 : 0.62 + rand() * 0.15);
      canopyMesh.setMatrixAt(i * lobes + k, m4.compose(off.add(new THREE.Vector3(t.x, t.h, t.z)), q.setFromEuler(e.set(0, rand() * 6, 0)), sc.set(r, r * 0.85, r)));
      canopyMesh.setColorAt(i * lobes + k, c.setHSL(hue, sat, lum * (k === 0 ? 1.12 : 1)));
    }
    shadows.push([t.x, t.z, t.r * 2.2]);
  });
  canopyMesh.castShadow = true;
  group.add(trunkMesh, canopyMesh);

  // ── Soft contact shadows on the lawn ──
  const shadowMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture(), color: '#000000', transparent: true, opacity: 0.55, depthWrite: false }),
    shadows.length
  );
  shadows.forEach(([x, z, r], i) => shadowMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.014, z), q.identity(), sc.set(r, 1, r))));
  shadowMesh.renderOrder = 1;
  group.add(shadowMesh);

  for (const g of growables) {
    g.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(g.mesh);
  }

  let last = -1;
  function apply(f) {
    for (const { mesh, items } of growables) {
      items.forEach((it, i) => {
        const p = easeOutCubic(clamp((f - it.delay) / 0.4));
        sc.copy(it.scale).multiplyScalar(Math.max(p, 0.0001));
        m4.compose(it.pos, q.setFromEuler(it.rot), sc);
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    archGroups.forEach((a, i) => {
      const p = easeOutCubic(clamp((f - 0.15 - i * 0.05) / 0.35));
      a.scale.set(1, Math.max(p, 0.0001), 1);
      a.visible = p > 0.001;
    });
  }
  apply(1);
  for (const g of growables) g.mesh.computeBoundingSphere(); // bounds of the fully-bloomed garden
  apply(0);

  return {
    group,
    crowns, // palm-crown positions, used to string fairy lights across the path
    update(s) {
      if (Math.abs(s.garden - last) < 0.002) return;
      last = s.garden;
      apply(s.garden);
    },
  };
}
