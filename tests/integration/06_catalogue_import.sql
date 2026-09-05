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

  perform tests_assert(v_prompts = 250,
    format('250 raccourcis attendus, %s importes.', v_prompts));

  select count(*) into v_image from public.prompts where external_ref like 'RCI-%' and mode = 'image';
  select count(*) into v_texte from public.prompts where external_ref like 'RCI-%' and mode = 'texte';
  select count(*) into v_analyse from public.prompts where external_ref like 'RCI-%' and mode = 'analyse';
  perform tests_assert(v_image = 110, format('110 raccourcis image attendus, %s.', v_image));
  perform tests_assert(v_texte = 140, format('140 raccourcis texte attendus, %s.', v_texte));
  -- Regle R01/R03 : la navigation n'expose que deux domaines, les anciens
  -- raccourcis ANALYSER sont reclasses dans TEXTE.
  perform tests_assert(v_analyse = 0,
    format('Le mode analyse ne doit plus porter aucun raccourci, %s trouves.', v_analyse));

  -- Regle R02 : taxonomie finale a 10 categories et 20 sous-categories.
  -- Le slug d'une categorie v2 commence par son mode : cela distingue la
  -- taxonomie importee des categories creees par les jeux de test.
  select count(*) into v_parents
  from public.categories
  where parent_id is null and status = 'published'
    and (slug like 'image-%' or slug like 'texte-%');
  select count(*) into v_children
  from public.categories
  where parent_id is not null and status = 'published'
    and (slug like 'image-%' or slug like 'texte-%');
  perform tests_assert(v_parents = 10, format('10 categories attendues, %s.', v_parents));
  perform tests_assert(v_children = 20, format('20 sous-categories attendues, %s.', v_children));

  -- La hierarchie reste a deux niveaux : aucune categorie petite-fille.
  select count(*) into v_depth
  from public.categories c
  join public.categories p on p.id = c.parent_id
  where p.parent_id is not null;
  perform tests_assert(v_depth = 0, 'La hierarchie depasse deux niveaux.');

  -- Chaque raccourci appartient a une sous-categorie (Regle R02).
  select count(*) into v_uncategorised
  from public.prompts p
  left join public.categories c on c.id = p.category_id
  where p.external_ref like 'RCI-%' and (c.id is null or c.parent_id is null);
  perform tests_assert(v_uncategorised = 0,
    format('%s raccourcis ne sont pas ranges dans une sous-categorie.', v_uncategorised));

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
  perform tests_assert(
    not exists (
      select 1 from public.prompts p
      join public.prompt_variants v on v.prompt_id = p.id
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where p.external_ref like 'RCI-%'
        and p.max_questions > jsonb_array_length(pv.qcm)
    ),
    'Un raccourci annonce plus de questions qu''il n''en porte.');
end;
$$;
