/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction to comply with browser autoplay policies
  }

  private initCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
    return this.ctx;
  }

  public resume() {
    const context = this.initCtx();
    if (context && context.state === "suspended") {
      context.resume().catch((e) => console.log("AudioContext resume failed:", e));
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted() {
    return this.muted;
  }

  public playCoin() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    
    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(987.77, now); // B5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Second note a tiny bit later
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(1318.51, now + 0.07); // E6
    gain2.gain.setValueAtTime(0.08, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.35);
  }

  public playLaser() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playExplosion() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    const duration = 0.45;

    // Create noise oscillator manually using buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to make it a low pitch rumbling explosion
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(10, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + duration);

    // Add a low freq sub boom
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = "triangle";
    boomOsc.frequency.setValueAtTime(110, now);
    boomOsc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
    boomGain.gain.setValueAtTime(0.15, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    boomOsc.connect(boomGain);
    boomGain.connect(ctx.destination);
    boomOsc.start(now);
    boomOsc.stop(now + 0.3);
  }

  public playBounce() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(330, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playJump() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playChomp() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playEatGhost() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    const notes = [261.63, 311.13, 369.99, 440.00, 523.25]; // Rising spooky minor-ish chord arpeggio
    notes.forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, now + idx * 0.06);
      g.gain.setValueAtTime(0.05, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + idx * 0.06);
      o.stop(now + idx * 0.06 + 0.15);
    });
  }

  public playLevelUp() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.resume();

    const now = ctx.currentTime;
    // Classic arcade level-complete fanfare chord
    const scale = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio high
    scale.forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(freq, now + idx * 0.1);
      g.gain.setValueAtTime(0.05, now + idx * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + idx * 0.1);
      o.stop(now + idx * 0.1 + 0.3);
    });
  }
}

export const synth = new AudioSynth();
