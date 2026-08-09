import { LocalDeck } from "./LocalDeck";
import type { DeckId } from "./types";

/** Equal-power crossfade curve: position 0 = full A, 1 = full B. */
function crossfadeGains(position: number): { a: number; b: number } {
  const clamped = Math.max(0, Math.min(1, position));
  const angle = clamped * (Math.PI / 2);
  return { a: Math.cos(angle), b: Math.sin(angle) };
}

/**
 * Owns the shared AudioContext and the two local-file deck buses. Apple
 * Music playback never touches this graph (MusicKit's stream is DRM-protected
 * and isn't exposed as a Web Audio node) - its volume is set directly via
 * MusicKit's own player.volume, scaled by the same crossfade curve.
 */
export class AudioEngine {
  readonly context: AudioContext;
  readonly localDecks: Record<DeckId, LocalDeck>;

  private readonly deckBus: Record<DeckId, GainNode>;
  private readonly master: GainNode;
  private crossfadePosition = 0.5;
  private deckVolume: Record<DeckId, number> = { A: 1, B: 1 };
  /** 0..1 multiplier layered on top of the normal crossfade/volume math,
   *  used to fade a deck out/in during a playlist transition without
   *  disturbing the user's actual crossfader/volume settings. */
  private transitionMultiplier: Record<DeckId, number> = { A: 1, B: 1 };

  constructor() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.connect(this.context.destination);

    this.deckBus = {
      A: this.context.createGain(),
      B: this.context.createGain(),
    };
    this.deckBus.A.connect(this.master);
    this.deckBus.B.connect(this.master);

    this.localDecks = {
      A: new LocalDeck(this.context, this.deckBus.A),
      B: new LocalDeck(this.context, this.deckBus.B),
    };

    this.applyCrossfade();
  }

  /** Resumes the AudioContext; must be called from a user gesture. */
  async resume(): Promise<void> {
    if (this.context.state === "suspended") await this.context.resume();
  }

  setCrossfade(position: number): void {
    this.crossfadePosition = position;
    this.applyCrossfade();
  }

  getCrossfade(): number {
    return this.crossfadePosition;
  }

  /** Per-deck volume trim (0..1), independent of crossfader position. */
  setDeckVolume(deck: DeckId, volume: number): void {
    this.deckVolume[deck] = Math.max(0, Math.min(1, volume));
    this.applyCrossfade();
  }

  /** Gain (0..1) the given deck should apply to its own source right now -
   *  used by the mixer store to drive MusicKit's player.volume when that
   *  deck holds the Apple Music slot. */
  getEffectiveGain(deck: DeckId): number {
    const { a, b } = crossfadeGains(this.crossfadePosition);
    const curve = deck === "A" ? a : b;
    return curve * this.deckVolume[deck] * this.transitionMultiplier[deck];
  }

  /** Drives the fade-out/fade-in steps of a playlist transition (see
   *  mixerStore.sendToDeck). Set back to 1 once a transition completes. */
  setTransitionMultiplier(deck: DeckId, value: number): void {
    this.transitionMultiplier[deck] = Math.max(0, Math.min(1, value));
    this.applyCrossfade();
  }

  /** Decodes a file into an AudioBuffer without touching any deck - used to
   *  preload playlist items ahead of time. */
  async decodeFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return this.context.decodeAudioData(arrayBuffer);
  }

  dispose(): void {
    this.localDecks.A.dispose();
    this.localDecks.B.dispose();
    this.deckBus.A.disconnect();
    this.deckBus.B.disconnect();
    this.master.disconnect();
    void this.context.close();
  }

  private applyCrossfade(): void {
    const { a, b } = crossfadeGains(this.crossfadePosition);
    this.deckBus.A.gain.value = a * this.deckVolume.A * this.transitionMultiplier.A;
    this.deckBus.B.gain.value = b * this.deckVolume.B * this.transitionMultiplier.B;
  }
}
