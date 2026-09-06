-- Lot 35 : raccourcis 100 a 102 sur 320.
--
-- Rapprochement par external_ref : une ligne existante conserve son
-- identifiant technique, donc les favoris, l'historique et les copies deja
-- enregistrees des membres.

-- Table de travail du lot. Sans ON COMMIT DROP : psql valide chaque
-- instruction separement, la table disparaitrait avant d'avoir servi.
drop table if exists lot_prompts;
create temporary table lot_prompts as
select * from jsonb_to_recordset($raccourcia$[{"external_ref":"RCI-IMG-127","command":"/landscaperedesign","slug":"landscaperedesign","name":"Aménagement paysager","mode":"image","family_ref":"IMG-05","short_description":"Ajoute végétation, cheminements, mobilier et éclairage adaptés au climat et aux usages sans masquer les contraintes visibles du lieu.","result_summary":"Une image finale conforme au sujet, à l’effet et au format demandés.","intention":"Proposer une transformation paysagère crédible d’un espace extérieur.","use_cases":["Aménagement paysager à partir d’un contexte réel pour obtenir un résultat directement exploitable.","/landscaperedesign avec la source, l’objectif et les contraintes utiles."],"tags":["paysage","extérieur","aménagement"],"expected_input":"image recommandée; obligatoire pour modifier un sujet existant","minimal_context":"Sujet identifiable et transformation comprise.","sufficient_context":"Sujet visible, effet clair et absence d’instruction contradictoire.","required_variables":["image","usage"],"optional_variables":["format","intensité","couleurs","éléments à préserver"],"default_values":"Conserver identité, cadrage et proportions; rendu réaliste premium; même ratio.","expected_output":"Une image finale conforme au sujet, à l’effet et au format demandés.","output_format":"Image finale générée, sans explication longue.","quality_criteria":"Sujet reconnaissable; effet visible; perspective, lumière, matières et ombres cohérentes; aucun artefact majeur; texte absent ou lisible.","preserve_rules":"Identité, proportions, éléments distinctifs, perspective, lumière cohérente et informations de marque fournies.","avoid_rules":"Déformations, éléments ajoutés sans raison, logos altérés, texte illisible, incohérences d’ombre et fausse précision technique.","limitations":"Les détails techniques, logos, textes fins, mains et visages peuvent nécessiter une validation ou une nouvelle génération.","usage_conditions":"Droits sur l’image et consentement pour les personnes identifiables; simulations signalées; aucun usage trompeur.","fallback_if_incomplete":"Demander la source ou la précision manquante; ne pas inventer l’apparence du sujet.","blocking_condition":"Demander une image si la demande vise la modification d’un sujet existant.","questionnaire_mode":"conditional","max_questions":2,"input_type":"image","output_type":"image","risk_level":"moyen","priority":"P1","is_featured":false,"show_image_card":true,"card_image_mode":"before_after","default_image_path":"prompt-media/defaults/image/lieux-architecture-lifestyle/landscaperedesign.webp","default_image_alt":"Aménagement paysager — exemple avant et après","sort_order":11,"version_label":"v2.1","payload":"[RaccourcIA — /landscaperedesign]\nRôle : exécuter « Aménagement paysager ».\nObjectif : Proposer une transformation paysagère crédible d’un espace extérieur.\n\n1. COMPRENDRE LE CONTEXTE\nAnalyse d’abord le message, la conversation et l’image ou les références jointes. N’invente aucune donnée critique. Si le sujet, l’effet et les contraintes sont suffisamment clairs, génère immédiatement l’image.\nEntrée principale : image. Entrées acceptées : image; texte de contexte; image de référence facultative.\nVariables indispensables : image; usage.\n\n2. QUESTIONS CONDITIONNELLES\nNe pose que les questions réellement bloquantes, dans un seul message, maximum 2.\n1. Quelle image dois-je utiliser ? A. Pièce jointe B. Dernière image C. Image décrite D. Autre\n2. Quelle précision donner pour « usage » ? A. Déduire de l’image B. Conserver l’existant C. Je précise D. Autre\nNe redemande jamais une information déjà fournie ou clairement visible.\n\n3. EXÉCUTION\nAjoute végétation, cheminements, mobilier et éclairage adaptés au climat et aux usages sans masquer les contraintes visibles du lieu.\nPréserver : Identité, proportions, éléments distinctifs, perspective, lumière cohérente et informations de marque fournies..\nÉviter : Déformations, éléments ajoutés sans raison, logos altérés, texte illisible, incohérences d’ombre et fausse précision technique..\n\n4. SORTIE OBLIGATOIRE\nGénère directement une image finale. Ne réponds pas par une analyse, un tutoriel ou une longue explication. Si la fonction image est indisponible, indique-le clairement en une phrase sans prétendre avoir produit l’image.\n\n5. CONTRÔLE QUALITÉ\nSujet reconnaissable; effet visible; perspective, lumière, matières et ombres cohérentes; aucun artefact majeur; texte absent ou lisible.\nToute représentation technique, temporelle ou scientifique non fondée sur des données certifiées doit rester explicitement illustrative.","usage_example":"/landscaperedesign avec la source, l’objectif et les contraintes utiles.","test_nominal":"Image adaptée + effet explicite → image finale générée directement.","test_incomplete_context":"Retirer « image » → poser uniquement la question correspondante.","test_blocking":"Demander une image si la demande vise la modification d’un sujet existant.","catalog_version":"v2.1","source_status":"new_v2"},{"external_ref":"RCI-IMG-128","command":"/tablescape","slug":"tablescape","name":"Mise en scène de table","mode":"image","family_ref":"IMG-05","short_description":"Compose vaisselle, textile, fleurs, lumière et détails décoratifs selon l’occasion, le nombre de convives et l’espace disponible.","result_summary":"Une image finale conforme au sujet, à l’effet et au format demandés.","intention":"Créer une table cohérente pour un repas ou un événement.","use_cases":["Mise en scène de table à partir d’un contexte réel pour obtenir un résultat directement exploitable.","/tablescape avec la source, l’objectif et les contraintes utiles."],"tags":["table","événement","lifestyle"],"expected_input":"image recommandée; obligatoire pour modifier un sujet existant","minimal_context":"Sujet identifiable et transformation comprise.","sufficient_context":"Sujet visible, effet clair et absence d’instruction contradictoire.","required_variables":["image","occasion"],"optional_variables":["format","intensité","couleurs","éléments à préserver"],"default_values":"Conserver identité, cadrage et proportions; rendu réaliste premium; même ratio.","expected_output":"Une image finale conforme au sujet, à l’effet et au format demandés.","output_format":"Image finale générée, sans explication longue.","quality_criteria":"Sujet reconnaissable; effet visible; perspective, lumière, matières et ombres cohérentes; aucun artefact majeur; texte absent ou lisible.","preserve_rules":"Identité, proportions, éléments distinctifs, perspective, lumière cohérente et informations de marque fournies.","avoid_rules":"Déformations, éléments ajoutés sans raison, logos altérés, texte illisible, incohérences d’ombre et fausse précision technique.","limitations":"Les détails techniques, logos, textes fins, mains et visages peuvent nécessiter une validation ou une nouvelle génération.","usage_conditions":"Droits sur l’image et consentement pour les personnes identifiables; simulations signalées; aucun usage trompeur.","fallback_if_incomplete":"Demander la source ou la précision manquante; ne pas inventer l’apparence du sujet.","blocking_condition":"Demander une image si la demande vise la modification d’un sujet existant.","questionnaire_mode":"conditional","max_questions":2,"input_type":"image","output_type":"image","risk_level":"moyen","priority":"P1","is_featured":false,"show_image_card":true,"card_image_mode":"before_after","default_image_path":"prompt-media/defaults/image/lieux-architecture-lifestyle/tablescape.webp","default_image_alt":"Mise en scène de table — exemple avant et après","sort_order":12,"version_label":"v2.1","payload":"[RaccourcIA — /tablescape]\nRôle : exécuter « Mise en scène de table ».\nObjectif : Créer une table cohérente pour un repas ou un événement.\n\n1. COMPRENDRE LE CONTEXTE\nAnalyse d’abord le message, la conversation et l’image ou les références jointes. N’invente aucune donnée critique. Si le sujet, l’effet et les contraintes sont suffisamment clairs, génère immédiatement l’image.\nEntrée principale : image. Entrées acceptées : image; texte de contexte; image de référence facultative.\nVariables indispensables : image; occasion.\n\n2. QUESTIONS CONDITIONNELLES\nNe pose que les questions réellement bloquantes, dans un seul message, maximum 2.\n1. Quelle image dois-je utiliser ? A. Pièce jointe B. Dernière image C. Image décrite D. Autre\n2. Quelle direction visuelle retenir ? A. Réaliste premium B. Éditoriale C. Graphique D. Autre\nNe redemande jamais une information déjà fournie ou clairement visible.\n\n3. EXÉCUTION\nCompose vaisselle, textile, fleurs, lumière et détails décoratifs selon l’occasion, le nombre de convives et l’espace disponible.\nPréserver : Identité, proportions, éléments distinctifs, perspective, lumière cohérente et informations de marque fournies..\nÉviter : Déformations, éléments ajoutés sans raison, logos altérés, texte illisible, incohérences d’ombre et fausse précision technique..\n\n4. SORTIE OBLIGATOIRE\nGénère directement une image finale. Ne réponds pas par une analyse, un tutoriel ou une longue explication. Si la fonction image est indisponible, indique-le clairement en une phrase sans prétendre avoir produit l’image.\n\n5. CONTRÔLE QUALITÉ\nSujet reconnaissable; effet visible; perspective, lumière, matières et ombres cohérentes; aucun artefact majeur; texte absent ou lisible.\nToute représentation technique, temporelle ou scientifique non fondée sur des données certifiées doit rester explicitement illustrative.","usage_example":"/tablescape avec la source, l’objectif et les contraintes utiles.","test_nominal":"Image adaptée + effet explicite → image finale générée directement.","test_incomplete_context":"Retirer « image » → poser uniquement la question correspondante.","test_blocking":"Demander une image si la demande vise la modification d’un sujet existant.","catalog_version":"v2.1","source_status":"new_v2"},{"external_ref":"RCI-IMG-050","command":"/miniature","slug":"miniature","name":"Diorama miniature","mode":"image","family_ref":"IMG-06","short_description":"Reconstruit la scène comme une maquette physique avec matériaux et échelle miniature.","result_summary":"Une image finale conforme au sujet, à l’effet et au format demandés.","intention":"Transformer une scene en diorama miniature.","use_cases":["Diorama miniature pour créer un avant/après immédiatement compréhensible dans la bibliothèque.","/miniature sur une photo produit pour obtenir monde miniature sans changer l'identité visuelle."],"tags":["miniature","viral","créative"],"expected_input":"image recommandée; obligatoire pour modifier un sujet existant","minimal_context":"Sujet identifiable et transformation comprise.","sufficient_context":"Sujet visible, zone/effet clair et aucune instruction contradictoire.","required_variables":["scene"],"optional_variables":["style","format","niveau_de_realisme","couleurs","arriere_plan"],"default_values":"Style photo/visualisation premium; format adapte a l'image source; fond neutre si non precise.","expected_output":"Une image finale conforme au sujet, à l’effet et au format demandés.","output_format":"Image finale générée, sans explication longue.","quality_criteria":"Sujet reconnaissable; effet visible; cohérence de perspective, lumière, matière et ombres; aucun artefact majeur; texte absent ou lisible.","preserve_rules":"identité du sujet, proportions, angle general, lumière coherente, materiaux plausibles.","avoid_rules":"déformer le sujet, inventer des éléments absurdes, changer l'identité, ajouter du texte illisible.","limitations":"Les détails techniques, logos, textes fins, mains et visages peuvent nécessiter une validation ou une nouvelle génération.","usage_conditions":"Droits sur l’image et consentement pour les personnes identifiables; simulation technique ou temporelle signalée; aucun usage trompeur.","fallback_if_incomplete":"Demander uniquement la source ou la précision indispensable; ne pas simuler un résultat.","blocking_condition":"Demander l’image source si la demande consiste à modifier un sujet existant et qu’aucune image n’est disponible.","questionnaire_mode":"conditional","max_questions":1,"input_type":"image","output_type":"image","risk_level":"moyen","priority":"P0","is_featured":true,"show_image_card":true,"card_image_mode":"before_after","default_image_path":"prompt-media/defaults/image/styles-creatifs-effets/miniature.webp","default_image_alt":"Diorama miniature — exemple avant et après","legacy_category":"Styles & effets","legacy_subcategory":"Cinéma & spectaculaire","sort_order":1,"version_label":"v2.1","payload":"[RaccourcIA — /miniature]\nRôle : exécuter « Diorama miniature ».\nObjectif : Transformer une scene en diorama miniature.\n\n1. COMPRENDRE LE CONTEXTE\nAnalyse d’abord le message, la conversation et l’image ou les références jointes. N’invente aucune donnée critique. Si le sujet, l’effet et les contraintes sont suffisamment clairs, génère immédiatement l’image.\nEntrée principale : image. Entrées acceptées : image; texte de contexte; image de référence facultative.\nVariables indispensables : scene.\n\n2. QUESTIONS CONDITIONNELLES\nNe pose que les questions réellement bloquantes, dans un seul message, maximum 1.\n1. Quelle précision donner pour « scene » ? A. Déduire de l’image B. Conserver l’existant C. Je précise D. Autre\nNe redemande jamais une information déjà fournie ou clairement visible.\n\n3. EXÉCUTION\nReconstruit la scène comme une maquette physique avec matériaux et échelle miniature.\nPréserver : identité du sujet, proportions, angle general, lumière coherente, materiaux plausibles..\nÉviter : déformer le sujet, inventer des éléments absurdes, changer l'identité, ajouter du texte illisible..\n\n4. SORTIE OBLIGATOIRE\nGénère directement une image finale. Ne réponds pas par une analyse, un tutoriel ou une longue explication. Si la fonction image est indisponible, indique-le clairement en une phrase sans prétendre avoir produit l’image.\n\n5. CONTRÔLE QUALITÉ\nSujet reconnaissable; effet visible; cohérence de perspective, lumière, matière et ombres; aucun artefact majeur; texte absent ou lisible.\nToute représentation technique, temporelle ou scientifique non fondée sur des données certifiées doit rester explicitement illustrative.","usage_example":"/miniature sur une photo produit pour obtenir monde miniature sans changer l'identité visuelle.","test_nominal":"Image adaptée + effet explicite → image finale générée directement.","test_incomplete_context":"Retirer « scene » → poser uniquement la question correspondante.","test_blocking":"Demander l’image source si la demande consiste à modifier un sujet existant et qu’aucune image n’est disponible.","catalog_version":"v2.1","source_status":"existing_optimized"}]$raccourcia$::jsonb) as d(
  external_ref text, command text, slug text, name text, mode text, family_ref text,
  short_description text, result_summary text, intention text, use_cases text[], tags text[],
  expected_input text, minimal_context text, sufficient_context text,
  required_variables text[], optional_variables text[], default_values text,
  expected_output text, output_format text, quality_criteria text,
  preserve_rules text, avoid_rules text, limitations text, usage_conditions text,
  fallback_if_incomplete text, blocking_condition text, questionnaire_mode text,
  max_questions smallint, input_type text, output_type text, risk_level text,
  priority text, is_featured boolean, show_image_card boolean, card_image_mode text,
  default_image_path text, default_image_alt text, legacy_category text,
  legacy_subcategory text, sort_order int, version_label text, payload text,
  usage_example text, test_nominal text, test_incomplete_context text,
  test_blocking text, catalog_version text, source_status text
);

