-- =====================================================================
-- Retrait des « j'aime » et des rayons epingles (decisions 4B et 5A)
--
-- Ce que ce fichier verrouille :
--
--   * les trois tables et le compteur ont disparu, et avec eux la fonction
--     du declencheur : rien ne peut plus en ecrire en silence ;
--   * leur sauvegarde existe, dans un schema que ni `anon` ni
--     `authenticated` ne peuvent lire — une copie de donnees de membres
--     ne doit pas devenir une porte ouverte ;
--   * le favori prive des commandes, lui, reste : c'est le coeur ;
--   * les sommaires et le bilan de suppression tournent sans le compteur.
-- =====================================================================
begin;

do $$
begin
  perform tests_assert(to_regclass('public.prompt_likes') is null,
    'La table des « j''aime » existe encore.');
  perform tests_assert(to_regclass('public.tag_favorites') is null,
    'La table des tags epingles existe encore.');
  perform tests_assert(to_regclass('public.category_favorites') is null,
    'La table des collections epinglees existe encore.');
  perform tests_assert(not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'prompts' and column_name = 'like_count'),
    'La colonne like_count existe encore.');
  perform tests_assert(to_regprocedure('public.prompt_likes_recompter()') is null,
    'La fonction du compteur de « j''aime » existe encore.');

  perform tests_assert(to_regclass('public.favorites') is not null,
    'Le favori prive des commandes a disparu avec les « j''aime ».');

  perform tests_assert(
    to_regclass('sauvegarde.prompt_likes_20260924') is not null
    and to_regclass('sauvegarde.tag_favorites_20260924') is not null
    and to_regclass('sauvegarde.category_favorites_20260924') is not null
    and to_regclass('sauvegarde.prompts_like_count_20260924') is not null,
    'Une sauvegarde manque.');

  perform tests_assert(
    not has_schema_privilege('anon', 'sauvegarde', 'usage')
    and not has_schema_privilege('authenticated', 'sauvegarde', 'usage'),
    'Le schema de sauvegarde est accessible a un client.');

  -- Les sommaires tournent, et ne rendent plus de cle « likes ».
  perform tests_assert(
    jsonb_typeof(public.collections_populaires(5)) = 'array'
    and jsonb_typeof(public.collections_de_bibliotheque('images')) = 'array',
    'Un sommaire ne rend plus de liste.');
  perform tests_assert(
    not exists (select 1 from jsonb_array_elements(public.collections_populaires(50)) e
                where e ? 'likes'),
    'Un sommaire rend encore une cle « likes ».');
end $$;

-- Un membre ne lit rien de la sauvegarde, meme en la nommant.
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  begin
    perform count(*) from sauvegarde.prompt_likes_20260924;
    perform tests_assert(false, 'Un membre lit la sauvegarde des « j''aime ».');
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;
