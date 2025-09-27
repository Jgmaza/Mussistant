import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  country: string;
  email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, codeVerifier } = await req.json();
    
    if (!code || !codeVerifier) {
      throw new Error('Missing required parameters');
    }

    console.log(`[spotify-callback] Processing OAuth callback`);

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

    // Exchange code for tokens
    const clientId = Deno.env.get('VITE_SPOTIFY_CLIENT_ID')!;
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')!;
    const redirectUri = Deno.env.get('VITE_REDIRECT_URI')!;

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[spotify-callback] Token exchange failed:', error);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens: SpotifyTokenResponse = await tokenResponse.json();
    console.log(`[spotify-callback] Tokens received, expires in: ${tokens.expires_in}s`);

    // Get Spotify user profile
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get Spotify user profile');
    }

    const spotifyUser: SpotifyUser = await userResponse.json();
    console.log(`[spotify-callback] Spotify user: ${spotifyUser.id} (${spotifyUser.display_name})`);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Save to database
    const { error: saveError } = await supabase
      .from('spotify_accounts')
      .upsert({
        user_id: user.id,
        spotify_user_id: spotifyUser.id,
        display_name: spotifyUser.display_name,
        country: spotifyUser.country,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
        token_type: tokens.token_type,
        connected_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('[spotify-callback] Database save error:', saveError);
      throw new Error('Failed to save Spotify connection');
    }

    console.log(`[spotify-callback] Successfully connected Spotify account for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        spotifyUser: {
          id: spotifyUser.id,
          displayName: spotifyUser.display_name,
          country: spotifyUser.country
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[spotify-callback] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
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