/**
 * Types de la base de donnees, generes depuis le projet Supabase.
 *
 * A REGENERER apres chaque migration :
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string;
          admin_user_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          admin_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          entity_id?: string | null;
          entity_type: string;
        };
        Update: Partial<{
          action: string;
          admin_user_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          entity_id: string | null;
          entity_type: string;
        }>;
        Relationships: [];
      };
      ai_providers: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          key: string;
          name: string;
          sort_order: number;
        };
        Insert: { key: string; name: string; is_active?: boolean; sort_order?: number };
        Update: Partial<{ key: string; name: string; is_active: boolean; sort_order: number }>;
        Relationships: [];
      };
      app_config: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: { key: string; value: Json; description?: string | null; is_public?: boolean };
        Update: Partial<{ value: Json; description: string | null; is_public: boolean }>;
        Relationships: [];
      };
      app_sessions: {
        Row: {
          auth_session_id: string;
          created_at: string;
          device_label: string | null;
          id: string;
          last_seen_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          status: Database['public']['Enums']['session_status'];
          user_id: string;
        };
        Insert: {
          auth_session_id: string;
          user_id: string;
          device_label?: string | null;
          status?: Database['public']['Enums']['session_status'];
        };
        Update: Partial<{
          device_label: string | null;
          last_seen_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          status: Database['public']['Enums']['session_status'];
        }>;
        Relationships: [];
      };
      categories: {
        Row: {
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          icon_key: string | null;
          id: string;
          is_visible: boolean;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          parent_id: string | null;
          short_description: string | null;
          slug: string;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          slug: string;
          parent_id?: string | null;
          short_description?: string | null;
          icon_key?: string | null;
          cover_url?: string | null;
          status?: Database['public']['Enums']['content_status'];
          sort_order?: number;
        };
        Update: Partial<{
          name: string;
          slug: string;
          mode: Database['public']['Enums']['app_mode'];
          parent_id: string | null;
          short_description: string | null;
          icon_key: string | null;
          cover_url: string | null;
          status: Database['public']['Enums']['content_status'];
          sort_order: number;
          updated_by: string | null;
        }>;
        Relationships: [];
      };
      copy_events: {
        Row: {
          created_at: string;
          id: string;
          prompt_id: string;
          provider_key: string | null;
          surface: string | null;
          user_id: string | null;
          variant_id: string | null;
          version_id: string | null;
        };
        Insert: {
          prompt_id: string;
          user_id?: string | null;
          provider_key?: string | null;
          surface?: string | null;
          variant_id?: string | null;
          version_id?: string | null;
        };
        Update: Partial<{ surface: string | null }>;
        Relationships: [];
      };
      entitlements: {
        Row: {
          access_type: Database['public']['Enums']['access_type'];
          created_at: string;
          expires_at: string | null;
          id: string;
          product_id: string;
          revoked_reason: string | null;
          source_purchase_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['entitlement_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          product_id: string;
          user_id: string;
          access_type?: Database['public']['Enums']['access_type'];
          status?: Database['public']['Enums']['entitlement_status'];
          source_purchase_id?: string | null;
          expires_at?: string | null;
        };
        Update: Partial<{
          status: Database['public']['Enums']['entitlement_status'];
          revoked_reason: string | null;
          expires_at: string | null;
        }>;
        Relationships: [];
      };
      favorites: {
        Row: { created_at: string; prompt_id: string; user_id: string };
        Insert: { prompt_id: string; user_id: string };
        Update: Partial<{ prompt_id: string; user_id: string }>;
        Relationships: [];
      };
      pending_licenses: {
        Row: {
          adopted_at: string | null;
          adopted_purchase_id: string | null;
          chariow_customer_id: string | null;
          chariow_license_id: string;
          chariow_product_id: string | null;
          created_at: string;
          customer_email: string;
          id: string;
          issued_at: string;
          license_fingerprint: string;
          source_event_id: string | null;
        };
        Insert: {
          chariow_license_id: string;
          customer_email: string;
          license_fingerprint: string;
          issued_at: string;
          chariow_customer_id?: string | null;
          chariow_product_id?: string | null;
          adopted_purchase_id?: string | null;
          adopted_at?: string | null;
          source_event_id?: string | null;
        };
        Update: Partial<{ adopted_purchase_id: string | null; adopted_at: string | null }>;
        Relationships: [];
      };
      products: {
        Row: {
          access_type: Database['public']['Enums']['access_type'];
          chariow_product_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          price_amount: number | null;
          price_currency: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: { name: string; slug: string; chariow_product_id?: string | null };
        Update: Partial<{ name: string; is_active: boolean; chariow_product_id: string | null }>;
        Relationships: [];
      };
      profiles: {
        Row: {
          account_status: Database['public']['Enums']['account_status'];
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
          last_seen_at: string | null;
          preferred_provider_key: string | null;
          updated_at: string;
        };
        Insert: { id: string; email: string; display_name?: string | null };
        Update: Partial<{
          display_name: string | null;
          avatar_url: string | null;
          preferred_provider_key: string | null;
          last_seen_at: string | null;
        }>;
        Relationships: [];
      };
      prompt_media: {
        Row: {
          alt: string | null;
          created_at: string;
          created_by: string | null;
          height: number | null;
          id: string;
          kind: Database['public']['Enums']['media_kind'];
          prompt_id: string;
          sort_order: number;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          prompt_id: string;
          storage_path: string;
          kind?: Database['public']['Enums']['media_kind'];
          alt?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
        };
        Update: Partial<{ storage_path: string; alt: string | null; sort_order: number }>;
        Relationships: [];
      };
      prompt_questions: {
        Row: {
          choices: Json;
          created_at: string;
          default_value: string | null;
          id: string;
          is_active: boolean;
          prompt_id: string;
          question: string;
          sort_order: number;
          trigger_note: string | null;
          updated_at: string;
          variable: string;
        };
        Insert: {
          prompt_id: string;
          question: string;
          sort_order: number;
          variable: string;
          choices?: Json;
          default_value?: string | null;
          is_active?: boolean;
          trigger_note?: string | null;
        };
        Update: Partial<{
          question: string;
          sort_order: number;
          variable: string;
          choices: Json;
          default_value: string | null;
          is_active: boolean;
          trigger_note: string | null;
        }>;
        Relationships: [];
      };
      prompt_variants: {
        Row: {
          compatibility: Database['public']['Enums']['compatibility_level'];
          compatibility_note: string | null;
          created_at: string;
          id: string;
          prompt_id: string;
          provider_id: string;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          updated_at: string;
        };
        Insert: {
          prompt_id: string;
          provider_id: string;
          compatibility?: Database['public']['Enums']['compatibility_level'];
          compatibility_note?: string | null;
          status?: Database['public']['Enums']['content_status'];
        };
        Update: Partial<{
          compatibility: Database['public']['Enums']['compatibility_level'];
          compatibility_note: string | null;
          status: Database['public']['Enums']['content_status'];
        }>;
        Relationships: [];
      };
      prompt_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          internal_notes: string | null;
          is_current: boolean;
          payload: string;
          published_at: string | null;
          qcm: Json;
          qcm_trigger: string | null;
          status: Database['public']['Enums']['version_status'];
          updated_at: string;
          variant_id: string;
          version_label: string;
        };
        Insert: {
          variant_id: string;
          payload: string;
          version_label?: string;
          qcm?: Json;
          qcm_trigger?: string | null;
          status?: Database['public']['Enums']['version_status'];
          is_current?: boolean;
        };
        Update: Partial<{
          payload: string;
          qcm: Json;
          status: Database['public']['Enums']['version_status'];
          is_current: boolean;
        }>;
        Relationships: [];
      };
      prompts: {
        Row: {
          admin_notes: string | null;
          avoid_rules: string | null;
          category_id: string | null;
          command: string;
          created_at: string;
          created_by: string | null;
          default_values: string | null;
          expected_input: string | null;
          expected_output: string | null;
          external_ref: string | null;
          fallback_if_incomplete: string | null;
          id: string;
          input_examples: Database['public']['Enums']['input_example_kind'][];
          input_type: Database['public']['Enums']['input_type'];
          intention: string | null;
          is_featured: boolean;
          is_free: boolean;
          is_new: boolean;
          limitations: string | null;
          minimal_context: string | null;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          optional_variables: string[];
          output_format: string | null;
          output_formats: Database['public']['Enums']['output_format_kind'][];
          output_type: Database['public']['Enums']['output_type'];
          preserve_rules: string | null;
          priority: string;
          published_at: string | null;
          quality_criteria: string | null;
          required_variables: string[];
          result_summary: string | null;
          risk_level: Database['public']['Enums']['risk_level'];
          search_text: string | null;
          short_description: string;
          show_image_card: boolean;
          slug: string;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          sufficient_context: string | null;
          tags: string[];
          thumbnail_spec: string | null;
          updated_at: string;
          updated_by: string | null;
          use_cases: string[];
        };
        Insert: {
          command: string;
          name: string;
          slug: string;
          mode: Database['public']['Enums']['app_mode'];
          short_description: string;
          category_id?: string | null;
          status?: Database['public']['Enums']['content_status'];
        };
        Update: Partial<{
          command: string;
          name: string;
          slug: string;
          mode: Database['public']['Enums']['app_mode'];
          short_description: string;
          intention: string | null;
          use_cases: string[];
          tags: string[];
          category_id: string | null;
          expected_input: string | null;
          minimal_context: string | null;
          sufficient_context: string | null;
          required_variables: string[];
          optional_variables: string[];
          default_values: string | null;
          expected_output: string | null;
          output_format: string | null;
          quality_criteria: string | null;
          preserve_rules: string | null;
          avoid_rules: string | null;
          limitations: string | null;
          fallback_if_incomplete: string | null;
          input_type: Database['public']['Enums']['input_type'];
          output_type: Database['public']['Enums']['output_type'];
          input_examples: Database['public']['Enums']['input_example_kind'][];
          output_formats: Database['public']['Enums']['output_format_kind'][];
          result_summary: string | null;
          risk_level: Database['public']['Enums']['risk_level'];
          priority: string;
          status: Database['public']['Enums']['content_status'];
          is_free: boolean;
          is_featured: boolean;
          is_new: boolean;
          show_image_card: boolean;
          thumbnail_spec: string | null;
          admin_notes: string | null;
          sort_order: number;
          published_at: string | null;
          updated_by: string | null;
        }>;
        Relationships: [];
      };
      purchases: {
        Row: {
          amount: number | null;
          chariow_customer_id: string | null;
          claimed_at: string | null;
          created_at: string;
          currency: string | null;
          customer_email: string | null;
          external_order_id: string;
          id: string;
          license_fingerprint: string | null;
          product_id: string | null;
          purchased_at: string | null;
          refunded_at: string | null;
          source_event_id: string | null;
          status: Database['public']['Enums']['purchase_status'];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          external_order_id: string;
          product_id?: string | null;
          user_id?: string | null;
          customer_email?: string | null;
          license_fingerprint?: string | null;
          status?: Database['public']['Enums']['purchase_status'];
        };
        Update: Partial<{
          user_id: string | null;
          claimed_at: string | null;
          status: Database['public']['Enums']['purchase_status'];
          refunded_at: string | null;
        }>;
        Relationships: [];
      };
      rate_limit_counters: {
        Row: { bucket: string; count: number; subject: string; window_start: string };
        Insert: { bucket: string; subject: string; window_start: string; count?: number };
        Update: Partial<{ count: number }>;
        Relationships: [];
      };
      recent_items: {
        Row: {
          copy_count: number;
          last_copied_at: string | null;
          last_viewed_at: string | null;
          prompt_id: string;
          user_id: string;
        };
        Insert: { prompt_id: string; user_id: string; last_viewed_at?: string | null };
        Update: Partial<{ last_viewed_at: string | null; last_copied_at: string | null }>;
        Relationships: [];
      };
      roles: {
        Row: {
          description: string | null;
          key: Database['public']['Enums']['app_role'];
          label: string;
        };
        Insert: { key: Database['public']['Enums']['app_role']; label: string };
        Update: Partial<{ label: string; description: string | null }>;
        Relationships: [];
      };
      security_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          ip_hash: string | null;
          meta: Json | null;
          user_id: string | null;
        };
        Insert: {
          event_type: string;
          user_id?: string | null;
          ip_hash?: string | null;
          meta?: Json | null;
        };
        Update: Partial<{ meta: Json | null }>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Insert: {
          user_id: string;
          role: Database['public']['Enums']['app_role'];
          granted_by?: string | null;
        };
        Update: Partial<{ role: Database['public']['Enums']['app_role'] }>;
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          event_type: string | null;
          external_event_id: string;
          id: string;
          payload: Json;
          processed_at: string | null;
          processing_error: string | null;
          signature_valid: boolean;
          source: string;
        };
        Insert: {
          external_event_id: string;
          payload: Json;
          source?: string;
          event_type?: string | null;
          signature_valid?: boolean;
        };
        Update: Partial<{ processed_at: string | null; processing_error: string | null }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_analytics_breakdown: {
        Args: { p_days?: number };
        Returns: { dimension: string; key: string; label: string | null; copies: number }[];
      };
      admin_analytics_daily: {
        Args: { p_days?: number };
        Returns: { day: string; copies: number }[];
      };
      admin_analytics_overview: {
        Args: { p_days?: number };
        Returns: {
          copies_period: number;
          copies_total: number;
          active_members: number;
          members_with_access: number;
          purchases_completed: number;
          purchases_unclaimed: number;
          prompts_published: number;
          prompts_copied: number;
        }[];
      };
      admin_analytics_top_prompts: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          prompt_id: string;
          command: string;
          name: string;
          mode: Database['public']['Enums']['app_mode'];
          copies: number;
          members: number;
        }[];
      };
      admin_analytics_unused_prompts: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          prompt_id: string;
          command: string;
          name: string;
          mode: Database['public']['Enums']['app_mode'];
          published_at: string | null;
        }[];
      };
      admin_get_prompt_versions: {
        Args: { p_prompt_id: string };
        Returns: {
          variant_id: string;
          provider_key: string;
          provider_name: string;
          compatibility: Database['public']['Enums']['compatibility_level'];
          variant_status: Database['public']['Enums']['content_status'];
          version_id: string | null;
          version_label: string | null;
          payload: string | null;
          qcm: Json | null;
          qcm_trigger: string | null;
        }[];
      };
      admin_new_prompt_version: {
        Args: {
          p_variant_id: string;
          p_payload: string;
          p_qcm?: Json;
          p_qcm_trigger?: string;
        };
        Returns: string;
      };
      admin_publish_prompt: { Args: { p_prompt_id: string }; Returns: undefined };
      admin_set_access: {
        Args: { p_user_id: string; p_active: boolean; p_reason?: string };
        Returns: undefined;
      };
      admin_set_category_status: {
        Args: {
          p_category_id: string;
          p_status: Database['public']['Enums']['content_status'];
        };
        Returns: undefined;
      };
      admin_set_prompt_status: {
        Args: {
          p_prompt_id: string;
          p_status: Database['public']['Enums']['content_status'];
        };
        Returns: undefined;
      };
      consume_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_subject: string; p_window_seconds: number };
        Returns: boolean;
      };
      current_app_session_is_active: { Args: Record<string, never>; Returns: boolean };
      has_active_entitlement: { Args: { p_user_id?: string }; Returns: boolean };
      has_role: { Args: { p_role: Database['public']['Enums']['app_role'] }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      process_chariow_license: {
        Args: { p_payload: Json; p_source_event_id: string; p_license_fingerprint: string };
        Returns: undefined;
      };
      process_chariow_sale: {
        Args: { p_payload: Json; p_source_event_id: string };
        Returns: string;
      };
      purge_rate_limit_counters: { Args: Record<string, never>; Returns: undefined };
      register_app_session: { Args: { p_device_label?: string }; Returns: number };
      revoke_current_app_session: { Args: Record<string, never>; Returns: undefined };
      resolve_prompt: {
        Args: { p_prompt_id: string; p_provider_key: string; p_surface?: string };
        Returns: { command: string; payload: string; version_id: string; version_label: string }[];
      };
      track_prompt_view: { Args: { p_prompt_id: string }; Returns: undefined };
    };
    Enums: {
      access_type: 'lifetime' | 'subscription';
      account_status: 'active' | 'suspended';
      app_mode: 'image' | 'texte' | 'analyse';
      app_role: 'user' | 'admin' | 'super_admin';
      compatibility_level: 'excellent' | 'bon' | 'partiel' | 'non_supporte';
      content_status: 'draft' | 'published' | 'archived';
      entitlement_status: 'active' | 'suspended' | 'revoked';
      input_example_kind:
        | 'photo_produit'
        | 'photo_lieu'
        | 'photo_personne'
        | 'capture_ecran'
        | 'document_pdf'
        | 'texte_brut'
        | 'tableau'
        | 'url'
        | 'brief';
      input_type: 'image' | 'text' | 'document' | 'mixed';
      media_kind: 'thumbnail' | 'before' | 'after' | 'example' | 'cover';
      output_format_kind:
        | 'image'
        | 'texte'
        | 'pdf'
        | 'document'
        | 'presentation'
        | 'tableur'
        | 'code'
        | 'audio'
        | 'video';
      output_type: 'image' | 'text' | 'analysis';
      purchase_status: 'pending' | 'completed' | 'refunded' | 'cancelled';
      risk_level: 'faible' | 'moyen' | 'eleve';
      session_status: 'active' | 'revoked' | 'expired';
      version_status: 'draft' | 'published' | 'retired';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
