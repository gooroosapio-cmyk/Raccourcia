-- =====================================================================
-- La recherche trouve par synonyme et par univers.
--
-- `search_keywords` etait rempli par le classeur depuis le catalogue V2 et
-- lu par personne : des synonymes ecrits et ignores. `univers` n'existait
-- pas, donc chercher un personnage par son nom ne pouvait rien donner.
--
-- Ces assertions verrouillent les deux portes. Elles n'utilisent aucune
-- donnee du catalogue : la commande d'essai est creee ici et retiree a la
-- fin, pour que le test dise la meme chose sur une base vide.
-- =====================================================================

\set ON_ERROR_STOP on

do $recherche$
declare
  v_id uuid;
  v_categorie uuid;
  v_norm text;
begin
  select id into v_categorie from public.categories limit 1;

  insert into public.prompts (command, name, slug, mode, category_id, short_description,
                              search_keywords, univers, status)
  values ('/essai-recherche-elargie', 'Titre sans rapport', 'essai-recherche-elargie',
          'image'::public.app_mode, v_categorie, 'Une description sans rapport non plus.',
          array['mot-de-passe-secret'], 'Univers Temoin', 'draft'::public.content_status)
  returning id into v_id;

  select search_norm into v_norm from public.prompts where id = v_id;

  -- Le synonyme est dans le champ de comparaison.
  if v_norm not like '%motdepassesecret%' and v_norm not like '%mot-de-passe-secret%'
     and v_norm not like '%mot de passe secret%' then
    raise exception 'Recherche : le synonyme n''entre pas dans search_norm (%).', v_norm;
  end if;

  -- L'univers aussi.
  if v_norm not like '%universtemoin%' and v_norm not like '%univers temoin%' then
    raise exception 'Recherche : l''univers n''entre pas dans search_norm (%).', v_norm;
  end if;

  -- Et le titre continue d'y etre : la colonne a ete refaite, pas remplacee.
  if v_norm not like '%titresansrapport%' and v_norm not like '%titre sans rapport%' then
    raise exception 'Recherche : le titre a disparu de search_norm (%).', v_norm;
  end if;

  -- La colonne suit une modification, comme toute colonne generee.
  update public.prompts set univers = 'Autre Univers' where id = v_id;
  select search_norm into v_norm from public.prompts where id = v_id;
  if v_norm like '%universtemoin%' or v_norm like '%univers temoin%' then
    raise exception 'Recherche : search_norm garde un univers efface.';
  end if;

  delete from public.prompts where id = v_id;

  raise notice 'Recherche elargie : verifiee.';
end $recherche$;
