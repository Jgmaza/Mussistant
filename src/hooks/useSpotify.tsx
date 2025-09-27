import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserProfile, searchTracks, createPlaylist, addTracksToPlaylist } from '@/api/spotify';
import { useSession } from '@/state/session';
import { toast } from '@/hooks/use-toast';

interface SpotifyCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export function useSpotify() {
  const { user, isAuthenticated } = useAuth();
  const { getValidAccessToken } = useSession();
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spotifyUser, setSpotifyUser] = useState<any>(null);

  // Check if user has Spotify connection
  useEffect(() => {
    if (isAuthenticated && user) {
      checkSpotifyConnection();
    }
  }, [isAuthenticated, user]);

  const checkSpotifyConnection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('me-spotify');

      if (error) {
        console.error('Error checking Spotify connection:', error);
        return;
      }

      setIsSpotifyConnected(data.connected);
      if (data.connected) {
        setSpotifyUser({
          display_name: data.displayName,
          country: data.country
        });
      }
    } catch (error) {
      console.error('Error checking Spotify connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectSpotify = async (code: string, codeVerifier: string) => {
    try {
      // Use the new callback endpoint
      const { data, error } = await supabase.functions.invoke('spotify-callback', {
        body: { code, codeVerifier }
      });

      if (error) {
        throw new Error(`Connection failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Connection failed');
      }

      setIsSpotifyConnected(true);
      setSpotifyUser(data.spotifyUser);
      
      toast({
        title: "Spotify Connected!",
        description: `Successfully connected as ${data.spotifyUser.displayName}`,
      });

      return data.spotifyUser;
    } catch (error) {
      console.error('Error connecting Spotify:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect Spotify account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPlaylistFromSongs = async (songs: Array<{ title: string; artist?: string }>, playlistName: string) => {
    try {
      // Get user's profile for market preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_market')
        .eq('user_id', user?.id)
        .single();

      const market = profile?.default_market || 'US';

      // Use the new create-playlist endpoint
      const { data, error } = await supabase.functions.invoke('spotify-create-playlist', {
        body: {
          name: playlistName,
          public: true,
          market,
          tracks: songs,
          preferences: {
            versionOrder: ["studio", "remaster", "live", "acoustic"],
            noDuplicates: true,
            albumPreference: "original"
          }
        }
      });

      if (error) {
        throw new Error(`Playlist creation failed: ${error.message}`);
      }

      toast({
        title: "Playlist Created!",
        description: `Created "${playlistName}" with ${data.summary.found}/${data.summary.total} songs`,
      });

      return {
        playlistUrl: data.playlistUrl,
        tracksAdded: data.summary.found,
        totalSongs: data.summary.total,
        summary: data.summary,
        added: data.added,
        notFound: data.notFound
      };
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast({
        title: "Playlist Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create playlist",
        variant: "destructive",
      });
      throw error;
    }
  };

  const disconnectSpotify = async () => {
    try {
      // Delete from spotify_accounts table
      const { error } = await supabase
        .from('spotify_accounts')
        .delete()
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      setIsSpotifyConnected(false);
      setSpotifyUser(null);
      
      toast({
        title: "Spotify Disconnected",
        description: "Your Spotify account has been disconnected",
      });
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect Spotify account",
        variant: "destructive",
      });
    }
  };

  return {
    isSpotifyConnected,
    loading,
    spotifyUser,
    connectSpotify,
    disconnectSpotify,
    createPlaylistFromSongs,
    checkSpotifyConnection,
  };
}