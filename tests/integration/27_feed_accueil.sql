-- Ce que le feed de l'Accueil ne doit jamais montrer.
--
-- Le feed est le seul endroit du produit ou une carte s'impose a
-- l'utilisateur sans qu'il l'ait cherchee. Ce qui s'y trouve engage donc plus
-- qu'ailleurs : une commande masquee y serait une fuite, une carte sans
-- visuel y serait un chantier a ciel ouvert.
--
-- Le vivier du feed est defini par trois conditions, et ce fichier les
-- verrouille cote base. L'ordre, lui, se verifie sans base : voir
-- `tests/unit/feed.test.ts`.
begin;

do $$
declare
  v_n integer;
  v_vivier integer;
begin
  if not tests_catalogue_v2_applique() then
    raise notice 'Catalogue V2 non applique : controles ignores.';
    return;
  end if;

  -- --- Le vivier : publie, dans un rayon visible, et avec un visuel -------

  select count(*) into v_vivier
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and c.is_visible and p.media_ready;

  -- Un feed vide n'est pas une panne en soi — il le devient quand personne
  -- ne s'en apercoit. Le compte est donc annonce, pas asserte.
  raise notice 'Vivier du feed : % cartes.', v_vivier;

  -- --- Aucune carte du vivier sans visuel ---------------------------------
  --
  -- `media_ready` est tenue par declencheur ; si elle mentait, le feed
  -- afficherait des cadres vides sans que rien ne leve.
  select count(*) into v_n
  from public.prompts p
  where p.media_ready
    and p.show_image_card
    and not exists (
      select 1 from public.prompt_media m
      where m.prompt_id = p.id and m.kind in ('after', 'thumbnail')
    );
  perform tests_assert(v_n = 0,
    format('%s cartes se declarent illustrees sans porter de visuel.', v_n));

  -- --- Le genre d'experience est renseigne --------------------------------
  --
  -- Il decide du verbe du bouton : « Créer », « Activer », « Commencer ».
  -- Une carte V2 sans genre retomberait sur un libelle generique.
  select count(*) into v_n
  from public.prompts
  where catalog_v2 and entity_type is null;
  perform tests_assert(v_n = 0,
    format('%s cartes V2 sans type d experience.', v_n));

  select count(*) into v_n
  from public.prompts
  where catalog_v2 and entity_type not in ('commande_image', 'mode_ia', 'parcours');
  perform tests_assert(v_n = 0, format('%s cartes V2 avec un type inconnu.', v_n));

  -- --- Les deux experiences a part : presentes, ou remplacees --------------
  --
  -- L'Accueil leur donnait une entree distincte des familles d'images. Le
  -- catalogue de septembre 2026 les remplace par la bibliotheque
  -- Reflexions — Modes de reflexion, Assistants professionnels,
  -- Personnages immersifs, Jeux et simulations — et la fusion les archive.
  --
  -- Ce qui compte dans les deux cas : l'entree ne doit jamais pointer dans
  -- le vide. Soit les deux familles sont la, soit aucune ne l'est et les
  -- Reflexions ont pris le relais.
  select count(*) into v_n
  from public.categories
  where slug in ('modes-ia', 'parcours-guides') and is_visible;

  if v_n <> 2 then
    perform tests_assert(v_n = 0,
      format('%s famille speciale visible sur 2 : l''entree de l''Accueil pointe a moitie dans le vide.', v_n));

    perform tests_assert(
      exists (select 1 from public.prompts
              where library = 'reflexions' and status = 'published'),
      'Les Modes IA et les Parcours sont fermes sans que les Reflexions les remplacent.');
  end if;
end $$;

rollback;
