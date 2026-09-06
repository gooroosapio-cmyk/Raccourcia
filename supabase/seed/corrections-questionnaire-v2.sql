-- =====================================================================
-- Correction des choix de reponse generiques du questionnaire V2
--
-- L'import du classeur (voir scripts/build-catalogue-v3.mjs) posait un
-- repli identique sur toute question dont le classeur n'avait pas renseigne
-- de choix specifiques : "Deduire du contexte / Option standard / Proposer
-- des variantes / Autre". Ce repli couvrait 176 des 594 questions du
-- catalogue V2 — trente pour cent d'entre elles — et n'aiderait personne a
-- l'ecran : il ne dit rien sur ce que la question demande reellement.
--
-- Ce fichier remplace ces 176 jeux de choix par des propositions ancrees
-- dans la description de chaque raccourci concerne (voir
-- prompts.short_description), a la place d'un texte invente. Aucune donnee
-- metier, financiere ou reglementaire n'est introduite ici : ce sont des
-- libelles d'interface — la facon de repondre a une question, jamais la
-- reponse elle-meme.
--
-- Ce n'est pas une migration : aucun schema ne change, seul du contenu est
-- corrige. A l'image de la bascule de navigation, ce fichier vit hors du
-- dossier engendre par le generateur (supabase/seed/v3/), qui est efface et
-- reecrit a chaque passage : y placer cette correction la ferait disparaitre
-- au prochain import.
--
-- A rejouer si le catalogue est un jour reimporte depuis le classeur source
-- avant que celui-ci ne soit lui-meme corrige. Idempotent : chaque ligne vise
-- un identifiant precis et remplace integralement choices et default_value.
-- =====================================================================

begin;

-- /assumptionaudit (Analyse & décision) : « projet »
update public.prompt_questions set choices = '["Projet en cours", "Projet déjà lancé", "Idée à valider", "Autre"]'::jsonb, default_value = 'Projet en cours' where id = 'ba214799-e647-493b-9655-4e7026e7868b';

-- /backlogtriage (Analyse & décision) : « backlog »
update public.prompt_questions set choices = '["Liste jointe", "Liste collée", "Tickets décrits", "Autre"]'::jsonb, default_value = 'Liste jointe' where id = '2da98f5f-dd82-4209-965c-e14b211ded17';

-- /briefanalyse (Analyse & décision) : « brief »
update public.prompt_questions set choices = '["Brief joint", "Brief collé", "Brief décrit", "Autre"]'::jsonb, default_value = 'Brief joint' where id = '3028b37d-cf7f-4ad4-96b5-a9a1c8c50c63';

-- /competitor (Analyse & décision) : « concurrents »
update public.prompt_questions set choices = '["Liste de concurrents fournie", "Un seul concurrent principal", "À identifier sur le marché", "Autre"]'::jsonb, default_value = 'Liste de concurrents fournie' where id = 'f6362749-ef72-4e33-9cf8-9ad2b3d98ee5';

-- /competitor (Analyse & décision) : « criteres »
update public.prompt_questions set choices = '["Prix et fonctionnalités", "Positionnement et image", "Expérience client", "Autre"]'::jsonb, default_value = 'Prix et fonctionnalités' where id = '00ce7644-8aa2-495a-96cf-9d0d3909d771';

-- /contentaudit (Analyse & décision) : « contenus »
update public.prompt_questions set choices = '["Liste de contenus jointe", "Export analytics joint", "Contenus décrits", "Autre"]'::jsonb, default_value = 'Liste de contenus jointe' where id = 'a73a8c73-269f-4595-adec-937740ef8570';

-- /contractscan (Analyse & décision) : « contrat »
update public.prompt_questions set choices = '["Contrat joint", "Extraits collés", "Clauses décrites", "Autre"]'::jsonb, default_value = 'Contrat joint' where id = 'e6b4ce18-e20c-4db9-8543-f7b79d951cfc';

-- /copyaudit (Analyse & décision) : « texte »
update public.prompt_questions set choices = '["Texte joint", "Texte collé", "Lien vers la page", "Autre"]'::jsonb, default_value = 'Texte joint' where id = 'a0492e08-b56d-4bcc-ac54-22e079502e5d';

-- /customerfeedback (Analyse & décision) : « feedback »
update public.prompt_questions set choices = '["Verbatims collés", "Export avis joint", "Résumé décrit", "Autre"]'::jsonb, default_value = 'Verbatims collés' where id = 'e21039ea-2be9-4a56-a447-ed165d7b9354';

-- /decisionmatrix (Analyse & décision) : « options »
update public.prompt_questions set choices = '["Options déjà listées", "Deux options à comparer", "Plusieurs pistes ouvertes", "Autre"]'::jsonb, default_value = 'Options déjà listées' where id = '3d98f3fd-c25b-42e0-96eb-6df2b3e155af';

-- /decisionmatrix (Analyse & décision) : « criteres »
update public.prompt_questions set choices = '["Coût et délai", "Impact et risque", "Critères déjà définis", "Autre"]'::jsonb, default_value = 'Critères déjà définis' where id = '07189cf3-745b-49e6-a75f-02011bd14daa';

-- /featurematrix (Analyse & décision) : « features »
update public.prompt_questions set choices = '["Fonctionnalités listées", "Backlog joint", "À déduire du produit", "Autre"]'::jsonb, default_value = 'Fonctionnalités listées' where id = '4d9314ba-37cc-45fc-91e9-92e28706a88b';

-- /featurematrix (Analyse & décision) : « criteres »
update public.prompt_questions set choices = '["Usage et impact", "Coût de développement", "Critères déjà définis", "Autre"]'::jsonb, default_value = 'Critères déjà définis' where id = '25a0b2d0-3501-4815-8355-3066e07e4417';

-- /funnelaudit (Analyse & décision) : « funnel »
update public.prompt_questions set choices = '["Étapes et taux joints", "Export analytics joint", "Étapes décrites", "Autre"]'::jsonb, default_value = 'Étapes et taux joints' where id = 'd385117e-f2a3-4e91-9cd7-5839d30542a4';

-- /gapanalysis (Analyse & décision) : « etat_actuel »
update public.prompt_questions set choices = '["Situation actuelle décrite", "Diagnostic déjà fait", "À évaluer ensemble", "Autre"]'::jsonb, default_value = 'Situation actuelle décrite' where id = 'd6840627-990c-4623-b876-51528986d764';

-- /growthideas (Analyse & décision) : « business »
update public.prompt_questions set choices = '["Activité et clientèle décrites", "Levier de croissance visé", "Contraintes de ressources", "Autre"]'::jsonb, default_value = 'Activité et clientèle décrites' where id = '6d43a86f-a6a5-478c-8e65-40a333f423b1';

-- /imagepromptdebug (Analyse & décision) : « prompt »
update public.prompt_questions set choices = '["Prompt joint", "Prompt collé", "Résultat obtenu décrit", "Autre"]'::jsonb, default_value = 'Prompt joint' where id = '01259429-1278-4b0f-8913-51711b0bb8d2';

-- /landingaudit (Analyse & décision) : « page »
update public.prompt_questions set choices = '["Page jointe", "Lien vers la page", "Contenu collé", "Autre"]'::jsonb, default_value = 'Page jointe' where id = 'bb939512-9773-4339-89a1-e8eed16f148a';

