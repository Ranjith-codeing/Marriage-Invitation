import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from '../../utils/textures.js';

/**
 * Far horizon for the beach: two hazy headlands across the bay and a
 * lighthouse whose lamp sweeps a soft beam over the sea at night. Drawn as
 * atmospheric silhouettes tinted toward the sky (aerial perspective).
 */
export function createBeachHorizon() {
  const group = new THREE.Group();

  // Headlands: low, wide mounds
  const headland = (w, h, d, x, z) => {
    const g = new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const bump = 1 + Math.sin(vx * 7) * 0.05 + Math.sin(vz * 5 + 1) * 0.04;
      p.setXYZ(i, vx * w, vy * h * bump, vz * d);
    }
    g.translate(x, -2, z);
    return g;
  };
  const landMat = new THREE.MeshBasicMaterial({ fog: false });
  const land = new THREE.Mesh(mergeGeometries([headland(120, 34, 40, -190, -330), headland(70, 16, 30, 230, -380), headland(40, 9, 18, 120, -420)]), landMat);
  group.add(land);

  // Lighthouse on the left headland
  const lighthouse = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 20, 16), landMat);
  tower.position.y = 10;
  const room = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3, 16), landMat);
  room.position.y = 21.5;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 3, 16), landMat);
  roof.position.y = 24.5;
  lighthouse.add(tower, room, roof);
  lighthouse.position.set(-150, 26, -300);
  group.add(lighthouse);

  // The lamp and its sweeping beam (visible at dusk and night)
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff3c8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(14);
  glow.position.set(-150, 26 + 21.5, -300);
  group.add(glow);

  const beamGeo = new THREE.ConeGeometry(9, 160, 24, 1, true);
  beamGeo.translate(0, -80, 0);
  beamGeo.rotateZ(Math.PI / 2); // points along +x from the apex
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying float vAlong;
      void main() {
        vAlong = clamp(position.x / 160.0, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vAlong;
      void main() {
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.8), (1.0 - vAlong) * 0.22 * uOpacity);
      }`,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.copy(glow.position);
  group.add(beam);

  const stone = new THREE.Color('#5a6070');
  return {
    group,
    update(s, time) {
      const haze = 0.62 + s.fogDensity * 4;
      landMat.color.copy(stone).lerp(s.skyHorizon, Math.min(0.88, haze)).multiplyScalar(0.95 - s.night * 0.6);
      const on = Math.min(1, s.lamp * 0.5 + s.night);
      glowMat.opacity = on * (0.55 + 0.45 * Math.max(0, Math.cos(time * 0.9)));
      beamMat.uniforms.uOpacity.value = on;
      beam.rotation.y = time * 0.9;
      beam.visible = on > 0.02;
    },
  };
}
