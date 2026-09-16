-- =====================================================================
-- Les rayons se decrivent, ils ne se comptent plus
--
-- Une tuile de rayon annoncait « 16 commandes ». Le chiffre ne fait pas
-- choisir : il ne dit pas si l'on trouvera derriere ce que l'on cherche. Le
-- kit UI fournit une phrase par rayon, et ces phrases vivent en base — une
-- description de catalogue se corrige depuis l'administration, pas par un
-- deploiement.
--
-- Ce test verifie trois choses : que chaque rayon ouvert a sa phrase, que
-- deux rayons n'ont pas la meme, et que la table d'heritage a bien joue.
-- =====================================================================
do $descriptions$
declare
  v_n integer;
  v_texte text;
begin
  -- --- Chaque rayon ouvert dit ce qu'il contient -------------------------
  --
  -- Limite aux rayons du classeur V2 : les fixtures des autres tests sont
  -- creees a la volee et n'ont pas a porter de texte editorial.
  select count(*) into v_n
  from public.categories
  where is_visible
    and external_ref like 'V2-%'
    and coalesce(short_description, '') = '';

  if v_n > 0 then
    raise exception 'Descriptions : % rayon(s) ouvert(s) sans phrase.', v_n;
  end if;

  -- --- Deux rayons ne disent pas la meme chose ---------------------------
  --
  -- C'est le meme defaut que deux rayons voisins partageant une couverture :
  -- on ne sait plus lequel choisir, et l'un des deux ment forcement.
  select count(*) into v_n
  from (
    select short_description
    from public.categories
    where is_visible and external_ref like 'V2-%' and parent_id is not null
    group by short_description
    having count(*) > 1
  ) doublons;

  if v_n > 0 then
    raise exception 'Descriptions : % phrase(s) portee(s) par plusieurs rayons.', v_n;
  end if;

  -- --- Les rayons fusionnes ont leur phrase, pas celle d'un ancetre ------
  --
  -- « Cinema » et « Editorial » reunissent chacun plusieurs anciens rayons.
  -- Reprendre la phrase d'un seul d'entre eux annoncerait une partie de ce
  -- qu'ils contiennent : « Couvertures mode » pour un rayon qui porte aussi
  -- le business, le sport et la musique.
  select short_description into v_texte from public.categories where slug = 'cinema';
  if v_texte is null or v_texte not like '%affiches%' then
    raise exception 'Descriptions : « Cinema » a garde la phrase d''un ancetre (%).', v_texte;
  end if;

  select short_description into v_texte from public.categories where slug = 'editorial';
  if v_texte is null or v_texte not like '%professionnel%' then
    raise exception 'Descriptions : « Editorial » a garde la phrase d''un ancetre (%).', v_texte;
  end if;

  -- --- Aucun compteur n'a repris la place --------------------------------
  select count(*) into v_n
  from public.categories
  where is_visible and short_description ~ '\d+\s+commandes?';

  if v_n > 0 then
    raise exception 'Descriptions : % rayon(s) annoncent encore un nombre de commandes.', v_n;
  end if;

  raise notice 'Descriptions des rayons : verifie.';
end $descriptions$;
