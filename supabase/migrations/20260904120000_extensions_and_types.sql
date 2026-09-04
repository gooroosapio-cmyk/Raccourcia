-- =====================================================================
-- RaccourcIA - 01. Extensions et types
-- Toutes les dates sont stockees en UTC (timestamptz).
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "citext" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- Cycle de vie editorial. Aucune suppression physique en fonctionnement
-- normal : draft -> published -> archived (Blueprint Backend V1, 3.2).
create type public.content_status as enum ('draft', 'published', 'archived');

-- Modes racines de la bibliotheque. `analyse` est livre pret mais masque
-- derriere le feature flag mode_analyse_enabled tant que la V1 ne l'ouvre pas.
create type public.app_mode as enum ('image', 'texte', 'analyse');

create type public.app_role as enum ('user', 'admin', 'super_admin');

create type public.account_status as enum ('active', 'suspended');

create type public.session_status as enum ('active', 'revoked', 'expired');

create type public.access_type as enum ('lifetime', 'subscription');

create type public.purchase_status as enum ('pending', 'completed', 'refunded', 'cancelled');

create type public.entitlement_status as enum ('active', 'suspended', 'revoked');

create type public.input_type as enum ('image', 'text', 'document', 'mixed');

create type public.output_type as enum ('image', 'text', 'analysis');

-- Compatibilite honnete par IA (Regle R05 du catalogue).
create type public.compatibility_level as enum ('excellent', 'bon', 'partiel', 'non_supporte');

create type public.media_kind as enum ('thumbnail', 'before', 'after', 'example', 'cover');

create type public.risk_level as enum ('faible', 'moyen', 'eleve');

create type public.version_status as enum ('draft', 'published', 'retired');

-- Renseigne automatiquement la colonne updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
