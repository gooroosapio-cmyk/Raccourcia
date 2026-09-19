-- =====================================================================
-- La suppression definitive, et ce qu'elle refuse
--
-- Archiver reste le geste par defaut. Celui-ci ne se defait pas, donc ce
-- qu'il garantit doit etre verifie par la base et non par l'ecran :
--
--   * un membre ne supprime rien, meme en appelant la fonction en direct ;
--   * on sait d'avance ce qui partira — l'apercu compte ce qui est rattache ;
--   * une commande qui sert de destination a d'anciens liens ne part pas
--     sans qu'on le dise ;
--   * un rayon qui porte encore des commandes exige de dire ou elles vont,
--     et la destination ne peut pas etre un rayon qui part avec lui ;
--   * rien ne reste orphelin ;
--   * le journal garde la trace de ce qui a disparu — c'est tout ce qui en
--     reste.
-- =====================================================================
begin;

-- Le decor des anciens liens se pose en tant que proprietaire : l'ecriture
-- de `prompt_aliases` est fermee aux roles clients, y compris a un
-- administrateur, et c'est voulu — seules les fonctions d'administration y
-- touchent. Le test verifie la fonction, pas le droit d'ecrire a la main.
create temporary table essai_liens (destination uuid, ancien uuid);
grant select on essai_liens to authenticated;

do $$
declare
  v_destination uuid;
  v_ancien uuid;
begin
  insert into public.prompts (command, slug, name, mode, short_description, status)
  values ('/essai-destination', 'essai-destination', 'Destination', 'image', 'Essai', 'draft')
  returning id into v_destination;

  insert into public.prompts (command, slug, name, mode, short_description, status)
  values ('/essai-ancien', 'essai-ancien', 'Ancien', 'image', 'Essai', 'archived')
  returning id into v_ancien;

  insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id)
  values (v_ancien, v_destination);

  insert into essai_liens values (v_destination, v_ancien);
end $$;

-- --- Un membre ne supprime rien ------------------------------------------
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
declare v_prompt uuid;
begin
  select id into v_prompt from public.prompts where status = 'published' limit 1;

  begin
    perform public.admin_supprimer_commande(v_prompt);
    perform tests_assert(false, 'Un membre a supprime une commande.');
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_apercu_suppression_commande(v_prompt);
    perform tests_assert(false, 'Un membre a lu le bilan de suppression d''une commande.');
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_liste_tags();
    perform tests_assert(false, 'Un membre a lu la liste d''administration des tags.');
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- --- L'administration, elle, sait ce qu'elle detruit ----------------------
select tests_login('00000000-0000-0000-0000-0000000000a3');

do $$
declare
  v_prompt uuid;
  v_tag uuid;
  v_apercu jsonb;
  v_champ uuid;
  v_journal integer;
begin
  select id into v_tag from public.tags where is_active limit 1;

  insert into public.prompts (command, slug, name, mode, short_description, status)
  values ('/essai-suppression', 'essai-suppression', 'Essai suppression',
          'image', 'Essai', 'draft')
  returning id into v_prompt;

  insert into public.prompt_tags (prompt_id, tag_id) values (v_prompt, v_tag);
  insert into public.prompt_fields (prompt_id, cle, libelle, position)
  values (v_prompt, 'secteur', 'Secteur', 1)
  returning id into v_champ;
  insert into public.prompt_field_choices (field_id, valeur, libelle)
  values (v_champ, 'a', 'A');
  insert into public.prompt_media (prompt_id, kind, storage_path, sort_order)
  values (v_prompt, 'after', 'essai/suppression.webp', 1);

  v_apercu := public.admin_apercu_suppression_commande(v_prompt);

  perform tests_assert(
    (v_apercu ->> 'tags')::int = 1
      and (v_apercu ->> 'champs')::int = 1
      and (v_apercu ->> 'visuels')::int = 1,
    'Le bilan de suppression ne compte pas ce qui est rattache a la commande.');

  select count(*) into v_journal from public.admin_audit_logs
  where action = 'raccourci.suppression' and entity_id = v_prompt;
  perform tests_assert(v_journal = 0, 'Le journal parle d''une suppression qui n''a pas eu lieu.');

  -- Les chemins de stockage reviennent a l'appelant : la base ne sait pas
  -- effacer un fichier, et les laisser ferait grossir le bucket d'images
  -- que plus rien ne reference.
  perform tests_assert(
    public.admin_supprimer_commande(v_prompt) -> 'chemins'
      @> '["essai/suppression.webp"]'::jsonb,
    'La suppression ne rend pas les chemins des visuels a nettoyer.');

  perform tests_assert(
    not exists (select 1 from public.prompts where id = v_prompt),
    'La commande existe encore apres sa suppression.');

  -- Aucun orphelin : tout ce qui pendait a la commande est parti avec.
  perform tests_assert(
    not exists (select 1 from public.prompt_tags where prompt_id = v_prompt)
      and not exists (select 1 from public.prompt_fields where prompt_id = v_prompt)
      and not exists (select 1 from public.prompt_field_choices where field_id = v_champ)
      and not exists (select 1 from public.prompt_media where prompt_id = v_prompt),
    'La suppression d''une commande laisse des enregistrements orphelins.');

  select count(*) into v_journal from public.admin_audit_logs
  where action = 'raccourci.suppression' and entity_id = v_prompt;
  perform tests_assert(
    v_journal = 1,
    'Le journal ne garde pas la trace de la commande supprimee.');
