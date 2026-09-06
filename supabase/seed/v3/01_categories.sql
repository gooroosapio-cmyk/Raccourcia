-- Lot 1/42 : les treize categories du catalogue V2.
--
-- Elles sont creees ou mises a jour par external_ref. Les anciennes ne sont
-- pas touchees ici : la bascule de navigation est une migration separee, pour
-- que l'import puisse etre verifie avant que quoi que ce soit ne change a
-- l'ecran.
insert into public.categories
  (external_ref, mode, slug, name, short_description, description_long,
   sort_order, fallback_image_path, status, is_visible, parent_id)
select
  d.external_ref, d.mode::public.app_mode, d.slug, d.name, d.short_description,
  d.description_long, d.sort_order, d.fallback_image_path,
  -- En brouillon jusqu'a la bascule. "is_visible" est derivee du statut par
  -- declencheur : une categorie publiee est forcement visible, le statut est
  -- donc le seul levier qui les tient hors de l'ecran.
  'draft'::public.content_status, false, null
from jsonb_to_recordset($raccourcia$[{"external_ref":"IMG-01","mode":"image","slug":"technique-explication","name":"Technique & explication","short_description":"Comprendre la structure, le fonctionnement ou les étapes d’un objet, d’un espace ou d’un processus.","description_long":"Vues techniques, schémas, coupes, assemblages, infographies et représentations pédagogiques. Les rendus restent illustratifs lorsqu’aucune donnée certifiée n’est fournie.","sort_order":1,"fallback_image_path":"prompt-media/families/image/technique-explication.webp"},{"external_ref":"IMG-02","mode":"image","slug":"produit-publicite","name":"Produit & publicité","short_description":"Créer des visuels commerciaux, e-commerce et publicitaires qui mettent clairement une offre en valeur.","description_long":"Packshots, mockups, campagnes sociales, affiches, produits en situation et compositions publicitaires.","sort_order":2,"fallback_image_path":"prompt-media/families/image/produit-publicite.webp"},{"external_ref":"IMG-03","mode":"image","slug":"portrait-mode-identite","name":"Portrait, mode & identité","short_description":"Créer ou transformer portraits, tenues et identités visuelles tout en préservant les traits du sujet.","description_long":"Portraits professionnels, beauté, coiffure, maquillage, vêtements, mode éditoriale et avatars.","sort_order":3,"fallback_image_path":"prompt-media/families/image/portrait-mode-identite.webp"},{"external_ref":"IMG-04","mode":"image","slug":"retouche-amelioration","name":"Retouche & amélioration","short_description":"Corriger, nettoyer et améliorer une image sans dénaturer son contenu essentiel.","description_long":"Nettoyage, suppression, restauration, extension, colorimétrie, netteté, reflets, ombres et changements atmosphériques.","sort_order":4,"fallback_image_path":"prompt-media/families/image/retouche-amelioration.webp"},{"external_ref":"IMG-05","mode":"image","slug":"lieux-architecture-lifestyle","name":"Lieux, architecture & lifestyle","short_description":"Mettre en scène ou transformer intérieurs, architecture, gastronomie et situations de vie.","description_long":"Décoration, immobilier, façades, plans, événementiel, food, tables et scènes lifestyle.","sort_order":5,"fallback_image_path":"prompt-media/families/image/lieux-architecture-lifestyle.webp"},{"external_ref":"IMG-06","mode":"image","slug":"styles-creatifs-effets","name":"Styles créatifs & effets","short_description":"Produire des rendus artistiques, cinématographiques, viraux ou fortement stylisés.","description_long":"Effets spectaculaires, matières, illustration, transformations surréalistes et directions artistiques.","sort_order":6,"fallback_image_path":"prompt-media/families/image/styles-creatifs-effets.webp"},{"external_ref":"TXT-01","mode":"texte","slug":"strategie-business","name":"Stratégie & business","short_description":"Structurer une offre, un modèle économique, un lancement ou une orientation stratégique.","description_long":"Positionnement, modèle d’affaires, propositions de valeur, lancements, partenariats et plans de développement.","sort_order":1,"fallback_image_path":"prompt-media/families/texte/strategie-business.webp"},{"external_ref":"TXT-02","mode":"texte","slug":"marketing-vente","name":"Marketing & vente","short_description":"Attirer, convertir et fidéliser grâce à des messages et plans commerciaux actionnables.","description_long":"Acquisition, pages de vente, campagnes, prospection, objections, conversion, rétention et relation commerciale.","sort_order":2,"fallback_image_path":"prompt-media/families/texte/marketing-vente.webp"},{"external_ref":"TXT-03","mode":"texte","slug":"communication-contenu","name":"Communication & contenu","short_description":"Rédiger, adapter et décliner les contenus de marque sur tous les canaux.","description_long":"Éditorial, réseaux sociaux, vidéo, email, presse, marque, traduction et communication sensible.","sort_order":3,"fallback_image_path":"prompt-media/families/texte/communication-contenu.webp"},{"external_ref":"TXT-04","mode":"texte","slug":"travail-organisation","name":"Travail & organisation","short_description":"Organiser le travail, les réunions, les procédures, les responsabilités et le suivi d’exécution.","description_long":"Documents opérationnels, procédures, réunions, projets, responsabilités, décisions et coordination d’équipe.","sort_order":4,"fallback_image_path":"prompt-media/families/texte/travail-organisation.webp"},{"external_ref":"TXT-05","mode":"texte","slug":"analyse-decision","name":"Analyse & décision","short_description":"Analyser des sources, comparer des options, détecter les risques et éclairer une décision.","description_long":"Audits, diagnostics, synthèses, matrices, données, risques, causes, priorités et recommandations.","sort_order":5,"fallback_image_path":"prompt-media/families/texte/analyse-decision.webp"},{"external_ref":"TXT-06","mode":"texte","slug":"produit-tech-competences","name":"Produit, tech & compétences","short_description":"Concevoir produits et interfaces, résoudre des sujets techniques et développer les compétences.","description_long":"UX, produit, support, code, apprentissage, recrutement, carrière, pédagogie et créativité structurée.","sort_order":6,"fallback_image_path":"prompt-media/families/texte/produit-tech-competences.webp"},{"external_ref":"TXT-07","mode":"texte","slug":"finance-gestion","name":"Finance & gestion","short_description":"Préparer budgets, prévisions, diagnostics et décisions financières à partir de données vérifiables.","description_long":"Budget, trésorerie, rentabilité, financement, rapprochements, contrôle de gestion et finances personnelles ou d’entreprise.","sort_order":7,"fallback_image_path":"prompt-media/families/texte/finance-gestion.webp"}]$raccourcia$::jsonb) as d(
  external_ref text, mode text, slug text, name text, short_description text,
  description_long text, sort_order int, fallback_image_path text
)
on conflict (external_ref) where external_ref is not null do update
  set mode = excluded.mode,
      slug = excluded.slug,
      name = excluded.name,
      short_description = excluded.short_description,
      description_long = excluded.description_long,
      sort_order = excluded.sort_order,
      -- Un visuel envoye depuis l'administration n'est jamais ecrase par le
      -- classeur : c'est l'administrateur qui a le dernier mot sur les medias.
      fallback_image_path = coalesce(public.categories.fallback_image_path, excluded.fallback_image_path);

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.categories where external_ref is not null;
  if v_total <> 13 then
    raise exception 'Lot 1 incomplet : % categories au lieu de 13.', v_total;
  end if;
end $ctrl$;
