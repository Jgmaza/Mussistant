import React, { useState, useEffect } from "react";
import { ArrowLeft, Music, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { loginWithSpotify } from "@/auth/spotifyAuth";
import { useAuth, AUTH_RETURN_KEY } from "@/hooks/useAuth";
import { useSpotify } from "@/hooks/useSpotify";

const SpotifyConnection = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isSpotifyConnected, spotifyUser, loading, disconnectSpotify } =
    useSpotify();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      sessionStorage.setItem(AUTH_RETURN_KEY, "/spotify-connection");
      navigate("/auth?next=/spotify-connection", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleConnectSpotify = async () => {
    if (authLoading) return;

    if (!isAuthenticated) {
      sessionStorage.setItem(AUTH_RETURN_KEY, "/spotify-connection");
      navigate("/auth?next=/spotify-connection");
      return;
    }

    try {
      setIsConnecting(true);
      await loginWithSpotify("/spotify-connection");
    } catch (error) {
      console.error("Error connecting to Spotify:", error);
      setIsConnecting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            {authLoading ? "Verificando tu sesión..." : "Redirigiendo al inicio de sesión..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/review")}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a revisar
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              Conectar Spotify
            </h1>
            <p className="text-muted-foreground mt-2">
              Vincula tu cuenta de Spotify con tu sesión de Mussistant
            </p>
          </div>

          <div />
        </div>

        <Card className="card-gradient shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
              <Music className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Tu cuenta de Mussistant</h2>
            <p className="text-muted-foreground">
              Al conectar, la playlist del setlist se creará en tu biblioteca de
              Spotify.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Crear playlists desde tus setlists</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Buscar y emparejar canciones en el catálogo de Spotify</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>OAuth seguro — no compartimos tu contraseña de Spotify</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : isSpotifyConnected && spotifyUser ? (
              <div className="space-y-4 text-center">
                <p className="text-sm">
                  Conectado como{" "}
                  <span className="font-semibold">
                    {spotifyUser.display_name ?? spotifyUser.id}
                  </span>
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={() => navigate("/review")}>
                    Ir a revisar setlist
                  </Button>
                  <Button variant="outline" onClick={() => disconnectSpotify()}>
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : (
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
                      Redirigiendo a Spotify...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Conectar con Spotify
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpotifyConnection;
