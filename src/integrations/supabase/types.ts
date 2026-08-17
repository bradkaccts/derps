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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      match_messages: {
        Row: {
          body: string
          id: string
          match_id: string
          sender_user_id: string
          sent_at: string
          type: string
        }
        Insert: {
          body: string
          id?: string
          match_id: string
          sender_user_id: string
          sent_at?: string
          type?: string
        }
        Update: {
          body?: string
          id?: string
          match_id?: string
          sender_user_id?: string
          sent_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          expires_at: string | null
          first_message_at: string | null
          id: string
          matched_at: string
          meetup_count: number
          pet_a_id: string
          pet_b_id: string
          state: string
          updated_at: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          first_message_at?: string | null
          id?: string
          matched_at?: string
          meetup_count?: number
          pet_a_id: string
          pet_b_id: string
          state?: string
          updated_at?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          first_message_at?: string | null
          id?: string
          matched_at?: string
          meetup_count?: number
          pet_a_id?: string
          pet_b_id?: string
          state?: string
          updated_at?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_pet_a_id_fkey"
            columns: ["pet_a_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_pet_b_id_fkey"
            columns: ["pet_b_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      meetups: {
        Row: {
          checkin_a_at: string | null
          checkin_b_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          match_id: string
          proposed_by_user_id: string
          recurrence_rule: string | null
          scheduled_start: string
          state: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          checkin_a_at?: string | null
          checkin_b_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          match_id: string
          proposed_by_user_id: string
          recurrence_rule?: string | null
          scheduled_start: string
          state?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          checkin_a_at?: string | null
          checkin_b_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          match_id?: string
          proposed_by_user_id?: string
          recurrence_rule?: string | null
          scheduled_start?: string
          state?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_personalities: {
        Row: {
          completed_at: string | null
          confidence: Json
          created_at: string
          derivation_version: string
          history: Json
          pet_id: string
          quiz_version: string
          traits: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          confidence?: Json
          created_at?: string
          derivation_version?: string
          history?: Json
          pet_id: string
          quiz_version?: string
          traits?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          confidence?: Json
          created_at?: string
          derivation_version?: string
          history?: Json
          pet_id?: string
          quiz_version?: string
          traits?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_personalities_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_preferences: {
        Row: {
          availability_windows: string[]
          created_at: string
          cross_species_opt_in: boolean
          hard_filters: Json
          intact_opt_out: boolean
          max_travel_miles: number
          pet_id: string
          preferred_meetup_types: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_windows?: string[]
          created_at?: string
          cross_species_opt_in?: boolean
          hard_filters?: Json
          intact_opt_out?: boolean
          max_travel_miles?: number
          pet_id: string
          preferred_meetup_types?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_windows?: string[]
          created_at?: string
          cross_species_opt_in?: boolean
          hard_filters?: Json
          intact_opt_out?: boolean
          max_travel_miles?: number
          pet_id?: string
          preferred_meetup_types?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_preferences_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: string
          age_category: string
          age_weeks: number
          bio: string
          breed: string
          created_at: string
          fun_fact: string
          gender: string
          health_verified: boolean
          id: string
          intact: boolean
          is_discoverable: boolean
          last_active_at: string
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          photos: string[]
          safety_hold: boolean
          social_status: string
          species: string
          updated_at: string
          user_id: string
          vaccination_attested_at: string | null
          vaccination_expires_at: string | null
          vibes: string[]
        }
        Insert: {
          age?: string
          age_category?: string
          age_weeks?: number
          bio?: string
          breed?: string
          created_at?: string
          fun_fact?: string
          gender?: string
          health_verified?: boolean
          id?: string
          intact?: boolean
          is_discoverable?: boolean
          last_active_at?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          name: string
          photos?: string[]
          safety_hold?: boolean
          social_status?: string
          species?: string
          updated_at?: string
          user_id: string
          vaccination_attested_at?: string | null
          vaccination_expires_at?: string | null
          vibes?: string[]
        }
        Update: {
          age?: string
          age_category?: string
          age_weeks?: number
          bio?: string
          breed?: string
          created_at?: string
          fun_fact?: string
          gender?: string
          health_verified?: boolean
          id?: string
          intact?: boolean
          is_discoverable?: boolean
          last_active_at?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          photos?: string[]
          safety_hold?: boolean
          social_status?: string
          species?: string
          updated_at?: string
          user_id?: string
          vaccination_attested_at?: string | null
          vaccination_expires_at?: string | null
          vibes?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          phone: string | null
          phone_verified_at: string | null
          trust_score: number
          updated_at: string
          verification_tier: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          trust_score?: number
          updated_at?: string
          verification_tier?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          trust_score?: number
          updated_at?: string
          verification_tier?: number
        }
        Relationships: []
      }
      swipes: {
        Row: {
          actor_pet_id: string
          actor_user_id: string
          created_at: string
          direction: string
          feature_version: string | null
          id: string
          model_version: string | null
          score_at_impression: number | null
          strategy_id: string | null
          target_pet_id: string
        }
        Insert: {
          actor_pet_id: string
          actor_user_id: string
          created_at?: string
          direction: string
          feature_version?: string | null
          id?: string
          model_version?: string | null
          score_at_impression?: number | null
          strategy_id?: string | null
          target_pet_id: string
        }
        Update: {
          actor_pet_id?: string
          actor_user_id?: string
          created_at?: string
          direction?: string
          feature_version?: string | null
          id?: string
          model_version?: string | null
          score_at_impression?: number | null
          strategy_id?: string | null
          target_pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_actor_pet_id_fkey"
            columns: ["actor_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_target_pet_id_fkey"
            columns: ["target_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_state: {
        Row: {
          data: Json
          key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      incoming_boops: {
        Args: { _pet_id: string }
        Returns: {
          actor_pet_id: string
          created_at: string
          direction: string
        }[]
      }
      is_match_participant: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
