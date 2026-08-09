import { create } from "zustand";
import { AudioEngine } from "../audio/AudioEngine";
import type { DeckId, EQSettings, FilterSettings, Transition } from "../audio/types";
import { FLAT_EQ, NO_FILTER } from "../audio/types";
import { rampDeckAudibility } from "../audio/transitions";
import { getMusicKitInstance } from "../musickit/loadMusicKit";
import type { Track } from "../musickit/search";

/** What a playlist item hands off to a deck when triggered. */
export type SendPayload =
  | { source: "local"; title: string; buffer: AudioBuffer }
  | { source: "apple-music"; track: Track };

type DeckSource = "empty" | "local" | "apple-music";
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
  appleMusicSlot: DeckId | null;
  crossfade: number;
  decks: Record<DeckId, DeckState>;
  error: string | null;

  ensureEngine(): Promise<AudioEngine>;
  loadLocalFile(deck: DeckId, file: File): Promise<void>;
  loadAppleMusicTrack(deck: DeckId, track: Track): Promise<void>;
  play(deck: DeckId): Promise<void>;
  pause(deck: DeckId): void;
  seek(deck: DeckId, time: number): Promise<void>;
  setEQ(deck: DeckId, eq: EQSettings): void;
  setFilter(deck: DeckId, filter: FilterSettings): void;
  setDeckVolume(deck: DeckId, volume: number): void;
  setCrossfade(position: number): void;
  sendToDeck(
    deck: DeckId,
    payload: SendPayload,
    transition: Transition,
  ): Promise<void>;
}

let tickerStarted = false;

