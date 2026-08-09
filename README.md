# mixing-table

A music mixing station to create your own vibe — a two-deck browser mixer
for local audio files, with a crossfader, per-deck 3-band EQ, low/high-pass
filter, and compressor/limiter, plus a preloaded playlist you can send into
either deck with an instant cut or a real overlapping crossfade.

## Supported formats

Anything the browser's Web Audio API can decode: MP3, WAV/AIFF, AAC/M4A,
and (in Chrome/Firefox) FLAC and OGG. There's no format allowlist in the
app itself - if `AudioContext.decodeAudioData` can't decode a file, the
playlist item shows a "Failed to decode" badge instead of loading.

## Setup

```bash
npm install
npm run dev
```

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
