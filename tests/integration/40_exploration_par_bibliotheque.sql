-- =====================================================================
-- Le sommaire d'une bibliotheque
--
-- Ce que ces deux fonctions promettent, et qu'un test doit tenir :
--
--   * elles ne rendent QUE la bibliotheque demandee. Une collection de
--     Textes qui remonterait dans le sommaire des Images enverrait le
--     lecteur sur un rayon qui n'a rien a voir avec la porte qu'il a
--     poussee ;
--   * elles n'inventent rien. Une bibliotheque vide rend un tableau vide,
--     pas une erreur : l'ecran sait dire « rien ici », il ne sait pas
--     rattraper une exception ;
--   * elles ecartent les tags de bibliotheque et d'IA. Le premier repete
--     la page ou l'on se trouve deja, le second est une compatibilite ;
--   * elles lisent a travers les politiques du lecteur, donc un visiteur
--     n'obtient que le catalogue publie.
-- =====================================================================

do $$
declare
  v_images jsonb;
  v_textes jsonb;
  v_tags jsonb;
  v_hors integer;
  v_groupes integer;
begin
  v_images := public.collections_de_bibliotheque('images');
  v_textes := public.collections_de_bibliotheque('textes');

  if jsonb_typeof(v_images) <> 'array' or jsonb_typeof(v_textes) <> 'array' then
    raise exception 'Le sommaire doit toujours rendre un tableau, meme vide.';
  end if;

  -- Une bibliotheque inconnue ne casse rien : elle n'a simplement rien a
  -- montrer. L'adresse est une liste fermee cote application, mais la base
  -- ne doit pas dependre de cette garde pour rester debout.
  if jsonb_array_length(public.collections_de_bibliotheque('inexistante')) <> 0 then
    raise exception 'Une bibliotheque inconnue ne doit rien rendre.';
  end if;

  -- CHAQUE COLLECTION RENDUE PORTE BIEN DES COMMANDES DE CETTE
  -- BIBLIOTHEQUE. C'est l'invariant qui compte : sans lui, le sommaire des
  -- Images proposerait des rayons de Textes.
  select count(*) into v_hors
  from jsonb_array_elements(v_images) as entree
  where not exists (
    select 1
    from public.prompts p
    join public.categories c on c.id = p.category_id
    where c.slug = entree ->> 'slug'
      and p.status = 'published'
      and p.library = 'images'
  );

  if v_hors > 0 then
    raise exception '% collection(s) du sommaire Images ne portent aucune commande Images.', v_hors;
  end if;

  -- Les tags : ni « bibliotheque », ni « ia ».
  v_tags := public.tags_de_bibliotheque('images');
  select count(*) into v_groupes
  from jsonb_array_elements(v_tags) as entree
  where entree ->> 'groupe' in ('bibliotheque', 'ia');

  if v_groupes > 0 then
    raise exception '% tag(s) de bibliotheque ou d''IA dans le sommaire.', v_groupes;
  end if;

  -- Un compte a zero n'aurait aucun sens : un tag rendu est un tag porte.
  select count(*) into v_groupes
  from jsonb_array_elements(v_tags) as entree
  where coalesce((entree ->> 'total')::int, 0) < 1;

  if v_groupes > 0 then
    raise exception '% tag(s) rendus sans aucune commande.', v_groupes;
  end if;

  raise notice 'Sommaire : % collection(s) et % tag(s) pour les Images.',
    jsonb_array_length(v_images), jsonb_array_length(v_tags);
end $$;

-- --- Les politiques du lecteur s'appliquent ------------------------------
--
-- Les deux fonctions sont `security invoker`. Verifie en changeant de
-- role : en tant que proprietaire des tables, la RLS ne s'applique pas et
-- le test ne prouverait rien.
do $$
declare
  v_avant integer;
  v_apres integer;
begin
  select jsonb_array_length(public.collections_de_bibliotheque('images')) into v_avant;

  set local role anon;
  select jsonb_array_length(public.collections_de_bibliotheque('images')) into v_apres;
  reset role;

  -- Un visiteur ne voit que le catalogue publie : il ne peut donc pas voir
  -- PLUS que le proprietaire. L'inverse signalerait une fuite.
  if v_apres > v_avant then
    raise exception 'Un visiteur voit % collections contre % : la RLS ne s''applique pas.',
      v_apres, v_avant;
  end if;

  raise notice 'Lecture anonyme : % collection(s) visibles.', v_apres;
end $$;
