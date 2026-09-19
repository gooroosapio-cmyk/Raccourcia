-- =====================================================================
-- RaccourcIA V3 : tags relationnels, likes, champs personnalisables
--
-- Trois manques, un seul domaine : ce qui permet de classer une commande,
-- de mesurer son succes, et de la personnaliser avant de la copier.
--
-- POURQUOI DES TAGS RELATIONNELS. `prompts.tags` est un `text[]`. A
-- l'inspection : 443 valeurs distinctes pour 3 046 occurrences, dont 44 qui
-- repetent un slug de categorie et 5 qui repetent le genre de la commande.
-- Et « mode-ia » comme « modes-ia » portent exactement les memes
-- quatre-vingt-deux commandes — deux tags pour une idee, sans que rien ne
-- puisse les reconcilier. Un tableau de chaines ne sait ni renommer, ni
-- fusionner, ni compter, ni porter une image.
--
-- La colonne `tags` n'est pas supprimee : elle reste la source de la
-- recherche plein texte, et rien ne presse de la vider.
--
-- Rejouable : `create ... if not exists`, `create or replace`, et des
-- politiques recreees a l'identique.
-- =====================================================================

-- --- Les trois bibliotheques ------------------------------------------
--
-- Elles ne sont pas deductibles de `app_mode`. Aujourd'hui les 82 commandes
-- `texte` sont toutes des Modes IA, donc des Reflexions ; demain un
-- /businessplan sera `texte` sans etre un mode. Une regle deduite se
-- tromperait des la premiere commande du futur catalogue. La bibliotheque
-- est donc une donnee, que l'administration peut corriger.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_library') then
    create type public.app_library as enum ('images', 'textes', 'reflexions');
  end if;
end $$;

alter table public.prompts
  add column if not exists library public.app_library;

-- La regle par defaut vit dans un declencheur, pas dans un `update` de
-- migration.
--
-- Un `update` ne rattrape que les lignes presentes au moment ou il passe.
-- Les migrations s'appliquent avant les lots de catalogue : chaque vague
-- d'import arriverait donc sans bibliotheque, et il faudrait penser a
-- relancer quelque chose. Le declencheur, lui, ne s'oublie pas.
--
-- Il ne comble que le vide : une bibliotheque choisie en administration
-- n'est jamais defaite.
create or replace function public.prompts_bibliotheque_par_defaut()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.library is null then
    new.library := case
      when new.mode = 'image' then 'images'::public.app_library
      when new.entity_type = 'mode_ia' then 'reflexions'::public.app_library
      when new.mode = 'analyse' then 'reflexions'::public.app_library
      else 'textes'::public.app_library
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists prompts_bibliotheque_par_defaut on public.prompts;
create trigger prompts_bibliotheque_par_defaut
  before insert or update on public.prompts
  for each row execute function public.prompts_bibliotheque_par_defaut();

-- Et le rattrapage des lignes deja presentes, pour une base ou le catalogue
-- existe deja — c'est le cas en production.
update public.prompts set library = null where library is null;

create index if not exists prompts_library_idx
  on public.prompts (library) where status = 'published';

-- --- Le referentiel des tags -------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tag_group') then
    create type public.tag_group as enum (
      'bibliotheque', 'ia', 'fonction', 'style', 'contexte',
      'usage', 'resultat', 'experience', 'autre'
    );
  end if;
end $$;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  groupe public.tag_group not null default 'autre',
  description text,
  -- Le visuel d'une carte de tag. Un chemin de stockage, comme les autres
  -- visuels du catalogue ; `null` tant qu'il n'y en a pas, et la carte se
  -- rabat alors sur le fond de la marque.
  image_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Le slug est la clef stable : il se normalise a l'ecriture pour qu'aucune
-- variante d'espacement ou de casse ne cree un second tag pour une meme
-- idee. C'est le defaut constate dans l'ancienne colonne.
create or replace function public.tags_normaliser()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.slug := trim(both '-' from regexp_replace(
    lower(public.texte_normalise(new.slug)), '[^a-z0-9]+', '-', 'g'));
  if new.slug = '' then
    raise exception 'TAG_SLUG_VIDE';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tags_normaliser on public.tags;
create trigger tags_normaliser
  before insert or update on public.tags
  for each row execute function public.tags_normaliser();

create index if not exists tags_groupe_idx on public.tags (groupe, sort_order)
  where is_active;

-- --- Les associations --------------------------------------------------
create table if not exists public.prompt_tags (
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prompt_id, tag_id)
);

-- L'index inverse sert le filtrage par tag, qui est le geste principal de
-- la Bibliotheque : sans lui, chaque tag choisi balaie la table entiere.
create index if not exists prompt_tags_tag_idx on public.prompt_tags (tag_id);

-- --- Les likes ---------------------------------------------------------
--
-- Distincts des favoris. Un favori est un marque-page prive : il range une
-- commande pour soi. Un like est public : il dit a tout le monde que cette
-- commande sert. Les confondre reviendrait a publier la bibliotheque privee
-- de chacun.
create table if not exists public.prompt_likes (
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prompt_id, user_id)
);

create index if not exists prompt_likes_user_idx on public.prompt_likes (user_id);

