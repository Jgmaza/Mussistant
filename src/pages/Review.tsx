import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Music,
  Loader2,
  Plus,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useSetlistStore, hasPersistedSetlist } from "@/store/setlistStore";
import { useSpotify } from "@/hooks/useSpotify";
import { useSetlistMatching } from "@/hooks/useSetlistMatching";
import { useAuth, AUTH_RETURN_KEY } from "@/hooks/useAuth";
import { loginWithSpotify } from "@/auth/spotifyAuth";
import { Navbar } from "@/components/Navbar";
import { SongMatchRow } from "@/components/SongMatchRow";
import { SpotifyPlaylist } from "@/api/spotify";
import { toast } from "@/hooks/use-toast";

const Review = () => {
  const navigate = useNavigate();
  const {
    parsedSongs,
    setlistContext,
    playlistName,
    setPlaylistName,
  } = useSetlistStore();
  const {
    isSpotifyConnected,
    loading: spotifyLoading,
    spotifyUser,
    createPlaylistFromMatches,
  } = useSpotify();
  const {
    matchedSongs,
    isMatching,
    matchProgress,
    matchedCount,
    activeSongCount,
    matchAllSongs,
    selectAlternative,
    removeSongAtIndex,
    excludeSongAtIndex,
  } = useSetlistMatching();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [createdPlaylist, setCreatedPlaylist] = useState<SpotifyPlaylist | null>(
    null
  );
  const [createResult, setCreateResult] = useState<{
    tracksAdded: number;
    totalSongs: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    if (parsedSongs.length === 0 && !hasPersistedSetlist()) {
      navigate("/");
    }
  }, [parsedSongs.length, navigate]);

  useEffect(() => {
    if (!playlistName) {
      if (setlistContext.suggestedPlaylistName) {
        setPlaylistName(setlistContext.suggestedPlaylistName);
      } else {
        const today = new Date().toLocaleDateString();
        setPlaylistName(`Mi setlist - ${today}`);
      }
    }
  }, [playlistName, setlistContext.suggestedPlaylistName, setPlaylistName]);

  useEffect(() => {
    if (
      isSpotifyConnected &&
      parsedSongs.length > 0 &&
      matchedSongs.length === 0 &&
      !isMatching
    ) {
      matchAllSongs();
    }
  }, [
    isSpotifyConnected,
    parsedSongs.length,
    matchedSongs.length,
    isMatching,
    matchAllSongs,
  ]);

  const handleCreatePlaylist = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para crear playlists.",
      });
      navigate("/auth");
      return;
    }

    if (!isSpotifyConnected) {
      sessionStorage.setItem(AUTH_RETURN_KEY, "/review");
      navigate("/spotify-connection");
      return;
    }

    if (!playlistName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Escribe un nombre para la playlist.",
        variant: "destructive",
      });
      return;
    }

    if (matchedCount === 0) {
      toast({
        title: "Sin coincidencias",
        description: "Conecta Spotify y espera a que se busquen las canciones.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingPlaylist(true);
      const songsToUse = matchedSongs.filter(
        (s) => !s.excluded && s.spotifyMatch
      );
      const result = await createPlaylistFromMatches(
        songsToUse,
        playlistName.trim()
      );
      setCreatedPlaylist(result.playlist);
      setCreateResult({
        tracksAdded: result.tracksAdded,
        totalSongs: result.totalSongs,
        skipped: result.skipped,
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
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  const showMatches = isSpotifyConnected && (isMatching || matchedSongs.length > 0);
  const previewSongs =
    matchedSongs.length > 0
      ? matchedSongs
      : parsedSongs.map((s) => ({ ...s, excluded: false }));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            <div className="text-center">
              <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                <Music className="w-8 h-8 text-primary" />
                Revisar y confirmar
              </h1>
              <p className="text-muted-foreground mt-2">
                {activeSongCount} canciones en tu setlist
                {showMatches && !isMatching && (
                  <> · {matchedCount} listas para Spotify</>
                )}
              </p>
            </div>

            <div className="w-24" />
          </div>

          {setlistContext.artists.length > 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Contexto detectado</p>
                <p className="text-muted-foreground">
                  {setlistContext.headerLine
                    ? `«${setlistContext.headerLine}» no es una canción. `
                    : ""}
                  Búsqueda priorizada para:{" "}
                  <span className="text-foreground font-medium">
                    {setlistContext.artists.join(" · ")}
                  </span>
                </p>
              </div>
            </div>
          )}

          {createdPlaylist && (
            <Card className="card-gradient shadow-lg mb-8 border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg">Playlist creada</h3>
                      <p className="text-muted-foreground text-sm">
                        {createResult?.tracksAdded} de {createResult?.totalSongs}{" "}
                        canciones añadidas
                        {createResult && createResult.skipped > 0 && (
                          <> ({createResult.skipped} omitidas)</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <a
                      href={createdPlaylist.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir en Spotify
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="card-gradient shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Canciones del setlist</h2>
                <p className="text-muted-foreground">
                  Revisa matches, cambia versión o elimina líneas que no sean
                  canciones.
                </p>
              </div>
              {isSpotifyConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => matchAllSongs()}
                  disabled={isMatching}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isMatching ? "animate-spin" : ""}`}
                  />
                  Buscar de nuevo
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAuthenticated && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  Inicia sesión para conectar Spotify y buscar coincidencias.
                </p>
              )}

              {isAuthenticated && !isSpotifyConnected && !spotifyLoading && (
                <div className="text-center py-4 space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Tu setlist está guardado. Conecta Spotify para buscar cada
                    canción (puedes eliminar filas antes si algo no es un tema).
                  </p>
                  <Button
                    onClick={() => {
                      sessionStorage.setItem(AUTH_RETURN_KEY, "/review");
                      if (isAuthenticated && !authLoading) {
                        void loginWithSpotify("/review");
                      } else {
                        navigate("/auth?next=/spotify-connection");
                      }
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Conectar Spotify
                  </Button>
                </div>
              )}

              {isSpotifyConnected && spotifyUser && !spotifyLoading && (
                <p className="text-sm text-muted-foreground bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  Spotify conectado como{" "}
                  <span className="font-medium text-foreground">
                    {spotifyUser.display_name ?? spotifyUser.id}
                  </span>
                </p>
              )}

              {spotifyLoading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando conexión con Spotify...
                </div>
              )}

              {isMatching && (
                <div className="space-y-2 py-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Buscando en Spotify...</span>
                    <span>{matchProgress}%</span>
                  </div>
                  <Progress value={matchProgress} />
                </div>
              )}

              {!isMatching &&
                previewSongs.map((song, index) => (
                  <SongMatchRow
                    key={`${song.original}-${index}`}
                    matched={song}
                    index={index}
                    onSelectTrack={selectAlternative}
                    onRemove={removeSongAtIndex}
                    onExclude={excludeSongAtIndex}
                    disabled={isCreatingPlaylist}
                    showMatchControls={isSpotifyConnected && showMatches}
                  />
                ))}
            </CardContent>
          </Card>

          <Card className="card-gradient shadow-lg mt-8">
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Crear playlist
              </h2>
              <p className="text-muted-foreground">
                Solo se añaden canciones con match activo (no excluidas).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre de la playlist</label>
                <Input
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Mi setlist..."
                  className="mt-1"
                  disabled={!!createdPlaylist}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {isAuthenticated ? (
                  isSpotifyConnected ? (
                    <Button
                      onClick={handleCreatePlaylist}
                      disabled={
                        isCreatingPlaylist ||
                        !playlistName.trim() ||
                        matchedCount === 0 ||
                        isMatching ||
                        !!createdPlaylist
                      }
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {isCreatingPlaylist ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : createdPlaylist ? (
                        <>Playlist creada</>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Crear en Spotify ({matchedCount})
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        sessionStorage.setItem(AUTH_RETURN_KEY, "/review");
                        navigate("/spotify-connection");
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white"
                      disabled={spotifyLoading || authLoading}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Conectar Spotify
                    </Button>
                  )
                ) : (
                  <Button variant="outline" onClick={() => navigate("/auth")}>
                    Iniciar sesión
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    useSetlistStore.getState().reset();
                    navigate("/");
                  }}
                >
                  Nuevo setlist
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Review;
