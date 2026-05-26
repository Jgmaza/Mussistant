function readEnv(value: string | undefined, fallback: string): string {
  const raw = (value ?? fallback).trim();
  return raw.replace(/^["']|["']$/g, "");
}

// Environment configuration for Mussistant
export const config = {
  spotify: {
    clientId: readEnv(import.meta.env.VITE_SPOTIFY_CLIENT_ID, "your_spotify_client_id"),
    redirectUri: readEnv(
      import.meta.env.VITE_REDIRECT_URI,
      "http://127.0.0.1:8080/callback"
    ),
    scopes: ["playlist-modify-public", "playlist-modify-private", "user-read-email"],
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || "Mussistant",
  },
} as const;

// Validate required environment variables
if (!config.spotify.clientId || config.spotify.clientId === "your_spotify_client_id") {
  console.warn("Missing VITE_SPOTIFY_CLIENT_ID environment variable");
}