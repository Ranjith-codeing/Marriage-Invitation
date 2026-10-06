import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { assetUrl } from '../../config/assets.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

/**
 * Downloads a .glb with byte-level progress. Resolves to the parsed glTF,
 * or `null` if the file is missing / not a valid binary glTF (so the site
 * can fall back gracefully instead of breaking).
 */
export async function loadGLB(path, { onProgress, expectedBytes = 0, timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(assetUrl(path), { signal: ctrl.signal });
    if (!res.ok || !res.body) return null;

    const total = Number(res.headers.get('content-length')) || expectedBytes;
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) onProgress?.(Math.min(1, received / total));
    }
    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.length;
    }
    // Binary glTF files start with the ASCII magic "glTF"
    const magic = String.fromCharCode(...buffer.subarray(0, 4));
    if (magic !== 'glTF') {
      console.warn(`[models] ${path} is not a binary glTF (.glb) — using the stand-in character.`);
      return null;
    }
    const base = assetUrl(path).replace(/[^/]*$/, '');
    return await loader.parseAsync(buffer.buffer, base);
  } catch (err) {
    console.warn(`[models] Could not load ${path} — using the stand-in character.`, err);
    return null;
  } finally {
    clearTimeout(timer);
    onProgress?.(1);
  }
}
