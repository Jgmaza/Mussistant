import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log(`[me-spotify] Checking connection for user: ${user.id}`);

    // Check if user has Spotify connection
    const { data: spotifyAccount, error: spotifyError } = await supabase
      .from('spotify_accounts')
      .select('spotify_user_id, display_name, country, token_expires_at, connected_at')
      .eq('user_id', user.id)
      .single();

    if (spotifyError && spotifyError.code !== 'PGRST116') {
      console.error('[me-spotify] Database error:', spotifyError);
      throw new Error('Database error');
    }

    const isConnected = !!spotifyAccount;
    const isTokenValid = spotifyAccount ? new Date(spotifyAccount.token_expires_at) > new Date() : false;

    const response = {
      connected: isConnected && isTokenValid,
      displayName: spotifyAccount?.display_name || null,
      country: spotifyAccount?.country || null,
      connectedAt: spotifyAccount?.connected_at || null,
      tokenExpired: isConnected && !isTokenValid
    };

    console.log(`[me-spotify] Response:`, response);

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
    console.error('[me-spotify] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        connected: false 
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