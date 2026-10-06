/**
 * The background score: an original arrangement of Pachelbel's Canon in D —
 * the classic wedding piece (public domain) — for soft piano, warm strings,
 * cello and celesta in a concert-hall reverb, synthesised live with the Web
 * Audio API (nothing to download, no licensing concerns).
 *
 * The famous ground bass and arpeggios open the film; the melody enters in
 * the prologue and moves through the Canon's variations as the story plays;
 * strings swell into counter-melody at the climax and the music settles while
 * guests read. On the beach, gentle surf breathes underneath.
 */

const BPM = 64;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;
const LOOKAHEAD = 0.3;
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

// The Canon's eight chords, two beats each: D A Bm F#m G D G A
const CHORDS = [
  { bass: 50, arp: [50, 57, 66, 57], strings: [54, 57, 62, 66], sparkle: 90 },
  { bass: 45, arp: [57, 64, 73, 64], strings: [52, 57, 61, 64], sparkle: 85 },
  { bass: 47, arp: [59, 66, 74, 66], strings: [54, 59, 62, 66], sparkle: 86 },
  { bass: 42, arp: [54, 61, 69, 61], strings: [54, 57, 61, 66], sparkle: 85 },
  { bass: 43, arp: [55, 62, 71, 62], strings: [55, 59, 62, 67], sparkle: 83 },
  { bass: 38, arp: [50, 57, 66, 57], strings: [54, 57, 62, 66], sparkle: 81 },
  { bass: 43, arp: [55, 62, 71, 62], strings: [55, 59, 62, 67], sparkle: 86 },
  { bass: 45, arp: [57, 64, 73, 64], strings: [52, 57, 61, 64], sparkle: 88 },
];

// Melody variations: [notes per chord, notes]
const VARIATIONS = [
  [1, [78, 76, 74, 73, 71, 69, 71, 73]], // the theme, in long notes
  [1, [74, 73, 71, 69, 67, 66, 67, 64]], // the descending line
  [2, [62, 66, 69, 67, 66, 62, 66, 64, 62, 59, 62, 69, 67, 71, 69, 67]], // flowing quarters
  [4, [78, 76, 78, 74, 73, 76, 69, 73, 71, 74, 78, 74, 73, 69, 73, 76, 74, 71, 74, 79, 78, 74, 81, 78, 79, 74, 71, 74, 76, 73, 69, 76]], // cascading eighths
];
const COUNTER = [VARIATIONS[0][1], VARIATIONS[1][1]]; // string counter-melody (an octave below)

// How present each instrument is per story scene (0–1)
const CALM = { bass: 0.6, pad: 0.6, arp: 0.6, melody: 0.45, lead: 0, sparkle: 0.15, surf: 0.35 };
const SCENE_MIX = {
  hero: { bass: 0.8, pad: 0.55, arp: 0.7, melody: 0, lead: 0, sparkle: 0.25, surf: 1 },
  prologue: { bass: 0.7, pad: 0.7, arp: 0.45, melody: 0.75, lead: 0, sparkle: 0.15, surf: 0.6 },
  walk: { bass: 0.85, pad: 0.6, arp: 0.85, melody: 0.85, lead: 0, sparkle: 0.3, surf: 0.6 },
  garden: { bass: 0.9, pad: 0.7, arp: 0.85, melody: 0.9, lead: 0.35, sparkle: 0.4, surf: 0.55 },
  mandapam: { bass: 1, pad: 0.85, arp: 0.75, melody: 0.95, lead: 0.6, sparkle: 0.5, surf: 0.5 },
  moment: { bass: 1, pad: 1, arp: 0.7, melody: 1, lead: 1, sparkle: 0.6, surf: 0.4 },
  invitation: CALM,
  story: CALM,
  events: CALM,
  venue: CALM,
  gallery: CALM,
  final: { bass: 0.85, pad: 0.95, arp: 0.6, melody: 0.9, lead: 0.75, sparkle: 0.55, surf: 0.5 },
};
const LEVEL = { bass: 0.3, pad: 0.12, arp: 0.3, melody: 0.36, lead: 0.15, sparkle: 0.1, surf: 0.2 };

