import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Plus, History, Settings, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useSpotify } from "@/hooks/useSpotify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PlaylistLog {
  id: string;
  playlist_name: string;
  total_tracks: number;
  matched_exact: number;
  matched_approx: number;
  not_found: number;
  spotify_playlist_url: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isSpotifyConnected, spotifyUser, disconnectSpotify } = useSpotify();
  const [recentPlaylists, setRecentPlaylists] = useState<PlaylistLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentPlaylists();
  }, []);

  const loadRecentPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlist_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error loading playlists:', error);
        return;
      }

      setRecentPlaylists(data || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectSpotify = async () => {
    try {
      await disconnectSpotify();
      toast({
        title: "Spotify Disconnected",
        description: "Your Spotify account has been disconnected",
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              Gig Playlist Builder
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.email?.split('@')[0] || 'User'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/')} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              New Playlist
            </Button>
            <Button onClick={handleSignOut} variant="ghost">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card className="card-gradient">
              <CardHeader>
                <h2 className="text-xl font-semibold">Quick Actions</h2>
                <p className="text-muted-foreground">Get started with creating your next playlist</p>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => navigate('/')} 
                  variant="hero" 
                  className="h-16 text-left justify-start"
                >
                  <div className="flex items-center">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Create New Playlist</div>
                      <div className="text-sm opacity-90">From text or image</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => navigate('/spotify-connection')} 
                  variant="outline" 
                  className="h-16 text-left justify-start"
                >
                  <div className="flex items-center">
                    <div className="bg-muted p-2 rounded-lg mr-3">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Spotify Settings</div>
                      <div className="text-sm text-muted-foreground">Manage connection</div>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Playlists */}
            <Card className="card-gradient">
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Playlists
                </h2>
                <p className="text-muted-foreground">Your recently created playlists</p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading recent playlists...
                  </div>
                ) : recentPlaylists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No playlists created yet</p>
                    <p className="text-sm">Create your first playlist to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentPlaylists.map((playlist) => (
                      <div key={playlist.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold">{playlist.playlist_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{playlist.total_tracks} total tracks</span>
                            <span>•</span>
                            <span>{playlist.matched_exact + playlist.matched_approx} found</span>
                            {playlist.not_found > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-destructive">{playlist.not_found} missing</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatDate(playlist.created_at)}</span>
                          </div>
                        </div>
                        {playlist.spotify_playlist_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(playlist.spotify_playlist_url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Spotify Status */}
            <Card className="card-gradient">
              <CardHeader>
                <h3 className="font-semibold">Spotify Connection</h3>
              </CardHeader>
              <CardContent>
                {isSpotifyConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    {spotifyUser && (
                      <div className="text-sm text-muted-foreground">
                        <p>Account: {spotifyUser.display_name}</p>
                        {spotifyUser.country && <p>Country: {spotifyUser.country}</p>}
                      </div>
                    )}
                    <Separator />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDisconnectSpotify}
                      className="w-full"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-muted rounded-full"></div>
                      <span className="text-sm font-medium">Not Connected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect your Spotify account to create playlists
                    </p>
                    <Button 
                      onClick={() => navigate('/spotify-connection')}
                      className="w-full"
                    >
                      Connect Spotify
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="card-gradient">
              <CardHeader>
                <h3 className="font-semibold">Your Stats</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Playlists</span>
                  <Badge variant="secondary">{recentPlaylists.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Tracks</span>
                  <Badge variant="secondary">
                    {recentPlaylists.reduce((sum, p) => sum + p.total_tracks, 0)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <Badge variant="secondary">
                    {recentPlaylists.length > 0 
                      ? Math.round((recentPlaylists.reduce((sum, p) => sum + p.matched_exact + p.matched_approx, 0) / 
                          recentPlaylists.reduce((sum, p) => sum + p.total_tracks, 0)) * 100)
                      : 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;