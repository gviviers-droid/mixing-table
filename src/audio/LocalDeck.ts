import { EffectsChain } from "./EffectsChain";
import type {
  CompressorSettings,
  DelaySettings,
  EQSettings,
  FilterSettings,
  ReverbSettings,
} from "./types";
import { DEFAULT_COMPRESSOR, DEFAULT_DELAY, DEFAULT_REVERB, FLAT_EQ, NO_FILTER } from "./types";

export type LocalDeckPlaybackState = "empty" | "loading" | "paused" | "playing";

interface PlaybackLayer {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * Plays locally-loaded audio through a Web Audio effects chain (EQ +
 * filter), independent of any other deck. Normal playback is a single
 * "layer" (source + its own gain node feeding the shared volume/EQ chain);
 * crossfadeTo() briefly runs two layers at once - the outgoing track ramps
 * to silence on the audio clock while the incoming one ramps up - so a
 * playlist "fade" transition is a real overlapping crossfade, not a
 * dip-and-rise around a hard swap.
 */
export class LocalDeck {
  readonly effects: EffectsChain;

  private readonly context: AudioContext;
  private readonly volumeGain: GainNode;
  private buffer: AudioBuffer | null = null;
  /** The layer whose position getCurrentTime()/getDuration() report - the
   *  "current" track. A layer being faded out by crossfadeTo() stops
   *  itself independently and is not tracked here once superseded. */
  private active: PlaybackLayer | null = null;

  private state: LocalDeckPlaybackState = "empty";
  /** Playback offset (seconds into the buffer) as of the last pause/seek. */
  private offset = 0;
  /** context.currentTime at which the active layer started, minus offset. */
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
    this.stopActiveLayer();
    this.state = "loading";
    this.offset = 0;
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
    this.state = "paused";
  }

  /** Adopts an already-decoded buffer (e.g. a preloaded playlist item) without re-decoding. */
  loadBuffer(buffer: AudioBuffer): void {
    this.stopActiveLayer();
    this.offset = 0;
    this.buffer = buffer;
    this.state = "paused";
  }

  play(): void {
    if (!this.buffer || this.state === "playing") return;
    this.active = this.startLayer(this.buffer, this.offset, 1);
    this.startedAt = this.context.currentTime - this.offset;
    this.state = "playing";
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.offset = this.getCurrentTime();
    this.stopActiveLayer();
    this.state = "paused";
  }

  seek(time: number): void {
    if (!this.buffer) return;
    const clamped = Math.max(0, Math.min(time, this.buffer.duration));
    const wasPlaying = this.state === "playing";
    this.stopActiveLayer();
    this.offset = clamped;
    this.state = "paused";
    if (wasPlaying) this.play();
  }

  /**
   * Crossfades into `buffer` over `durationSec`: whatever is currently
   * playing ramps down to silence and stops itself once inaudible, while
   * `buffer` starts immediately and ramps up - both audible together for
   * the overlap. `buffer` becomes the deck's current track right away
   * (getCurrentTime()/getDuration() reflect it from this call, not after
   * the fade completes). durationSec <= 0 behaves like an instant swap.
   */
  crossfadeTo(buffer: AudioBuffer, durationSec: number): void {
    const now = this.context.currentTime;
    const outgoing = this.active;

    if (outgoing && durationSec > 0) {
      const outgoingGain = outgoing.gain.gain;
      outgoingGain.cancelScheduledValues(now);
      outgoingGain.setValueAtTime(outgoingGain.value, now);
      outgoingGain.linearRampToValueAtTime(0, now + durationSec);
      const outgoingSource = outgoing.source;
      outgoingSource.stop(now + durationSec);
      outgoingSource.onended = () => {
        outgoingSource.disconnect();
        outgoing.gain.disconnect();
      };
    } else if (outgoing) {
      this.stopLayer(outgoing);
    }

    const incoming = this.startLayer(buffer, 0, durationSec > 0 ? 0 : 1);
    if (durationSec > 0) {
      incoming.gain.gain.setValueAtTime(0, now);
      incoming.gain.gain.linearRampToValueAtTime(1, now + durationSec);
    }

    this.buffer = buffer;
    this.offset = 0;
    this.startedAt = now;
    this.active = incoming;
    this.state = "playing";
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

  setCompressor(compressor: CompressorSettings = DEFAULT_COMPRESSOR): void {
    this.effects.setCompressor(compressor);
  }

  setReverb(reverb: ReverbSettings = DEFAULT_REVERB): void {
    this.effects.setReverb(reverb);
  }

  setDelay(delay: DelaySettings = DEFAULT_DELAY): void {
    this.effects.setDelay(delay);
  }

  getCompressorReduction(): number {
    return this.effects.getCompressorReduction();
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
    this.stopActiveLayer();
    this.volumeGain.disconnect();
    this.effects.dispose();
  }

  private startLayer(
    buffer: AudioBuffer,
    offset: number,
    initialGain: number,
  ): PlaybackLayer {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = initialGain;
    source.connect(gain);
    gain.connect(this.volumeGain);
    source.onended = () => {
      if (this.active?.source !== source) return; // superseded by crossfade/seek/replay
      this.state = "paused";
      this.offset = 0;
      this.onEndedCallback?.();
    };
    source.start(0, offset);
    return { source, gain };
  }

  private stopActiveLayer(): void {
    if (!this.active) return;
    this.stopLayer(this.active);
    this.active = null;
  }

  private stopLayer(layer: PlaybackLayer): void {
    layer.source.onended = null;
    try {
      layer.source.stop();
    } catch {
      // already stopped
    }
    layer.source.disconnect();
    layer.gain.disconnect();
  }
}
