import { LocalDeck } from "./LocalDeck";
import type { DeckId } from "./types";

/** Equal-power crossfade curve: position 0 = full A, 1 = full B. */
function crossfadeGains(position: number): { a: number; b: number } {
  const clamped = Math.max(0, Math.min(1, position));
  const angle = clamped * (Math.PI / 2);
  return { a: Math.cos(angle), b: Math.sin(angle) };
}

/** Owns the shared AudioContext and the two local-file deck buses. */
export class AudioEngine {
  readonly context: AudioContext;
  readonly localDecks: Record<DeckId, LocalDeck>;

  private readonly deckBus: Record<DeckId, GainNode>;
  private readonly master: GainNode;
  private crossfadePosition = 0.5;
  private deckVolume: Record<DeckId, number> = { A: 1, B: 1 };

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
    this.deckBus.A.gain.value = a * this.deckVolume.A;
    this.deckBus.B.gain.value = b * this.deckVolume.B;
  }
}
