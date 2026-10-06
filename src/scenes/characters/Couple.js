import * as THREE from 'three';
import { models } from '../../config/assets.js';
import { available, modelBytes } from '../../data/publicAssets.js';
import { loadGLB } from './loadModel.js';
import { GLBCharacter } from './GLBCharacter.js';
import { PhotoCouple } from './PhotoCouple.js';
import { PLATFORM } from '../world/Mandapam.js';

/**
 * Ranjith & Jayachitra, standing together in the mandapam.
 *
 *   1. public/models/groom.glb + bride.glb present → rigged 3D models
 *      (Idle / LookAtPartner / Smile / WeddingPose clips)
 *   2. otherwise → their real photograph as a background-removed cutout
 *   3. neither → the scene plays without the couple
 */
export class Couple {
  constructor({ quality }) {
    this.quality = quality;
    this.group = new THREE.Group();
    this.group.name = 'couple';
    this.group.position.y = PLATFORM; // standing on the mandapam platform
    this.mode = 'none';
  }

  async load(onProgress = () => {}) {
    if (available.groomModel && available.brideModel) {
      const progress = { groom: 0, bride: 0 };
      const load = (who) =>
        loadGLB(models[who].url, {
          expectedBytes: modelBytes[who],
          timeoutMs: models.timeoutSeconds * 1000,
          onProgress: (p) => {
            progress[who] = p;
            onProgress((progress.groom + progress.bride) / 2);
          },
        });
      const [g, b] = await Promise.all([load('groom'), load('bride')]);
      if (g && b) {
        const opts = (side) => ({ side, quality: this.quality });
        this.groom = new GLBCharacter(g, models.groom, models.clips, opts(1));
        this.bride = new GLBCharacter(b, models.bride, models.clips, opts(-1));
        this.groom.root.position.x = -0.32;
        this.bride.root.position.x = 0.32;
        this.group.add(this.groom.root, this.bride.root);
        this.mode = 'models';
      }
    }

    if (this.mode === 'none' && available.coupleCutout) {
      try {
        this.photo = await new PhotoCouple({ quality: this.quality }).load();
        this.group.add(this.photo.root);
        this.mode = 'photo';
      } catch (err) {
        console.warn('[couple] Could not load the couple cutout image.', err);
      }
    }
    onProgress(1);
    return this.mode;
  }

  /** Called every frame with the smoothed scene state. */
  update(dt, s, time, camera) {
    if (this.mode === 'photo') {
      this.photo.update(dt, s, time, camera);
    } else if (this.mode === 'models') {
      const shared = { walk: 0, speed: 0, lookAt: s.lookAt, face: s.face, pose: s.pose, time };
      this.groom.update(dt, shared);
      this.bride.update(dt, shared);
      this.group.visible = s.reveal > 0.05;
    }
  }
}
