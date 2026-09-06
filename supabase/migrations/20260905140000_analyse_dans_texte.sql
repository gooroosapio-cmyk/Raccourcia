-- =====================================================================
-- RaccourcIA - 19. L'analyse rejoint le mode texte
--
-- La regle R01 prevoyait deja que l'analyse cesse d'etre un domaine de
-- navigation pour devenir une categorie de Texte, et R03 la rangeait sous
-- « Travail & pilotage > Analyser & decider ». Cette branche appartenait a
-- la taxonomie `catalogue_v2`, restee vide et archivee a la migration
-- precedente : la regle est donc appliquee ici dans la structure plate.
--
-- `MODES` n'expose que `image` et `texte` : les 40 raccourcis d'analyse
-- etaient invisibles, quelle que soit la visibilite de leurs categories.
-- Ils changent donc aussi de `mode`, sans quoi le filtre du catalogue
-- continuerait de les ecarter.
--
-- Pour tenir en six categories tout en accueillant l'analyse,
-- « Communication » (5 raccourcis, la plus petite) rejoint « Redaction »,
-- qui devient « Redaction et communication ». Les raccourcis d'analyse qui
-- relevent clairement d'un autre domaine y sont repartis ; le noyau
-- reellement analytique — strategie, marche, donnees, risques — forme la
-- nouvelle categorie.
--
--   Marketing et contenu        14   dont 4 audits de contenu et SEO
--   Marque et reseaux            8   inchangee
--   Vente et produit            16   dont 6 de produit, prix et concurrence
--   Redaction et communication  15   dont 3 de documents et reunions
--   Interne et RH               15   dont 5 de processus et diagnostic
--   Analyse et decision         22   strategie, client, donnees, risques
--
-- Aucun raccourci ni aucune categorie n'est supprime : les categories
-- d'analyse passent en `archived`.
-- =====================================================================

-- --- Fusion de Communication dans Redaction ------------------------------
update public.prompts
set category_id = (select id from public.categories where slug = 'texte-redaction')
where category_id = (select id from public.categories where slug = 'texte-communication');

update public.categories set status = 'archived' where slug = 'texte-communication';
update public.categories
set name = 'Rédaction et communication'
where slug = 'texte-redaction';

-- --- La nouvelle categorie ----------------------------------------------
insert into public.categories (slug, parent_id, mode, name, status, sort_order)
values ('texte-analyse-decision', null, 'texte', 'Analyse et décision', 'published', 6)
on conflict (slug) do update
  set name = excluded.name, status = excluded.status, sort_order = excluded.sort_order,
      mode = excluded.mode, parent_id = excluded.parent_id;

update public.categories set sort_order = v.rang
from (values
  ('texte-marketing-contenu', 1), ('texte-marque-reseaux', 2), ('texte-vente-produit', 3),
  ('texte-redaction', 4), ('texte-interne-rh', 5), ('texte-analyse-decision', 6)
) as v(slug, rang)
where public.categories.slug = v.slug;

-- --- Reclassement des 40 raccourcis d'analyse ----------------------------
-- Le changement de `mode` est indispensable : le catalogue filtre dessus.
update public.prompts p
set category_id = cible.id,
    mode = 'texte'
from (values
  -- Audits de contenu, de copy et de referencement.
  ('/seoaudit', 'texte-marketing-contenu'), ('/contentaudit', 'texte-marketing-contenu'),
  ('/copyaudit', 'texte-marketing-contenu'), ('/landingaudit', 'texte-marketing-contenu'),
  -- Produit, prix et concurrence : la meme conversation que la vente.
  ('/roadmap', 'texte-vente-produit'), ('/backlogtriage', 'texte-vente-produit'),
  ('/prdreview', 'texte-vente-produit'), ('/featurematrix', 'texte-vente-produit'),
  ('/pricingaudit', 'texte-vente-produit'), ('/competitor', 'texte-vente-produit'),
  -- Documents et reunions : de la redaction, pas de l'analyse.
  ('/briefanalyse', 'texte-redaction'), ('/docsynthese', 'texte-redaction'),
  ('/meetingnotes', 'texte-redaction'),
  -- Processus et diagnostic interne.
  ('/workflowmap', 'texte-interne-rh'), ('/processaudit', 'texte-interne-rh'),
  ('/gapanalysis', 'texte-interne-rh'), ('/rootcause', 'texte-interne-rh'),
  ('/testplan', 'texte-interne-rh'),
  -- Le noyau analytique.
  ('/persona', 'texte-analyse-decision'), ('/journey', 'texte-analyse-decision'),
  ('/surveyanalyse', 'texte-analyse-decision'), ('/customerfeedback', 'texte-analyse-decision'),
  ('/churnhypothesis', 'texte-analyse-decision'), ('/growthideas', 'texte-analyse-decision'),
  ('/marketmap', 'texte-analyse-decision'), ('/uixaudit', 'texte-analyse-decision'),
  ('/funnelaudit', 'texte-analyse-decision'), ('/swot', 'texte-analyse-decision'),
  ('/pestel', 'texte-analyse-decision'), ('/porter', 'texte-analyse-decision'),
  ('/decisionmatrix', 'texte-analyse-decision'), ('/prioritize', 'texte-analyse-decision'),
  ('/financialsnapshot', 'texte-analyse-decision'), ('/kpi', 'texte-analyse-decision'),
  ('/datainsights', 'texte-analyse-decision'), ('/riskscan', 'texte-analyse-decision'),
  ('/securitybasic', 'texte-analyse-decision'), ('/contractscan', 'texte-analyse-decision'),
  ('/promptaudit', 'texte-analyse-decision'), ('/imagepromptdebug', 'texte-analyse-decision')
) as m(commande, categorie)
join public.categories cible on cible.slug = m.categorie
where p.command = m.commande and p.mode = 'analyse';

-- --- Retrait des categories d'analyse ------------------------------------
-- Archivees, jamais supprimees. Elles ne portent plus aucun raccourci.
update public.categories
set status = 'archived'
where mode = 'analyse' and status <> 'archived';
