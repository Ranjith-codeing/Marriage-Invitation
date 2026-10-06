/**
 * An original, generative background score — composed and synthesised live
 * with the Web Audio API (nothing to download, no licensing concerns).
 *
 * Raga Kalyani (the auspicious "wedding" raga, S R2 G3 M2 P D2 N3 — Lydian),
 * tonic Sa = D, ~70 BPM, an 8-bar progression with:
 *   drone  — tanpura (plucked Pa–Sa–Sa–Sa cycle, Karplus–Strong strings)
 *   pad    — warm strings
 *   pluck  — santoor / veena-style melodies with gamaka slides
 *   flute  — bansuri carrying the love theme
 *   bells  — temple bells and small chimes
 *   drum   — a soft mridangam-like pulse
 * Each layer's level follows the story scene (see SCENE_MIX), so the music
 * rises and settles with the film.
 */

const BPM = 70;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;
const LOOKAHEAD = 0.3; // seconds of music scheduled ahead

const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const SA = 62; // D4
const KALYANI = [0, 2, 4, 6, 7, 9, 11];
const degreeToMidi = (deg) => SA + Math.floor(deg / 7) * 12 + KALYANI[((deg % 7) + 7) % 7];

// 8-bar progression: chord tones (scale degrees from Sa) + string-pad voicing (MIDI)
const BARS = [
  { tones: [0, 2, 4], pad: [50, 57, 62, 66, 69] }, // D
  { tones: [5, 7, 9], pad: [47, 54, 59, 62, 66] }, // Bm
  { tones: [1, 3, 5], pad: [52, 59, 64, 68, 71] }, // E  (the raga's bright II)
  { tones: [4, 6, 8], pad: [45, 52, 57, 61, 64] }, // A
  { tones: [5, 7, 9], pad: [47, 54, 59, 62, 66] }, // Bm
  { tones: [2, 4, 6], pad: [42, 49, 54, 57, 61] }, // F#m
  { tones: [1, 3, 5, 7], pad: [52, 59, 62, 64, 68] }, // E7
  { tones: [0, 2, 4], pad: [50, 57, 62, 66, 69] }, // D
];

// The love theme (bansuri): [bar, beat, midi, beats]
const THEME = [
  [0, 0, 69, 1], [0, 1, 71, 1], [0, 2, 73, 1], [0, 3, 76, 1],
  [1, 0, 74, 3],
  [2, 0, 73, 1], [2, 1, 71, 0.5], [2, 1.5, 73, 0.5], [2, 2, 69, 1], [2, 3, 68, 1],
  [3, 0, 69, 3],
  [4, 0, 66, 1], [4, 1, 69, 1], [4, 2, 71, 1], [4, 3, 74, 1],
  [5, 0, 73, 1.5], [5, 1.5, 71, 0.5], [5, 2, 69, 2],
  [6, 0, 66, 1], [6, 1, 64, 1], [6, 2, 66, 1], [6, 3, 69, 1],
  [7, 0, 62, 3.5],
];

const RHYTHMS = [
  [1, 0, 1, 1, 1, 0, 1, 0],
  [1, 1, 0, 1, 1, 0, 1, 1],
  [1, 0, 0, 1, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 1, 1, 0],
];

const TANPURA = [45, 50, 50, 38]; // Pa (A2), Sa (D3), Sa (D3), low Sa (D2) — one string per beat
const DRUM = ['L', '', '', 'H', 'L', '', 'H', '']; // per eighth note

