import { EffectsChain } from "./EffectsChain";
import type { EQSettings, FilterSettings } from "./types";
import { FLAT_EQ, NO_FILTER } from "./types";

export type LocalDeckPlaybackState = "empty" | "loading" | "paused" | "playing";

/**
 * Plays a locally-loaded audio file through a Web Audio effects chain
 * (EQ + filter), independent of any other deck. Uses AudioBufferSourceNode,
 * which is single-use per play, so play()/seek() create a fresh node each time.
 */
export class LocalDeck {
  readonly effects: EffectsChain;

  private readonly context: AudioContext;
  private readonly volumeGain: GainNode;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;

  private state: LocalDeckPlaybackState = "empty";
  /** Playback offset (seconds into the buffer) as of the last pause/seek. */
  private offset = 0;
  /** context.currentTime at which the current source started, minus offset. */
  private startedAt = 0;

  private onEndedCallback: (() => void) | null = null;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.volumeGain = context.createGain();
    this.effects = new EffectsChain(context);
    this.volumeGain.connect(this.effects.input);
    this.effects.output.connect(destination);
  }

  async loadFile(file: File): Promise<void> {
    this.stopSource();
    this.state = "loading";
    this.offset = 0;
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
    this.state = "paused";
  }

  play(): void {
    if (!this.buffer || this.state === "playing") return;
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.volumeGain);
    source.onended = () => {
      if (this.source !== source) return; // superseded by a seek/replay
      this.state = "paused";
      this.offset = 0;
      this.onEndedCallback?.();
    };
    source.start(0, this.offset);
    this.source = source;
    this.startedAt = this.context.currentTime - this.offset;
    this.state = "playing";
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.offset = this.getCurrentTime();
    this.stopSource();
    this.state = "paused";
  }

  seek(time: number): void {
    if (!this.buffer) return;
    const clamped = Math.max(0, Math.min(time, this.buffer.duration));
    const wasPlaying = this.state === "playing";
    this.stopSource();
    this.offset = clamped;
    this.state = "paused";
    if (wasPlaying) this.play();
  }

  setVolume(value: number): void {
    this.volumeGain.gain.value = Math.max(0, Math.min(1, value));
  }

  setEQ(eq: EQSettings = FLAT_EQ): void {
    this.effects.setEQ(eq);
  }

  setFilter(filter: FilterSettings = NO_FILTER): void {
    this.effects.setFilter(filter);
  }

  onEnded(callback: (() => void) | null): void {
    this.onEndedCallback = callback;
  }

  getCurrentTime(): number {
    if (this.state !== "playing") return this.offset;
    return this.context.currentTime - this.startedAt;
  }

  getDuration(): number {
    return this.buffer?.duration ?? 0;
  }

  getBuffer(): AudioBuffer | null {
    return this.buffer;
  }

  getState(): LocalDeckPlaybackState {
    return this.state;
  }

  dispose(): void {
    this.stopSource();
    this.volumeGain.disconnect();
    this.effects.dispose();
  }

  private stopSource(): void {
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        // already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
  }
}