-- /marketmap (Analyse & décision) : « marche »
update public.prompt_questions set choices = '["Marché déjà défini", "Segment ou zone précisée", "À délimiter ensemble", "Autre"]'::jsonb, default_value = 'Marché déjà défini' where id = '23129f28-e3b8-4b1f-8ee3-546e5a325dc2';

-- /pestel (Analyse & décision) : « marche »
update public.prompt_questions set choices = '["Marché déjà défini", "Zone géographique précisée", "Secteur d’activité précisé", "Autre"]'::jsonb, default_value = 'Marché déjà défini' where id = 'e22425ff-581d-48c5-9316-81cb282322f0';

-- /porter (Analyse & décision) : « marche »
update public.prompt_questions set choices = '["Marché déjà défini", "Secteur d’activité précisé", "Concurrents connus fournis", "Autre"]'::jsonb, default_value = 'Marché déjà défini' where id = '24c3342f-0e3c-4f23-a357-e1b796244d4f';

-- /prdreview (Analyse & décision) : « prd »
update public.prompt_questions set choices = '["PRD joint", "PRD collé", "PRD résumé", "Autre"]'::jsonb, default_value = 'PRD joint' where id = 'b95361b4-2bbf-43ed-9ab4-9281cbbf7f9b';

-- /pricingaudit (Analyse & décision) : « prix »
update public.prompt_questions set choices = '["Grille tarifaire jointe", "Prix actuels décrits", "Comparatif concurrent fourni", "Autre"]'::jsonb, default_value = 'Grille tarifaire jointe' where id = 'cc822420-d13f-415f-a6cf-86beaa5a6c2d';

-- /prioritize (Analyse & décision) : « liste »
update public.prompt_questions set choices = '["Liste jointe", "Liste collée", "Éléments décrits", "Autre"]'::jsonb, default_value = 'Liste jointe' where id = 'd36e311e-a52f-4c8a-831d-5c7bd51d4771';

-- /processaudit (Analyse & décision) : « processus »
update public.prompt_questions set choices = '["Processus décrit étape par étape", "Schéma ou document joint", "Points de friction connus", "Autre"]'::jsonb, default_value = 'Processus décrit étape par étape' where id = '7f8622c0-609e-45c3-99da-ea1b06e76510';

-- /promptaudit (Analyse & décision) : « prompt »
update public.prompt_questions set choices = '["Prompt joint", "Prompt collé", "Objectif du prompt décrit", "Autre"]'::jsonb, default_value = 'Prompt joint' where id = '74534deb-29d5-4244-bd33-3e0c90daca49';

-- /riskscan (Analyse & décision) : « projet »
update public.prompt_questions set choices = '["Projet en cours", "Projet à venir", "Périmètre décrit", "Autre"]'::jsonb, default_value = 'Projet en cours' where id = 'e36abc19-bf4b-4236-838c-6692057ce38d';

-- /roadmap (Analyse & décision) : « features »
update public.prompt_questions set choices = '["Fonctionnalités déjà listées", "Backlog joint", "Vision produit décrite", "Autre"]'::jsonb, default_value = 'Fonctionnalités déjà listées' where id = 'ec1ee1ef-9942-47ce-b879-76a6a9452365';

-- /rootcause (Analyse & décision) : « probleme »
update public.prompt_questions set choices = '["Problème observé décrit", "Incident précis daté", "Symptômes récurrents", "Autre"]'::jsonb, default_value = 'Problème observé décrit' where id = 'abafc407-79fb-45ae-a8d3-43b4e6aba541';

-- /scenarioanalysis (Analyse & décision) : « hypothèses »
update public.prompt_questions set choices = '["Hypothèses déjà posées", "Données de référence jointes", "À construire ensemble", "Autre"]'::jsonb, default_value = 'Hypothèses déjà posées' where id = '25727442-3a87-4b26-8a15-654fccc8c548';

-- /securitybasic (Analyse & décision) : « systeme_ou_process »
update public.prompt_questions set choices = '["Système décrit", "Processus décrit", "Liste d’accès fournie", "Autre"]'::jsonb, default_value = 'Système décrit' where id = '27e73eb9-cc82-480b-99ce-b6b448cf85f9';

-- /seoaudit (Analyse & décision) : « page_ou_texte »
update public.prompt_questions set choices = '["Page jointe", "Texte collé", "Lien vers la page", "Autre"]'::jsonb, default_value = 'Page jointe' where id = '06d8e626-058d-4002-8c3a-dfcc0f491f5a';

-- /surveyanalyse (Analyse & décision) : « reponses »
update public.prompt_questions set choices = '["Réponses jointes", "Export sondage joint", "Résumé décrit", "Autre"]'::jsonb, default_value = 'Réponses jointes' where id = 'a7052871-4e7b-4f7b-9f1b-93e3e981a230';

-- /testplan (Analyse & décision) : « fonctionnalite »
update public.prompt_questions set choices = '["Fonctionnalité décrite", "Spécification jointe", "Ticket ou user story joint", "Autre"]'::jsonb, default_value = 'Fonctionnalité décrite' where id = '2b66b385-94ff-4256-a4c3-5838abedbbc6';

-- /uixaudit (Analyse & décision) : « interface »
update public.prompt_questions set choices = '["Captures jointes", "Lien vers l’interface", "Parcours décrit", "Autre"]'::jsonb, default_value = 'Captures jointes' where id = '792f8e6e-4730-4787-9fc3-b4b22f1a8065';

-- /workflowmap (Analyse & décision) : « processus »
update public.prompt_questions set choices = '["Processus décrit étape par étape", "Schéma joint", "Rôles et outils précisés", "Autre"]'::jsonb, default_value = 'Processus décrit étape par étape' where id = '9dc6d852-ceac-4452-af37-3948430da6eb';

-- /blogoutline (Communication & contenu) : « mot_cle »
update public.prompt_questions set choices = '["Mot-clé déjà choisi", "Plusieurs mots-clés à comparer", "Thème sans mot-clé précis", "Autre"]'::jsonb, default_value = 'Mot-clé déjà choisi' where id = 'a26a18cc-4520-4d5f-a16a-3bc1e6f000e0';

-- /communitypost (Communication & contenu) : « message »
update public.prompt_questions set choices = '["Annonce à faire", "Réponse à un événement", "Message de remerciement", "Autre"]'::jsonb, default_value = 'Annonce à faire' where id = '43491fc3-f224-4e16-82fb-7f9cc62e0766';

-- /communitypost (Communication & contenu) : « communaute »
update public.prompt_questions set choices = '["Communauté déjà décrite", "Réseau social précisé", "Ton et taille du groupe", "Autre"]'::jsonb, default_value = 'Communauté déjà décrite' where id = '11a5c594-b0ce-4c1d-aba1-ac6642bb0e57';

-- /contentbrief (Communication & contenu) : « canal »
update public.prompt_questions set choices = '["Blog ou article", "Réseau social", "Email ou newsletter", "Autre"]'::jsonb, default_value = 'Blog ou article' where id = '698c476a-f22a-40c6-b1c2-4f42e7d47736';

-- /contentrepurpose (Communication & contenu) : « canaux »
update public.prompt_questions set choices = '["LinkedIn et Instagram", "Twitter/X et blog", "Tous les canaux disponibles", "Autre"]'::jsonb, default_value = 'LinkedIn et Instagram' where id = 'b4ddbab3-c049-468a-bdd5-adabc933bba0';