insert into public.prompts (
  external_ref, command, slug, name, mode, category_id, short_description, result_summary,
  intention, use_cases, tags, expected_input, minimal_context, sufficient_context,
  required_variables, optional_variables, default_values, expected_output, output_format,
  quality_criteria, preserve_rules, avoid_rules, limitations, usage_conditions,
  fallback_if_incomplete, blocking_condition, questionnaire_mode, max_questions,
  input_type, output_type, risk_level, priority, is_featured, show_image_card,
  card_image_mode, default_image_path, default_image_alt, legacy_category,
  legacy_subcategory, sort_order, usage_example, test_nominal, test_incomplete_context,
  test_blocking, catalog_version, source_status, status, published_at
)
select
  l.external_ref, l.command::extensions.citext, l.slug, l.name, l.mode::public.app_mode, c.id,
  l.short_description, l.result_summary, l.intention, l.use_cases, l.tags,
  l.expected_input, l.minimal_context, l.sufficient_context,
  l.required_variables, l.optional_variables, l.default_values, l.expected_output,
  l.output_format, l.quality_criteria, l.preserve_rules, l.avoid_rules, l.limitations,
  l.usage_conditions, l.fallback_if_incomplete, l.blocking_condition, l.questionnaire_mode,
  l.max_questions, l.input_type::public.input_type, l.output_type::public.output_type,
  l.risk_level::public.risk_level, l.priority, l.is_featured, l.show_image_card,
  l.card_image_mode::public.card_image_mode, l.default_image_path, l.default_image_alt,
  l.legacy_category, l.legacy_subcategory, l.sort_order, l.usage_example,
  l.test_nominal, l.test_incomplete_context, l.test_blocking, l.catalog_version,
  -- Un raccourci nouveau arrive en brouillon : il n'apparait qu'a la bascule,
  -- en meme temps que les categories qui l'accueillent. Un raccourci deja
  -- publie garde son statut, l'ON CONFLICT ne le touche pas.
  l.source_status, 'draft'::public.content_status, null
