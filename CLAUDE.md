# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based two-deck music mixer ("mixing-table"). Deck A and Deck B can
each be loaded with either a local audio file or an Apple Music track;
a crossfader blends between them, and local-file decks get a 3-band EQ and
low/high-pass filter.

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build -> dist/
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint .
npm run musickit:token  # generate an Apple MusicKit developer JWT (see README)
```

No test suite exists yet.

## The one constraint that shapes everything: Apple Music DRM

MusicKit (web or native) never exposes raw Apple Music audio - you get
playback *control* (play/pause/seek/volume) but the signal can't be routed
through Web Audio nodes. Consequences baked into the architecture:

- **EQ and filters only apply to local files.** `EffectsChain` /
  `LocalDeck` (`src/audio/`) are Web Audio constructs; Apple Music decks
  never touch them.
- **MusicKit JS is a page-wide singleton** - one Apple Music stream can play
  at a time, full stop. The two decks share a single "Apple Music slot"
  (`appleMusicSlot` in the mixer store); loading Apple Music into one deck
  stops it in the other. This has no effect on local-file decks, which are
  fully independent.
- Crossfading a local deck against the Apple Music deck works fine even
  though they're different pipelines - see below.

Do not "fix" the singleton behavior or try to wire Apple Music audio into
the Web Audio graph; both are platform limitations, not bugs.

## Dual audio pipeline

Two independent volume-controlled pipelines exist simultaneously, unified
only at the crossfader-math level:

1. **Web Audio graph** (`src/audio/AudioEngine.ts`): one `AudioContext`,
   two deck bus `GainNode`s (A/B) feeding a master gain to
   `context.destination`. Each bus owns a `LocalDeck`
   (`src/audio/LocalDeck.ts`), which decodes a `File` into an `AudioBuffer`
   and plays it through an `EffectsChain` (`src/audio/EffectsChain.ts`:
   low-shelf -> peaking -> high-shelf -> lowpass/highpass -> output).
   `AudioBufferSourceNode`s are single-use, so `LocalDeck` recreates one on
   every `play()`/`seek()` and tracks elapsed time manually via
   `context.currentTime` deltas (there's no native `currentTime` for buffer
   sources).
2. **MusicKit's own player** (not part of the `AudioContext` at all):
   volume is set directly via `instance.volume`, scaled by the same
   crossfade curve (`AudioEngine.getEffectiveGain(deck)` - an equal-power
   `cos`/`sin` curve over crossfader position 0..1).

`src/state/mixerStore.ts` (Zustand) is the seam between the two: it owns
`AudioEngine` plus the MusicKit instance, translates deck-level actions
(`play`, `pause`, `seek`, `setCrossfade`, ...) into the right pipeline call
per deck's `source` (`'local' | 'apple-music' | 'empty'`), and polls both
pipelines every 250ms (`startTicker`) to keep `currentTime`/`duration`/
`playbackState` in the store fresh for the UI. When reasoning about a deck,
always check `deck.source` first - it determines which pipeline every
action routes through.

## MusicKit integration

- `src/musickit/loadMusicKit.ts` waits for the `musickitloaded` event fired
  by the CDN script tag in `index.html`, then configures the singleton once
  (memoized) using `VITE_MUSICKIT_DEVELOPER_TOKEN`.
- `src/musickit/search.ts` wraps catalog (`/v1/catalog/{storefront}/search`)
  and library (`/v1/me/library/search`) search, normalizing results to the
  app's `Track` type. Library search requires user authorization
  (`instance.isAuthorized`); catalog search only needs the developer token.
- `src/musickit/useMusicKit.ts` is the React hook for auth status
  (idle/loading/ready/error) and sign-in/out.
- `src/types/musickit.d.ts` is a hand-written, partial ambient type
  declaration for the `MusicKit` global - Apple doesn't publish official
  TS types. Extend it if you need more of the API surface; don't assume
  everything on Apple's real API is typed here.

## UI structure

`App.tsx` renders `AuthBar` + two `Deck` components (`deckId="A"|"B"`) +
`Crossfader` + `PlaylistPanel`. `Deck` (`src/components/Deck.tsx`)
reads/writes the mixer store for its `deckId` and composes `Waveform`,
`EQPanel`, `FilterPanel`, and `TrackSource` (file picker + Apple Music
search box, loads directly into that deck). EQ/filter controls are
disabled (not hidden) when a deck's source isn't `'local'`, so the DRM
constraint stays visible rather than silently absent.

## Playlist and deck transitions

`src/state/playlistStore.ts` holds a preloaded queue independent of either
deck: local files are decoded into an `AudioBuffer` immediately on add
(`AudioEngine.decodeFile`) so sending one to a deck later is instant;
Apple Music items just carry the `Track` metadata since there's nothing to
predecode for a stream. Each item has a `targetDeck` preset and a
`Transition` (`{ type: 'cut' | 'fade', durationSec }`, `src/audio/types.ts`).
`PlaylistPanel` is where items are added/reordered/sent; it never touches
the audio graph directly, only `usePlaylistStore`.

Triggering an item (`playlistStore.send` -> `mixerStore.sendToDeck`) is the
one place that swaps a deck's content programmatically rather than through
direct user load/play. For `'cut'` it's an immediate replace. For `'fade'`
it ramps the deck's own output down, swaps content, then ramps back up -
implemented via `AudioEngine.transitionMultiplier` (a per-deck 0..1
multiplier layered into the existing crossfade-gain math in
`applyCrossfade()`/`getEffectiveGain()`) and `rampDeckAudibility()`
(`src/audio/transitions.ts`, a `requestAnimationFrame` loop). This is a
**sequential** fade (dip to silence, swap, rise back up), not a true
overlapping dual-audio crossfade: local-to-local *could* overlap two real
Web Audio sources, but Apple Music can't overlap itself (singleton, see
above), and using one consistent mechanism for every source combination
keeps the code and the UX predictable. If you ever add true overlapping
local-to-local crossfades, it has to be a separate code path - don't try to
force it through `transitionMultiplier`, which assumes one active source
per deck.

Note `sendToDeck` reuses `loadAppleMusicTrack`/`stopDeckContent` for the
Apple Music case, so the existing "stealing the shared slot stops the
*other* deck instantly" behavior applies there too - only the deck actually
receiving the playlist item gets fade treatment for its own transition.

## Working in this repo

- Keep the Apple Music vs. local-file distinction explicit in new code -
  don't build features that assume both decks can hold simultaneous Apple
  Music streams, or that Apple Music audio can be processed like local
  audio.
- `.p8` private keys and `.env.local` are gitignored; never commit them.
