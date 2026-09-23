-- =====================================================================
-- Lot 100 — les 13 categories, 35 collections et 40 tags de la V5
--
-- Les categories V5 portent un external_ref, unique quand il est renseigne :
-- c'est lui qui distingue un rayon V5 d'un rayon herite, et c'est sur lui
-- que l'upsert se fait. Rejouer ce lot ne cree pas un second jeu.
--
-- Les 287 categories heritees ne sont pas touchees ici. Elles sortiront de
-- la navigation quand plus aucune carte active ne les portera — ce que la
-- refonte produit, puisque les 642 cartes sont toutes rattachees a un rayon
-- V5. Aucune n'est supprimee par ce lot : une categorie encore referencee
-- par une archive doit rester, sous peine de casser cette relation.
--
-- Les 40 tags sont le referentiel ferme. L'extraction a verifie qu'aucune
-- carte n'en porte un autre, et qu'aucune n'en porte plus de quatre.
-- Les 147 tags actuels ne sont pas desactives ici : leurs associations
-- doivent d'abord migrer, ce que fait le lot 600.
-- =====================================================================

begin;

create temporary table v5_cat (ref text, slug text, nom text, mode text, ordre int) on commit drop;
insert into v5_cat select * from jsonb_to_recordset($raccourcia$[{"ref":"V5-CREATION","slug":"v5-creation","nom":"Créations & montages","mode":"image","ordre":10},{"ref":"V5-PORTRAITS","slug":"v5-portraits","nom":"Portraits & sujets","mode":"image","ordre":20},{"ref":"V5-ESPACES","slug":"v5-espaces","nom":"Espaces","mode":"image","ordre":30},{"ref":"V5-MARKETING","slug":"v5-marketing","nom":"Marketing & édition","mode":"image","ordre":40},{"ref":"V5-TECHNIQUE","slug":"v5-technique","nom":"Schémas & technique","mode":"image","ordre":50},{"ref":"V5-PRODUITS","slug":"v5-produits","nom":"Produits","mode":"image","ordre":60},{"ref":"V5-ECRIRE","slug":"v5-ecrire","nom":"Écrire & améliorer","mode":"texte","ordre":70},{"ref":"V5-ANALYSER","slug":"v5-analyser","nom":"Synthèses & analyses","mode":"texte","ordre":80},{"ref":"V5-DOCUMENTS","slug":"v5-documents","nom":"Documents","mode":"texte","ordre":90},{"ref":"V5-PERSONNAGES","slug":"v5-personnages","nom":"Personnages & recul","mode":"texte","ordre":100},{"ref":"V5-JEUX","slug":"v5-jeux","nom":"Jeux & simulations","mode":"texte","ordre":110},{"ref":"V5-COACHS","slug":"v5-coachs","nom":"Coachs","mode":"texte","ordre":120},{"ref":"V5-EXPERTS","slug":"v5-experts","nom":"Assistants métiers","mode":"texte","ordre":130}]$raccourcia$)
  as t(ref text, slug text, nom text, mode text, ordre int);

insert into public.categories (external_ref, slug, name, mode, status, is_visible, sort_order)
select c.ref, c.slug, c.nom, c.mode::public.app_mode, 'published', true, c.ordre from v5_cat c
on conflict (external_ref) where external_ref is not null do update
  set name = excluded.name, mode = excluded.mode, status = 'published',
      is_visible = true, sort_order = excluded.sort_order, updated_at = now();

do $ctrl$
begin
  if not ((select count(*) from public.categories where external_ref like 'V5-%') = 13) then
    raise exception 'Lot 100 : les 13 categories V5 ne sont pas toutes en base.';
  end if;
end $ctrl$;

