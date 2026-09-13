-- Ce que la refonte V6 du domaine Image doit avoir produit.
--
-- Six rayons image devenaient un mur de puces sur un ecran de 360 px : la
-- refonte les regroupe en quatre, dans un ordre voulu — les portraits
-- d'abord, la publicite, la technique, les lieux enfin. Quatre tiennent en
-- deux colonnes sans qu'aucun ne reste seul sur sa ligne. Ce fichier
-- controle ce que l'utilisateur rencontre a l'ecran, pas la mecanique du
-- deplacement.
--
-- Il ne fait rien si la bascule n'a pas ete appliquee : les lots d'import se
-- verifient sans elle.
begin;

do $$
declare
  v_n integer;
  v_ordre text;
begin
  select count(*) into v_n from public.categories
  where external_ref in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03', 'IMG-V6-04') and is_visible;

  if v_n = 0 then
    raise notice 'Bascule image V6 non appliquee : controles ignores.';
    return;
  end if;

  -- --- Quatre rayons, et rien d'autre -----------------------------------

  perform tests_assert(v_n = 4, format('%s familles V6 visibles au lieu de 4.', v_n));

  select count(*) into v_n from public.categories
  where mode = 'image' and external_ref is not null and is_visible;
  perform tests_assert(v_n = 4,
    format('%s familles image visibles : un ancien decoupage est reste ouvert.', v_n));

  -- --- L'ordre est celui qu'on a choisi ---------------------------------
  --
  -- Il porte une intention : on entre dans le domaine image par le portrait,
  -- pas par la vue technique. Un `sort_order` recopie de travers ne se voit
  -- pas en base, il se voit a l'ecran, trop tard.

  select string_agg(name, ' > ' order by sort_order) into v_ordre
  from public.categories
  where mode = 'image' and external_ref is not null and is_visible;
  perform tests_assert(
    v_ordre = 'Portraits et effets visuels > Publicité et marques > '
              || 'Technique et information > Architecture et lieux',
    format('L''ordre des familles image est « %s ».', v_ordre));

  -- --- Aucun rayon desert, aucune commande hors rayon --------------------

  select count(*) into v_n
  from public.categories c
  where c.external_ref in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03', 'IMG-V6-04')
    and not exists (select 1 from public.prompts p
                    where p.category_id = c.id and p.status = 'published');
  perform tests_assert(v_n = 0, format('%s familles image sont vides.', v_n));

  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.mode = 'image' and p.status <> 'archived'
    and c.external_ref is not null
    and c.external_ref not in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03', 'IMG-V6-04');
  perform tests_assert(v_n = 0,
    format('%s commandes image actives sont restees dans un ancien rayon.', v_n));

  -- --- Chaque rayon porte son visuel de repli (regle R08) ---------------

  select count(*) into v_n from public.categories
  where external_ref in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03', 'IMG-V6-04')
    and coalesce(fallback_image_path, '') = '';
  perform tests_assert(v_n = 0, format('%s familles image sans visuel de repli.', v_n));

  -- --- Les lieux ont quitte la technique --------------------------------
  --
  -- Le dedoublement n'a de sens que s'il separe vraiment : une commande
  -- venue de « Lieux, architecture et interieur » n'a plus rien a faire
  -- dans le rayon technique.
  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id
  join public.prompts_avant_image_v6 s on s.id = p.id
  where p.status <> 'archived'
    and s.famille_ref in ('IMG-V5-04', 'IMG-05')
    and c.external_ref <> 'IMG-V6-04';
  perform tests_assert(v_n = 0,
    format('%s commandes de lieux sont restees hors du rayon architecture.', v_n));

  -- --- Rien n'a ete supprime --------------------------------------------
  --
  -- Les anciennes familles restent en base, archivees : elles portent le
  -- rangement d'origine de centaines de commandes, et republier l'une
  -- d'elles est la seule facon de defaire un regroupement qui deplairait.

  select count(*) into v_n from public.categories
  where external_ref like 'IMG-V5-%';
  perform tests_assert(v_n = 6,
    format('%s familles image V5 en base au lieu de 6 : une a ete supprimee.', v_n));

  perform tests_assert(
    exists (select 1 from information_schema.tables
            where table_schema = 'public' and table_name = 'prompts_avant_image_v6'),
    'La bascule image n''a laisse aucune sauvegarde : le retour arriere est impossible.');

  -- Chaque commande image d'avant la bascule est toujours la, active ou
  -- archivee. Le catalogue a le droit de se reorganiser, pas de perdre une
  -- ligne en route : c'est elle qui porte les visuels et les favoris.
  select count(*) into v_n
  from public.prompts_avant_image_v6 s
  where not exists (select 1 from public.prompts p where p.id = s.id);
  perform tests_assert(v_n = 0,
    format('%s commandes image ont disparu de la base.', v_n));

  -- Une commande qui etait en ligne avant la bascule l'est toujours : la
  -- refonte range, elle ne retire pas l'acces a ce qui etait achete.
  select count(*) into v_n
  from public.prompts_avant_image_v6 s
  join public.prompts p on p.id = s.id
  where s.status = 'published' and p.status <> 'published';
  perform tests_assert(v_n = 0,
    format('%s commandes image publiees ont ete retirees par la refonte.', v_n));
end $$;

rollback;
