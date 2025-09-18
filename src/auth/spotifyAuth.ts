// Spotify PKCE Authentication utilities
import { config } from "@/config/env";

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
export async function buildAuthUrl(): Promise<{ url: string; codeVerifier: string }> {
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
    throw new Error(`Token exchange failed: ${error}`);
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

// Start login flow
export async function loginWithSpotify(): Promise<void> {
  const { url, codeVerifier } = await buildAuthUrl();
  
  // Store code verifier for callback
  sessionStorage.setItem("spotify_code_verifier", codeVerifier);
  
  // Redirect to Spotify
  window.location.href = url;
}