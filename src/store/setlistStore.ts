import { create } from "zustand";
import { ParsedSong, SetlistContext } from "@/utils/parse";
import { SpotifyTrack } from "@/api/spotify";

export interface MatchedSong extends ParsedSong {
  spotifyMatch?: SpotifyTrack;
  alternatives?: SpotifyTrack[];
  confidence?: number;
  isConfirmed?: boolean;
  excluded?: boolean;
}

const STORAGE_KEY = "mussistant_setlist_v1";

interface PersistedSetlist {
  parsedSongs: ParsedSong[];
  matchedSongs: MatchedSong[];
  setlistContext: SetlistContext;
  playlistName: string;
}

function loadPersisted(): Partial<PersistedSetlist> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSetlist;
  } catch {
    return null;
  }
}

function persistState(state: PersistedSetlist) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar el setlist en sessionStorage", e);
  }
}

const emptyContext: SetlistContext = { artists: [] };
const saved = loadPersisted();

interface SetlistStore extends PersistedSetlist {
  setParsedSongs: (songs: ParsedSong[], context?: SetlistContext) => void;
  setSetlistContext: (context: SetlistContext) => void;
  setPlaylistName: (name: string) => void;
  setMatchedSongs: (songs: MatchedSong[]) => void;
  updateMatchedSong: (index: number, song: MatchedSong) => void;
  removeSongAtIndex: (index: number) => void;
  excludeSongAtIndex: (index: number) => void;
  reset: () => void;
}

function snapshot(state: SetlistStore): PersistedSetlist {
  return {
    parsedSongs: state.parsedSongs,
    matchedSongs: state.matchedSongs,
    setlistContext: state.setlistContext,
    playlistName: state.playlistName,
  };
}

export const useSetlistStore = create<SetlistStore>((set, get) => ({
  parsedSongs: saved?.parsedSongs ?? [],
  matchedSongs: saved?.matchedSongs ?? [],
  setlistContext: saved?.setlistContext ?? emptyContext,
  playlistName: saved?.playlistName ?? "",

  setParsedSongs: (songs, context) => {
    const ctx = context ?? get().setlistContext;
    const playlistName =
      ctx.suggestedPlaylistName ?? get().playlistName ?? "";
    set({
      parsedSongs: songs,
      matchedSongs: [],
      setlistContext: ctx,
      playlistName,
    });
    persistState(snapshot(get()));
  },

  setSetlistContext: (context) => {
    set({ setlistContext: context });
    persistState(snapshot(get()));
  },

  setPlaylistName: (name) => {
    set({ playlistName: name });
    persistState(snapshot(get()));
  },

  setMatchedSongs: (songs) => {
    set({ matchedSongs: songs });
    persistState(snapshot(get()));
  },

  updateMatchedSong: (index, song) => {
    set((state) => {
      const matchedSongs = state.matchedSongs.map((s, i) =>
        i === index ? song : s
      );
      return { matchedSongs };
    });
    persistState(snapshot(get()));
  },

  removeSongAtIndex: (index) => {
    set((state) => ({
      parsedSongs: state.parsedSongs.filter((_, i) => i !== index),
      matchedSongs: state.matchedSongs.filter((_, i) => i !== index),
    }));
    persistState(snapshot(get()));
  },

  excludeSongAtIndex: (index) => {
    set((state) => ({
      matchedSongs: state.matchedSongs.map((s, i) =>
        i === index ? { ...s, excluded: true, spotifyMatch: undefined } : s
      ),
    }));
    persistState(snapshot(get()));
  },

  reset: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    set({
      parsedSongs: [],
      matchedSongs: [],
      setlistContext: emptyContext,
      playlistName: "",
    });
  },
}));

export function hasPersistedSetlist(): boolean {
  return (loadPersisted()?.parsedSongs?.length ?? 0) > 0;
}

export function persistSetlistNow(): void {
  const state = useSetlistStore.getState();
  persistState(snapshot(state));
}
