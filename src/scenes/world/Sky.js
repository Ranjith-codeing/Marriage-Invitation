import * as THREE from 'three';

/**
 * Gradient sky dome with a soft sun and a layer of drifting cumulus clouds.
 * Clouds are fractal noise projected onto a high cloud plane (so they shrink
 * into perspective at the horizon), self-shadowed against the sun direction,
 * silver-lined near the sun, and they can veil the sun disc.
 */
export function createSky({ octaves = 5 } = {}) {
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(-0.62, 0.1, -0.78).normalize() },
    uSunColor: { value: new THREE.Color() },
    uSun: { value: 1 },
    uTime: { value: 0 },
    uCover: { value: 0.45 },
    uCloudOpacity: { value: 0.9 },
    uCloudLit: { value: new THREE.Color() },
    uCloudShade: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    defines: { OCTAVES: octaves },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uBottom, uSunColor, uSunDir, uCloudLit, uCloudShade;
      uniform float uSun, uTime, uCover, uCloudOpacity;
      varying vec3 vDir;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < OCTAVES; i++) {
          v += a * vnoise(p);
          p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vDir);
        float y = dir.y;
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.55, y));
        col = mix(col, uBottom, smoothstep(0.0, -0.25, y));
        float sunAmt = max(dot(dir, uSunDir), 0.0);

        float cloud = 0.0;
        if (y > 0.0) {
          vec2 uv = dir.xz / (y * 1.6 + 0.12);
          vec2 drift = vec2(uTime * 0.012, uTime * 0.004);
          float shape = fbm(uv * 1.3 + drift) * 0.75 + fbm(uv * 3.1 - drift * 1.7) * 0.25;
          cloud = smoothstep(1.0 - uCover, 1.0 - uCover + 0.28, shape) * smoothstep(0.0, 0.22, y);
          float toward = fbm((uv + uSunDir.xz * 0.12) * 1.3 + drift);
          float lit = clamp(0.55 + (shape - toward) * 3.5, 0.0, 1.0);
          vec3 cc = mix(uCloudShade, uCloudLit, lit);
          cc += uSunColor * pow(sunAmt, 6.0) * 0.8 * uSun; // silver lining near the sun
          col = mix(col, cc, cloud * uCloudOpacity);
        }

        col += uSunColor * (pow(sunAmt, 220.0) * 1.4 * (1.0 - cloud * 0.85) + pow(sunAmt, 18.0) * 0.35 + pow(sunAmt, 4.0) * 0.12) * uSun;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;

  const white = new THREE.Color('#ffffff');
  const moon = new THREE.Color('#8e9bc4');
  const deep = new THREE.Color('#0b1020');
  return {
    mesh,
    sunDir: uniforms.uSunDir.value,
    update(s, camera, time = 0) {
      uniforms.uTop.value.copy(s.skyTop);
      uniforms.uHorizon.value.copy(s.skyHorizon);
      uniforms.uBottom.value.copy(s.skyBottom);
      uniforms.uSunColor.value.copy(s.sunColor);
      uniforms.uSun.value = Math.min(1.2, s.sun * 0.5);
      uniforms.uTime.value = time;
      // Lit cloud tops pick up the sunset; undersides take the upper-sky colour; moonlit grey at night
      uniforms.uCloudLit.value.copy(s.skyHorizon).lerp(white, 0.45).lerp(s.sunColor, 0.2).lerp(moon, s.night * 0.85);
      uniforms.uCloudShade.value.copy(s.skyTop).lerp(s.skyHorizon, 0.3).multiplyScalar(0.85).lerp(deep, s.night * 0.7);
      uniforms.uCloudOpacity.value = 0.92 - s.night * 0.35;
      mesh.position.copy(camera.position);
    },
  };
}