// How present each layer is in each scene (0–1)
const CALM = { drone: 0.6, pad: 0.45, pluck: 0.35, flute: 0.15, bells: 0.1, drum: 0 };
const SCENE_MIX = {
  hero: { drone: 0.75, pad: 0.35, pluck: 0.25, flute: 0, bells: 0, drum: 0 },
  prologue: { drone: 0.7, pad: 0.5, pluck: 0, flute: 0.35, bells: 0, drum: 0 },
  walk: { drone: 0.6, pad: 0.35, pluck: 0.75, flute: 0, bells: 0, drum: 0 },
  garden: { drone: 0.6, pad: 0.4, pluck: 0.9, flute: 0.3, bells: 0, drum: 0.15 },
  mandapam: { drone: 0.7, pad: 0.5, pluck: 0.7, flute: 0.35, bells: 0.8, drum: 0.6 },
  moment: { drone: 0.7, pad: 0.85, pluck: 0.35, flute: 1, bells: 0.5, drum: 0.35 },
  invitation: CALM,
  story: CALM,
  events: CALM,
  venue: CALM,
  gallery: CALM,
  final: { drone: 0.6, pad: 0.85, pluck: 0.25, flute: 0.9, bells: 0.4, drum: 0 },
};
const LAYER_LEVEL = { drone: 0.42, pad: 0.16, pluck: 0.36, flute: 0.3, bells: 0.22, drum: 0.32 };

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Karplus–Strong plucked string rendered into an AudioBuffer (peak-normalised). */
function pluckBuffer(ctx, freq, seconds, { decayTo = 0.01, brightness = 0.6, shimmer = 0 } = {}) {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * seconds);
  const buffer = ctx.createBuffer(1, length, sr);
  const out = buffer.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq));
  const damping = decayTo ** (1 / (freq * seconds)); // per-period loss → reaches decayTo at the end
  const line = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += brightness * (Math.random() * 2 - 1 - lp);
    line[i] = lp;
  }
  let idx = 0;
  for (let i = 0; i < length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % N];
    let v = (a + b) * 0.5 * damping;
    if (shimmer) v += shimmer * (a - b); // keeps upper partials ringing (tanpura "jawari" buzz)
    line[idx] = v;
    out[i] = a;
    idx = (idx + 1) % N;
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const fade = Math.floor(sr * 0.05);
  for (let i = 0; i < length; i++) {
    out[i] /= peak || 1;
    if (i > length - fade) out[i] *= (length - i) / fade;
  }
  return { buffer, baseHz: sr / N };
}

/** Synthetic concert-hall reverb impulse response. */
function reverbImpulse(ctx, seconds = 3.4) {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * seconds);
  const ir = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      lp += 0.35 * (Math.random() * 2 - 1 - lp);
      d[i] = lp * Math.exp(-t / 0.95) * (t < 0.012 ? t / 0.012 : 1);
    }
  }
  return ir;
}

export class WeddingScore {
  constructor({ getScene = () => 'hero', volume = 0.6 } = {}) {
    this.getScene = getScene;
    this.volume = volume;
    this.ctx = null;
    this.playing = false;
  }

  build() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' }));

    // Master: layers → (dry + reverb) → gentle compressor → volume
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.35;
    this.master.connect(comp).connect(ctx.destination);

    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    const reverb = ctx.createConvolver();
    reverb.buffer = reverbImpulse(ctx);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.42;
    this.reverbSend.connect(reverb).connect(this.master);

