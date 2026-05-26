import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getCurrentUserProfile,
  createPlaylist,
  addTracksToPlaylist,
  SpotifyPlaylist,
  SpotifyUser,
} from "@/api/spotify";
import { MatchedSong } from "@/store/setlistStore";
import {
  saveSpotifyConnection,
  clearSpotifyConnection,
  loadSpotifyConnection,
  getValidSpotifyAccessToken,
  tokensFromOAuth,
  SpotifyTokenData,
} from "@/lib/spotifyTokens";
import { toast } from "@/hooks/use-toast";

interface SpotifyContextValue {
  isSpotifyConnected: boolean;
  loading: boolean;
  spotifyUser: SpotifyUser | null;
  connectSpotifyFromOAuth: (
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number,
    supabaseUserId: string,
    email?: string | null
  ) => Promise<SpotifyUser>;
  disconnectSpotify: () => Promise<void>;
  createPlaylistFromMatches: (
    matchedSongs: MatchedSong[],
    playlistName: string
  ) => Promise<{
    playlist: SpotifyPlaylist;
    tracksAdded: number;
    totalSongs: number;
    skipped: number;
  }>;
  hydrateSpotify: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextValue | undefined>(
  undefined
);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | null>(null);

  const syncSession = useCallback(
    (_tokens: SpotifyTokenData, profile: SpotifyUser) => {
      setSpotifyUser(profile);
      setIsSpotifyConnected(true);
    },
    []
  );

  const resetSpotifyState = useCallback(() => {
    setIsSpotifyConnected(false);
    setSpotifyUser(null);
  }, []);

  const hydrateSpotify = useCallback(async () => {
    if (!user?.id) {
      resetSpotifyState();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const connection = await loadSpotifyConnection(user.id);
      if (connection) {
        syncSession(connection.tokens, connection.spotifyUser);
      } else {
        resetSpotifyState();
      }
    } catch (error) {
      console.error("hydrateSpotify:", error);
      resetSpotifyState();
    } finally {
      setLoading(false);
    }
  }, [user?.id, syncSession, resetSpotifyState]);

  useEffect(() => {
    if (isAuthenticated && user) {
      hydrateSpotify();
    } else {
      resetSpotifyState();
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, hydrateSpotify, resetSpotifyState]);

  const connectSpotifyFromOAuth = async (
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number,
    supabaseUserId: string,
    email?: string | null
  ) => {
    const tokens = tokensFromOAuth(accessToken, refreshToken, expiresIn);
    const spotifyProfile = await getCurrentUserProfile(tokens.access_token);
    await saveSpotifyConnection(supabaseUserId, tokens, spotifyProfile, email);
    syncSession(tokens, spotifyProfile);
    return spotifyProfile;
  };

  const createPlaylistFromMatches = async (
    matchedSongs: MatchedSong[],
    playlistName: string
  ): Promise<{
    playlist: SpotifyPlaylist;
    tracksAdded: number;
    totalSongs: number;
    skipped: number;
  }> => {
    if (!user?.id) {
      throw new Error("Debes iniciar sesión");
    }

    try {
      const accessToken = await getValidSpotifyAccessToken(user.id);
      if (!accessToken) {
        throw new Error(
          "No hay sesión de Spotify. Ve a Conectar Spotify e inicia el flujo otra vez."
        );
      }

      let currentSpotifyUser = spotifyUser;
      if (!currentSpotifyUser) {
        currentSpotifyUser = await getCurrentUserProfile(accessToken);
        setSpotifyUser(currentSpotifyUser);
        setIsSpotifyConnected(true);
      }

      const trackUris = matchedSongs
        .map((song) => song.spotifyMatch?.uri)
        .filter((uri): uri is string => !!uri);

      if (trackUris.length === 0) {
        throw new Error(
          "No hay canciones con match en Spotify para crear la playlist"
        );
      }

      const playlist = await createPlaylist(
        accessToken,
        playlistName,
        `Creada por Mussistant · ${matchedSongs.length} canciones del setlist`
      );

      await addTracksToPlaylist(accessToken, playlist.id, trackUris);

      const skipped = matchedSongs.length - trackUris.length;

      toast({
        title: "Playlist creada",
        description: `"${playlistName}" con ${trackUris.length} canciones`,
      });

      return {
        playlist,
        tracksAdded: trackUris.length,
        totalSongs: matchedSongs.length,
        skipped,
      };
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast({
        title: "Error al crear playlist",
        description:
          error instanceof Error ? error.message : "No se pudo crear la playlist",
        variant: "destructive",
      });
      throw error;
    }
  };

  const disconnectSpotify = async () => {
    if (!user?.id) return;

    try {
      await clearSpotifyConnection(user.id);
      resetSpotifyState();
      toast({
        title: "Spotify desconectado",
        description: "Tu cuenta de Spotify se desvinculó de Mussistant",
      });
    } catch (error) {
      console.error("Error disconnecting Spotify:", error);
      toast({
        title: "Error al desconectar",
        description:
          error instanceof Error ? error.message : "No se pudo desconectar",
        variant: "destructive",
      });
    }
  };

  const value: SpotifyContextValue = {
    isSpotifyConnected,
    loading,
    spotifyUser,
    connectSpotifyFromOAuth,
    disconnectSpotify,
    createPlaylistFromMatches,
    hydrateSpotify,
  };

  return (
    <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error("useSpotify debe usarse dentro de SpotifyProvider");
  }
  return context;
}
