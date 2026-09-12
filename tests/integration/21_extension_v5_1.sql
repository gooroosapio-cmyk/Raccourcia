-- Extension IMAGE V5.1 : ce que l'ajout de cinquante commandes doit avoir
-- produit, et surtout ce qu'il ne doit avoir touche a rien d'autre.
--
-- Cet import n'a pas le meme profil de risque que le precedent : il n'ecrit
-- que des lignes neuves. Les controles portent donc autant sur ce qui est
-- arrive que sur ce qui n'a pas bouge.
begin;

do $$
declare
  v_n integer;
begin
  select count(*) into v_n from public.prompts where catalog_version = 'v5.1';

  if v_n = 0 then
    raise notice 'Extension V5.1 non appliquee : controles ignores.';
    return;
  end if;

  -- --- Ce qui est arrive ----------------------------------------------

  perform tests_assert(v_n = 50, format('%s commandes V5.1 au lieu de 50.', v_n));

  select count(*) into v_n from public.prompts
  where catalog_version = 'v5.1' and mode <> 'image';
  perform tests_assert(v_n = 0, format('%s commandes V5.1 hors du mode image.', v_n));

  -- Six familles existantes, aucune nouvelle : le classeur n'en cree pas.
  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.catalog_version = 'v5.1' and c.external_ref not like 'IMG-V5-%';
  perform tests_assert(v_n = 0, format('%s commandes V5.1 rangees hors des familles image V5.', v_n));

  -- Trois textes distincts par commande, comme pour tout le catalogue V5.
  select count(*) into v_n
  from public.prompts p
  where p.catalog_version = 'v5.1'
    and (select count(distinct pv.payload)
         from public.prompt_variants v
         join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
         where v.prompt_id = p.id) <> 3;
  perform tests_assert(v_n = 0, format('%s commandes V5.1 servent le meme texte a deux moteurs.', v_n));

  -- --- Ce qui ne doit pas avoir bouge -----------------------------------

  -- L'extension arrive en brouillon. Une seule commande publiee par
  -- l'import, et cinquante cartes sans visuel apparaissent d'un coup dans
  -- le catalogue, sans qu'aucun texte n'ait ete relu.
  select count(*) into v_n from public.prompts
  where catalog_version = 'v5.1' and status <> 'draft';
  perform tests_assert(v_n = 0, format('%s commandes V5.1 sont sorties du brouillon toutes seules.', v_n));

  -- Aucun visuel : le classeur l'interdit explicitement, et une commande
  -- image sans visuel se range d'elle-meme en bas de sa famille.
  select count(*) into v_n from public.prompts
  where catalog_version = 'v5.1' and coalesce(default_image_path, '') <> '';
  perform tests_assert(v_n = 0, format('%s commandes V5.1 portent un chemin de visuel.', v_n));

  -- Que le catalogue V5 n'ait pas bouge se verifie dans 17, la ou il est
  -- chez lui : compter ici le total des commandes graduees obligerait a
  -- reecrire ce fichier a chaque extension ajoutee.

  -- --- Identite : rien ne doit se marcher dessus ------------------------

  select count(*) into v_n from (
    select command from public.prompts group by command having count(*) > 1
  ) doublons;
  perform tests_assert(v_n = 0, format('%s noms de commande en double.', v_n));

  select count(*) into v_n from (
    select slug from public.prompts group by slug having count(*) > 1
  ) doublons;
  perform tests_assert(v_n = 0, format('%s adresses publiques en double.', v_n));

  select count(*) into v_n from (
    select external_ref from public.prompts where external_ref is not null
    group by external_ref having count(*) > 1
  ) doublons;
  perform tests_assert(v_n = 0, format('%s identifiants en double.', v_n));

  select count(*) into v_n from public.prompts
  where catalog_version = 'v5.1' and command::text !~ '^/[a-z][a-z0-9_]{2,31}$';
  perform tests_assert(v_n = 0, format('%s commandes V5.1 hors du motif R02.', v_n));

  -- --- Cherchables des leur arrivee -------------------------------------

  select count(*) into v_n from public.prompts
  where catalog_version = 'v5.1' and coalesce(intention, '') = '';
  perform tests_assert(v_n = 0, format('%s commandes V5.1 sans intention.', v_n));

  -- Le classeur ne donne aucun mode a ces commandes : elles sont
  -- mono-usage, et c'est leur droit. Ce qui doit etre vrai, c'est qu'on les
  -- trouve par leur propre texte.
  select count(*) into v_n from public.prompts
  where catalog_version = 'v5.1'
    and search_norm not like '%' || public.texte_normalise(intention) || '%';
  perform tests_assert(v_n = 0,
    format('%s intentions V5.1 hors du champ de recherche.', v_n));
end $$;

rollback;