-- /crisisstatement (Communication & contenu) : « faits »
update public.prompt_questions set choices = '["Faits confirmés listés", "Situation encore incertaine", "Communiqué précédent joint", "Autre"]'::jsonb, default_value = 'Faits confirmés listés' where id = '34ca8b0a-9f65-404f-b87d-2d23745db79f';

-- /instagramcaption (Communication & contenu) : « visuel »
update public.prompt_questions set choices = '["Visuel joint", "Visuel décrit", "Lien vers le visuel", "Autre"]'::jsonb, default_value = 'Visuel joint' where id = '8747606b-13bd-41b6-8d58-cccdbc4f0382';

-- /linkedinpost (Communication & contenu) : « idee »
update public.prompt_questions set choices = '["Idée déjà rédigée", "Angle à trouver", "Retour d’expérience personnel", "Autre"]'::jsonb, default_value = 'Idée déjà rédigée' where id = 'f09a85fc-d3ab-4dde-b624-7c5b6d082047';

-- /manifesto (Communication & contenu) : « convictions »
update public.prompt_questions set choices = '["Convictions déjà listées", "Valeurs de la marque décrites", "À faire émerger ensemble", "Autre"]'::jsonb, default_value = 'Convictions déjà listées' where id = 'afb3ae38-05c4-4d6a-90c0-86ad8316be33';

-- /moderationreply (Communication & contenu) : « commentaire »
update public.prompt_questions set choices = '["Commentaire cité", "Commentaire collé", "Ton du commentaire décrit", "Autre"]'::jsonb, default_value = 'Commentaire cité' where id = 'f24e4a80-df8d-4ce8-8ce8-e5e4dfb360e6';

-- /moderationreply (Communication & contenu) : « contexte »
update public.prompt_questions set choices = '["Fil de discussion joint", "Historique décrit", "Cas isolé sans historique", "Autre"]'::jsonb, default_value = 'Fil de discussion joint' where id = '842cd748-d8f8-4707-a910-902d0b1498c9';

-- /naming (Communication & contenu) : « concept »
update public.prompt_questions set choices = '["Concept déjà décrit", "Positionnement précisé", "Univers de marque à définir", "Autre"]'::jsonb, default_value = 'Concept déjà décrit' where id = 'bb6a3915-861b-4e1f-af16-f88aeb267751';

-- /newsletter (Communication & contenu) : « theme »
update public.prompt_questions set choices = '["Thème déjà choisi", "Actualités à synthétiser", "Plusieurs sujets à combiner", "Autre"]'::jsonb, default_value = 'Thème déjà choisi' where id = 'b43676f2-2c83-4e58-8ba2-663348627829';

-- /podcastscript (Communication & contenu) : « duree »
update public.prompt_questions set choices = '["Environ 10 minutes", "Environ 30 minutes", "Plus de 45 minutes", "Autre"]'::jsonb, default_value = 'Environ 30 minutes' where id = '541190dc-2f35-418e-a698-36bb8bc9197f';

-- /presspitch (Communication & contenu) : « annonce »
update public.prompt_questions set choices = '["Annonce déjà rédigée", "Nouveauté décrite", "Lancement à venir", "Autre"]'::jsonb, default_value = 'Annonce déjà rédigée' where id = '87dec1fe-8ab7-41e7-84e2-6dfa32c82848';

-- /presspitch (Communication & contenu) : « media »
update public.prompt_questions set choices = '["Presse généraliste", "Presse spécialisée", "Journaliste précis identifié", "Autre"]'::jsonb, default_value = 'Presse spécialisée' where id = '09dc7184-3e83-4683-ae40-a0a11d655e12';

-- /pressrelease (Communication & contenu) : « annonce »
update public.prompt_questions set choices = '["Annonce déjà rédigée", "Nouveauté décrite", "Lancement à venir", "Autre"]'::jsonb, default_value = 'Annonce déjà rédigée' where id = '20dca117-72ef-4073-bceb-b427ab776ebb';

-- /pressrelease (Communication & contenu) : « organisation »
update public.prompt_questions set choices = '["Nom et secteur précisés", "Description jointe", "Site web fourni", "Autre"]'::jsonb, default_value = 'Nom et secteur précisés' where id = '92711607-9e60-4ffc-935d-5d636bbae4a5';

-- /rewriteclear (Communication & contenu) : « texte »
update public.prompt_questions set choices = '["Texte joint", "Texte collé", "Extrait à reformuler précisé", "Autre"]'::jsonb, default_value = 'Texte joint' where id = 'b72cf3ca-1ce9-4ee9-a4fb-92d1026e0322';

-- /scriptvideo (Communication & contenu) : « idee »
update public.prompt_questions set choices = '["Idée déjà rédigée", "Angle à trouver", "Sujet sans script précis", "Autre"]'::jsonb, default_value = 'Idée déjà rédigée' where id = '726a41a3-709f-42de-b647-7d9dbd129c60';

-- /scriptvideo (Communication & contenu) : « duree »
update public.prompt_questions set choices = '["Moins de 30 secondes", "1 à 3 minutes", "Plus de 5 minutes", "Autre"]'::jsonb, default_value = '1 à 3 minutes' where id = '8849d16f-07e4-4986-8778-9ee937265881';

-- /seo_meta (Communication & contenu) : « page »
update public.prompt_questions set choices = '["Page jointe", "Contenu de la page collé", "Lien vers la page", "Autre"]'::jsonb, default_value = 'Page jointe' where id = 'fe85898c-5641-4f18-9e7a-6b47f0043fb9';

-- /seo_meta (Communication & contenu) : « mot_cle »
update public.prompt_questions set choices = '["Mot-clé déjà choisi", "Plusieurs mots-clés à comparer", "Sujet sans mot-clé précis", "Autre"]'::jsonb, default_value = 'Mot-clé déjà choisi' where id = '3863742d-c98f-48a3-953d-60114fd931c2';

-- /simplify (Communication & contenu) : « texte »
update public.prompt_questions set choices = '["Texte joint", "Texte collé", "Lien vers le texte", "Autre"]'::jsonb, default_value = 'Texte joint' where id = '9017f687-7ab3-44c4-9988-5fdc5d339b83';

-- /simplify (Communication & contenu) : « niveau »
update public.prompt_questions set choices = '["Grand public", "Débutant dans le domaine", "Enfant ou adolescent", "Autre"]'::jsonb, default_value = 'Grand public' where id = 'f8217ac0-3734-4984-9b0c-d5b620beefa3';

-- /slogan (Communication & contenu) : « promesse »
update public.prompt_questions set choices = '["Promesse déjà formulée", "Bénéfice principal décrit", "À faire émerger ensemble", "Autre"]'::jsonb, default_value = 'Promesse déjà formulée' where id = 'b42c7f28-814b-4a1d-ad75-b286f7705a7f';

-- /thread (Communication & contenu) : « idee »
update public.prompt_questions set choices = '["Idée déjà rédigée", "Angle à trouver", "Retour d’expérience personnel", "Autre"]'::jsonb, default_value = 'Idée déjà rédigée' where id = '41a37cde-0d71-4259-a08c-a668587251fd';

-- /tiktokscript (Communication & contenu) : « idee »
update public.prompt_questions set choices = '["Idée déjà rédigée", "Angle à trouver", "Tendance à exploiter", "Autre"]'::jsonb, default_value = 'Idée déjà rédigée' where id = '10fdf47e-5266-4893-8720-66004d05a21c';