from lot_prompts l
join public.categories c on c.external_ref = l.family_ref
on conflict (external_ref) do update
  set command = excluded.command,
      slug = excluded.slug,
      name = excluded.name,
      mode = excluded.mode,
      category_id = excluded.category_id,
      short_description = excluded.short_description,
      result_summary = excluded.result_summary,
      intention = excluded.intention,
      use_cases = excluded.use_cases,
      tags = excluded.tags,
      expected_input = excluded.expected_input,
      minimal_context = excluded.minimal_context,
      sufficient_context = excluded.sufficient_context,
      required_variables = excluded.required_variables,
      optional_variables = excluded.optional_variables,
      default_values = excluded.default_values,
      expected_output = excluded.expected_output,
      output_format = excluded.output_format,
      quality_criteria = excluded.quality_criteria,
      preserve_rules = excluded.preserve_rules,
      avoid_rules = excluded.avoid_rules,
      limitations = excluded.limitations,
      usage_conditions = excluded.usage_conditions,
      fallback_if_incomplete = excluded.fallback_if_incomplete,
      blocking_condition = excluded.blocking_condition,
      questionnaire_mode = excluded.questionnaire_mode,
      max_questions = excluded.max_questions,
      input_type = excluded.input_type,
      output_type = excluded.output_type,
      risk_level = excluded.risk_level,
      priority = excluded.priority,
      is_featured = excluded.is_featured,
      show_image_card = excluded.show_image_card,
      card_image_mode = excluded.card_image_mode,
      -- Le classeur ne pose le chemin que s'il n'y en a pas encore : un visuel
      -- envoye depuis l'administration reste maitre.
      default_image_path = coalesce(public.prompts.default_image_path, excluded.default_image_path),
      default_image_alt = coalesce(public.prompts.default_image_alt, excluded.default_image_alt),
      legacy_category = excluded.legacy_category,
      legacy_subcategory = excluded.legacy_subcategory,
      sort_order = excluded.sort_order,
      usage_example = excluded.usage_example,
      test_nominal = excluded.test_nominal,
      test_incomplete_context = excluded.test_incomplete_context,
      test_blocking = excluded.test_blocking,
      catalog_version = excluded.catalog_version,
      source_status = excluded.source_status;
      -- "status" et "is_free" ne sont jamais touches : masquer un raccourci ou
      -- l'offrir sont des decisions d'administration, pas du classeur.

