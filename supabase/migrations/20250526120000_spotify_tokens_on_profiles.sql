-- Persist Spotify OAuth tokens per user (RLS: users only access their own row)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS spotify_access_token TEXT,
  ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.spotify_access_token IS 'Spotify access token (PKCE); readable only by owner via RLS';
COMMENT ON COLUMN public.profiles.spotify_refresh_token IS 'Spotify refresh token';
COMMENT ON COLUMN public.profiles.spotify_token_expires_at IS 'When spotify_access_token expires';
