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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('spotify_connected, spotify_user_id')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error checking Spotify connection:', error);
        return;
      }

      setIsSpotifyConnected(!!profile?.spotify_connected);
    } catch (error) {
      console.error('Error checking Spotify connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectSpotify = async (accessToken: string, refreshToken?: string, expiresIn?: number) => {
    try {
      // Get Spotify user profile
      const spotifyProfile = await getCurrentUserProfile(accessToken);
      
      // Update database with Spotify connection
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          spotify_connected: true,
          spotify_user_id: spotifyProfile.id,
          display_name: spotifyProfile.display_name || user?.email?.split('@')[0],
          email: user?.email,
        });

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }

      setIsSpotifyConnected(true);
      setSpotifyUser(spotifyProfile);
      
      toast({
        title: "Spotify Connected!",
        description: `Successfully connected as ${spotifyProfile.display_name}`,
      });

      return spotifyProfile;
    } catch (error) {
      console.error('Error connecting Spotify:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect Spotify account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPlaylistFromSongs = async (songs: Array<{ title: string; artist?: string }>, playlistName: string) => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid Spotify access token');
      }

      // Get user profile if not already loaded
      let currentSpotifyUser = spotifyUser;
      if (!currentSpotifyUser) {
        currentSpotifyUser = await getCurrentUserProfile(accessToken);
        setSpotifyUser(currentSpotifyUser);
      }

      // Search for tracks
      const trackUris: string[] = [];
      const searchPromises = songs.map(async (song) => {
        try {
          const query = song.artist ? `track:"${song.title}" artist:"${song.artist}"` : `track:"${song.title}"`;
          const tracks = await searchTracks(accessToken, query, 1);
          if (tracks.length > 0) {
            trackUris.push(tracks[0].uri);
          }
        } catch (error) {
          console.warn(`Failed to find track: ${song.title}`, error);
        }
      });

      await Promise.all(searchPromises);

      if (trackUris.length === 0) {
        throw new Error('No tracks found on Spotify');
      }

      // Create playlist
      const playlist = await createPlaylist(
        accessToken,
        currentSpotifyUser.id,
        playlistName,
        `Created by Musisstant from setlist with ${songs.length} songs`
      );

      // Add tracks to playlist
      await addTracksToPlaylist(accessToken, playlist.id, trackUris);

      toast({
        title: "Playlist Created!",
        description: `Created "${playlistName}" with ${trackUris.length} songs`,
      });

      return {
        playlist,
        tracksAdded: trackUris.length,
        totalSongs: songs.length,
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
      const { error } = await supabase
        .from('profiles')
        .update({
          spotify_connected: false,
          spotify_user_id: null,
        })
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