-- /tonepro (Communication & contenu) : « texte »
update public.prompt_questions set choices = '["Texte joint", "Texte collé", "Message à écrire de zéro", "Autre"]'::jsonb, default_value = 'Texte joint' where id = '1fb65226-4f06-4762-99fb-98d1f30edbdf';

-- /translateadapt (Communication & contenu) : « texte »
update public.prompt_questions set choices = '["Texte joint", "Texte collé", "Extrait à traduire précisé", "Autre"]'::jsonb, default_value = 'Texte joint' where id = '5250fd87-a3ec-483a-834a-749780f36aed';

-- /translateadapt (Communication & contenu) : « langue »
update public.prompt_questions set choices = '["Anglais", "Espagnol", "Autre langue précisée", "Autre"]'::jsonb, default_value = 'Anglais' where id = '92f1b82b-ed61-4d61-b2e9-1c2e182a2e2c';

-- /voiceguide (Communication & contenu) : « exemples »
update public.prompt_questions set choices = '["Exemples de textes joints", "Exemples décrits", "Aucun exemple, à définir", "Autre"]'::jsonb, default_value = 'Exemples de textes joints' where id = '1d53057b-f60d-42b0-8ac6-5571da1d66a1';

-- /break_even (Finance & gestion) : « prix »
update public.prompt_questions set choices = '["Prix de vente fourni", "Fourchette de prix à comparer", "Prix encore à définir", "Autre"]'::jsonb, default_value = 'Prix de vente fourni' where id = '4e3d1617-623c-40a3-8a21-e283aa72f1de';

-- /break_even (Finance & gestion) : « charges_fixes »
update public.prompt_questions set choices = '["Charges fixes listées", "Charges à estimer ensemble", "Détail comptable joint", "Autre"]'::jsonb, default_value = 'Charges fixes listées' where id = '1efe8a7d-c758-4cf6-a408-201e245a1d02';

-- /capexplan (Finance & gestion) : « investissements »
update public.prompt_questions set choices = '["Liste d’investissements fournie", "Devis ou factures joints", "Montants encore à estimer", "Autre"]'::jsonb, default_value = 'Liste d’investissements fournie' where id = 'd47329a8-91c0-467b-8584-64f8bde6a4a3';

-- /cashflowforecast (Finance & gestion) : « solde_initial »
update public.prompt_questions set choices = '["Solde bancaire actuel fourni", "Relevé joint", "Estimation à définir", "Autre"]'::jsonb, default_value = 'Solde bancaire actuel fourni' where id = '44e46833-88ec-4783-b106-f8a0564157ed';

-- /collectionsplan (Finance & gestion) : « créances »
update public.prompt_questions set choices = '["Liste de créances jointe", "Export comptable joint", "Créances décrites", "Autre"]'::jsonb, default_value = 'Liste de créances jointe' where id = 'd1b6c738-35d4-4c72-b75b-b347903c0225';

-- /collectionsplan (Finance & gestion) : « règles »
update public.prompt_questions set choices = '["Règles internes déjà définies", "Délais de relance précisés", "À proposer par défaut", "Autre"]'::jsonb, default_value = 'À proposer par défaut' where id = 'e1627d67-8e32-4653-9bee-41b1910fde37';

-- /debtplan (Finance & gestion) : « dettes »
update public.prompt_questions set choices = '["Liste de dettes jointe", "Tableau d’amortissement joint", "Dettes décrites", "Autre"]'::jsonb, default_value = 'Liste de dettes jointe' where id = '1929982d-ea67-487f-b6d4-0d45c8b40d59';

-- /debtplan (Finance & gestion) : « capacité_mensuelle »
update public.prompt_questions set choices = '["Montant mensuel disponible fourni", "Revenus et charges détaillés", "Estimation à affiner ensemble", "Autre"]'::jsonb, default_value = 'Montant mensuel disponible fourni' where id = 'acc34ecc-4295-40cf-8179-41d852869150';

-- /financecases (Finance & gestion) : « hypothèses »
update public.prompt_questions set choices = '["Hypothèses déjà posées", "Données de référence jointes", "À construire ensemble", "Autre"]'::jsonb, default_value = 'Hypothèses déjà posées' where id = 'a55e6521-639d-4b84-a9ae-6ecc6a3c7631';

-- /financialdashboard (Finance & gestion) : « activité »
update public.prompt_questions set choices = '["Activité déjà décrite", "Secteur d’activité précisé", "Indicateurs déjà suivis", "Autre"]'::jsonb, default_value = 'Activité déjà décrite' where id = '1985a71f-f736-4db4-b994-29bea84ebd29';

-- /financialratios (Finance & gestion) : « états_financiers »
update public.prompt_questions set choices = '["États financiers joints", "Chiffres clés fournis", "Extraits comptables collés", "Autre"]'::jsonb, default_value = 'États financiers joints' where id = '7435fd6c-5f6c-4ecc-ae50-e265e0339d67';

-- /financialsnapshot (Finance & gestion) : « chiffres »
update public.prompt_questions set choices = '["Chiffres joints", "Chiffres collés", "Extrait comptable décrit", "Autre"]'::jsonb, default_value = 'Chiffres joints' where id = 'a941f53b-ce4d-4761-b95b-87cc3f86b367';

-- /fundingneeds (Finance & gestion) : « projet »
update public.prompt_questions set choices = '["Projet déjà décrit", "Plan d’affaires joint", "Idée encore à cadrer", "Autre"]'::jsonb, default_value = 'Projet déjà décrit' where id = '8c5255c3-9fd3-4007-b8c8-1dee18d292d9';

-- /fundingneeds (Finance & gestion) : « prévisions »
update public.prompt_questions set choices = '["Prévisions déjà chiffrées", "Hypothèses de départ fournies", "À construire ensemble", "Autre"]'::jsonb, default_value = 'Prévisions déjà chiffrées' where id = 'a065f46a-62c1-4fcc-a0e8-cb5e125b1f79';

-- /investmentbrief (Finance & gestion) : « projet »
update public.prompt_questions set choices = '["Projet déjà décrit", "Dossier d’investissement joint", "Idée encore à cadrer", "Autre"]'::jsonb, default_value = 'Projet déjà décrit' where id = '98917c58-0cb3-49a8-8d50-76669f9c385c';

-- /invoicecheck (Finance & gestion) : « règles »
update public.prompt_questions set choices = '["Règles internes déjà définies", "Barème fournisseur précisé", "À proposer par défaut", "Autre"]'::jsonb, default_value = 'À proposer par défaut' where id = 'e90f856e-709e-4b3b-beaa-f1370feb6ccf';

-- /monthlyclose (Finance & gestion) : « organisation »
update public.prompt_questions set choices = '["Organisation comptable décrite", "Équipe et rôles précisés", "Processus déjà formalisé", "Autre"]'::jsonb, default_value = 'Organisation comptable décrite' where id = 'd8ff5b11-d2d2-484f-b7ca-3b33180190df';

-- /paymentplan (Finance & gestion) : « montant »
update public.prompt_questions set choices = '["Montant total fourni", "Montants déjà répartis", "Montant encore à définir", "Autre"]'::jsonb, default_value = 'Montant total fourni' where id = '0cda784b-e4cf-44c0-b2f5-0dbab212283b';

