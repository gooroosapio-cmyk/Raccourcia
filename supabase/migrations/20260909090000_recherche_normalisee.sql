-- =====================================================================
-- RaccourcIA - Recherche insensible aux accents et a la ponctuation
--
-- `search_text` conserve les accents : chercher « prefere » ne trouvait pas
-- « préféré », et personne ne tape les accents sur un clavier de telephone.
-- L'apostrophe posait le meme probleme, entre « d'usage » et « d usage ».
--
-- Une colonne generee porte la forme normalisee. Generee et non maintenue
-- par declencheur : elle ne peut pas se desynchroniser de la ligne, et le
-- remplissage des 565 raccourcis existants se fait a la creation.
--
-- Elle reprend aussi `intention`, que `search_text` ignorait : c'est la
-- phrase qui dit a quoi sert la commande, donc celle que l'on tape.
-- =====================================================================

create extension if not exists unaccent with schema extensions;

-- Forme de comparaison d'un texte : minuscules, sans accent, ponctuation
-- ramenee a l'espace, espaces multiples reduits.
--
-- Declaree `immutable` alors que `unaccent()` est `stable` : c'est la
-- condition pour qu'une colonne generee puisse l'appeler. Le dictionnaire
-- `unaccent` est fixe et n'est jamais recharge ici; si un jour il changeait,
-- il faudrait reconstruire la colonne.
create or replace function public.texte_normalise(v text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(
      regexp_replace(
        lower(extensions.unaccent(coalesce(v, ''))),
        '[^a-z0-9]+', ' ', 'g'
      )
    ),
    ''
  )
$$;

comment on function public.texte_normalise(text) is
  'Forme de comparaison : minuscules, sans accent, ponctuation ramenee a l''espace.';

-- La concatenation vit dans une fonction et non dans l'expression generee :
-- `array_to_string` est declaree `stable`, et Postgres refuse toute
-- expression non immuable dans une colonne generee.
create or replace function public.prompts_champ_recherche(
  p_command text,
  p_name text,
  p_description text,
  p_intention text,
  p_tags text[]
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.texte_normalise(
    coalesce(p_command, '') || ' ' ||
    coalesce(p_name, '') || ' ' ||
    coalesce(p_description, '') || ' ' ||
    coalesce(p_intention, '') || ' ' ||
    coalesce(array_to_string(p_tags, ' '), '')
  )
$$;

comment on function public.prompts_champ_recherche(text, text, text, text, text[]) is
  'Champ de recherche normalise d''un raccourci, pour la colonne generee.';

alter table public.prompts
  add column if not exists search_norm text
  generated always as (
    public.prompts_champ_recherche(
      command::text, name, short_description, intention, tags
    )
  ) stored;

comment on column public.prompts.search_norm is
  'Champ de recherche normalise : commande, titre, description, intention, etiquettes.';

create index if not exists prompts_search_norm_idx
  on public.prompts using gin (search_norm extensions.gin_trgm_ops);

-- Meme forme pour les categories : chercher « portrait » doit ramener la
-- famille « Portrait, mode & identite » et tout ce qu'elle contient.
alter table public.categories
  add column if not exists search_norm text
  generated always as (
    public.texte_normalise(coalesce(name, '') || ' ' || coalesce(short_description, ''))
  ) stored;

create index if not exists categories_search_norm_idx
  on public.categories using gin (search_norm extensions.gin_trgm_ops);

-- Lecture publique : la colonne ne dit rien de plus que le nom et la
-- description, qui sont deja lisibles. Aucune ecriture n'est possible, une
-- colonne generee refuse les `insert` et `update` explicites.
grant select (search_norm) on table public.prompts to anon, authenticated;
grant select (search_norm) on table public.categories to anon, authenticated;

-- Les fonctions ne servent qu'aux colonnes generees et aux requetes serveur.
revoke all on function public.texte_normalise(text) from public;
grant execute on function public.texte_normalise(text) to anon, authenticated, service_role;
revoke all on function public.prompts_champ_recherche(text, text, text, text, text[]) from public;
grant execute on function public.prompts_champ_recherche(text, text, text, text, text[])
  to anon, authenticated, service_role;