/** Synthetic concert-hall reverb impulse response. */
function reverbImpulse(ctx, seconds = 3.6) {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * seconds);
  const ir = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      lp += 0.3 * (Math.random() * 2 - 1 - lp);
      d[i] = lp * Math.exp(-t / 1.05) * (t < 0.015 ? t / 0.015 : 1);
    }
  }
  return ir;
}

/** Exponential decay that is cut short gracefully if the note ends first. */
function decayEnvelope(param, t, peak, decay, end) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + 0.006);
  const stop = Math.min(t + decay, end);
  const atStop = peak * 0.001 ** ((stop - t) / decay);
  param.exponentialRampToValueAtTime(Math.max(0.00001, atStop), stop);
  param.setTargetAtTime(0, stop, 0.12);
}

export class WeddingScore {
  constructor({ getScene = () => 'hero', volume = 0.5 } = {}) {
    this.getScene = getScene;
    this.volume = volume;
    this.scenario = 'garden';
    this.ctx = null;
    this.playing = false;
  }

  build() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' }));
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 16;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.02;
    comp.release.value = 0.4;
    this.master.connect(comp).connect(ctx.destination);

    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    const reverb = ctx.createConvolver();
    reverb.buffer = reverbImpulse(ctx);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.4;
    this.reverbSend.connect(reverb).connect(this.master);

