import * as THREE from 'three';
import { seededRandom } from './math.js';

/**
 * Procedural canvas textures. Generated at runtime so the site downloads
 * nothing for them, and they stay crisp at any size.
 */

const canvas = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
};

const finish = (c, { srgb = true, repeat } = {}) => {
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  tex.anisotropy = 4;
  return tex;
};

/** Soft round glow used by stars, fireflies, lamp flames, moon halo. */
export function glowTexture(size = 128) {
  const [c, g] = canvas(size);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return finish(c, { srgb: false });
}

/** A single rose/jasmine petal silhouette with a soft vein. */
export function petalTexture(size = 64) {
  const [c, g] = canvas(size);
  g.translate(size / 2, size / 2);
  const grd = g.createLinearGradient(0, -size * 0.4, 0, size * 0.4);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0.75)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(0, size * 0.42);
  g.bezierCurveTo(size * 0.42, size * 0.12, size * 0.3, -size * 0.38, 0, -size * 0.42);
  g.bezierCurveTo(-size * 0.3, -size * 0.38, -size * 0.42, size * 0.12, 0, size * 0.42);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.08)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, size * 0.36);
  g.quadraticCurveTo(size * 0.04, 0, 0, -size * 0.32);
  g.stroke();
  return finish(c, { srgb: false });
}

