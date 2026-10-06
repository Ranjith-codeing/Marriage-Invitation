import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { QUALITY } from '../utils/device.js';
import { clamp } from '../utils/math.js';
import { Director } from './Director.js';
import { Couple } from './characters/Couple.js';
import { DofPass } from './post/DofPass.js';
import { wind } from './world/wind.js';
import { createSky } from './world/Sky.js';
import { createGround } from './world/Ground.js';
import { createHorizon } from './world/Horizon.js';
import { createGrass } from './world/Grass.js';
import { createGarden } from './world/Garden.js';
import { createMandapam, PLATFORM } from './world/Mandapam.js';
import { createFairyLights } from './world/FairyLights.js';
import { createButterflies } from './world/Butterflies.js';
import { createNightSky } from './world/NightSky.js';
import { createLanterns } from './world/Lanterns.js';
import { createPetals } from './world/Petals.js';

// Yield to the browser between build steps (falls back to a timer if the tab is in the background)
const nextFrame = () =>
  new Promise((r) => {
    const t = setTimeout(r, 50);
    requestAnimationFrame(() => {
      clearTimeout(t);
      r();
    });
  });

const SHOWER_COLOURS = ['#b3123a', '#d23a5c', '#f29a1d', '#f7c531', '#fffaf1', '#e8879a'];

/**
 * The cinematic WebGL layer behind the page. Owns the renderer, the world,
 * the couple, the camera and post-processing; reads film time from the
 * ScrollTimeline every frame and renders the interpolated scene.
 */
export class Experience {
  constructor(canvas, { quality, timeline, onFrame }) {
    this.canvas = canvas;
    this.tier = quality;
    this.q = { ...QUALITY[quality] };
    this.timeline = timeline;
    this.onFrame = onFrame;
    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();
    this.clock = new THREE.Clock(false);
    this.focus = new THREE.Vector3();
    this.coupleCentre = new THREE.Vector3(0, PLATFORM + 1.0, 0);
    this.running = false;
    this.frameTimes = [];
    this.degradeStage = 0;
    this.envBakedAt = -Infinity;
    this.envSignature = null;
  }