end $$;

-- --- Une commande qui porte d'anciens liens ne part pas en silence --------
do $$
declare
  v_destination uuid;
  v_ancien uuid;
begin
  select destination, ancien into v_destination, v_ancien from essai_liens;

  begin
    perform public.admin_supprimer_commande(v_destination);
    perform tests_assert(false, 'Une commande destination d''anciens liens a ete supprimee sans avertissement.');
  exception when foreign_key_violation then null;
  end;

  perform tests_assert(
    exists (select 1 from public.prompts where id = v_destination),
    'La commande a disparu malgre le refus.');

  -- Avec le consentement explicite, les liens partent avec elle.
  perform public.admin_supprimer_commande(v_destination, true);

  perform tests_assert(
    not exists (select 1 from public.prompt_aliases where canonical_prompt_id = v_destination),
    'Les anciens liens survivent a la commande qu''ils designaient.');

  delete from public.prompts where id = v_ancien;
end $$;

-- --- Un rayon ne part pas avec ses commandes -------------------------------
do $$
declare
  v_parent uuid;
  v_enfant uuid;
  v_ailleurs uuid;
  v_prompt uuid;
  v_apercu jsonb;
begin
  insert into public.categories (slug, name, mode, status)
  values ('essai-rayon', 'Essai rayon', 'image', 'published')
  returning id into v_parent;

  insert into public.categories (slug, name, mode, status, parent_id)
  values ('essai-sous-rayon', 'Essai sous-rayon', 'image', 'published', v_parent)
  returning id into v_enfant;

  insert into public.categories (slug, name, mode, status)
  values ('essai-refuge', 'Essai refuge', 'image', 'published')
  returning id into v_ailleurs;

  insert into public.prompts (command, slug, name, mode, short_description, status, category_id)
  values ('/essai-range', 'essai-range', 'Rangee', 'image', 'Essai', 'draft', v_enfant)
  returning id into v_prompt;

  v_apercu := public.admin_apercu_suppression_categorie(v_parent);

  -- Le bilan compte les commandes du rayon ET de ses sous-rayons : supprimer
  -- un parent emporte ses enfants, donc le bilan doit compter les deux.
  perform tests_assert(
    (v_apercu ->> 'sous_rayons')::int = 1 and (v_apercu ->> 'commandes')::int = 1,
    'Le bilan d''un rayon ignore ses sous-rayons ou leurs commandes.');

  begin
    perform public.admin_supprimer_categorie(v_parent);
    perform tests_assert(false, 'Un rayon qui porte des commandes a ete supprime sans reaffectation.');
  exception when foreign_key_violation then null;
  end;

  -- La destination ne peut pas etre un rayon qui part avec celui qu'on
  -- supprime : les commandes se retrouveraient rangees dans le vide.
  begin
    perform public.admin_supprimer_categorie(v_parent, v_enfant);
    perform tests_assert(false, 'Les commandes ont ete reaffectees vers un rayon qui part aussi.');
  exception when invalid_parameter_value then null;
  end;

  perform public.admin_supprimer_categorie(v_parent, v_ailleurs);

  perform tests_assert(
    (select category_id from public.prompts where id = v_prompt) = v_ailleurs,
    'La commande n''a pas suivi la reaffectation.');

  perform tests_assert(
    not exists (select 1 from public.categories where id in (v_parent, v_enfant)),
    'Le rayon ou son sous-rayon survit a la suppression.');

  delete from public.prompts where id = v_prompt;
  delete from public.categories where id = v_ailleurs;
end $$;

-- --- Un tag supprime ne fait disparaitre aucune commande -------------------
do $$
declare
  v_tag uuid;
  v_prompt uuid;
  v_apercu jsonb;
begin
  select id into v_prompt from public.prompts where status = 'published' limit 1;

  insert into public.tags (slug, name, groupe) values ('essai-tag', 'Essai tag', 'autre')
  returning id into v_tag;
  insert into public.prompt_tags (prompt_id, tag_id) values (v_prompt, v_tag);

  v_apercu := public.admin_supprimer_tag(v_tag);

  perform tests_assert(
    (v_apercu ->> 'commandes')::int = 1,
    'Le bilan d''un tag ne dit pas combien de commandes perdent l''etiquette.');

  perform tests_assert(
    exists (select 1 from public.prompts where id = v_prompt),
    'Supprimer un tag a emporte une commande.');

  perform tests_assert(
    not exists (select 1 from public.prompt_tags where tag_id = v_tag),
    'Les associations d''un tag supprime subsistent.');
end $$;

reset role;

rollback;
