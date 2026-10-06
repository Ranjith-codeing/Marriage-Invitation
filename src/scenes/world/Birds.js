import * as THREE from 'three';
import { seededRandom } from '../../utils/math.js';
import { wind } from './wind.js';

/** A simple bird: body plus two wings that flap in the vertex shader. */
function birdGeometry() {
  // x across the wings, z along the body (nose toward +z)
  const v = [
    // left wing
    -0.06, 0, 0.12, -0.06, 0, -0.1, -0.55, 0, -0.06,
    // right wing
    0.06, 0, 0.12, 0.55, 0, -0.06, 0.06, 0, -0.1,
    // body
    -0.06, 0, 0.12, 0.06, 0, 0.12, 0, 0, 0.26,
    -0.06, 0, -0.1, 0, 0, -0.3, 0.06, 0, -0.1,
    -0.06, 0, 0.12, 0.06, 0, -0.1, 0.06, 0, 0.12,
    -0.06, 0, 0.12, -0.06, 0, -0.1, 0.06, 0, -0.1,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A few birds crossing the sky in the daytime scenes: white seagulls gliding
 * over the beach, dark birds circling high over the garden.
 */
export function createBirds({ count }) {
  const group = new THREE.Group();
  if (!count) return { group, setKind() {}, update() {} };
  const rand = seededRandom(91);
  const geometry = birdGeometry();
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) phases[i] = rand() * 6.28;
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));

  const material = new THREE.MeshBasicMaterial({ color: '#2a2420', side: THREE.DoubleSide, transparent: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = wind.time;
    shader.uniforms.uFlap = { value: 1 };
    material.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nuniform float uFlap;\nattribute float aPhase;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float span = max(0.0, abs(position.x) - 0.06);
        float beat = sin(uWindTime * 7.0 * uFlap + aPhase) * 0.5 + sin(uWindTime * 0.6 + aPhase) * 0.15;
        transformed.y += beat * span * 0.9;`
      );
  };
  material.customProgramCacheKey = () => 'birds';
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  group.add(mesh);

  const birds = Array.from({ length: count }, (_, i) => ({
    centre: new THREE.Vector3((rand() - 0.5) * 80, 18 + rand() * 22, -40 - rand() * 90),
    radius: 14 + rand() * 30,
    speed: (0.05 + rand() * 0.06) * (i % 2 ? 1 : -1),
    bob: rand() * 6,
    size: 0.8 + rand() * 0.5,
  }));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let kind = 'garden';
  return {
    group,
    setKind(next) {
      kind = next;
      material.color.set(next === 'beach' ? '#f4f2ec' : '#2a2420');
      if (material.userData.shader) material.userData.shader.uniforms.uFlap.value = next === 'beach' ? 0.55 : 1; // gulls glide more
    },
    update(st, time) {
      const show = (1 - st.night) * (1 - st.dim) * Math.min(1, st.sun / 1.2);
      group.visible = show > 0.05;
      if (!group.visible) return;
      material.opacity = Math.min(1, show * 1.2);
      const scale = kind === 'beach' ? 1.6 : 1.1;
      birds.forEach((b, i) => {
        const a = time * b.speed + i;
        p.set(b.centre.x + Math.cos(a) * b.radius, b.centre.y + Math.sin(time * 0.3 + b.bob) * 1.5, b.centre.z + Math.sin(a) * b.radius * 0.6);
        const heading = Math.atan2(-Math.sin(a) * Math.sign(b.speed), Math.cos(a) * 0.6 * Math.sign(b.speed));
        q.setFromEuler(e.set(0, heading, Math.sign(b.speed) * -0.35, 'YXZ'));
        m.compose(p, q, s.setScalar(b.size * scale * 2.2));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
