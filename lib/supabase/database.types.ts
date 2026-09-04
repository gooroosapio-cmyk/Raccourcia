/**
 * Types de la base de donnees.
 *
 * A REGENERER apres chaque migration, une fois l'acces Supabase disponible :
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > lib/supabase/database.types.ts
 *
 * En attendant, cette definition minimale conserve un typage utilisable pour
 * les enums du domaine sans bloquer le build.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Row = Record<string, unknown>;

export interface Database {
  public: {
    Tables: {
      [table: string]: {
        Row: Row;
        Insert: Row;
        Update: Row;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      [fn: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      app_mode: 'image' | 'texte' | 'analyse';
      app_role: 'user' | 'admin' | 'super_admin';
      content_status: 'draft' | 'published' | 'archived';
      entitlement_status: 'active' | 'suspended' | 'revoked';
      purchase_status: 'pending' | 'completed' | 'refunded' | 'cancelled';
      compatibility_level: 'excellent' | 'bon' | 'partiel' | 'non_supporte';
      media_kind: 'thumbnail' | 'before' | 'after' | 'example' | 'cover';
      risk_level: 'faible' | 'moyen' | 'eleve';
      version_status: 'draft' | 'published' | 'retired';
    };
    CompositeTypes: Record<string, never>;
  };
}
