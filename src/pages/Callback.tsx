import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { exchangeCodeForTokens } from "@/auth/spotifyAuth";
import { useSpotify } from "@/hooks/useSpotify";
import { AUTH_RETURN_KEY } from "@/hooks/useAuth";
import { waitForAuthenticatedUser } from "@/lib/authSession";
import { toast } from "@/hooks/use-toast";

const RETURN_PATH_KEY = "spotify_return_path";
const PENDING_CODE_KEY = "spotify_pending_code";

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { connectSpotifyFromOAuth } = useSpotify();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const handleCallback = async () => {
      handled.current = true;

      try {
        const code =
          searchParams.get("code") ??
          sessionStorage.getItem(PENDING_CODE_KEY);
        const error = searchParams.get("error");

        if (error) {
          throw new Error(`Spotify rechazó la autorización: ${error}`);
        }

        if (!code) {
          throw new Error("No se recibió el código de autorización");
        }

        sessionStorage.removeItem(PENDING_CODE_KEY);

        const authUser = await waitForAuthenticatedUser();
        if (!authUser) {
          sessionStorage.setItem(PENDING_CODE_KEY, code);
          sessionStorage.setItem(
            AUTH_RETURN_KEY,
            `/callback${window.location.search || `?code=${encodeURIComponent(code)}`}`
          );
          navigate("/auth?next=/callback", { replace: true });
          return;
        }

        const codeVerifier = sessionStorage.getItem("spotify_code_verifier");
        if (!codeVerifier) {
          throw new Error(
            "Sesión OAuth expirada. Vuelve a Conectar Spotify desde la app."
          );
        }

        const tokens = await exchangeCodeForTokens(code, codeVerifier);
        await connectSpotifyFromOAuth(
          tokens.access_token,
          tokens.refresh_token,
          tokens.expires_in,
          authUser.id,
          authUser.email
        );

        sessionStorage.removeItem("spotify_code_verifier");

        setStatus("success");
        toast({
          title: "Listo",
          description: "Spotify conectado a tu cuenta de Mussistant.",
        });

        const returnPath =
          sessionStorage.getItem(RETURN_PATH_KEY) || "/review";
        sessionStorage.removeItem(RETURN_PATH_KEY);

        setTimeout(() => {
          navigate(returnPath, { replace: true });
        }, 1200);
      } catch (err) {
        console.error("Callback error:", err);
        handled.current = false;
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Error desconocido"
        );
        toast({
          title: "Error al conectar Spotify",
          description:
            err instanceof Error ? err.message : "No se pudo completar la conexión",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, connectSpotifyFromOAuth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="card-gradient shadow-lg">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold">Conectando Spotify</h1>
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
                  <h3 className="font-semibold mb-2">Vinculando cuentas...</h3>
                  <p className="text-muted-foreground text-sm">
                    Verificando tu sesión en Mussistant y guardando Spotify
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
                  <h3 className="font-semibold mb-2 text-accent">Conectado</h3>
                  <p className="text-muted-foreground text-sm">
                    Redirigiendo...
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
                  <h3 className="font-semibold mb-2 text-destructive">Falló</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {errorMessage}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/spotify-connection")}
                    >
                      Reintentar conexión
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        sessionStorage.setItem(AUTH_RETURN_KEY, "/spotify-connection");
                        navigate("/auth?next=/spotify-connection");
                      }}
                    >
                      Iniciar sesión en Mussistant
                    </Button>
                  </div>
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
