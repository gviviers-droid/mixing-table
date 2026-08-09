const RAMP_TIME = 0.01;

export abstract class AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  protected readonly context: AudioContext;
  protected readonly dryGain: GainNode;
  protected readonly wetGain: GainNode;
  private mixValue = 0.3;
  private bypassed = false;

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
  }

  connect(destination: AudioNode): AudioNode {
    this.output.connect(destination);
    return destination;
  }

  setMix(mix: number): void {
    this.mixValue = Math.min(1, Math.max(0, mix));
    this.applyMix();
  }

  getMix(): number {
    return this.mixValue;
  }

  setBypass(bypassed: boolean): void {
    this.bypassed = bypassed;
    this.applyMix();
  }

  isBypassed(): boolean {
    return this.bypassed;
  }

  protected applyMix(): void {
    const now = this.context.currentTime;
    const wet = this.bypassed ? 0 : this.mixValue;
    const dry = this.bypassed ? 1 : 1 - this.mixValue;
    this.wetGain.gain.setTargetAtTime(wet, now, RAMP_TIME);
    this.dryGain.gain.setTargetAtTime(dry, now, RAMP_TIME);
  }
}
