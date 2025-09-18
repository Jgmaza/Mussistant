import React from "react";
import { ArrowLeft, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useSetlistStore } from "@/store/setlistStore";

const Review = () => {
  const navigate = useNavigate();
  const { parsedSongs, matchedSongs } = useSetlistStore();

  // Redirect if no songs available
  React.useEffect(() => {
    if (parsedSongs.length === 0) {
      navigate("/");
    }
  }, [parsedSongs, navigate]);

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

        {/* Coming Soon Notice */}
        <div className="text-center mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <h3 className="text-lg font-semibold mb-2">🎵 Coming Next</h3>
          <p className="text-muted-foreground mb-4">
            Spotify matching, playlist creation, and authentication features are being built.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go Back to Add More Songs
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Review;