-- /paymentplan (Finance & gestion) : « fréquence »
update public.prompt_questions set choices = '["Mensuelle", "Hebdomadaire", "Selon échéances fournies", "Autre"]'::jsonb, default_value = 'Mensuelle' where id = 'b5c100bc-d449-47fa-b9ce-a6d3265f7048';

-- /pricingmodel (Finance & gestion) : « hypothèses »
update public.prompt_questions set choices = '["Hypothèses déjà posées", "Coûts et volumes fournis", "À construire ensemble", "Autre"]'::jsonb, default_value = 'Hypothèses déjà posées' where id = '614ff0dd-ae04-4ee3-97f4-455c569182aa';

-- /revenueforecast (Finance & gestion) : « moteurs »
update public.prompt_questions set choices = '["Volume et prix fournis", "Historique de ventes joint", "Hypothèses à définir ensemble", "Autre"]'::jsonb, default_value = 'Volume et prix fournis' where id = '8b6c0c0b-6e71-40c4-af65-2487c097b7a8';

-- /savingsplan (Finance & gestion) : « capacité »
update public.prompt_questions set choices = '["Montant mensuel disponible fourni", "Objectif d’épargne précisé", "Revenus et charges détaillés", "Autre"]'::jsonb, default_value = 'Montant mensuel disponible fourni' where id = '0e950e88-f60c-47ef-886a-a514de97a6d8';

-- /taxprepchecklist (Finance & gestion) : « statut »
update public.prompt_questions set choices = '["Indépendant ou profession libérale", "Salarié avec revenus annexes", "Entreprise ou société", "Autre"]'::jsonb, default_value = 'Indépendant ou profession libérale' where id = '9922a07f-d837-4771-b26a-c2c270858e2c';

-- /unit_economics (Finance & gestion) : « unité »
update public.prompt_questions set choices = '["Par client", "Par commande", "Par abonnement", "Autre"]'::jsonb, default_value = 'Par client' where id = 'f01f8130-2dfe-4c1f-a743-a06d8f93d4de';

-- /leadmagnet (Marketing & vente) : « probleme »
update public.prompt_questions set choices = '["Problème déjà identifié", "Douleur client décrite", "À faire émerger ensemble", "Autre"]'::jsonb, default_value = 'Problème déjà identifié' where id = 'd66588fd-9a56-46d9-b100-6ab74ff1ba5f';

-- /offer (Marketing & vente) : « idee »
update public.prompt_questions set choices = '["Idée déjà rédigée", "Offre existante à clarifier", "Concept encore flou", "Autre"]'::jsonb, default_value = 'Idée déjà rédigée' where id = 'd4d31189-9bc1-4459-a3c5-852cfed8d21e';

-- /pricingpage (Marketing & vente) : « plans »
update public.prompt_questions set choices = '["Plans déjà définis", "Grille tarifaire jointe", "Offres encore à structurer", "Autre"]'::jsonb, default_value = 'Plans déjà définis' where id = 'f3d31749-7c28-4770-9f21-15a669d369d2';

-- /salesobjections (Marketing & vente) : « objections »
update public.prompt_questions set choices = '["Objections déjà listées", "Objection récurrente précise", "À anticiper à partir de l’offre", "Autre"]'::jsonb, default_value = 'Objections déjà listées' where id = '1a6de415-c77e-475a-8e23-c510af10b290';

-- /salessequence (Marketing & vente) : « canaux »
update public.prompt_questions set choices = '["Email et LinkedIn", "Téléphone et email", "Tous canaux disponibles", "Autre"]'::jsonb, default_value = 'Email et LinkedIn' where id = 'd76ace3b-114f-4e60-9131-d35b72746495';

-- /acceptancecriteria (Produit, tech & compétences) : « fonctionnalite »
update public.prompt_questions set choices = '["Fonctionnalité décrite", "Spécification jointe", "Ticket ou user story joint", "Autre"]'::jsonb, default_value = 'Fonctionnalité décrite' where id = '52522c9a-5cb4-4b0a-a8f3-9dc8989f98b1';

-- /acceptancecriteria (Produit, tech & compétences) : « regles »
update public.prompt_questions set choices = '["Règles métier déjà définies", "Contraintes techniques précisées", "À déduire de la fonctionnalité", "Autre"]'::jsonb, default_value = 'À déduire de la fonctionnalité' where id = 'f982fea4-816d-4723-841a-acd1f11a89cb';

-- /apioutline (Produit, tech & compétences) : « besoin »
update public.prompt_questions set choices = '["Besoin déjà décrit", "Spécification existante à compléter", "Cas d’usage listés", "Autre"]'::jsonb, default_value = 'Besoin déjà décrit' where id = '0cf85b09-585d-407a-b9b7-16415a031fe2';

-- /brainstorm (Produit, tech & compétences) : « probleme »
update public.prompt_questions set choices = '["Problème déjà formulé", "Objectif à atteindre décrit", "Sujet ouvert sans cadrage", "Autre"]'::jsonb, default_value = 'Problème déjà formulé' where id = '10554121-167e-4c44-99e5-5ff64b7be106';

-- /brainstorm (Produit, tech & compétences) : « contraintes »
update public.prompt_questions set choices = '["Budget ou délai précisé", "Ressources disponibles décrites", "Aucune contrainte particulière", "Autre"]'::jsonb, default_value = 'Aucune contrainte particulière' where id = '53f4f3d6-6789-449e-a6a5-779a85bd589c';

-- /bugreport (Produit, tech & compétences) : « probleme »
update public.prompt_questions set choices = '["Bug déjà reproduit", "Comportement observé décrit", "Signalement d’un utilisateur", "Autre"]'::jsonb, default_value = 'Comportement observé décrit' where id = 'e59ba243-0f7d-4b84-95c5-38dd3c3f898c';

-- /bugreport (Produit, tech & compétences) : « environnement »
update public.prompt_questions set choices = '["Navigateur et système précisés", "Application mobile précisée", "Environnement de production", "Autre"]'::jsonb, default_value = 'Navigateur et système précisés' where id = '62e9501c-e5a2-460c-8108-baa1efb575a1';

-- /careerplan (Produit, tech & compétences) : « profil »
update public.prompt_questions set choices = '["Profil déjà décrit", "CV joint", "Poste ou métier visé précisé", "Autre"]'::jsonb, default_value = 'Profil déjà décrit' where id = '65b130f4-4f2b-4c5a-87c9-469597d0deb8';

-- /changelog (Produit, tech & compétences) : « changements »
update public.prompt_questions set choices = '["Liste de changements jointe", "Notes de développement collées", "Changements décrits", "Autre"]'::jsonb, default_value = 'Liste de changements jointe' where id = '7f381b88-1a65-422a-887f-c9f7e7306c06';

-- /changelog (Produit, tech & compétences) : « version »
update public.prompt_questions set choices = '["Numéro de version fourni", "Date de publication précisée", "Pas de numérotation formelle", "Autre"]'::jsonb, default_value = 'Numéro de version fourni' where id = 'af0c1ccb-70fe-4c87-b65e-2f0fee4afc61';

-- /codereview (Produit, tech & compétences) : « code »
update public.prompt_questions set choices = '["Code joint", "Code collé", "Lien vers le dépôt", "Autre"]'::jsonb, default_value = 'Code joint' where id = '5bf20a24-025d-405e-9f80-1d486154d7b4';

