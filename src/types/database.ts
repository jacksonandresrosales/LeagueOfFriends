export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      challenge_participants: {
        Row: {
          baseline_value: number | null
          challenge_id: number
          current_value: number | null
          joined_at: string | null
          profile_id: string
          riot_account_id: number
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          baseline_value?: number | null
          challenge_id: number
          current_value?: number | null
          joined_at?: string | null
          profile_id: string
          riot_account_id: number
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          baseline_value?: number | null
          challenge_id?: number
          current_value?: number | null
          joined_at?: string | null
          profile_id?: string
          riot_account_id?: number
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_riot_account_fkey"
            columns: ["riot_account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id", "profile_id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          captured_at: string
          challenge_id: number
          id: number
          metric_value: number
          position: number
          profile_id: string
          progress_value: number
        }
        Insert: {
          captured_at?: string
          challenge_id: number
          id?: never
          metric_value: number
          position: number
          profile_id: string
          progress_value: number
        }
        Update: {
          captured_at?: string
          challenge_id?: number
          id?: never
          metric_value?: number
          position?: number
          profile_id?: string
          progress_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_participant_fkey"
            columns: ["challenge_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "challenge_participants"
            referencedColumns: ["challenge_id", "profile_id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          creator_id: string
          ends_at: string
          id: number
          metric: string
          name: string
          queue_type: string
          rules: Json
          starts_at: string
          status: string
          target_division: string | null
          target_tier: string | null
          target_value: number | null
          updated_at: string
          winner_profile_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          ends_at: string
          id?: never
          metric: string
          name: string
          queue_type?: string
          rules?: Json
          starts_at: string
          status?: string
          target_division?: string | null
          target_tier?: string | null
          target_value?: number | null
          updated_at?: string
          winner_profile_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          ends_at?: string
          id?: never
          metric?: string
          name?: string
          queue_type?: string
          rules?: Json
          starts_at?: string
          status?: string
          target_division?: string | null
          target_tier?: string | null
          target_value?: number | null
          updated_at?: string
          winner_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_winner_participant_fkey"
            columns: ["id", "winner_profile_id"]
            isOneToOne: false
            referencedRelation: "challenge_participants"
            referencedColumns: ["challenge_id", "profile_id"]
          },
          {
            foreignKeyName: "challenges_winner_profile_id_fkey"
            columns: ["winner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: number
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: never
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: never
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_snapshots: {
        Row: {
          captured_at: string
          champion_id: number
          id: number
          mastery_level: number
          mastery_points: number
          riot_account_id: number
        }
        Insert: {
          captured_at?: string
          champion_id: number
          id?: never
          mastery_level: number
          mastery_points: number
          riot_account_id: number
        }
        Update: {
          captured_at?: string
          champion_id?: number
          id?: never
          mastery_level?: number
          mastery_points?: number
          riot_account_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "mastery_snapshots_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          challenge_updates_enabled: boolean
          digest_frequency: string
          email_enabled: boolean
          overtaken_enabled: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          challenge_updates_enabled?: boolean
          digest_frequency?: string
          email_enabled?: boolean
          overtaken_enabled?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          challenge_updates_enabled?: boolean
          digest_frequency?: string
          email_enabled?: boolean
          overtaken_enabled?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          challenge_id: number | null
          created_at: string
          deduplication_key: string
          email_sent_at: string | null
          id: number
          payload: Json
          profile_id: string
          read_at: string | null
          type: string
        }
        Insert: {
          challenge_id?: number | null
          created_at?: string
          deduplication_key: string
          email_sent_at?: string | null
          id?: never
          payload?: Json
          profile_id: string
          read_at?: string | null
          type: string
        }
        Update: {
          challenge_id?: number | null
          created_at?: string
          deduplication_key?: string
          email_sent_at?: string | null
          id?: never
          payload?: Json
          profile_id?: string
          read_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      ranked_snapshots: {
        Row: {
          captured_at: string
          division: string
          id: number
          league_points: number
          losses: number
          queue_type: string
          riot_account_id: number
          tier: string
          wins: number
        }
        Insert: {
          captured_at?: string
          division: string
          id?: never
          league_points: number
          losses: number
          queue_type: string
          riot_account_id: number
          tier: string
          wins: number
        }
        Update: {
          captured_at?: string
          division?: string
          id?: never
          league_points?: number
          losses?: number
          queue_type?: string
          riot_account_id?: number
          tier?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranked_snapshots_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      riot_accounts: {
        Row: {
          created_at: string
          game_name: string
          id: number
          is_primary: boolean
          last_synced_at: string | null
          platform_route: string
          profile_id: string
          puuid: string
          regional_route: string
          summoner_id: string | null
          sync_status: string
          tag_line: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          game_name: string
          id?: never
          is_primary?: boolean
          last_synced_at?: string | null
          platform_route: string
          profile_id: string
          puuid: string
          regional_route: string
          summoner_id?: string | null
          sync_status?: string
          tag_line: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          game_name?: string
          id?: never
          is_primary?: boolean
          last_synced_at?: string | null
          platform_route?: string
          profile_id?: string
          puuid?: string
          regional_route?: string
          summoner_id?: string | null
          sync_status?: string
          tag_line?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riot_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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

