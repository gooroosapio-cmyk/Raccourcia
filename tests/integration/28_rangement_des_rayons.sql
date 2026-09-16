-- =====================================================================
-- Le rangement des rayons : un sujet par collection.
--
-- « Cinéma - personnages et scènes » reunissait dix-huit cartes qui ne se
-- ressemblaient pas : six affiches, huit personnages, trois ambiances, et
-- une vedette de musique africaine. On n'y cherchait rien, on y tombait.
--
-- Ces assertions verrouillent le decoupage. Elles ne valent que lorsque le
-- catalogue V2 est applique : la suite tourne aussi sur des bases qui ne
-- l'ont pas.
-- =====================================================================

\set ON_ERROR_STOP on

do $rangement$
declare
  v_n integer;
  v_collection text;
begin
  if not tests_catalogue_v2_applique() then
    raise notice 'Catalogue V2 absent : rangement des rayons non verifie.';
    return;
  end if;

  -- Plus aucun nom de collection ne porte le prefixe du rangement d'avant.
  select count(*) into v_n
  from public.categories c
  where c.external_ref like 'V2-COL-%'
    and (c.name like 'Cinéma - %' or c.name like 'Éditorial - %' or c.name like 'VFX - %');
  if v_n <> 0 then
    raise exception 'Rangement : % collections portent encore un prefixe.', v_n;
  end if;

  -- Le fourre-tout n'existe plus sous son ancienne adresse.
  select count(*) into v_n
  from public.categories c
  where c.slug = 'cinema-personnages-et-scenes';
  if v_n <> 0 then
    raise exception 'Rangement : la collection fourre-tout existe encore.';
  end if;

  -- Une vedette de musique n'est pas un personnage de cinema : elle est
  -- editoriale, et le regroupement ne l'a pas renvoyee au cinema.
  select c.slug into v_collection
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.command = '/afrobeatsstar';
  if v_collection is distinct from 'editorial' then
    raise exception 'Rangement : /afrobeatsstar est range dans %.', coalesce(v_collection, 'nulle part');
  end if;

  -- Le cinema tient dans un seul rayon : affiches, personnages, ambiances et
  -- espionnage, qui separes donnaient des collections de trois cartes.
  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where c.slug = 'cinema' and p.status = 'published';
  if v_n <> 19 then
    raise exception 'Rangement : % cartes de cinema au lieu de 19.', v_n;
  end if;

  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where c.slug = 'editorial' and p.status = 'published';
  if v_n <> 10 then
    raise exception 'Rangement : % cartes editoriales au lieu de 10.', v_n;
  end if;

  -- Une collection vidée par le regroupement se referme au lieu de rester
  -- ouverte sur un rayon sans rien dedans.
  select count(*) into v_n
  from public.categories c
  where c.external_ref like 'V2-COL-%'
    and c.status = 'published'
    and not exists (
      select 1 from public.prompts p
      where p.category_id = c.id and p.status = 'published'
    );
  if v_n <> 0 then
    raise exception 'Rangement : % collections ouvertes et vides.', v_n;
  end if;

  -- Un titre annonce un resultat, jamais un jargon de studio.
  select count(*) into v_n
  from public.prompts p
  where p.catalog_v2
    and p.status = 'published'
    and p.name in ('Vedette Afrobeats', 'Packshot studio', 'Visuel de série', 'Portrait cinéma');
  if v_n <> 0 then
    raise exception 'Rangement : % anciens titres encore publies.', v_n;
  end if;

  -- Une quantite annoncee dans un titre doit correspondre aux livrables.
  select count(*) into v_n
  from public.prompts p
  where p.command = '/packecommerce' and p.name = 'Pack produit · 5 visuels';
  if v_n <> 1 then
    raise exception 'Rangement : /packecommerce ne porte pas son nombre de livrables.';
  end if;

  raise notice 'Rangement des rayons : verifie.';
end $rangement$;
