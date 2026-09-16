-- =====================================================================
-- La recherche couvre les synonymes, les personnages et les univers.
--
-- Elle portait jusqu'ici sur la commande, le titre, la description courte,
-- l'intention et les etiquettes. Deux choses lui manquaient :
--
--   - `search_keywords`, que le classeur remplit depuis le catalogue V2 et
--     que personne n'interrogeait. Des synonymes ecrits et jamais lus.
--   - Le personnage ou l'univers d'une commande, qui n'existait nulle part.
--     Chercher un personnage par son nom ne pouvait donc rien donner, meme
--     le jour ou une commande le viserait.
--
-- `search_norm` est une colonne generee : son expression ne se modifie pas,
-- elle se refait. On la supprime et on la recree avec son index et ses
-- droits — une colonne generee refuse les ecritures explicites, il n'y a
-- rien a proteger de plus que ce qui l'etait deja.
--
-- Additive et rejouable. Aucune donnee n'est touchee : `univers` arrive
-- vide, et la recherche continue de trouver exactement ce qu'elle trouvait.
-- =====================================================================

-- --- Le personnage ou l'univers vise -------------------------------------

alter table public.prompts
  add column if not exists univers text;

comment on column public.prompts.univers is
  'Personnage ou univers que la commande vise, quand elle en vise un. Sert a la recherche et au rangement, jamais a revendiquer un partenariat.';

grant select (univers) on table public.prompts to anon, authenticated;

-- --- Le champ de recherche, elargi ---------------------------------------

create or replace function public.prompts_champ_recherche_v2(
  p_command text,
  p_name text,
  p_description text,
  p_intention text,
  p_tags text[],
  p_mots_cles text[],
  p_univers text
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
    coalesce(array_to_string(p_tags, ' '), '') || ' ' ||
    coalesce(array_to_string(p_mots_cles, ' '), '') || ' ' ||
    coalesce(p_univers, '')
  )
$$;

revoke all on function public.prompts_champ_recherche_v2(text, text, text, text, text[], text[], text) from public;
grant execute on function public.prompts_champ_recherche_v2(text, text, text, text, text[], text[], text)
  to anon, authenticated, service_role;

do $refonte$
begin
  -- Rejouable : si la colonne couvre deja les synonymes, il n'y a rien a
  -- refaire. On reconnait l'ancienne forme a la fonction qu'elle appelle.
  if exists (
    select 1
    from pg_attrdef d
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where d.adrelid = 'public.prompts'::regclass
      and a.attname = 'search_norm'
      and pg_get_expr(d.adbin, d.adrelid) like '%prompts_champ_recherche_v2%'
  ) then
    return;
  end if;

  alter table public.prompts drop column if exists search_norm;

  alter table public.prompts
    add column search_norm text
    generated always as (
      public.prompts_champ_recherche_v2(
        command::text, name, short_description, intention, tags, search_keywords, univers
      )
    ) stored;
end $refonte$;

comment on column public.prompts.search_norm is
  'Champ de recherche normalise : commande, titre, description, intention, etiquettes, synonymes et univers.';

create index if not exists prompts_search_norm_idx
  on public.prompts using gin (search_norm extensions.gin_trgm_ops);

grant select (search_norm) on table public.prompts to anon, authenticated;