-- Une variante par IA. Le meme payload sert les trois : le classeur ne
-- decline plus le contenu par fournisseur, il decline la conduite a tenir.
insert into public.prompt_variants (prompt_id, provider_id, compatibility, status, fallback_behavior, support_notes)
select p.id, ia.id,
       case when d.fallback_behavior = 'declare_unavailable_if_no_image_tool'
            then 'partiel'::public.compatibility_level
            else 'excellent'::public.compatibility_level end,
       'published'::public.content_status,
       d.fallback_behavior::public.fallback_behavior,
       d.support_notes
from jsonb_to_recordset($raccourcia$[{"external_ref":"RCI-IMG-127","provider_key":"chatgpt","fallback_behavior":"image_generation_required","support_notes":"Compatible si génération ou édition d’image activée."},{"external_ref":"RCI-IMG-127","provider_key":"claude","fallback_behavior":"declare_unavailable_if_no_image_tool","support_notes":"Nécessite une capacité de génération ou d’édition d’image disponible dans l’interface utilisée."},{"external_ref":"RCI-IMG-127","provider_key":"gemini","fallback_behavior":"image_generation_required","support_notes":"Compatible si génération ou édition d’image activée."},{"external_ref":"RCI-IMG-128","provider_key":"chatgpt","fallback_behavior":"image_generation_required","support_notes":"Compatible si génération ou édition d’image activée."},{"external_ref":"RCI-IMG-128","provider_key":"claude","fallback_behavior":"declare_unavailable_if_no_image_tool","support_notes":"Nécessite une capacité de génération ou d’édition d’image disponible dans l’interface utilisée."},{"external_ref":"RCI-IMG-128","provider_key":"gemini","fallback_behavior":"image_generation_required","support_notes":"Compatible si génération ou édition d’image activée."},{"external_ref":"RCI-IMG-050","provider_key":"chatgpt","fallback_behavior":"image_generation_required","support_notes":"Compatible si génération ou édition d’image activée."},{"external_ref":"RCI-IMG-050","provider_key":"claude","fallback_behavior":"declare_unavailable_if_no_image_tool","support_notes":"Nécessite une capacité de génération ou d’édition d’image disponible dans l’interface utilisée."},{"external_ref":"RCI-IMG-050","provider_key":"gemini","fallback_behavior":"image_generation_required","support_notes":"Compatible si génération ou édition d’image activée."}]$raccourcia$::jsonb) as d(
  external_ref text, provider_key text, fallback_behavior text, support_notes text
)
join public.prompts p on p.external_ref = d.external_ref
join public.ai_providers ia on ia.key = d.provider_key
on conflict (prompt_id, provider_id) do update
  set compatibility = excluded.compatibility,
      status = excluded.status,
      fallback_behavior = excluded.fallback_behavior,
      support_notes = excluded.support_notes;

