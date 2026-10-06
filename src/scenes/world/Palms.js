import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '../../utils/math.js';
import { frondTexture, barkTexture } from '../../utils/textures.js';
import { applyWind } from './wind.js';

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
 * Coconut palms: curved, tapered, ring-barked trunks (merged into one mesh),
 * wind-swept fronds and coconut clusters (instanced).
 * @param {{x:number, z:number, h:number, lean:number, leanZ?:number}[]} specs
 */
export function createPalms(specs, { seed = 5 } = {}) {
  const group = new THREE.Group();
  const rand = seededRandom(seed);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  const shadows = [];
  const crowns = [];

  const trunkGeos = specs.map((p) => {
    const tip = new THREE.Vector3(p.lean, p.h, p.leanZ || 0);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(tip.x * 0.15, p.h * 0.55, tip.z * 0.15), tip);
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
    shadows.push([p.x + tip.x * 0.6, p.z + tip.z * 0.6, 1.6]);
    crowns.push(new THREE.Vector3(p.x + tip.x, p.h, p.z + tip.z));
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
  const frondMesh = new THREE.InstancedMesh(frondGeometry(), frondMat, specs.length * frondsPer);
  const coconutMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: '#5b4a2c', roughness: 0.6 }), specs.length * 5);
  crowns.forEach((top, i) => {
    const rot = rand() * 6;
    for (let k = 0; k < frondsPer; k++) {
      const yaw = rot + (k / frondsPer) * Math.PI * 2 + rand() * 0.3;
      const pitch = -0.3 + rand() * 0.4 + (k % 3 === 0 ? -0.35 : 0);
      q.setFromEuler(e.set(pitch, yaw, 0, 'YXZ'));
      const sz = 0.85 + rand() * 0.3;
      frondMesh.setMatrixAt(i * frondsPer + k, m4.compose(top, q, sc.set(sz, sz, sz)));
    }
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rot;
      coconutMesh.setMatrixAt(i * 5 + k, m4.makeTranslation(top.x + Math.cos(a) * 0.15, top.y - 0.22, top.z + Math.sin(a) * 0.15));
    }
  });
  frondMesh.castShadow = true;
  frondMesh.computeBoundingSphere();
  coconutMesh.computeBoundingSphere();
  group.add(frondMesh, coconutMesh);

  return { group, crowns, shadows };
}
