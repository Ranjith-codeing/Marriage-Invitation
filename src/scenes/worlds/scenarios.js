/** The wedding scenes guests can see (kept tiny: imported by the main bundle). */
export const SCENARIOS = {
  garden: { label: 'Temple garden' },
  beach: { label: 'Beach' },
};

const KEY = 'wedding-scenario';

/**
 * Which scene to show: ?scene=beach in the URL, else the guest's choice from
 * Settings this session, else a random one on every visit.
 */
export function pickScenario() {
  const fromUrl = new URLSearchParams(location.search).get('scene');
  if (fromUrl in SCENARIOS) return fromUrl;
  const saved = sessionStorage.getItem(KEY);
  if (saved in SCENARIOS) return saved;
  const ids = Object.keys(SCENARIOS);
  return ids[Math.floor(Math.random() * ids.length)];
}

export function rememberScenario(id) {
  sessionStorage.setItem(KEY, id);
}
