import type { ChangeEvent } from "react";
import type { DeckId } from "../audio/types";
import { useMixerStore } from "../state/mixerStore";
import { formatTime } from "../utils/formatTime";
import { CompressorPanel } from "./CompressorPanel";
import { EQPanel } from "./EQPanel";
import { FilterPanel } from "./FilterPanel";
import { Waveform } from "./Waveform";

interface DeckProps {
  deckId: DeckId;
}

export function Deck({ deckId }: DeckProps) {
  const deck = useMixerStore((s) => s.decks[deckId]);
  const loadLocalFile = useMixerStore((s) => s.loadLocalFile);
  const play = useMixerStore((s) => s.play);
  const pause = useMixerStore((s) => s.pause);
  const seek = useMixerStore((s) => s.seek);
  const setEQ = useMixerStore((s) => s.setEQ);
  const setFilter = useMixerStore((s) => s.setFilter);
  const setCompressor = useMixerStore((s) => s.setCompressor);
  const setDeckVolume = useMixerStore((s) => s.setDeckVolume);

  const hasTrack = deck.source === "local";

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void loadLocalFile(deckId, file);
    e.target.value = "";
  }

  return (
    <section className={`deck deck-${deckId}`}>
      <header>
        <h2>Deck {deckId}</h2>
        {deck.title ? (
          <div className="now-loaded">
            <strong>{deck.title}</strong>
            <span>{deck.artist}</span>
          </div>
        ) : (
          <p className="empty-hint">No track loaded</p>
        )}
      </header>

      <Waveform
        buffer={deck.waveform}
        progress={deck.duration ? deck.currentTime / deck.duration : 0}
      />

      <div className="transport">
        <button
          type="button"
          onClick={() => (deck.playbackState === "playing" ? pause(deckId) : play(deckId))}
          disabled={deck.source === "empty"}
        >
          {deck.playbackState === "playing" ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={deck.duration || 0}
          step={0.1}
          value={Math.min(deck.currentTime, deck.duration || 0)}
          disabled={deck.source === "empty"}
          onChange={(e) => seek(deckId, Number(e.target.value))}
        />
        <span className="time">
          {formatTime(deck.currentTime)} / {formatTime(deck.duration)}
        </span>
      </div>

      <label className="deck-volume">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={deck.volume}
          onChange={(e) => setDeckVolume(deckId, Number(e.target.value))}
        />
      </label>

      <EQPanel
        eq={deck.eq}
        disabled={!hasTrack}
        onChange={(eq) => setEQ(deckId, eq)}
      />
      <FilterPanel
        filter={deck.filter}
        disabled={!hasTrack}
        onChange={(filter) => setFilter(deckId, filter)}
      />
      <CompressorPanel
        compressor={deck.compressor}
        reduction={deck.compressorReduction}
        disabled={!hasTrack}
        onChange={(compressor) => setCompressor(deckId, compressor)}
      />

      <label className="file-input">
        Load local file
        <input type="file" accept="audio/*" onChange={handleFileChange} />
      </label>
    </section>
  );
}
