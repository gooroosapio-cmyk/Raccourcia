-- =====================================================================
-- Ce que la fusion retire de la vitrine
--
-- Les Modes IA (82 commandes) et les Parcours guides (28) sont remplaces,
-- pas deplaces. Le catalogue de septembre 2026 apporte sa propre
-- bibliotheque Reflexions — 102 cartes en quatre categories, dont les
-- Modes de reflexion, les Assistants professionnels, les Personnages
-- immersifs et les Jeux et simulations — ecrite avec le cadrage V2, les
-- entrees declarees et les trois payloads. Garder les deux reviendrait a
-- proposer deux fois la meme chose, avec deux niveaux de qualite.
--
-- ARCHIVER, PAS SUPPRIMER. Une commande archivee garde sa ligne, son
-- identifiant, ses visuels, ses favoris et son historique de payloads.
-- Elle cesse d'etre visible, et se rouvre d'un geste depuis
-- l'administration si un choix se revele mauvais. C'est la difference
-- entre retirer de la vitrine et jeter — et a ce volume, seule la premiere
-- se defait.
--
-- CE LOT NE FERME QUE CE QU'IL NOMME. Les rayons d'une base de recette —
-- « test-visualisation », « test-produit » — n'y figurent pas : ils portent
-- les donnees sur lesquelles la suite de tests travaille, et les fermer
-- rendrait introuvable ce que chaque test vient verifier.
--
-- Rejouable : une commande deja archivee n'est pas retouchee.
-- =====================================================================

begin;

create temporary table lot_retrait (slug text, motif text) on commit drop;

insert into lot_retrait (slug, motif) values
  -- Les Modes IA : remplaces par la bibliotheque Reflexions.
  ('clarte-et-modeles-mentaux',      'Modes IA remplaces par Reflexions'),
  ('professionnels-et-vente',        'Modes IA remplaces par Reflexions'),
  ('jeux-enigmes-et-simulations',    'Modes IA remplaces par Reflexions'),
  ('critiques-et-roasts',            'Modes IA remplaces par Reflexions'),
  ('creativite-et-angles-inattendus','Modes IA remplaces par Reflexions'),
  ('personnages-immersifs-avant-v2', 'Modes IA remplaces par Reflexions'),
  ('style-et-conseil-personnel',     'Modes IA remplaces par Reflexions'),
  -- Les Parcours guides : la V2 ne reconduit pas cette forme.
  ('parcours-visuels',               'Parcours guides non reconduits'),
  ('parcours-mixtes-et-modes',       'Parcours guides non reconduits');

-- Les commandes d'abord, le rayon ensuite : un rayon ferme qui porte encore
-- une commande publiee masquerait cette commande sans que son statut le
-- dise, et personne ne la retrouverait dans la liste des brouillons.
update public.prompts p
set status = 'archived'::public.content_status, updated_at = now()
from lot_retrait l
join public.categories c on c.slug = l.slug
where p.category_id = c.id
  and p.status <> 'archived';

update public.categories c
set status = 'archived'::public.content_status, updated_at = now()
from lot_retrait l
where c.slug = l.slug
  and c.status <> 'archived';

do $rapport$
declare v_commandes integer; v_rayons integer;
begin
  select count(*) into v_commandes
  from public.prompts p
  join public.categories c on c.id = p.category_id
  join (select 'clarte-et-modeles-mentaux' as s union all select 'professionnels-et-vente'
        union all select 'jeux-enigmes-et-simulations' union all select 'critiques-et-roasts'
        union all select 'creativite-et-angles-inattendus' union all select 'personnages-immersifs-avant-v2'
        union all select 'style-et-conseil-personnel' union all select 'parcours-visuels'
        union all select 'parcours-mixtes-et-modes') r on r.s = c.slug
  where p.status = 'archived';

  select count(*) into v_rayons from public.categories where status = 'archived';

  raise notice 'Retrait : % commande(s) archivee(s) (modes, parcours), % rayon(s) fermes au total.',
    v_commandes, v_rayons;
end $rapport$;

commit;
