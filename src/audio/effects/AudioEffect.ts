const RAMP_TIME = 0.01;

/** Shared wet/dry mix + enable plumbing for time-based effects (reverb, delay). */
export abstract class AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;

  protected readonly context: AudioContext;
  protected readonly dryGain: GainNode;
  protected readonly wetGain: GainNode;

  private mixValue: number;
  private enabled = false;

  constructor(context: AudioContext, defaultMix: number) {
    this.context = context;
    this.mixValue = defaultMix;
    this.input = context.createGain();
    this.output = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);

    // Start fully dry (disabled) - GainNodes otherwise default to gain 1,
    // which would pass both dry AND wet signal until the first setEnabled/
    // setMix call overwrote it.
    this.dryGain.gain.value = 1;
    this.wetGain.gain.value = 0;
  }

  setMix(mix: number): void {
    this.mixValue = Math.min(1, Math.max(0, mix));
    this.applyMix();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyMix();
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }

  protected applyMix(): void {
    const now = this.context.currentTime;
    const wet = this.enabled ? this.mixValue : 0;
    const dry = this.enabled ? 1 - this.mixValue : 1;
    this.wetGain.gain.setTargetAtTime(wet, now, RAMP_TIME);
    this.dryGain.gain.setTargetAtTime(dry, now, RAMP_TIME);
  }
}