-- Le compte vit sur la commande, pas dans une jointure.
--
-- Le feed Decouvrir trie par popularite en parcourant des centaines de
-- cartes : un `count(*)` par carte a chaque chargement coute une lecture de
-- la table des likes par ligne affichee. La colonne est tenue par un
-- declencheur, donc elle ne peut pas deriver du compte reel.
alter table public.prompts
  add column if not exists like_count integer not null default 0;

create or replace function public.prompt_likes_recompter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.prompts set like_count = like_count + 1 where id = new.prompt_id;
    return new;
  end if;
  update public.prompts set like_count = greatest(like_count - 1, 0) where id = old.prompt_id;
  return old;
end;
$$;

drop trigger if exists prompt_likes_recompter on public.prompt_likes;
create trigger prompt_likes_recompter
  after insert or delete on public.prompt_likes
  for each row execute function public.prompt_likes_recompter();

-- Remise a niveau : le compte suit la table, meme si la migration est
-- rejouee apres des likes deja poses.
update public.prompts p
set like_count = coalesce(n.total, 0)
from (select prompt_id, count(*) as total from public.prompt_likes group by prompt_id) n
where n.prompt_id = p.id and p.like_count is distinct from n.total;

create index if not exists prompts_like_count_idx
  on public.prompts (like_count desc) where status = 'published';

-- --- Les champs de personnalisation ------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'prompt_field_kind') then
    create type public.prompt_field_kind as enum ('texte', 'texte_long', 'nombre', 'liste');
  end if;
end $$;

create table if not exists public.prompt_fields (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  -- La clef employee dans le payload : {{chiffre_affaires}}.
  cle text not null,
  libelle text not null,
  indication text,
  kind public.prompt_field_kind not null default 'texte',
  requis boolean not null default false,
  -- Trois au plus, et la position est unique : le formulaire de la fiche
  -- ne doit pas devenir un questionnaire. Le nombre de questions que l'IA
  -- pose ensuite, lui, n'est pas concerne.
  position smallint not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  unique (prompt_id, position),
  unique (prompt_id, cle)
);

create or replace function public.prompt_fields_normaliser()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cle := trim(both '_' from regexp_replace(
    lower(public.texte_normalise(new.cle)), '[^a-z0-9]+', '_', 'g'));
  if new.cle = '' then
    raise exception 'CHAMP_CLE_VIDE';
  end if;
  return new;
end;
$$;

drop trigger if exists prompt_fields_normaliser on public.prompt_fields;
create trigger prompt_fields_normaliser
  before insert or update on public.prompt_fields
  for each row execute function public.prompt_fields_normaliser();

create table if not exists public.prompt_field_choices (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.prompt_fields (id) on delete cascade,
  valeur text not null,
  libelle text not null,
  position smallint not null default 0,
  unique (field_id, valeur)
);

create index if not exists prompt_field_choices_field_idx
  on public.prompt_field_choices (field_id, position);

-- --- Politiques de securite --------------------------------------------
--
-- Aucune table n'est laissee sans RLS : c'est la regle du depot, et un
-- referentiel de tags ouvert en ecriture laisserait n'importe quel compte
-- renommer la taxonomie.
alter table public.tags enable row level security;
alter table public.prompt_tags enable row level security;
alter table public.prompt_likes enable row level security;
alter table public.prompt_fields enable row level security;
alter table public.prompt_field_choices enable row level security;

drop policy if exists tags_lecture on public.tags;
create policy tags_lecture on public.tags
  for select using (is_active or public.is_admin());

drop policy if exists tags_administration on public.tags;
create policy tags_administration on public.tags
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists prompt_tags_lecture on public.prompt_tags;
create policy prompt_tags_lecture on public.prompt_tags for select using (true);

drop policy if exists prompt_tags_administration on public.prompt_tags;
create policy prompt_tags_administration on public.prompt_tags
  for all using (public.is_admin()) with check (public.is_admin());

-- Les likes se lisent : le compteur est public, c'est tout son interet.
drop policy if exists prompt_likes_lecture on public.prompt_likes;
create policy prompt_likes_lecture on public.prompt_likes for select using (true);

-- Mais on ne pose et ne retire que le sien. Sans cette borne, un compte
-- pourrait aimer au nom d'un autre, et le compteur cesserait de vouloir
-- dire quoi que ce soit.
drop policy if exists prompt_likes_ecriture on public.prompt_likes;
create policy prompt_likes_ecriture on public.prompt_likes
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists prompt_likes_retrait on public.prompt_likes;
create policy prompt_likes_retrait on public.prompt_likes
  for delete using ((select auth.uid()) = user_id);

-- Les champs s'affichent sur la fiche : ils sont publics comme elle.
drop policy if exists prompt_fields_lecture on public.prompt_fields;
create policy prompt_fields_lecture on public.prompt_fields for select using (true);

drop policy if exists prompt_fields_administration on public.prompt_fields;
create policy prompt_fields_administration on public.prompt_fields
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists prompt_field_choices_lecture on public.prompt_field_choices;
create policy prompt_field_choices_lecture on public.prompt_field_choices
  for select using (true);

drop policy if exists prompt_field_choices_administration on public.prompt_field_choices;
create policy prompt_field_choices_administration on public.prompt_field_choices
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.tags, public.prompt_tags, public.prompt_likes,
  public.prompt_fields, public.prompt_field_choices to anon, authenticated;
grant insert, delete on public.prompt_likes to authenticated;
