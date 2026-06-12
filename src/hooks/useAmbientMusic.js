/* ------------------------------------------------------------------ */
/*  useAmbientMusic.js — Web Audio lo-fi soundscape                    */
/*                                                                     */
/*  Signal chain:                                                      */
/*    chord osc (5×) → per-osc gain → master → warmth LPF (1400Hz)     */
/*                                       → reverb + dry → destination  */
/*    vinyl crackle: noise → bandpass (3200Hz) → crackle gain → master */
/*                                                                     */
/*  Built lazily on first toggle — autoplay policy requires a user     */
/*  gesture before an AudioContext may start.                          */
/* ------------------------------------------------------------------ */

import { useCallback, useRef, useState } from "react";

/* ---------------- tuning ------------------------------------------ */
const MASTER_LEVEL = 0.22;  // final output level
const FADE_IN = 2.0;        // seconds (setTargetAtTime time constant base)
const FADE_OUT = 0.9;
const LPF_FREQ = 1400;      // warmth low-pass cutoff
const REVERB_SECONDS = 2.4; // synthetic IR decay
const CRACKLE_LEVEL = 0.014;

// Cmaj7 voiced low: C2 G2 C3 E3 B3
const CHORD = [
  { freq: 65.41,  type: "sine",     level: 0.30 }, // C2
  { freq: 98.0,   type: "triangle", level: 0.22 }, // G2
  { freq: 130.81, type: "sine",     level: 0.24 }, // C3
  { freq: 164.81, type: "triangle", level: 0.16 }, // E3
  { freq: 246.94, type: "sine",     level: 0.11 }, // B3
];

function makeReverbIR(ctx, seconds) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
  }
  return ir;
}

export function useAmbientMusic() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null); // { ctx, master }

  const build = useCallback(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0;

    // warmth filter + reverb/dry split
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = LPF_FREQ;

    const reverb = ctx.createConvolver();
    reverb.buffer = makeReverbIR(ctx, REVERB_SECONDS);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    const dry = ctx.createGain();
    dry.gain.value = 0.7;

    master.connect(lpf);
    lpf.connect(dry);
    lpf.connect(reverb);
    reverb.connect(wet);
    dry.connect(ctx.destination);
    wet.connect(ctx.destination);

    // chord oscillators, each breathing on its own slow LFO
    CHORD.forEach((note, i) => {
      const osc = ctx.createOscillator();
      osc.type = note.type;
      osc.frequency.value = note.freq;
      osc.detune.value = (i % 2 === 0 ? 1 : -1) * 0.5 * 100 / 100; // ±0.5Hz-ish drift

      const g = ctx.createGain();
      g.gain.value = note.level;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.035 + (i / CHORD.length) * 0.065; // 0.035–0.1Hz
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = note.level * 0.45;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);

      osc.connect(g);
      g.connect(master);
      osc.start();
      lfo.start();
    });

    // vinyl crackle: looped noise → narrow bandpass
    const noiseLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      nd[i] = Math.random() < 0.0016 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.04;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 0.8;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = CRACKLE_LEVEL;
    noise.connect(bp);
    bp.connect(crackleGain);
    crackleGain.connect(master);
    noise.start();

    audioRef.current = { ctx, master };
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) build();
    const { ctx, master } = audioRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    if (!playing) {
      master.gain.setTargetAtTime(MASTER_LEVEL, now, FADE_IN / 3);
      setPlaying(true);
    } else {
      master.gain.setTargetAtTime(0, now, FADE_OUT / 3);
      setPlaying(false);
    }
  }, [playing, build]);

  return { playing, toggle };
}
