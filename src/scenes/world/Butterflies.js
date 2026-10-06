import * as THREE from 'three';
import { wingTexture } from '../../utils/textures.js';
import { seededRandom } from '../../utils/math.js';

/**
 * A few butterflies fluttering over the flower beds beside the path during
 * the golden-hour scenes. Two wings per butterfly, flapped and steered on the
 * CPU (only a few dozen matrices per frame).
 */
export function createButterflies({ count }) {
  const group = new THREE.Group();
  const rand = seededRandom(61);
  const wing = new THREE.PlaneGeometry(0.16, 0.16).rotateX(-Math.PI / 2);
  wing.translate(0.08, 0, 0); // hinge along the body (local Z axis)

  const variants = [wingTexture('#f08a1c', '#1c120c'), wingTexture('#3b78d6', '#0f1830')];
  const meshes = variants.map((map) => {
    const mesh = new THREE.InstancedMesh(
      wing,
      new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6 }),
      Math.ceil(count / 2) * 2
    );
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  });

  const flies = Array.from({ length: count }, (_, i) => ({
    mesh: meshes[i % 2],
    slot: Math.floor(i / 2) * 2,
    centre: new THREE.Vector3((rand() < 0.5 ? -1 : 1) * (1.7 + rand() * 2.6), 0.7 + rand() * 0.9, 5 + rand() * 22),
    radius: new THREE.Vector3(0.6 + rand() * 1.1, 0.25, 0.6 + rand() * 1.2),
    speed: 0.35 + rand() * 0.35,
    phase: rand() * Math.PI * 2,
    flap: 13 + rand() * 6,
  }));

  const m = new THREE.Matrix4(), t = new THREE.Matrix4(), ry = new THREE.Matrix4(), rz = new THREE.Matrix4(), sc = new THREE.Matrix4();
  const p = new THREE.Vector3(), ahead = new THREE.Vector3();
  const at = (f, time, out) => {
    const k = time * f.speed + f.phase;
    return out.set(
      f.centre.x + Math.sin(k) * f.radius.x,
      f.centre.y + Math.sin(k * 1.7) * f.radius.y,
      f.centre.z + Math.sin(k * 0.8 + f.phase) * f.radius.z
    );
  };

  return {
    group,
    update(s, time) {
      const show = s.garden * (1 - s.night) * (1 - s.dim);
      group.visible = show > 0.15 && count > 0;
      if (!group.visible) return;
      for (const f of flies) {
        at(f, time, p);
        at(f, time + 0.05, ahead);
        const heading = Math.atan2(ahead.x - p.x, ahead.z - p.z);
        const beat = 0.2 + 1.0 * (0.5 + 0.5 * Math.sin(time * f.flap + f.phase));
        for (const side of [1, -1]) {
          t.makeTranslation(p.x, p.y, p.z);
          ry.makeRotationY(heading);
          rz.makeRotationZ(side * beat);
          sc.makeScale(side, 1, 1);
          m.copy(t).multiply(ry).multiply(rz).multiply(sc);
          f.mesh.setMatrixAt(f.slot + (side > 0 ? 0 : 1), m);
        }
      }
      meshes.forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true));
    },
  };
}
