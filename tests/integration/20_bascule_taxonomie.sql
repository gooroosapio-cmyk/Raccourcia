-- Ce que la bascule de taxonomie doit avoir produit.
--
-- C'est la seule etape de la refonte que les membres voient : les familles
-- s'ouvrent, les commandes canoniques les rejoignent, les raccourcis
-- absorbes quittent le catalogue. Une bascule a moitie faite ne se voit pas
-- dans un compte global — elle se voit ici.
--
-- La bascule V5 avait ouvert quatorze rayons. La refonte V6, qui la suit, a
-- regroupe les six rayons image en trois ; les huit rayons texte n'ont pas
-- bouge. Ce fichier controle donc l'etat d'arrivee des deux, puisque c'est
-- lui que les membres rencontrent.
--
-- Le fichier ne fait rien si la bascule n'a pas ete appliquee : les lots
-- d'import se verifient sans elle, et exiger son passage rendrait la suite
-- inutilisable pour qui veut seulement controler l'import.
begin;

do $$
declare
  v_n integer;
  v_familles integer;
begin
  select count(*) into v_familles from public.categories
  where external_ref ~ '-V[0-9]+-' and is_visible;

  if v_familles = 0 then
    raise notice 'Bascule non appliquee : controles ignores.';
    return;
  end if;

  -- --- Les rayons sont ouverts, et aucun n'est desert ------------------

  select count(*) into v_n from public.categories
  where external_ref like 'TXT-V5-%' and is_visible;
  perform tests_assert(v_n = 8, format('%s familles texte visibles au lieu de 8.', v_n));

  -- Le domaine image compte trois rayons depuis la V6, et aucun rescape des
  -- decoupages precedents : une ancienne famille image encore ouverte ferait
  -- un septieme choix la ou l'ecran n'en propose que trois.
  select count(*) into v_n from public.categories
  where mode = 'image' and external_ref is not null and is_visible;
  perform tests_assert(v_n = 3, format('%s familles image visibles au lieu de 3.', v_n));

  select count(*) into v_n
  from public.categories f
  where f.is_visible
    and not exists (select 1 from public.prompts p
                    where p.category_id = f.id and p.status = 'published');
  perform tests_assert(v_n = 0, format('%s familles visibles sans aucune commande.', v_n));

  -- --- Chaque commande canonique a rejoint sa famille -------------------

  -- « L'ancienne taxonomie », ce sont les treize familles de la V2 : une
  -- commande canonique publiee n'y a plus rien a faire, qu'elle ait rejoint
  -- un rayon V5 ou le rayon V6 qui l'a remplace.
  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.level is not null and p.status = 'published'
    and c.external_ref !~ '-V[0-9]+-';
  perform tests_assert(v_n = 0,
    format('%s commandes canoniques publiees sont restees dans l''ancienne taxonomie.', v_n));

  -- --- Rien ne se retrouve hors de l'ecran sans raison ------------------

  select count(*) into v_n
  from public.prompts p
  where p.status = 'published'
    and (p.category_id is null
         or not exists (select 1 from public.categories c
                        where c.id = p.category_id and c.is_visible));
  perform tests_assert(v_n = 0, format('%s commandes publiees hors des familles visibles.', v_n));

  -- --- Les anciennes familles sont archivees, jamais supprimees ---------

  select count(*) into v_n from public.categories
  where external_ref ~ '^(IMG|TXT)-[0-9]+$';
  perform tests_assert(v_n = 13,
    format('%s familles V2 en base au lieu de 13 : une a ete supprimee.', v_n));

  -- Une ancienne famille encore visible n'est pas une anomalie en soi :
  -- elle garde un raccourci que la bascule n'a pas pu retirer, faute d'une
  -- commande canonique publiee pour le remplacer. Ce qui serait faux, c'est
  -- qu'elle soit visible et vide — deja verifie plus haut.
  select count(*) into v_n
  from public.categories c
  where c.external_ref ~ '^(IMG|TXT)-[0-9]+$'
    and c.is_visible
    and not exists (select 1 from public.prompts p
                    where p.category_id = c.id and p.status = 'published'
                      and exists (select 1 from public.prompt_aliases a
                                  where a.alias_prompt_id = p.id));
  perform tests_assert(v_n = 0,
    format('%s anciennes familles restent visibles sans raison.', v_n));

  -- --- Les raccourcis retires conduisent quelque part -------------------

  select count(*) into v_n
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id
  where ancien.status = 'archived'
    and not exists (select 1 from public.resoudre_alias(ancien.slug));
  perform tests_assert(v_n = 0,
    format('%s adresses retirees du catalogue ne menent nulle part.', v_n));

  -- Un raccourci retire garde sa ligne : c'est elle qui porte ses visuels,
  -- ses favoris et l'historique de copie des membres.
  select count(*) into v_n
  from public.prompt_aliases a
  where not exists (select 1 from public.prompts p where p.id = a.alias_prompt_id);
  perform tests_assert(v_n = 0, format('%s raccourcis absorbes ont ete supprimes.', v_n));

  -- --- Le palier d'essai a survecu --------------------------------------

  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published' and p.is_free;
  perform tests_assert(v_n > 0, 'Plus aucune commande offerte n''est visible.');

  -- Un raccourci offert absorbe a passe son palier a sa commande
  -- canonique : sans cela, un visiteur perdrait ce qu'il pouvait copier.
  select count(*) into v_n
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id and ancien.is_free
  join public.prompts canon on canon.id = a.canonical_prompt_id and canon.status = 'published'
  where not canon.is_free;
  perform tests_assert(v_n = 0,
    format('%s raccourcis offerts ont ete retires sans passer leur palier.', v_n));

  -- --- La sauvegarde permet de revenir en arriere -----------------------

  perform tests_assert(
    exists (select 1 from information_schema.tables
            where table_schema = 'public' and table_name = 'prompts_avant_bascule_v5'),
    'La bascule n''a laisse aucune sauvegarde : le retour arriere est impossible.');

  -- La sauvegarde couvre ce que la bascule pouvait deplacer : les commandes
  -- publiees. Celles arrivees apres elle — l'extension V5.1, par exemple —
  -- n'y figurent pas et n'ont rien a y faire : elles n'ont pas d'etat
  -- anterieur a restaurer.
  select count(*) into v_n
  from public.prompts p
  where p.status = 'published'
    and not exists (select 1 from public.prompts_avant_bascule_v5 s where s.id = p.id);
  perform tests_assert(v_n = 0,
    format('%s commandes publiees sans etat anterieur : la sauvegarde est incomplete.', v_n));
end $$;

rollback;
