import React, { useState } from "react";
import { ArrowLeft, Music, Loader2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useSetlistStore } from "@/store/setlistStore";
import { useSpotify } from "@/hooks/useSpotify";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const Review = () => {
  const navigate = useNavigate();
  const { parsedSongs, matchedSongs } = useSetlistStore();
  const { isSpotifyConnected, loading: spotifyLoading, createPlaylistFromSongs } = useSpotify();
  const { isAuthenticated } = useAuth();
  const [playlistName, setPlaylistName] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Redirect if no songs available
  React.useEffect(() => {
    if (parsedSongs.length === 0) {
      navigate("/");
    }
  }, [parsedSongs, navigate]);

  // Set default playlist name based on current date
  React.useEffect(() => {
    if (!playlistName) {
      const today = new Date().toLocaleDateString();
      setPlaylistName(`My Setlist - ${today}`);
    }
  }, [playlistName]);

  const handleCreatePlaylist = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create playlists.",
      });
      navigate("/auth");
      return;
    }

    if (!isSpotifyConnected) {
      navigate("/spotify-connection");
      return;
    }

    if (!playlistName.trim()) {
      toast({
        title: "Playlist Name Required",
        description: "Please enter a name for your playlist.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingPlaylist(true);
      const result = await createPlaylistFromSongs(parsedSongs, playlistName.trim());
      
      toast({
        title: "Success!",
        description: `Created playlist "${playlistName}" with ${result.tracksAdded} of ${result.totalSongs} songs found on Spotify.`,
      });
    } catch (error) {
      console.error("Failed to create playlist:", error);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  if (parsedSongs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
          <p>Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Input
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              Review & Match Songs
            </h1>
            <p className="text-muted-foreground mt-2">
              Found {parsedSongs.length} songs from your setlist
            </p>
          </div>
          
          <div /> {/* Spacer for centering */}
        </div>

        {/* Songs List */}
        <Card className="card-gradient shadow-lg">
          <CardHeader>
            <h2 className="text-xl font-semibold">Parsed Songs</h2>
            <p className="text-muted-foreground">
              Review the songs extracted from your setlist. Next, we'll match them with Spotify.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parsedSongs.map((song, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{song.title}</div>
                    {song.artist && (
                      <div className="text-sm text-muted-foreground">
                        by {song.artist}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {index + 1} of {parsedSongs.length}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create Playlist Section */}
        <Card className="card-gradient shadow-lg mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Spotify Playlist
            </h2>
            <p className="text-muted-foreground">
              Create a Spotify playlist from your parsed songs.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Playlist Name</label>
              <Input
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Enter playlist name..."
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-3">
              {isAuthenticated ? (
                isSpotifyConnected ? (
                  <Button 
                    onClick={handleCreatePlaylist}
                    disabled={isCreatingPlaylist || !playlistName.trim()}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isCreatingPlaylist ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Playlist...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Playlist on Spotify
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate("/spotify-connection")}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    disabled={spotifyLoading}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {spotifyLoading ? "Checking..." : "Connect Spotify"}
                  </Button>
                )
              ) : (
                <Button 
                  onClick={() => navigate("/auth")}
                  variant="outline"
                >
                  Sign In to Create Playlist
                </Button>
              )}
              
              <Button variant="outline" onClick={() => navigate("/")}>
                Add More Songs
              </Button>
            </div>

            {!isAuthenticated && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Sign in to your account to connect Spotify and create playlists.
              </div>
            )}

            {isAuthenticated && !isSpotifyConnected && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Connect your Spotify account to create playlists from your setlists.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Review;