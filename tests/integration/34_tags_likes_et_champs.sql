-- =====================================================================
-- Le socle V3 : tags relationnels, champs de personnalisation
--
-- Ce test porte sur les garanties qu'aucune interface ne peut offrir :
-- qu'un formulaire de fiche ne devienne pas un questionnaire, et qu'un tag ne se
-- dedouble pas sous une variante d'ecriture — le defaut precis qui a rendu
-- l'ancienne colonne `tags` inutilisable.
-- =====================================================================
begin;

-- --- Un slug de tag ne peut pas se dedoubler ---------------------------
do $$
declare v_id uuid;
begin
  insert into public.tags (slug, name) values ('Portrait Pro !!', 'Essai')
  returning id into v_id;

  perform tests_assert(
    (select slug from public.tags where id = v_id) = 'portrait-pro',
    'Le slug d''un tag n''est pas normalise : deux ecritures creeraient deux tags.');

  -- La meme idee ecrite autrement doit buter sur l'unicite, pas creer un
  -- second tag. C'est exactement « mode-ia » contre « modes-ia ».
  begin
    insert into public.tags (slug, name) values ('portrait---pro', 'Doublon');
    perform tests_assert(false, 'Un doublon de tag a ete accepte.');
  exception when unique_violation then null;
  end;

  delete from public.tags where id = v_id;
end $$;

-- Les « j'aime » ont ete retires le 24 septembre 2026 (decision 4B) : leur
-- disparition est verifiee par 48_retrait_jaime_et_rayons_epingles.sql.

-- --- Le formulaire de fiche reste un formulaire -------------------------
do $$
declare
  v_prompt uuid;
  v_champ uuid;
begin
  -- Une commande qui ne porte encore aucun champ : depuis le catalogue de
  -- septembre 2026, la plupart en declarent un ou trois, et reprendre la
  -- premiere venue buterait sur l'unicite de la position.
  select id into v_prompt from public.prompts p
  where p.status = 'published'
    and not exists (select 1 from public.prompt_fields f where f.prompt_id = p.id)
  limit 1;

  insert into public.prompt_fields (prompt_id, cle, libelle, position)
  values (v_prompt, 'Chiffre d''affaires', 'Chiffre d''affaires', 1)
  returning id into v_champ;

  perform tests_assert(
    (select cle from public.prompt_fields where id = v_champ) = 'chiffre_d_affaires',
    'La clef d''un champ n''est pas normalisee : elle ne correspondrait a aucune variable.');

  -- Deux champs a la meme place : refuse.
  begin
    insert into public.prompt_fields (prompt_id, cle, libelle, position)
    values (v_prompt, 'autre', 'Autre', 1);
    perform tests_assert(false, 'Deux champs occupent la meme position.');
  exception when unique_violation then null;
  end;

  -- Un quatrieme champ : accepte depuis le catalogue V5, qui introduit le
  -- regime marketing. Une affiche sans son titre, son offre et son contact
  -- ne produit rien d'utilisable, et trois lignes n'y suffisaient pas.
  --
  -- La borne n'a pas disparu pour autant, elle s'est deplacee : la position
  -- va jusqu'a quatre, et c'est `prompts.regime_champs` qui dit combien une
  -- carte donnee a le droit d'en declarer — trois en standard, quatre en
  -- marketing. Sans cette seconde borne, relever la position aurait ouvert
  -- quatre saisies a toutes les fiches, ce que la limite existait pour
  -- empecher.
  insert into public.prompt_fields (prompt_id, cle, libelle, position)
  values (v_prompt, 'quatrieme', 'Quatrieme', 4);

  perform tests_assert(
    (select count(*) from public.prompt_fields where prompt_id = v_prompt) = 2,
    'Le quatrieme champ du regime marketing est refuse.');

  -- Un cinquieme reste refuse : la borne s'est deplacee, pas levee.
  begin
    insert into public.prompt_fields (prompt_id, cle, libelle, position)
    values (v_prompt, 'cinquieme', 'Cinquieme', 5);
    perform tests_assert(false, 'Un cinquieme champ a ete accepte.');
  exception when check_violation then null;
  end;

  -- Et la borne portee par la carte tient, elle aussi : une carte standard
  -- ne peut pas annoncer quatre champs sur sa fiche.
  begin
    update public.prompts set regime_champs = 'standard', fiche_champs_max = 4
    where id = v_prompt;
    perform tests_assert(false, 'Une carte standard annonce quatre champs.');
  exception when check_violation then null;
  end;

  update public.prompts set regime_champs = 'marketing', fiche_champs_max = 4
  where id = v_prompt;

  perform tests_assert(
    (select fiche_champs_max from public.prompts where id = v_prompt) = 4,
    'Une carte marketing ne peut pas annoncer quatre champs.');

  -- Supprimer un champ emporte ses choix :
  -- aucun enregistrement orphelin.
  insert into public.prompt_field_choices (field_id, valeur, libelle)
  values (v_champ, 'a', 'A');

  delete from public.prompt_fields where id = v_champ;
  perform tests_assert(
    not exists (select 1 from public.prompt_field_choices where field_id = v_champ),
    'Les choix d''un champ supprime subsistent.');
end $$;

-- --- Chaque commande publiee porte au moins sa bibliotheque -------------
do $$
declare v_n integer;
begin
  select count(*) into v_n
  from public.prompts p
  where p.status = 'published' and p.library is null;
  if v_n > 0 then
    raise exception 'Socle V3 : % commande(s) publiee(s) sans bibliotheque.', v_n;
  end if;

  select count(*) into v_n
  from public.prompts p
  where p.status = 'published'
    and not exists (select 1 from public.prompt_tags pt where pt.prompt_id = p.id);
  if v_n > 0 then
    raise exception 'Socle V3 : % commande(s) publiee(s) sans aucun tag.', v_n;
  end if;

  -- Une compatibilite IA ne s'invente pas : un tag d'IA ne doit exister que
  -- si une variante publiee le declare.
  select count(*) into v_n
  from public.prompt_tags pt
  join public.tags t on t.id = pt.tag_id and t.groupe = 'ia'
  where not exists (
    select 1 from public.prompt_variants v
    join public.ai_providers f on f.id = v.provider_id and f.key = t.slug
    where v.prompt_id = pt.prompt_id
      and v.status = 'published'
      and v.compatibility <> 'non_supporte'
  );
  if v_n > 0 then
    raise exception 'Socle V3 : % tag(s) d''IA sans variante correspondante.', v_n;
  end if;

  raise notice 'Socle V3 : verifie.';
end $$;

rollback;