create temporary table v5_coll (ref text, slug text, nom text, mode text, parent text, ordre int) on commit drop;
insert into v5_coll select * from jsonb_to_recordset($raccourcia$[{"ref":"V5C-CREATION-UNIVERS","slug":"v5-creation--univers","nom":"Univers & histoires","mode":"image","parent":"V5-CREATION","ordre":10},{"ref":"V5C-PORTRAITS-EDITORIAUX","slug":"v5-portraits--editoriaux","nom":"Portraits éditoriaux","mode":"image","parent":"V5-PORTRAITS","ordre":20},{"ref":"V5C-ESPACES-AMENAGEMENT","slug":"v5-espaces--amenagement","nom":"Aménagements","mode":"image","parent":"V5-ESPACES","ordre":30},{"ref":"V5C-MARKETING-IDENTITE","slug":"v5-marketing--identite","nom":"Identité & maquettes","mode":"image","parent":"V5-MARKETING","ordre":40},{"ref":"V5C-TECHNIQUE-PLANS","slug":"v5-technique--plans","nom":"Plans & cotes","mode":"image","parent":"V5-TECHNIQUE","ordre":50},{"ref":"V5C-ESPACES-IMAGINAIRES","slug":"v5-espaces--imaginaires","nom":"Lieux imaginaires","mode":"image","parent":"V5-ESPACES","ordre":60},{"ref":"V5C-PORTRAITS-STYLE","slug":"v5-portraits--style","nom":"Style & tenues","mode":"image","parent":"V5-PORTRAITS","ordre":70},{"ref":"V5C-MARKETING-CAMPAGNES","slug":"v5-marketing--campagnes","nom":"Campagnes","mode":"image","parent":"V5-MARKETING","ordre":80},{"ref":"V5C-PRODUITS-PRESENTATION","slug":"v5-produits--presentation","nom":"Présentation fidèle","mode":"image","parent":"V5-PRODUITS","ordre":90},{"ref":"V5C-MARKETING-COUVERTURES","slug":"v5-marketing--couvertures","nom":"Couvertures","mode":"image","parent":"V5-MARKETING","ordre":100},{"ref":"V5C-CREATION-MONTAGES","slug":"v5-creation--montages","nom":"Montages","mode":"image","parent":"V5-CREATION","ordre":110},{"ref":"V5C-CREATION-MATIERES","slug":"v5-creation--matieres","nom":"Arts & matières","mode":"image","parent":"V5-CREATION","ordre":120},{"ref":"V5C-PORTRAITS-SOUVENIRS","slug":"v5-portraits--souvenirs","nom":"Liens & souvenirs","mode":"image","parent":"V5-PORTRAITS","ordre":130},{"ref":"V5C-CREATION-EFFETS","slug":"v5-creation--effets","nom":"Effets photographiques","mode":"image","parent":"V5-CREATION","ordre":140},{"ref":"V5C-CREATION-DETOURNEMENTS","slug":"v5-creation--detournements","nom":"Humour & miniatures","mode":"image","parent":"V5-CREATION","ordre":150},{"ref":"V5C-TECHNIQUE-STRUCTURES","slug":"v5-technique--structures","nom":"Structures & coupes","mode":"image","parent":"V5-TECHNIQUE","ordre":160},{"ref":"V5C-TECHNIQUE-EXPLICATIONS","slug":"v5-technique--explications","nom":"Explications visuelles","mode":"image","parent":"V5-TECHNIQUE","ordre":170},{"ref":"V5C-TECHNIQUE-SYSTEMES","slug":"v5-technique--systemes","nom":"Flux & systèmes","mode":"image","parent":"V5-TECHNIQUE","ordre":180},{"ref":"V5C-PORTRAITS-PROFESSIONNELS","slug":"v5-portraits--professionnels","nom":"Portraits professionnels","mode":"image","parent":"V5-PORTRAITS","ordre":190},{"ref":"V5C-PORTRAITS-RETOUCHES","slug":"v5-portraits--retouches","nom":"Retouches","mode":"image","parent":"V5-PORTRAITS","ordre":200},{"ref":"V5C-PRODUITS-CREATIF","slug":"v5-produits--creatif","nom":"Mises en scène créatives","mode":"image","parent":"V5-PRODUITS","ordre":210},{"ref":"V5C-MARKETING-AFFICHES","slug":"v5-marketing--affiches","nom":"Affiches & menus","mode":"image","parent":"V5-MARKETING","ordre":220},{"ref":"V5C-ECRIRE-AMELIORER","slug":"v5-ecrire--ameliorer","nom":"Améliorer un texte","mode":"texte","parent":"V5-ECRIRE","ordre":230},{"ref":"V5C-ECRIRE-COMMUNIQUER","slug":"v5-ecrire--communiquer","nom":"Communiquer","mode":"texte","parent":"V5-ECRIRE","ordre":240},{"ref":"V5C-ANALYSER-ANALYSER","slug":"v5-analyser--analyser","nom":"Comprendre les sources","mode":"texte","parent":"V5-ANALYSER","ordre":250},{"ref":"V5C-DOCUMENTS-DOCUMENTS","slug":"v5-documents--documents","nom":"Livrables professionnels","mode":"texte","parent":"V5-DOCUMENTS","ordre":260},{"ref":"V5C-PERSONNAGES-PERSONNAGES","slug":"v5-personnages--personnages","nom":"Personnages","mode":"texte","parent":"V5-PERSONNAGES","ordre":270},{"ref":"V5C-PERSONNAGES-RECUL","slug":"v5-personnages--recul","nom":"Angles de réflexion","mode":"texte","parent":"V5-PERSONNAGES","ordre":280},{"ref":"V5C-JEUX-JEUX-RECITS","slug":"v5-jeux--jeux-recits","nom":"Enquêtes & aventures","mode":"texte","parent":"V5-JEUX","ordre":290},{"ref":"V5C-JEUX-JEUX-DEFIS","slug":"v5-jeux--jeux-defis","nom":"Défis courts","mode":"texte","parent":"V5-JEUX","ordre":300},{"ref":"V5C-JEUX-JEUX-PRO","slug":"v5-jeux--jeux-pro","nom":"Simulations professionnelles","mode":"texte","parent":"V5-JEUX","ordre":310},{"ref":"V5C-COACHS-COACHS-QUOTIDIEN","slug":"v5-coachs--coachs-quotidien","nom":"Vie quotidienne","mode":"texte","parent":"V5-COACHS","ordre":320},{"ref":"V5C-COACHS-COACHS-PROGRES","slug":"v5-coachs--coachs-progres","nom":"Apprendre & progresser","mode":"texte","parent":"V5-COACHS","ordre":330},{"ref":"V5C-EXPERTS-EXPERTS-METIERS","slug":"v5-experts--experts-metiers","nom":"Travail & expertise","mode":"texte","parent":"V5-EXPERTS","ordre":340},{"ref":"V5C-EXPERTS-EXPERTS-FINANCE","slug":"v5-experts--experts-finance","nom":"Comptabilité & fiscalité","mode":"texte","parent":"V5-EXPERTS","ordre":350}]$raccourcia$)
  as t(ref text, slug text, nom text, mode text, parent text, ordre int);

