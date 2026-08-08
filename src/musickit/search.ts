import { getMusicKitInstance } from "./loadMusicKit";

export interface Track {
  id: string;
  kind: "apple-music";
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  artworkUrl?: string;
}

function toTrack(item: MusicKit.MediaItem): Track {
  const artwork = item.attributes?.artwork;
  return {
    id: item.id,
    kind: "apple-music",
    title: item.attributes?.name ?? "Unknown title",
    artist: item.attributes?.artistName ?? "Unknown artist",
    album: item.attributes?.albumName,
    durationMs: item.attributes?.durationInMillis,
    artworkUrl: artwork
      ? artwork.url.replace("{w}", "300").replace("{h}", "300")
      : undefined,
  };
}

let storefrontId: Promise<string> | null = null;

async function getStorefrontId(): Promise<string> {
  if (!storefrontId) {
    storefrontId = getMusicKitInstance()
      .then((instance) =>
        instance.api.music<{ id: string }[]>("/v1/me/storefront"),
      )
      .then((res) => res.data[0]?.id ?? "us");
  }
  return storefrontId;
}

/** Searches the full Apple Music catalog (requires only a developer token). */
export async function searchCatalog(term: string): Promise<Track[]> {
  if (!term.trim()) return [];
  const instance = await getMusicKitInstance();
  const storefront = await getStorefrontId();
  const res = await instance.api.music<{
    results: { songs?: { data: MusicKit.MediaItem[] } };
  }>(`/v1/catalog/${storefront}/search`, {
    term,
    types: "songs",
    limit: 25,
  });
  return (res.data.results.songs?.data ?? []).map(toTrack);
}

/** Searches the signed-in user's personal library (requires user authorization). */
export async function searchLibrary(term: string): Promise<Track[]> {
  if (!term.trim()) return [];
  const instance = await getMusicKitInstance();
  if (!instance.isAuthorized) return [];
  const res = await instance.api.music<{
    results: { "library-songs"?: { data: MusicKit.MediaItem[] } };
  }>("/v1/me/library/search", {
    term,
    types: "library-songs",
    limit: 25,
  });
  return (res.data.results["library-songs"]?.data ?? []).map(toTrack);
}
