// Simple state store for setlist data
import { create } from "zustand";
import { ParsedSong } from "@/utils/parse";
import { SpotifyTrack } from "@/api/spotify";

export interface MatchedSong extends ParsedSong {
  spotifyMatch?: SpotifyTrack;
  confidence?: number;
  isConfirmed?: boolean;
}

interface SetlistStore {
  parsedSongs: ParsedSong[];
  matchedSongs: MatchedSong[];
  setParsedSongs: (songs: ParsedSong[]) => void;
  setMatchedSongs: (songs: MatchedSong[]) => void;
  updateMatchedSong: (index: number, song: MatchedSong) => void;
  reset: () => void;
}

export const useSetlistStore = create<SetlistStore>((set) => ({
  parsedSongs: [],
  matchedSongs: [],
  setParsedSongs: (songs) => set({ parsedSongs: songs }),
  setMatchedSongs: (songs) => set({ matchedSongs: songs }),
  updateMatchedSong: (index, song) =>
    set((state) => ({
      matchedSongs: state.matchedSongs.map((s, i) => (i === index ? song : s)),
    })),
  reset: () => set({ parsedSongs: [], matchedSongs: [] }),
}));