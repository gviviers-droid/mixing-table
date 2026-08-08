import type { DeckId } from "../audio/types";
import { useMixerStore } from "../state/mixerStore";
import { formatTime } from "../utils/formatTime";
import { EQPanel } from "./EQPanel";
import { FilterPanel } from "./FilterPanel";
import { TrackSource } from "./TrackSource";
import { Waveform } from "./Waveform";

interface DeckProps {
  deckId: DeckId;
  isAuthorized: boolean;
}

export function Deck({ deckId, isAuthorized }: DeckProps) {
  const deck = useMixerStore((s) => s.decks[deckId]);
  const appleMusicSlot = useMixerStore((s) => s.appleMusicSlot);
  const loadLocalFile = useMixerStore((s) => s.loadLocalFile);
  const loadAppleMusicTrack = useMixerStore((s) => s.loadAppleMusicTrack);
  const play = useMixerStore((s) => s.play);
  const pause = useMixerStore((s) => s.pause);
  const seek = useMixerStore((s) => s.seek);
  const setEQ = useMixerStore((s) => s.setEQ);
  const setFilter = useMixerStore((s) => s.setFilter);
  const setDeckVolume = useMixerStore((s) => s.setDeckVolume);

  const isLocal = deck.source === "local";
  const isAppleMusic = deck.source === "apple-music";
  const stealsAppleSlot =
    appleMusicSlot !== null && appleMusicSlot !== deckId && isAppleMusic === false;

  return (
    <section className={`deck deck-${deckId}`}>
      <header>
        <h2>Deck {deckId}</h2>
        {deck.title ? (
          <div className="now-loaded">
            <strong>{deck.title}</strong>
            <span>{deck.artist}</span>
            {isAppleMusic && (
              <span className="badge">Apple Music (streamed)</span>
            )}
          </div>
        ) : (
          <p className="empty-hint">No track loaded</p>
        )}
      </header>

      <Waveform
        buffer={isLocal ? deck.waveform : null}
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
        disabled={!isLocal}
        onChange={(eq) => setEQ(deckId, eq)}
      />
      <FilterPanel
        filter={deck.filter}
        disabled={!isLocal}
        onChange={(filter) => setFilter(deckId, filter)}
      />

      {stealsAppleSlot && (
        <p className="slot-warning">
          Loading an Apple Music track here will stop deck {appleMusicSlot} -
          only one Apple Music stream can play at a time.
        </p>
      )}

      <TrackSource
        isAuthorized={isAuthorized}
        onLoadLocal={(file) => loadLocalFile(deckId, file)}
        onLoadAppleMusic={(track) => loadAppleMusicTrack(deckId, track)}
      />
    </section>
  );
}
