-- =====================================================================
-- L'exploration de la Bibliotheque par les tags
--
-- La Bibliotheque se parcourait par rayons : cinquante-trois collections
-- rangees sous huit familles. Un rangement d'archiviste — chaque commande a
-- une place et une seule — qui repond mal a la facon dont on cherche. Une
-- commande de portrait vintage en studio appartient a « Portraits », et rien
-- dans l'arbre ne permet de partir de « vintage » ou de « studio ».
--
-- Les tags, eux, se croisent. Deux fonctions suffisent :
--
--   * `tags_explorables` : tout ce qui est reellement porte, deja compte et
--     deja groupe. La grille d'entree de la Bibliotheque.
--   * `tags_voisins` : ce qui se combine avec la selection en cours, et
--     seulement ce qui rendrait encore quelque chose. Proposer un tag qui
--     mene a zero resultat est une impasse deguisee en suggestion.
--
-- `security invoker`, et toutes deux passent par `prompts` : un visiteur ne
-- compte que du publie, et l'existence d'un brouillon ne transparait nulle
-- part. Aucune politique n'est contournee ni assouplie.
--
-- Rejouable : `create or replace` seul.
-- =====================================================================

-- --- Les tags qui ouvrent la Bibliotheque -------------------------------
--
-- Un tag sans commande n'est pas propose. La taxonomie en compte
-- quatre-vingt-dix-huit dont une partie attend encore d'etre posee : une
-- grille qui les montrerait tous conduirait une fois sur trois a un rayon
-- vide, et c'est la premiere chose qu'on verrait de la Bibliotheque.
--
-- Les groupes « bibliotheque » et « IA » n'y figurent pas non plus. Ce sont
-- les deux premieres facettes du filtre de l'accueil : les reproposer ici
-- sous forme de tuiles donnerait deux chemins differents pour le meme
-- choix, et ce sont par ailleurs les seuls tags a porter quatre a six cents
-- commandes — une tuile « Images » ouvrirait sur presque tout le catalogue,
-- ce qui n'est pas explorer.
create or replace function public.tags_explorables()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', slug,
        'nom', nom,
        'groupe', groupe,
        'image', image,
        'total', total)
      order by rang, total desc, nom),
    '[]'::jsonb)
  from (
    select t.slug,
           t.name as nom,
           t.groupe::text as groupe,
           t.image_path as image,
           count(*)::int as total,
           array_position(enum_range(null::public.tag_group), t.groupe) as rang
    from public.tags t
    join public.prompt_tags pt on pt.tag_id = t.id
    join public.prompts p on p.id = pt.prompt_id
    where t.is_active
      and p.status = 'published'
      and t.groupe not in ('bibliotheque', 'ia')
    group by t.slug, t.name, t.groupe, t.image_path
  ) s;
$$;

comment on function public.tags_explorables() is
  'Les tags reellement portes par au moins une commande publiee, comptes et groupes.';

-- --- Ce qui se combine avec la selection en cours ------------------------
--
-- Les tags des commandes qui portent deja tous ceux de `p_tags`, le compte
-- etant celui du croisement et non celui du tag seul. Sans cela, la fiche
-- proposerait « Portrait (484) » a cote de « vintage » alors que le
-- croisement des deux n'en rend que six.
create or replace function public.tags_voisins(
  p_tags text[],
  p_limite integer default 12
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('slug', slug, 'nom', nom, 'groupe', groupe, 'total', total)
      order by total desc, nom),
    '[]'::jsonb)
  from (
    select t.slug, t.name as nom, t.groupe::text as groupe, count(*)::int as total
    from public.prompt_tags pt
    join public.tags t on t.id = pt.tag_id
    join public.prompts p on p.id = pt.prompt_id
    where t.is_active
      and p.status = 'published'
      and t.groupe not in ('bibliotheque', 'ia')
      and not (t.slug = any (p_tags))
      and pt.prompt_id in (select public.prompts_avec_tous_les_tags(p_tags))
    group by t.slug, t.name, t.groupe
    order by count(*) desc, t.name
    limit greatest(p_limite, 0)
  ) s;
$$;

comment on function public.tags_voisins(text[], integer) is
  'Les tags qui se croisent avec la selection, comptes sur le croisement.';

do $rapport$
declare
  v_n integer;
begin
  select jsonb_array_length(public.tags_explorables()) into v_n;
  raise notice 'Exploration : % tag(s) porte(s) par au moins une commande publiee.', v_n;
end $rapport$;
