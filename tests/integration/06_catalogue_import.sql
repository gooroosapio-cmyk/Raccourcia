-- Verifie l'import initial du catalogue editorial (151 raccourcis).
-- Ce test ne s'execute que si supabase/seed/catalogue.sql a ete applique.
do $$
declare
  v_prompts integer;
  v_image integer;
  v_texte integer;
  v_analyse integer;
  v_versions integer;
  v_orphans integer;
  v_visible_analyse integer;
begin
  select count(*) into v_prompts from public.prompts where external_ref like 'RCI-%';
  if v_prompts = 0 then
    raise notice 'Catalogue non importe : test ignore.';
    return;
  end if;

  perform tests_assert(v_prompts = 151,
    format('151 raccourcis attendus, %s importes.', v_prompts));

  select count(*) into v_image from public.prompts where external_ref like 'RCI-%' and mode = 'image';
  select count(*) into v_texte from public.prompts where external_ref like 'RCI-%' and mode = 'texte';
  select count(*) into v_analyse from public.prompts where external_ref like 'RCI-%' and mode = 'analyse';
  perform tests_assert(v_image = 61, format('61 raccourcis image attendus, %s.', v_image));
  perform tests_assert(v_texte = 50, format('50 raccourcis texte attendus, %s.', v_texte));
  perform tests_assert(v_analyse = 40, format('40 raccourcis analyse attendus, %s.', v_analyse));

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

  -- Le mode Analyse est livre pret mais masque : ses categories restent en
  -- brouillon tant que l'administration ne les publie pas.
  select count(*) into v_visible_analyse
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.mode = 'analyse' and c.is_visible;
  perform tests_assert(v_visible_analyse = 0,
    'Le mode Analyse ne doit pas etre visible avant activation.');

  -- Les prompts texte n'imposent aucune carte image.
  perform tests_assert(
    not exists (select 1 from public.prompts where mode <> 'image' and show_image_card),
    'Un prompt texte impose une carte image.');

  -- Regle R04 : QCM limite a 3 questions (verifie aussi par contrainte SQL).
  perform tests_assert(
    not exists (select 1 from public.prompt_versions where jsonb_array_length(qcm) > 3),
    'Un QCM depasse 3 questions.');
end;
$$;
