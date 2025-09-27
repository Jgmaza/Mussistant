import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Track {
  title: string;
  artist?: string;
}

interface CreatePlaylistRequest {
  name: string;
  public?: boolean;
  market?: string;
  tracks: Track[];
  preferences?: {
    versionOrder?: string[];
    noDuplicates?: boolean;
    albumPreference?: string;
  };
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string };
  popularity: number;
}

interface TrackMatch {
  original: Track;
  matched?: SpotifyTrack;
  matchType: 'exact' | 'approx' | 'fail';
  confidenceScore: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: CreatePlaylistRequest = await req.json();
    const { name, tracks, public: isPublic = true, market = 'US', preferences = {} } = payload;

    console.log(`[spotify-create-playlist] Creating playlist "${name}" with ${tracks.length} tracks`);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get and refresh Spotify tokens
    const accessToken = await getValidSpotifyToken(supabase, user.id);

    // Get Spotify user ID
    const { data: spotifyAccount } = await supabase
      .from('spotify_accounts')
      .select('spotify_user_id')
      .eq('user_id', user.id)
      .single();

    if (!spotifyAccount) {
      throw new Error('No Spotify account connected');
    }

    // Search for tracks
    const trackMatches: TrackMatch[] = [];
    const foundTrackUris: string[] = [];

    for (const track of tracks) {
      console.log(`[spotify-create-playlist] Searching for: "${track.title}" by ${track.artist || 'Unknown'}`);
      
      const match = await searchTrack(accessToken, track, market, preferences);
      trackMatches.push(match);
      
      if (match.matched) {
        foundTrackUris.push(match.matched.uri);
      }
    }

    if (foundTrackUris.length === 0) {
      throw new Error('No tracks found on Spotify');
    }

    // Create Spotify playlist
    const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${spotifyAccount.spotify_user_id}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description: `Created by Gig Playlist Builder - ${foundTrackUris.length}/${tracks.length} tracks found`,
        public: isPublic
      })
    });

    if (!playlistResponse.ok) {
      const error = await playlistResponse.text();
      console.error('[spotify-create-playlist] Failed to create playlist:', error);
      throw new Error('Failed to create Spotify playlist');
    }

    const playlist = await playlistResponse.json();
    console.log(`[spotify-create-playlist] Created playlist: ${playlist.id}`);

    // Add tracks to playlist (in batches of 100)
    const batchSize = 100;
    for (let i = 0; i < foundTrackUris.length; i += batchSize) {
      const batch = foundTrackUris.slice(i, i + batchSize);
      
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: batch
        })
      });

      if (!addTracksResponse.ok) {
        console.error('[spotify-create-playlist] Failed to add tracks batch:', await addTracksResponse.text());
      }
    }

    // Log the results to database
    const { data: playlistLog, error: logError } = await supabase
      .from('playlist_logs')
      .insert({
        user_id: user.id,
        playlist_name: name,
        total_tracks: tracks.length,
        matched_exact: trackMatches.filter(m => m.matchType === 'exact').length,
        matched_approx: trackMatches.filter(m => m.matchType === 'approx').length,
        not_found: trackMatches.filter(m => m.matchType === 'fail').length,
        spotify_playlist_id: playlist.id,
        spotify_playlist_url: playlist.external_urls.spotify
      })
      .select()
      .single();

    if (!logError && playlistLog) {
      // Log individual track matches
      const trackMatchInserts = trackMatches.map(match => ({
        playlist_log_id: playlistLog.id,
        original_title: match.original.title,
        original_artist: match.original.artist || null,
        matched_title: match.matched?.name || null,
        matched_artist: match.matched?.artists[0]?.name || null,
        spotify_track_id: match.matched?.id || null,
        match_type: match.matchType,
        confidence_score: match.confidenceScore
      }));

      await supabase.from('track_matches').insert(trackMatchInserts);
    }

    const response = {
      playlistUrl: playlist.external_urls.spotify,
      playlistId: playlist.id,
      added: trackMatches.filter(m => m.matched).map(m => ({
        original: m.original,
        matched: {
          title: m.matched!.name,
          artist: m.matched!.artists[0]?.name,
          album: m.matched!.album.name
        },
        matchType: m.matchType
      })),
      notFound: trackMatches.filter(m => !m.matched).map(m => m.original),
      alternatives: [], // Could be implemented later
      summary: {
        total: tracks.length,
        found: foundTrackUris.length,
        exact: trackMatches.filter(m => m.matchType === 'exact').length,
        approximate: trackMatches.filter(m => m.matchType === 'approx').length,
        notFound: trackMatches.filter(m => m.matchType === 'fail').length
      }
    };

    console.log(`[spotify-create-playlist] Successfully created playlist with ${foundTrackUris.length}/${tracks.length} tracks`);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[spotify-create-playlist] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function getValidSpotifyToken(supabase: any, userId: string): Promise<string> {
  const { data: account, error } = await supabase
    .from('spotify_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !account) {
    throw new Error('No Spotify account found');
  }

  const now = new Date();
  const expiresAt = new Date(account.token_expires_at);

  // If token is still valid (with 5 minute buffer), return it
  if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return account.access_token;
  }

  // Refresh the token
  if (!account.refresh_token) {
    throw new Error('No refresh token available');
  }

  console.log('[getValidSpotifyToken] Refreshing expired token');

  const clientId = Deno.env.get('VITE_SPOTIFY_CLIENT_ID')!;
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')!;

  const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    const error = await refreshResponse.text();
    console.error('[getValidSpotifyToken] Token refresh failed:', error);
    throw new Error('Failed to refresh Spotify token');
  }

  const tokens = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

  // Update the database with new token
  await supabase
    .from('spotify_accounts')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || account.refresh_token,
      token_expires_at: newExpiresAt.toISOString()
    })
    .eq('user_id', userId);

  console.log('[getValidSpotifyToken] Token refreshed successfully');
  return tokens.access_token;
}

