-- =====================================================================
-- La refonte V5 : ce que les lots doivent garantir
--
-- Les lots eux-memes s'eprouvent ailleurs, par `tests/db/repetition-v5.sh`,
-- qui les passe deux fois sur un replica de la production. Ce fichier-ci
-- verrouille les bornes de schema sur lesquelles ils s'appuient — celles
-- qui, si elles bougeaient, feraient echouer l'import en production ou,
-- pire, le laisseraient passer en ecrivant n'importe quoi.
--
-- Quatre garanties, et la raison de chacune :
--
--   * le regime de personnalisation borne le nombre de champs, et il le
--     borne differemment selon le regime. Un plafond unique a quatre aurait
--     ouvert quatre saisies a toutes les fiches ;
--
--   * `external_ref` est unique sur `prompts` : c'est la clef de reprise
--     des 41 cartes neuves, et sans unicite une reexecution les dupliquerait ;
--
--   * l'unicite du slug ne porte que sur le non-archive. C'est ce qui rend
--     possible le cas /floatingproduct, ou une carte publiee cede son slug
--     a une carte archivee que la refonte reactive — mais seulement si le
--     retrait passe avant ;
--
--   * un alias ne pointe jamais sur lui-meme, et survit a l'archivage de
--     sa carte source : les 700 regroupements en dependent.
-- =====================================================================
begin;

-- --- Le regime borne les champs, et pas de la meme facon pour tous ------
do $$
declare
  v_prompt uuid;
begin
  select id into v_prompt from public.prompts limit 1;

  update public.prompts set regime_champs = 'marketing', fiche_champs_max = 4
  where id = v_prompt;

  perform tests_assert(
    (select fiche_champs_max from public.prompts where id = v_prompt) = 4,
    'Le regime marketing n''accepte pas ses quatre champs : 63 cartes V5 sont '
    'refusees a l''import.');

  -- Cinq n'existe dans aucun regime.
  begin
    update public.prompts set fiche_champs_max = 5 where id = v_prompt;
    perform tests_assert(false, 'Cinq champs ont ete acceptes en marketing.');
  exception when check_violation then null;
  end;

  -- Et le regime standard reste a trois : c'est tout l'interet de porter le
  -- regime sur la carte plutot que de relever le plafond pour tout le monde.
  update public.prompts set fiche_champs_max = 3 where id = v_prompt;
  begin
    update public.prompts set regime_champs = 'standard', fiche_champs_max = 4
    where id = v_prompt;
    perform tests_assert(false, 'Une carte standard a annonce quatre champs.');
  exception when check_violation then null;
  end;

  -- Un regime invente est refuse : l'importeur ne doit pas pouvoir ecrire
  -- « markting » et desactiver la borne sans que rien ne leve.
  begin
    update public.prompts set regime_champs = 'illimite' where id = v_prompt;
    perform tests_assert(false, 'Un regime de champs inconnu a ete accepte.');
  exception when check_violation then null;
  end;
end $$;

-- --- external_ref est la clef de reprise des cartes neuves --------------
do $$
declare
  v_a uuid;
begin
  insert into public.prompts (external_ref, command, name, slug, mode, short_description)
  values ('rc5-essai-unicite', '/essai-refonte-v5', 'Essai refonte', 'essai-refonte-v5',
          'image', 'Essai')
  returning id into v_a;

  -- Sans cette unicite, rejouer un lot creerait une seconde carte au lieu
  -- de retrouver la premiere.
  begin
    insert into public.prompts (external_ref, command, name, slug, mode, short_description)
    values ('rc5-essai-unicite', '/essai-refonte-v5-bis', 'Essai bis', 'essai-refonte-v5-bis',
            'image', 'Essai');
    perform tests_assert(false, 'Deux cartes partagent le meme external_ref.');
  exception when unique_violation then null;
  end;

  delete from public.prompts where id = v_a;
end $$;

-- --- Le slug se libere en archivant, et pas autrement --------------------
--
-- Le cas /floatingproduct : une carte publiee detient le slug, une carte
-- archivee le reclame. La refonte archive la premiere et reactive la
-- seconde. Dans cet ordre, cela passe ; dans l'autre, l'index leve. Le lot
-- 300 passe avant le lot 401 pour cette raison precise.
do $$
declare
  v_publiee uuid;
  v_archivee uuid;
begin
  insert into public.prompts (command, name, slug, mode, short_description, status)
  values ('/essai-slug-v5', 'Detentrice', 'essai-slug-v5', 'image', 'Essai', 'published')
  returning id into v_publiee;

  insert into public.prompts (command, name, slug, mode, short_description, status)
  values ('/essai-slug-v5', 'Pretendante', 'essai-slug-v5', 'image', 'Essai', 'archived')
  returning id into v_archivee;

  -- Reactiver avant d'archiver : refuse, et c'est la garantie qu'on veut.
  begin
    update public.prompts set status = 'draft' where id = v_archivee;
    perform tests_assert(false,
      'Deux cartes actives partagent un slug : l''ordre des lots ne protege plus rien.');
  exception when unique_violation then null;
  end;

  -- Dans le bon ordre, le slug se libere.
  update public.prompts set status = 'archived' where id = v_publiee;
  update public.prompts set status = 'draft' where id = v_archivee;

  perform tests_assert(
    (select status from public.prompts where id = v_archivee) = 'draft',
    'Le slug ne se libere pas quand sa detentrice est archivee.');

  delete from public.prompts where id in (v_publiee, v_archivee);
end $$;

-- --- Un alias survit a l'archivage de sa source --------------------------
do $$
declare
  v_source uuid;
  v_cible uuid;
begin
  insert into public.prompts (command, name, slug, mode, short_description, status)
  values ('/essai-alias-source', 'Source', 'essai-alias-source', 'image', 'Essai', 'published')
  returning id into v_source;
  insert into public.prompts (command, name, slug, mode, short_description, status)
  values ('/essai-alias-cible', 'Cible', 'essai-alias-cible', 'image', 'Essai', 'published')
  returning id into v_cible;

  insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id)
  values (v_source, v_cible);

  -- Les lots posent les alias AVANT les retraits. Il faut donc qu'archiver
  -- la source ne les emporte pas, sinon 700 regroupements perdraient leur
  -- redirection a l'instant ou elle devient utile.
  update public.prompts set status = 'archived' where id = v_source;

  perform tests_assert(
    exists (select 1 from public.prompt_aliases
            where alias_prompt_id = v_source and canonical_prompt_id = v_cible),
    'Archiver une carte regroupee emporte son alias : le lien casse au pire moment.');

  -- Et la cible d'un alias ne se supprime pas tant qu'un alias la vise.
  -- C'est la garantie qui protege les 601 representantes : aucune ne peut
  -- disparaitre en laissant pendre les regroupements qui pointent sur elle.
  begin
    delete from public.prompts where id = v_cible;
    perform tests_assert(false,
      'Une carte visee par un alias a ete supprimee : 700 regroupements '
      'pourraient pointer dans le vide.');
  exception when foreign_key_violation then null;
  end;

  -- Le menage se fait dans l'ordre, et cet ordre est precisement celui que
  -- la contrainte impose : l'alias d'abord, les cartes ensuite. Les deux
  -- suppressions sont separees a dessein — les passer en une seule
  -- instruction laisserait Postgres choisir son ordre, et le test ne
  -- reussirait qu'une fois sur deux.
  delete from public.prompt_aliases where alias_prompt_id = v_source;
  delete from public.prompts where id = v_source;
  delete from public.prompts where id = v_cible;
end $$;

rollback;
