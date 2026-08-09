import { AudioEffect } from "./AudioEffect";

const RAMP_TIME = 0.01;
const MAX_DELAY_SECONDS = 2;
const MAX_FEEDBACK = 0.9;

/**
 * Feedback delay with a lowpass filter in the feedback loop so repeats
 * darken over time instead of looping back unchanged.
 */
export class DelayEffect extends AudioEffect {
  private readonly delayNode: DelayNode;
  private readonly feedbackGain: GainNode;
  private readonly toneFilter: BiquadFilterNode;

  constructor(context: AudioContext, defaultMix: number) {
    super(context, defaultMix);

    this.delayNode = context.createDelay(MAX_DELAY_SECONDS);
    this.delayNode.delayTime.value = 0.3;

    this.feedbackGain = context.createGain();
    this.feedbackGain.gain.value = 0.35;

    this.toneFilter = context.createBiquadFilter();
    this.toneFilter.type = "lowpass";
    this.toneFilter.frequency.value = 4000;

    this.input.connect(this.delayNode);
    this.delayNode.connect(this.toneFilter);
    this.toneFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.toneFilter.connect(this.wetGain);
  }

  setTime(ms: number): void {
    const seconds = Math.min(MAX_DELAY_SECONDS, Math.max(0.001, ms / 1000));
    this.delayNode.delayTime.setTargetAtTime(seconds, this.context.currentTime, RAMP_TIME);
  }

  setFeedback(amount: number): void {
    const value = Math.min(MAX_FEEDBACK, Math.max(0, amount));
    this.feedbackGain.gain.setTargetAtTime(value, this.context.currentTime, RAMP_TIME);
  }

  setTone(hz: number): void {
    const value = Math.min(18000, Math.max(200, hz));
    this.toneFilter.frequency.setTargetAtTime(value, this.context.currentTime, RAMP_TIME);
  }

  override dispose(): void {
    super.dispose();
    this.delayNode.disconnect();
    this.feedbackGain.disconnect();
    this.toneFilter.disconnect();
  }
}
