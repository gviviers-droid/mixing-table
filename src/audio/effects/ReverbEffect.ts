import { AudioEffect } from "./AudioEffect";

const RAMP_TIME = 0.01;
const MIN_DECAY = 0.1;
const MAX_DECAY = 8;

/**
 * Algorithmic reverb: a ConvolverNode fed by a noise-based impulse response
 * generated on the fly, so no external IR sample files are needed.
 */
export class ReverbEffect extends AudioEffect {
  private readonly convolver: ConvolverNode;
  private readonly preDelay: DelayNode;
  private decaySeconds: number;

  constructor(context: AudioContext, defaultMix: number, defaultDecaySeconds: number) {
    super(context, defaultMix);
    this.decaySeconds = defaultDecaySeconds;

    this.convolver = context.createConvolver();
    this.preDelay = context.createDelay(1);
    this.preDelay.delayTime.value = 0.02;

    this.input.connect(this.preDelay);
    this.preDelay.connect(this.convolver);
    this.convolver.connect(this.wetGain);

    this.regenerateImpulse();
  }

  setDecay(seconds: number): void {
    this.decaySeconds = Math.min(MAX_DECAY, Math.max(MIN_DECAY, seconds));
    this.regenerateImpulse();
  }

  setPreDelay(ms: number): void {
    const seconds = Math.min(1, Math.max(0, ms / 1000));
    this.preDelay.delayTime.setTargetAtTime(seconds, this.context.currentTime, RAMP_TIME);
  }

  override dispose(): void {
    super.dispose();
    this.convolver.disconnect();
    this.preDelay.disconnect();
  }

  private regenerateImpulse(): void {
    const sampleRate = this.context.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * this.decaySeconds));
    const impulse = this.context.createBuffer(2, length, sampleRate);
    // Steeper power for shorter decays keeps small rooms tight; longer
    // decays get a gentler curve so the tail actually reads as "long".
    const power = 1 + 4 / this.decaySeconds;

    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, power);
      }
    }

    this.convolver.buffer = impulse;
  }
}