-- /codereview (Produit, tech & compétences) : « contexte »
update public.prompt_questions set choices = '["Langage et objectif précisés", "Contraintes du projet décrites", "Aucun contexte particulier", "Autre"]'::jsonb, default_value = 'Langage et objectif précisés' where id = '272eb58e-4013-4b70-9e49-89e50f209381';

-- /conceptmap (Produit, tech & compétences) : « notions »
update public.prompt_questions set choices = '["Notions déjà listées", "Cours ou document joint", "Sujet à explorer largement", "Autre"]'::jsonb, default_value = 'Notions déjà listées' where id = '446c0cea-55a3-4b36-a413-ff1134867945';

-- /coverletter (Produit, tech & compétences) : « poste »
update public.prompt_questions set choices = '["Poste joint", "Offre d’emploi collée", "Poste décrit oralement", "Autre"]'::jsonb, default_value = 'Poste joint' where id = 'fdc377f9-fe68-4989-be15-86853cafe01b';

-- /coverletter (Produit, tech & compétences) : « profil »
update public.prompt_questions set choices = '["Profil déjà décrit", "CV joint", "Expériences listées", "Autre"]'::jsonb, default_value = 'Profil déjà décrit' where id = '8291404f-78d1-4321-adf5-3c45cabbd11f';

-- /cvrewrite (Produit, tech & compétences) : « cv »
update public.prompt_questions set choices = '["CV joint", "CV collé", "Expériences listées", "Autre"]'::jsonb, default_value = 'CV joint' where id = '5d103b25-6d90-4371-a0ef-ca5ac0cd161f';

-- /debugplan (Produit, tech & compétences) : « probleme »
update public.prompt_questions set choices = '["Bug déjà reproduit", "Comportement observé décrit", "Symptômes récurrents", "Autre"]'::jsonb, default_value = 'Comportement observé décrit' where id = '688aef6b-9fa2-4df8-a732-9aafed077cc7';

-- /debugplan (Produit, tech & compétences) : « contexte »
update public.prompt_questions set choices = '["Environnement et système précisés", "Logs ou erreurs joints", "Aucun contexte particulier", "Autre"]'::jsonb, default_value = 'Environnement et système précisés' where id = '7483fdfb-cda6-4d37-ba01-5e183dfb0df5';

-- /dialogue (Produit, tech & compétences) : « personnages »
update public.prompt_questions set choices = '["Personnages déjà décrits", "Un seul personnage précisé", "Personnages génériques", "Autre"]'::jsonb, default_value = 'Personnages déjà décrits' where id = '7050b61b-a5ad-4255-ae94-d3e0b21a760c';

-- /dialogue (Produit, tech & compétences) : « situation »
update public.prompt_questions set choices = '["Situation déjà décrite", "Lieu et enjeu précisés", "Situation générique", "Autre"]'::jsonb, default_value = 'Situation déjà décrite' where id = 'd20322fe-5978-4a6b-963e-a9ce49541797';

-- /explainlike (Produit, tech & compétences) : « concept »
update public.prompt_questions set choices = '["Concept déjà décrit", "Terme technique précisé", "Notion vague à clarifier", "Autre"]'::jsonb, default_value = 'Concept déjà décrit' where id = '69ddbc27-cf6f-4e0d-807a-132ba7a0fb46';

-- /explainlike (Produit, tech & compétences) : « niveau »
update public.prompt_questions set choices = '["Grand public", "Débutant dans le domaine", "Enfant ou adolescent", "Autre"]'::jsonb, default_value = 'Grand public' where id = '9f3cc70f-4d09-4969-9f1b-95266bdc53c8';

-- /featurebrief (Produit, tech & compétences) : « besoin »
update public.prompt_questions set choices = '["Besoin déjà décrit", "Demande utilisateur remontée", "Idée interne à cadrer", "Autre"]'::jsonb, default_value = 'Besoin déjà décrit' where id = '75af97cf-8206-4dfc-8c92-a4783026a3b8';

-- /flashcards (Produit, tech & compétences) : « niveau »
update public.prompt_questions set choices = '["Débutant", "Intermédiaire", "Avancé", "Autre"]'::jsonb, default_value = 'Intermédiaire' where id = 'fc336623-87d7-46ad-9f4a-1ce05326e659';

-- /interviewprep (Produit, tech & compétences) : « poste »
update public.prompt_questions set choices = '["Poste joint", "Offre d’emploi collée", "Poste décrit oralement", "Autre"]'::jsonb, default_value = 'Poste joint' where id = '5b2bb5fa-42bb-4782-bfb3-7476db435c83';

-- /interviewprep (Produit, tech & compétences) : « profil »
update public.prompt_questions set choices = '["Profil déjà décrit", "CV joint", "Expériences listées", "Autre"]'::jsonb, default_value = 'Profil déjà décrit' where id = 'c3ee249c-745f-4b46-bfa3-412591aadaca';

-- /interviewquestions (Produit, tech & compétences) : « poste »
update public.prompt_questions set choices = '["Poste joint", "Offre d’emploi collée", "Poste décrit oralement", "Autre"]'::jsonb, default_value = 'Poste joint' where id = '113ade10-9314-48e2-978d-d491e374adfc';

-- /interviewquestions (Produit, tech & compétences) : « criteres »
update public.prompt_questions set choices = '["Compétences techniques", "Aptitudes comportementales", "Expérience passée", "Autre"]'::jsonb, default_value = 'Compétences techniques' where id = '0037668f-a01f-46eb-8b8b-a2884a818a8c';

-- /jobpost (Produit, tech & compétences) : « poste »
update public.prompt_questions set choices = '["Poste déjà décrit", "Fiche de poste jointe", "Missions listées", "Autre"]'::jsonb, default_value = 'Poste déjà décrit' where id = '7ecad4e9-1cea-4608-add0-2885dd29d9f8';

-- /jobpost (Produit, tech & compétences) : « entreprise »
update public.prompt_questions set choices = '["Nom et secteur précisés", "Description jointe", "Site web fourni", "Autre"]'::jsonb, default_value = 'Nom et secteur précisés' where id = 'a7420f8f-e5de-4dbc-afba-0b09fba69caf';

-- /learningpath (Produit, tech & compétences) : « competence »
update public.prompt_questions set choices = '["Compétence déjà précisée", "Objectif professionnel décrit", "Domaine à explorer largement", "Autre"]'::jsonb, default_value = 'Compétence déjà précisée' where id = 'abce4128-101b-4c36-b376-bb0b16d061c4';

-- /learningpath (Produit, tech & compétences) : « niveau »
update public.prompt_questions set choices = '["Débutant", "Intermédiaire", "Avancé", "Autre"]'::jsonb, default_value = 'Débutant' where id = '63f61e22-3c0d-4c83-9c64-7fc5c7e3a6ed';

-- /lessonplan (Produit, tech & compétences) : « niveau »
update public.prompt_questions set choices = '["Niveau scolaire précisé", "Niveau professionnel précisé", "Grand public", "Autre"]'::jsonb, default_value = 'Niveau scolaire précisé' where id = '2454cd77-670c-453d-893a-ffd652623034';

-- /onboardingcopy (Produit, tech & compétences) : « etapes »
update public.prompt_questions set choices = '["Étapes déjà listées", "Parcours existant à revoir", "À définir à partir du produit", "Autre"]'::jsonb, default_value = 'Étapes déjà listées' where id = '5df3d412-9d79-4f33-931c-bffd19c9dbdf';

