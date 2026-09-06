-- =====================================================================
-- RaccourcIA - 24. Schema du catalogue Application V2
--
-- Le classeur V2 refond la navigation : deux familles publiques (IMAGE et
-- TEXTE) et treize categories, six et sept. Il decrit un schema avec des
-- tables `domains` et `families` distinctes.
--
-- On ne les cree pas. `categories.mode` porte deja la famille et la table
-- `categories` porte deja la categorie : introduire un second arbre
-- parallele obligerait a reecrire les requetes de catalogue, les puces, les
-- filtres et l'administration — tout ce qui fonctionne aujourd'hui — pour
-- ranger la meme information sous un autre nom.
--
-- `categories.external_ref` porte l'identifiant du classeur (IMG-01 ...
-- TXT-07). C'est lui la relation principale a l'import, et il rend chaque
-- reprise idempotente.
--
-- Cette migration n'ajoute que des colonnes et une table. Elle ne deplace
-- aucune donnee : l'import et la bascule de navigation viennent apres, et
-- separement, pour que chacun puisse etre repris seul.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Categories : identifiant du classeur, visuel de repli, description longue
-- ---------------------------------------------------------------------

alter table public.categories
  add column if not exists external_ref text,
  add column if not exists description_long text,
  -- Visuel de repli de la categorie, utilise quand un raccourci n'a pas
  -- encore le sien. Un chemin, pas une URL : le bucket peut changer.
  add column if not exists fallback_image_path text;

create unique index if not exists categories_external_ref_key
  on public.categories (external_ref)
  where external_ref is not null;

comment on column public.categories.external_ref is
  'Identifiant du classeur (IMG-01..TXT-07). Cle de rapprochement a l''import.';
comment on column public.categories.fallback_image_path is
  'Visuel de repli de la categorie, dans le bucket prompt-media.';

-- ---------------------------------------------------------------------
-- Raccourcis : visuel dedie, mode de carte, tracabilite de migration
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'card_image_mode') then
    create type public.card_image_mode as enum ('before_after', 'editorial_cover');
  end if;
end $$;

alter table public.prompts
  add column if not exists default_image_path text,
  add column if not exists default_image_alt text,
  add column if not exists card_image_mode public.card_image_mode,
  -- Conserves pour l'audit de migration uniquement. La navigation publique
  -- ne doit jamais les lire : le classeur est explicite sur ce point.
  add column if not exists legacy_category text,
  add column if not exists legacy_subcategory text;

comment on column public.prompts.default_image_path is
  'Visuel dedie du raccourci, dans le bucket prompt-media. Repli : celui de sa categorie.';
comment on column public.prompts.card_image_mode is
  'before_after pour les raccourcis image, editorial_cover pour les raccourcis texte.';
comment on column public.prompts.legacy_category is
  'Ancienne categorie, conservee pour l''audit de migration. Jamais affichee.';

-- ---------------------------------------------------------------------
-- Compatibilite par IA : que faire quand la capacite manque
--
-- `compatibility` disait deja si une IA est supportee. Elle ne disait pas ce
-- que le modele doit faire quand la capacite image est absente — et c'est
-- precisement la que se joue la regle R07 : ne jamais pretendre avoir genere
-- une image. La reponse vit donc a cote de la compatibilite, pas ailleurs.
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fallback_behavior') then
    create type public.fallback_behavior as enum (
      'execute_text',
      'image_generation_required',
      'declare_unavailable_if_no_image_tool'
    );
  end if;
end $$;

alter table public.prompt_variants
  add column if not exists fallback_behavior public.fallback_behavior
    not null default 'execute_text',
  add column if not exists support_notes text;

comment on column public.prompt_variants.fallback_behavior is
  'Conduite attendue si l''IA n''a pas la capacite requise. Jamais simuler un resultat.';

-- ---------------------------------------------------------------------
-- Questions contextuelles
--
-- Elles vivaient dans `prompt_versions.qcm`, donc figees avec un payload et
-- invisibles a l'administration. Une table les rend modifiables sans creer
-- une version, ce que le classeur demande explicitement.
--
-- La borne de trois questions est posee en contrainte et non en convention :
-- au-dela, le QCM cesse d'etre un eclaircissement et devient un formulaire.
-- ---------------------------------------------------------------------

create table if not exists public.prompt_questions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  sort_order smallint not null,
  variable text not null,
  question text not null,
  choices jsonb not null default '[]'::jsonb,
  default_value text,
  -- Condition d'affichage : une question ne se pose que si la reponse n'est
  -- ni fournie ni deductible du message, de la conversation ou des pieces
  -- jointes (regle R04).
  trigger_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_questions_ordre_unique unique (prompt_id, sort_order),
  constraint prompt_questions_ordre_borne check (sort_order between 1 and 3)
);

create index if not exists prompt_questions_prompt_idx
  on public.prompt_questions (prompt_id, sort_order);

comment on table public.prompt_questions is
  'Questions contextuelles, 3 au maximum, posees seulement si la reponse manque.';

alter table public.prompt_questions enable row level security;

-- Le contenu des questions est public : il decrit ce que le raccourci
-- demande, jamais ce qu'il produit. Le payload, lui, reste hors de portee.
drop policy if exists prompt_questions_lecture_publique on public.prompt_questions;
create policy prompt_questions_lecture_publique
  on public.prompt_questions
  for select
  using (
    is_active
    and exists (
      select 1 from public.prompts p
      where p.id = prompt_id and p.status = 'published'
    )
  );

drop policy if exists prompt_questions_ecriture_admin on public.prompt_questions;
create policy prompt_questions_ecriture_admin
  on public.prompt_questions
  for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.prompt_questions to anon, authenticated;
grant select, insert, update, delete on table public.prompt_questions to service_role;

-- Les horodatages suivent la meme convention que le reste du schema.
drop trigger if exists prompt_questions_set_updated_at on public.prompt_questions;
create trigger prompt_questions_set_updated_at
  before update on public.prompt_questions
  for each row execute function public.set_updated_at();
