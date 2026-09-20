-- =====================================================================
-- Ce que contient chaque rayon (30 tags)
-- =====================================================================

begin;

create temporary table lot_descriptions (slug text, description text) on commit drop;

insert into lot_descriptions values
  ('texte', 'Tout ce qui se rend sous forme écrite, du message court au dossier.'),
  ('professionnel', 'Des commandes pour le travail : clients, équipes, dossiers, décisions.'),
  ('reflexion', 'L’IA raisonne avec vous plutôt que de produire un livrable d’un coup.'),
  ('conversation', 'Un échange qui dure : l’IA garde le fil et vous relancez.'),
  ('redaction', 'Écrire depuis une page blanche : articles, messages, argumentaires.'),
  ('document', 'Des pièces structurées — rapports, comptes rendus, contrats, notes.'),
  ('marketing', 'Vendre, présenter, convaincre : annonces, fiches, pages et campagnes.'),
  ('decision', 'Peser le pour et le contre avant de trancher.'),
  ('analyse', 'Lire un texte, un chiffre ou une situation, et en tirer ce qui compte.'),
  ('interactif', 'La commande pose des questions et s’adapte à vos réponses.'),
  ('assistant', 'Un rôle tenu dans la durée : l’IA endosse un métier et s’y tient.'),
  ('jeu', 'Des règles, des tours, un objectif — on joue avec l’IA.'),
  ('tableur', 'Des lignes et des colonnes, prêtes à coller dans une feuille de calcul.'),
  ('pedagogie', 'Apprendre et faire apprendre : cours, exercices, révisions.'),
  ('code', 'Du code à exécuter, à relire ou à corriger.'),
  ('transformation', 'Reprendre un contenu existant et lui donner une autre forme.'),
  ('coaching', 'L’IA vous accompagne pas à pas plutôt que de faire à votre place.'),
  ('simulation', 'Répéter une situation — entretien, négociation, crise — avant la vraie.'),
  ('fiction', 'Récits, personnages et univers inventés.'),
  ('synthese', 'Faire court à partir de long, sans perdre l’essentiel.'),
  ('technique', 'Des sujets d’ingénierie, d’outillage et de méthode.'),
  ('personnage', 'L’IA incarne quelqu’un et répond depuis son point de vue.'),
  ('finance', 'Chiffres d’activité, budgets, prévisions et arbitrages.'),
  ('juridique', 'Contrats, clauses et conformité. À faire relire par un professionnel.'),
  ('donnees', 'Tableaux, mesures et jeux de données à exploiter.'),
  ('communication', 'Ce qu’on adresse à d’autres : annonces, réponses, prises de parole.'),
  ('presentation', 'Des plans de diapositives, un écran par idée.'),
  ('creatif', 'Des angles inattendus, quand la réponse évidente ne suffit pas.'),
  ('calcul', 'Des formules et des opérations à appliquer.'),
  ('prompt', 'Des textes destinés à être donnés à une autre IA.');

-- On ne remplace pas une description deja ecrite : l'administration passe
-- devant l'import, toujours.
update public.tags t
set description = l.description, updated_at = now()
from lot_descriptions l
where t.slug = l.slug
  and coalesce(btrim(t.description), '') = '';

do $rapport$
declare v_avec integer; v_total integer;
begin
  select count(*) filter (where coalesce(btrim(description), '') <> ''), count(*)
  into v_avec, v_total from public.tags where is_active;
  raise notice 'Rayons : % tag(s) decrits sur %.', v_avec, v_total;
end $rapport$;

commit;
