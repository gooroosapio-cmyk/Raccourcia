-- Verifie l'import du catalogue editorial v2.0 (250 raccourcis, 2 domaines).
-- Ce test ne s'execute que si supabase/seed/catalogue.sql a ete applique.
do $$
declare
  v_prompts integer;
  v_image integer;
  v_texte integer;
  v_analyse integer;
  v_versions integer;
  v_orphans integer;
  v_parents integer;
  v_children integer;
  v_depth integer;
  v_uncategorised integer;
begin
  select count(*) into v_prompts from public.prompts where external_ref like 'RCI-%';
  if v_prompts = 0 then
    raise notice 'Catalogue non importe : test ignore.';
    return;
  end if;

  -- Le catalogue V2 ajoute 70 commandes aux 250 historiques : le seuil est
  -- donc un minimum, pas une egalite. Le compte exact de la V2 est verifie
  -- par 13_catalogue_v2.sql, sur les seules lignes qu'elle porte.
  perform tests_assert(v_prompts >= 250,
    format('au moins 250 raccourcis attendus, %s importes.', v_prompts));

  select count(*) into v_image from public.prompts where external_ref like 'RCI-%' and mode = 'image';
  select count(*) into v_texte from public.prompts where external_ref like 'RCI-%' and mode = 'texte';
  select count(*) into v_analyse from public.prompts where external_ref like 'RCI-%' and mode = 'analyse';
  -- La repartition par domaine est celle du catalogue en vigueur : la V2
  -- reclasse une partie des raccourcis, 13_catalogue_v2.sql en verifie le
  -- compte exact. Ici on ne controle plus que la coherence : rien ne se perd
  -- entre les deux domaines.
  perform tests_assert(v_image + v_texte = v_prompts,
    format('%s raccourcis hors des deux domaines.', v_prompts - v_image - v_texte));
  perform tests_assert(v_image > 0 and v_texte > 0,
    'Un domaine est vide : la navigation n en exposerait plus qu un.');
  -- Regle R01/R03 : la navigation n'expose que deux domaines, les anciens
  -- raccourcis ANALYSER sont reclasses dans TEXTE.
  perform tests_assert(v_analyse = 0,
    format('Le mode analyse ne doit plus porter aucun raccourci, %s trouves.', v_analyse));

  -- La taxonomie du catalogue en vigueur est plate : treize categories, sans
  -- sous-categorie. Un deuxieme niveau obligeait a deux gestes pour atteindre
  -- une commande, sur un ecran ou l'on n'en a qu'un. Son compte exact est
  -- verifie par 13_catalogue_v2.sql.
  select count(*) into v_parents
  from public.categories
  where parent_id is null and status = 'published' and external_ref is not null;
  perform tests_assert(v_parents > 0, 'Aucune categorie du catalogue en vigueur.');

  -- La hierarchie reste a deux niveaux : aucune categorie petite-fille.
  select count(*) into v_depth
  from public.categories c
  join public.categories p on p.id = c.parent_id
  where p.parent_id is not null;
  perform tests_assert(v_depth = 0, 'La hierarchie depasse deux niveaux.');

  -- Chaque raccourci est range dans une categorie : sans elle, il n'apparait
  -- dans aucune puce et devient introuvable autrement que par la recherche.
  select count(*) into v_uncategorised
  from public.prompts p
  left join public.categories c on c.id = p.category_id
  where p.external_ref like 'RCI-%' and c.id is null;
  perform tests_assert(v_uncategorised = 0,
    format('%s raccourcis sans categorie.', v_uncategorised));

  -- Chaque raccourci doit avoir au moins une version courante publiee,
  -- sinon il serait visible mais impossible a copier.
  select count(*) into v_orphans
  from public.prompts p
  where p.external_ref like 'RCI-%'
    and not exists (
      select 1 from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id
      where v.prompt_id = p.id and v.status = 'published'
        and pv.is_current and pv.status = 'published'
    );
  perform tests_assert(v_orphans = 0,
    format('%s raccourcis publies sans version courante copiable.', v_orphans));

  select count(*) into v_versions from public.prompt_versions;
  perform tests_assert(v_versions > 0, 'Aucune version de payload importee.');

  -- Regle R13 : les prompts texte n'imposent aucune carte image.
  perform tests_assert(
    not exists (select 1 from public.prompts where mode <> 'image' and show_image_card),
    'Un prompt texte impose une carte image.');

  -- Regle R07 : QCM limite a 3 questions (verifie aussi par contrainte SQL).
  perform tests_assert(
    not exists (select 1 from public.prompt_versions where jsonb_array_length(qcm) > 3),
    'Un QCM depasse 3 questions.');

  -- Le plafond annonce au modele ne doit jamais depasser le nombre reel de
  -- questions disponibles : sinon le prompt promet une question qui n'existe pas.
  --
  -- Les questions ont deux domiciles : `prompt_versions.qcm`, ou elles etaient
  -- figees avec un payload, et la table `prompt_questions`, ou le catalogue V2
  -- les a sorties pour que l'administration puisse les modifier sans creer une
  -- version. On compte le plus garni des deux.
  perform tests_assert(
    not exists (
      select 1 from public.prompts p
      where p.external_ref like 'RCI-%'
        and p.max_questions > greatest(
          (select count(*) from public.prompt_questions q where q.prompt_id = p.id),
          coalesce((
            select max(jsonb_array_length(pv.qcm))
            from public.prompt_variants v
            join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
            where v.prompt_id = p.id
          ), 0)
        )
    ),
    'Un raccourci annonce plus de questions qu''il n''en porte.');
end;
$$;
