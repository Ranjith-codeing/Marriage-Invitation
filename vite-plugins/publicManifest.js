import fs from 'node:fs';
import path from 'node:path';

/**
 * Exposes `virtual:public-manifest` — the list of files inside /public —
 * so the site knows (at build time) which optional assets exist:
 * gallery photos, couple portraits, GLB models, music.
 * Drop a file into /public and it is picked up automatically; no code edits.
 */
const VIRTUAL_ID = 'virtual:public-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full, base);
    if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'readme.md') return [];
    const stat = fs.statSync(full);
    return [{ path: path.relative(base, full).split(path.sep).join('/'), size: stat.size }];
  });
}

export default function publicManifest() {
  let publicDir;
  return {
    name: 'public-manifest',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const files = listFiles(publicDir).sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
      return `export const files = ${JSON.stringify(files)};`;
    },
    configureServer(server) {
      const refresh = (file) => {
        if (!file.startsWith(publicDir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.add(publicDir);
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}