-- Le payload du classeur devient la version courante. Les precedentes sont
-- conservees et retirees du courant : une version publiee reste tracable.
--
-- Trois instructions et non une seule : l'index unique n'admet qu'une version
-- courante par variante, et une CTE qui retire l'ancienne pendant qu'elle
-- insere la nouvelle les fait exister ensemble le temps de l'instruction.

-- 1. Retirer la version courante dont le payload a change.
update public.prompt_versions pv
set is_current = false, status = 'retired'::public.version_status
from lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where pv.variant_id = v.id
  and pv.is_current
  and pv.payload is distinct from l.payload;

-- 2. Inserer le nouveau payload, s'il n'a jamais ete enregistre.
insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, l.version_label, l.payload, 'published'::public.version_status, true, now()
from lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where not exists (
  select 1 from public.prompt_versions pv
  where pv.variant_id = v.id and pv.payload = l.payload
);

-- 3. Un payload identique deja archive redevient simplement le courant.
update public.prompt_versions pv
set is_current = true, status = 'published'::public.version_status
from lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where pv.variant_id = v.id
  and pv.payload = l.payload
  and not pv.is_current
  and not exists (
    select 1 from public.prompt_versions autre
    where autre.variant_id = v.id and autre.is_current
  );

-- Questions contextuelles : remplacees en bloc pour ce lot, car leur ordre
-- fait partie de leur sens.
delete from public.prompt_questions q
using lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
where q.prompt_id = p.id;

