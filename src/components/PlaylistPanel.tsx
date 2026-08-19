import type { ChangeEvent } from "react";
import type { DeckId, TransitionType } from "../audio/types";
import { usePlaylistStore } from "../state/playlistStore";

export function PlaylistPanel() {
  const items = usePlaylistStore((s) => s.items);
  const addLocalFile = usePlaylistStore((s) => s.addLocalFile);
  const removeItem = usePlaylistStore((s) => s.removeItem);
  const setTargetDeck = usePlaylistStore((s) => s.setTargetDeck);
  const setTransition = usePlaylistStore((s) => s.setTransition);
  const moveItem = usePlaylistStore((s) => s.moveItem);
  const send = usePlaylistStore((s) => s.send);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void addLocalFile(file);
    e.target.value = "";
  }

  return (
    <section className="playlist-panel">
      <h2>Playlist</h2>

      <div className="playlist-add">
        <label className="file-input">
          Add local file
          <input type="file" accept="audio/*" onChange={handleFileChange} />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="empty-hint">
          Add local audio files above to build a playlist you can preload and
          send into either deck.
        </p>
      ) : (
        <ul className="playlist-items">
          {items.map((item, index) => (
            <li key={item.id} className="playlist-item">
              <div className="playlist-item-info">
                <span>
                  <strong>{item.title}</strong>
                  <br />
                  {item.artist}
                  {item.status === "decoding" && (
                    <span className="badge">Preloading…</span>
                  )}
                  {item.status === "error" && (
                    <span className="badge badge-error">Failed to decode</span>
                  )}
                </span>
              </div>

              <div className="playlist-item-controls">
                <div className="deck-toggle">
                  {(["A", "B"] as DeckId[]).map((deck) => (
                    <button
                      key={deck}
                      type="button"
                      className={item.targetDeck === deck ? "active" : ""}
                      onClick={() => setTargetDeck(item.id, deck)}
                    >
                      {deck}
                    </button>
                  ))}
                </div>

                <select
                  value={item.transition.type}
                  onChange={(e) =>
                    setTransition(item.id, {
                      ...item.transition,
                      type: e.target.value as TransitionType,
                    })
                  }
                >
                  <option value="cut">Cut</option>
                  <option value="fade">Fade</option>
                </select>

                {item.transition.type === "fade" && (
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={item.transition.durationSec}
                    onChange={(e) =>
                      setTransition(item.id, {
                        ...item.transition,
                        durationSec: Number(e.target.value),
                      })
                    }
                    title={`${item.transition.durationSec}s fade`}
                  />
                )}

                <button
                  type="button"
                  disabled={item.status !== "ready"}
                  onClick={() => void send(item.id)}
                >
                  Send to {item.targetDeck}
                </button>
                <button type="button" onClick={() => moveItem(item.id, "up")} disabled={index === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(item.id, "down")}
                  disabled={index === items.length - 1}
                >
                  ↓
                </button>
                <button type="button" onClick={() => removeItem(item.id)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
