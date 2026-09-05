-- =====================================================================
-- RaccourcIA - 05. Moteur de catalogue
-- Rien n'est code en dur dans le frontend : categories, prompts, variantes,
-- versions, medias et ordre d'affichage sont des donnees administrables.
-- =====================================================================

-- --- Categories (2 niveaux : categorie -> sous-categorie) ---------------
create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  mode public.app_mode not null,
  slug text not null unique,
  name text not null,
  short_description text,
  icon_key text,
  cover_url text,
  status public.content_status not null default 'draft',
  -- Visibilite effective : une categorie n'est visible que si elle est
  -- publiee ET que sa categorie parente l'est aussi. Maintenue par trigger.
  -- Desactiver une categorie masque donc toute sa descendance sans rien
  -- supprimer (exigence produit).
  is_visible boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_parent_idx on public.categories (parent_id);
create index categories_mode_visible_idx on public.categories (mode, is_visible, sort_order);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Garde-fous de hierarchie : profondeur limitee a 2 niveaux et mode
-- identique entre une sous-categorie et sa categorie parente.
create or replace function public.categories_check_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.categories%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'Une categorie ne peut pas etre sa propre parente.';
  end if;

  select * into v_parent from public.categories where id = new.parent_id;

  if not found then
    raise exception 'Categorie parente introuvable.';
  end if;

  if v_parent.parent_id is not null then
    raise exception 'La hierarchie des categories est limitee a 2 niveaux.';
  end if;

  if v_parent.mode <> new.mode then
    raise exception 'Une sous-categorie doit partager le mode de sa categorie parente.';
  end if;

  return new;
end;
$$;

create trigger categories_check_hierarchy
  before insert or update of parent_id, mode on public.categories
  for each row execute function public.categories_check_hierarchy();

-- Recalcule is_visible pour la ligne modifiee puis pour sa descendance.
create or replace function public.categories_refresh_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.is_visible := new.status = 'published'
    and (
      new.parent_id is null
      or exists (
        select 1 from public.categories p
        where p.id = new.parent_id and p.status = 'published'
      )
    );
  return new;
end;
$$;

create trigger categories_refresh_visibility
  before insert or update of status, parent_id on public.categories
  for each row execute function public.categories_refresh_visibility();

create or replace function public.categories_cascade_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    update public.categories child
    set is_visible = (child.status = 'published' and new.status = 'published')
    where child.parent_id = new.id;
  end if;
  return null;
end;
$$;

create trigger categories_cascade_visibility
  after update of status on public.categories
  for each row execute function public.categories_cascade_visibility();

-- --- Fournisseurs IA ----------------------------------------------------
create table public.ai_providers (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- --- Prompts (raccourcis) ----------------------------------------------
create table public.prompts (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Identifiant editorial stable, jamais reutilise (Regle R07). Ex : RCI-IMG-001.
  external_ref text unique,
  command extensions.citext not null,
  name text not null,
  slug text not null unique,
  mode public.app_mode not null,
  category_id uuid references public.categories (id) on delete restrict,

  -- Metadonnees publiques : partageables, indexables, jamais premium.
  short_description text not null,
  intention text,
  use_cases text[] not null default '{}',
  tags text[] not null default '{}',

  -- Contexte et attentes, affiches dans la fiche detaillee.
  expected_input text,
  minimal_context text,
  sufficient_context text,
  required_variables text[] not null default '{}',
  optional_variables text[] not null default '{}',
  default_values text,
  expected_output text,
  output_format text,
  quality_criteria text,
  preserve_rules text,
  avoid_rules text,
  limitations text,
  fallback_if_incomplete text,

  input_type public.input_type not null default 'text',
  output_type public.output_type not null default 'text',
  risk_level public.risk_level not null default 'faible',
  priority text not null default 'P0',

  status public.content_status not null default 'draft',
  -- Un prompt gratuit sert de demonstration : copiable sans achat.
  is_free boolean not null default false,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  -- Faux pour les prompts texte : aucune carte image n'est imposee.
  show_image_card boolean not null default false,
  thumbnail_spec text,
  -- Notes internes : jamais exposees au client.
  admin_notes text,

  sort_order integer not null default 0,
  published_at timestamptz,
  -- Alimente la recherche tolerante (trigramme).
  search_text text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Minuscules, sans espace ni accent. Le tiret et l'underscore restent
  -- autorises : le catalogue initial en contient (/case_study, /seo_meta).
  constraint prompts_command_format check (command ~ '^/[a-z0-9][a-z0-9_-]*$')
);

-- Commande unique parmi les contenus actifs ; un ID archive conserve sa trace.
create unique index prompts_command_active_unique
  on public.prompts (command)
  where status <> 'archived';

create index prompts_status_mode_idx on public.prompts (status, mode, sort_order);
create index prompts_category_idx on public.prompts (category_id);
create index prompts_published_idx on public.prompts (published_at desc nulls last);
create index prompts_tags_idx on public.prompts using gin (tags);
create index prompts_search_idx on public.prompts using gin (search_text extensions.gin_trgm_ops);

create trigger prompts_set_updated_at
  before update on public.prompts
  for each row execute function public.set_updated_at();

create or replace function public.prompts_refresh_search_text()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.search_text := lower(
    coalesce(new.command::text, '') || ' ' ||
    coalesce(new.name, '') || ' ' ||
    coalesce(new.short_description, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;

create trigger prompts_refresh_search_text
  before insert or update of command, name, short_description, tags on public.prompts
  for each row execute function public.prompts_refresh_search_text();

-- --- Variantes par IA ---------------------------------------------------
-- Une variante represente "ce raccourci pour cette IA".
create table public.prompt_variants (
  id uuid primary key default extensions.gen_random_uuid(),
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  provider_id uuid not null references public.ai_providers (id) on delete restrict,
  compatibility public.compatibility_level not null default 'excellent',
  compatibility_note text,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_variants_unique unique (prompt_id, provider_id)
);

create index prompt_variants_prompt_idx on public.prompt_variants (prompt_id, status);

create trigger prompt_variants_set_updated_at
  before update on public.prompt_variants
  for each row execute function public.set_updated_at();

-- --- Versions de payload -------------------------------------------------
-- TABLE LA PLUS SENSIBLE DU PRODUIT.
-- Modifier un prompt ne detruit jamais la version precedente : on cree une
-- nouvelle version, on la teste, on la publie, l'ancienne passe en retired.
-- Aucune lecture client : le payload ne sort que par /api/resolve-prompt.
create table public.prompt_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  variant_id uuid not null references public.prompt_variants (id) on delete cascade,
  version_label text not null default 'v1.0',
  payload text not null,
  -- QCM conditionnel limite a 1-3 questions (Regle R04).
  qcm jsonb not null default '[]'::jsonb,
  qcm_trigger text,
  status public.version_status not null default 'draft',
  is_current boolean not null default false,
  internal_notes text,
  published_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_versions_qcm_max check (jsonb_array_length(qcm) <= 3)
);

-- Une seule version courante par variante.
create unique index prompt_versions_current_unique
  on public.prompt_versions (variant_id)
  where is_current;

create index prompt_versions_variant_idx on public.prompt_versions (variant_id, status);

create trigger prompt_versions_set_updated_at
  before update on public.prompt_versions
  for each row execute function public.set_updated_at();

-- --- Medias --------------------------------------------------------------
create table public.prompt_media (
  id uuid primary key default extensions.gen_random_uuid(),
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  kind public.media_kind not null default 'thumbnail',
  storage_path text not null,
  alt text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index prompt_media_prompt_idx on public.prompt_media (prompt_id, kind, sort_order);
