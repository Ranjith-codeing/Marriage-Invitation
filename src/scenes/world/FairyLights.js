import * as THREE from 'three';
import { glowTexture } from '../../utils/textures.js';
import { seededRandom } from '../../utils/math.js';

/** Points along a sagging string between a and b. */
function catenary(a, b, n, sag) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push(new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -sag * 4 * u * (1 - u), 0)));
  }
  return pts;
}

function lightPoints(points, map, seed) {
  const rand = seededRandom(seed);
  const pos = new Float32Array(points.length * 3);
  const data = new Float32Array(points.length * 2);
  points.forEach((p, i) => {
    pos.set([p.x, p.y, p.z], i * 3);
    data.set([rand(), rand()], i * 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(data, 2));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uPixel: { value: 1 }, uMap: { value: map } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 seed;
      uniform float uTime, uPixel;
      varying float vTw;
      varying vec3 vCol;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.6 + 0.4 * sin(uTime * (1.2 + seed.x * 2.5) + seed.y * 40.0);
        vCol = mix(vec3(1.0, 0.78, 0.45), vec3(1.0, 0.93, 0.78), seed.y);
        gl_PointSize = (0.12 + seed.x * 0.06) * 260.0 * uPixel / max(1.0, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOn;
      varying float vTw;
      varying vec3 vCol;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).r;
        gl_FragColor = vec4(vCol * a, a * vTw * uOn);
      }`,
  });
  const pts = new THREE.Points(geo, material);
  pts.frustumCulled = false;
  return pts;
}

/**
 * Warm fairy lights: zig-zag strings between the palm crowns over the path,
 * and an outline along the mandapam's eaves. They glow softly at golden hour
 * and come fully alive at dusk and night.
 */
export function createFairyLights({ crowns, eaves }) {
  const group = new THREE.Group();
  const map = glowTexture(64);

  const gardenPts = [];
  const sorted = [...crowns].sort((a, b) => a.z - b.z);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i].clone().add(new THREE.Vector3(0, -0.7, 0));
    const b = sorted[i + 1].clone().add(new THREE.Vector3(0, -0.7, 0));
    gardenPts.push(...catenary(a, b, Math.round(a.distanceTo(b) / 0.22), 0.9));
  }
  const garden = lightPoints(gardenPts, map, 3);
  const mandap = lightPoints(eaves, map, 4);
  group.add(garden, mandap);

  return {
    group,
    setPixelRatio(pr) {
      garden.material.uniforms.uPixel.value = pr;
      mandap.material.uniforms.uPixel.value = pr;
    },
    update(s, time) {
      const on = THREE.MathUtils.clamp(0.18 + s.lamp * 0.55 + s.night * 0.6 - s.sun * 0.04, 0, 1);
      for (const [pts, k] of [[garden, 1], [mandap, THREE.MathUtils.clamp((s.mandap - 0.6) / 0.4, 0, 1)]]) {
        const u = pts.material.uniforms;
        u.uTime.value = time;
        u.uOn.value = on * k;
        pts.visible = u.uOn.value > 0.01;
      }
    },
  };
}
