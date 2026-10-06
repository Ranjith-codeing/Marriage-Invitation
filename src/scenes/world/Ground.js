import * as THREE from 'three';
import { groundTexture, pathTexture, kolamTexture } from '../../utils/textures.js';

/** Lawn, the sandstone path the couple walks along, and a kolam at the mandapam. */
export function createGround() {
  const group = new THREE.Group();

  const lawn = new THREE.Mesh(
    new THREE.CircleGeometry(160, 48),
    new THREE.MeshStandardMaterial({ map: groundTexture(), color: '#c9c4a0', roughness: 0.95 })
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  group.add(lawn);

  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 70),
    new THREE.MeshStandardMaterial({ map: pathTexture(), roughness: 0.85 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, 30); // runs from the mandapam out toward the camera
  path.receiveShadow = true;
  group.add(path);

  // Path edging stones
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#b39c7d', roughness: 0.9 });
  for (const x of [-1.25, 1.25]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 64), edgeMat);
    edge.position.set(x, 0.03, 34);
    edge.receiveShadow = true;
    group.add(edge);
  }

  const kolam = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshStandardMaterial({ map: kolamTexture(), transparent: true, roughness: 1, depthWrite: false })
  );
  kolam.rotation.x = -Math.PI / 2;
  kolam.position.set(0, 0.02, 4.5); // just in front of the mandapam steps
  kolam.material.opacity = 0;
  group.add(kolam);

  return {
    group,
    update(s) {
      kolam.material.opacity = s.mandap * 0.9;
    },
  };
}
