-- Create spotify_accounts table
CREATE TABLE public.spotify_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  spotify_user_id TEXT NOT NULL,
  display_name TEXT,
  country TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.spotify_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own Spotify account" 
ON public.spotify_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Spotify account" 
ON public.spotify_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Spotify account" 
ON public.spotify_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Spotify account" 
ON public.spotify_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_spotify_accounts_updated_at
BEFORE UPDATE ON public.spotify_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update user_profiles table structure
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_market TEXT DEFAULT 'US';

-- Remove old Spotify fields from profiles (they'll be in spotify_accounts now)
-- We'll keep them for backward compatibility but they won't be used

-- Create playlist_logs table for metrics
CREATE TABLE public.playlist_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  playlist_name TEXT NOT NULL,
  total_tracks INTEGER NOT NULL,
  matched_exact INTEGER NOT NULL DEFAULT 0,
  matched_approx INTEGER NOT NULL DEFAULT 0,
  not_found INTEGER NOT NULL DEFAULT 0,
  spotify_playlist_id TEXT,
  spotify_playlist_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for playlist_logs
ALTER TABLE public.playlist_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playlist logs" 
ON public.playlist_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlist logs" 
ON public.playlist_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create track_matches table for detailed logging
CREATE TABLE public.track_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_log_id UUID NOT NULL REFERENCES public.playlist_logs(id) ON DELETE CASCADE,
  original_title TEXT NOT NULL,
  original_artist TEXT,
  matched_title TEXT,
  matched_artist TEXT,
  spotify_track_id TEXT,
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'approx', 'fail')),
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for track_matches
ALTER TABLE public.track_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own track matches" 
ON public.track_matches 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.playlist_logs WHERE id = playlist_log_id));

CREATE POLICY "Users can create their own track matches" 
ON public.track_matches 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM public.playlist_logs WHERE id = playlist_log_id));