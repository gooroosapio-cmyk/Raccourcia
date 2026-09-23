-- =====================================================================
-- L'avis de retrait
--
-- La refonte V5 sort 2276 commandes de la selection. 700 gardent une
-- redirection ; les autres n'en ont pas, et c'est voulu — envoyer
-- « /1950sstudio » vers un portrait generique promettrait un resultat
-- qui ne viendrait pas. Reste a ne pas laisser ces adresses se presenter
-- comme introuvables, ce qui ferait croire a une erreur de frappe ou a
-- une panne.
--
-- `commande_retiree` repond a leur place. Elle est `security definer`,
-- donc elle traverse les politiques de lecture : c'est exactement ce qui
-- la rend dangereuse si elle en dit trop. Ce fichier verrouille ce
-- qu'elle a le droit de dire.
--
--   * elle rend l'avis pour une commande ARCHIVEE, a un visiteur qui n'a
--     aucun acces ;
--   * elle ne rend RIEN pour un brouillon — un raccourci en preparation ne
--     doit pas se decouvrir en devinant son adresse ;
--   * elle ne rend rien pour une commande publiee, qui a sa vraie fiche ;
--   * elle ne rend jamais le payload, ni aucune colonne qui le raconte ;
--   * la remplacante qu'elle propose porte LA MEME commande. Une commande
--     voisine serait la redirection deguisee qu'on refuse.
-- =====================================================================
begin;

create temporary table essai_archive (
  slug_archive text, slug_brouillon text, slug_publie text,
  slug_avec_suite text, commande_partagee text
);
grant select on essai_archive to anon;

do $$
declare
  v_categorie uuid;
begin
  select id into v_categorie from public.categories where is_visible limit 1;

  -- Une commande retiree, sans suite.
  insert into public.prompts (command, slug, name, mode, library, short_description,
                              status, category_id)
  values ('/essai-retiree', 'essai-retiree', 'Commande retiree', 'image', 'images',
          'Resume reserve aux membres', 'archived', v_categorie);

  -- Un brouillon : il ne doit pas se decouvrir par son adresse.
  insert into public.prompts (command, slug, name, mode, library, short_description,
                              status, category_id)
  values ('/essai-brouillon', 'essai-brouillon', 'Brouillon', 'image', 'images',
          'Secret', 'draft', v_categorie);

  -- Une commande publiee : elle a sa fiche, pas un avis de retrait.
  insert into public.prompts (command, slug, name, mode, library, short_description,
                              status, category_id)
  values ('/essai-publiee', 'essai-publiee', 'Publiee', 'image', 'images',
          'Visible', 'published', v_categorie);

  -- Une variante absorbee : archivee, mais sa commande vit encore.
  insert into public.prompts (command, slug, card_slug, name, mode, library,
                              short_description, status, category_id)
  values ('/essai-partagee', 'essai-partagee-ancienne', 'ancienne', 'Ancienne variante',
          'image', 'images', 'Resume', 'archived', v_categorie);
  insert into public.prompts (command, slug, card_slug, name, mode, library,
                              short_description, status, category_id)
  values ('/essai-partagee', 'essai-partagee-vivante', 'vivante', 'Variante gardee',
          'image', 'images', 'Resume', 'published', v_categorie);

  insert into essai_archive values ('essai-retiree', 'essai-brouillon', 'essai-publiee',
                                    'essai-partagee-ancienne', '/essai-partagee');
end $$;

-- --- Tout ce qui suit se joue sans aucun acces ---------------------------
select tests_logout();

do $$
declare
  v_avis record;
begin
  -- L'avis existe pour une commande retiree, meme sans compte : c'est tout
  -- l'interet, le lien arrive souvent de l'exterieur.
  select * into v_avis from public.commande_retiree('essai-retiree');

  perform tests_assert(
    v_avis.nom = 'Commande retiree' and v_avis.commande = '/essai-retiree',
    'Une commande retiree ne rend aucun avis : son adresse retombe sur « introuvable ».');

  perform tests_assert(
    v_avis.bibliotheque = 'images' and v_avis.retiree_le is not null,
    'L''avis de retrait n''a pas de quoi se rediger.');

  -- Et elle n'a pas de suite : ne rien proposer est la bonne reponse.
  perform tests_assert(
    v_avis.remplacante_slug is null,
    'Une commande sans equivalent s''est vu attribuer une remplacante : '
    'c''est la redirection deguisee qu''on refuse.');
end $$;

-- --- Un brouillon ne se decouvre pas par son adresse ---------------------
do $$
declare v_n integer;
begin
  select count(*) into v_n from public.commande_retiree('essai-brouillon');
  perform tests_assert(
    v_n = 0,
    'Un brouillon se laisse lire par l''avis de retrait : il suffirait de '
    'deviner son adresse pour connaitre son existence et son nom.');

  select count(*) into v_n from public.commande_retiree('essai-publiee');
  perform tests_assert(
    v_n = 0,
    'Une commande publiee rend un avis de retrait alors qu''elle a sa fiche.');

  select count(*) into v_n from public.commande_retiree('adresse-qui-n-a-jamais-existe');
  perform tests_assert(
    v_n = 0,
    'Une adresse inventee rend un avis : « introuvable » reste la bonne '
    'reponse pour ce qui n''a jamais existe.');
end $$;

-- --- La remplacante porte la meme commande, jamais une voisine -----------
do $$
declare v_avis record;
begin
  select * into v_avis from public.commande_retiree('essai-partagee-ancienne');

  perform tests_assert(
    v_avis.remplacante_slug = 'essai-partagee-vivante',
    'La variante encore publiee sous la meme commande n''est pas proposee.');

  perform tests_assert(
    v_avis.commande = '/essai-partagee',
    'L''avis ne nomme pas la commande d''origine.');
end $$;

-- --- Ce que la fonction n'a PAS le droit de rendre -----------------------
--
-- Le risque d'une fonction `security definer` est la derive : quelqu'un
-- ajoute une colonne « pour que la page soit plus jolie » et le catalogue
-- reserve devient lisible sans compte. On verrouille la forme.
do $$
declare
  v_colonnes text[];
begin
  select array_agg(p.proargnames[i] order by i) into v_colonnes
  from pg_proc p,
       lateral generate_subscripts(p.proargnames, 1) i
  where p.proname = 'commande_retiree'
    and p.pronamespace = 'public'::regnamespace
    and p.proargmodes[i] = 't';

  perform tests_assert(
    v_colonnes = array['nom', 'commande', 'bibliotheque', 'retiree_le',
                       'remplacante_slug', 'remplacante_nom'],
    format('L''avis de retrait rend %s. Toute colonne ajoutee ici est lisible '
           'sans compte : le payload, la description longue et les criteres '
           'n''ont rien a y faire.', v_colonnes::text));
end $$;

reset role;

rollback;