  /** Builds the world (yielding between steps so the loader stays smooth) and loads the couple. */
  async load(onProgress = () => {}) {
    const { q } = this;
    const renderer = (this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.tier !== 'low' && !q.post, // the post chain has its own MSAA
      powerPreference: 'high-performance',
    }));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    renderer.toneMapping = THREE.NeutralToneMapping; // keeps the photograph's colours true
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = q.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.FogExp2('#000000', 0.03);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 900);
    onProgress(0.04, 'scene');
    await nextFrame();

    // Lights (plus image-based lighting baked from the sky, below)
    this.hemi = new THREE.HemisphereLight('#fff2df', '#5a4a3a', 0.6);
    this.sun = new THREE.DirectionalLight('#ffd39a', 2);
    if (q.shadows) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const c = this.sun.shadow.camera;
      c.left = c.bottom = -6;
      c.right = c.top = 6;
      c.near = 1;
      c.far = 40;
      this.sun.shadow.bias = -0.0003;
      this.sun.shadow.normalBias = 0.02;
    }
    this.fill = new THREE.DirectionalLight('#ffe6cc', 0.4); // soft front fill
    scene.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);

    // Sky, ground, horizon, clouds
    this.sky = createSky({ octaves: this.tier === 'high' ? 5 : this.tier === 'medium' ? 4 : 3 });
    this.ground = createGround();
    this.horizon = createHorizon();
    scene.add(this.sky.mesh, this.ground.group, this.horizon.group);
    this.setupEnvironment();
    onProgress(0.12, 'scene');
    await nextFrame();

    this.grass = createGrass({ count: q.grass });
    scene.add(this.grass.group);
    onProgress(0.2, 'scene');
    await nextFrame();
    this.garden = createGarden({ density: q.flowers });
    scene.add(this.garden.group);
    onProgress(0.3, 'scene');
    await nextFrame();
    this.mandapam = createMandapam({ lights: q.lampLights });
    this.fairy = createFairyLights({ crowns: this.garden.crowns, eaves: this.mandapam.eaves });
    this.butterflies = createButterflies({ count: q.butterflies });
    scene.add(this.mandapam.group, this.fairy.group, this.butterflies.group);
    onProgress(0.4, 'scene');
    await nextFrame();
    this.night = createNightSky({ stars: q.stars, fireflies: q.fireflies });
    this.lanterns = createLanterns({ count: q.lanterns });
    this.petals = createPetals({ count: q.petals });
    this.shower = createPetals({
      count: q.shower,
      box: [2.8, 3.4, 2.2],
      centre: new THREE.Vector3(0, PLATFORM + 1.7, 0.2),
      colors: SHOWER_COLOURS,
      size: 0.75,
      fall: 1.6,
      seed: 7,
      param: 'shower',
    });
    scene.add(this.night.group, this.lanterns.group, this.petals.points, this.shower.points);
    onProgress(0.48, 'scene');
    await nextFrame();

    // The couple (GLB models if present, otherwise their photo cutout)
    this.couple = new Couple({ quality: this.tier });
    const coupleMode = await this.couple.load((p) => onProgress(0.48 + p * 0.42, 'models'));
    scene.add(this.couple.group);

    this.director = new Director(this.timeline);
    this.setupPost();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    // Warm up: compile shaders, bake lighting and upload textures before the curtain rises
    this.director.snap(this.timeline.t);
    this.applyState(this.director.state, 0, 0);
    this.bakeEnvironment(true);
    renderer.compile(scene, this.camera);
    this.render();
    onProgress(1, 'ready');
    return { coupleMode };
  }

  /** Image-based lighting: the sky is re-baked into an environment map as its colours change. */
  setupEnvironment() {
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileCubemapShader();
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.sky.mesh.material));
  }

  bakeEnvironment(force = false) {
    const u = this.sky.mesh.material.uniforms;
    const sig = [u.uTop.value, u.uHorizon.value, u.uBottom.value, u.uSunColor.value].flatMap((c) => [c.r, c.g, c.b]).concat(u.uSun.value);
    const now = this.clock.elapsedTime;
    if (!force) {
      if (!this.q.envEvery || now - this.envBakedAt < this.q.envEvery) return;
      const delta = this.envSignature ? sig.reduce((a, v, i) => a + Math.abs(v - this.envSignature[i]), 0) : 1;
      if (delta < 0.03) return;
    }
    const target = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 100);
    this.envTarget?.dispose();
    this.envTarget = target;
    this.scene.environment = target.texture;
    this.envSignature = sig;
    this.envBakedAt = now;
  }

  setupPost() {
    if (!this.q.post) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(size.x, size.y),
    });
    const composer = (this.composer = new EffectComposer(this.renderer, target));
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.dof = new DofPass(this.camera);
    composer.addPass(this.dof);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.2, 0.5, 0.9);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.composer?.setPixelRatio(pr);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    for (const layer of [this.night, this.petals, this.shower, this.fairy, this.lanterns]) layer.setPixelRatio(pr);
    this.timeline.measure();
  }

  setPointer(x, y) {
    this.pointer.set(x, y);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    const time = this.clock.elapsedTime;
    const s = this.director.update(dt, this.timeline.t);
    this.applyState(s, dt, time);
    this.bakeEnvironment();
    this.render();
    this.onFrame?.(s);
    this.watchPerformance(dt);
  }

  applyState(s, dt, time) {
    const { camera, scene, renderer } = this;
    wind.time.value = time;

    // Camera orbit around the couple + slow "living camera" drift + pointer parallax
    this.pointerSmooth.lerp(this.pointer, Math.min(1, dt * 2));
    const z = s.coupleZ;
    const az = s.az + this.pointerSmooth.x * 0.05 + Math.sin(time * 0.21) * 0.02;
    const h = s.h + this.pointerSmooth.y * 0.08 + Math.sin(time * 0.33) * 0.05;
    const dist = s.dist + Math.sin(time * 0.17) * 0.12;
    camera.position.set(Math.sin(az) * dist, Math.max(0.3, h), z + Math.cos(az) * dist);
    this.focus.set(Math.sin(time * 0.13) * 0.03, s.lookY, z);
    camera.lookAt(this.focus);

    // Keep the couple framed on portrait screens by widening the lens
    const aspect = camera.aspect;
    const fov = aspect < 1.25 ? Math.min(72, s.fov * Math.pow(1.25 / aspect, 0.58)) : s.fov;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Atmosphere & light
    scene.fog.color.copy(s.fogColor);
    scene.fog.density = s.fogDensity;
    renderer.toneMappingExposure = s.exposure * 0.92;
    // Warm key light from the side + cool, lower ambient = depth and colour contrast
    scene.environmentIntensity = 0.3 * (1 - s.night * 0.55) + s.lamp * 0.04;
    this.hemi.intensity = s.hemi * 0.35;
    this.hemi.color.copy(s.skyTop).offsetHSL(0, 0, 0.12);
    this.hemi.groundColor.copy(s.skyBottom).multiplyScalar(0.6);
    this.sun.color.copy(s.sunColor);
    this.sun.intensity = s.sun * 1.15 + s.night * 0.4; // moonlight in the final scene
    // Low sun from the left, slightly behind: lit left faces, long shadows across the path
    this.sun.position.set(-11, 7.5 - s.night * 2, z - 3);
    this.sun.target.position.set(0, 0, z);
    this.fill.position.set(camera.position.x * 0.5 + 2, 4, camera.position.z + 2);
    this.fill.target.position.set(0, 1.2, z);
    this.fill.intensity = 0.1 + s.hemi * 0.15 + s.lamp * 0.12;

    this.sky.update(s, camera, time);
    this.ground.update(s);
    this.horizon.update(s);
    this.garden.update(s);
    this.mandapam.update(s, time);
    this.fairy.update(s, time);
    this.butterflies.update(s, time);
    this.night.update(s, time, camera);
    this.lanterns.update(s, time, dt);
    this.petals.update(s, time, camera, this.focus);
    this.shower.update(s, time, camera, this.focus);
    this.couple.update(dt, s, time, camera);

    if (this.bloom) this.bloom.strength = 0.12 + s.lamp * 0.08 + s.night * 0.15;
    if (this.dof) {
      this.dof.uniforms.focus.value = camera.position.distanceTo(this.coupleCentre);
      this.dof.uniforms.strength.value = s.dof;
    }
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /** If the device struggles, step quality down instead of stuttering. */
  watchPerformance(dt) {
    if (this.degradeStage >= 3) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 150) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg <= 1 / 38) return;
    this.degradeStage++;
    if (this.degradeStage === 1 && this.composer) {
      this.composer = this.bloom = this.dof = null; // drop post-processing first
    } else if (this.degradeStage <= 2) {
      this.renderer.setPixelRatio(clamp(this.renderer.getPixelRatio() * 0.8, 0.75, 2));
      this.resize();
    } else {
      this.grass.group.visible = false;
    }
    console.info(`[scene] Reduced render quality (stage ${this.degradeStage}) for smoother playback.`);
  }
}
