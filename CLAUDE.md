# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based two-deck music mixer ("mixing-table") for local audio
files. Deck A and Deck B each play a locally-loaded file through a 3-band
EQ and low/high-pass filter; a crossfader blends between them. A playlist
panel lets you preload files ahead of time and send them into either deck
with an instant cut or a real overlapping crossfade.

There is no streaming source (Apple Music/MusicKit was removed - see git
history if you need to resurrect it) - every deck is backed by a decoded
`AudioBuffer`, so effects and transitions can rely on plain Web Audio
without any DRM or single-stream constraints.

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build -> dist/
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint .
```

No test suite exists yet.

## Audio graph

Everything lives under one `AudioContext` (`src/audio/AudioEngine.ts`):
two deck bus `GainNode`s (A/B) feed a master gain to `context.destination`.
Each bus owns a `LocalDeck` (`src/audio/LocalDeck.ts`), which plays an
`AudioBuffer` through an `EffectsChain` (`src/audio/EffectsChain.ts`:
low-shelf -> peaking -> high-shelf -> lowpass/highpass -> output).

`LocalDeck` tracks playback as a "layer" - `{ source: AudioBufferSourceNode,
gain: GainNode }` - because `AudioBufferSourceNode`s are single-use and get
recreated on every `play()`/`seek()`; elapsed time is computed manually
from `context.currentTime` deltas (no native `currentTime` on buffer
sources). Normal playback runs one layer at a time.

**`LocalDeck.crossfadeTo(buffer, durationSec)`** is the one place two
layers run concurrently: the outgoing layer's gain ramps `1 -> 0` while a
freshly-started incoming layer ramps `0 -> 1`, both scheduled with native
`AudioParam.linearRampToValueAtTime` on the real audio clock (not a
JS-driven approximation) so they're sample-accurate and glitch-free. The
outgoing source calls its own `stop()` once its ramp finishes; the incoming
layer becomes `this.active` immediately, so `getCurrentTime()`/
`getDuration()` reflect the new track from the moment the crossfade starts,
not after it completes. Both layers share the deck's single `EffectsChain`,
so EQ/filter settings apply equally to whichever track(s) are audible -
there's one knob per deck, not per track.

`src/state/mixerStore.ts` (Zustand) owns the `AudioEngine` and exposes
deck-level actions (`play`, `pause`, `seek`, `setEQ`, `setCrossfade`, ...),
polling `LocalDeck.getCurrentTime()`/`getDuration()` every 250ms
(`startTicker`) to keep the store fresh for the UI.

## Playlist and deck transitions

`src/state/playlistStore.ts` holds a preloaded queue independent of either
deck: files are decoded into an `AudioBuffer` immediately on add
(`AudioEngine.decodeFile`) so sending one to a deck later is instant, with
the item showing a "Preloading…" badge until decode finishes (or "Failed
to decode" if the browser can't decode that format). Each item has a
`targetDeck` preset and a `Transition` (`{ type: 'cut' | 'fade',
durationSec }`, `src/audio/types.ts`). `PlaylistPanel` only touches
`usePlaylistStore`; it never reaches into the audio graph directly.

Triggering an item (`playlistStore.send` -> `mixerStore.sendToDeck`) either
does an instant `loadBuffer()` + `play()` (`'cut'`, or any transition when
the deck was empty) or calls `LocalDeck.crossfadeTo()` (`'fade'`) for a
real overlapping crossfade on that deck. This is deliberately simple -
`sendToDeck` doesn't do its own gain animation or scheduling; all of that
lives in `LocalDeck`.

## UI structure

`App.tsx` renders two `Deck` components (`deckId="A"|"B"`) + `Crossfader`
+ `PlaylistPanel`. `Deck` (`src/components/Deck.tsx`) reads/writes the
mixer store for its `deckId` and composes `Waveform`, `EQPanel`,
`FilterPanel`, and its own local-file `<input type="file">`. EQ/filter
controls are disabled only when the deck has no track loaded (`deck.source
=== "empty"`).

## Working in this repo

- Every deck is local-file-only (`DeckSource` is `'empty' | 'local'`) -
  don't reintroduce a streaming/DRM-constrained source without re-deriving
  the tradeoffs (a previous Apple Music integration was removed specifically
  because its DRM restrictions blocked real effects and true crossfades).
- If you add a new transition type or effect, prefer extending
  `LocalDeck`/`EffectsChain` directly over adding orchestration in
  `mixerStore` - the deck owns its own audio graph and scheduling.
