import * as THREE from 'three';
import { clamp, easeOutCubic, seededRandom, firstName } from '../../utils/math.js';
import { glowTexture, plankTexture, monogramTexture } from '../../utils/textures.js';
import { budGeometry, marigoldGeometry, roseGeometry, jasmineGeometry, leafGeometry, floraMaterial, PALETTE, pick } from './flora.js';
import { applyWind, wind } from './wind.js';
import { PLATFORM } from './Mandapam.js';
import { weddingDetails } from '../../config/wedding.js';

const V = (x, y) => new THREE.Vector2(x, y);
const W = 2.05, D = 1.75, H = 3.0;

/** White fabric that ripples in the breeze; `amount` is a GLSL expression (0–1) over local position. */
function fabricMaterial(key, amount, amp, axis = 'z') {
  const m = new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.72, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = wind.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float flutter = ${amount};
        float wave = sin(uWindTime * 1.7 + position.y * 2.3 + position.x * 3.1) * 0.6 + sin(uWindTime * 2.9 + position.y * 4.1) * 0.4;
        transformed.${axis} += wave * ${amp.toFixed(3)} * flutter;
        transformed.x += sin(uWindTime * 1.1 + position.y * 1.7) * ${(amp * 0.4).toFixed(3)} * flutter;`
      );
  };
  m.customProgramCacheKey = () => `fabric-${key}`;
  return m;
}

/**
 * A beach wedding pavilion: teak deck, white posts wound with jasmine and
 * marigold, a sagging silk canopy, gathered corner drapes fluttering in the
 * sea breeze, garland swags, floral clusters, brass kuthuvilakku lamps and the
 * couple's monogram. `mandap` (0–1) assembles it, like the temple mandapam.
 */
export function createPavilion({ lights = 0 }) {
  const group = new THREE.Group();
  const rand = seededRandom(19);
  const parts = [];

  const wood = new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d9ad55', roughness: 0.22, metalness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c79a45', roughness: 0.28, metalness: 1 });

  // ── Teak deck and steps ──
  const base = new THREE.Group();
  const PW = W + 0.6, PD = D + 0.6;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(PW * 2, PLATFORM, PD * 2), wood);
  deck.position.y = PLATFORM / 2;
  deck.receiveShadow = true;
  base.add(deck);
  for (const [h, z] of [[PLATFORM * 0.66, PD + 0.16], [PLATFORM * 0.33, PD + 0.48]]) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, h, 0.32), wood);
    step.position.set(0, h / 2, z);
    step.receiveShadow = true;
    base.add(step);
  }
  group.add(base);
  parts.push({ obj: base, delay: 0, mode: 'y' });

  const top = new THREE.Group();
  top.position.y = PLATFORM;
  group.add(top);

  // ── Posts ──
  const corners = [[-W, -D], [W, -D], [-W, D], [W, D]];
  const posts = new THREE.Group();
  for (const [x, z] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, H, 16), white);
    post.position.set(x, H / 2, z);
    post.castShadow = true;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), gold);
    cap.position.set(x, H + 0.16, z);
    posts.add(post, cap);
  }
  // Frame
  for (const z of [-D, D]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 0.3, 0.12, 0.14), white);
    beam.position.set(0, H + 0.04, z);
    posts.add(beam);
  }
  for (const x of [-W, W]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, D * 2 + 0.3), white);
    beam.position.set(x, H + 0.04, 0);
    posts.add(beam);
  }
  top.add(posts);
  parts.push({ obj: posts, delay: 0.06, mode: 'y' });

  // ── Silk canopy and gathered corner drapes ──
  const drapes = new THREE.Group();
  const canopyGeo = new THREE.PlaneGeometry(W * 2 + 0.4, D * 2 + 0.4, 30, 24).rotateX(Math.PI / 2);
  {
    const p = canopyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (W + 0.2), v = p.getZ(i) / (D + 0.2);
      p.setY(i, -0.38 * (1 - u * u) * (1 - v * v));
    }
    canopyGeo.computeVertexNormals();
  }
  const canopy = new THREE.Mesh(canopyGeo, fabricMaterial('canopy', '(1.0 - abs(position.x) / 2.3) * (1.0 - abs(position.z) / 2.0)', 0.05, 'y'));
  canopy.position.y = H + 0.1;
  drapes.add(canopy);

  const TIE = 1.45; // where each drape is gathered against its post
  const drapeGeo = new THREE.PlaneGeometry(1.0, H + 0.1, 8, 30);
  {
    const p = drapeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + (H + 0.1) / 2; // 0 (floor) → H (beam)
      const pinch = 1 - 0.8 * Math.exp(-(((y - TIE) / 0.38) ** 2));
      const flare = y < TIE ? 1 + (TIE - y) * 0.25 : 1;
      const x = p.getX(i) * pinch * flare;
      p.setXYZ(i, x, y, Math.cos((p.getX(i) / 0.5) * Math.PI * 1.5) * 0.04 * pinch); // soft folds
    }
    drapeGeo.computeVertexNormals();
  }
  const drapeMat = fabricMaterial('drape', 'clamp((1.45 - position.y) / 1.45, 0.0, 1.0) * 0.9 + clamp((position.y - 1.6) / 1.4, 0.0, 1.0) * 0.25', 0.12);
  for (const [x, z] of corners) {
    const drape = new THREE.Mesh(drapeGeo, drapeMat);
    const out = new THREE.Vector2(x, z).normalize();
    drape.position.set(x + out.x * 0.16, 0, z + out.y * 0.16);
    drape.rotation.y = Math.atan2(out.x, out.y);
    drapes.add(drape);
  }
  top.add(drapes);
  parts.push({ obj: drapes, delay: 0.22, mode: 'drop' });

  // ── Flowers: post spirals, front swags, clusters at the top corners ──
  const buds = [], marigolds = [], roses = [], jasmine = [], leaves = [];
  for (const [px, pz] of corners) {
    for (let i = 0; i < 120; i++) {
      const u = i / 119;
      const a = u * Math.PI * 9;
      (Math.floor(i / 6) % 2 ? marigolds : buds).push(new THREE.Vector3(px + Math.cos(a) * 0.1, 0.3 + u * 2.6, pz + Math.sin(a) * 0.1));
    }
    for (let i = 0; i < 70; i++) {
      const d = new THREE.Vector3(rand() - 0.5, rand() * 0.8 - 0.2, rand() - 0.5).normalize().multiplyScalar(0.12 + rand() * 0.2);
      const at = new THREE.Vector3(px, H + 0.05, pz).add(d);
      const roll = rand();
      (roll < 0.4 ? roses : roll < 0.75 ? jasmine : leaves).push(at);
    }
  }
  const xs = [-W, -W / 3, W / 3, W];
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const pt = new THREE.Vector3(xs[s] + (xs[s + 1] - xs[s]) * u, H - 0.02 - 0.36 * 4 * u * (1 - u), D + 0.1);
      (i % 5 === 0 ? marigolds : buds).push(pt);
    }
  }
  const flowers = new THREE.Group();
  const anchor = PLATFORM + H;
  const mat = (key) =>
    applyWind(floraMaterial({ transparent: true, opacity: 0 }), { key: `pavilion-${key}`, factor: `clamp((${anchor.toFixed(2)} - wOrigin.y) / 1.4, 0.0, 1.0)`, amp: 0.04, freq: 1.5 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), c = new THREE.Color();
  const instanced = (geo, list, size, colors) => {
    const mesh = new THREE.InstancedMesh(geo, mat(colors[0]), list.length);
    list.forEach((pt, i) => {
      mesh.setMatrixAt(i, m4.compose(pt, q.setFromEuler(e.set(rand() * 6, rand() * 6, rand() * 6)), sc.setScalar(size * (0.85 + rand() * 0.3))));
      mesh.setColorAt(i, c.set(pick(colors, rand())));
    });
    flowers.add(mesh);
  };
  instanced(budGeometry(), buds, 0.02, PALETTE.jasmine);
  instanced(marigoldGeometry(), marigolds, 0.032, PALETTE.marigold);
  instanced(roseGeometry(), roses, 0.07, PALETTE.rose);
  instanced(jasmineGeometry(), jasmine, 0.05, PALETTE.jasmine);
  instanced(leafGeometry(), leaves, 0.12, PALETTE.leaf);
  top.add(flowers);
  parts.push({ obj: flowers, delay: 0.38, mode: 'fade' });

  // ── Monogram hanging from the back beam, framing the sea ──
  const medallion = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 48),
    new THREE.MeshStandardMaterial({ map: monogramTexture(firstName(weddingDetails.groom)[0], firstName(weddingDetails.bride)[0]), roughness: 0.35, metalness: 0.15, emissive: '#3a2a10', emissiveIntensity: 0.25, side: THREE.DoubleSide })
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.02, 10, 48), gold);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.42, 6), gold);
  cord.position.y = 0.47;
  medallion.add(face, ring, cord);
  const medallionPivot = new THREE.Group();
  medallionPivot.position.set(0, H - 0.02, -D);
  medallion.position.y = -0.68;
  medallionPivot.add(medallion);
  top.add(medallionPivot);
  parts.push({ obj: medallionPivot, delay: 0.45, mode: 'y' });

  // ── Brass kuthuvilakku lamps on the deck ──
  const lampGeo = new THREE.LatheGeometry(
    [V(0, 0), V(0.21, 0), V(0.21, 0.03), V(0.07, 0.08), V(0.04, 0.15), V(0.032, 0.72), V(0.055, 0.77), V(0.034, 0.82), V(0.17, 0.88), V(0.18, 0.92), V(0.03, 0.94), V(0.026, 1.06), V(0.055, 1.1), V(0, 1.2)],
    24
  );
  const glow = glowTexture();
  const lamps = new THREE.Group();
  const flames = [];
  const lampLights = [];
  for (const x of [-1.6, 1.6]) {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, D + 0.4);
    lamp.add(new THREE.Mesh(lampGeo, brass));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffb347', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      flame.position.set(Math.cos(a) * 0.15, 0.97, Math.sin(a) * 0.15);
      lamp.add(flame);
      flames.push(flame);
    }
    if (lights >= 2) {
      const light = new THREE.PointLight('#ffb062', 0, 7, 1.6);
      light.position.set(0, 1.1, 0.1);
      lamp.add(light);
      lampLights.push(light);
    }
    lamps.add(lamp);
  }
  top.add(lamps);
  parts.push({ obj: lamps, delay: 0.5, mode: 'y' });

  // Fairy-light outline along the canopy frame
  const eaves = [];
  const ey = PLATFORM + H + 0.12;
  for (const [ax, az, bx, bz] of [[-W, D, W, D], [W, D, W, -D], [W, -D, -W, -D], [-W, -D, -W, D]]) {
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.12);
    for (let i = 0; i < n; i++) eaves.push(new THREE.Vector3(ax + ((bx - ax) * i) / n, ey, az + ((bz - az) * i) / n));
  }

  let last = -1;
  return {
    group,
    eaves,
    update(st, time) {
      const f = st.mandap;
      if (Math.abs(f - last) > 0.001) {
        last = f;
        group.visible = f > 0.001;
        for (const p of parts) {
          const k = easeOutCubic(clamp((f - p.delay) / 0.45));
          if (p.mode === 'y') p.obj.scale.set(1, Math.max(k, 0.0001), 1);
          else if (p.mode === 'drop') {
            p.obj.position.y = (1 - k) * 2.2;
            p.obj.visible = k > 0.01;
          } else if (p.mode === 'fade') {
            p.obj.traverse((o) => {
              if (!o.material) return;
              o.material.opacity = k;
              o.material.transparent = k < 0.999;
              o.material.depthWrite = k > 0.999;
            });
            p.obj.visible = k > 0.01;
          }
        }
      }
      if (!group.visible) return;
      const on = Math.min(1, st.lamp) * clamp((f - 0.5) / 0.4);
      flames.forEach((fl, i) => {
        const flicker = 0.85 + Math.sin(time * 9 + i * 1.7) * 0.08 + Math.sin(time * 23 + i) * 0.05;
        fl.material.opacity = on;
        fl.scale.set(0.1 * flicker, 0.19 * flicker, 1);
      });
      lampLights.forEach((l, i) => (l.intensity = on * (2.4 + Math.sin(time * 11 + i) * 0.25)));
      medallionPivot.rotation.x = Math.sin(time * 0.9) * 0.05;
      medallionPivot.rotation.z = Math.sin(time * 0.6 + 1) * 0.03;
    },
  };
}
