import { create } from "zustand";
import { AudioEngine } from "../audio/AudioEngine";
import type { DeckId, EQSettings, FilterSettings, Transition } from "../audio/types";
import { FLAT_EQ, NO_FILTER } from "../audio/types";

/** What a playlist item hands off to a deck when triggered. */
export interface SendPayload {
  title: string;
  buffer: AudioBuffer;
}

type DeckSource = "empty" | "local";
type PlaybackState = "empty" | "loading" | "paused" | "playing";

interface DeckState {
  source: DeckSource;
  title: string | null;
  artist: string | null;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  eq: EQSettings;
  filter: FilterSettings;
  volume: number;
  waveform: AudioBuffer | null;
}

function emptyDeck(): DeckState {
  return {
    source: "empty",
    title: null,
    artist: null,
    playbackState: "empty",
    currentTime: 0,
    duration: 0,
    eq: FLAT_EQ,
    filter: NO_FILTER,
    volume: 1,
    waveform: null,
  };
}

interface MixerState {
  engine: AudioEngine | null;
  crossfade: number;
  decks: Record<DeckId, DeckState>;

  ensureEngine(): Promise<AudioEngine>;
  loadLocalFile(deck: DeckId, file: File): Promise<void>;
  play(deck: DeckId): void;
  pause(deck: DeckId): void;
  seek(deck: DeckId, time: number): void;
  setEQ(deck: DeckId, eq: EQSettings): void;
  setFilter(deck: DeckId, filter: FilterSettings): void;
  setDeckVolume(deck: DeckId, volume: number): void;
  setCrossfade(position: number): void;
  /** Loads a (usually preloaded) buffer into a deck, either as an instant
   *  cut or - for `transition.type === 'fade'` - a real overlapping
   *  crossfade with whatever the deck was already playing. */
  sendToDeck(
    deck: DeckId,
    payload: SendPayload,
    transition: Transition,
  ): Promise<void>;
}

let tickerStarted = false;

export const useMixerStore = create<MixerState>((set, get) => ({
  engine: null,
  crossfade: 0.5,
  decks: { A: emptyDeck(), B: emptyDeck() },

  async ensureEngine() {
    let { engine } = get();
    if (!engine) {
      engine = new AudioEngine();
      set({ engine });
    }
    await engine.resume();
    startTicker(get, set);
    return engine;
  },

  async loadLocalFile(deck, file) {
    const engine = await get().ensureEngine();
    updateDeck(set, deck, {
      ...emptyDeck(),
      source: "local",
      title: file.name,
      artist: "Local file",
      playbackState: "loading",
    });
    await engine.localDecks[deck].loadFile(file);
    updateDeck(set, deck, {
      playbackState: "paused",
      duration: engine.localDecks[deck].getDuration(),
      waveform: engine.localDecks[deck].getBuffer(),
    });
  },

  play(deck) {
    const { engine, decks } = get();
    if (!engine || decks[deck].source !== "local") return;
    engine.localDecks[deck].play();
    updateDeck(set, deck, { playbackState: "playing" });
  },

  pause(deck) {
    const { engine, decks } = get();
    if (!engine || decks[deck].source !== "local") return;
    engine.localDecks[deck].pause();
    updateDeck(set, deck, { playbackState: "paused" });
  },

  seek(deck, time) {
    const { engine, decks } = get();
    if (!engine || decks[deck].source !== "local") return;
    engine.localDecks[deck].seek(time);
    updateDeck(set, deck, { currentTime: time });
  },

  setEQ(deck, eq) {
    const { engine, decks } = get();
    if (!engine || decks[deck].source !== "local") return;
    engine.localDecks[deck].setEQ(eq);
    updateDeck(set, deck, { eq });
  },

  setFilter(deck, filter) {
    const { engine, decks } = get();
    if (!engine || decks[deck].source !== "local") return;
    engine.localDecks[deck].setFilter(filter);
    updateDeck(set, deck, { filter });
  },

  setDeckVolume(deck, volume) {
    const { engine } = get();
    if (!engine) return;
    engine.setDeckVolume(deck, volume);
    updateDeck(set, deck, { volume });
  },

  setCrossfade(position) {
    const { engine } = get();
    set({ crossfade: position });
    engine?.setCrossfade(position);
  },

  async sendToDeck(deck, payload, transition) {
    const engine = await get().ensureEngine();
    const localDeck = engine.localDecks[deck];
    const hasExisting = get().decks[deck].source !== "empty";

    if (transition.type === "fade" && hasExisting) {
      localDeck.crossfadeTo(payload.buffer, transition.durationSec);
    } else {
      localDeck.loadBuffer(payload.buffer);
      localDeck.play();
    }

    updateDeck(set, deck, {
      ...emptyDeck(),
      source: "local",
      title: payload.title,
      artist: "Local file",
      playbackState: "playing",
      duration: localDeck.getDuration(),
      waveform: payload.buffer,
    });
  },
}));

function updateDeck(
  set: (fn: (state: MixerState) => Partial<MixerState>) => void,
  deck: DeckId,
  patch: Partial<DeckState>,
): void {
  set((state) => ({
    decks: { ...state.decks, [deck]: { ...state.decks[deck], ...patch } },
  }));
}

/** Polls playback position/duration from the engine into the store. */
function startTicker(
  get: () => MixerState,
  set: (fn: (state: MixerState) => Partial<MixerState>) => void,
): void {
  if (tickerStarted) return;
  tickerStarted = true;

  setInterval(() => {
    const { engine, decks } = get();
    if (!engine) return;

    (["A", "B"] as DeckId[]).forEach((deck) => {
      if (decks[deck].source !== "local") return;
      const localDeck = engine.localDecks[deck];
      updateDeck(set, deck, {
        currentTime: localDeck.getCurrentTime(),
        duration: localDeck.getDuration(),
      });
    });
  }, 250);
}
