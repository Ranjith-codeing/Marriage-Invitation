import * as THREE from 'three';
import { glowTexture } from '../../utils/textures.js';
import { seededRandom } from '../../utils/math.js';

function moonTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size * 0.42;
  const grd = g.createRadialGradient(size * 0.45, size * 0.42, r * 0.1, size / 2, size / 2, r);
  grd.addColorStop(0, '#fffdf4');
  grd.addColorStop(1, '#e9e1cc');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  g.fill();
  const rand = seededRandom(3);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(150,140,120,${0.08 + rand() * 0.1})`;
    g.beginPath();
    g.arc(size / 2 + (rand() - 0.5) * r * 1.2, size / 2 + (rand() - 0.5) * r * 1.2, r * (0.05 + rand() * 0.14), 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Twinkling stars, a soft moon with halo and warm drifting fireflies. */
export function createNightSky({ stars: starCount, fireflies: fireflyCount }) {
  const group = new THREE.Group();
  const rand = seededRandom(5);
  const glow = glowTexture();

  // ── Stars (shader-twinkled points on the upper dome) ──
  const pos = new Float32Array(starCount * 3);
  const seed = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const u = rand(), v = rand() * 0.92 + 0.06;
    const theta = u * Math.PI * 2;
    const phi = Math.acos(v);
    pos.set([Math.cos(theta) * Math.sin(phi) * 380, Math.cos(phi) * 380, Math.sin(theta) * Math.sin(phi) * 380], i * 3);
    seed[i] = rand();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixel: { value: 1 }, uMap: { value: glow } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime, uPixel;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + seed * 2.2) + seed * 40.0);
        vAlpha = tw * (0.35 + seed * 0.65);
        gl_PointSize = (1.2 + pow(seed, 6.0) * 4.0) * uPixel * 2.0;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).r;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * a, a * vAlpha * uOpacity);
      }`,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -9;
  group.add(stars);

  // ── Moon with halo ──
  const moon = new THREE.Group();
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), transparent: true, depthWrite: false, fog: false }));
  disc.scale.setScalar(16);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#cfd9ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.scale.setScalar(70);
  moon.add(halo, disc);
  moon.position.set(-38, 78, -230);
  moon.renderOrder = -8;
  group.add(moon);

  // ── Fireflies / floating lamp-glows around the mandapam ──
  const fpos = new Float32Array(fireflyCount * 3);
  const fseed = new Float32Array(fireflyCount);
  for (let i = 0; i < fireflyCount; i++) {
    fpos.set([(rand() - 0.5) * 22, 0.3 + rand() * 4.5, -14 + rand() * 22], i * 3);
    fseed[i] = rand();
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fGeo.setAttribute('seed', new THREE.BufferAttribute(fseed, 1));
  const fMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixel: { value: 1 }, uMap: { value: glow } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime, uPixel;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * (0.15 + seed * 0.25) + seed * 30.0;
        p += vec3(sin(t * 1.3) * 0.6, sin(t * 0.9) * 0.35 + mod(uTime * 0.05 * seed, 1.0) * 0.4, cos(t) * 0.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = 0.5 + 0.5 * sin(uTime * (1.5 + seed * 2.0) + seed * 12.0);
        gl_PointSize = (6.0 + seed * 10.0) * uPixel * (8.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).r;
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.42) * a, a * vAlpha * uOpacity);
      }`,
  });
  const fireflies = new THREE.Points(fGeo, fMat);
  fireflies.frustumCulled = false;
  group.add(fireflies);

  return {
    group,
    setPixelRatio(pr) {
      starMat.uniforms.uPixel.value = pr;
      fMat.uniforms.uPixel.value = pr;
    },
    update(s, time, camera) {
      const n = s.night;
      starMat.uniforms.uTime.value = time;
      starMat.uniforms.uOpacity.value = Math.max(0, (n - 0.15) / 0.85);
      stars.position.copy(camera.position);
      stars.visible = n > 0.16;
      fMat.uniforms.uTime.value = time;
      fMat.uniforms.uOpacity.value = Math.min(1, n * 1.1 + s.lamp * 0.15);
      fireflies.visible = fMat.uniforms.uOpacity.value > 0.02;
      disc.material.opacity = Math.max(0, (n - 0.3) / 0.7);
      halo.material.opacity = disc.material.opacity * 0.35;
      moon.visible = n > 0.3;
    },
  };
}
