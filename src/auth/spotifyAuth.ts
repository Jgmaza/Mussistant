// Spotify PKCE Authentication utilities
import { config } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_RETURN_KEY } from "@/hooks/useAuth";
import { persistSetlistNow } from "@/store/setlistStore";

// Generate a cryptographically secure random string
function generateRandomString(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join("");
}

// Create PKCE code verifier
export function createCodeVerifier(): string {
  return generateRandomString(128);
}

// Create PKCE code challenge from verifier
export async function createCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Build Spotify authorization URL
export async function buildAuthUrl(
  forceApproval = true
): Promise<{ url: string; codeVerifier: string }> {
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.spotify.clientId,
    scope: config.spotify.scopes.join(" "),
    redirect_uri: config.spotify.redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state: generateRandomString(16),
  });

  if (forceApproval) {
    params.set("show_dialog", "true");
  }

  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  
  return { url, codeVerifier };
}

// Exchange authorization code for access token
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.spotify.redirectUri,
      client_id: config.spotify.clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    let message = error;
    try {
      const parsed = JSON.parse(error);
      message = parsed.error_description ?? parsed.error ?? error;
    } catch {
      // keep raw text
    }
    throw new Error(`Error al obtener tokens de Spotify: ${message}`);
  }

  return response.json();
}

// Refresh access token
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.spotify.clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

const RETURN_PATH_KEY = "spotify_return_path";

// Start login flow (user must be logged in to Supabase first)
export async function loginWithSpotify(returnPath = "/review"): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    sessionStorage.setItem(RETURN_PATH_KEY, returnPath);
    sessionStorage.setItem(AUTH_RETURN_KEY, "/spotify-connection");
    window.location.assign(
      `/auth?next=${encodeURIComponent("/spotify-connection")}`
    );
    return;
  }

  const { url, codeVerifier } = await buildAuthUrl();

  sessionStorage.setItem("spotify_code_verifier", codeVerifier);
  sessionStorage.setItem(RETURN_PATH_KEY, returnPath);

  persistSetlistNow();

  window.location.href = url;
}

// Handle callback and return code + verifier
export async function handleSpotifyCallback(code: string): Promise<{ code: string; codeVerifier: string }> {
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) {
    throw new Error('Missing code verifier');
  }

  // Clean up stored verifier
  sessionStorage.removeItem('spotify_code_verifier');

  return { code, codeVerifier };
}