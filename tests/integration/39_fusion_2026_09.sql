-- =====================================================================
-- La fusion des deux catalogues
--
-- Elle deplace ce qui est en ligne plutot que de le remplacer : seules 49
-- des 596 commandes publiees portent encore le meme nom dans le catalogue
-- V2, et les visuels deposes depuis des semaines sont attaches aux
-- anciennes. Les archiver toutes les ferait disparaitre de l'ecran.
--
-- Ce que ce test verifie :
--
--   * aucune commande publiee ne reste dans l'ancienne arborescence, et
--     aucun ancien rayon ne reste ouvert — une bibliotheque a deux
--     arborescences est une bibliotheque ou l'on cherche deux fois ;
--   * rien de publie sans collection ni sans texte a copier : un bouton de
--     copie qui echoue ne dit pas pourquoi ;
--   * les commandes retirees sont archivees, pas supprimees : leur ligne,
--     leurs visuels et leur historique sont toujours la ;
--   * les visuels n'ont pas bouge.
-- =====================================================================
begin;

do $$
declare
  v_fusionne integer;
  v_hors_arbre integer;
  v_anciens_rayons integer;
  v_orphelines integer;
  v_sans_payload integer;
begin
  -- Rien a verifier si la fusion n'a pas ete appliquee : la suite tourne
  -- aussi sur une base ou seul le catalogue precedent existe.
  select count(*) into v_fusionne
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and c.external_ref like 'V2COL-%';
  if v_fusionne = 0 then return; end if;

  -- « L'ancienne arborescence » est ce que l'import precedent a pose : ses
  -- rayons portent une reference en `V2-`. Une base de recette porte aussi
  -- des rayons crees a la main, qui ne relevent pas de cette fusion.
  select count(*) into v_hors_arbre
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and c.external_ref like 'V2-%';
  perform tests_assert(v_hors_arbre = 0,
    format('%s commande(s) publiee(s) restent dans l''ancienne arborescence.', v_hors_arbre));

  select count(*) into v_anciens_rayons
  from public.categories
  where status <> 'archived' and external_ref like 'V2-%';
  perform tests_assert(v_anciens_rayons = 0,
    format('%s ancien(s) rayon(s) restent ouverts apres la fusion.', v_anciens_rayons));

  select count(*) into v_orphelines
  from public.prompts
  where status = 'published' and category_id is null
    and (external_ref like 'V2-%' or card_id is not null);
  perform tests_assert(v_orphelines = 0,
    format('%s commande(s) publiee(s) sans collection.', v_orphelines));

  select count(*) into v_sans_payload
  from public.prompts p
  where p.status = 'published'
    and (p.external_ref like 'V2-%' or p.card_id is not null)
    and not exists (
      select 1 from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where v.prompt_id = p.id);
  perform tests_assert(v_sans_payload = 0,
    format('%s commande(s) publiee(s) sans texte a copier.', v_sans_payload));
end $$;

-- --- Ce qui est retire est archive, jamais supprime ----------------------
do $$
declare
  v_fusionne integer;
  v_modes integer;
  v_parcours integer;
begin
  select count(*) into v_fusionne
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and c.external_ref like 'V2COL-%';
  if v_fusionne = 0 then return; end if;

  -- Les Modes IA et les Parcours gardent leur ligne : on doit pouvoir les
  -- rouvrir d'un geste si un choix se revele mauvais.
  select count(*) into v_modes
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where c.slug = 'clarte-et-modeles-mentaux';

  select count(*) into v_parcours
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where c.slug = 'parcours-visuels';

  perform tests_assert(v_modes > 0 and v_parcours > 0,
    'Les Modes IA ou les Parcours ont ete supprimes au lieu d''etre archives.');

  perform tests_assert(
    not exists (
      select 1 from public.prompts p
      join public.categories c on c.id = p.category_id
      where c.slug in ('clarte-et-modeles-mentaux', 'parcours-visuels')
        and p.status <> 'archived'),
    'Une commande de Mode IA ou de Parcours est encore active.');
end $$;

-- --- La taxonomie qui reste est exactement la nouvelle -------------------
do $$
declare
  v_categories integer;
  v_collections integer;
  v_autres integer;
begin
  select count(*) into v_categories
  from public.categories where status <> 'archived' and external_ref like 'V2CAT-%';
  if v_categories = 0 then return; end if;

  select count(*) into v_collections
  from public.categories where status <> 'archived' and external_ref like 'V2COL-%';

  select count(*) into v_autres
  from public.categories
  where status <> 'archived' and external_ref like 'V2-%';

  perform tests_assert(
    v_categories = 27 and v_collections = 73 and v_autres = 0,
    format('Taxonomie apres fusion : %s categories, %s collections, %s rayon(s) etranger(s).',
           v_categories, v_collections, v_autres));
end $$;

rollback;
