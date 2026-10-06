import * as THREE from 'three';
import { couplePhoto, assetUrl } from '../../config/assets.js';
import { glowTexture, blobShadowTexture } from '../../utils/textures.js';
import { seededRandom } from '../../utils/math.js';
import { roseGeometry, jasmineGeometry, marigoldGeometry, leafGeometry, floraMaterial, PALETTE, pick } from '../world/flora.js';

const MOONLIGHT = new THREE.Color(0.62, 0.66, 0.85);
const LAMPLIGHT = new THREE.Color(1.0, 0.82, 0.62);

/**
 * Ranjith & Jayachitra from their photograph: a background-removed cutout
 * that turns gently to face the camera, colour-matched to the scene's light,
 * with a warm halo behind them, flowers at their feet and a soft contact shadow.
 */
export class PhotoCouple {
  constructor({ quality }) {
    this.quality = quality;
    this.root = new THREE.Group();
    this.root.name = 'photo-couple';
    this.tint = new THREE.Color();
  }

  async load() {
    const texture = await new THREE.TextureLoader().loadAsync(assetUrl(couplePhoto.cutout));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const aspect = texture.image.width / texture.image.height;
    const h = couplePhoto.heightMeters;
    const w = h * aspect;
    this.width = w;

    // Photo plane, pivoting around its vertical centre line
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    this.material = new THREE.ShaderMaterial({
      fog: true,
      uniforms: {
        ...THREE.UniformsLib.fog,
        uMap: { value: texture },
        uTint: { value: new THREE.Color(1, 1, 1) },
        uOpacity: { value: 1 },
        uFadeBottom: { value: couplePhoto.flowers === 'bank' ? 0.14 : 0.015 },
        uRim: { value: new THREE.Color('#ffd9a0') },
        uRimStrength: { value: 0.0 },
      },
      transparent: true,
      depthWrite: true,
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uTint, uRim;
        uniform float uOpacity, uFadeBottom, uRimStrength;
        #include <fog_pars_fragment>
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(uMap, vUv);
          // soft warm rim where the alpha falls off (backlight wrapping the silhouette)
          vec2 px = vec2(0.004);
          float edge = texture2D(uMap, vUv + vec2(px.x, 0.0)).a + texture2D(uMap, vUv - vec2(px.x, 0.0)).a
                     + texture2D(uMap, vUv + vec2(0.0, px.y)).a + texture2D(uMap, vUv - vec2(0.0, px.y)).a;
          float rim = clamp(1.0 - edge * 0.25, 0.0, 1.0) * c.a;
          vec3 col = c.rgb * uTint + uRim * rim * uRimStrength;
          float a = c.a * uOpacity * smoothstep(0.0, uFadeBottom + 0.0001, vUv.y);
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    this.photo = new THREE.Mesh(geo, this.material);
    this.photo.position.y = couplePhoto.topMeters - h;
    this.photo.renderOrder = 2;
    this.root.add(this.photo);

    // Warm halo behind them
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffcf8a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })
    );
    this.halo.position.set(0, couplePhoto.topMeters - h * 0.42, -0.3);
    this.halo.scale.set(w * 1.9, h * 1.55, 1);
    this.root.add(this.halo);

