// Parsing utilities for setlist entries
export interface ParsedSong {
  original: string;
  title: string;
  artist?: string;
}

// Common separators between artist and song
const SEPARATORS = [" – ", " - ", " | ", " / ", " by "];

// Parse a setlist line into title and artist
export function parseSongLine(line: string): ParsedSong {
  const trimmed = line.trim();
  
  // Try each separator
  for (const separator of SEPARATORS) {
    const index = trimmed.indexOf(separator);
    if (index > 0) {
      const before = trimmed.substring(0, index).trim();
      const after = trimmed.substring(index + separator.length).trim();
      
      // Determine if it's "Song - Artist" or "Artist - Song"
      // Heuristic: if the first part looks like an artist name (shorter, capitalized words)
      // and the second part is longer, assume "Artist - Song"
      if (before.length < after.length && isLikelyArtistName(before)) {
        return {
          original: trimmed,
          title: after,
          artist: before,
        };
      } else {
        return {
          original: trimmed,
          title: before,
          artist: after,
        };
      }
    }
  }
  
  // No separator found, treat as song title only
  return {
    original: trimmed,
    title: trimmed,
  };
}

// Simple heuristic to detect if a string looks like an artist name
function isLikelyArtistName(text: string): boolean {
  // Artist names are typically:
  // - Shorter (< 50 characters)
  // - Properly capitalized
  // - Don't contain lowercase articles at the start
  if (text.length > 50) return false;
  
  const words = text.split(/\s+/);
  if (words.length > 5) return false; // Too many words for an artist name
  
  // Check if it starts with common song word patterns
  const songPatterns = /^(the|a|an|in|on|at|to|for|with|without|like|as)\s+/i;
  if (songPatterns.test(text)) return false;
  
  return true;
}

// Normalize text for searching
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Build Spotify search query
export function buildSpotifySearchQuery(song: ParsedSong): string {
  if (song.artist) {
    // Use Spotify's field search for better matching
    return `track:"${song.title}" artist:"${song.artist}"`;
  } else {
    return `track:"${song.title}"`;
  }
}

// Calculate confidence score for a match
export function calculateMatchConfidence(
  original: ParsedSong,
  spotifyTrack: { name: string; artists: Array<{ name: string }> }
): number {
  const originalTitle = normalizeForSearch(original.title);
  const matchTitle = normalizeForSearch(spotifyTrack.name);
  
  // Title similarity (most important)
  const titleScore = calculateStringSimilarity(originalTitle, matchTitle);
  
  // Artist similarity (if available)
  let artistScore = 1.0;
  if (original.artist) {
    const originalArtist = normalizeForSearch(original.artist);
    const bestArtistMatch = Math.max(
      ...spotifyTrack.artists.map((artist) =>
        calculateStringSimilarity(originalArtist, normalizeForSearch(artist.name))
      )
    );
    artistScore = bestArtistMatch;
  }
  
  // Weighted combination
  return titleScore * 0.7 + artistScore * 0.3;
}

// Simple string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(str1, str2);
  return 1.0 - distance / maxLength;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Parse multiple setlist lines
export function parseSetlistLines(lines: string[]): ParsedSong[] {
  return lines.map(parseSongLine);
}