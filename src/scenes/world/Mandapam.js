import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, easeOutCubic, seededRandom, firstName } from '../../utils/math.js';
import { glowTexture, marbleTexture, silkTexture, monogramTexture } from '../../utils/textures.js';
import { budGeometry, marigoldGeometry, leafGeometry, roseGeometry, floraMaterial, PALETTE, pick } from './flora.js';
import { applyWind, wind } from './wind.js';
import { weddingDetails } from '../../config/wedding.js';

const V = (x, y) => new THREE.Vector2(x, y);

/** Height of the mandapam platform; the couple stands on top of it. */
export const PLATFORM = 0.18;

const W = 2.05; // half-spacing of the pillars (x)
const D = 1.75; // half-spacing of the pillars (z)
const H = 3.0; // pillar height above the platform

/** Square frustum (4-sided cylinder turned 45°), stretched to the mandapam's proportions. */
function frustum(halfTop, halfBottom, height, depthRatio = D / W) {
  const g = new THREE.CylinderGeometry(halfTop * Math.SQRT2, halfBottom * Math.SQRT2, height, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(1, 1, depthRatio);
  return g;
}

/**
 * An elegant South Indian wedding mandapam at the end of the garden path:
 * raised platform with a polished marble floor, carved pillars, a tiered
 * vimana roof with gold kalasam, a rippling silk canopy, a hanging brass lamp,
 * temple bells, jasmine curtains, banana trees and kuthuvilakku lamps.
 * `mandap` (0–1) assembles it piece by piece as the camera approaches.
 */
export function createMandapam({ lights = 0 }) {
  const group = new THREE.Group();
  const rand = seededRandom(9);
  const parts = []; // { obj, delay, mode }

  const ivory = new THREE.MeshStandardMaterial({ color: '#f2e8d5', roughness: 0.5 });
  const stone = new THREE.MeshStandardMaterial({ color: '#d8c7a8', roughness: 0.65 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d9ad55', roughness: 0.22, metalness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c79a45', roughness: 0.28, metalness: 1 });
  const wine = new THREE.MeshStandardMaterial({ color: '#6e1a2e', roughness: 0.5 });
  const marble = new THREE.MeshPhysicalMaterial({ map: marbleTexture(), roughness: 0.14, clearcoat: 0.8, clearcoatRoughness: 0.08 });

  // ── Platform, marble floor, gold inlay and front steps ──
  const base = new THREE.Group();
  const PW = W + 0.6, PD = D + 0.6;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(PW * 2, PLATFORM, PD * 2), stone);
  plinth.position.y = PLATFORM / 2;
  plinth.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PW * 2 - 0.08, PD * 2 - 0.08).rotateX(-Math.PI / 2), marble);
  floor.position.y = PLATFORM + 0.002;
  floor.receiveShadow = true;
  base.add(plinth, floor);
  const inlay = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), gold);
    m.position.set(x, PLATFORM + 0.003, z);
    base.add(m);
  };
  const IW = PW - 0.2, ID = PD - 0.2;
  inlay(IW * 2, 0.035, 0, ID);
  inlay(IW * 2, 0.035, 0, -ID);
  inlay(0.035, ID * 2, IW, 0);
  inlay(0.035, ID * 2, -IW, 0);
  for (const [h, z] of [[PLATFORM * 0.66, PD + 0.16], [PLATFORM * 0.33, PD + 0.48]]) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.8, h, 0.32), stone);
    step.position.set(0, h / 2, z);
    step.receiveShadow = true;
    base.add(step);
  }
  group.add(base);
  parts.push({ obj: base, delay: 0, mode: 'y' });

  // Everything above the platform
  const top = new THREE.Group();
  top.position.y = PLATFORM;
  group.add(top);

  // ── Carved pillars with brackets ──
  const pillarProfile = [
    V(0.0, 0), V(0.21, 0), V(0.21, 0.08), V(0.16, 0.12), V(0.13, 0.3), V(0.17, 0.36), V(0.17, 0.42), V(0.13, 0.48),
    V(0.12, 1.2), V(0.155, 1.28), V(0.155, 1.36), V(0.12, 1.44), V(0.115, 2.3), V(0.15, 2.38), V(0.15, 2.46),
    V(0.115, 2.54), V(0.12, 2.72), V(0.2, 2.84), V(0.24, 2.9), V(0.24, H), V(0.0, H),
  ];
  const pillarGeo = new THREE.LatheGeometry(pillarProfile, 20);
  const bandGeo = new THREE.TorusGeometry(0.158, 0.02, 8, 28);
  const bracketGeo = mergeGeometries([
    new THREE.BoxGeometry(0.72, 0.09, 0.16).translate(0, H - 0.05, 0),
    new THREE.BoxGeometry(0.16, 0.09, 0.72).translate(0, H - 0.05, 0),
    new THREE.BoxGeometry(0.52, 0.07, 0.12).translate(0, H - 0.13, 0),
    new THREE.BoxGeometry(0.12, 0.07, 0.52).translate(0, H - 0.13, 0),
  ]);
  const tipGeo = new THREE.SphereGeometry(0.035, 10, 8);
  for (const [x, z] of [[-W, -D], [W, -D], [-W, D], [W, D]]) {
    const pillar = new THREE.Group();
    pillar.position.set(x, 0, z);
    const shaft = new THREE.Mesh(pillarGeo, ivory);
    shaft.castShadow = true;
    pillar.add(shaft);
    for (const y of [0.39, 1.32, 2.42]) {
      const band = new THREE.Mesh(bandGeo, gold);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      pillar.add(band);
    }
    const plinthBlock = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.48), stone);
    plinthBlock.position.y = 0.07;
    pillar.add(plinthBlock, new THREE.Mesh(bracketGeo, ivory));
    for (const [bx, bz] of [[0.36, 0], [-0.36, 0], [0, 0.36], [0, -0.36]]) {
      const tip = new THREE.Mesh(tipGeo, gold);
      tip.position.set(bx, H - 0.15, bz);
      pillar.add(tip);
    }
    top.add(pillar);
    parts.push({ obj: pillar, delay: 0.05 + rand() * 0.08, mode: 'y' });
  }

  // ── Roof: beams with dentil frieze, sloping eaves, stepped vimana, kalasam ──
  const roof = new THREE.Group();
  for (const z of [-D, D]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 0.55, 0.22, 0.34), ivory);
    beam.position.set(0, H + 0.11, z);
    beam.castShadow = true;
    roof.add(beam);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 0.57, 0.035, 0.36), gold);
    trim.position.set(0, H + 0.01, z);
    roof.add(trim);
  }
  for (const x of [-W, W]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, D * 2 + 0.55), ivory);
    beam.position.set(x, H + 0.11, 0);
    roof.add(beam);
  }
  const dentils = [];
  for (const z of [-D - 0.19, D + 0.19]) {
    for (let x = -W - 0.2; x <= W + 0.2; x += 0.14) dentils.push(new THREE.BoxGeometry(0.07, 0.07, 0.05).translate(x, H + 0.15, z));
  }
  roof.add(new THREE.Mesh(mergeGeometries(dentils), gold));

  const eaveBottomY = H + 0.24;
  const eave = new THREE.Mesh(frustum(W + 0.32, W + 0.72, 0.24), ivory);
  eave.position.y = eaveBottomY + 0.12;
  eave.castShadow = true;
  roof.add(eave);
  const eaveTrim = new THREE.Mesh(frustum(W + 0.74, W + 0.74, 0.04), gold);
  eaveTrim.position.y = eaveBottomY;
  roof.add(eaveTrim);
  let y = eaveBottomY + 0.24;
  const band = new THREE.Mesh(frustum(W + 0.3, W + 0.3, 0.16), wine);
  band.position.y = y + 0.08;
  roof.add(band);
  y += 0.16;
  for (const [t, b, h] of [[1.55, 1.95, 0.42], [1.05, 1.4, 0.4], [0.6, 0.92, 0.36]]) {
    const tier = new THREE.Mesh(frustum(t, b, h), ivory);
    tier.position.y = y + h / 2;
    tier.castShadow = true;
    roof.add(tier);
    const rim = new THREE.Mesh(frustum(b + 0.04, b + 0.04, 0.035), gold);
    rim.position.y = y + 0.018;
    roof.add(rim);
    y += h;
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ivory);
  dome.scale.set(1, 0.75, D / W);
  dome.position.y = y;
  roof.add(dome);
  const kalasamGeo = new THREE.LatheGeometry([V(0, 0), V(0.08, 0), V(0.055, 0.04), V(0.11, 0.13), V(0.065, 0.24), V(0.03, 0.28), V(0.04, 0.32), V(0, 0.46)], 16);
  const kalasam = new THREE.Mesh(kalasamGeo, gold);
  kalasam.position.y = y + 0.36;
  kalasam.scale.setScalar(1.25);
  roof.add(kalasam);
  for (const [kx, kz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const k = new THREE.Mesh(kalasamGeo, gold);
    k.position.set(kx * (W + 0.3), eaveBottomY + 0.24, kz * (D + 0.26));
    k.scale.setScalar(0.6);
    roof.add(k);
  }

  // Silk canopy under the roof, rippling gently
  const canopyGeo = new THREE.PlaneGeometry(W * 2 - 0.1, D * 2 - 0.1, 28, 22).rotateX(Math.PI / 2);
  {
    const p = canopyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (W - 0.05), v = p.getZ(i) / (D - 0.05);
      p.setY(i, -0.32 * (1 - u * u) * (1 - v * v));
    }
    canopyGeo.computeVertexNormals();
  }
  const canopyMat = new THREE.MeshStandardMaterial({ map: silkTexture(), roughness: 0.42, metalness: 0.1, side: THREE.DoubleSide });
  canopyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = wind.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float edge = (1.0 - abs(position.x) / ${(W - 0.05).toFixed(2)}) * (1.0 - abs(position.z) / ${(D - 0.05).toFixed(2)});
        transformed.y += sin(uWindTime * 1.1 + position.x * 2.6 + position.z * 1.7) * 0.025 * edge;`
      );
  };
  canopyMat.customProgramCacheKey = () => 'mandapam-canopy';
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = H - 0.02;
  roof.add(canopy);

  // Hanging brass lamp (thooku vilakku) on a chain above the couple
  const hanging = new THREE.Group();
  hanging.position.y = H - 0.36;
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.52, 6), brass);
  chain.position.y = -0.26;
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([V(0, 0), V(0.05, 0.005), V(0.17, 0.06), V(0.19, 0.1), V(0.0, 0.1)], 24), brass);
  bowl.position.y = -0.64;
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 12), brass);
  finial.position.y = -0.5;
  hanging.add(chain, bowl, finial);
  roof.add(hanging);

  top.add(roof);
  parts.push({ obj: roof, delay: 0.22, mode: 'drop' });

  // ── Open floral gateway at the back, with the couple's monogram ──
  const gateway = new THREE.Group();
  const GR = 1.25, GY = 1.62;
  const gateArch = new THREE.Mesh(new THREE.TorusGeometry(GR, 0.05, 10, 48, Math.PI), wine);
  gateArch.position.y = GY;
  const gateTrim = new THREE.Mesh(new THREE.TorusGeometry(GR + 0.07, 0.018, 8, 48, Math.PI), gold);
  gateTrim.position.y = GY;
  gateway.add(gateArch, gateTrim);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, GY, 12), wine);
    post.position.set(s * GR, GY / 2, 0);
    gateway.add(post);
  }
  const medallion = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 48),
    new THREE.MeshStandardMaterial({
      map: monogramTexture(firstName(weddingDetails.groom)[0], firstName(weddingDetails.bride)[0]),
      roughness: 0.35,
      metalness: 0.15,
      emissive: '#3a2a10',
      emissiveIntensity: 0.25,
    })
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.022, 10, 48), gold);
  medallion.add(face, ring);
  medallion.position.set(0, GY + GR * 0.55, 0.03);
  gateway.add(medallion);
  gateway.position.set(0, 0, -D);
  top.add(gateway);
  parts.push({ obj: gateway, delay: 0.3, mode: 'y' });

  // ── Garlands: jasmine buds + marigolds (own materials so they can fade in) ──
  const jasmine = [], marigold = [], roses = [], leaves = [];
  const swag = (x0, x1, yTop, z, sag, n, every = 0) => {
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = new THREE.Vector3(x0 + (x1 - x0) * u, yTop - sag * 4 * u * (1 - u), z);
      (every && i % every === 0 ? marigold : jasmine).push(p);
    }
  };
  const xs = [-W, -W / 3, W / 3, W];
  for (let i = 0; i < 3; i++) swag(xs[i], xs[i + 1], H - 0.05, D + 0.2, 0.42, 46, 5);
  for (const x of [-W - 0.2, W + 0.2]) {
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      (i % 5 === 0 ? marigold : jasmine).push(new THREE.Vector3(x, H - 0.05 - 0.4 * 4 * u * (1 - u), -D + u * 2 * D));
    }
  }
  // Spiral garlands up each pillar
  for (const [px, pz] of [[-W, -D], [W, -D], [-W, D], [W, D]]) {
    for (let i = 0; i < 110; i++) {
      const u = i / 109;
      const a = u * Math.PI * 8;
      (Math.floor(i / 6) % 2 ? marigold : jasmine).push(new THREE.Vector3(px + Math.cos(a) * 0.155, 0.5 + u * 2.25, pz + Math.sin(a) * 0.155));
    }
  }
  // Jasmine curtains ("poo thoranam") from the front and back beams, open in the middle
  const hangAnchor = PLATFORM + H - 0.04;
  for (const z of [D + 0.24, -D - 0.2]) {
    for (let x = -W + 0.08; x <= W - 0.08; x += 0.1) {
      if (Math.abs(x) < 0.95) continue;
      const len = 0.35 + ((Math.abs(x) - 0.95) / (W - 0.95)) * 0.85;
      const n = Math.round(len / 0.035);
      for (let k = 0; k < n; k++) {
        const p = new THREE.Vector3(x + (rand() - 0.5) * 0.01, H - 0.06 - k * 0.035, z);
        if (k === n - 1) roses.push(p);
        else if (k % 9 === 8) marigold.push(p);
        else jasmine.push(p);
      }
    }
  }
  // Jasmine along the gateway arch
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI;
    const p = new THREE.Vector3(Math.cos(a) * (GR - 0.07), GY + Math.sin(a) * (GR - 0.07), -D + 0.04);
    (i % 5 === 0 ? marigold : jasmine).push(p);
  }
  // Mango-leaf thoranam along the front beam
  for (let i = 0; i < 40; i++) leaves.push(new THREE.Vector3(-W + 0.1 + (i / 39) * (W * 2 - 0.2), H + 0.02, D + 0.19));

  const garlands = new THREE.Group();
  const hang = (key) =>
    applyWind(floraMaterial({ transparent: true, opacity: 0 }), {
      key: `mandap-${key}`,
      factor: `clamp((${hangAnchor.toFixed(3)} - wOrigin.y) / 1.2, 0.0, 1.0)`,
      amp: 0.045,
      freq: 1.4,
    });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  const c = new THREE.Color();
  const instanced = (geo, mat, list, size, colors, rot = () => e.set(rand() * 0.4, rand() * 6, rand() * 0.4)) => {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => {
      mesh.setMatrixAt(i, m4.compose(p, q.setFromEuler(rot()), s.setScalar(size * (0.85 + rand() * 0.3))));
      mesh.setColorAt(i, c.set(pick(colors, rand())));
    });
    garlands.add(mesh);
    return mesh;
  };
  instanced(budGeometry(), hang('bud'), jasmine, 0.02, PALETTE.jasmine);
  instanced(marigoldGeometry(), hang('marigold'), marigold, 0.032, PALETTE.marigold);
  instanced(roseGeometry(), hang('rose'), roses, 0.06, PALETTE.rose.slice(0, 3), () => e.set(Math.PI, rand() * 6, 0));
  instanced(leafGeometry(), hang('leaf'), leaves, 0.2, PALETTE.leaf, () => e.set(Math.PI, 0, (rand() - 0.5) * 0.3));
  top.add(garlands);
  parts.push({ obj: garlands, delay: 0.4, mode: 'fade' });

  // ── Temple bells over the entrance, swaying ──
  const bellGeo = mergeGeometries(
    [
      new THREE.CylinderGeometry(0.004, 0.004, 0.09, 4).translate(0, -0.045, 0),
      new THREE.LatheGeometry([V(0, -0.09), V(0.012, -0.092), V(0.03, -0.12), V(0.042, -0.16), V(0.048, -0.17), V(0, -0.17)], 16),
    ].map((g) => {
      const n = g.toNonIndexed();
      n.deleteAttribute('uv');
      return n;
    })
  );
  const bellXs = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75];
  const bells = new THREE.InstancedMesh(bellGeo, brass, bellXs.length);
  bells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bells.frustumCulled = false;
  top.add(bells);
  parts.push({ obj: bells, delay: 0.45, mode: 'y' });

  // ── Banana trees at the entrance (a traditional welcome) ──
  const banana = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8f9a4a', roughness: 0.8 });
  const bananaLeafMat = applyWind(new THREE.MeshStandardMaterial({ color: '#5c8a2e', roughness: 0.65, side: THREE.DoubleSide }), {
    key: 'banana',
    factor: 'clamp(transformed.y / 1.5, 0.0, 1.0)',
    amp: 0.08,
    freq: 1.3,
  });
  const leafGeo = new THREE.PlaneGeometry(0.36, 1.5, 1, 10);
  {
    const p = leafGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const yy = p.getY(i) + 0.75;
      p.setZ(i, -0.2 * yy * yy);
      p.setX(i, p.getX(i) * Math.sin(Math.min(1, yy / 1.5) * Math.PI * 0.95 + 0.15));
    }
    leafGeo.translate(0, 0.75, 0);
    leafGeo.computeVertexNormals();
  }
  for (const sgn of [-1, 1]) {
    const tree = new THREE.Group();
    tree.position.set(sgn * (W + 0.75), 0, D + 1.05);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.4, 12), trunkMat);
    trunk.position.y = 1.2;
    tree.add(trunk);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(leafGeo, bananaLeafMat);
      leaf.position.y = 2.2 + i * 0.05;
      leaf.rotation.set(-0.9 - rand() * 0.4, (i / 7) * Math.PI * 2 + rand(), 0);
      tree.add(leaf);
    }
    banana.add(tree);
  }
  group.add(banana);
  parts.push({ obj: banana, delay: 0.32, mode: 'y' });

  // ── Brass kuthuvilakku lamps on the platform, plus flames on the hanging lamp ──
  const lampGeo = new THREE.LatheGeometry(
    [V(0, 0), V(0.21, 0), V(0.21, 0.03), V(0.07, 0.08), V(0.04, 0.15), V(0.032, 0.72), V(0.055, 0.77), V(0.034, 0.82), V(0.17, 0.88), V(0.18, 0.92), V(0.03, 0.94), V(0.026, 1.06), V(0.055, 1.1), V(0, 1.2)],
    24
  );
  const glow = glowTexture();
  const lamps = new THREE.Group();
  const flames = [];
  const lampLights = [];
  const flameMat = () => new THREE.SpriteMaterial({ map: glow, color: '#ffb347', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const addFlames = (parent, fy, radius, n) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const flame = new THREE.Sprite(flameMat());
      flame.position.set(Math.cos(a) * radius, fy, Math.sin(a) * radius);
      parent.add(flame);
      flames.push(flame);
    }
  };
  for (const x of [-1.6, 1.6]) {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, D + 0.4);
    lamp.add(new THREE.Mesh(lampGeo, brass));
    addFlames(lamp, 0.97, 0.15, 5);
    if (lights >= 3) {
      const light = new THREE.PointLight('#ffb062', 0, 7, 1.6);
      light.position.set(0, 1.1, 0.1);
      lamp.add(light);
      lampLights.push(light);
    }
    lamps.add(lamp);
  }
  top.add(lamps);
  parts.push({ obj: lamps, delay: 0.5, mode: 'y' });
  addFlames(bowl, 0.12, 0.15, 6);
  if (lights >= 1) {
    const light = new THREE.PointLight('#ffb468', 0, 6, 1.5);
    light.position.y = -0.5;
    hanging.add(light);
    lampLights.push(light);
  }

  // Points along the eaves, for the fairy-light outline
  const eaves = [];
  const ex = W + 0.72, ez = (W + 0.72) * (D / W), ey = PLATFORM + eaveBottomY - 0.02;
  for (const [ax, az, bx, bz] of [[-ex, ez, ex, ez], [ex, ez, ex, -ez], [ex, -ez, -ex, -ez], [-ex, -ez, -ex, ez]]) {
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.13);
    for (let i = 0; i < n; i++) eaves.push(new THREE.Vector3(ax + ((bx - ax) * i) / n, ey, az + ((bz - az) * i) / n));
  }

  let last = -1;
  const bellM = new THREE.Matrix4(), bellR = new THREE.Matrix4();
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
          const v = Math.max(k, 0.0001);
          if (p.mode === 'y') p.obj.scale.set(1, v, 1);
          else if (p.mode === 'drop') {
            p.obj.position.y = (1 - k) * 2.5;
            p.obj.scale.setScalar(0.85 + 0.15 * k);
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

      // Lamps: warm flicker, gated by the scene's lamp level
      const on = Math.min(1, st.lamp) * clamp((f - 0.5) / 0.4);
      flames.forEach((fl, i) => {
        const flicker = 0.85 + Math.sin(time * 9 + i * 1.7) * 0.08 + Math.sin(time * 23 + i) * 0.05;
        fl.material.opacity = on;
        fl.scale.set(0.1 * flicker, 0.19 * flicker, 1);
      });
      lampLights.forEach((l, i) => (l.intensity = on * (2.4 + Math.sin(time * 11 + i) * 0.25)));

      // Hanging lamp and bells sway gently
      hanging.rotation.z = Math.sin(time * 0.7) * 0.025;
      hanging.rotation.x = Math.sin(time * 0.53 + 1) * 0.02;
      bellXs.forEach((x, i) => {
        bellR.makeRotationX(Math.sin(time * 1.6 + i * 1.3) * 0.14);
        bellM.makeTranslation(x, H, D + 0.08).multiply(bellR);
        bells.setMatrixAt(i, bellM);
      });
      bells.instanceMatrix.needsUpdate = true;
    },
  };
}
