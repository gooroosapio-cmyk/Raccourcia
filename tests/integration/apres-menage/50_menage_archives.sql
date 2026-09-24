-- =====================================================================
-- Menage des archives (lot `menage-archives`, paliers 1, 2 et 2 bis)
--
-- Joue apres le lot, lui-meme passe deux fois sur le scenario
-- `tests/db/scenario-menage-archives.sql`. Ce que ce fichier verrouille :
--
--   * ne part que ce qui n'est relie a rien, et part en entier : ni
--     variante, ni version, ni champ, ni choix, ni question orphelins ;
--   * le journal des copies n'a perdu ni ligne ni reference ;
--   * favoris, anciens liens et visuels restent ;
--   * une commande archivee gardee reste joignable par son ancienne
--     adresse, et se range dans un rayon « Commandes retirees » invisible ;
--   * les rayons v2 et les rangements archives vides ont disparu, les
--     sauvegardes aussi.
-- =====================================================================
begin;

do $$
begin
  -- Palier 2 : la commande reliee a rien est partie, avec tout ce qu'elle portait.
  perform tests_assert(not exists (select 1 from public.prompts
      where id = '00000000-0000-0000-0000-0000000005a1'),
    'La commande archivee sans lien est encore la.');
  perform tests_assert(not exists (select 1 from public.prompt_variants
      where id = '00000000-0000-0000-0000-0000000005b1'),
    'La variante de la commande supprimee est restee.');
  perform tests_assert(not exists (select 1 from public.prompt_versions
      where id = '00000000-0000-0000-0000-0000000005d1'),
    'La version de la commande supprimee est restee.');
  perform tests_assert(not exists (select 1 from public.prompt_fields
      where id = '00000000-0000-0000-0000-0000000005f1'),
    'Le champ de la commande supprimee est reste.');
  perform tests_assert(not exists (
      select 1 from public.prompt_field_choices ch
      where not exists (select 1 from public.prompt_fields f where f.id = ch.field_id)),
    'Un choix de champ est orphelin.');
  perform tests_assert(not exists (select 1 from public.prompt_questions
      where prompt_id = '00000000-0000-0000-0000-0000000005a1'),
    'La question de la commande supprimee est restee.');

  -- Les commandes reliees restent, archivees.
  perform tests_assert((select count(*) from public.prompts
      where id in ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000005a3',
                   '00000000-0000-0000-0000-0000000005a4', '00000000-0000-0000-0000-0000000005a5')
        and status = 'archived') = 4,
    'Une commande archivee reliee au journal, a un membre, a un ancien lien ou a un visuel a disparu.');

  -- Le journal : aucune ligne perdue, aucune reference videe.
  perform tests_assert(exists (select 1 from public.copy_events
      where id = '00000000-0000-0000-0000-0000000005e2'
        and variant_id = '00000000-0000-0000-0000-0000000005b2'
        and version_id = '00000000-0000-0000-0000-0000000005d2'),
    'La copie d''une commande archivee a perdu sa ligne ou ses references.');
  perform tests_assert(exists (select 1 from public.copy_events
      where id = '00000000-0000-0000-0000-0000000005e9'
        and variant_id = '00000000-0000-0000-0000-0000000005b9'
        and version_id = '00000000-0000-0000-0000-0000000005d9'),
    'La copie d''une variante par IA archivee a perdu ses references.');

  -- Palier 1 : la variante par IA jamais citee part, la citee reste.
  perform tests_assert(not exists (select 1 from public.prompt_variants
      where id = '00000000-0000-0000-0000-0000000005b8'),
    'La variante par IA archivee et jamais citee est encore la.');
  perform tests_assert(not exists (select 1 from public.prompt_versions
      where id = '00000000-0000-0000-0000-0000000005d8'),
    'La version de la variante supprimee est restee.');
  perform tests_assert(exists (select 1 from public.prompt_variants
      where id = '00000000-0000-0000-0000-0000000005b9' and status = 'archived'),
    'La variante par IA citee au journal a ete supprimee.');

  -- Les commandes publiees servent toujours un texte.
  perform tests_assert(not exists (select 1 from public.prompts
      where status = 'published' and not payload_ready),
    'Une commande publiee n''a plus de texte.');

  -- Membres, liens, visuels.
  perform tests_assert(exists (select 1 from public.favorites
      where prompt_id = '00000000-0000-0000-0000-0000000005a4'),
    'Un favori de membre a disparu.');
  perform tests_assert(exists (select 1 from public.prompt_aliases
      where alias_prompt_id = '00000000-0000-0000-0000-0000000005a3'),
    'Un ancien lien a disparu.');
  perform tests_assert(exists (select 1 from public.prompt_media
      where prompt_id = '00000000-0000-0000-0000-0000000005a5'),
    'Un visuel a disparu.');
  perform tests_assert((select slug from public.resoudre_alias('essai-menage-trois')) = 'testxray',
    'L''ancienne adresse redirigee ne mene plus a la commande actuelle.');
  perform tests_assert(exists (select 1 from public.commande_retiree('essai-menage-deux')),
    'L''avis de retrait d''une commande gardee ne repond plus.');

  -- Palier 2 bis : un rayon archive, invisible, par mode.
  perform tests_assert(not exists (
      select 1 from public.prompts p
      join public.categories c on c.id = p.category_id
      where p.status = 'archived' and coalesce(c.external_ref, '') not like 'ARCHIVES-%'),
    'Une commande archivee n''est pas rangee dans « Commandes retirees ».');
  perform tests_assert(not exists (
      select 1 from public.categories
      where external_ref like 'ARCHIVES-%' and (is_visible or status <> 'archived' or parent_id is not null)),
    'Un rayon « Commandes retirees » est visible, publie ou rattache.');
  perform tests_assert((select c.external_ref from public.prompts p
      join public.categories c on c.id = p.category_id
      where p.id = '00000000-0000-0000-0000-0000000005a2') = 'ARCHIVES-IMAGE',
    'Une commande image n''est pas rangee dans le rayon image.');
  perform tests_assert((select c.external_ref from public.prompts p
      join public.categories c on c.id = p.category_id
      where p.id = '00000000-0000-0000-0000-0000000005a4') = 'ARCHIVES-TEXTE',
    'Une commande texte n''est pas rangee dans le rayon texte.');

  -- Rayons v2 et rangements archives vides : partis.
  perform tests_assert(not exists (select 1 from public.categories
      where id in ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005c2',
                   '00000000-0000-0000-0000-0000000005c3')),
    'Un rayon v2 ou une collection archivee vide est encore la.');
  perform tests_assert(not exists (
      select 1 from public.categories c
      where (c.status = 'archived' or c.external_ref ~ '^V2')
        and coalesce(c.external_ref, '') not like 'ARCHIVES-%'
        and not exists (select 1 from public.prompts p where p.category_id = c.id)
        and not exists (select 1 from public.categories e where e.parent_id = c.id)),
    'Un rayon archive ou v2 vide a ete garde.');
  -- Les rayons ouverts du jeu de test, eux, ne sont pas touches.
  perform tests_assert((select count(*) from public.categories
      where id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c3')) = 2,
    'Un rayon ouvert a ete supprime.');

  -- Tags inactifs et sauvegardes.
  perform tests_assert(not exists (select 1 from public.tags
      where id = '00000000-0000-0000-0000-0000000005aa'),
    'Le tag inactif est encore la.');
  perform tests_assert(to_regnamespace('sauvegarde') is null,
    'Le schema de sauvegarde existe encore.');
  perform tests_assert(to_regclass('public.prompts_avant_v5') is null
      and to_regclass('public.prompts_avant_v2') is null,
    'Une table *_avant_* existe encore.');
end $$;

rollback;
