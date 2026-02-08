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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_admins: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      ausencias: {
        Row: {
          absence_type: Database["public"]["Enums"]["absence_type"]
          club_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          player_id: string | null
          reason: string | null
          team_id: string
        }
        Insert: {
          absence_type?: Database["public"]["Enums"]["absence_type"]
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          player_id?: string | null
          reason?: string | null
          team_id: string
        }
        Update: {
          absence_type?: Database["public"]["Enums"]["absence_type"]
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          player_id?: string | null
          reason?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean
          language: string | null
          meta_description: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          language?: string | null
          meta_description?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          language?: string | null
          meta_description?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          name_en: string | null
          name_it: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_en?: string | null
          name_it?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_en?: string | null
          name_it?: string | null
          slug?: string
        }
        Relationships: []
      }
      club_invitations: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string
          id: string
          role: string
          short_code: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          role?: string
          short_code?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          role?: string
          short_code?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_settings: {
        Row: {
          accent_color: string
          club_name: string
          created_at: string | null
          font_family: string
          id: string
          logo_url: string | null
          primary_color: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          club_name?: string
          created_at?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          club_name?: string
          created_at?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          accent_color: string
          created_at: string
          created_by: string | null
          font_family: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string
          responsibility_code: string | null
          responsibility_code_updated_at: string | null
          responsible_person_email: string | null
          responsible_person_name: string | null
          terms_and_conditions: string | null
          terms_updated_at: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          created_by?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string
          responsibility_code?: string | null
          responsibility_code_updated_at?: string | null
          responsible_person_email?: string | null
          responsible_person_name?: string | null
          terms_and_conditions?: string | null
          terms_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          created_by?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string
          responsibility_code?: string | null
          responsibility_code_updated_at?: string | null
          responsible_person_email?: string | null
          responsible_person_name?: string | null
          terms_and_conditions?: string | null
          terms_updated_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          language: string
          token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          language?: string
          token: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          language?: string
          token?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          club_id: string | null
          coach_submissions: Json | null
          confirmed_players: string[] | null
          created_at: string | null
          created_by: string | null
          date: string
          declined_players: string[] | null
          departure_time: string | null
          destination: string | null
          id: string
          invited_players: string[] | null
          is_recurring: boolean | null
          keep_forever: boolean | null
          location: string
          notes: string | null
          opponent: string | null
          parent_event_id: string | null
          player_returns: Json | null
          player_stops: Json | null
          recurring_end_date: string | null
          recurring_pattern: string | null
          selected_teams: string[] | null
          stops: Json | null
          team_id: string
          time: string
          title: string
          total_passengers: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          club_id?: string | null
          coach_submissions?: Json | null
          confirmed_players?: string[] | null
          created_at?: string | null
          created_by?: string | null
          date: string
          declined_players?: string[] | null
          departure_time?: string | null
          destination?: string | null
          id?: string
          invited_players?: string[] | null
          is_recurring?: boolean | null
          keep_forever?: boolean | null
          location: string
          notes?: string | null
          opponent?: string | null
          parent_event_id?: string | null
          player_returns?: Json | null
          player_stops?: Json | null
          recurring_end_date?: string | null
          recurring_pattern?: string | null
          selected_teams?: string[] | null
          stops?: Json | null
          team_id: string
          time: string
          title: string
          total_passengers?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          club_id?: string | null
          coach_submissions?: Json | null
          confirmed_players?: string[] | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          declined_players?: string[] | null
          departure_time?: string | null
          destination?: string | null
          id?: string
          invited_players?: string[] | null
          is_recurring?: boolean | null
          keep_forever?: boolean | null
          location?: string
          notes?: string | null
          opponent?: string | null
          parent_event_id?: string | null
          player_returns?: Json | null
          player_stops?: Json | null
          recurring_end_date?: string | null
          recurring_pattern?: string | null
          selected_teams?: string[] | null
          stops?: Json | null
          team_id?: string
          time?: string
          title?: string
          total_passengers?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_categories: {
        Row: {
          created_at: string
          description_en: string | null
          description_es: string | null
          description_it: string | null
          icon: string | null
          id: string
          name_en: string
          name_es: string
          name_it: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_it?: string | null
          icon?: string | null
          id?: string
          name_en: string
          name_es: string
          name_it: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_it?: string | null
          icon?: string | null
          id?: string
          name_en?: string
          name_es?: string
          name_it?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      exercise_scopes: {
        Row: {
          created_at: string
          description_en: string | null
          description_es: string | null
          description_it: string | null
          id: string
          name_en: string
          name_es: string
          name_it: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_it?: string | null
          id?: string
          name_en: string
          name_es: string
          name_it: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_it?: string | null
          id?: string
          name_en?: string
          name_es?: string
          name_it?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category_id: string
          created_at: string
          diagram_url: string | null
          difficulty: number
          how_it_works_en: string | null
          how_it_works_es: string | null
          how_it_works_it: string | null
          id: string
          image_url: string | null
          is_published: boolean
          max_players: number | null
          min_players: number | null
          order_index: number
          purpose_en: string | null
          purpose_es: string | null
          purpose_it: string | null
          requirements_en: string | null
          requirements_es: string | null
          requirements_it: string | null
          scope_id: string
          slug: string
          title_en: string
          title_es: string
          title_it: string
          updated_at: string
          variations_en: string | null
          variations_es: string | null
          variations_it: string | null
          video_url: string | null
          view_count: number
        }
        Insert: {
          category_id: string
          created_at?: string
          diagram_url?: string | null
          difficulty?: number
          how_it_works_en?: string | null
          how_it_works_es?: string | null
          how_it_works_it?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          max_players?: number | null
          min_players?: number | null
          order_index?: number
          purpose_en?: string | null
          purpose_es?: string | null
          purpose_it?: string | null
          requirements_en?: string | null
          requirements_es?: string | null
          requirements_it?: string | null
          scope_id: string
          slug: string
          title_en: string
          title_es: string
          title_it: string
          updated_at?: string
          variations_en?: string | null
          variations_es?: string | null
          variations_it?: string | null
          video_url?: string | null
          view_count?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          diagram_url?: string | null
          difficulty?: number
          how_it_works_en?: string | null
          how_it_works_es?: string | null
          how_it_works_it?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          max_players?: number | null
          min_players?: number | null
          order_index?: number
          purpose_en?: string | null
          purpose_es?: string | null
          purpose_it?: string | null
          requirements_en?: string | null
          requirements_es?: string | null
          requirements_it?: string | null
          scope_id?: string
          slug?: string
          title_en?: string
          title_es?: string
          title_it?: string
          updated_at?: string
          variations_en?: string | null
          variations_es?: string | null
          variations_it?: string | null
          video_url?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "exercise_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          recipient_id: string
          related_event_id: string | null
          related_player_id: string | null
          sender_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          recipient_id: string
          related_event_id?: string | null
          related_player_id?: string | null
          sender_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_id?: string
          related_event_id?: string | null
          related_player_id?: string | null
          sender_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_player_id_fkey"
            columns: ["related_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ratings: {
        Row: {
          club_id: string | null
          communication_cooperation: number
          created_at: string | null
          decision_making: number
          effort_attitude: number
          event_id: string | null
          id: string
          leadership_initiative: number
          notes: string | null
          player_id: string
          rated_by: string | null
          rating_date: string
          season_id: string | null
          team_id: string
          technical_execution: number
        }
        Insert: {
          club_id?: string | null
          communication_cooperation: number
          created_at?: string | null
          decision_making: number
          effort_attitude: number
          event_id?: string | null
          id?: string
          leadership_initiative: number
          notes?: string | null
          player_id: string
          rated_by?: string | null
          rating_date?: string
          season_id?: string | null
          team_id: string
          technical_execution: number
        }
        Update: {
          club_id?: string | null
          communication_cooperation?: number
          created_at?: string | null
          decision_making?: number
          effort_attitude?: number
          event_id?: string | null
          id?: string
          leadership_initiative?: number
          notes?: string | null
          player_id?: string
          rated_by?: string | null
          rating_date?: string
          season_id?: string | null
          team_id?: string
          technical_execution?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          additional_measurements: Json | null
          birth_year: number | null
          club_id: string | null
          created_at: string | null
          height: number | null
          height_measured_at: string | null
          id: string
          name: string
          number: number | null
          phone: string
          phone_type: string | null
          phone2: string | null
          phone2_type: string | null
          photo_url: string | null
          surname1: string | null
          surname2: string | null
          teams: string[] | null
          updated_at: string | null
        }
        Insert: {
          additional_measurements?: Json | null
          birth_year?: number | null
          club_id?: string | null
          created_at?: string | null
          height?: number | null
          height_measured_at?: string | null
          id?: string
          name: string
          number?: number | null
          phone: string
          phone_type?: string | null
          phone2?: string | null
          phone2_type?: string | null
          photo_url?: string | null
          surname1?: string | null
          surname2?: string | null
          teams?: string[] | null
          updated_at?: string | null
        }
        Update: {
          additional_measurements?: Json | null
          birth_year?: number | null
          club_id?: string | null
          created_at?: string | null
          height?: number | null
          height_measured_at?: string | null
          id?: string
          name?: string
          number?: number | null
          phone?: string
          phone_type?: string | null
          phone2?: string | null
          phone2_type?: string | null
          photo_url?: string | null
          surname1?: string | null
          surname2?: string | null
          teams?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_teams: string[] | null
          created_at: string | null
          director_declaration_accepted_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          responsibility_code_accepted_at: string | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_teams?: string[] | null
          created_at?: string | null
          director_declaration_accepted_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          responsibility_code_accepted_at?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_teams?: string[] | null
          created_at?: string | null
          director_declaration_accepted_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          responsibility_code_accepted_at?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          download_count: number
          file_name: string
          file_path: string
          file_size: number | null
          icon: string | null
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          download_count?: number
          file_name: string
          file_path: string
          file_size?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          download_count?: number
          file_name?: string
          file_path?: string
          file_size?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          club_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      stops: {
        Row: {
          club_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "stops_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          club_id: string | null
          coach: string
          color: string
          created_at: string | null
          created_by: string | null
          gender: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          club_id?: string | null
          coach: string
          color?: string
          created_at?: string | null
          created_by?: string | null
          gender?: string | null
          id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          club_id?: string | null
          coach?: string
          color?: string
          created_at?: string | null
          created_by?: string | null
          gender?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits_date: string
          credits_remaining: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_date?: string
          credits_remaining?: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_date?: string
          credits_remaining?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_registrations: {
        Row: {
          club_name: string | null
          email: string
          email_sent_at: string | null
          id: string
          last_activity_at: string | null
          name: string | null
          notes: string | null
          profile_type: string
          registered_at: string
          user_id: string | null
        }
        Insert: {
          club_name?: string | null
          email: string
          email_sent_at?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string | null
          notes?: string | null
          profile_type: string
          registered_at?: string
          user_id?: string | null
        }
        Update: {
          club_name?: string | null
          email?: string
          email_sent_at?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string | null
          notes?: string | null
          profile_type?: string
          registered_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          data_deleted_at: string | null
          grace_period_ends_at: string | null
          id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          data_deleted_at?: string | null
          grace_period_ends_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          data_deleted_at?: string | null
          grace_period_ends_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_users: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_club_invitation: { Args: { _token: string }; Returns: Json }
      accept_club_invitation_by_code: { Args: { _code: string }; Returns: Json }
      cleanup_expired_verification_tokens: { Args: never; Returns: undefined }
      cleanup_old_events: { Args: never; Returns: number }
      consume_credit: { Args: { _user_id: string }; Returns: boolean }
      generate_short_code: { Args: never; Returns: string }
      get_grace_period_days_remaining: {
        Args: { _user_id: string }
        Returns: number
      }
      get_invitation_preview: {
        Args: { _token: string }
        Returns: {
          club_id: string
          club_name: string
          expires_at: string
          responsibility_code: string
          responsible_person_name: string
          role: string
          used_at: string
        }[]
      }
      get_invitation_preview_by_code: {
        Args: { _code: string }
        Returns: {
          club_id: string
          club_name: string
          expires_at: string
          responsibility_code: string
          responsible_person_name: string
          role: string
          used_at: string
        }[]
      }
      get_user_club_id: { Args: { _user_id: string }; Returns: string }
      get_user_credits: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: { Args: { _email: string }; Returns: boolean }
      is_club_director: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_director: { Args: { _user_id: string }; Returns: boolean }
      is_in_grace_period: { Args: { _user_id: string }; Returns: boolean }
      is_vip_user: { Args: { _email: string }; Returns: boolean }
      user_belongs_to_club: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      absence_type: "justified" | "unjustified"
      app_role: "coach" | "director"
      subscription_status: "free" | "premium" | "vip"
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
      absence_type: ["justified", "unjustified"],
      app_role: ["coach", "director"],
      subscription_status: ["free", "premium", "vip"],
    },
  },
} as const
