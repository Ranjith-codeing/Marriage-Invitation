import * as THREE from 'three';
import { glowTexture } from '../../utils/textures.js';
import { seededRandom, clamp } from '../../utils/math.js';

const CEILING = 48;

/**
 * Glowing paper sky-lanterns released around the mandapam in the night
 * finale. They drift upward with a gentle sway and loop while the guest
 * lingers; leaving the finale resets them so the release replays.
 */
export function createLanterns({ count }) {
  const group = new THREE.Group();
  if (!count) return { group, setPixelRatio() {}, update() {} };
  const rand = seededRandom(83);

  const body = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.16, 0.46, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ffb35a', side: THREE.DoubleSide, transparent: true, opacity: 0.92 }),
    count
  );
  body.frustumCulled = false;
  group.add(body);

  const spot = () => {
    // anywhere around the mandapam, but never inside it (they'd rise through the roof)
    for (;;) {
      const x = (rand() - 0.5) * 22, z = -12 + rand() * 15;
      if (!(Math.abs(x) < 3.4 && z > -3.3) && Math.abs(x) > 1.5) return [x, z];
    }
  };
  const lanterns = Array.from({ length: count }, () => {
    const [x, z] = spot();
    return {
      x,
      z,
      speed: 0.32 + rand() * 0.35,
      delay: rand() * 9,
      phase: rand() * 6,
      sway: 0.3 + rand() * 0.5,
    };
  });

  const pos = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  glowGeo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: glowTexture() }, uPixel: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float alpha;
      uniform float uPixel;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = alpha;
        gl_PointSize = 2.4 * 220.0 * uPixel / max(1.0, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).r;
        gl_FragColor = vec4(vec3(1.0, 0.68, 0.32) * a, a * vAlpha * 0.75);
      }`,
  });
  const glows = new THREE.Points(glowGeo, glowMat);
  glows.frustumCulled = false;
  group.add(glows);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let clock = 0;
  return {
    group,
    setPixelRatio(pr) {
      glowMat.uniforms.uPixel.value = pr;
    },
    update(st, time, dt) {
      const k = st.lanterns;
      group.visible = k > 0.01;
      if (!group.visible) {
        clock = 0;
        return;
      }
      clock += dt;
      lanterns.forEach((l, i) => {
        const t = Math.max(0, clock - l.delay);
        const cycle = CEILING / l.speed;
        const life = t % cycle;
        const y = 0.6 + life * l.speed;
        const fade = clamp(life / 1.5) * clamp((CEILING - y) / 8) * (t > 0 ? 1 : 0);
        p.set(l.x + Math.sin(time * 0.5 + l.phase) * l.sway * clamp(y / 6), y, l.z + Math.cos(time * 0.4 + l.phase) * l.sway * 0.6 * clamp(y / 6));
        const size = fade * k;
        m.compose(p, q.setFromEuler(e.set(Math.sin(time + l.phase) * 0.08, 0, Math.cos(time * 0.8 + l.phase) * 0.08)), s.setScalar(Math.max(size, 0.0001)));
        body.setMatrixAt(i, m);
        pos[i * 3] = p.x;
        pos[i * 3 + 1] = p.y - 0.05;
        pos[i * 3 + 2] = p.z;
        alpha[i] = size * (0.85 + Math.sin(time * 7 + i) * 0.15);
      });
      body.instanceMatrix.needsUpdate = true;
      glowGeo.attributes.position.needsUpdate = true;
      glowGeo.attributes.alpha.needsUpdate = true;
    },
  };
}
