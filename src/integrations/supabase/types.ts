export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      playlist_logs: {
        Row: {
          created_at: string
          id: string
          matched_approx: number
          matched_exact: number
          not_found: number
          playlist_name: string
          spotify_playlist_id: string | null
          spotify_playlist_url: string | null
          total_tracks: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_approx?: number
          matched_exact?: number
          not_found?: number
          playlist_name: string
          spotify_playlist_id?: string | null
          spotify_playlist_url?: string | null
          total_tracks: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_approx?: number
          matched_exact?: number
          not_found?: number
          playlist_name?: string
          spotify_playlist_id?: string | null
          spotify_playlist_url?: string | null
          total_tracks?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_market: string | null
          display_name: string | null
          email: string | null
          id: string
          spotify_connected: boolean | null
          spotify_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_market?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          spotify_connected?: boolean | null
          spotify_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_market?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          spotify_connected?: boolean | null
          spotify_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_accounts: {
        Row: {
          access_token: string
          connected_at: string
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          refresh_token: string | null
          scope: string
          spotify_user_id: string
          token_expires_at: string
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          refresh_token?: string | null
          scope: string
          spotify_user_id: string
          token_expires_at: string
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string
          spotify_user_id?: string
          token_expires_at?: string
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      track_matches: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          match_type: string
          matched_artist: string | null
          matched_title: string | null
          original_artist: string | null
          original_title: string
          playlist_log_id: string
          spotify_track_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          match_type: string
          matched_artist?: string | null
          matched_title?: string | null
          original_artist?: string | null
          original_title: string
          playlist_log_id: string
          spotify_track_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          match_type?: string
          matched_artist?: string | null
          matched_title?: string | null
          original_artist?: string | null
          original_title?: string
          playlist_log_id?: string
          spotify_track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_matches_playlist_log_id_fkey"
            columns: ["playlist_log_id"]
            isOneToOne: false
            referencedRelation: "playlist_logs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
