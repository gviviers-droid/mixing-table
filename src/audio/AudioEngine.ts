import { ReverbEffect } from "./effects/ReverbEffect";
import { DelayEffect } from "./effects/DelayEffect";

const RAMP_TIME = 0.01;

/**
 * Signal chain: <audio> element -> Reverb -> Delay -> master gain -> speakers.
 * Effect order (reverb before delay) so delay repeats carry the reverb tail
 * rather than each repeat re-triggering a fresh reverb wash.
 */
export class AudioEngine {
  readonly context: AudioContext;
  readonly reverb: ReverbEffect;
  readonly delay: DelayEffect;
  private readonly masterGain: GainNode;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  constructor(private readonly audioElement: HTMLAudioElement) {
    this.context = new AudioContext();
    this.reverb = new ReverbEffect(this.context);
    this.delay = new DelayEffect(this.context);
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.9;
  }

  connectSource(): void {
    if (this.sourceNode) return;
    this.sourceNode = this.context.createMediaElementSource(this.audioElement);
    this.sourceNode.connect(this.reverb.input);
    this.reverb.connect(this.delay.input);
    this.delay.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  async resume(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  setMasterVolume(value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    this.masterGain.gain.setTargetAtTime(clamped, this.context.currentTime, RAMP_TIME);
  }
}