/** Warm sandstone pavers for the garden path. */
export function pathTexture() {
  const [c, g] = canvas(256, 512);
  const rand = seededRandom(7);
  g.fillStyle = '#cdb495';
  g.fillRect(0, 0, 256, 512);
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const y = (r / rows) * 512;
    const h = 512 / rows;
    const offset = r % 2 ? 64 : 0;
    for (let x = -offset; x < 256; x += 128) {
      const l = 70 + rand() * 14;
      g.fillStyle = `hsl(${30 + rand() * 8}, ${22 + rand() * 10}%, ${l}%)`;
      g.fillRect(x + 3, y + 3, 122, h - 6);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(90,60,40,${rand() * 0.06})`;
        g.fillRect(x + 3 + rand() * 120, y + 3 + rand() * (h - 8), 2 + rand() * 5, 2 + rand() * 5);
      }
    }
  }
  return finish(c, { repeat: [1, 26] });
}

/** Soft mottled grass/earth so the ground isn't a flat colour. */
export function groundTexture() {
  const [c, g] = canvas(256);
  const rand = seededRandom(11);
  g.fillStyle = '#6a7d3c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const l = 26 + rand() * 18;
    g.fillStyle = `hsla(${70 + rand() * 30}, ${30 + rand() * 20}%, ${l}%, ${0.25 + rand() * 0.35})`;
    const s = 1 + rand() * 4;
    g.fillRect(rand() * 256, rand() * 256, s, s * (1 + rand() * 2));
  }
  return finish(c, { repeat: [40, 40] });
}

/**
 * A traditional kolam (rice-flour floor drawing): a dot grid with looping
 * strokes, drawn in front of the mandapam entrance.
 */
export function kolamTexture(size = 1024) {
  const [c, g] = canvas(size);
  g.clearRect(0, 0, size, size);
  const cx = size / 2;
  const n = 7;
  const step = size / (n + 3);
  g.strokeStyle = 'rgba(255,250,240,0.95)';
  g.fillStyle = 'rgba(255,250,240,0.95)';
  g.lineWidth = size * 0.007;
  g.lineCap = 'round';

  // Diamond dot grid (1-3-5-7-5-3-1 style)
  const dots = [];
  for (let row = -3; row <= 3; row++) {
    const count = 7 - Math.abs(row) * 2;
    for (let i = 0; i < count; i++) {
      const x = cx + (i - (count - 1) / 2) * step;
      const y = cx + row * step;
      dots.push([x, y]);
      g.beginPath();
      g.arc(x, y, size * 0.008, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Loops weaving around each dot
  dots.forEach(([x, y]) => {
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 32) {
      const r = step * 0.42 * (1 + 0.18 * Math.cos(4 * a));
      const px = x + Math.cos(a + Math.PI / 4) * r;
      const py = y + Math.sin(a + Math.PI / 4) * r;
      a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.stroke();
  });
  // Outer lotus petals
  const petals = 16;
  const R = step * 4.1;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    g.save();
    g.translate(cx + Math.cos(a) * R, cx + Math.sin(a) * R);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.moveTo(0, step * 0.5);
    g.quadraticCurveTo(step * 0.45, -step * 0.1, 0, -step * 0.7);
    g.quadraticCurveTo(-step * 0.45, -step * 0.1, 0, step * 0.5);
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(cx, cx, R - step * 0.55, 0, Math.PI * 2);
  g.stroke();
  return finish(c, { srgb: true });
}

/** Coconut-palm frond: a central rib with drooping leaflets (alpha texture). */
export function frondTexture() {
  const [c, g] = canvas(128, 512);
  const rand = seededRandom(31);
  g.clearRect(0, 0, 128, 512);
  g.lineCap = 'round';
  for (let y = 6; y < 500; y += 7) {
    const t = y / 512; // 0 at base, 1 at tip
    const len = 60 * Math.sin(Math.min(1, t * 1.25 + 0.08) * Math.PI) * (0.85 + rand() * 0.25);
    const l = 22 + rand() * 12;
    g.strokeStyle = `hsl(${88 + rand() * 18}, ${38 + rand() * 15}%, ${l}%)`;
    g.lineWidth = 3.2 - t * 1.6;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(64, y);
      g.quadraticCurveTo(64 + s * len * 0.55, y + 10, 64 + s * len, y + 26 + rand() * 8);
      g.stroke();
    }
  }
  g.strokeStyle = '#6f7a3a';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(64, 0);
  g.lineTo(64, 508);
  g.stroke();
  return finish(c, { srgb: true });
}

/** Soft radial contact shadow (alpha only). */
export function blobShadowTexture(size = 128) {
  const [c, g] = canvas(size);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(0,0,0,0.85)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return finish(c, { srgb: false });
}

/** Polished ivory marble with soft grey-gold veining, for the mandapam floor. */
export function marbleTexture(size = 1024) {
  const [c, g] = canvas(size);
  const rand = seededRandom(17);
  g.fillStyle = '#f3ece0';
  g.fillRect(0, 0, size, size);
  // cloudy variation
  for (let i = 0; i < 60; i++) {
    const x = rand() * size, y = rand() * size, r = 60 + rand() * 220;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${200 + rand() * 30},${190 + rand() * 25},${170 + rand() * 20},0.18)`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // veins: wandering polylines drawn soft then sharp
  for (let v = 0; v < 14; v++) {
    let x = rand() * size, y = rand() * size, a = rand() * Math.PI * 2;
    const pts = [];
    for (let i = 0; i < 90; i++) {
      a += (rand() - 0.5) * 0.5;
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 9;
      pts.push([x, y]);
    }
    const gold = rand() < 0.3;
    for (const [w, alpha] of [[6, 0.05], [2.2, 0.12], [0.9, 0.28]]) {
      g.strokeStyle = gold ? `rgba(176,140,70,${alpha})` : `rgba(110,100,95,${alpha})`;
      g.lineWidth = w;
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    }
  }
  return finish(c, { repeat: [2, 2] });
}

/** Wine silk with a gold zari border and small butta motifs, for the canopy. */
export function silkTexture(size = 512) {
  const [c, g] = canvas(size);
  g.fillStyle = '#6a1530';
  g.fillRect(0, 0, size, size);
  const grd = g.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
  grd.addColorStop(0, 'rgba(160,40,70,0.35)');
  grd.addColorStop(1, 'rgba(40,5,15,0.3)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  g.fillStyle = 'rgba(214,176,90,0.55)';
  for (let y = 40; y < size - 30; y += 34) {
    for (let x = (y / 34) % 2 ? 57 : 40; x < size - 30; x += 34) {
      g.beginPath();
      g.ellipse(x, y, 3, 5, Math.PI / 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  const b = size * 0.06;
  g.strokeStyle = '#d6b05a';
  for (const [inset, w] of [[b * 0.3, b * 0.5], [b * 1.05, 3]]) {
    g.lineWidth = w;
    g.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
  }
  return finish(c, {});
}

/**
 * Gold-ringed ivory medallion with the couple's initials. Redraws once the
 * web fonts finish loading so the serif matches the rest of the site.
 */
export function monogramTexture(left, right, size = 512) {
  const [c, g] = canvas(size);
  const tex = finish(c, {});
  const draw = () => {
    g.clearRect(0, 0, size, size);
    const r = size / 2;
    const ivory = g.createRadialGradient(r, r * 0.8, 0, r, r, r);
    ivory.addColorStop(0, '#fffaf0');
    ivory.addColorStop(1, '#efe3c8');
    g.fillStyle = ivory;
    g.beginPath();
    g.arc(r, r, r * 0.94, 0, Math.PI * 2);
    g.fill();
    const gold = g.createLinearGradient(0, 0, size, size);
    gold.addColorStop(0, '#f1d58a');
    gold.addColorStop(0.5, '#b8862e');
    gold.addColorStop(1, '#e8c56d');
    g.strokeStyle = gold;
    g.lineWidth = size * 0.035;
    g.beginPath();
    g.arc(r, r, r * 0.9, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = size * 0.008;
    g.beginPath();
    g.arc(r, r, r * 0.8, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = gold;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `italic 400 ${size * 0.34}px "Cormorant Garamond", Georgia, serif`;
    g.fillText(left, r - size * 0.17, r - size * 0.04);
    g.fillText(right, r + size * 0.17, r + size * 0.06);
    g.font = `italic 400 ${size * 0.17}px "Cormorant Garamond", Georgia, serif`;
    g.fillText('&', r, r + size * 0.01);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load(`italic 400 64px "Cormorant Garamond"`).then(draw).catch(() => {});
  return tex;
}

/** Butterfly wing (right wing; mirrored for the left). */
export function wingTexture(base = '#f08a1c', edge = '#1c120c') {
  const [c, g] = canvas(128);
  g.clearRect(0, 0, 128, 128);
  const wing = new Path2D();
  wing.moveTo(4, 64);
  wing.bezierCurveTo(30, 0, 110, -4, 122, 30);
  wing.bezierCurveTo(126, 52, 92, 62, 70, 66);
  wing.bezierCurveTo(104, 76, 110, 110, 84, 122);
  wing.bezierCurveTo(56, 128, 22, 96, 4, 64);
  g.fillStyle = edge;
  g.fill(wing);
  g.save();
  g.clip(wing);
  const grd = g.createRadialGradient(30, 64, 4, 40, 64, 90);
  grd.addColorStop(0, base);
  grd.addColorStop(1, '#ffd27a');
  g.fillStyle = grd;
  g.translate(64, 64);
  g.scale(0.84, 0.84);
  g.translate(-64, -64);
  g.fill(wing);
  g.restore();
  g.strokeStyle = edge;
  g.lineWidth = 2;
  for (const [x, y] of [[110, 24], [90, 14], [104, 104], [70, 40], [76, 96]]) {
    g.beginPath();
    g.moveTo(8, 64);
    g.quadraticCurveTo((8 + x) / 2, (64 + y) / 2 + 6, x, y);
    g.stroke();
  }
  g.fillStyle = '#fff6e6';
  for (const [x, y] of [[116, 34], [112, 44], [94, 112], [84, 118]]) {
    g.beginPath();
    g.arc(x, y, 2.4, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c, {});
}

/** Soft cumulus cloud made of overlapping puffs (alpha + light shading). */
export function cloudTexture(seed = 1) {
  const [c, g] = canvas(512, 256);
  const rand = seededRandom(seed);
  g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) {
    const x = 70 + rand() * 372, y = 120 + (rand() - 0.5) * 70 - Math.sin((x / 512) * Math.PI) * 40;
    const r = 40 + rand() * 70;
    const grd = g.createRadialGradient(x, y - r * 0.25, r * 0.1, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)');
    grd.addColorStop(0.6, 'rgba(240,240,245,0.25)');
    grd.addColorStop(1, 'rgba(230,230,240,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return finish(c, { srgb: false });
}

/** Ringed coconut-palm bark (stripes run around the trunk). */
export function barkTexture() {
  const [c, g] = canvas(256, 64);
  const rand = seededRandom(23);
  g.fillStyle = '#8a7560';
  g.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 8 + rand() * 6) {
    g.fillStyle = `rgba(${60 + rand() * 30},${45 + rand() * 20},${35 + rand() * 15},${0.35 + rand() * 0.3})`;
    g.fillRect(x, 0, 2 + rand() * 3, 64);
  }
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(255,240,220,${rand() * 0.06})`;
    g.fillRect(rand() * 256, rand() * 64, 2, 1);
  }
  return finish(c, { repeat: [10, 1] });
}
