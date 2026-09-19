/**
 * Types de la base de donnees, generes depuis le schema.
 *
 * A REGENERER apres chaque migration. La commande de reference, quand on a
 * les identifiants du projet :
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > lib/supabase/database.types.ts
 *
 * Sans identifiants, le schema est quand meme connu : la production est
 * construite des migrations de ce depot et de rien d'autre. Les rejouer sur
 * un Postgres jetable donne le meme schema, donc le meme typage. C'est le
 * chemin qui a produit ce fichier :
 *
 *   # 1. Un cluster jetable, avec le stub Supabase puis LES SEULES migrations.
 *   #    Les seules migrations, et non `tests/db/run.sh` en entier : la suite
 *   #    de tests cree `tests_assert`, `tests_login` et `tests_logout` dans le
 *   #    schema public, et une generation faite par-dessus les fait entrer
 *   #    dans le typage — trois fonctions que la production ne connait pas et
 *   #    que le code croirait alors disponibles.
 *   #
 *   #    Le cluster doit ecouter en TCP : le generateur ne sait pas se
 *   #    connecter par socket unix.
 *   #
 *   # 2. Le generateur, appele en direct :
 *   npm install --no-save @supabase/postgres-meta
 *   PG_META_PORT=8125 \
 *   PG_META_DB_URL=postgresql://postgres@127.0.0.1:5434/raccourcia_types \
 *     node node_modules/@supabase/postgres-meta/dist/server/server.js &
 *   curl -s 'http://127.0.0.1:8125/generators/typescript?included_schemas=public'
 *
 * `supabase gen types --db-url` ferait le meme travail, mais en passant par
 * une image Docker : sans demon Docker il echoue sur « failed to connect to
 * the docker API », une erreur qui ne dit pas d'ou vient le probleme.
 * `postgres-meta` est le generateur que le CLI pilote ; l'appeler en direct
 * donne exactement la meme sortie.
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
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: string;
          admin_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
        };
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
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
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
          created_at?: string;
          device_label?: string | null;
          id?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: Database['public']['Enums']['session_status'];
          user_id: string;
        };
        Update: {
          auth_session_id?: string;
          created_at?: string;
          device_label?: string | null;
          id?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: Database['public']['Enums']['session_status'];
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description_long: string | null;
          external_ref: string | null;
          fallback_image_path: string | null;
          icon_key: string | null;
          id: string;
          is_visible: boolean;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          parent_id: string | null;
          search_norm: string | null;
          short_description: string | null;
          slug: string;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_long?: string | null;
          external_ref?: string | null;
          fallback_image_path?: string | null;
          icon_key?: string | null;
          id?: string;
          is_visible?: boolean;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          parent_id?: string | null;
          search_norm?: never;
          short_description?: string | null;
          slug: string;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_long?: string | null;
          external_ref?: string | null;
          fallback_image_path?: string | null;
          icon_key?: string | null;
          id?: string;
          is_visible?: boolean;
          mode?: Database['public']['Enums']['app_mode'];
          name?: string;
          parent_id?: string | null;
          search_norm?: never;
          short_description?: string | null;
          slug?: string;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey';
            columns: ['parent_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
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
          created_at?: string;
          id?: string;
          prompt_id: string;
          provider_key?: string | null;
          surface?: string | null;
          user_id?: string | null;
          variant_id?: string | null;
          version_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          prompt_id?: string;
          provider_key?: string | null;
          surface?: string | null;
          user_id?: string | null;
          variant_id?: string | null;
          version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'copy_events_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'copy_events_variant_id_fkey';
            columns: ['variant_id'];
            referencedRelation: 'prompt_variants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'copy_events_version_id_fkey';
            columns: ['version_id'];
            referencedRelation: 'prompt_versions';
            referencedColumns: ['id'];
          },
        ];
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
          access_type?: Database['public']['Enums']['access_type'];
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          product_id: string;
          revoked_reason?: string | null;
          source_purchase_id?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['entitlement_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_type?: Database['public']['Enums']['access_type'];
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          product_id?: string;
          revoked_reason?: string | null;
          source_purchase_id?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['entitlement_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entitlements_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entitlements_source_purchase_id_fkey';
            columns: ['source_purchase_id'];
            referencedRelation: 'purchases';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          prompt_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          prompt_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          prompt_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
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
          adopted_at?: string | null;
          adopted_purchase_id?: string | null;
          chariow_customer_id?: string | null;
          chariow_license_id: string;
          chariow_product_id?: string | null;
          created_at?: string;
          customer_email: string;
          id?: string;
          issued_at: string;
          license_fingerprint: string;
          source_event_id?: string | null;
        };
        Update: {
          adopted_at?: string | null;
          adopted_purchase_id?: string | null;
          chariow_customer_id?: string | null;
          chariow_license_id?: string;
          chariow_product_id?: string | null;
          created_at?: string;
          customer_email?: string;
          id?: string;
          issued_at?: string;
          license_fingerprint?: string;
          source_event_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pending_licenses_adopted_purchase_id_fkey';
            columns: ['adopted_purchase_id'];
            referencedRelation: 'purchases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pending_licenses_source_event_id_fkey';
            columns: ['source_event_id'];
            referencedRelation: 'webhook_events';
            referencedColumns: ['id'];
          },
        ];
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
        Insert: {
          access_type?: Database['public']['Enums']['access_type'];
          chariow_product_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          price_amount?: number | null;
          price_currency?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          access_type?: Database['public']['Enums']['access_type'];
          chariow_product_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_amount?: number | null;
          price_currency?: string | null;
          slug?: string;
          updated_at?: string;
        };
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
        Insert: {
          account_status?: Database['public']['Enums']['account_status'];
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email: string;
          id: string;
          last_seen_at?: string | null;
          preferred_provider_key?: string | null;
          updated_at?: string;
        };
        Update: {
          account_status?: Database['public']['Enums']['account_status'];
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
          last_seen_at?: string | null;
          preferred_provider_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_aliases: {
        Row: {
          alias_prompt_id: string;
          canonical_prompt_id: string;
          created_at: string;
          id: string;
          preset: NonNullable<Json>;
          updated_at: string;
        };
        Insert: {
          alias_prompt_id: string;
          canonical_prompt_id: string;
          created_at?: string;
          id?: string;
          preset?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          alias_prompt_id?: string;
          canonical_prompt_id?: string;
          created_at?: string;
          id?: string;
          preset?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_aliases_alias_prompt_id_fkey';
            columns: ['alias_prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prompt_aliases_canonical_prompt_id_fkey';
            columns: ['canonical_prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      prompt_field_choices: {
        Row: {
          field_id: string;
          id: string;
          libelle: string;
          position: number;
          valeur: string;
        };
        Insert: {
          field_id: string;
          id?: string;
          libelle: string;
          position?: number;
          valeur: string;
        };
        Update: {
          field_id?: string;
          id?: string;
          libelle?: string;
          position?: number;
          valeur?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_field_choices_field_id_fkey';
            columns: ['field_id'];
            referencedRelation: 'prompt_fields';
            referencedColumns: ['id'];
          },
        ];
      };
      prompt_fields: {
        Row: {
          cle: string;
          created_at: string;
          id: string;
          indication: string | null;
          kind: Database['public']['Enums']['prompt_field_kind'];
          libelle: string;
          position: number;
          prompt_id: string;
          requis: boolean;
        };
        Insert: {
          cle: string;
          created_at?: string;
          id?: string;
          indication?: string | null;
          kind?: Database['public']['Enums']['prompt_field_kind'];
          libelle: string;
          position: number;
          prompt_id: string;
          requis?: boolean;
        };
        Update: {
          cle?: string;
          created_at?: string;
          id?: string;
          indication?: string | null;
          kind?: Database['public']['Enums']['prompt_field_kind'];
          libelle?: string;
          position?: number;
          prompt_id?: string;
          requis?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_fields_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      prompt_likes: {
        Row: {
          created_at: string;
          prompt_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          prompt_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          prompt_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_likes_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
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
          alt?: string | null;
          created_at?: string;
          created_by?: string | null;
          height?: number | null;
          id?: string;
          kind?: Database['public']['Enums']['media_kind'];
          prompt_id: string;
          sort_order?: number;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          created_by?: string | null;
          height?: number | null;
          id?: string;
          kind?: Database['public']['Enums']['media_kind'];
          prompt_id?: string;
          sort_order?: number;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_media_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      prompt_questions: {
        Row: {
          choices: NonNullable<Json>;
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
          choices?: NonNullable<Json>;
          created_at?: string;
          default_value?: string | null;
          id?: string;
          is_active?: boolean;
          prompt_id: string;
          question: string;
          sort_order: number;
          trigger_note?: string | null;
          updated_at?: string;
          variable: string;
        };
        Update: {
          choices?: NonNullable<Json>;
          created_at?: string;
          default_value?: string | null;
          id?: string;
          is_active?: boolean;
          prompt_id?: string;
          question?: string;
          sort_order?: number;
          trigger_note?: string | null;
          updated_at?: string;
          variable?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_questions_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      prompt_tags: {
        Row: {
          created_at: string;
          prompt_id: string;
          tag_id: string;
        };
        Insert: {
          created_at?: string;
          prompt_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string;
          prompt_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_tags_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prompt_tags_tag_id_fkey';
            columns: ['tag_id'];
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      prompt_variants: {
        Row: {
          compatibility: Database['public']['Enums']['compatibility_level'];
          compatibility_note: string | null;
          created_at: string;
          fallback_behavior: Database['public']['Enums']['fallback_behavior'];
          id: string;
          prompt_id: string;
          provider_id: string;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          support_notes: string | null;
          updated_at: string;
        };
        Insert: {
          compatibility?: Database['public']['Enums']['compatibility_level'];
          compatibility_note?: string | null;
          created_at?: string;
          fallback_behavior?: Database['public']['Enums']['fallback_behavior'];
          id?: string;
          prompt_id: string;
          provider_id: string;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          support_notes?: string | null;
          updated_at?: string;
        };
        Update: {
          compatibility?: Database['public']['Enums']['compatibility_level'];
          compatibility_note?: string | null;
          created_at?: string;
          fallback_behavior?: Database['public']['Enums']['fallback_behavior'];
          id?: string;
          prompt_id?: string;
          provider_id?: string;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          support_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_variants_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prompt_variants_provider_id_fkey';
            columns: ['provider_id'];
            referencedRelation: 'ai_providers';
            referencedColumns: ['id'];
          },
        ];
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
          qcm: NonNullable<Json>;
          qcm_trigger: string | null;
          status: Database['public']['Enums']['version_status'];
          updated_at: string;
          variant_id: string;
          version_label: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          internal_notes?: string | null;
          is_current?: boolean;
          payload: string;
          published_at?: string | null;
          qcm?: NonNullable<Json>;
          qcm_trigger?: string | null;
          status?: Database['public']['Enums']['version_status'];
          updated_at?: string;
          variant_id: string;
          version_label?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          internal_notes?: string | null;
          is_current?: boolean;
          payload?: string;
          published_at?: string | null;
          qcm?: NonNullable<Json>;
          qcm_trigger?: string | null;
          status?: Database['public']['Enums']['version_status'];
          updated_at?: string;
          variant_id?: string;
          version_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prompt_versions_variant_id_fkey';
            columns: ['variant_id'];
            referencedRelation: 'prompt_variants';
            referencedColumns: ['id'];
          },
        ];
      };
      prompts: {
        Row: {
          accepted_inputs: string | null;
          admin_notes: string | null;
          aliases: string[];
          allow_ratio_override: boolean;
          attachment_rule: string | null;
          avoid_rules: string | null;
          blocking_condition: string | null;
          card_id: string | null;
          card_image_mode: Database['public']['Enums']['card_image_mode'] | null;
          card_slug: string | null;
          catalog_v2: boolean;
          catalog_version: string | null;
          category_id: string | null;
          command: string;
          command_id: string | null;
          command_objectif: string | null;
          contexte: string | null;
          copy_rule: string | null;
          created_at: string;
          created_by: string | null;
          criteres_reussite: string | null;
          cta_label: string | null;
          default_image_alt: string | null;
          default_image_path: string | null;
          default_ratio: string | null;
          default_values: string | null;
          discover_rank: number | null;
          entity_type: string | null;
          erreurs: string | null;
          expected_input: string | null;
          expected_output: string | null;
          external_ref: string | null;
          fallback_if_incomplete: string | null;
          fiche_champs_max: number | null;
          id: string;
          identity_policy: string | null;
          images_max: number | null;
          images_min: number | null;
          input_examples: Database['public']['Enums']['input_example_kind'][];
          input_type: Database['public']['Enums']['input_type'];
          intention: string | null;
          is_featured: boolean;
          is_free: boolean;
          is_new: boolean;
          is_pinned: boolean;
          legacy_category: string | null;
          legacy_subcategory: string | null;
          level: Database['public']['Enums']['execution_level'] | null;
          library: Database['public']['Enums']['app_library'] | null;
          like_count: number;
          limitations: string | null;
          livrables: string | null;
          max_questions: number | null;
          media_ready: boolean;
          minimal_context: string | null;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          online_lookup_policy: string | null;
          optional_variables: string[];
          output_format: string | null;
          output_formats: Database['public']['Enums']['output_format_kind'][];
          output_type: Database['public']['Enums']['output_type'];
          payload_ready: boolean;
          preserve_rules: string | null;
          preset_key: string | null;
          primary_input: string | null;
          priority: string;
          priority_score: number | null;
          published_at: string | null;
          quality_criteria: string | null;
          questionnaire_mode: string | null;
          questionnaire_policy: string | null;
          questions_cadrage: string | null;
          reality_policy: string | null;
          regle_sortie: string | null;
          required_variables: string[];
          result_summary: string | null;
          revised_at: string | null;
          risk_level: Database['public']['Enums']['risk_level'];
          search_aliases: string | null;
          search_keywords: string[];
          search_norm: string | null;
          search_text: string | null;
          seo_description: string | null;
          seo_title: string | null;
          short_description: string;
          show_image_card: boolean;
          slug: string;
          sort_order: number;
          source_status: string | null;
          specification: string | null;
          status: Database['public']['Enums']['content_status'];
          sufficient_context: string | null;
          tags: string[];
          test_blocking: string | null;
          test_incomplete_context: string | null;
          test_nominal: string | null;
          text_in_image_policy: string | null;
          thumbnail_layout: string | null;
          thumbnail_spec: string | null;
          univers: string | null;
          updated_at: string;
          updated_by: string | null;
          usage_conditions: string | null;
          usage_example: string | null;
          use_cases: string[];
          witness_type: string | null;
        };
        Insert: {
          accepted_inputs?: string | null;
          admin_notes?: string | null;
          aliases?: string[];
          allow_ratio_override?: boolean;
          attachment_rule?: string | null;
          avoid_rules?: string | null;
          blocking_condition?: string | null;
          card_id?: string | null;
          card_image_mode?: Database['public']['Enums']['card_image_mode'] | null;
          card_slug?: string | null;
          catalog_v2?: boolean;
          catalog_version?: string | null;
          category_id?: string | null;
          command: string;
          command_id?: string | null;
          command_objectif?: string | null;
          contexte?: string | null;
          copy_rule?: string | null;
          created_at?: string;
          created_by?: string | null;
          criteres_reussite?: string | null;
          cta_label?: string | null;
          default_image_alt?: string | null;
          default_image_path?: string | null;
          default_ratio?: string | null;
          default_values?: string | null;
          discover_rank?: number | null;
          entity_type?: string | null;
          erreurs?: string | null;
          expected_input?: string | null;
          expected_output?: string | null;
          external_ref?: string | null;
          fallback_if_incomplete?: string | null;
          fiche_champs_max?: number | null;
          id?: string;
          identity_policy?: string | null;
          images_max?: number | null;
          images_min?: number | null;
          input_examples?: Database['public']['Enums']['input_example_kind'][];
          input_type?: Database['public']['Enums']['input_type'];
          intention?: string | null;
          is_featured?: boolean;
          is_free?: boolean;
          is_new?: boolean;
          is_pinned?: boolean;
          legacy_category?: string | null;
          legacy_subcategory?: string | null;
          level?: Database['public']['Enums']['execution_level'] | null;
          library?: Database['public']['Enums']['app_library'] | null;
          like_count?: number;
          limitations?: string | null;
          livrables?: string | null;
          max_questions?: number | null;
          media_ready?: boolean;
          minimal_context?: string | null;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          online_lookup_policy?: string | null;
          optional_variables?: string[];
          output_format?: string | null;
          output_formats?: Database['public']['Enums']['output_format_kind'][];
          output_type?: Database['public']['Enums']['output_type'];
          payload_ready?: boolean;
          preserve_rules?: string | null;
          preset_key?: string | null;
          primary_input?: string | null;
          priority?: string;
          priority_score?: number | null;
          published_at?: string | null;
          quality_criteria?: string | null;
          questionnaire_mode?: string | null;
          questionnaire_policy?: string | null;
          questions_cadrage?: string | null;
          reality_policy?: string | null;
          regle_sortie?: string | null;
          required_variables?: string[];
          result_summary?: string | null;
          revised_at?: string | null;
          risk_level?: Database['public']['Enums']['risk_level'];
          search_aliases?: never;
          search_keywords?: string[];
          search_norm?: never;
          search_text?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description: string;
          show_image_card?: boolean;
          slug: string;
          sort_order?: number;
          source_status?: string | null;
          specification?: string | null;
          status?: Database['public']['Enums']['content_status'];
          sufficient_context?: string | null;
          tags?: string[];
          test_blocking?: string | null;
          test_incomplete_context?: string | null;
          test_nominal?: string | null;
          text_in_image_policy?: string | null;
          thumbnail_layout?: string | null;
          thumbnail_spec?: string | null;
          univers?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          usage_conditions?: string | null;
          usage_example?: string | null;
          use_cases?: string[];
          witness_type?: string | null;
        };
        Update: {
          accepted_inputs?: string | null;
          admin_notes?: string | null;
          aliases?: string[];
          allow_ratio_override?: boolean;
          attachment_rule?: string | null;
          avoid_rules?: string | null;
          blocking_condition?: string | null;
          card_id?: string | null;
          card_image_mode?: Database['public']['Enums']['card_image_mode'] | null;
          card_slug?: string | null;
          catalog_v2?: boolean;
          catalog_version?: string | null;
          category_id?: string | null;
          command?: string;
          command_id?: string | null;
          command_objectif?: string | null;
          contexte?: string | null;
          copy_rule?: string | null;
          created_at?: string;
          created_by?: string | null;
          criteres_reussite?: string | null;
          cta_label?: string | null;
          default_image_alt?: string | null;
          default_image_path?: string | null;
          default_ratio?: string | null;
          default_values?: string | null;
          discover_rank?: number | null;
          entity_type?: string | null;
          erreurs?: string | null;
          expected_input?: string | null;
          expected_output?: string | null;
          external_ref?: string | null;
          fallback_if_incomplete?: string | null;
          fiche_champs_max?: number | null;
          id?: string;
          identity_policy?: string | null;
          images_max?: number | null;
          images_min?: number | null;
          input_examples?: Database['public']['Enums']['input_example_kind'][];
          input_type?: Database['public']['Enums']['input_type'];
          intention?: string | null;
          is_featured?: boolean;
          is_free?: boolean;
          is_new?: boolean;
          is_pinned?: boolean;
          legacy_category?: string | null;
          legacy_subcategory?: string | null;
          level?: Database['public']['Enums']['execution_level'] | null;
          library?: Database['public']['Enums']['app_library'] | null;
          like_count?: number;
          limitations?: string | null;
          livrables?: string | null;
          max_questions?: number | null;
          media_ready?: boolean;
          minimal_context?: string | null;
          mode?: Database['public']['Enums']['app_mode'];
          name?: string;
          online_lookup_policy?: string | null;
          optional_variables?: string[];
          output_format?: string | null;
          output_formats?: Database['public']['Enums']['output_format_kind'][];
          output_type?: Database['public']['Enums']['output_type'];
          payload_ready?: boolean;
          preserve_rules?: string | null;
          preset_key?: string | null;
          primary_input?: string | null;
          priority?: string;
          priority_score?: number | null;
          published_at?: string | null;
          quality_criteria?: string | null;
          questionnaire_mode?: string | null;
          questionnaire_policy?: string | null;
          questions_cadrage?: string | null;
          reality_policy?: string | null;
          regle_sortie?: string | null;
          required_variables?: string[];
          result_summary?: string | null;
          revised_at?: string | null;
          risk_level?: Database['public']['Enums']['risk_level'];
          search_aliases?: never;
          search_keywords?: string[];
          search_norm?: never;
          search_text?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string;
          show_image_card?: boolean;
          slug?: string;
          sort_order?: number;
          source_status?: string | null;
          specification?: string | null;
          status?: Database['public']['Enums']['content_status'];
          sufficient_context?: string | null;
          tags?: string[];
          test_blocking?: string | null;
          test_incomplete_context?: string | null;
          test_nominal?: string | null;
          text_in_image_policy?: string | null;
          thumbnail_layout?: string | null;
          thumbnail_spec?: string | null;
          univers?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          usage_conditions?: string | null;
          usage_example?: string | null;
          use_cases?: string[];
          witness_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prompts_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
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
          amount?: number | null;
          chariow_customer_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          currency?: string | null;
          customer_email?: string | null;
          external_order_id: string;
          id?: string;
          license_fingerprint?: string | null;
          product_id?: string | null;
          purchased_at?: string | null;
          refunded_at?: string | null;
          source_event_id?: string | null;
          status?: Database['public']['Enums']['purchase_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number | null;
          chariow_customer_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          currency?: string | null;
          customer_email?: string | null;
          external_order_id?: string;
          id?: string;
          license_fingerprint?: string | null;
          product_id?: string | null;
          purchased_at?: string | null;
          refunded_at?: string | null;
          source_event_id?: string | null;
          status?: Database['public']['Enums']['purchase_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'purchases_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchases_source_event_id_fkey';
            columns: ['source_event_id'];
            referencedRelation: 'webhook_events';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limit_counters: {
        Row: {
          bucket: string;
          count: number;
          subject: string;
          window_start: string;
        };
        Insert: {
          bucket: string;
          count?: number;
          subject: string;
          window_start: string;
        };
        Update: {
          bucket?: string;
          count?: number;
          subject?: string;
          window_start?: string;
        };
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
        Insert: {
          copy_count?: number;
          last_copied_at?: string | null;
          last_viewed_at?: string | null;
          prompt_id: string;
          user_id: string;
        };
        Update: {
          copy_count?: number;
          last_copied_at?: string | null;
          last_viewed_at?: string | null;
          prompt_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recent_items_prompt_id_fkey';
            columns: ['prompt_id'];
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          description: string | null;
          key: Database['public']['Enums']['app_role'];
          label: string;
        };
        Insert: {
          description?: string | null;
          key: Database['public']['Enums']['app_role'];
          label: string;
        };
        Update: {
          description?: string | null;
          key?: Database['public']['Enums']['app_role'];
          label?: string;
        };
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
          created_at?: string;
          event_type: string;
          id?: string;
          ip_hash?: string | null;
          meta?: Json | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          ip_hash?: string | null;
          meta?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          created_at: string;
          description: string | null;
          groupe: Database['public']['Enums']['tag_group'];
          id: string;
          image_path: string | null;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          groupe?: Database['public']['Enums']['tag_group'];
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          groupe?: Database['public']['Enums']['tag_group'];
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
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
          granted_at?: string;
          granted_by?: string | null;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role?: Database['public']['Enums']['app_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_role_fkey';
            columns: ['role'];
            referencedRelation: 'roles';
            referencedColumns: ['key'];
          },
        ];
      };
      webhook_events: {
        Row: {
          created_at: string;
          event_type: string | null;
          external_event_id: string;
          id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          processing_error: string | null;
          signature_valid: boolean;
          source: string;
        };
        Insert: {
          created_at?: string;
          event_type?: string | null;
          external_event_id: string;
          id?: string;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          processing_error?: string | null;
          signature_valid?: boolean;
          source?: string;
        };
        Update: {
          created_at?: string;
          event_type?: string | null;
          external_event_id?: string;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          processing_error?: string | null;
          signature_valid?: boolean;
          source?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_analytics_breakdown: {
        Args: { p_days?: number };
        Returns: {
          copies: number;
          dimension: string;
          key: string;
          label: string;
        }[];
      };
      admin_analytics_daily: {
        Args: { p_days?: number };
        Returns: {
          copies: number;
          day: string;
        }[];
      };
      admin_analytics_overview: {
        Args: { p_days?: number };
        Returns: {
          active_members: number;
          copies_period: number;
          copies_total: number;
          members_with_access: number;
          prompts_copied: number;
          prompts_published: number;
          purchases_completed: number;
          purchases_unclaimed: number;
        }[];
      };
      admin_analytics_top_prompts: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          command: string;
          copies: number;
          members: number;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          prompt_id: string;
        }[];
      };
      admin_analytics_unused_prompts: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          command: string;
          mode: Database['public']['Enums']['app_mode'];
          name: string;
          prompt_id: string;
          published_at: string;
        }[];
      };
      admin_apercu_suppression_categorie: {
        Args: { p_category_id: string };
        Returns: Json;
      };
      admin_apercu_suppression_commande: {
        Args: { p_prompt_id: string };
        Returns: Json;
      };
      admin_get_prompt_versions: {
        Args: { p_prompt_id: string };
        Returns: {
          compatibility: Database['public']['Enums']['compatibility_level'];
          payload: string;
          provider_key: string;
          provider_name: string;
          qcm: Json;
          qcm_trigger: string;
          variant_id: string;
          variant_status: Database['public']['Enums']['content_status'];
          version_id: string;
          version_label: string;
        }[];
      };
      admin_liste_tags: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_log: {
        Args: {
          p_action: string;
          p_after?: Json;
          p_before?: Json;
          p_entity_id: string;
          p_entity_type: string;
        };
        Returns: undefined;
      };
      admin_new_prompt_version: {
        Args: {
          p_payload: string;
          p_qcm?: Json;
          p_qcm_trigger?: string;
          p_variant_id: string;
        };
        Returns: string;
      };
      admin_publish_prompt: {
        Args: { p_prompt_id: string };
        Returns: undefined;
      };
      admin_set_access: {
        Args: { p_active: boolean; p_reason?: string; p_user_id: string };
        Returns: undefined;
      };
      admin_set_category_status: {
        Args: {
          p_category_id: string;
          p_status: Database['public']['Enums']['content_status'];
        };
        Returns: undefined;
      };
      admin_set_prompt_free: {
        Args: { p_free: boolean; p_prompt_id: string };
        Returns: undefined;
      };
      admin_set_prompt_pinned: {
        Args: { p_pinned: boolean; p_prompt_id: string };
        Returns: undefined;
      };
      admin_set_prompt_status: {
        Args: {
          p_prompt_id: string;
          p_status: Database['public']['Enums']['content_status'];
        };
        Returns: undefined;
      };
      admin_set_prompts_free: {
        Args: { p_free: boolean; p_prompt_ids: string[] };
        Returns: {
          motifs: string[];
          refuses: number;
          traites: number;
        }[];
      };
      admin_set_prompts_status: {
        Args: {
          p_prompt_ids: string[];
          p_status: Database['public']['Enums']['content_status'];
        };
        Returns: {
          motifs: string[];
          refuses: number;
          traites: number;
        }[];
      };
      admin_supprimer_categorie: {
        Args: { p_category_id: string; p_reaffectation?: string };
        Returns: Json;
      };
      admin_supprimer_commande: {
        Args: { p_emporter_les_liens?: boolean; p_prompt_id: string };
        Returns: Json;
      };
      admin_supprimer_tag: { Args: { p_tag_id: string }; Returns: Json };
      alias_recherche: { Args: { v: string[] }; Returns: string };
      analytics_window: { Args: { p_days: number }; Returns: number };
      collections_populaires: { Args: { p_limite?: number }; Returns: Json };
      consume_rate_limit: {
        Args: {
          p_bucket: string;
          p_limit: number;
          p_subject: string;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      current_app_session_is_active: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      filtres_accueil: {
        Args: { p_library?: Database['public']['Enums']['app_library'] };
        Returns: Json;
      };
      has_active_entitlement: { Args: { p_user_id?: string }; Returns: boolean };
      has_role: {
        Args: { p_role: Database['public']['Enums']['app_role'] };
        Returns: boolean;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      process_chariow_license: {
        Args: {
          p_license_fingerprint: string;
          p_payload: Json;
          p_source_event_id: string;
        };
        Returns: undefined;
      };
      process_chariow_sale: {
        Args: { p_payload: Json; p_source_event_id: string };
        Returns: string;
      };
      prompt_media_ready: {
        Args: { p_carte_visuelle: boolean; p_prompt_id: string };
        Returns: boolean;
      };
      prompt_media_ready_refresh: {
        Args: { p_prompt_id: string };
        Returns: undefined;
      };
      prompt_payload_ready: { Args: { p_prompt_id: string }; Returns: boolean };
      prompt_payload_ready_refresh: {
        Args: { p_prompt_id: string };
        Returns: undefined;
      };
      prompts_avec_tous_les_tags: {
        Args: { p_tags: string[] };
        Returns: string[];
      };
      prompts_champ_recherche: {
        Args: {
          p_command: string;
          p_description: string;
          p_intention: string;
          p_name: string;
          p_tags: string[];
        };
        Returns: string;
      };
      prompts_champ_recherche_v2: {
        Args: {
          p_command: string;
          p_description: string;
          p_intention: string;
          p_mots_cles: string[];
          p_name: string;
          p_tags: string[];
          p_univers: string;
        };
        Returns: string;
      };
      purge_rate_limit_counters: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      register_app_session: {
        Args: { p_device_label?: string };
        Returns: number;
      };
      resolve_free_prompt: {
        Args: {
          p_prompt_id: string;
          p_provider_key: string;
          p_surface?: string;
        };
        Returns: {
          command: string;
          payload: string;
        }[];
      };
      resolve_prompt: {
        Args: {
          p_prompt_id: string;
          p_provider_key: string;
          p_surface?: string;
        };
        Returns: {
          command: string;
          payload: string;
          version_id: string;
          version_label: string;
        }[];
      };
      resoudre_alias: {
        Args: { p_slug: string };
        Returns: {
          preset: Json;
          slug: string;
        }[];
      };
      revoke_current_app_session: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      tags_explorables: { Args: Record<PropertyKey, never>; Returns: Json };
      tags_voisins: {
        Args: { p_limite?: number; p_tags: string[] };
        Returns: Json;
      };
      texte_normalise: { Args: { v: string }; Returns: string };
      track_prompt_view: { Args: { p_prompt_id: string }; Returns: undefined };
    };
    Enums: {
      access_type: 'lifetime' | 'subscription';
      account_status: 'active' | 'suspended';
      app_library: 'images' | 'textes' | 'reflexions';
      app_mode: 'image' | 'texte' | 'analyse';
      app_role: 'user' | 'admin' | 'super_admin';
      card_image_mode: 'before_after' | 'editorial_cover';
      compatibility_level: 'excellent' | 'bon' | 'partiel' | 'non_supporte';
      content_status: 'draft' | 'published' | 'archived';
      entitlement_status: 'active' | 'suspended' | 'revoked';
      execution_level: 'A' | 'B' | 'C' | 'D' | 'E';
      fallback_behavior:
        'execute_text' | 'image_generation_required' | 'declare_unavailable_if_no_image_tool';
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
      prompt_field_kind: 'texte' | 'texte_long' | 'nombre' | 'liste';
      purchase_status: 'pending' | 'completed' | 'refunded' | 'cancelled';
      risk_level: 'faible' | 'moyen' | 'eleve';
      session_status: 'active' | 'revoked' | 'expired';
      tag_group:
        | 'bibliotheque'
        | 'ia'
        | 'fonction'
        | 'style'
        | 'contexte'
        | 'usage'
        | 'resultat'
        | 'experience'
        | 'autre'
        | 'capacite';
      version_status: 'draft' | 'published' | 'retired';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      access_type: ['lifetime', 'subscription'],
      account_status: ['active', 'suspended'],
      app_library: ['images', 'textes', 'reflexions'],
      app_mode: ['image', 'texte', 'analyse'],
      app_role: ['user', 'admin', 'super_admin'],
      card_image_mode: ['before_after', 'editorial_cover'],
      compatibility_level: ['excellent', 'bon', 'partiel', 'non_supporte'],
      content_status: ['draft', 'published', 'archived'],
      entitlement_status: ['active', 'suspended', 'revoked'],
      execution_level: ['A', 'B', 'C', 'D', 'E'],
      fallback_behavior: [
        'execute_text',
        'image_generation_required',
        'declare_unavailable_if_no_image_tool',
      ],
      input_example_kind: [
        'photo_produit',
        'photo_lieu',
        'photo_personne',
        'capture_ecran',
        'document_pdf',
        'texte_brut',
        'tableau',
        'url',
        'brief',
      ],
      input_type: ['image', 'text', 'document', 'mixed'],
      media_kind: ['thumbnail', 'before', 'after', 'example', 'cover'],
      output_format_kind: [
        'image',
        'texte',
        'pdf',
        'document',
        'presentation',
        'tableur',
        'code',
        'audio',
        'video',
      ],
      output_type: ['image', 'text', 'analysis'],
      prompt_field_kind: ['texte', 'texte_long', 'nombre', 'liste'],
      purchase_status: ['pending', 'completed', 'refunded', 'cancelled'],
      risk_level: ['faible', 'moyen', 'eleve'],
      session_status: ['active', 'revoked', 'expired'],
      tag_group: [
        'bibliotheque',
        'ia',
        'fonction',
        'style',
        'contexte',
        'usage',
        'resultat',
        'experience',
        'autre',
        'capacite',
      ],
      version_status: ['draft', 'published', 'retired'],
    },
  },
} as const;