    // Soft contact shadow
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.25, 0.9).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: blobShadowTexture(), color: '#000000', transparent: true, opacity: 0.5, depthWrite: false })
    );
    shadow.position.y = 0.004;
    this.root.add(shadow);

    if (couplePhoto.flowers === 'bank') this.root.add(this.flowerBed(w, { height: couplePhoto.topMeters - h + 0.24, tube: 0.2, span: 1.45, density: 1 }));
    if (couplePhoto.flowers === 'border') {
      this.root.add(this.flowerBed(w, { height: 0.2, tube: 0.16, span: 1.15, density: 0.55, radius: Math.max(0.9, w * 0.62) }));
      this.root.add(this.strewnPetals());
    }
    return this;
  }

  /** Crescent of flowers wrapping the front and sides of the couple. */
  flowerBed(photoWidth, { height, tube, span, density, radius = Math.max(0.62, photoWidth * 0.62) }) {
    const group = new THREE.Group();
    const rand = seededRandom(77);
    const H = Math.max(0.05, height - 0.05);
    const low = this.quality === 'low';

    // Leafy mound
    const mound = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 48, span * 2), new THREE.MeshStandardMaterial({ color: '#34502a', roughness: 0.9 }));
    mound.rotation.set(Math.PI / 2, 0, Math.PI / 2 - span);
    mound.scale.set(1, 1, H / tube);
    group.add(mound);

    // Points on the mound's outer face and top (the side guests see)
    const surface = (out, depth) => {
      const a = (rand() * 2 - 1) * span;
      const y = Math.min(H, rand() * H * 1.04);
      const w = tube * Math.sqrt(Math.max(0, 1 - (y / H) ** 2));
      const r = radius + w * depth + (rand() - 0.5) * 0.05;
      return out.set(Math.sin(a) * r, y, Math.cos(a) * r);
    };

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), c = new THREE.Color();
    const UP = new THREE.Vector3(0, 1, 0);
    const scatter = (geo, n, size, colors, depth) => {
      const mesh = new THREE.InstancedMesh(geo, floraMaterial(), n);
      const p = new THREE.Vector3(), out = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        surface(p, depth);
        out.set(p.x, 0, p.z).normalize().multiplyScalar(0.7).add(UP.clone().multiplyScalar(0.7)).normalize();
        q.setFromUnitVectors(UP, out).multiply(new THREE.Quaternion().setFromEuler(e.set(0, rand() * 6, 0)));
        const k = size * (0.8 + rand() * 0.4);
        mesh.setMatrixAt(i, m4.compose(p, q, s.set(k, k, k)));
        mesh.setColorAt(i, c.set(pick(colors, rand())));
      }
      group.add(mesh);
    };
    const n = (x) => Math.round(x * density * (low ? 0.5 : 1));
    scatter(leafGeometry(), n(700), 0.07, PALETTE.leaf, 0.9);
    scatter(roseGeometry(), n(900), 0.055, PALETTE.rose, 1.02);
    scatter(jasmineGeometry(), n(900), 0.032, PALETTE.jasmine, 1.04);
    scatter(marigoldGeometry(), n(500), 0.03, PALETTE.marigold, 1.03);
    return group;
  }

  /** Rose petals scattered on the marble in front of the couple. */
  strewnPetals() {
    const rand = seededRandom(5);
    const count = this.quality === 'low' ? 80 : 180;
    const geo = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
    geo.scale(0.7, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }), count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = (rand() - 0.5) * 2.6;
      const r = 1.05 + Math.pow(rand(), 0.7) * 1.1;
      p.set(Math.sin(a) * r, 0.006 + rand() * 0.004, Math.cos(a) * r * 0.85);
      const k = 0.02 + rand() * 0.012;
      mesh.setMatrixAt(i, m4.compose(p, q.setFromEuler(e.set((rand() - 0.5) * 0.3, rand() * 6, (rand() - 0.5) * 0.3)), s.set(k, k, k)));
      mesh.setColorAt(i, c.set(pick([...PALETTE.rose, '#f7c531', '#fff6e8'], rand())));
    }
    return mesh;
  }

  /** Called every frame. */
  update(dt, s, time, camera) {
    // Cylindrical billboard: turn toward the camera around the vertical axis (softened)
    const dx = camera.position.x - this.root.position.x;
    const dz = camera.position.z - this.root.position.z;
    this.photo.rotation.y = Math.atan2(dx, dz) * 0.85;

    // Match the scene light: warm at golden hour, cool moonlight at night, lamp glow
    const u = this.material.uniforms;
    this.tint.setRGB(1, 1, 1).lerp(s.sunColor, 0.15).multiplyScalar(0.78 + Math.min(0.3, s.hemi * 0.28));
    this.tint.lerp(MOONLIGHT, s.night * 0.4);
    const flicker = 1 + Math.sin(time * 9.3) * 0.015 * s.lamp + Math.sin(time * 23.1) * 0.01 * s.lamp;
    this.tint.lerp(LAMPLIGHT, Math.min(0.35, s.lamp * 0.22));
    this.tint.multiplyScalar((0.22 + 0.78 * Math.min(1, s.hemi * 2.2 + s.lamp * 0.45)) * flicker);
    u.uTint.value.copy(this.tint);
    u.uOpacity.value = s.reveal;
    u.uRimStrength.value = 0.3 + s.lamp * 0.25 + s.night * 0.2;
    this.photo.visible = s.reveal > 0.01;

    const breathe = 1 + Math.sin(time * 0.8) * 0.03;
    this.halo.material.opacity = s.reveal * (0.14 + s.lamp * 0.1 + s.night * 0.18) * breathe;
  }
}
