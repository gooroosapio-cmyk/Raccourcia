-- =====================================================================
-- L'origine d'un visuel
--
-- La regle : seuls les visuels deposes depuis la console d'administration
-- restent en base, ceux poses par script s'effacent. Pour qu'elle soit
-- applicable, il faut d'abord qu'elle soit decidable — et elle ne l'etait
-- pas : les deux voies ecrivent le meme chemin de stockage, au caractere
-- pres, et aucune ne renseignait l'auteur.
--
-- Ce fichier verrouille la distinction installee par la migration
-- `20260923140000_origine_des_visuels` :
--
--   * la console, qui ecrit sous le jeton de l'administrateur, laisse son
--     identifiant sans avoir a y penser ;
--   * un script en `service_role`, qui n'a pas de jeton d'utilisateur,
--     laisse un auteur nul ;
--   * et la colonne n'est pas devenue obligatoire pour autant : les 1064
--     lignes ecrites avant la migration portent un auteur nul et doivent
--     pouvoir continuer a vivre en base le temps que l'administration
--     tranche leur sort.
--
-- Sans ce fichier, un futur chemin d'ecriture qui poserait `created_by` a
-- nul, ou une migration qui retirerait le defaut, rendraient la regle
-- silencieusement inapplicable — et un menage suivant effacerait tout.
-- =====================================================================
begin;

-- --- Un depot depuis la console signe son auteur -------------------------
do $$
declare
  v_prompt uuid;
  v_media uuid;
  v_auteur uuid;
begin
  select id into v_prompt from public.prompts limit 1;

  -- L'administrateur des fixtures, tel que PostgREST le presenterait.
  perform tests_login('00000000-0000-0000-0000-0000000000a3');

  insert into public.prompt_media (prompt_id, kind, storage_path)
  values (v_prompt, 'thumbnail',
          'prompts/' || v_prompt || '/thumbnail-essai-console.jpg')
  returning id, created_by into v_media, v_auteur;

  -- `is not distinct from` et non `=` : un auteur nul compare a un uuid rend
  -- nul, et `tests_assert(null)` ne leve pas. Ecrit avec `=`, ce controle
  -- laissait justement passer le cas qu'il est la pour attraper.
  perform tests_assert(
    v_auteur is not distinct from '00000000-0000-0000-0000-0000000000a3'::uuid,
    format('Un visuel depose depuis la console porte l''auteur %s au lieu de '
           'l''administrateur : la regle « seuls les visuels d''administration '
           'restent » redevient indecidable.', coalesce(v_auteur::text, 'nul')));
end $$;

reset role;

-- --- Un depot par script ne signe rien -----------------------------------
--
-- `service_role` contourne les policies, mais pas le defaut de colonne : sans
-- jeton d'utilisateur, `auth.uid()` rend nul. C'est exactement ce qui separe
-- les deux origines, et c'est pour cela qu'on ne l'a pas pose dans la Server
-- Action seule.
do $$
declare
  v_prompt uuid;
  v_auteur uuid;
begin
  select id into v_prompt from public.prompts limit 1;

  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  insert into public.prompt_media (prompt_id, kind, storage_path)
  values (v_prompt, 'thumbnail',
          'prompts/' || v_prompt || '/thumbnail-essai-script.jpg')
  returning created_by into v_auteur;

  perform tests_assert(
    v_auteur is null,
    'Un visuel pose par script s''est vu attribuer un auteur : il survivrait '
    'au menage des visuels de script.');
end $$;

-- --- L'existant reste accueilli ------------------------------------------
--
-- Rendre `created_by` obligatoire aurait ete plus propre sur le papier et
-- aurait casse la base : toutes les lignes deja ecrites portent un auteur nul.
do $$
declare
  v_obligatoire boolean;
  v_defaut text;
begin
  select a.attnotnull, pg_get_expr(d.adbin, d.adrelid)
  into v_obligatoire, v_defaut
  from pg_attribute a
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = 'public.prompt_media'::regclass
    and a.attname = 'created_by';

  perform tests_assert(
    not v_obligatoire,
    'created_by est devenue obligatoire : les visuels anterieurs, tous sans '
    'auteur, ne peuvent plus etre relus ni corriges.');

  perform tests_assert(
    v_defaut is not null and v_defaut like '%uid%',
    format('created_by n''a plus de defaut (%s) : la console cesserait de '
           'signer ses depots sans que rien ne leve.',
           coalesce(v_defaut, 'aucun')));
end $$;

rollback;
