import { useState, type ChangeEvent } from "react";
import { searchCatalog, searchLibrary, type Track } from "../musickit/search";

interface TrackSourceProps {
  isAuthorized: boolean;
  onLoadLocal: (file: File) => void;
  onLoadAppleMusic: (track: Track) => void;
}

export function TrackSource({
  isAuthorized,
  onLoadLocal,
  onLoadAppleMusic,
}: TrackSourceProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [scope, setScope] = useState<"catalog" | "library">("catalog");
  const [searching, setSearching] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const tracks =
        scope === "library" ? await searchLibrary(term) : await searchCatalog(term);
      setResults(tracks);
    } finally {
      setSearching(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onLoadLocal(file);
    e.target.value = "";
  }

  return (
    <div className="track-source">
      <label className="file-input">
        Load local file
        <input type="file" accept="audio/*" onChange={handleFileChange} />
      </label>

      <form className="search-form" onSubmit={runSearch}>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "catalog" | "library")}
        >
          <option value="catalog">Apple Music catalog</option>
          <option value="library" disabled={!isAuthorized}>
            My library {isAuthorized ? "" : "(sign in required)"}
          </option>
        </select>
        <input
          type="text"
          placeholder="Search songs…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button type="submit" disabled={searching || !term.trim()}>
          {searching ? "…" : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((track) => (
            <li key={track.id}>
              <button type="button" onClick={() => onLoadAppleMusic(track)}>
                {track.artworkUrl && (
                  <img src={track.artworkUrl} alt="" width={32} height={32} />
                )}
                <span>
                  <strong>{track.title}</strong>
                  <br />
                  {track.artist}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
