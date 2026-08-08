import type { EQSettings, FilterSettings } from "./types";

/**
 * Per-deck signal chain for locally-loaded audio (not available for Apple
 * Music decks, whose streams never pass through our AudioContext):
 *
 *   input -> low shelf -> mid peaking -> high shelf -> filter -> output
 */
export class EffectsChain {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly low: BiquadFilterNode;
  private readonly mid: BiquadFilterNode;
  private readonly high: BiquadFilterNode;
  private readonly filter: BiquadFilterNode;

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

    this.output = context.createGain();

    this.input
      .connect(this.low)
      .connect(this.mid)
      .connect(this.high)
      .connect(this.filter)
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

  dispose(): void {
    this.input.disconnect();
    this.low.disconnect();
    this.mid.disconnect();
    this.high.disconnect();
    this.filter.disconnect();
    this.output.disconnect();
  }
}
