# mixing-table

A music mixing station to create your own vibe — a two-deck browser mixer
that plays tracks from your Apple Music library or local audio files, with
a crossfader and per-deck EQ/filter effects.

## Important: what you can and can't do with Apple Music audio

Apple Music streams are DRM-protected, and MusicKit (the only supported way
to play Apple Music in a browser) does not expose the raw audio signal.
That means:

- **Apple Music decks** support play/pause/seek/volume and crossfading, but
  **no EQ or filter effects** - the audio never passes through our Web
  Audio graph.
- **Local file decks** get the full effects chain (3-band EQ, low/high-pass
  filter) because the file is decoded directly into an `AudioBuffer`.
- MusicKit JS is a **page-wide singleton** - only one Apple Music track can
  stream at a time. The two decks share a single "Apple Music slot"; loading
  an Apple Music track into one deck stops it in the other. Local-file decks
  have no such limit and can play simultaneously with anything.

## Requirements

- Node.js 20+
- An [Apple Developer Program](https://developer.apple.com/programs/) membership
  (paid) to generate a MusicKit developer token - required for **any** Apple
  Music integration, catalog search included. Local-file mixing works
  without it.

## Setup

```bash
npm install
```

### Apple Music (optional, but needed for Apple Music playback/search)

1. In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/authkeys/list),
   create a MusicKit private key and download the `AuthKey_<KEY_ID>.p8` file.
2. Note your Team ID (top right of the developer account page) and the Key ID
   from the file name.
3. Generate a developer token:

   ```bash
   APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=YYYYYYYYYY \
     APPLE_PRIVATE_KEY_PATH=./AuthKey_YYYYYYYYYY.p8 \
     npm run musickit:token
   ```

4. Copy `.env.example` to `.env.local` and paste the printed token into
   `VITE_MUSICKIT_DEVELOPER_TOKEN`. Tokens are valid for 180 days; re-run the
   command and update `.env.local` when it expires.

Without a token, the app still runs and local-file mixing works; the header
will show an "Apple Music unavailable" notice instead of the sign-in button.

## Development

```bash
npm run dev        # start the dev server
npm run typecheck  # tsc, no emit
npm run lint       # eslint
npm run build      # production build to dist/
```

There is no test suite yet.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for a structural overview aimed at AI coding
assistants (also useful for humans navigating the codebase).
