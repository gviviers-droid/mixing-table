import { AuthBar } from "./components/AuthBar";
import { Crossfader } from "./components/Crossfader";
import { Deck } from "./components/Deck";
import { useMusicKit } from "./musickit/useMusicKit";

export default function App() {
  const { isAuthorized } = useMusicKit();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mixing Table</h1>
        <AuthBar />
      </header>

      <main className="mixer">
        <Deck deckId="A" isAuthorized={isAuthorized} />
        <Crossfader />
        <Deck deckId="B" isAuthorized={isAuthorized} />
      </main>
    </div>
  );
}
