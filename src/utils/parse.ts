// Parsing utilities for setlist entries
export interface ParsedSong {
  original: string;
  title: string;
  artist?: string;
}

export interface SetlistContext {
  headerLine?: string;
  artists: string[];
  suggestedPlaylistName?: string;
}

export interface ParseSetlistResult {
  context: SetlistContext;
  songs: ParsedSong[];
  skippedLines: string[];
}

const SEPARATORS = [" – ", " - ", " | ", " / ", " by ", " por "];

/** Números de lista: "1.", "10.", "02 -", unicode spaces */
const LEADING_LIST_MARKER =
  /^[\s\u2000-\u200B\uFEFF]*(?:\d{1,3}[\.\)\:\-\u2013\u2014]\s*|\d{1,3}\s+[\.\)]\s*)/;

/** Tonos al final: "Ch Eb", "Ch C#m", "Kkc/Ch", "C", "Bb" */
const TRAILING_CHORD_PATTERNS = [
  /\s+(?:Kkc\/Ch|Kkc)\s*$/i,
  /\s+Ch\s+[A-G](?:#|b)?m?\s*$/i,
  /\s+Ch\s*$/i,
  /\s+[A-G](?:#|b)?m?\s*$/i,
  /\s+[A-G](?:#|b)?\s*$/i,
];

const HEADER_CONNECTOR = /\s+(?:y|and|&|con|vs\.?|feat\.?|ft\.?)\s+/i;

const SETLIST_META =
  /^(set\s*list|setlist|repertorio|playlist|artistas?|canciones|show)\s*[:\-]?/i;

/** Canciones conocidas → artista preferido (refuerzo del contexto) */
const SONG_ARTIST_HINTS: Record<string, string[]> = {
  "vivir sin aire": ["Maná"],
  "mariposa traicionera": ["Maná"],
  "oye mi amor": ["Maná"],
  "corazon espinado": ["Maná", "Santana"],
  "rayando el sol": ["Maná"],
  "en el muelle de san blas": ["Maná"],
  "como abeja al panal": ["Maná"],
  "claro que no": ["Maná"],
  "bachata rosa": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "burbujas de amor": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "la bilirrubina": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "niagara en bicicleta": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "la hormiguita": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "bendita tu luz": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "mi bendicion": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "estrellitas y duendes": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "de pies a cabeza": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "amapola": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "frio frio": ["Juan Luis Guerra", "Juan Luis Guerra 4.40"],
  "si no te hubieras ido": ["Maná"],
};

export function cleanSetlistLine(raw: string): string {
  let line = raw.replace(/[\u2000-\u200B\uFEFF]/g, " ").trim();
  line = line.replace(LEADING_LIST_MARKER, "");
  return line.replace(/\s+/g, " ").trim();
}

export function stripChordAnnotations(text: string): string {
  let t = text.trim();
  for (const pattern of TRAILING_CHORD_PATTERNS) {
    t = t.replace(pattern, "");
  }
  return t.replace(/\s+/g, " ").trim();
}

export function isHeaderLine(line: string, rawLine?: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return false;

  const raw = (rawLine ?? line).trim();
  if (LEADING_LIST_MARKER.test(raw)) return false;
  if (SETLIST_META.test(trimmed)) return true;

  if (HEADER_CONNECTOR.test(trimmed)) {
    const parts = splitArtistsFromHeader(trimmed);
    if (parts.length >= 2 && parts.every((p) => p.length >= 2)) return true;
  }

  return false;
}

export function splitArtistsFromHeader(header: string): string[] {
  return header
    .split(HEADER_CONNECTOR)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
}

export function parseSetlistFromText(text: string): ParseSetlistResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const context: SetlistContext = { artists: [] };
  const songs: ParsedSong[] = [];
  const skippedLines: string[] = [];
  let foundSong = false;

  for (const raw of lines) {
    const cleaned = cleanSetlistLine(raw);
    if (!cleaned) continue;

    if (!foundSong && isHeaderLine(cleaned, raw)) {
      context.headerLine = cleaned;
      context.artists = splitArtistsFromHeader(cleaned);
      context.suggestedPlaylistName = cleaned;
      skippedLines.push(cleaned);
      continue;
    }

    if (!LEADING_LIST_MARKER.test(raw) && isHeaderLine(cleaned, raw)) {
      skippedLines.push(cleaned);
      continue;
    }

    foundSong = true;
    const parsed = parseSongLine(cleaned);
    parsed.title = stripChordAnnotations(parsed.title);
    if (parsed.artist) {
      parsed.artist = stripChordAnnotations(parsed.artist);
    }
    if (parsed.title.length > 0) {
      songs.push(parsed);
    }
  }

  return { context, songs, skippedLines };
}

export function parseSongLine(line: string): ParsedSong {
  const trimmed = cleanSetlistLine(line);

  for (const separator of SEPARATORS) {
    const index = trimmed.indexOf(separator);
    if (index > 0) {
      const before = trimmed.substring(0, index).trim();
      const after = trimmed.substring(index + separator.length).trim();

      if (before.length < after.length && isLikelyArtistName(before)) {
        return {
          original: trimmed,
          title: stripChordAnnotations(after),
          artist: before,
        };
      }
      return {
        original: trimmed,
        title: stripChordAnnotations(before),
        artist: after,
      };
    }
  }

  return {
    original: trimmed,
    title: stripChordAnnotations(trimmed),
  };
}

function isLikelyArtistName(text: string): boolean {
  if (text.length > 50) return false;
  const words = text.split(/\s+/);
  if (words.length > 6) return false;
  const songPatterns = /^(the|a|an|in|on|at|to|for|with|without|like|as)\s+/i;
  if (songPatterns.test(text)) return false;
  return true;
}

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSongArtistHints(title: string): string[] {
  const key = normalizeForSearch(title);
  return SONG_ARTIST_HINTS[key] ?? [];
}

export function buildSpotifySearchQuery(
  song: ParsedSong,
  artist?: string
): string {
  const a = artist ?? song.artist;
  if (a) {
    return `track:"${song.title}" artist:"${a}"`;
  }
  return `track:"${song.title}"`;
}

export function calculateMatchConfidence(
  original: ParsedSong,
  spotifyTrack: { name: string; artists: Array<{ name: string }> },
  context?: SetlistContext
): number {
  const originalTitle = normalizeForSearch(original.title);
  const matchTitle = normalizeForSearch(spotifyTrack.name);
  const titleScore = calculateStringSimilarity(originalTitle, matchTitle);

  const contextArtists = [
    ...(context?.artists ?? []),
    ...(original.artist ? [original.artist] : []),
    ...getSongArtistHints(original.title),
  ];

  let artistScore = 0.5;
  if (contextArtists.length > 0) {
    const bestContextMatch = Math.max(
      ...spotifyTrack.artists.map((spotifyArtist) =>
        Math.max(
          ...contextArtists.map((ctx) =>
            calculateStringSimilarity(
              normalizeForSearch(ctx),
              normalizeForSearch(spotifyArtist.name)
            )
          )
        )
      )
    );
    artistScore = bestContextMatch;
  } else if (original.artist) {
    const originalArtist = normalizeForSearch(original.artist);
    artistScore = Math.max(
      ...spotifyTrack.artists.map((artist) =>
        calculateStringSimilarity(originalArtist, normalizeForSearch(artist.name))
      )
    );
  }

  let score = titleScore * 0.55 + artistScore * 0.45;

  const hints = getSongArtistHints(original.title);
  if (hints.length > 0) {
    const hintMatch = Math.max(
      ...spotifyTrack.artists.map((a) =>
        Math.max(
          ...hints.map((h) =>
            calculateStringSimilarity(
              normalizeForSearch(h),
              normalizeForSearch(a.name)
            )
          )
        )
      )
    );
    if (hintMatch > 0.72) score = Math.min(1, score + 0.18);
    else if (hintMatch < 0.35) score *= 0.55;
  } else if (context?.artists.length && artistScore < 0.35) {
    score *= 0.6;
  }

  return Math.min(score, 1);
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
}

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
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export function parseSetlistLines(lines: string[]): ParsedSong[] {
  return lines.map((line) => parseSongLine(cleanSetlistLine(line)));
}
