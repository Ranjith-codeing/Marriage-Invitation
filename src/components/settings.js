import { SCENARIOS } from '../scenes/worlds/scenarios.js';

/**
 * Settings panel (gear button, bottom-right): switch the wedding scene
 * (temple garden ↔ beach) and turn the music on or off.
 */
export function initSettings({ scenario, canSwitchScene, onScene, music }) {
  const toggle = document.querySelector('[data-settings-toggle]');
  const panel = document.getElementById('settings-panel');
  const sceneGroup = panel.querySelector('[data-setting-scene]');
  const musicSwitch = panel.querySelector('[data-setting-music]');
  const musicButton = document.querySelector('[data-music]');
  let current = scenario;
  let busy = false;

  sceneGroup.closest('.setting').hidden = !canSwitchScene;
  sceneGroup.innerHTML = Object.entries(SCENARIOS)
    .map(
      ([id, { label }]) => `
      <button type="button" role="radio" class="segment" data-scene-option="${id}" aria-checked="${id === current}">${label}</button>`
    )
    .join('');

  const syncScene = () => {
    sceneGroup.querySelectorAll('[data-scene-option]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sceneOption === current)));
  };
  const syncMusic = () => musicSwitch.setAttribute('aria-checked', musicButton.getAttribute('aria-pressed') === 'true' ? 'true' : 'false');

  const open = (state) => {
    panel.hidden = !state;
    toggle.setAttribute('aria-expanded', String(state));
    if (state) {
      syncMusic();
      panel.querySelector('[aria-checked="true"], button')?.focus();
    }
  };

  toggle.addEventListener('click', () => open(panel.hidden));
  panel.querySelector('[data-settings-close]').addEventListener('click', () => {
    open(false);
    toggle.focus();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !panel.hidden) {
      open(false);
      toggle.focus();
    }
  });
  document.addEventListener('pointerdown', (ev) => {
    if (!panel.hidden && !panel.contains(ev.target) && !toggle.contains(ev.target)) open(false);
  });

  sceneGroup.addEventListener('click', async (ev) => {
    const option = ev.target.closest('[data-scene-option]');
    if (!option || busy || option.dataset.sceneOption === current) return;
    busy = true;
    current = option.dataset.sceneOption;
    syncScene();
    try {
      await onScene(current);
    } finally {
      busy = false;
    }
  });
  // Arrow keys move between the scene options (radio-group behaviour)
  sceneGroup.addEventListener('keydown', (ev) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    const options = [...sceneGroup.querySelectorAll('[data-scene-option]')];
    const i = options.indexOf(document.activeElement);
    const next = options[(i + (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? options.length - 1 : 1)) % options.length];
    next.focus();
    next.click();
    ev.preventDefault();
  });

  musicSwitch.addEventListener('click', () => music.toggle());
  new MutationObserver(syncMusic).observe(musicButton, { attributes: true, attributeFilter: ['aria-pressed'] });
}
