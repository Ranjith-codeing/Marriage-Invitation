import * as THREE from 'three';

/** Gradient sky dome with a soft sun glow on the horizon. */
export function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(-0.62, 0.1, -0.78).normalize() },
    uSunColor: { value: new THREE.Color() },
    uSun: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
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
      uniform vec3 uTop, uHorizon, uBottom, uSunColor, uSunDir;
      uniform float uSun;
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.55, y));
        col = mix(col, uBottom, smoothstep(0.0, -0.25, y));
        float d = max(dot(normalize(vDir), uSunDir), 0.0);
        col += uSunColor * (pow(d, 220.0) * 1.4 + pow(d, 18.0) * 0.35 + pow(d, 4.0) * 0.12) * uSun;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;

  return {
    mesh,
    sunDir: uniforms.uSunDir.value,
    update(s, camera) {
      uniforms.uTop.value.copy(s.skyTop);
      uniforms.uHorizon.value.copy(s.skyHorizon);
      uniforms.uBottom.value.copy(s.skyBottom);
      uniforms.uSunColor.value.copy(s.sunColor);
      uniforms.uSun.value = Math.min(1.2, s.sun * 0.5);
      mesh.position.copy(camera.position);
    },
  };
}
