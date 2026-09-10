-- Lot 118 : commandes canoniques 426 a 433 sur 433.
--
-- Rapprochement par external_ref. Une commande deja en base garde son
-- identifiant technique, donc ses favoris, son historique de copie, ses
-- visuels et son rangement actuel.
--
-- Quinze commandes changent de nom ici : leur mission s'elargit et le
-- classeur leur donne un nom plus juste (/emailpro devient /messagepro).
-- L'adresse publique, elle, ne bouge pas : le slug n'est jamais reecrit, donc
-- un lien deja partage continue de repondre.

drop table if exists lot_v5_commandes;
create temporary table lot_v5_commandes as
select * from jsonb_to_recordset($raccourcia$[{"ref":"RCI-TXT-184","command":"/fundingneeds","slug":"fundingneeds","family_id":"TXT-V5-08","title":"Estimer un besoin de financement","short_description":"Reliez votre projet à ses besoins de cash et aux ressources disponibles.","main_use_case":"Une entreprise prépare le montant à financer pour un lancement.","level":"E","preset_key":"lancement","required_variables":["projet","calendrier","investissements","flux d’exploitation","ressources","devise"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Plan de financement, montant et calendrier du besoin, hypothèses et pièces à préparer. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"moyen","mode":"texte","input_type":"mixed","output_type":"text","max_questions":3,"questionnaire_mode":"successif"},{"ref":"RCI-TXT-185","command":"/financialdashboard","slug":"financialdashboard","family_id":"TXT-V5-08","title":"Construire un tableau de bord financier","short_description":"Suivez les indicateurs utiles à vos décisions avec des définitions claires.","main_use_case":"Une dirigeante prépare un suivi mensuel des ventes, marges et liquidités.","level":"E","preset_key":"mensuel","required_variables":["décisions à suivre","données disponibles","périodicité","périmètre","devise"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Tableau de bord, dictionnaire des indicateurs et consignes d’actualisation. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"moyen","mode":"texte","input_type":"mixed","output_type":"text","max_questions":3,"questionnaire_mode":"successif"},{"ref":"RCI-TXT-186","command":"/capexplan","slug":"capexplan","family_id":"TXT-V5-08","title":"Évaluer un investissement d’entreprise","short_description":"Comparez les dépenses, flux attendus et risques d’un projet d’équipement.","main_use_case":"Une société hésite entre remplacer ou conserver un équipement.","level":"E","preset_key":"remplacement","required_variables":["options","coûts","flux attendus","durée","devise","hypothèses financières"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Comparaison des investissements, flux, indicateurs justifiés et recommandation conditionnelle. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"moyen","mode":"texte","input_type":"mixed","output_type":"text","max_questions":3,"questionnaire_mode":"successif"},{"ref":"RCI-TXT-187","command":"/collectionsplan","slug":"collectionsplan","family_id":"TXT-V5-08","title":"Organiser les relances d’impayés","short_description":"Priorisez vos créances et préparez des relances adaptées.","main_use_case":"Une entreprise organise le suivi de ses factures échues.","level":"E","preset_key":"suivi","required_variables":["créances","échéances","historique de relance","litiges","devise","pays si procédure"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Tableau de suivi des créances, priorités et messages de relance prêts à utiliser. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"moyen","mode":"texte","input_type":"mixed","output_type":"text","max_questions":3,"questionnaire_mode":"successif"},{"ref":"RCI-TXT-188","command":"/monthlyclose","slug":"monthlyclose","family_id":"TXT-V5-08","title":"Préparer la clôture mensuelle","short_description":"Organisez les contrôles, justificatifs et points restant à traiter.","main_use_case":"Une équipe comptable veut fiabiliser sa clôture de fin de mois.","level":"E","preset_key":"checklist","required_variables":["période","référentiel","comptes","procédures existantes","responsables"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Dossier de clôture, checklist opérationnelle et liste des anomalies à résoudre. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"moyen","mode":"texte","input_type":"mixed","output_type":"text","max_questions":3,"questionnaire_mode":"successif"},{"ref":"RCI-TXT-235","command":"/financialmodel","slug":"financialmodel","family_id":"TXT-V5-08","title":"Construire un modèle financier","short_description":"Reliez hypothèses, calculs et résultats dans un modèle modifiable.","main_use_case":"Une entreprise prépare un modèle pour tester son développement.","level":"E","preset_key":"prévision","required_variables":["objectif","horizon","historique disponible","moteurs économiques","devise","structure requise"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Modèle modifiable avec formules, hypothèses, scénarios utiles et guide d’utilisation. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"eleve","mode":"texte","input_type":"mixed","output_type":"text","max_questions":3,"questionnaire_mode":"successif"},{"ref":"RCI-TXT-045","command":"/story","slug":"story","family_id":"TXT-V5-03","title":"Écrire une fiction ou un dialogue","short_description":"Construisez une histoire ou une scène dialoguée avec une progression maîtrisée.","main_use_case":"Un auteur transforme une idée en nouvelle courte ou en scène dialoguée.","level":"D","preset_key":"fiction","required_variables":["genre ou registre","situation de départ"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Récit ou dialogue complet, titré si utile, prêt à publier ou retravailler. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"moyen","mode":"texte","input_type":"mixed","output_type":"text","max_questions":2,"questionnaire_mode":"successif"},{"ref":"RCI-TXT-050","command":"/policycopy","slug":"policycopy","family_id":"TXT-V5-07","title":"Rédiger une politique de service","short_description":"Formalisez des règles de service claires, leurs exceptions et leur application.","main_use_case":"Une équipe publie une politique de réservation, d’annulation ou de remboursement.","level":"E","preset_key":"service","required_variables":["service concerné","règles décidées"],"optional_variables":["exemples","contraintes","identité","références","ton","longueur","format"],"sufficient_context":"Objectif, destinataire ou usage et données indispensables présents ou déductibles sans risque.","blocking_condition":"Donnée métier indispensable absente; pays inconnu pour une clause dépendante du droit; contradiction ou source critique inaccessible.","default_values":"Ton professionnel naturel; structure adaptée au destinataire; longueur utile; une recommandation appliquée si l’utilisateur répond « Choisis pour moi ».","preserve":"Faits, chiffres, citations, décisions, contraintes, voix de marque et nuances présentes dans les sources.","avoid":"Faits, sources, chiffres, clauses, engagements, résultats de test ou décisions inventés; jargon, répétitions et contenu générique.","output_format":"Politique structurée avec objet, champ d’application, règles, exceptions, contact et date de révision. Formats selon la mission : chat, texte copiable, Word, PDF, tableur ou présentation lorsque pertinent.","risk_level":"eleve","mode":"texte","input_type":"mixed","output_type":"text","max_questions":3,"questionnaire_mode":"successif"}]$raccourcia$::jsonb) as d(
  ref text, command text, slug text, family_id text, title text,
  short_description text, main_use_case text, level text, preset_key text,
  required_variables text[], optional_variables text[], sufficient_context text,
  blocking_condition text, default_values text, preserve text, avoid text,
  output_format text, risk_level text, mode text, input_type text, output_type text,
  max_questions smallint, questionnaire_mode text
);

-- 1. Les missions que le catalogue ne connait pas encore. Elles arrivent en
--    brouillon, rangees dans leur famille V5 : invisibles des deux cotes.
insert into public.prompts (
  external_ref, command, slug, name, mode, category_id, short_description, use_cases,
  level, preset_key, required_variables, optional_variables, sufficient_context,
  blocking_condition, default_values, preserve_rules, avoid_rules, output_format,
  input_type, output_type, risk_level, show_image_card, catalog_version, status,
  max_questions, questionnaire_mode
)
select
  l.ref, l.command::extensions.citext, l.slug, l.title, l.mode::public.app_mode, c.id,
  l.short_description, array[l.main_use_case],
  l.level::public.execution_level, l.preset_key,
  l.required_variables, l.optional_variables, l.sufficient_context,
  l.blocking_condition, l.default_values, l.preserve, l.avoid, l.output_format,
  l.input_type::public.input_type, l.output_type::public.output_type,
  l.risk_level::public.risk_level, l.mode = 'image', 'v5.0',
  'draft'::public.content_status, l.max_questions, l.questionnaire_mode
from lot_v5_commandes l
join public.categories c on c.external_ref = l.family_id
where not exists (select 1 from public.prompts p where p.external_ref = l.ref);

-- 2. Les commandes deja en place recoivent le texte du classeur.
--
--    Ne sont volontairement pas touches : category_id (la bascule s'en
--    charge), status, is_free, is_pinned, is_featured, is_new, et tous les
--    champs media. Le classeur est la source du texte, pas des decisions
--    d'exploitation ni des visuels.
update public.prompts p
set command = l.command::extensions.citext,
    name = l.title,
    short_description = l.short_description,
    use_cases = array[l.main_use_case],
    level = l.level::public.execution_level,
    preset_key = l.preset_key,
    required_variables = l.required_variables,
    optional_variables = l.optional_variables,
    sufficient_context = l.sufficient_context,
    blocking_condition = l.blocking_condition,
    default_values = l.default_values,
    preserve_rules = l.preserve,
    avoid_rules = l.avoid,
    output_format = l.output_format,
    input_type = l.input_type::public.input_type,
    output_type = l.output_type::public.output_type,
    risk_level = l.risk_level::public.risk_level,
    max_questions = l.max_questions,
    questionnaire_mode = l.questionnaire_mode
from lot_v5_commandes l
where p.external_ref = l.ref;

-- 3. Trois variantes par commande, une par IA : sans elles, aucun payload ne
--    peut etre pose et resolve_prompt ne renvoie rien.
insert into public.prompt_variants (prompt_id, provider_id, compatibility, status, fallback_behavior)
select p.id, ia.id, 'excellent'::public.compatibility_level,
       'published'::public.content_status,
       case when l.output_type = 'image'
            then 'declare_unavailable_if_no_image_tool'::public.fallback_behavior
            else 'execute_text'::public.fallback_behavior end
from lot_v5_commandes l
join public.prompts p on p.external_ref = l.ref
cross join public.ai_providers ia
on conflict (prompt_id, provider_id) do nothing;

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.prompts p
  join lot_v5_commandes l on l.ref = p.external_ref
  where p.level is not null;
  if v_total <> (select count(*) from lot_v5_commandes) then
    raise exception 'Lot 118 incomplet : % commandes sur % posees.',
      v_total, (select count(*) from lot_v5_commandes);
  end if;
end $ctrl$;

drop table lot_v5_commandes;
