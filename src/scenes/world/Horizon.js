import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '../../utils/math.js';

/**
 * Far horizon: a South Indian temple gopuram and a ring of trees, drawn as
 * atmospheric silhouettes tinted toward the sky colour (aerial perspective),
 * so they read at any distance without fog swallowing them.
 */
export function createHorizon() {
  const group = new THREE.Group();
  const rand = seededRandom(13);

  // ── Gopuram (tiered temple tower) ──
  const parts = [];
  const box = (w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y + h / 2, z);
    parts.push(g);
  };
  box(16, 7, 9, 0, 0, 0); // base
  box(16.8, 0.6, 9.6, 0, 7, 0);
  let w = 14.5, d = 8, y = 7.6;
  for (let i = 0; i < 8; i++) {
    const h = 2.1 - i * 0.08;
    box(w, h, d, 0, y, 0);
    box(w + 0.7, 0.35, d + 0.6, 0, y + h - 0.1, 0); // cornice
    // shrine niches along each tier's top edge
    const n = Math.max(3, Math.round(w / 2.4));
    for (let k = 0; k < n; k++) box(0.7, 0.8, 0.7, -w / 2 + (k + 0.5) * (w / n), y + h + 0.2, d / 2);
    y += h + 0.25;
    w *= 0.86;
    d *= 0.88;
  }
  const vault = new THREE.CylinderGeometry(d * 0.55, d * 0.55, w * 1.05, 16, 1, false, 0, Math.PI);
  vault.rotateZ(Math.PI / 2);
  vault.rotateX(-Math.PI / 2);
  vault.translate(0, y, 0);
  parts.push(vault);
  for (let k = 0; k < 5; k++) {
    const g = new THREE.ConeGeometry(0.35, 1.6, 8);
    g.translate(-w * 0.4 + (k * w * 0.8) / 4, y + d * 0.55 + 0.7, 0);
    parts.push(g);
  }
  const gopuramMat = new THREE.MeshBasicMaterial({ fog: false });
  const gopuram = new THREE.Mesh(mergeGeometries(parts), gopuramMat);
  gopuram.position.set(-26, 0, -105);
  gopuram.rotation.y = 0.25;
  group.add(gopuram);

  // ── Tree line ──
  const count = 150;
  const treeMat = new THREE.MeshBasicMaterial({ fog: false });
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), treeMat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.04;
    const r = 95 + rand() * 30;
    const size = 5 + rand() * 7;
    p.set(Math.cos(a) * r, size * 0.35, Math.sin(a) * r);
    trees.setMatrixAt(i, m4.compose(p, q, s.set(size * (1 + rand() * 0.6), size * (0.7 + rand() * 0.5), size)));
  }
  group.add(trees);

  const stone = new THREE.Color('#6b5040');
  const leaf = new THREE.Color('#2f3a22');
  return {
    group,
    update(st) {
      const haze = 0.55 + st.fogDensity * 4;
      gopuramMat.color.copy(stone).lerp(st.skyHorizon, Math.min(0.85, haze)).multiplyScalar(0.95 - st.night * 0.55);
      treeMat.color.copy(leaf).lerp(st.skyHorizon, Math.min(0.8, haze - 0.08)).multiplyScalar(0.9 - st.night * 0.6);
    },
  };
}
