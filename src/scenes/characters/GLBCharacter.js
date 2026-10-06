import * as THREE from 'three';

const NOMINAL_WALK_SPEED = 1.1; // m/s that the "Walk" clip is authored for

function findClip(clips, names) {
  const lower = clips.map((c) => c.name.toLowerCase());
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase());
    if (i >= 0) return clips[i];
  }
  for (const n of names) {
    const i = lower.findIndex((c) => c.split(/[|:]/).pop() === n.toLowerCase());
    if (i >= 0) return clips[i];
  }
  return null;
}

/** Removes horizontal root motion so a walk cycle stays in place. */
function stripRootMotion(clip) {
  clip = clip.clone();
  for (const track of clip.tracks) {
    if (!track.name.endsWith('.position')) continue;
    const node = track.name.slice(0, -'.position'.length).toLowerCase();
    if (!/hips|root|pelvis/.test(node)) continue;
    const v = track.values;
    const x0 = v[0], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 2] = z0;
    }
  }
  return clip;
}

/**
 * Wraps a loaded GLB character: normalises scale/orientation and blends the
 * named animation clips (Idle, Walk, WalkSlow, LookAtPartner, Smile,
 * WeddingPose) from the same per-frame state the stand-in characters use.
 */
export class GLBCharacter {
  constructor(gltf, cfg, clipNames, { side, quality }) {
    this.side = side;
    this.root = new THREE.Group();
    const model = gltf.scene;
    this.root.add(model);

    model.rotation.y = cfg.rotationY || 0;
    model.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y || 1;
    model.scale.multiplyScalar(cfg.heightMeters / height);
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = quality === 'high';
        if (o.isSkinnedMesh) o.frustumCulled = false; // skinned bounds don't follow animation
        if (o.material?.map) o.material.map.anisotropy = 4;
      }
    });

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    const clips = gltf.animations || [];
    for (const [key, names] of Object.entries(clipNames)) {
      let clip = findClip(clips, names);
      if (!clip) continue;
      if (cfg.stripRootMotion && (key === 'walk' || key === 'walkSlow')) clip = stripRootMotion(clip);
      if (key === 'smile') {
        clip = THREE.AnimationUtils.makeClipAdditive(clip.clone());
      }
      const action = this.mixer.clipAction(clip);
      if (key === 'smile') action.blendMode = THREE.AdditiveAnimationBlendMode;
      action.play();
      action.setEffectiveWeight(0);
      this.actions[key] = action;
    }
    const found = Object.keys(this.actions);
    console.info(`[models] ${cfg.url}: clips found → ${found.join(', ') || 'none (static pose)'}`);
  }

  update(dt, s) {
    const a = this.actions;
    const walk = s.walk;
    const still = 1 - walk;
    const slowShare = a.walkSlow ? 1 - Math.min(1, Math.abs(s.speed) / 0.9) : 0;

    const w = {
      walk: walk * (1 - slowShare),
      walkSlow: walk * slowShare,
      lookAtPartner: still * s.face,
      weddingPose: still * (1 - s.face) * s.pose,
    };
    w.idle = Math.max(0, 1 - w.walk - w.walkSlow - w.lookAtPartner - w.weddingPose);

    // Hand weight of missing clips to the closest available one
    if (!a.walkSlow) w.walk += w.walkSlow;
    if (!a.walk) w.idle += w.walk;
    if (!a.lookAtPartner) w.idle += w.lookAtPartner;
    if (!a.weddingPose) w.idle += w.weddingPose;

    for (const key of ['idle', 'walk', 'walkSlow', 'lookAtPartner', 'weddingPose']) {
      a[key]?.setEffectiveWeight(w[key] || 0);
    }
    a.smile?.setEffectiveWeight(Math.max(s.face, s.pose * 0.6));

    const speedScale = THREE.MathUtils.clamp(Math.abs(s.speed) / NOMINAL_WALK_SPEED, 0.35, 1.8);
    if (a.walk) a.walk.timeScale = Math.sign(s.speed || 1) * speedScale;
    if (a.walkSlow) a.walkSlow.timeScale = Math.sign(s.speed || 1) * Math.max(0.5, speedScale * 1.6);

    // The couple turn their bodies toward each other in the "moment" scene
    this.root.rotation.y = this.side * s.face * 1.25;
    this.mixer.update(dt);
  }
}
