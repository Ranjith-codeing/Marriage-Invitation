import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Low-poly but botanical flower geometry shared by the garden, the mandapam
 * garlands and the floral border: layered rose petals, five-petal jasmine,
 * jasmine buds (for garlands), ruffled marigolds and leaves.
 *
 * All geometries are ~unit size, open upward (+Y), and carry a vertex-colour
 * gradient (darker at the base) that multiplies with each instance's colour.
 */

export const PALETTE = {
  rose: ['#9e0f2e', '#b3123a', '#c8274b', '#d9506a', '#eb8fa0', '#f5c9cc'],
  jasmine: ['#fffdf7', '#fff8ec', '#fbf3e4'],
  marigold: ['#f28c18', '#f5a623', '#f7c531', '#ee7d12'],
  leaf: ['#2f4a22', '#3a5a29', '#45672f', '#4f7434'],
};

const cache = new Map();
const cached = (key, build) => {
  if (!cache.has(key)) {
    const geometry = build();
    geometry.userData.shared = true; // used by several worlds — never disposed with one of them
    cache.set(key, geometry);
  }
  return cache.get(key);
};

/** Paints a base→tip brightness gradient into a 'color' attribute. */
function gradient(geo, axis, from, to, lo = 0.62, hi = 1) {
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getComponent(i, axis) - from) / (to - from), 0, 1);
    const v = lo + (hi - lo) * t;
    c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

/** One petal: grows along +Y, concave side toward +Z, rounded outline. */
function petal(w, h, cup, curl, segX = 2, segY = 2) {
  const g = new THREE.PlaneGeometry(w, h, segX, segY);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h;
    const x = p.getX(i) * (0.35 + 0.65 * Math.sin(Math.min(1, 0.15 + t) * Math.PI * 0.82));
    const z = cup * (x / (w / 2)) ** 2 - curl * t * t;
    p.setXYZ(i, x, p.getY(i), z);
  }
  return g;
}

function ring(petals, { n, r, w, h, tilt, cup, curl = 0, shade = 1, twist = 0, segX = 2, segY = 2 }) {
  const m = new THREE.Matrix4(), ry = new THREE.Matrix4(), rx = new THREE.Matrix4();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + twist;
    const g = petal(w, h, cup, curl, segX, segY);
    gradient(g, 1, 0, h, 0.55 * shade, 1 * shade);
    rx.makeRotationX(-tilt);
    ry.makeRotationY(a + Math.PI);
    m.makeTranslation(Math.sin(a) * r, 0, Math.cos(a) * r).multiply(ry).multiply(rx);
    g.applyMatrix4(m);
    petals.push(g);
  }
}

/** Layered rose: tight inner bud, opening outer petals. ~112 triangles. */
export const roseGeometry = () =>
  cached('rose', () => {
    const petals = [];
    ring(petals, { n: 3, r: 0.04, w: 0.42, h: 0.42, tilt: 0.12, cup: 0.14, shade: 0.8 });
    ring(petals, { n: 5, r: 0.11, w: 0.55, h: 0.55, tilt: 0.5, cup: 0.11, shade: 0.92, twist: 0.6 });
    ring(petals, { n: 6, r: 0.2, w: 0.62, h: 0.6, tilt: 1.0, cup: 0.07, curl: 0.1, twist: 0.25 });
    const g = mergeGeometries(petals);
    g.computeVertexNormals();
    return g;
  });

/** Open five-petal jasmine. ~24 triangles. */
export const jasmineGeometry = () =>
  cached('jasmine', () => {
    const petals = [];
    ring(petals, { n: 5, r: 0.06, w: 0.36, h: 0.62, tilt: 1.25, cup: 0.06, curl: -0.05, segX: 1, segY: 2, shade: 1 });
    const centre = new THREE.CylinderGeometry(0.04, 0.03, 0.12, 5, 1).toNonIndexed();
    centre.deleteAttribute('uv');
    centre.translate(0, 0.02, 0);
    gradient(centre, 1, -0.04, 0.08, 0.75, 0.85);
    petals.forEach((p) => p.deleteAttribute('uv'));
    const g = mergeGeometries([...petals.map((p) => p.toNonIndexed()), centre]);
    g.computeVertexNormals();
    return g;
  });

/** Closed jasmine bud — the building block of South Indian garlands. */
export const budGeometry = () =>
  cached('bud', () => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * (0.42 - 0.18 * t) + 0.001, t * 1.4 - 0.7));
    }
    const g = new THREE.LatheGeometry(pts, 6);
    gradient(g, 1, -0.7, 0.7, 0.8, 1);
    g.computeVertexNormals();
    return g;
  });

/** Ruffled marigold pom-pom. ~80 triangles. */
export const marigoldGeometry = () =>
  cached('marigold', () => {
    let g = new THREE.IcosahedronGeometry(1, 1);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const ruffle = Math.sin(v.x * 9) * Math.sin(v.y * 9 + 1) * Math.sin(v.z * 9 + 2);
      v.multiplyScalar(1 + ruffle * 0.16);
      p.setXYZ(i, v.x, v.y * 0.78, v.z);
      const shade = 0.72 + 0.28 * (ruffle * 0.5 + 0.5);
      c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = shade;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  });

/** Pointed, gently folded leaf growing along +Y. */
export const leafGeometry = () =>
  cached('leaf', () => {
    const g = new THREE.PlaneGeometry(0.42, 1, 1, 3);
    g.translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i);
      const x = p.getX(i) * Math.sin(Math.min(1, t * 1.05) * Math.PI);
      p.setXYZ(i, x, t, Math.abs(x) * 0.35 - t * t * 0.22);
    }
    gradient(g, 1, 0, 1, 0.7, 1.05);
    g.computeVertexNormals();
    return g;
  });

/** Shared flower material: vertex-colour gradient × per-instance colour. */
export function floraMaterial(opts = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0,
    side: THREE.DoubleSide,
    ...opts,
  });
}

export const pick = (list, r) => list[Math.floor(r * list.length) % list.length];
