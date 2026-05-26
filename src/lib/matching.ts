import { searchTracks, SpotifyTrack } from "@/api/spotify";
import {
  ParsedSong,
  SetlistContext,
  buildSpotifySearchQuery,
  calculateMatchConfidence,
  getSongArtistHints,
  normalizeForSearch,
} from "@/utils/parse";
import { MatchedSong } from "@/store/setlistStore";

const SEARCH_LIMIT = 8;

function dedupeTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

function rankTracks(
  song: ParsedSong,
  tracks: SpotifyTrack[],
  context?: SetlistContext
) {
  return tracks
    .map((track) => ({
      track,
      confidence: calculateMatchConfidence(song, track, context),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

function artistsToSearch(song: ParsedSong, context?: SetlistContext): string[] {
  const hints = getSongArtistHints(song.title);
  const fromContext = context?.artists ?? [];
  const fromSong = song.artist ? [song.artist] : [];

  const ordered = [...hints, ...fromSong, ...fromContext];
  const seen = new Set<string>();
  return ordered.filter((a) => {
    const key = normalizeForSearch(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function matchParsedSong(
  accessToken: string,
  song: ParsedSong,
  context?: SetlistContext
): Promise<MatchedSong> {
  const artists = artistsToSearch(song, context);
  let allTracks: SpotifyTrack[] = [];

  for (const artist of artists.slice(0, 4)) {
    const q = buildSpotifySearchQuery(song, artist);
    const tracks = await searchTracks(accessToken, q, SEARCH_LIMIT);
    allTracks = dedupeTracks([...allTracks, ...tracks]);
  }

  if (allTracks.length < 3) {
    const generic = await searchTracks(
      accessToken,
      `"${song.title}"`,
      SEARCH_LIMIT
    );
    allTracks = dedupeTracks([...allTracks, ...generic]);
  }

  if (allTracks.length === 0 && song.artist) {
    const fallback = await searchTracks(
      accessToken,
      `${song.title} ${song.artist}`,
      SEARCH_LIMIT
    );
    allTracks = dedupeTracks(fallback);
  }

  if (allTracks.length === 0) {
    return {
      ...song,
      spotifyMatch: undefined,
      alternatives: [],
      confidence: 0,
      isConfirmed: false,
      excluded: false,
    };
  }

  const ranked = rankTracks(song, allTracks, context);
  const best = ranked[0];
  const alternatives = ranked.slice(1, 6).map((r) => r.track);

  return {
    ...song,
    spotifyMatch: best.track,
    alternatives,
    confidence: best.confidence,
    isConfirmed: true,
    excluded: false,
  };
}

export function applyTrackSelection(
  matched: MatchedSong,
  trackId: string,
  context?: SetlistContext
): MatchedSong {
  const candidates = [
    matched.spotifyMatch,
    ...(matched.alternatives ?? []),
  ].filter((t): t is SpotifyTrack => !!t);

  const selected = candidates.find((t) => t.id === trackId);
  if (!selected) return matched;

  const others = candidates.filter((t) => t.id !== trackId);

  return {
    ...matched,
    spotifyMatch: selected,
    alternatives: others,
    confidence: calculateMatchConfidence(matched, selected, context),
    isConfirmed: true,
  };
}

export function confidenceLabel(confidence: number | undefined): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (confidence === undefined || confidence === 0) {
    return { label: "Sin match", variant: "destructive" };
  }
  if (confidence >= 0.8) {
    return { label: `${Math.round(confidence * 100)}% — Alta`, variant: "default" };
  }
  if (confidence >= 0.5) {
    return { label: `${Math.round(confidence * 100)}% — Media`, variant: "secondary" };
  }
  return { label: `${Math.round(confidence * 100)}% — Baja`, variant: "outline" };
}