async function searchTrack(
  accessToken: string,
  track: Track,
  market: string,
  preferences: any
): Promise<TrackMatch> {
  const queries = [];
  
  // Primary search with both title and artist
  if (track.artist) {
    queries.push(`track:"${track.title}" artist:"${track.artist}"`);
  }
  
  // Fallback search with just title
  queries.push(`track:"${track.title}"`);
  
  // Simple text search as last resort
  queries.push(`${track.title} ${track.artist || ''}`.trim());

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    
    try {
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?${new URLSearchParams({
          q: query,
          type: 'track',
          market,
          limit: '10'
        })}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!searchResponse.ok) {
        continue;
      }

      const searchResult = await searchResponse.json();
      const tracks = searchResult.tracks?.items || [];

      if (tracks.length > 0) {
        // Score tracks based on how well they match
        const scoredTracks = tracks.map((spotifyTrack: SpotifyTrack) => {
          let score = 0;
          const titleMatch = calculateTextSimilarity(track.title.toLowerCase(), spotifyTrack.name.toLowerCase());
          score += titleMatch * 0.7;

          if (track.artist) {
            const artistMatch = Math.max(...spotifyTrack.artists.map(artist => 
              calculateTextSimilarity(track.artist!.toLowerCase(), artist.name.toLowerCase())
            ));
            score += artistMatch * 0.3;
          }

          return { track: spotifyTrack, score };
        });

        // Sort by score and take the best match
        scoredTracks.sort((a: any, b: any) => b.score - a.score);
        const bestMatch = scoredTracks[0];

        if (bestMatch.score > 0.5) {
          return {
            original: track,
            matched: bestMatch.track,
            matchType: bestMatch.score > 0.8 ? 'exact' : 'approx',
            confidenceScore: Math.round(bestMatch.score * 100) / 100
          };
        }
      }
    } catch (error) {
      console.warn(`[searchTrack] Search failed for query "${query}":`, error);
    }
  }

  return {
    original: track,
    matched: undefined,
    matchType: 'fail',
    confidenceScore: 0
  };
}

function calculateTextSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}