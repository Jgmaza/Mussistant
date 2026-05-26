// Spotify Web API client
export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  uri: string;
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
}

async function parseSpotifyError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = await response.json();
    const message =
      body?.error?.message ?? body?.error_description ?? body?.message;
    if (message) {
      return `${fallback}: ${message}`;
    }
  } catch {
    // ignore JSON parse errors
  }
  return `${fallback} (${response.status})`;
}

// Get current user profile
export async function getCurrentUserProfile(accessToken: string): Promise<SpotifyUser> {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseSpotifyError(response, "No se pudo obtener tu perfil de Spotify"));
  }

  return response.json();
}

// Search for tracks
export async function searchTracks(
  accessToken: string,
  query: string,
  limit: number = 5
): Promise<SpotifyTrack[]> {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseSpotifyError(response, "La búsqueda en Spotify falló"));
  }

  const result: SpotifySearchResult = await response.json();
  return result.tracks.items;
}

// Create a new playlist for the current user
export async function createPlaylist(
  accessToken: string,
  name: string,
  description?: string
): Promise<SpotifyPlaylist> {
  const response = await fetch("https://api.spotify.com/v1/me/playlists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      public: true,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseSpotifyError(response, "No se pudo crear la playlist"));
  }

  return response.json();
}

// Add tracks to playlist (Spotify Web API: Add Items to Playlist)
export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const chunks = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    chunks.push(trackUris.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: chunk }),
      }
    );

    if (!response.ok) {
      throw new Error(
        await parseSpotifyError(response, "No se pudieron añadir canciones a la playlist")
      );
    }
  }
}