insert into public.prompt_questions (prompt_id, sort_order, variable, question, choices, default_value, trigger_note)
select p.id, d.sort_order, d.variable, d.question, to_jsonb(d.choices), d.default_value, d.trigger_note
from jsonb_to_recordset($raccourcia$[{"external_ref":"RCI-IMG-127","sort_order":1,"variable":"image","question":"Quelle image dois-je utiliser ?","choices":["Pièce jointe","Dernière image","Image décrite","Autre"],"default_value":"Pièce jointe","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-IMG-127","sort_order":2,"variable":"usage","question":"Quelle précision donner pour « usage » ?","choices":["Déduire de l’image","Conserver l’existant","Je précise","Autre"],"default_value":"Déduire de la source","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-IMG-128","sort_order":1,"variable":"image","question":"Quelle image dois-je utiliser ?","choices":["Pièce jointe","Dernière image","Image décrite","Autre"],"default_value":"Pièce jointe","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-IMG-128","sort_order":2,"variable":"occasion","question":"Quelle direction visuelle retenir ?","choices":["Réaliste premium","Éditoriale","Graphique","Autre"],"default_value":"Cohérente avec la source","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-IMG-050","sort_order":1,"variable":"scene","question":"Quelle précision donner pour « scene » ?","choices":["Déduire de l’image","Conserver l’existant","Je précise","Autre"],"default_value":"Déduire de la source","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."}]$raccourcia$::jsonb) as d(
  external_ref text, sort_order smallint, variable text, question text,
  choices text[], default_value text, trigger_note text
)
join public.prompts p on p.external_ref = d.external_ref;

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.prompts where catalog_version = 'v2.1';
  if v_total < 102 then
    raise exception 'Lot 35 incomplet : % raccourcis importes au lieu de 102.', v_total;
  end if;
end $ctrl$;

drop table lot_prompts;
