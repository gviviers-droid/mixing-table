import { Crossfader } from "./components/Crossfader";
import { Deck } from "./components/Deck";
import { PlaylistPanel } from "./components/PlaylistPanel";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Mixing Table</h1>
      </header>

      <main className="mixer">
        <Deck deckId="A" />
        <Crossfader />
        <Deck deckId="B" />
      </main>

      <PlaylistPanel />
    </div>
  );
}