insert into public.categories (external_ref, slug, name, mode, parent_id, status, is_visible, sort_order)
select c.ref, c.slug, c.nom, c.mode::public.app_mode,
       (select id from public.categories p where p.external_ref = c.parent),
       'published', true, c.ordre from v5_coll c
on conflict (external_ref) where external_ref is not null do update
  set name = excluded.name, mode = excluded.mode, parent_id = excluded.parent_id,
      status = 'published', is_visible = true, sort_order = excluded.sort_order,
      updated_at = now();

do $ctrl$
begin
  if not ((select count(*) from public.categories where external_ref like 'V5C-%') = 35) then
    raise exception 'Lot 100 : les 35 collections V5 ne sont pas toutes en base.';
  end if;
end $ctrl$;

do $ctrl$
begin
  if not (not exists (select 1 from public.categories where external_ref like 'V5C-%' and parent_id is null)) then
    raise exception 'Lot 100 : une collection V5 n''est rattachee a aucune categorie.';
  end if;
end $ctrl$;

create temporary table v5_tag (slug text, ordre int) on commit drop;
insert into v5_tag select * from jsonb_to_recordset($raccourcia$[{"slug":"photo","ordre":10},{"slug":"portrait","ordre":20},{"slug":"objet","ordre":30},{"slug":"retouche","ordre":40},{"slug":"mode","ordre":50},{"slug":"souvenir","ordre":60},{"slug":"produit","ordre":70},{"slug":"publicite","ordre":80},{"slug":"affiche","ordre":90},{"slug":"couverture","ordre":100},{"slug":"marque","ordre":110},{"slug":"reseaux","ordre":120},{"slug":"illustration","ordre":130},{"slug":"anime","ordre":140},{"slug":"cinema","ordre":150},{"slug":"humour","ordre":160},{"slug":"montage","ordre":170},{"slug":"3d","ordre":180},{"slug":"retro","ordre":190},{"slug":"architecture","ordre":200},{"slug":"plan","ordre":210},{"slug":"schema","ordre":220},{"slug":"donnees","ordre":230},{"slug":"apprentissage","ordre":240},{"slug":"communication","ordre":250},{"slug":"synthese","ordre":260},{"slug":"organisation","ordre":270},{"slug":"analyse","ordre":280},{"slug":"recherche","ordre":290},{"slug":"strategie","ordre":300},{"slug":"personnage","ordre":310},{"slug":"debat","ordre":320},{"slug":"jeu","ordre":330},{"slug":"enquete","ordre":340},{"slug":"simulation","ordre":350},{"slug":"coaching","ordre":360},{"slug":"quotidien","ordre":370},{"slug":"finance","ordre":380},{"slug":"juridique","ordre":390},{"slug":"code","ordre":400}]$raccourcia$) as t(slug text, ordre int);

insert into public.tags (slug, name, groupe, is_active, sort_order)
select t.slug, initcap(replace(t.slug, '-', ' ')), 'fonction', true, t.ordre from v5_tag t
on conflict (slug) do update set is_active = true, sort_order = excluded.sort_order,
  updated_at = now();

do $ctrl$
begin
  if not ((select count(*) from public.tags where slug in (select slug from v5_tag) and is_active) = 40) then
    raise exception 'Lot 100 : les 40 tags du referentiel V5 ne sont pas tous actifs.';
  end if;
end $ctrl$;

commit;
