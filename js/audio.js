// ===== js/audio.js =====
// Все звуки синтезируются через Web Audio API — никаких внешних файлов.

let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let engineFilter = null;
let started = false;

export const Audio = {
  enabled: true,

  init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  },

  resume() {
    if (!ctx) this.init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  },

  setEnabled(v) {
    this.enabled = v;
    if (master) master.gain.value = v ? 0.55 : 0;
    if (!v) this.stopEngine();
  },

  // ---------- Двигатель ----------
  startEngine() {
    if (!this.enabled) return;
    this.init();
    if (!ctx || started) return;
    started = true;

    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;

    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.value = 27.5;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;
    sub.connect(subGain);

    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineFilter.Q.value = 4;

    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;

    engineOsc.connect(engineFilter);
    subGain.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);

    engineOsc.start();
    sub.start();
    this._sub = sub;
  },

  stopEngine() {
    if (!started) return;
    started = false;
    try { engineOsc.stop(); this._sub.stop(); } catch {}
    engineOsc = engineGain = engineFilter = this._sub = null;
  },

  /** speed01 — 0..1, throttle — bool */
  updateEngine(speed01, throttle) {
    if (!started || !ctx) return;
    const t = ctx.currentTime;
    const freq = 48 + speed01 * 130 + (throttle ? 16 : 0);
    engineOsc.frequency.setTargetAtTime(freq, t, 0.06);
    this._sub.frequency.setTargetAtTime(freq * 0.5, t, 0.06);
    engineFilter.frequency.setTargetAtTime(340 + speed01 * 1500 + (throttle ? 320 : 0), t, 0.08);
    engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.09 + (throttle ? 0.045 : 0), t, 0.08);
  },

  // ---------- Утилиты ----------
  _tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null) {
    if (!this.enabled || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  },

  _noise(dur, vol = 0.3, filterFreq = 900) {
    if (!this.enabled || !ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  },

  // ---------- Игровые события ----------
  playHit(power = 1) {
    this._noise(0.16 + power * 0.1, Math.min(0.5, 0.2 + power * 0.25), 500 + power * 500);
    this._tone(90, 0.12, 'square', 0.18, 40);
  },
  playSquash() {
    this._noise(0.12, 0.35, 1400);
    this._tone(180, 0.08, 'square', 0.14, 70);
  },
  playBuy() {
    this._tone(660, 0.08, 'sine', 0.25);
    setTimeout(() => this._tone(990, 0.12, 'sine', 0.25), 80);
  },
  playError() { this._tone(160, 0.16, 'square', 0.2, 100); },
  playDeath() {
    this._tone(220, 0.5, 'sawtooth', 0.28, 55);
    this._noise(0.5, 0.3, 700);
  },
  playWin() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.18, 'triangle', 0.25), i * 110));
  },
  playFuelWarn() { this._tone(880, 0.09, 'square', 0.16); },
};