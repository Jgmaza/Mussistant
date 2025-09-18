// Session context for managing authentication state
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SpotifyUser } from "@/api/spotify";
import { refreshAccessToken } from "@/auth/spotifyAuth";

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix timestamp
}

interface SessionContextType {
  user: SpotifyUser | null;
  tokens: TokenData | null;
  isAuthenticated: boolean;
  setUser: (user: SpotifyUser | null) => void;
  setTokens: (tokens: TokenData | null) => void;
  logout: () => void;
  getValidAccessToken: () => Promise<string | null>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [tokens, setTokens] = useState<TokenData | null>(null);

  const isAuthenticated = !!(user && tokens);

  // Get a valid access token, refreshing if necessary
  const getValidAccessToken = async (): Promise<string | null> => {
    if (!tokens) return null;

    const now = Date.now();
    const isExpired = now >= tokens.expires_at;

    if (!isExpired) {
      return tokens.access_token;
    }

    // Token is expired, try to refresh
    if (tokens.refresh_token) {
      try {
        const refreshed = await refreshAccessToken(tokens.refresh_token);
        const newTokens: TokenData = {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token || tokens.refresh_token,
          expires_at: now + refreshed.expires_in * 1000,
        };
        setTokens(newTokens);
        return newTokens.access_token;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        logout();
        return null;
      }
    }

    // No refresh token available
    logout();
    return null;
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    sessionStorage.removeItem("spotify_code_verifier");
  };

  const value: SessionContextType = {
    user,
    tokens,
    isAuthenticated,
    setUser,
    setTokens,
    logout,
    getValidAccessToken,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}