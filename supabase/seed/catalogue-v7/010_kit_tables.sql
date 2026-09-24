-- Catalogue v7 / 010 — le kit en tables temporaires, jetees a la fin de la
-- transaction.
create temporary table v7_carte (
  card_id text primary key, card_code text not null unique, command_id uuid,
  publiee boolean not null, slug text not null unique, card_slug text not null,
  command text not null, name text not null, library public.app_library not null,
  mode public.app_mode not null, entity_type text, rayon_ref text not null,
  collection text not null, is_free boolean not null, short_description text not null,
  result_summary text, intention text, use_cases text[] not null, expected_input text,
  identity_policy text, input_type public.input_type not null,
  output_type public.output_type not null, output_formats public.output_format_kind[] not null,
  images_min smallint, default_ratio text, organisation_sortie text,
  show_image_card boolean not null, regime_champs text not null, fiche_champs_max smallint not null,
  revised_at date, payload text not null, payload_md5 text not null,
  champs jsonb not null, tags text[] not null
) on commit drop;

create temporary table v7_tag (
  slug text primary key, name text not null, groupe public.tag_group not null,
  description text not null, sort_order integer not null
) on commit drop;

create temporary table v7_migration_tag (
  source_norm text primary key, target_slug text
) on commit drop;

create temporary table v7_brouillon (
  card_id text primary key, card_code text not null unique, slug text not null unique,
  command text not null, card_slug text not null
) on commit drop;
