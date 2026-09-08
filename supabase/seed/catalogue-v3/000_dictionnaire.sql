-- =====================================================================
-- Catalogue V3 — socle du dictionnaire de textes
--
-- Les 555 payloads ne contiennent que 2 565 lignes distinctes. Elles sont
-- deposees une fois dans une table de travail, puis referencees par indice.
-- La table et ses fonctions disparaissent au dernier lot (990).
-- =====================================================================

create table if not exists public.import_v3_texte (
  i integer primary key,
  t text not null
);

-- Table de travail : personne d'autre que l'import n'a a la lire.
alter table public.import_v3_texte enable row level security;

-- Un texte, par indice. Renvoie NULL pour un indice absent ou nul, ce qui
-- laisse passer les champs facultatifs sans cas particulier.
create or replace function public.import_v3_t(i integer)
returns text language sql stable set search_path = '' as $fn$
  select t from public.import_v3_texte where import_v3_texte.i = import_v3_t.i
$fn$;

-- Un tableau de textes, dans l'ordre des indices fournis.
create or replace function public.import_v3_tab(idx integer[])
returns text[] language sql stable set search_path = '' as $fn$
  select coalesce(
    (select array_agg(x.t order by o.ord)
       from unnest(idx) with ordinality o(i, ord)
       join public.import_v3_texte x on x.i = o.i),
    '{}'::text[])
$fn$;

-- Un payload, recompose ligne a ligne. Le controle de longueur garantit
-- qu'aucun indice ne manque : une ligne perdue changerait le prompt.
create or replace function public.import_v3_payload(idx integer[])
returns text language sql stable set search_path = '' as $fn$
  select case
    when (select count(*) from unnest(idx) o(i)
            join public.import_v3_texte x on x.i = o.i) <> cardinality(idx)
    then null
    else (select string_agg(x.t, chr(10) order by o.ord)
            from unnest(idx) with ordinality o(i, ord)
            join public.import_v3_texte x on x.i = o.i)
  end
$fn$;
