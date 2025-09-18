// Environment configuration for Setlist to Playlist
export const config = {
  spotify: {
    clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || "your_spotify_client_id",
    redirectUri: import.meta.env.VITE_REDIRECT_URI || "http://localhost:8080/callback",
    scopes: ["playlist-modify-public", "playlist-modify-private", "user-read-email"],
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || "Setlist to Playlist",
  },
} as const;

// Validate required environment variables
if (!config.spotify.clientId || config.spotify.clientId === "your_spotify_client_id") {
  console.warn("Missing VITE_SPOTIFY_CLIENT_ID environment variable");
}