    this.layers = {};
    for (const name of Object.keys(LEVEL)) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.bus);
      g.connect(this.reverbSend);
      this.layers[name] = g;
    }

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    this.startSurf();

    this.step = 0;
    this.cycle = 0;
  }

  setScenario(name) {
    this.scenario = name;
    if (this.ctx && this.playing) this.applyMix();
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

  setHidden(hidden) {
    if (!this.ctx || !this.playing) return;
    if (hidden) this.ctx.suspend();
    else this.ctx.resume().then(() => (this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05)));
  }

  applyMix(immediate = false) {
    const mix = SCENE_MIX[this.getScene()] || CALM;
    const now = this.ctx.currentTime;
    for (const [name, gain] of Object.entries(this.layers)) {
      let target = (mix[name] ?? 0) * LEVEL[name];
      if (name === 'surf' && this.scenario !== 'beach') target = 0;
      if (immediate) gain.gain.setValueAtTime(target, now);
      else gain.gain.setTargetAtTime(target, now, 1.6);
    }
    this.mix = mix;
  }

  schedule() {
    const ctx = this.ctx;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += EIGHTH;
      this.step = (this.step + 1) % 32;
      if (this.step === 0) this.cycle++;
    }
  }

  playStep(step, t) {
    const mix = this.mix || CALM;
    const chordIndex = Math.floor(step / 4);
    const chord = CHORDS[chordIndex];
    const human = () => (Math.random() - 0.5) * 0.014;
    const on = (layer) => mix[layer] > 0.01;

    if (step % 4 === 0) {
      if (on('bass')) this.cello(chord.bass, t, BEAT * 2);
      if (on('pad')) this.strings(chord.strings, t, BEAT * 2, 'pad');
      if (on('sparkle') && Math.random() < 0.55) this.celesta(chord.sparkle, t + EIGHTH * (Math.random() < 0.5 ? 0 : 1));
      if (on('lead')) this.strings([COUNTER[this.cycle % 2][chordIndex] - 12], t, BEAT * 2, 'lead');
    }
    if (on('arp')) this.piano(chord.arp[step % 4], t + human(), 0.34 + Math.random() * 0.06, EIGHTH * 3, 'arp');

    if (on('melody')) {
      const [perChord, notes] = VARIATIONS[this.cycle % VARIATIONS.length];
      const every = 4 / perChord; // eighth-steps per melody note
      if (step % every === 0) {
        const note = notes[chordIndex * perChord + (step % 4) / every];
        this.piano(note, t + human(), 0.62 + Math.random() * 0.08, every * EIGHTH, 'melody');
      }
    }
  }

  /** Soft piano: slightly inharmonic partials, a detuned unison twin, gentle hammer. */
  piano(midi, t, velocity, length, layer) {
    const ctx = this.ctx;
    const f = midiHz(midi);
    const out = ctx.createGain();
    out.gain.value = velocity * 0.45;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = Math.min(9000, 1400 + velocity * 2600 + f * 1.5);
    tone.Q.value = 0.3;
    out.connect(tone).connect(this.layers[layer]);

    const sustain = Math.max(1.4, 6.2 - (midi - 48) * 0.07);
    const end = t + Math.min(sustain, length + 1.6); // let notes ring as if on the sustain pedal
    const partials = [1, 0.4, 0.2, 0.1, 0.055, 0.03];
    partials.forEach((amp, i) => {
      const n = i + 1;
      const osc = ctx.createOscillator();
      osc.frequency.value = f * n * Math.sqrt(1 + 0.00035 * n * n);
      const g = ctx.createGain();
      decayEnvelope(g.gain, t, amp, sustain / (1 + i * 0.7), end);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(end + 0.7);
    });
    const twin = ctx.createOscillator();
    twin.frequency.value = f;
    twin.detune.value = 1.6;
    const tg = ctx.createGain();
    decayEnvelope(tg.gain, t, 0.45, sustain, end);
    twin.connect(tg).connect(out);
    twin.start(t);
    twin.stop(end + 0.7);
    // felt hammer
    const hammer = ctx.createBufferSource();
    hammer.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(6000, f * 4);
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.05 * velocity, t);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    hammer.connect(bp).connect(hg).connect(out);
    hammer.start(t, Math.random() * 3);
    hammer.stop(t + 0.05);
  }

  /** Warm string section: detuned saws, gentle vibrato, slow bow attack. */
  strings(notes, t, length, layer) {
    const ctx = this.ctx;
    const lead = layer === 'lead';
    const attack = lead ? 0.22 : 0.45;
    const release = lead ? 0.6 : 0.9;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lead ? 2200 : 1300 + (this.mix?.pad ?? 0.5) * 700;
    filter.Q.value = 0.5;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + attack);
    env.gain.setValueAtTime(1, t + length - 0.05);
    env.gain.linearRampToValueAtTime(0, t + length + release);
    filter.connect(env).connect(this.layers[layer]);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lead ? 5.6 : 5.1;
    const depth = ctx.createGain();
    depth.gain.value = lead ? 7 : 3.5; // cents
    lfo.connect(depth);
    lfo.start(t);
    lfo.stop(t + length + release + 0.1);
    for (const midi of notes) {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midiHz(midi);
        osc.detune.value = detune;
        depth.connect(osc.detune);
        const g = ctx.createGain();
        g.gain.value = lead ? 0.5 : 0.22;
        osc.connect(g).connect(filter);
        osc.start(t);
        osc.stop(t + length + release + 0.1);
      }
    }
  }

  /** Cello: the Canon's ground bass. */
  cello(midi, t, length) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.12);
    env.gain.setValueAtTime(0.85, t + length - 0.1);
    env.gain.linearRampToValueAtTime(0, t + length + 0.45);
    filter.connect(env).connect(this.layers.bass);
    for (const [ratio, gain, type] of [[1, 0.6, 'sawtooth'], [0.5, 0.5, 'sine'], [1, 0.25, 'triangle']]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = midiHz(midi) * ratio;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(filter);
      osc.start(t);
      osc.stop(t + length + 0.5);
    }
  }

  /** Celesta: a high, bell-like sparkle on the chord changes. */
  celesta(midi, t) {
    const ctx = this.ctx;
    const f = midiHz(midi);
    const out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(this.layers.sparkle);
    for (const [ratio, amp, decay] of [[1, 1, 1.8], [4, 0.22, 0.6], [6.8, 0.06, 0.3]]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }

  /** Continuous, breathing surf (only heard in the beach scenario). */
  startSurf() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const swell = ctx.createGain();
    swell.gain.value = 0.55;
    const lfoA = ctx.createOscillator();
    lfoA.frequency.value = 0.085;
    const lfoB = ctx.createOscillator();
    lfoB.frequency.value = 0.137;
    const aGain = ctx.createGain();
    aGain.gain.value = 0.3;
    const bGain = ctx.createGain();
    bGain.gain.value = 0.15;
    const fGain = ctx.createGain();
    fGain.gain.value = 260;
    lfoA.connect(aGain).connect(swell.gain);
    lfoB.connect(bGain).connect(swell.gain);
    lfoA.connect(fGain).connect(lp.frequency);
    src.connect(lp).connect(swell).connect(this.layers.surf);
    for (const node of [src, lfoA, lfoB]) node.start();
  }
}
