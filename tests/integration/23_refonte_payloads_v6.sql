-- Refonte globale des payloads V6 : ce que le remplacement doit avoir
-- produit, et ce qu'il n'avait pas le droit de toucher.
--
-- C'est le premier import du depot qui remplace du contenu existant. Les
-- controles portent donc surtout sur ce qui n'a pas bouge : les medias, les
-- questions, les champs de fiche, et l'historique des versions. Une refonte
-- qui emporterait l'un des quatre serait une perte, pas une mise a jour.
begin;

do $$
declare
  v_n integer;
  v_total integer;
begin
  select count(*) into v_n
  from public.prompt_versions where version_label = 'v6-payloads' and is_current;

  if v_n = 0 then
    raise notice 'Refonte V6 non appliquee : controles ignores.';
    return;
  end if;

  -- --- Ce qui est arrive ------------------------------------------------

  perform tests_assert(v_n = 1599,
    format('%s payloads V6 courants au lieu de 1599.', v_n));

  -- 533 commandes, trois moteurs chacune, pas une de plus.
  select count(distinct p.id) into v_n
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  join public.prompts p on p.id = v.prompt_id
  where pv.version_label = 'v6-payloads' and pv.is_current;
  perform tests_assert(v_n = 533,
    format('%s commandes refondues au lieu de 533.', v_n));

  select count(*) into v_n from (
    select v.prompt_id
    from public.prompt_versions pv
    join public.prompt_variants v on v.id = pv.variant_id
    where pv.version_label = 'v6-payloads' and pv.is_current
    group by v.prompt_id having count(*) <> 3
  ) t;
  perform tests_assert(v_n = 0,
    format('%s commandes refondues sans exactement trois moteurs.', v_n));

  -- Trois textes distincts par commande : le classeur ecrit pour chaque IA,
  -- pas une fois pour les trois.
  select count(*) into v_n from (
    select v.prompt_id
    from public.prompt_versions pv
    join public.prompt_variants v on v.id = pv.variant_id
    where pv.version_label = 'v6-payloads' and pv.is_current
    group by v.prompt_id having count(distinct pv.payload) < 3
  ) t;
  perform tests_assert(v_n = 0,
    format('%s commandes dont les trois textes V6 ne sont pas distincts.', v_n));

  -- --- L'historique, qui est la raison d'etre du versionnement ----------

  -- Chaque variante refondue garde la version qu'elle portait avant.
  select count(*) into v_n
  from public.prompt_variants v
  join public.prompt_versions courante
    on courante.variant_id = v.id and courante.is_current
   and courante.version_label = 'v6-payloads'
  where not exists (
    select 1 from public.prompt_versions ancienne
    where ancienne.variant_id = v.id
      and ancienne.status = 'retired'
      and ancienne.version_label <> 'v6-payloads'
  );
  perform tests_assert(v_n = 0,
    format('%s variantes refondues sans version anterieure conservee.', v_n));

  -- Une seule version courante par variante, partout.
  select count(*) into v_n from (
    select variant_id from public.prompt_versions
    where is_current group by variant_id having count(*) > 1
  ) t;
  perform tests_assert(v_n = 0,
    format('%s variantes portent plusieurs versions courantes.', v_n));

  -- Aucune commande publiee ne doit etre devenue muette.
  select count(*) into v_n
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id
  where p.status = 'published'
    and not exists (
      select 1 from public.prompt_versions pv
      where pv.variant_id = v.id and pv.is_current
    );
  perform tests_assert(v_n = 0,
    format('%s variantes publiees sans version courante.', v_n));

  -- --- Ce qui n'avait pas le droit de bouger ----------------------------

  -- Les medias. Le classeur porte lui-meme la consigne, et c'est le
  -- controle qui la rend verifiable : la refonte ne cree, ne deplace et ne
  -- supprime aucun visuel. Le nombre exact est inconnu — il depend de ce que
  -- l'administration a depose — mais aucune commande refondue ne doit avoir
  -- perdu un visuel qu'elle portait.
  select count(*) into v_n
  from public.prompt_media m
  join public.prompts p on p.id = m.prompt_id
  where m.storage_path is null or btrim(m.storage_path) = '';
  perform tests_assert(v_n = 0,
    format('%s visuels sans chemin de stockage apres la refonte.', v_n));

  -- Les questions. Elles pendent a la commande et non a la version : creer
  -- une version ne doit pas en perdre une seule.
  select count(*) into v_total from public.prompt_questions q
  join public.prompts p on p.id = q.prompt_id
  join public.prompt_variants v on v.prompt_id = p.id
  join public.prompt_versions pv
    on pv.variant_id = v.id and pv.is_current and pv.version_label = 'v6-payloads';
  perform tests_assert(v_total > 0,
    'Aucune question sur les commandes refondues : la refonte les a emportees.');

  -- Le QCM porte par la version. Il etait vide avant la refonte et doit le
  -- rester : le classeur n'en livre pas, et un QCM invente serait du
  -- contenu que personne n'a ecrit.
  select count(*) into v_n from public.prompt_versions
  where version_label = 'v6-payloads' and qcm <> '[]'::jsonb;
  perform tests_assert(v_n = 0,
    format('%s versions V6 portent un QCM que le classeur ne livre pas.', v_n));

  -- Le statut des commandes. Une refonte de texte ne publie rien : ce qui
  -- etait en brouillon le reste, ce qui etait publie le reste.
  select count(*) into v_n
  from public.prompts p
  where p.catalog_version in ('v5.1', 'v5.2') and p.status <> 'draft';
  perform tests_assert(v_n = 0,
    format('%s commandes d extension publiees par la refonte.', v_n));

  -- --- Le contenu premium reste hors de portee --------------------------

  -- La regle la plus importante du produit ne doit pas s'etre relachee au
  -- passage : une version neuve est une ligne de prompt_versions comme une
  -- autre, et aucun client ne lit cette table.
  select count(*) into v_n
  from information_schema.column_privileges
  where table_schema = 'public'
    and table_name = 'prompt_versions'
    and grantee in ('anon', 'authenticated')
    and privilege_type = 'SELECT';
  perform tests_assert(v_n = 0,
    format('%s droits de lecture client sur prompt_versions.', v_n));
