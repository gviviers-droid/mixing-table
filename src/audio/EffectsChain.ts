import { DelayEffect } from "./effects/DelayEffect";
import { ReverbEffect } from "./effects/ReverbEffect";
import type {
  CompressorSettings,
  DelaySettings,
  EQSettings,
  FilterSettings,
  ReverbSettings,
} from "./types";
import { DEFAULT_DELAY, DEFAULT_REVERB } from "./types";

/**
 * Per-deck signal chain for locally-loaded audio:
 *
 *   input -> low shelf -> mid peaking -> high shelf -> filter
 *          -> reverb -> delay -> compressor -> output
 *
 * Reverb sits before delay so delay repeats carry the reverb tail with them,
 * rather than each repeat re-triggering a fresh reverb wash. Compressor sits
 * last to control the combined signal, including any buildup from the wet
 * effects/feedback ahead of it.
 */
export class EffectsChain {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly low: BiquadFilterNode;
  private readonly mid: BiquadFilterNode;
  private readonly high: BiquadFilterNode;
  private readonly filter: BiquadFilterNode;
  private readonly reverb: ReverbEffect;
  private readonly delay: DelayEffect;
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

    this.reverb = new ReverbEffect(context, DEFAULT_REVERB.mix, DEFAULT_REVERB.decaySeconds);
    this.delay = new DelayEffect(context, DEFAULT_DELAY.mix);

    this.compressor = context.createDynamicsCompressor();
    // ratio 1 = identity (no gain reduction), used as the "disabled" state.
    this.compressor.ratio.value = 1;

    this.output = context.createGain();

    this.input
      .connect(this.low)
      .connect(this.mid)
      .connect(this.high)
      .connect(this.filter)
      .connect(this.reverb.input);
    this.reverb.output.connect(this.delay.input);
    this.delay.output
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

  setReverb(settings: ReverbSettings): void {
    this.reverb.setEnabled(settings.enabled);
    this.reverb.setMix(settings.mix);
    this.reverb.setDecay(settings.decaySeconds);
    this.reverb.setPreDelay(settings.preDelayMs);
  }

  setDelay(settings: DelaySettings): void {
    this.delay.setEnabled(settings.enabled);
    this.delay.setMix(settings.mix);
    this.delay.setTime(settings.timeMs);
    this.delay.setFeedback(settings.feedback);
    this.delay.setTone(settings.toneHz);
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
    this.reverb.dispose();
    this.delay.dispose();
    this.compressor.disconnect();
    this.output.disconnect();
  }
}
