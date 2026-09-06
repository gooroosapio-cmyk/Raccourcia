-- Lot 56 : raccourcis 163 a 165 sur 320.
--
-- Rapprochement par external_ref : une ligne existante conserve son
-- identifiant technique, donc les favoris, l'historique et les copies deja
-- enregistrees des membres.

-- Table de travail du lot. Sans ON COMMIT DROP : psql valide chaque
-- instruction separement, la table disparaitrait avant d'avoir servi.
drop table if exists lot_prompts;
create temporary table lot_prompts as
select * from jsonb_to_recordset($raccourcia$[{"external_ref":"RCI-TXT-009","command":"/tiktokscript","slug":"tiktokscript","name":"Script vidéo courte","mode":"texte","family_ref":"TXT-03","short_description":"Produit hook, scenes, voix off et CTA pour vidéo verticale.","result_summary":"Texte final pret a publier, envoyer ou integrer.","intention":"Transformer une idee en script vidéo court.","use_cases":["Script TikTok à partir d'un contexte réel pour obtenir un livrable directement exploitable.","/tiktokscript pour transformer un brief court en script tiktok exploitable."],"tags":["tiktok","vidéo","script"],"expected_input":"facultative","minimal_context":"Objectif et matière source ou brief compréhensibles.","sufficient_context":"Objectif, audience ou destinataire, source et format déductibles du contexte.","required_variables":["idee","public"],"optional_variables":["ton","longueur","canal","exemples","mots_interdits"],"default_values":"Ton clair, direct et professionnel; longueur moyenne; structure scannable.","expected_output":"Texte final pret a publier, envoyer ou integrer.","output_format":"Titre + texte final + variante courte si utile.","quality_criteria":"Exactitude; clarté; structure; spécificité; format respecté; faits séparés des hypothèses; recommandations reliées aux éléments fournis.","preserve_rules":"Intention, faits, chiffres, sources, contraintes et voix fournis.","avoid_rules":"Invention, remplissage, surpromesse, citation fictive, jargon et répétition.","limitations":"Ne remplace pas une validation juridique, medicale ou financiere; chiffres et sources doivent etre fournis.","usage_conditions":"Utiliser des données autorisées; anonymiser les informations sensibles; faire valider les domaines réglementés.","fallback_if_incomplete":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","blocking_condition":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","questionnaire_mode":"conditional","max_questions":2,"input_type":"text","output_type":"text","risk_level":"faible","priority":"P0","is_featured":true,"show_image_card":false,"card_image_mode":"editorial_cover","default_image_path":"prompt-media/defaults/texte/communication-contenu/tiktokscript.webp","default_image_alt":"Script vidéo courte — illustration éditoriale","legacy_category":"Communication & contenu","legacy_subcategory":"Relation & réseaux","sort_order":6,"version_label":"v2.1","payload":"[RaccourcIA — /tiktokscript]\nRôle : exécuter « Script vidéo courte ».\nObjectif : Transformer une idee en script vidéo court.\n\n1. COMPRENDRE LE CONTEXTE\nAnalyse d’abord le message, la conversation et les pièces jointes. Utilise uniquement les faits, données et contraintes disponibles. Si le contexte suffit, produis directement le livrable.\nEntrée principale : texte. Entrées acceptées : brief; texte; notes; document facultatif.\nVariables indispensables : idee; public.\n\n2. MINI-QCM CONDITIONNEL\nSi une information indispensable manque, pose ces questions dans un seul message, sans dépasser 2 questions.\n1. Que faut-il retenir pour « idee » ? A. Déduire du contexte B. Option standard C. Proposer des variantes D. Autre\n2. À qui s’adresse le résultat ? A. Clients B. Prospects C. Équipe interne D. Autre\nNe pose aucune question dont la réponse est déjà fournie ou déductible avec confiance.\n\n3. EXÉCUTION\nProduit hook, scenes, voix off et CTA pour vidéo verticale.\nSépare clairement les faits, hypothèses, calculs et recommandations. N’invente ni chiffre, ni source, ni citation.\n\n4. SORTIE\nTitre + texte final + variante courte si utile.\n\n5. CONTRÔLE QUALITÉ\nExactitude; clarté; structure; spécificité; format respecté; faits séparés des hypothèses; recommandations reliées aux éléments fournis.\nSignale brièvement les limites qui changent la fiabilité. Pour un sujet juridique, fiscal, médical, financier ou de sécurité, présente le résultat comme une aide préparatoire nécessitant une validation qualifiée.","usage_example":"/tiktokscript pour transformer un brief court en script tiktok exploitable.","test_nominal":"Contexte complet → livrable final sans question.","test_incomplete_context":"Retirer « idee » → poser uniquement la question correspondante.","test_blocking":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","catalog_version":"v2.1","source_status":"existing_optimized"},{"external_ref":"RCI-TXT-019","command":"/brandvoice","slug":"brandvoice","name":"Voix de marque","mode":"texte","family_ref":"TXT-03","short_description":"Cree principes de ton, mots a utiliser, mots a eviter et exemples.","result_summary":"Texte final pret a publier, envoyer ou integrer.","intention":"Definir une voix de marque exploitable.","use_cases":["Voix de marque à partir d'un contexte réel pour obtenir un livrable directement exploitable.","/brandvoice pour transformer un brief court en voix de marque exploitable."],"tags":["brand","ton","identité"],"expected_input":"facultative","minimal_context":"Objectif et matière source ou brief compréhensibles.","sufficient_context":"Objectif, audience ou destinataire, source et format déductibles du contexte.","required_variables":["marque","audience"],"optional_variables":["ton","longueur","canal","exemples","mots_interdits"],"default_values":"Ton clair, direct et professionnel; longueur moyenne; structure scannable.","expected_output":"Texte final pret a publier, envoyer ou integrer.","output_format":"Titre + texte final + variante courte si utile.","quality_criteria":"Exactitude; clarté; structure; spécificité; format respecté; faits séparés des hypothèses; recommandations reliées aux éléments fournis.","preserve_rules":"Intention, faits, chiffres, sources, contraintes et voix fournis.","avoid_rules":"Invention, remplissage, surpromesse, citation fictive, jargon et répétition.","limitations":"Ne remplace pas une validation juridique, medicale ou financiere; chiffres et sources doivent etre fournis.","usage_conditions":"Utiliser des données autorisées; anonymiser les informations sensibles; faire valider les domaines réglementés.","fallback_if_incomplete":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","blocking_condition":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","questionnaire_mode":"conditional","max_questions":2,"input_type":"text","output_type":"text","risk_level":"faible","priority":"P0","is_featured":true,"show_image_card":false,"card_image_mode":"editorial_cover","default_image_path":"prompt-media/defaults/texte/communication-contenu/brandvoice.webp","default_image_alt":"Voix de marque — illustration éditoriale","legacy_category":"Communication & contenu","legacy_subcategory":"Marque & éditorial","sort_order":7,"version_label":"v2.1","payload":"[RaccourcIA — /brandvoice]\nRôle : exécuter « Voix de marque ».\nObjectif : Definir une voix de marque exploitable.\n\n1. COMPRENDRE LE CONTEXTE\nAnalyse d’abord le message, la conversation et les pièces jointes. Utilise uniquement les faits, données et contraintes disponibles. Si le contexte suffit, produis directement le livrable.\nEntrée principale : texte. Entrées acceptées : brief; texte; notes; document facultatif.\nVariables indispensables : marque; audience.\n\n2. MINI-QCM CONDITIONNEL\nSi une information indispensable manque, pose ces questions dans un seul message, sans dépasser 2 questions.\n1. Quelle direction visuelle retenir ? A. Réaliste premium B. Éditoriale C. Graphique D. Autre\n2. À qui s’adresse le résultat ? A. Clients B. Prospects C. Équipe interne D. Autre\nNe pose aucune question dont la réponse est déjà fournie ou déductible avec confiance.\n\n3. EXÉCUTION\nCree principes de ton, mots a utiliser, mots a eviter et exemples.\nSépare clairement les faits, hypothèses, calculs et recommandations. N’invente ni chiffre, ni source, ni citation.\n\n4. SORTIE\nTitre + texte final + variante courte si utile.\n\n5. CONTRÔLE QUALITÉ\nExactitude; clarté; structure; spécificité; format respecté; faits séparés des hypothèses; recommandations reliées aux éléments fournis.\nSignale brièvement les limites qui changent la fiabilité. Pour un sujet juridique, fiscal, médical, financier ou de sécurité, présente le résultat comme une aide préparatoire nécessitant une validation qualifiée.","usage_example":"/brandvoice pour transformer un brief court en voix de marque exploitable.","test_nominal":"Contexte complet → livrable final sans question.","test_incomplete_context":"Retirer « marque » → poser uniquement la question correspondante.","test_blocking":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","catalog_version":"v2.1","source_status":"existing_optimized"},{"external_ref":"RCI-TXT-020","command":"/pressrelease","slug":"pressrelease","name":"Communiqué de presse","mode":"texte","family_ref":"TXT-03","short_description":"Produit titre, chapeau, corps, citation et boilerplate.","result_summary":"Texte final pret a publier, envoyer ou integrer.","intention":"Rediger un communiqué clair et credible.","use_cases":["communiqué presse à partir d'un contexte réel pour obtenir un livrable directement exploitable.","/pressrelease pour transformer un brief court en communiqué presse exploitable."],"tags":["presse","communication","pr"],"expected_input":"facultative","minimal_context":"Objectif et matière source ou brief compréhensibles.","sufficient_context":"Objectif, audience ou destinataire, source et format déductibles du contexte.","required_variables":["annonce","organisation"],"optional_variables":["ton","longueur","canal","exemples","mots_interdits"],"default_values":"Ton clair, direct et professionnel; longueur moyenne; structure scannable.","expected_output":"Texte final pret a publier, envoyer ou integrer.","output_format":"Titre + texte final + variante courte si utile.","quality_criteria":"Exactitude; clarté; structure; spécificité; format respecté; faits séparés des hypothèses; recommandations reliées aux éléments fournis.","preserve_rules":"Intention, faits, chiffres, sources, contraintes et voix fournis.","avoid_rules":"Invention, remplissage, surpromesse, citation fictive, jargon et répétition.","limitations":"Ne remplace pas une validation juridique, medicale ou financiere; chiffres et sources doivent etre fournis.","usage_conditions":"Utiliser des données autorisées; anonymiser les informations sensibles; faire valider les domaines réglementés.","fallback_if_incomplete":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","blocking_condition":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","questionnaire_mode":"conditional","max_questions":2,"input_type":"text","output_type":"text","risk_level":"faible","priority":"P0","is_featured":true,"show_image_card":false,"card_image_mode":"editorial_cover","default_image_path":"prompt-media/defaults/texte/communication-contenu/pressrelease.webp","default_image_alt":"Communiqué de presse — illustration éditoriale","legacy_category":"Communication & contenu","legacy_subcategory":"Marque & éditorial","sort_order":8,"version_label":"v2.1","payload":"[RaccourcIA — /pressrelease]\nRôle : exécuter « Communiqué de presse ».\nObjectif : Rediger un communiqué clair et credible.\n\n1. COMPRENDRE LE CONTEXTE\nAnalyse d’abord le message, la conversation et les pièces jointes. Utilise uniquement les faits, données et contraintes disponibles. Si le contexte suffit, produis directement le livrable.\nEntrée principale : texte. Entrées acceptées : brief; texte; notes; document facultatif.\nVariables indispensables : annonce; organisation.\n\n2. MINI-QCM CONDITIONNEL\nSi une information indispensable manque, pose ces questions dans un seul message, sans dépasser 2 questions.\n1. Que faut-il retenir pour « annonce » ? A. Déduire du contexte B. Option standard C. Proposer des variantes D. Autre\n2. Que faut-il retenir pour « organisation » ? A. Déduire du contexte B. Option standard C. Proposer des variantes D. Autre\nNe pose aucune question dont la réponse est déjà fournie ou déductible avec confiance.\n\n3. EXÉCUTION\nProduit titre, chapeau, corps, citation et boilerplate.\nSépare clairement les faits, hypothèses, calculs et recommandations. N’invente ni chiffre, ni source, ni citation.\n\n4. SORTIE\nTitre + texte final + variante courte si utile.\n\n5. CONTRÔLE QUALITÉ\nExactitude; clarté; structure; spécificité; format respecté; faits séparés des hypothèses; recommandations reliées aux éléments fournis.\nSignale brièvement les limites qui changent la fiabilité. Pour un sujet juridique, fiscal, médical, financier ou de sécurité, présente le résultat comme une aide préparatoire nécessitant une validation qualifiée.","usage_example":"/pressrelease pour transformer un brief court en communiqué presse exploitable.","test_nominal":"Contexte complet → livrable final sans question.","test_incomplete_context":"Retirer « annonce » → poser uniquement la question correspondante.","test_blocking":"Poser uniquement les questions indispensables si l'objectif ou la matière source manque.","catalog_version":"v2.1","source_status":"existing_optimized"}]$raccourcia$::jsonb) as d(
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
from jsonb_to_recordset($raccourcia$[{"external_ref":"RCI-TXT-009","provider_key":"chatgpt","fallback_behavior":"execute_text","support_notes":"Compatible texte et documents selon les limites de contexte."},{"external_ref":"RCI-TXT-009","provider_key":"claude","fallback_behavior":"execute_text","support_notes":"Compatible texte et documents selon les limites de contexte."},{"external_ref":"RCI-TXT-009","provider_key":"gemini","fallback_behavior":"execute_text","support_notes":"Compatible texte, documents et données selon les outils activés."},{"external_ref":"RCI-TXT-019","provider_key":"chatgpt","fallback_behavior":"execute_text","support_notes":"Compatible texte et documents selon les limites de contexte."},{"external_ref":"RCI-TXT-019","provider_key":"claude","fallback_behavior":"execute_text","support_notes":"Compatible texte et documents selon les limites de contexte."},{"external_ref":"RCI-TXT-019","provider_key":"gemini","fallback_behavior":"execute_text","support_notes":"Compatible texte, documents et données selon les outils activés."},{"external_ref":"RCI-TXT-020","provider_key":"chatgpt","fallback_behavior":"execute_text","support_notes":"Compatible texte et documents selon les limites de contexte."},{"external_ref":"RCI-TXT-020","provider_key":"claude","fallback_behavior":"execute_text","support_notes":"Compatible texte et documents selon les limites de contexte."},{"external_ref":"RCI-TXT-020","provider_key":"gemini","fallback_behavior":"execute_text","support_notes":"Compatible texte, documents et données selon les outils activés."}]$raccourcia$::jsonb) as d(
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
from jsonb_to_recordset($raccourcia$[{"external_ref":"RCI-TXT-009","sort_order":1,"variable":"idee","question":"Que faut-il retenir pour « idee » ?","choices":["Déduire du contexte","Option standard","Proposer des variantes","Autre"],"default_value":"Déduire du contexte","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-TXT-009","sort_order":2,"variable":"public","question":"À qui s’adresse le résultat ?","choices":["Clients","Prospects","Équipe interne","Autre"],"default_value":"Public principal du contexte","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-TXT-019","sort_order":1,"variable":"marque","question":"Quelle direction visuelle retenir ?","choices":["Réaliste premium","Éditoriale","Graphique","Autre"],"default_value":"Cohérente avec la source","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-TXT-019","sort_order":2,"variable":"audience","question":"À qui s’adresse le résultat ?","choices":["Clients","Prospects","Équipe interne","Autre"],"default_value":"Public principal du contexte","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-TXT-020","sort_order":1,"variable":"annonce","question":"Que faut-il retenir pour « annonce » ?","choices":["Déduire du contexte","Option standard","Proposer des variantes","Autre"],"default_value":"Déduire du contexte","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."},{"external_ref":"RCI-TXT-020","sort_order":2,"variable":"organisation","question":"Que faut-il retenir pour « organisation » ?","choices":["Déduire du contexte","Option standard","Proposer des variantes","Autre"],"default_value":"Déduire du contexte","trigger_note":"Poser uniquement si la réponse n’est ni fournie ni déductible avec confiance."}]$raccourcia$::jsonb) as d(
  external_ref text, sort_order smallint, variable text, question text,
  choices text[], default_value text, trigger_note text
)
join public.prompts p on p.external_ref = d.external_ref;

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.prompts where catalog_version = 'v2.1';
  if v_total < 165 then
    raise exception 'Lot 56 incomplet : % raccourcis importes au lieu de 165.', v_total;
  end if;
end $ctrl$;

drop table lot_prompts;