-- /portfolio (Produit, tech & compétences) : « projet »
update public.prompt_questions set choices = '["Projet déjà décrit", "Réalisation existante à présenter", "Idée encore à cadrer", "Autre"]'::jsonb, default_value = 'Projet déjà décrit' where id = '6519197a-c2d7-4d91-82e6-050dcea4f9d5';

-- /practicecase (Produit, tech & compétences) : « niveau »
update public.prompt_questions set choices = '["Débutant", "Intermédiaire", "Avancé", "Autre"]'::jsonb, default_value = 'Intermédiaire' where id = 'bd7f5e04-0bd3-4e7d-ad05-cff5fa8ed1fe';

-- /quiz (Produit, tech & compétences) : « niveau »
update public.prompt_questions set choices = '["Débutant", "Intermédiaire", "Avancé", "Autre"]'::jsonb, default_value = 'Intermédiaire' where id = 'f854d128-ba90-4df0-8f5b-762546e0aa63';

-- /releasenotes (Produit, tech & compétences) : « changements »
update public.prompt_questions set choices = '["Liste de changements jointe", "Notes de développement collées", "Changements décrits", "Autre"]'::jsonb, default_value = 'Liste de changements jointe' where id = 'b7fe87e4-cd93-43b1-9502-87b3c925c339';

-- /rubric (Produit, tech & compétences) : « travail »
update public.prompt_questions set choices = '["Travail déjà réalisé décrit", "Livrable joint", "À évaluer sur place", "Autre"]'::jsonb, default_value = 'Travail déjà réalisé décrit' where id = 'e139e4b4-2811-4437-b1a2-a58faaf20b8f';

-- /rubric (Produit, tech & compétences) : « criteres »
update public.prompt_questions set choices = '["Qualité et précision", "Respect des consignes", "Créativité et originalité", "Autre"]'::jsonb, default_value = 'Qualité et précision' where id = 'c0357683-7482-4024-9ad0-a19b294ecb2f';

-- /skillgap (Produit, tech & compétences) : « profil »
update public.prompt_questions set choices = '["Profil déjà décrit", "CV joint", "Poste visé précisé", "Autre"]'::jsonb, default_value = 'Profil déjà décrit' where id = 'de437d39-8bfc-4bc7-a220-6102cd15d7ac';

-- /sqlhelp (Produit, tech & compétences) : « schéma »
update public.prompt_questions set choices = '["Schéma joint", "Tables décrites", "Nom des colonnes fourni", "Autre"]'::jsonb, default_value = 'Schéma joint' where id = 'ea8e9850-071f-4e88-a0ef-a099b7aca5c0';

-- /story (Produit, tech & compétences) : « idee »
update public.prompt_questions set choices = '["Idée déjà rédigée", "Thème à explorer", "Personnages et lieu précisés", "Autre"]'::jsonb, default_value = 'Idée déjà rédigée' where id = 'e8affa48-a1cb-4150-87c4-1337b04a8d7c';

-- /story (Produit, tech & compétences) : « genre »
update public.prompt_questions set choices = '["Comédie", "Drame", "Suspense ou thriller", "Autre"]'::jsonb, default_value = 'Drame' where id = 'af10f934-d716-4f0d-bb29-b6410a3bb8a4';

-- /studynotes (Produit, tech & compétences) : « niveau »
update public.prompt_questions set choices = '["Niveau scolaire précisé", "Niveau professionnel précisé", "Grand public", "Autre"]'::jsonb, default_value = 'Niveau scolaire précisé' where id = '3a03b078-68a6-44df-b9a5-db9a7aad8bb3';

-- /supportreply (Produit, tech & compétences) : « demande »
update public.prompt_questions set choices = '["Message client joint", "Demande décrite", "Ticket collé", "Autre"]'::jsonb, default_value = 'Message client joint' where id = '8b412a23-526a-42d2-bdbc-83575341f172';

-- /supportreply (Produit, tech & compétences) : « contexte »
update public.prompt_questions set choices = '["Historique client joint", "Produit ou service concerné précisé", "Premier contact, sans historique", "Autre"]'::jsonb, default_value = 'Produit ou service concerné précisé' where id = 'e0a22146-6533-433e-acb0-7c9873dba2ad';

-- /userstories (Produit, tech & compétences) : « besoins »
update public.prompt_questions set choices = '["Besoins déjà listés", "Backlog joint", "Besoin unique décrit", "Autre"]'::jsonb, default_value = 'Besoins déjà listés' where id = '9abd2c14-2f1b-425e-9265-771ed40168fc';

-- /uxmicrocopy (Produit, tech & compétences) : « ecran »
update public.prompt_questions set choices = '["Écran déjà décrit", "Capture jointe", "Contexte d’usage précisé", "Autre"]'::jsonb, default_value = 'Écran déjà décrit' where id = '2d6dc378-2124-433e-b917-4255f6274de2';

-- /uxmicrocopy (Produit, tech & compétences) : « action »
update public.prompt_questions set choices = '["Action déjà identifiée", "Erreur ou message à écrire", "Confirmation à écrire", "Autre"]'::jsonb, default_value = 'Action déjà identifiée' where id = 'c279f56e-e538-4c5b-bcbe-4db5cc3e9b6b';

-- /businessmodel (Stratégie & business) : « activité »
update public.prompt_questions set choices = '["Activité déjà décrite", "Idée encore à cadrer", "Modèle existant à revoir", "Autre"]'::jsonb, default_value = 'Activité déjà décrite' where id = 'd7ac5702-9676-412c-a31c-ef988c95dd16';

-- /businessplan (Stratégie & business) : « projet »
update public.prompt_questions set choices = '["Projet déjà décrit", "Marché et offre précisés", "Idée encore à cadrer", "Autre"]'::jsonb, default_value = 'Projet déjà décrit' where id = '02c736a9-5b8a-4cff-93c3-ce1d43c31827';

-- /franchisebrief (Stratégie & business) : « concept »
update public.prompt_questions set choices = '["Concept déjà décrit", "Marque existante à décliner", "Idée encore à cadrer", "Autre"]'::jsonb, default_value = 'Concept déjà décrit' where id = '52e3f590-8230-48ad-97ba-62da4234e086';

-- /franchisebrief (Stratégie & business) : « marché »
update public.prompt_questions set choices = '["Marché déjà défini", "Zone géographique précisée", "Concurrents connus fournis", "Autre"]'::jsonb, default_value = 'Marché déjà défini' where id = '724600a1-1a1f-43e4-a7c0-d9588c820dcb';

-- /goalsystem (Stratégie & business) : « ambition »
update public.prompt_questions set choices = '["Ambition déjà formulée", "Vision à long terme décrite", "À faire émerger ensemble", "Autre"]'::jsonb, default_value = 'Ambition déjà formulée' where id = '09b752c8-be2a-4c38-a09b-64fcd8c6d86a';

-- /gtmplan (Stratégie & business) : « marche »
update public.prompt_questions set choices = '["Marché déjà défini", "Segment cible précisé", "À délimiter ensemble", "Autre"]'::jsonb, default_value = 'Marché déjà défini' where id = '145514d7-d8c6-480d-836e-4390c3d92c59';