    this.layers = {};
    for (const name of Object.keys(LAYER_LEVEL)) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.bus);
      g.connect(this.reverbSend);
      this.layers[name] = g;
    }

    // Instruments
    this.tanpura = pluckBuffer(ctx, midiHz(50), 6, { decayTo: 0.02, brightness: 0.85, shimmer: 0.06 });
    this.santoor = pluckBuffer(ctx, midiHz(74), 2.6, { decayTo: 0.01, brightness: 0.55 });
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;

    this.step = 0;
    this.motif = null;
    this.lastDegree = 4;
  }

  async start() {
    if (!this.ctx) this.build();
    await this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.volume, now + 2.5);
    this.applyMix(true);
    this.nextTime = now + 0.12;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 50);
    clearInterval(this.mixTimer);
    this.mixTimer = setInterval(() => this.applyMix(), 400);
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 1.2);
    clearInterval(this.mixTimer);
    setTimeout(() => {
      if (this.playing) return;
      clearInterval(this.timer);
      this.ctx.suspend();
    }, 1400);
  }

  /** Pause/resume the audio clock with the page's visibility (no catch-up burst). */
  setHidden(hidden) {
    if (!this.ctx || !this.playing) return;
    if (hidden) this.ctx.suspend();
    else this.ctx.resume().then(() => (this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05)));
  }

  applyMix(immediate = false) {
    const mix = SCENE_MIX[this.getScene()] || CALM;
    const now = this.ctx.currentTime;
    for (const [name, gain] of Object.entries(this.layers)) {
      const target = (mix[name] ?? 0) * LAYER_LEVEL[name];
      if (immediate) gain.gain.setValueAtTime(target, now);
      else gain.gain.setTargetAtTime(target, now, 1.6);
    }
    this.mix = mix;
  }

  /** Lookahead scheduler: queue every eighth note that falls inside the window. */
  schedule() {
    const ctx = this.ctx;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05; // after a stall
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += EIGHTH;
      this.step = (this.step + 1) % (BARS.length * 8);
    }
  }

  playStep(step, t) {
    const bar = Math.floor(step / 8);
    const slot = step % 8;
    const mix = this.mix || CALM;
    const human = () => (Math.random() - 0.5) * 0.012;

    // Tanpura: one string per beat
    if (slot % 2 === 0 && mix.drone > 0.01) {
      const string = TANPURA[slot / 2];
      this.pluck(this.tanpura, string, t + human(), { gain: string === 38 ? 0.9 : 0.65, dest: 'drone', pan: (slot / 2 - 1.5) * 0.25, dur: 6 });
    }

    // String pad: new chord each bar
    if (slot === 0 && mix.pad > 0.01) this.padChord(BARS[bar].pad, t, BEAT * 4);

    // Santoor / veena: a two-bar rhythmic motif over the current chord
    if (mix.pluck > 0.01) {
      if (slot === 0 && bar % 2 === 0) this.rhythm = pick(RHYTHMS);
      if (slot === 0) this.motif = this.makeMotif(bar);
      const midi = this.motif?.[slot];
      const dense = mix.pluck;
      const strong = slot === 0 || slot === 4;
      if (midi && (strong ? dense > 0.15 : Math.random() < dense * 0.95)) {
        this.pluck(this.santoor, midi, t + human(), {
          gain: (strong ? 0.85 : 0.6) * (0.85 + Math.random() * 0.3),
          dest: 'pluck',
          pan: -0.25,
          dur: 2.6,
          gamaka: Math.random() < 0.18,
        });
      }
    }

    // Bansuri: the theme, phrase by phrase
    if (mix.flute > 0.01) {
      for (const [b, beat, midi, beats] of THEME) {
        if (b === bar && beat * 2 === slot) this.flute(midi, t, beats * BEAT); // theme beats fall on eighth notes
      }
    }

    // Temple bells: a large bell at the top of each half-cycle, small chimes in between
    if (mix.bells > 0.05) {
      if (slot === 0 && (bar === 0 || bar === 4)) this.bell(midiHz(62) * 0.5, t, 1, 0.15);
      else if (slot % 2 === 1 && Math.random() < 0.12 * mix.bells) this.bell(midiHz(pick([86, 90, 93])), t, 0.35, pick([-0.6, 0.6]));
    }

    // Mridangam-like pulse
    if (mix.drum > 0.05 && DRUM[slot]) this.drum(DRUM[slot], t + human());
  }

  makeMotif(bar) {
    const tones = BARS[bar].tones;
    const nearestTone = (deg) => {
      let best = deg, bestD = Infinity;
      for (let oct = -1; oct <= 2; oct++) {
        for (const tone of tones) {
          const cand = tone + oct * 7;
          const d = Math.abs(cand - deg);
          if (cand >= 3 && cand <= 12 && d < bestD) {
            best = cand;
            bestD = d;
          }
        }
      }
      return best;
    };
    let deg = this.lastDegree;
    const notes = (this.rhythm || RHYTHMS[0]).map((on, i) => {
      if (!on) return null;
      if (i === 0 || i === 4) deg = nearestTone(deg + pick([-1, 0, 1]));
      else deg = Math.min(12, Math.max(3, deg + pick([-2, -1, -1, 1, 1, 2])));
      return degreeToMidi(deg);
    });
    this.lastDegree = deg;
    return notes;
  }

  pan(value) {
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain();
    if (p.pan) p.pan.value = value;
    return p;
  }

  pluck(sample, midi, t, { gain = 0.7, dest, pan = 0, dur = 3, gamaka = false }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = sample.buffer;
    const rate = midiHz(midi) / sample.baseHz;
    if (gamaka) {
      // slide up into the note from a scale step below — a characteristic veena ornament
      src.playbackRate.setValueAtTime(rate * 2 ** (-2 / 12), t);
      src.playbackRate.exponentialRampToValueAtTime(rate, t + 0.12);
    } else src.playbackRate.setValueAtTime(rate, t);
    const stopAt = t + Math.min(dur / rate, 8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.setTargetAtTime(0, stopAt - 0.3, 0.07); // fade before the end — no clicks
    src.connect(g).connect(this.pan(pan)).connect(this.layers[dest]);
    src.start(t);
    src.stop(stopAt);
  }

  padChord(notes, t, length) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650 + (this.mix?.pad ?? 0.4) * 900;
    filter.Q.value = 0.4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 1.4);
    env.gain.setValueAtTime(1, t + length);
    env.gain.linearRampToValueAtTime(0, t + length + 2.4);
    filter.connect(env).connect(this.layers.pad);
    for (const midi of notes) {
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midiHz(midi);
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = 0.11;
        osc.connect(g).connect(filter);
        osc.start(t);
        osc.stop(t + length + 2.6);
      }
    }
  }

  flute(midi, t, length) {
    const ctx = this.ctx;
    const f = midiHz(midi);
    const env = ctx.createGain();
    const attack = 0.12;
    const release = Math.min(0.35, length * 0.4);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.9, t + attack);
    env.gain.setValueAtTime(0.9, t + Math.max(attack, length - release));
    env.gain.linearRampToValueAtTime(0, t + length + 0.05);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    env.connect(tone).connect(this.pan(0.15)).connect(this.layers.flute);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    // start a touch flat and lean into the note (a breathy bansuri attack)
    osc.frequency.setValueAtTime(f * 2 ** (-0.35 / 12), t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = f;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.18;
    // vibrato that blooms on longer notes
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.6, length));
    lfo.connect(depth);
    depth.connect(osc.frequency);
    depth.connect(body.frequency);
    // breath
    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 1.2;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.05;
    breath.connect(bp).connect(breathGain).connect(env);
    osc.connect(env);
    body.connect(bodyGain).connect(env);
    const end = t + length + 0.1;
    for (const node of [osc, body, lfo, breath]) {
      node.start(t);
      node.stop(end);
    }
  }

  bell(freq, t, level, pan) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = level;
    out.connect(this.pan(pan)).connect(this.layers.bells);
    const partials = [[1, 1, 4.5], [2.0, 0.55, 3.2], [2.76, 0.4, 2.4], [5.4, 0.22, 1.3], [8.93, 0.12, 0.8]];
    for (const [ratio, amp, decay] of partials) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * 0.5, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }

  drum(kind, t) {
    const ctx = this.ctx;
    const low = kind === 'L';
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(low ? 130 : 320, t);
    osc.frequency.exponentialRampToValueAtTime(low ? 78 : 240, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(low ? 0.9 : 0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (low ? 0.45 : 0.16));
    osc.connect(g).connect(this.layers.drum);
    osc.start(t);
    osc.stop(t + 0.5);
    // the skin's slap
    const slap = ctx.createBufferSource();
    slap.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = low ? 900 : 2400;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(low ? 0.12 : 0.18, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    slap.connect(hp).connect(sg).connect(this.layers.drum);
    slap.start(t, Math.random());
    slap.stop(t + 0.06);
  }
}
