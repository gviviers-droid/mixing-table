import type { CompressorSettings, EQSettings, FilterSettings } from "./types";

/**
 * Per-deck signal chain for locally-loaded audio:
 *
 *   input -> low shelf -> mid peaking -> high shelf -> filter -> compressor -> output
 */
export class EffectsChain {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly low: BiquadFilterNode;
  private readonly mid: BiquadFilterNode;
  private readonly high: BiquadFilterNode;
  private readonly filter: BiquadFilterNode;
  private readonly compressor: DynamicsCompressorNode;

  constructor(context: AudioContext) {
    this.input = context.createGain();

    this.low = context.createBiquadFilter();
    this.low.type = "lowshelf";
    this.low.frequency.value = 320;

    this.mid = context.createBiquadFilter();
    this.mid.type = "peaking";
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 0.9;

    this.high = context.createBiquadFilter();
    this.high.type = "highshelf";
    this.high.frequency.value = 3200;

    this.filter = context.createBiquadFilter();
    this.filter.type = "allpass";

    this.compressor = context.createDynamicsCompressor();
    // ratio 1 = identity (no gain reduction), used as the "disabled" state.
    this.compressor.ratio.value = 1;

    this.output = context.createGain();

    this.input
      .connect(this.low)
      .connect(this.mid)
      .connect(this.high)
      .connect(this.filter)
      .connect(this.compressor)
      .connect(this.output);
  }

  setEQ(eq: EQSettings): void {
    this.low.gain.value = eq.low;
    this.mid.gain.value = eq.mid;
    this.high.gain.value = eq.high;
  }

  setFilter(settings: FilterSettings): void {
    this.filter.type = settings.type === "none" ? "allpass" : settings.type;
    this.filter.frequency.value = settings.frequency;
  }

  setCompressor(settings: CompressorSettings): void {
    this.compressor.threshold.value = settings.thresholdDb;
    this.compressor.ratio.value = settings.enabled ? settings.ratio : 1;
  }

  /** Current gain reduction in dB (0 = no reduction happening right now). */
  getCompressorReduction(): number {
    return this.compressor.reduction;
  }

  dispose(): void {
    this.input.disconnect();
    this.low.disconnect();
    this.mid.disconnect();
    this.high.disconnect();
    this.filter.disconnect();
    this.compressor.disconnect();
    this.output.disconnect();
  }
}
