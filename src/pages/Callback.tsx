import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { exchangeCodeForTokens, handleSpotifyCallback } from "@/auth/spotifyAuth";
import { getCurrentUserProfile } from "@/api/spotify";
import { useSession } from "@/state/session";
import { useSpotify } from "@/hooks/useSpotify";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setTokens } = useSession();
  const { connectSpotify } = useSpotify();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        
        if (error) {
          throw new Error(`Authorization failed: ${error}`);
        }

        if (!code) {
          throw new Error("No authorization code received");
        }

        // Get the stored code verifier
        const codeVerifier = sessionStorage.getItem("spotify_code_verifier");
        if (!codeVerifier) {
          throw new Error("No code verifier found. Please try logging in again.");
        }

      // If user is authenticated with Supabase, connect Spotify to their profile
      if (isAuthenticated) {
        // Handle the callback and get code + verifier
        const { code: authCode, codeVerifier } = await handleSpotifyCallback(code);
        await connectSpotify(authCode, codeVerifier);
      } else {
        // For non-authenticated users, get tokens directly
        const tokens = await exchangeCodeForTokens(code, codeVerifier);
        
        // Store tokens in session for immediate use
        setTokens({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + tokens.expires_in * 1000,
        });

        // Get the profile for session
        const user = await getCurrentUserProfile(tokens.access_token);
        setUser(user);
      }

      
      // Clean up
      sessionStorage.removeItem("spotify_code_verifier");

      setStatus("success");
      toast({
        title: "Success!",
        description: "Successfully connected to Spotify.",
      });
      
      // Redirect to review page after a short delay
      setTimeout(() => {
        navigate("/review");
      }, 2000);

      } catch (error) {
        console.error("Callback error:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
        
        toast({
          title: "Login failed",
          description: error instanceof Error ? error.message : "Failed to connect to Spotify",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, setTokens, connectSpotify, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="card-gradient shadow-lg">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold">Connecting to Spotify</h1>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {status === "processing" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Authenticating...</h3>
                  <p className="text-muted-foreground text-sm">
                    Setting up your Spotify connection
                  </p>
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-accent/10 p-4 rounded-full">
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-accent">Connected!</h3>
                  <p className="text-muted-foreground text-sm">
                    Redirecting you back to the app...
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-destructive/10 p-4 rounded-full">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-destructive">Connection Failed</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {errorMessage}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                  >
                    Go Back Home
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Callback;