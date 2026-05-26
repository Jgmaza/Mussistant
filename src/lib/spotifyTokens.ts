import { supabase } from "@/integrations/supabase/client";
import { refreshAccessToken } from "@/auth/spotifyAuth";
import { getCurrentUserProfile, SpotifyUser } from "@/api/spotify";

export interface SpotifyTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface ProfileSpotifyRow {
  spotify_connected: boolean | null;
  spotify_user_id: string | null;
  spotify_access_token: string | null;
  spotify_refresh_token: string | null;
  spotify_token_expires_at: string | null;
  display_name: string | null;
}

const EXPIRY_BUFFER_MS = 60_000;

export function tokensFromOAuth(
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number
): SpotifyTokenData {
  if (!refreshToken) {
    throw new Error(
      "Spotify no devolvió refresh token. Ve a spotify.com/account/apps, revoca Mussistant y vuelve a conectar."
    );
  }
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Date.now() + expiresIn * 1000,
  };
}

export async function ensureProfile(
  userId: string,
  email?: string | null
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo verificar tu perfil: ${error.message}`);
  }

  if (!data) {
    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: userId,
      email: email ?? null,
    });

    if (insertError) {
      throw new Error(`No se pudo crear tu perfil: ${insertError.message}`);
    }
  }
}

export async function saveSpotifyConnection(
  userId: string,
  tokens: SpotifyTokenData,
  spotifyProfile: SpotifyUser,
  email?: string | null
): Promise<void> {
  await ensureProfile(userId, email);

  const { error } = await supabase
    .from("profiles")
    .update({
      email: email ?? undefined,
      display_name: spotifyProfile.display_name ?? undefined,
      spotify_connected: true,
      spotify_user_id: spotifyProfile.id,
      spotify_access_token: tokens.access_token,
      spotify_refresh_token: tokens.refresh_token,
      spotify_token_expires_at: new Date(tokens.expires_at).toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`No se pudo guardar la conexión con Spotify: ${error.message}`);
  }
}

export async function clearSpotifyConnection(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      spotify_connected: false,
      spotify_user_id: null,
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`No se pudo desconectar Spotify: ${error.message}`);
  }
}

async function fetchProfileSpotify(
  userId: string
): Promise<ProfileSpotifyRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "spotify_connected, spotify_user_id, spotify_access_token, spotify_refresh_token, spotify_token_expires_at, display_name"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al leer tu conexión de Spotify: ${error.message}`);
  }
  return data;
}

async function refreshAndPersistTokens(
  userId: string,
  refreshToken: string
): Promise<SpotifyTokenData> {
  try {
    const refreshed = await refreshAccessToken(refreshToken);
    const tokens: SpotifyTokenData = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? refreshToken,
      expires_at: Date.now() + refreshed.expires_in * 1000,
    };
    const spotifyUser = await getCurrentUserProfile(tokens.access_token);
    await saveSpotifyConnection(userId, tokens, spotifyUser);
    return tokens;
  } catch (error) {
    await clearSpotifyConnection(userId);
    throw error;
  }
}

export async function loadSpotifyConnection(userId: string): Promise<{
  tokens: SpotifyTokenData;
  spotifyUser: SpotifyUser;
} | null> {
  const profile = await fetchProfileSpotify(userId);
  if (!profile?.spotify_connected || !profile.spotify_refresh_token) {
    return null;
  }

  let tokens: SpotifyTokenData = {
    access_token: profile.spotify_access_token ?? "",
    refresh_token: profile.spotify_refresh_token,
    expires_at: profile.spotify_token_expires_at
      ? new Date(profile.spotify_token_expires_at).getTime()
      : 0,
  };

  const needsRefresh =
    !tokens.access_token ||
    Date.now() >= tokens.expires_at - EXPIRY_BUFFER_MS;

  if (needsRefresh) {
    tokens = await refreshAndPersistTokens(userId, tokens.refresh_token);
  }

  const spotifyUser = await getCurrentUserProfile(tokens.access_token);

  if (
    profile.spotify_access_token !== tokens.access_token ||
    profile.spotify_user_id !== spotifyUser.id
  ) {
    await saveSpotifyConnection(userId, tokens, spotifyUser);
  }

  return { tokens, spotifyUser };
}

export async function getValidSpotifyAccessToken(
  userId: string
): Promise<string | null> {
  const connection = await loadSpotifyConnection(userId);
  return connection?.tokens.access_token ?? null;
}