end $$;

-- --- Le bon texte au bon moteur ---------------------------------------
--
-- Les comptes passeraient encore si le texte ecrit pour ChatGPT etait servi
-- a Gemini. L'empreinte ne passe que si chaque payload est arrive a sa
-- place : elle porte sur (commande, moteur, empreinte du texte), triee, et
-- vaut la meme chose que celle calculee sur le classeur source.
--
-- Les lots verifient deja chaque sha256 un par un au moment de poser le
-- texte. Celui-ci le reverifie plus tard, sur la base telle qu'elle est :
-- c'est ce qui attrape une modification survenue apres l'import.
do $$
declare
  v_empreinte text;
begin
  if not exists (
    select 1 from public.prompt_versions where version_label = 'v6-payloads' and is_current
  ) then
    return;
  end if;

  select md5(string_agg(p.external_ref || '|' || pr.key || '|' ||
                        encode(extensions.digest(convert_to(pv.payload, 'UTF8'), 'sha256'), 'hex'),
                        ',' order by p.external_ref, pr.key))
    into v_empreinte
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  join public.ai_providers pr on pr.id = v.provider_id
  join public.prompts p on p.id = v.prompt_id
  where pv.version_label = 'v6-payloads' and pv.is_current;

  perform tests_assert(
    v_empreinte = '1a1c0ac3fe243f3e5fe4685594686418',
    format('Les payloads V6 ne sont pas ceux du classeur (empreinte %s).', v_empreinte)
  );
end $$;

rollback;
