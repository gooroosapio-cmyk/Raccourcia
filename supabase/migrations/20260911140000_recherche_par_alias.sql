-- =====================================================================
-- RaccourcIA - Retrouver une commande par un nom qu'elle n'a plus
--
-- La refonte V5 regroupe cent quarante-six raccourcis en modes d'une
-- commande canonique, et en renomme quinze. Quelqu'un qui a garde
-- « /adsocial » ou « /emailpro » en tete ne trouverait plus rien : le nom
-- qu'il tape n'existe plus dans le champ de recherche, alors que la
-- commande qui fait le travail, elle, est bien la.
--
-- Cette migration ajoute la liste des noms auxquels une commande repond,
-- et sa forme de comparaison. Strictement additive : deux colonnes, un
-- index, aucun droit retire, aucune ligne existante modifiee.
--
-- RETOUR ARRIERE
--   drop index if exists public.prompts_search_aliases_idx;
--   alter table public.prompts drop column if exists search_aliases;
--   alter table public.prompts drop column if exists aliases;
--   drop function if exists public.alias_recherche(text[]);
--   drop function if exists public.resoudre_alias(text);
-- =====================================================================

-- Les noms auxquels la commande repond : son nom historique quand elle a
-- ete renommee, ceux des raccourcis devenus ses modes, et les modes eux-
-- memes. Une donnee editoriale, pas un calcul : c'est le catalogue qui
-- decide de ce a quoi une commande repond, et l'administration pourra
-- l'amender sans toucher au code.
alter table public.prompts
  add column if not exists aliases text[] not null default '{}'::text[];

comment on column public.prompts.aliases is
  'Noms auxquels la commande repond en plus du sien : anciens noms, raccourcis devenus des modes, modes.';

-- `array_to_string` est declaree `stable` par Postgres, ce qui suffit a
-- faire refuser la colonne generee. Pour un tableau de texte separe par une
-- espace, le resultat ne depend pourtant que des arguments : on l'enveloppe
-- dans une fonction declaree `immutable`, comme `texte_normalise` l'est
-- deja au-dessus d'`unaccent`.
create or replace function public.alias_recherche(v text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select public.texte_normalise(array_to_string(coalesce(v, '{}'::text[]), ' '));
$$;

-- La colonne generee evalue la fonction a chaque ecriture : sans execution
-- accordee, un administrateur ne pourrait plus enregistrer une fiche.
revoke all on function public.alias_recherche(text[]) from public;
grant execute on function public.alias_recherche(text[]) to anon, authenticated, service_role;

-- Meme forme de comparaison que `search_norm`, et pour la meme raison :
-- une recherche doit trouver « Ad Social » en tapant « adsocial ».
alter table public.prompts
  add column if not exists search_aliases text
  generated always as (public.alias_recherche(aliases)) stored;

comment on column public.prompts.search_aliases is
  'Forme de comparaison des noms alternatifs. Colonne generee : elle suit `aliases` sans que rien n''ait a la tenir a jour.';

create index if not exists prompts_search_aliases_idx
  on public.prompts using gin (search_aliases extensions.gin_trgm_ops);

-- Lecture publique, comme `search_norm` : la colonne ne dit rien de plus
-- que des noms de commandes, qui sont deja lisibles. Une colonne generee
-- refuse les ecritures explicites, il n'y a donc rien a proteger de plus.
grant select (aliases) on table public.prompts to anon, authenticated;
grant select (search_aliases) on table public.prompts to anon, authenticated;

-- --- Les liens deja partages -------------------------------------------
-- Une adresse comme /r/adsocial a pu partir par message il y a des
-- semaines. Quand la bascule sortira ce raccourci du catalogue, la page
-- deviendrait introuvable alors que la commande qui fait le travail est
-- toujours la, sous un autre nom.
--
-- Cette fonction traduit une ancienne adresse en adresse courante. Elle
-- passe en `security definer` parce qu'elle doit lire la ligne du
-- raccourci historique, que la lecture publique ne montrera plus.
--
-- Elle ne divulgue rien : elle ne renvoie qu'un slug et un mode, tous deux
-- deja publics, et seulement si la commande d'arrivee est publiee dans une
-- famille visible. Sinon elle ne renvoie rien, et la page reste
-- « introuvable » plutot que d'ouvrir un brouillon.
create or replace function public.resoudre_alias(p_slug text)
returns table (slug text, preset jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select canon.slug, a.preset
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id
  join public.prompts canon on canon.id = a.canonical_prompt_id
  join public.categories famille on famille.id = canon.category_id
  where ancien.slug = p_slug
    and canon.status = 'published'
    and famille.is_visible
  limit 1;
$$;

revoke all on function public.resoudre_alias(text) from public;
grant execute on function public.resoudre_alias(text) to anon, authenticated, service_role;
