import { useCallback, useState } from "react";
import { useSetlistStore } from "@/store/setlistStore";
import { useAuth } from "@/hooks/useAuth";
import { getValidSpotifyAccessToken } from "@/lib/spotifyTokens";
import { matchParsedSong, applyTrackSelection } from "@/lib/matching";
import { toast } from "@/hooks/use-toast";

export function useSetlistMatching() {
  const {
    parsedSongs,
    matchedSongs,
    setlistContext,
    setMatchedSongs,
    updateMatchedSong,
    removeSongAtIndex,
    excludeSongAtIndex,
  } = useSetlistStore();
  const { user, isAuthenticated } = useAuth();
  const [isMatching, setIsMatching] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);

  const matchAllSongs = useCallback(async () => {
    if (parsedSongs.length === 0) return;

    if (!isAuthenticated || !user?.id) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas una cuenta para buscar en Spotify.",
        variant: "destructive",
      });
      return;
    }

    const accessToken = await getValidSpotifyAccessToken(user.id);
    if (!accessToken) {
      toast({
        title: "Spotify no conectado",
        description: "Conecta tu cuenta de Spotify antes de buscar coincidencias.",
        variant: "destructive",
      });
      return;
    }

    setIsMatching(true);
    setMatchProgress(0);
    const results = [];

    try {
      for (let i = 0; i < parsedSongs.length; i++) {
        if (matchedSongs[i]?.excluded) {
          results.push({ ...parsedSongs[i], excluded: true });
          setMatchedSongs([...results]);
          setMatchProgress(Math.round(((i + 1) / parsedSongs.length) * 100));
          continue;
        }

        const matched = await matchParsedSong(
          accessToken,
          parsedSongs[i],
          setlistContext
        );
        results.push(matched);
        setMatchedSongs([...results]);
        setMatchProgress(Math.round(((i + 1) / parsedSongs.length) * 100));
      }

      const found = results.filter((s) => !s.excluded && s.spotifyMatch).length;
      const active = results.filter((s) => !s.excluded).length;
      toast({
        title: "Búsqueda completada",
        description: `${found} de ${active} canciones encontradas en Spotify.`,
      });
    } catch (error) {
      console.error("Matching failed:", error);
      toast({
        title: "Error al buscar",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron buscar las canciones.",
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  }, [
    parsedSongs,
    matchedSongs,
    setlistContext,
    isAuthenticated,
    user?.id,
    setMatchedSongs,
  ]);

  const selectAlternative = useCallback(
    (index: number, trackId: string) => {
      const current = matchedSongs[index];
      if (!current) return;
      updateMatchedSong(
        index,
        applyTrackSelection(current, trackId, setlistContext)
      );
    },
    [matchedSongs, updateMatchedSong, setlistContext]
  );

  const matchedCount = matchedSongs.filter(
    (s) => !s.excluded && s.spotifyMatch
  ).length;

  const activeSongCount = parsedSongs.length;

  return {
    matchedSongs,
    isMatching,
    matchProgress,
    matchedCount,
    activeSongCount,
    matchAllSongs,
    selectAlternative,
    removeSongAtIndex,
    excludeSongAtIndex,
  };
};
