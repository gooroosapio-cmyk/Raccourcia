-- =====================================================================
-- L'avis de retrait
--
-- La refonte V5 sort 2276 commandes de la selection active. 700 d'entre
-- elles sont regroupees et gardent une redirection ; les autres n'en ont
-- pas, et c'est voulu — rediriger « /1950sstudio » vers un portrait
-- generique promettrait un resultat qui ne viendrait pas.
--
-- Mais ne pas rediriger ne veut pas dire ne rien dire. En l'etat, ces
-- adresses tombent sur une page introuvable, la meme que si la commande
-- n'avait jamais existe. Quelqu'un qui a garde le lien ne sait alors pas
-- s'il s'est trompe, si le service est casse, ou si la commande a ete
-- retiree. Cette fonction sert a lui repondre.
--
-- Elle ne rend que de quoi ecrire l'avis : le nom, la commande, la
-- bibliotheque, la date du retrait. Jamais le payload, jamais la
-- description longue, jamais rien qui ferait de cette page une fiche
-- gratuite de ce qui est reserve aux membres. C'est pour cela qu'elle est
-- `security definer` et etroite plutot qu'une politique de lecture
-- ouverte sur les archives.
--
-- Elle cherche aussi une remplacante, mais seulement sous LA MEME
-- commande : c'est le cas des variantes absorbees, ou la fonction existe
-- toujours et ou l'envoyer est honnete. Une commande voisine ne serait
-- pas la meme fonction, et la proposer serait la redirection deguisee
-- qu'on refuse.
--
-- Un brouillon n'est pas une archive : `status = 'archived'` uniquement,
-- pour qu'un raccourci en preparation ne se decouvre pas par son adresse.
-- =====================================================================

create or replace function public.commande_retiree(p_slug text)
returns table (
  nom text,
  commande text,
  bibliotheque text,
  retiree_le timestamptz,
  remplacante_slug text,
  remplacante_nom text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    archive.name,
    archive.command::text,
    archive.library::text,
    archive.updated_at,
    suite.slug,
    suite.name
  from public.prompts archive
  left join lateral (
    select p.slug, p.name
    from public.prompts p
    join public.categories c on c.id = p.category_id
    where p.command = archive.command
      and p.status = 'published'
      and c.is_visible
    order by p.sort_order, p.name
    limit 1
  ) suite on true
  where archive.slug = p_slug
    and archive.status = 'archived'
  -- L'unicite du slug ne porte que sur le non-archive : deux archives
  -- peuvent partager une adresse. La plus recemment retiree est celle que
  -- le lien visait le plus probablement.
  order by archive.updated_at desc
  limit 1;
$$;

revoke all on function public.commande_retiree(text) from public;
grant execute on function public.commande_retiree(text) to anon, authenticated, service_role;

comment on function public.commande_retiree(text) is
  'Avis de retrait pour une adresse dont la commande est archivee. Ne rend '
  'que le nom, la commande, la bibliotheque et la date — jamais le contenu. '
  'La remplacante proposee porte la meme commande, donc la meme fonction ; '
  'aucune commande voisine n''est suggerée.';