-- /partnerpitch (Stratégie & business) : « projet »
update public.prompt_questions set choices = '["Projet déjà décrit", "Partenariat envisagé précisé", "Idée encore à cadrer", "Autre"]'::jsonb, default_value = 'Projet déjà décrit' where id = '11a37105-140f-4bec-a886-43b4c6dff752';

-- /partnerpitch (Stratégie & business) : « partenaire »
update public.prompt_questions set choices = '["Partenaire déjà identifié", "Type de partenaire recherché", "Plusieurs pistes à comparer", "Autre"]'::jsonb, default_value = 'Partenaire déjà identifié' where id = '46a30981-17dc-4b1b-8645-11a4a1414478';

-- /pitchdecktext (Stratégie & business) : « projet »
update public.prompt_questions set choices = '["Projet déjà décrit", "Deck existant à reprendre", "Idée encore à cadrer", "Autre"]'::jsonb, default_value = 'Projet déjà décrit' where id = 'b5730785-3c4b-466d-818d-ca48a5a91f9e';

-- /salespage (Stratégie & business) : « preuve »
update public.prompt_questions set choices = '["Preuves déjà réunies", "Témoignages clients fournis", "Chiffres ou résultats fournis", "Autre"]'::jsonb, default_value = 'Preuves déjà réunies' where id = '6fdfc813-26e1-4518-9ecb-e63fc2c561a9';

-- /briefcreative (Travail & organisation) : « support »
update public.prompt_questions set choices = '["Visuel à concevoir", "Texte à rédiger", "Vidéo à produire", "Autre"]'::jsonb, default_value = 'Visuel à concevoir' where id = '4e2cd619-536a-4845-afc6-bdfd4f489646';

-- /changeplan (Travail & organisation) : « changement »
update public.prompt_questions set choices = '["Changement déjà décidé", "Réorganisation en cours", "Nouvel outil ou process", "Autre"]'::jsonb, default_value = 'Changement déjà décidé' where id = 'fb4a6bf0-79bd-4eb1-b57c-b5b8b2cb3495';

-- /decisionlog (Travail & organisation) : « projet »
update public.prompt_questions set choices = '["Projet en cours", "Décision déjà prise à documenter", "Décision à venir", "Autre"]'::jsonb, default_value = 'Projet en cours' where id = 'ea4691d8-1ff0-485c-b76a-cfe209cc8d9e';

-- /delegationbrief (Travail & organisation) : « mission »
update public.prompt_questions set choices = '["Mission déjà décrite", "Objectif attendu précisé", "À cadrer ensemble", "Autre"]'::jsonb, default_value = 'Mission déjà décrite' where id = '2f3864fb-22ca-4241-9866-bd783eb19fc6';

-- /delegationbrief (Travail & organisation) : « responsable »
update public.prompt_questions set choices = '["Personne déjà identifiée", "Profil recherché décrit", "Équipe à qui déléguer", "Autre"]'::jsonb, default_value = 'Personne déjà identifiée' where id = 'f3818bb1-314e-4f8a-9ed0-bd07a1649db1';

-- /handover (Travail & organisation) : « role »
update public.prompt_questions set choices = '["Poste déjà décrit", "Missions listées", "Successeur déjà identifié", "Autre"]'::jsonb, default_value = 'Poste déjà décrit' where id = '13f80478-a0c6-4f4e-86f0-c485ad13f815';

-- /legalplain (Travail & organisation) : « texte »
update public.prompt_questions set choices = '["Texte joint", "Texte collé", "Document juridique à résumer", "Autre"]'::jsonb, default_value = 'Texte joint' where id = '746f11db-ce19-4283-8939-398768fd7833';

-- /meetingagenda (Travail & organisation) : « participants »
update public.prompt_questions set choices = '["Liste de participants fournie", "Équipe déjà connue", "Participants externes inclus", "Autre"]'::jsonb, default_value = 'Liste de participants fournie' where id = 'd73f21cd-97f2-4073-a653-d15f0e42e7a4';

-- /oneonone (Travail & organisation) : « contexte »
update public.prompt_questions set choices = '["Suivi précédent joint", "Situation actuelle décrite", "Premier entretien, sans historique", "Autre"]'::jsonb, default_value = 'Situation actuelle décrite' where id = 'c088bc39-ff4e-41dd-bf0a-7befb98a7b71';

-- /policycopy (Travail & organisation) : « service »
update public.prompt_questions set choices = '["Service déjà décrit", "Règles internes fournies", "À formaliser ensemble", "Autre"]'::jsonb, default_value = 'Service déjà décrit' where id = 'd600fd1e-c1ba-4c3b-9bb5-9d7fc4af5911';

-- /projectbrief (Travail & organisation) : « demande »
update public.prompt_questions set choices = '["Demande déjà formulée", "Besoin décrit oralement", "Cahier des charges joint", "Autre"]'::jsonb, default_value = 'Demande déjà formulée' where id = 'a6b618d5-89a1-4ab4-8758-c8091e3fd1f1';

-- /proposal (Travail & organisation) : « solution »
update public.prompt_questions set choices = '["Solution déjà définie", "Besoin client décrit", "Offre existante à adapter", "Autre"]'::jsonb, default_value = 'Solution déjà définie' where id = '0deb0db9-cd10-42f9-8af8-7f12b61c2033';

-- /raci (Travail & organisation) : « projet »
update public.prompt_questions set choices = '["Projet en cours", "Projet à venir", "Périmètre décrit", "Autre"]'::jsonb, default_value = 'Projet en cours' where id = 'e7f312b0-13b5-4dce-84d5-ae2d071afcb5';

-- /raci (Travail & organisation) : « acteurs »
update public.prompt_questions set choices = '["Liste de personnes fournie", "Équipe déjà connue", "Rôles encore à répartir", "Autre"]'::jsonb, default_value = 'Liste de personnes fournie' where id = '2fa9a04b-2d7c-4a1b-84a4-6f0c74243186';

-- /retrospective (Travail & organisation) : « equipe »
update public.prompt_questions set choices = '["Équipe déjà décrite", "Sprint ou période précisée", "Faits marquants listés", "Autre"]'::jsonb, default_value = 'Équipe déjà décrite' where id = '4c505e2e-c1d2-4421-ae24-388bb09caf72';

-- /riskregister (Travail & organisation) : « projet »
update public.prompt_questions set choices = '["Projet en cours", "Projet à venir", "Risques déjà identifiés", "Autre"]'::jsonb, default_value = 'Projet en cours' where id = '61eb937f-3595-49d8-810e-9cec720cfaec';

-- /sop (Travail & organisation) : « processus »
update public.prompt_questions set choices = '["Processus décrit étape par étape", "Schéma joint", "Rôles et outils précisés", "Autre"]'::jsonb, default_value = 'Processus décrit étape par étape' where id = '0ffa17a2-5631-42de-b9e7-5abad2a42fdd';

-- /statusreport (Travail & organisation) : « projet »
update public.prompt_questions set choices = '["Projet en cours", "Sprint ou période précisée", "Périmètre décrit", "Autre"]'::jsonb, default_value = 'Projet en cours' where id = 'dd867d63-4556-4077-a1be-c2da2ce29b91';

-- /weeklyplan (Travail & organisation) : « contraintes »
update public.prompt_questions set choices = '["Réunions déjà fixées", "Charge de travail connue", "Priorités déjà définies", "Autre"]'::jsonb, default_value = 'Priorités déjà définies' where id = '62d38e72-42f3-4b37-af14-9e3318994426';
commit;
