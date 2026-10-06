import * as THREE from 'three';

export const SHORE_Z = -8.6; // mean waterline (the sea lies toward −Z, behind the pavilion)

/**
 * The sea: a large plane with travelling swells in the vertex shader and, in
 * the fragment shader, Fresnel sky reflection, a sun (or moon) glitter path,
 * translucent shallows and foam that washes up and down the shore.
 */
export function createOcean({ detail = 1 } = {}) {
  const uniforms = {
    ...THREE.UniformsLib.fog,
    uTime: { value: 0 },
    uSkyTop: { value: new THREE.Color() },
    uSkyHorizon: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color('#0d3a52') },
    uShallow: { value: new THREE.Color('#3fb7b4') },
    uSunDir: { value: new THREE.Vector3(-0.62, 0.1, -0.78).normalize() },
    uSunColor: { value: new THREE.Color() },
    uSun: { value: 1 },
    uMoonDir: { value: new THREE.Vector3(-38, 78, -230).normalize() },
    uNight: { value: 0 },
    uShore: { value: SHORE_Z },
  };
  const geometry = new THREE.PlaneGeometry(1600, 900, Math.round(160 * detail), Math.round(120 * detail)).rotateX(-Math.PI / 2);
  const NEAR = -6; // near edge sits a little inland of the waterline, behind the pavilion
  geometry.translate(0, 0, NEAR - 450);
  // Concentrate vertices near the shore, where the waves are seen up close
  {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (NEAR - p.getZ(i)) / 900; // 0 at the near edge → 1 far
      p.setZ(i, NEAR - Math.pow(t, 2.2) * 900);
    }
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: true,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      // swells: direction (xz), wavelength, amplitude, speed
      vec3 swell(vec2 p, vec2 dir, float len, float amp, float speed, inout vec3 n) {
        float k = 6.28318 / len;
        float f = k * dot(dir, p) - uTime * speed * k;
        n.x -= dir.x * k * amp * cos(f);
        n.z -= dir.y * k * amp * cos(f);
        return vec3(0.0, amp * sin(f), 0.0);
      }
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        float shore = clamp((-world.z - 6.0) / 40.0, 0.0, 1.0); // calmer right at the shore
        vec3 n = vec3(0.0, 1.0, 0.0);
        vec3 d = vec3(0.0);
        d += swell(world.xz, normalize(vec2(0.15, 1.0)), 9.0, 0.16 * (0.4 + shore), 1.6, n);
        d += swell(world.xz, normalize(vec2(-0.4, 1.0)), 5.5, 0.08 * (0.4 + shore), 1.25, n);
        d += swell(world.xz, normalize(vec2(0.6, 0.8)), 3.1, 0.035, 1.0, n);
        d += swell(world.xz, normalize(vec2(-0.8, 0.6)), 1.7, 0.018, 0.8, n);
        world.y += d.y;
        vWorld = world.xyz;
        vNormal2 = normalize(n);
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime, uSun, uNight, uShore;
      uniform vec3 uSkyTop, uSkyHorizon, uDeep, uShallow, uSunDir, uSunColor, uMoonDir;
      varying vec3 vWorld;
      varying vec3 vNormal2;

      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        // fine ripples on top of the swells
        vec2 rp = vWorld.xz * 1.7 + vec2(uTime * 0.35, uTime * 0.21);
        vec2 ripple = vec2(vnoise(rp) - vnoise(rp + vec2(0.7, 0.0)), vnoise(rp) - vnoise(rp + vec2(0.0, 0.7)));
        float dist = length(cameraPosition - vWorld);
        vec3 N = normalize(vNormal2 + vec3(ripple.x, 0.0, ripple.y) * 0.35 * clamp(30.0 / dist, 0.15, 1.0));

        float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 0.5, R.y));
        float depthToShore = uShore - vWorld.z; // metres seaward from the mean waterline
        vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 18.0, depthToShore));
        body = mix(body, uSkyTop * 0.6, 0.25) * (1.0 - uNight * 0.75);
        vec3 col = mix(body, sky, fresnel);

        // glitter path toward the sun (day) / moon (night)
        float sunSpec = pow(max(dot(R, uSunDir), 0.0), 900.0) * 6.0 + pow(max(dot(R, uSunDir), 0.0), 60.0) * 0.35;
        col += uSunColor * sunSpec * uSun;
        float moonSpec = pow(max(dot(R, uMoonDir), 0.0), 700.0) * 3.0 + pow(max(dot(R, uMoonDir), 0.0), 50.0) * 0.12;
        col += vec3(0.75, 0.82, 1.0) * moonSpec * uNight;

        // waves washing up the sand: a moving waterline with foam along it
        float wash = sin(uTime * 0.45) * 0.75 + sin(uTime * 0.9 + 1.3) * 0.25;
        float edge = depthToShore + wash;
        float foamNoise = vnoise(vWorld.xz * 2.5 + vec2(uTime * 0.2, 0.0));
        float foam = smoothstep(0.9, 0.0, edge) * smoothstep(-0.3, 0.15, edge) * (0.55 + 0.45 * foamNoise);
        foam += smoothstep(0.55, 0.85, foamNoise) * smoothstep(3.5, 1.5, edge) * smoothstep(0.6, 1.2, edge) * 0.35; // the next wave's crest
        col = mix(col, vec3(0.96, 0.97, 0.98) * (1.0 - uNight * 0.6), clamp(foam, 0.0, 1.0));

        float alpha = smoothstep(-0.25, 0.5, edge); // shallows fade onto the wet sand
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.12;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  return {
    mesh,
    update(s, time) {
      uniforms.uTime.value = time;
      uniforms.uSkyTop.value.copy(s.skyTop);
      uniforms.uSkyHorizon.value.copy(s.skyHorizon);
      uniforms.uSunColor.value.copy(s.sunColor);
      uniforms.uSun.value = Math.min(1.5, s.sun * 0.55);
      uniforms.uNight.value = s.night;
    },
  };
}
