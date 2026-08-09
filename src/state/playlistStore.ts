import { create } from "zustand";
import type { DeckId, Transition } from "../audio/types";
import { DEFAULT_TRANSITION } from "../audio/types";
import type { Track } from "../musickit/search";
import { useMixerStore } from "./mixerStore";

type ItemStatus = "decoding" | "ready" | "error";

export interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  source: "local" | "apple-music";
  track?: Track;
  buffer?: AudioBuffer | null;
  status: ItemStatus;
  targetDeck: DeckId;
  transition: Transition;
}

interface PlaylistState {
  items: PlaylistItem[];
  addLocalFile(file: File): Promise<void>;
  addAppleMusicTrack(track: Track): void;
  removeItem(id: string): void;
  setTargetDeck(id: string, deck: DeckId): void;
  setTransition(id: string, transition: Transition): void;
  moveItem(id: string, direction: "up" | "down"): void;
  send(id: string): Promise<void>;
}

function newId(): string {
  return crypto.randomUUID();
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  items: [],

  async addLocalFile(file) {
    const id = newId();
    set((state) => ({
      items: [
        ...state.items,
        {
          id,
          title: file.name,
          artist: "Local file",
          source: "local",
          buffer: null,
          status: "decoding",
          targetDeck: "A",
          transition: DEFAULT_TRANSITION,
        },
      ],
    }));

    try {
      const engine = await useMixerStore.getState().ensureEngine();
      const buffer = await engine.decodeFile(file);
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, buffer, status: "ready" } : item,
        ),
      }));
    } catch {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, status: "error" } : item,
        ),
      }));
    }
  },

  addAppleMusicTrack(track) {
    set((state) => ({
      items: [
        ...state.items,
        {
          id: newId(),
          title: track.title,
          artist: track.artist,
          artworkUrl: track.artworkUrl,
          source: "apple-music",
          track,
          status: "ready",
          targetDeck: "A",
          transition: DEFAULT_TRANSITION,
        },
      ],
    }));
  },

  removeItem(id) {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  setTargetDeck(id, deck) {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, targetDeck: deck } : item,
      ),
    }));
  },

  setTransition(id, transition) {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, transition } : item,
      ),
    }));
  },

  moveItem(id, direction) {
    set((state) => {
      const index = state.items.findIndex((item) => item.id === id);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= state.items.length) {
        return state;
      }
      const items = [...state.items];
      [items[index], items[swapWith]] = [items[swapWith], items[index]];
      return { items };
    });
  },

  async send(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item || item.status !== "ready") return;

    if (item.source === "local" && item.buffer) {
      await useMixerStore
        .getState()
        .sendToDeck(
          item.targetDeck,
          { source: "local", title: item.title, buffer: item.buffer },
          item.transition,
        );
    } else if (item.source === "apple-music" && item.track) {
      await useMixerStore
        .getState()
        .sendToDeck(
          item.targetDeck,
          { source: "apple-music", track: item.track },
          item.transition,
        );
    }
  },
}));