export const useMixerStore = create<MixerState>((set, get) => ({
  engine: null,
  appleMusicSlot: null,
  crossfade: 0.5,
  decks: { A: emptyDeck(), B: emptyDeck() },
  error: null,

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
    await stopDeckContent(deck, engine, get, set);
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

  async loadAppleMusicTrack(deck, track) {
    const engine = await get().ensureEngine();
    const instance = await getMusicKitInstance();
    await stopDeckContent(deck, engine, get, set);
    const previousHolder = get().appleMusicSlot;

    if (previousHolder && previousHolder !== deck) {
      instance.stop();
      updateDeck(set, previousHolder, {
        ...emptyDeck(),
      });
    }

    set({ appleMusicSlot: deck });
    updateDeck(set, deck, {
      ...emptyDeck(),
      source: "apple-music",
      title: track.title,
      artist: track.artist,
      playbackState: "loading",
      duration: (track.durationMs ?? 0) / 1000,
    });

    await instance.setQueue({ song: track.id });
    instance.volume = engine.getEffectiveGain(deck);
    updateDeck(set, deck, { playbackState: "paused" });
  },

  async play(deck) {
    const engine = await get().ensureEngine();
    const deckState = get().decks[deck];
    if (deckState.source === "local") {
      engine.localDecks[deck].play();
      updateDeck(set, deck, { playbackState: "playing" });
    } else if (deckState.source === "apple-music" && get().appleMusicSlot === deck) {
      const instance = await getMusicKitInstance();
      await instance.play();
      updateDeck(set, deck, { playbackState: "playing" });
    }
  },

  pause(deck) {
    const { engine, decks, appleMusicSlot } = get();
    if (!engine) return;
    const deckState = decks[deck];
    if (deckState.source === "local") {
      engine.localDecks[deck].pause();
      updateDeck(set, deck, { playbackState: "paused" });
    } else if (deckState.source === "apple-music" && appleMusicSlot === deck) {
      getMusicKitInstance().then((instance) => instance.pause());
      updateDeck(set, deck, { playbackState: "paused" });
    }
  },

  async seek(deck, time) {
    const { engine, decks, appleMusicSlot } = get();
    if (!engine) return;
    const deckState = decks[deck];
    if (deckState.source === "local") {
      engine.localDecks[deck].seek(time);
    } else if (deckState.source === "apple-music" && appleMusicSlot === deck) {
      const instance = await getMusicKitInstance();
      await instance.seekToTime(time);
    }
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
    const { engine, appleMusicSlot } = get();
    if (!engine) return;
    engine.setDeckVolume(deck, volume);
    updateDeck(set, deck, { volume });
    syncAppleMusicVolume(engine, appleMusicSlot);
  },

  setCrossfade(position) {
    const { engine, appleMusicSlot } = get();
    set({ crossfade: position });
    if (!engine) return;
    engine.setCrossfade(position);
    syncAppleMusicVolume(engine, appleMusicSlot);
  },

  async sendToDeck(deck, payload, transition) {
    const engine = await get().ensureEngine();
    const hasExisting = get().decks[deck].source !== "empty";
    const doFade = transition.type === "fade" && hasExisting;
    const halfMs = (transition.durationSec * 1000) / 2;

    if (doFade) {
      const outgoingInstance =
        get().appleMusicSlot === deck ? await getMusicKitInstance() : null;
      await rampDeckAudibility(engine, deck, 1, 0, halfMs, outgoingInstance);
    }

    if (payload.source === "local") {
      await stopDeckContent(deck, engine, get, set);
      if (doFade) engine.setTransitionMultiplier(deck, 0);
      engine.localDecks[deck].loadBuffer(payload.buffer);
      updateDeck(set, deck, {
        ...emptyDeck(),
        source: "local",
        title: payload.title,
        artist: "Local file",
        duration: engine.localDecks[deck].getDuration(),
        waveform: payload.buffer,
      });
      engine.localDecks[deck].play();
      updateDeck(set, deck, { playbackState: "playing" });
    } else {
      if (doFade) engine.setTransitionMultiplier(deck, 0);
      await get().loadAppleMusicTrack(deck, payload.track);
      await get().play(deck);
    }

    if (doFade) {
      const incomingInstance =
        get().appleMusicSlot === deck ? await getMusicKitInstance() : null;
      await rampDeckAudibility(engine, deck, 0, 1, halfMs, incomingInstance);
      engine.setTransitionMultiplier(deck, 1);
    }
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

/** Stops whatever pipeline (local or Apple Music) is currently active on a deck. */
async function stopDeckContent(
  deck: DeckId,
  engine: AudioEngine,
  get: () => MixerState,
  set: (fn: (state: MixerState) => Partial<MixerState>) => void,
): Promise<void> {
  const source = get().decks[deck].source;
  if (source === "local") {
    engine.localDecks[deck].pause();
  } else if (source === "apple-music" && get().appleMusicSlot === deck) {
    const instance = await getMusicKitInstance();
    instance.stop();
    set(() => ({ appleMusicSlot: null }));
  }
}

function syncAppleMusicVolume(
  engine: AudioEngine,
  appleMusicSlot: DeckId | null,
): void {
  if (!appleMusicSlot) return;
  getMusicKitInstance().then((instance) => {
    instance.volume = engine.getEffectiveGain(appleMusicSlot);
  });
}

/** Polls playback position/state from the engine and MusicKit into the store. */
function startTicker(
  get: () => MixerState,
  set: (fn: (state: MixerState) => Partial<MixerState>) => void,
): void {
  if (tickerStarted) return;
  tickerStarted = true;

  setInterval(() => {
    const { engine, decks, appleMusicSlot } = get();
    if (!engine) return;

    (["A", "B"] as DeckId[]).forEach((deck) => {
      const deckState = decks[deck];
      if (deckState.source === "local") {
        const localDeck = engine.localDecks[deck];
        updateDeck(set, deck, {
          currentTime: localDeck.getCurrentTime(),
          duration: localDeck.getDuration(),
        });
      } else if (deckState.source === "apple-music" && appleMusicSlot === deck) {
        getMusicKitInstance().then((instance) => {
          updateDeck(set, deck, {
            currentTime: instance.currentPlaybackTime,
            duration: instance.currentPlaybackDuration || deckState.duration,
            playbackState:
              instance.playbackState === "playing" ? "playing" : "paused",
          });
        });
      }
    });
  }, 250);
}
