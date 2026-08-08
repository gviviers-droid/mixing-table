// Minimal ambient types for MusicKit JS v3 (https://js-cdn.music.apple.com/musickit/v3/musickit.js).
// Apple does not publish official TS types; this covers only the surface this app uses.

declare namespace MusicKit {
  interface Configuration {
    developerToken: string;
    app: {
      name: string;
      build: string;
    };
  }

  type PlaybackStates =
    | "none"
    | "loading"
    | "playing"
    | "paused"
    | "stopped"
    | "ended"
    | "seeking"
    | "waiting"
    | "stalled"
    | "completed";

  interface Artwork {
    url: string;
    width: number;
    height: number;
  }

  interface MediaItem {
    id: string;
    type: string;
    attributes?: {
      name: string;
      artistName: string;
      albumName?: string;
      durationInMillis?: number;
      artwork?: Artwork;
    };
  }

  interface Queue {
    items: MediaItem[];
    position: number;
  }

  interface MusicKitInstance {
    readonly isAuthorized: boolean;
    readonly playbackState: PlaybackStates;
    readonly nowPlayingItem: MediaItem | null;
    readonly currentPlaybackTime: number;
    readonly currentPlaybackDuration: number;
    readonly queue: Queue;
    volume: number;

    authorize(): Promise<string>;
    unauthorize(): Promise<void>;

    setQueue(descriptor: {
      song?: string;
      songs?: string[];
      items?: MediaItem[];
    }): Promise<Queue>;

    play(): Promise<void>;
    pause(): void;
    stop(): void;
    seekToTime(time: number): Promise<void>;

    api: {
      music<T = unknown>(
        path: string,
        params?: Record<string, string | number | boolean>,
      ): Promise<{ data: T }>;
    };

    addEventListener(
      name:
        | "authorizationStatusDidChange"
        | "playbackStateDidChange"
        | "nowPlayingItemDidChange"
        | "playbackTimeDidChange",
      callback: (event: unknown) => void,
    ): void;
    removeEventListener(
      name:
        | "authorizationStatusDidChange"
        | "playbackStateDidChange"
        | "nowPlayingItemDidChange"
        | "playbackTimeDidChange",
      callback: (event: unknown) => void,
    ): void;
  }

  function configure(config: Configuration): Promise<MusicKitInstance>;
  function getInstance(): MusicKitInstance;
}

interface Window {
  MusicKit: typeof MusicKit;
}
