import React, { useState } from "react";
import { ArrowLeft, Music, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { loginWithSpotify } from "@/auth/spotifyAuth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const SpotifyConnection = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to connect your Spotify account.",
      });
      navigate("/auth");
    }
  }, [isAuthenticated, navigate]);

  const handleConnectSpotify = async () => {
    try {
      setIsConnecting(true);
      await loginWithSpotify();
    } catch (error) {
      console.error("Error connecting to Spotify:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Spotify. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
          <p>Redirecting to authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/review")}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              Connect Spotify
            </h1>
            <p className="text-muted-foreground mt-2">
              Link your Spotify account to create playlists
            </p>
          </div>
          
          <div /> {/* Spacer for centering */}
        </div>

        {/* Connection Card */}
        <Card className="card-gradient shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
              <Music className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Connect Your Spotify Account</h2>
            <p className="text-muted-foreground">
              To create playlists from your setlists, we need access to your Spotify account.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Create playlists automatically from your setlists</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Search and match songs with Spotify's catalog</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Secure OAuth 2.0 authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Your data is stored securely and never shared</span>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Requirements:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Active Spotify account (Free or Premium)</li>
                <li>• Permission to create and modify playlists</li>
                <li>• Access to read your email address</li>
              </ul>
            </div>

            {/* Connect Button */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleConnectSpotify}
                disabled={isConnecting}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect with Spotify
                  </>
                )}
              </Button>
            </div>

            {/* Security Note */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                By connecting, you'll be redirected to Spotify's secure login page.
                We only request the minimum permissions needed to create playlists.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpotifyConnection;