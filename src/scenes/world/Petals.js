import * as THREE from 'three';
import { petalTexture } from '../../utils/textures.js';
import { seededRandom } from '../../utils/math.js';

const MOONLIGHT = new THREE.Color('#8aa0d8');
const COLORS = ['#fffaf3', '#f8dcd8', '#efbcbd', '#d9707f', '#fff3e6'];

/**
 * Drifting rose & jasmine petals. Entirely GPU-animated: each petal falls,
 * sways and tumbles in the vertex shader inside a wrapping box — either one
 * that follows the camera (ambient drift) or a fixed one (the petal shower
 * over the couple), so a few hundred points read as a continuous flurry.
 */
export function createPetals({ count, box = [14, 7, 14], colors = COLORS, centre = null, size = 1, fall = 1, seed = 21, param = 'petals' }) {
  const rand = seededRandom(seed);
  const BOX = new THREE.Vector3(...box);
  const offset = new Float32Array(count * 3);
  const data = new Float32Array(count * 4); // speed, sway, spin, size
  const color = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    offset.set([rand() * BOX.x, rand() * BOX.y, rand() * BOX.z], i * 3);
    data.set([(0.25 + rand() * 0.35) * fall, 0.3 + rand() * 0.8, 0.5 + rand() * 2.5, (0.6 + rand() * 0.8) * size], i * 4);
    c.set(colors[Math.floor(rand() * colors.length)]);
    color.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(offset, 3));
  geo.setAttribute('data', new THREE.BufferAttribute(data, 4));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uBox: { value: BOX },
      uOpacity: { value: 0 },
      uPixel: { value: 1 },
      uMap: { value: petalTexture() },
      uTint: { value: new THREE.Color('#ffffff') },
    },
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    vertexShader: /* glsl */ `
      attribute vec4 data;
      uniform float uTime, uPixel;
      uniform vec3 uCenter, uBox;
      varying vec3 vColor;
      varying float vSpin, vFlip, vFade;
      void main() {
        float t = uTime;
        vec3 p = position;
        p.y -= t * data.x;
        p.x += sin(t * data.y + position.z) * 0.6 + t * 0.12;
        p.z += cos(t * data.y * 0.8 + position.x) * 0.4;
        // wrap inside a box centred on uCenter
        vec3 local = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
        vec3 world = uCenter + local;
        vec4 mv = modelViewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = data.w * 22.0 * uPixel / max(1.0, -mv.z);
        vColor = color;
        vSpin = t * data.z + position.x * 3.0;
        vFlip = cos(t * data.z * 0.7 + position.y);
        // fade near the box edges to hide wrapping
        vec3 e = abs(local) / (uBox * 0.5);
        vFade = 1.0 - smoothstep(0.75, 1.0, max(max(e.x, e.y), e.z));
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform vec3 uTint;
      varying vec3 vColor;
      varying float vSpin, vFlip, vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float s = sin(vSpin), c = cos(vSpin);
        uv = mat2(c, -s, s, c) * uv;
        uv.x /= max(0.25, abs(vFlip));
        uv += 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
        vec4 tex = texture2D(uMap, uv);
        float a = tex.a * tex.r * uOpacity * vFade;
        if (a < 0.02) discard;
        gl_FragColor = vec4(vColor * uTint * (0.75 + 0.25 * tex.r), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;

  return {
    points,
    setPixelRatio(pr) {
      material.uniforms.uPixel.value = pr;
    },
    update(s, time, camera, focus) {
      const u = material.uniforms;
      u.uTime.value = time;
      u.uOpacity.value = s[param];
      if (centre) u.uCenter.value.copy(centre);
      else u.uCenter.value.lerpVectors(camera.position, focus, 0.5); // drift through the shot
      u.uTint.value.setRGB(1, 1, 1).lerp(MOONLIGHT, s.night * 0.5);
      points.visible = s[param] > 0.01;
    },
  };
}
