-- =====================================================================
-- Taxonomie V2 : 27 categories, 73 collections
--
-- Genere par scripts/generer-catalogue-v2.mjs. Ne pas modifier a la main :
-- la source est le CSV du catalogue V2, et une correction faite ici
-- disparaitrait a la prochaine generation.
-- =====================================================================

begin;

create temporary table lot_v2_taxonomie (
  ref text, slug text, nom text, parent_ref text, mode text, ordre integer
) on commit drop;

insert into lot_v2_taxonomie (ref, slug, nom, parent_ref, mode, ordre) values
  ('V2CAT-f24fd0b5-279b-5a41-b225-1e10f8dc58e8', 'epoques', 'Époques', null, 'image', 1),
  ('V2CAT-7c6a609f-bef0-599f-9f65-5fc802df29b3', 'cultures-et-patrimoines', 'Cultures et patrimoines', null, 'image', 2),
  ('V2CAT-0efa8cbc-3deb-5aa0-82bd-870b40c6bcfc', 'celebrations-et-souvenirs', 'Célébrations et souvenirs', null, 'image', 3),
  ('V2CAT-a64721f9-819d-576d-8fd2-6154b70e8afb', 'voyages-et-destinations', 'Voyages et destinations', null, 'image', 4),
  ('V2CAT-fc29fe15-449c-5b1d-bc10-c20854779e85', 'beaute-mode-et-identite', 'Beauté, mode et identité', null, 'image', 5),
  ('V2CAT-35981e8d-ffdb-537a-bd5a-13c997a753c2', 'portraits-et-photographie', 'Portraits et photographie', null, 'image', 6),
  ('V2CAT-63aca6de-676e-5c23-96e4-0f983b3327f8', 'humour-et-scenes-virales', 'Humour et scènes virales', null, 'image', 7),
  ('V2CAT-20025de7-bffb-54fd-a5d6-dedb42b72bec', 'edition-et-couvertures', 'Édition et couvertures', null, 'image', 8),
  ('V2CAT-3d5e70ca-be6a-50c5-a08b-bddcaf23e3e5', 'arts-et-styles-visuels', 'Arts et styles visuels', null, 'image', 9),
  ('V2CAT-8ba00a6e-9e84-505b-bd83-c63c86aefc64', 'effets-et-photomontages', 'Effets et photomontages', null, 'image', 10),
  ('V2CAT-fbd03895-4446-5a1d-bec6-e9c298ef2e50', 'dessin-ecriture-et-plans', 'Dessin, écriture et plans', null, 'image', 11),
  ('V2CAT-a865a414-bdf1-5cec-bc20-adce57903c56', 'mondes-imaginaires', 'Mondes imaginaires', null, 'image', 12),
  ('V2CAT-d3f30fe4-db07-523d-87fc-7bc2c680eae4', 'produits-et-e-commerce', 'Produits et e-commerce', null, 'image', 13),
  ('V2CAT-9a99a96d-5bcb-5cfd-b4ef-baa28f01821a', 'marketing-et-marque', 'Marketing et marque', null, 'image', 14),
  ('V2CAT-ca98b44e-8d9b-55b8-8485-a4c5dc38e64f', 'affiches-et-posters', 'Affiches et posters', null, 'image', 15),
  ('V2CAT-9665ef96-a819-59d0-b823-551ccbb90644', 'pedagogie-et-visualisation', 'Pédagogie et visualisation', null, 'image', 16),
  ('V2CAT-f39a4eca-0fbf-53a0-a6d7-dcf69a67e9c1', 'espaces-et-architecture', 'Espaces et architecture', null, 'image', 17),
  ('V2CAT-ded5ded8-d063-5e98-bcc6-8919d0acb874', 'fonds-et-formats-personnels', 'Fonds et formats personnels', null, 'image', 18),
  ('V2CAT-36fd1e51-557d-582e-b6a1-56c2435939af', 'experimental-et-a-classer', 'Expérimental et à classer', null, 'image', 19),
  ('V2CAT-b5c1a9af-f071-50cf-84a3-f9dc3e646793', 'synthetiser', 'Synthétiser', null, 'texte', 1),
  ('V2CAT-8a474f7f-e478-5c24-a125-d84bcf32c299', 'analyser-et-evaluer', 'Analyser et évaluer', null, 'texte', 2),
  ('V2CAT-577cc624-f025-514a-b38f-4625200ffdbf', 'produire-un-contenu', 'Produire un contenu', null, 'texte', 3),
  ('V2CAT-6d22ceae-cdc4-5ea6-b0fd-2407272429f5', 'transformer-un-contenu', 'Transformer un contenu', null, 'texte', 4),
  ('V2CAT-c5f63e07-eb1c-5ebc-b1de-44162c9ff98a', 'assistants-professionnels', 'Assistants professionnels', null, 'texte', 1),
  ('V2CAT-3239d6a4-6104-5444-bde5-3f2754913427', 'modes-de-reflexion', 'Modes de réflexion', null, 'texte', 2),
  ('V2CAT-8221378a-581b-5359-8967-66d8f2cd835e', 'personnages-immersifs', 'Personnages immersifs', null, 'texte', 3),
  ('V2CAT-25560c4d-56a0-5750-a1cd-c217c9d0d5d9', 'jeux-et-simulations', 'Jeux et simulations', null, 'texte', 4),
  ('V2COL-b81203d4-30bd-5284-bd57-429f0a2f34e3', 'photographie-du-xxe-siecle', 'Photographie du XXe siècle', 'V2CAT-f24fd0b5-279b-5a41-b225-1e10f8dc58e8', 'image', 1),
  ('V2COL-586fbd30-2f71-5b03-aea1-6d635a318459', 'antiquite-et-royaumes', 'Antiquité et royaumes', 'V2CAT-f24fd0b5-279b-5a41-b225-1e10f8dc58e8', 'image', 2),
  ('V2COL-86b8c739-d6dc-5239-be3b-cbe76968f456', 'contemporain-et-futurs', 'Contemporain et futurs', 'V2CAT-f24fd0b5-279b-5a41-b225-1e10f8dc58e8', 'image', 3),
  ('V2COL-fecf90c9-af30-567b-9b3e-df8bf45892be', 'du-moyen-age-au-xixe-siecle', 'Du Moyen Âge au XIXe siècle', 'V2CAT-f24fd0b5-279b-5a41-b225-1e10f8dc58e8', 'image', 4),
  ('V2COL-cae2b05e-e227-534f-ac77-4c36621e0344', 'patrimoines-africains', 'Patrimoines africains', 'V2CAT-7c6a609f-bef0-599f-9f65-5fc802df29b3', 'image', 5),
  ('V2COL-3f35b573-a7d0-50eb-881a-c1486d2c66f4', 'europe-ameriques-et-oceanie', 'Europe, Amériques et Océanie', 'V2CAT-7c6a609f-bef0-599f-9f65-5fc802df29b3', 'image', 6),
  ('V2COL-6af156bf-fb53-526f-9be3-17b577cf6b12', 'asies-et-moyen-orient', 'Asies et Moyen-Orient', 'V2CAT-7c6a609f-bef0-599f-9f65-5fc802df29b3', 'image', 7),
  ('V2COL-f17550e9-831a-5745-b5be-93db8c98bbf4', 'etapes-de-vie', 'Étapes de vie', 'V2CAT-0efa8cbc-3deb-5aa0-82bd-870b40c6bcfc', 'image', 8),
  ('V2COL-aaf61b05-9fbe-5670-9a45-bd0bf1a215ce', 'union-et-famille', 'Union et famille', 'V2CAT-0efa8cbc-3deb-5aa0-82bd-870b40c6bcfc', 'image', 9),
  ('V2COL-5c46a2c0-8eb2-52f0-8d7e-a8785677edb6', 'fetes-et-calendrier', 'Fêtes et calendrier', 'V2CAT-0efa8cbc-3deb-5aa0-82bd-870b40c6bcfc', 'image', 10),
  ('V2COL-4d30d620-14e2-5abd-b9ca-0a748f78c29f', 'destinations-du-monde', 'Destinations du monde', 'V2CAT-a64721f9-819d-576d-8fd2-6154b70e8afb', 'image', 11),
  ('V2COL-d445669b-7616-5928-9e39-376a1b423f42', 'nature-et-aventure', 'Nature et aventure', 'V2CAT-a64721f9-819d-576d-8fd2-6154b70e8afb', 'image', 12),
  ('V2COL-28840ab3-65ca-51b8-9c01-2c468b070e11', 'evasion-et-prestige', 'Évasion et prestige', 'V2CAT-a64721f9-819d-576d-8fd2-6154b70e8afb', 'image', 13),
  ('V2COL-c4c7c695-b2e1-58af-972d-f73d40e27855', 'style-et-essayage', 'Style et essayage', 'V2CAT-fc29fe15-449c-5b1d-bc10-c20854779e85', 'image', 14),
  ('V2COL-80a2fd87-af13-5909-b36e-acdffdc5a1fe', 'beaute-et-coiffure', 'Beauté et coiffure', 'V2CAT-fc29fe15-449c-5b1d-bc10-c20854779e85', 'image', 15),
  ('V2COL-c3ea925f-5392-553d-9a47-4cde1cc033d1', 'transformation-et-identite', 'Transformation et identité', 'V2CAT-fc29fe15-449c-5b1d-bc10-c20854779e85', 'image', 16),
  ('V2COL-986b0508-03b8-5802-a76a-7255d6cb120a', 'portrait-et-editorial', 'Portrait et éditorial', 'V2CAT-35981e8d-ffdb-537a-bd5a-13c997a753c2', 'image', 17),
  ('V2COL-a53be03e-bd8f-5083-8188-ee9cd2b04693', 'liens-et-souvenirs', 'Liens et souvenirs', 'V2CAT-35981e8d-ffdb-537a-bd5a-13c997a753c2', 'image', 18),
  ('V2COL-87005ae5-97b0-5444-80cc-053be68ce2c4', 'objets-et-metamorphoses', 'Objets et métamorphoses', 'V2CAT-63aca6de-676e-5c23-96e4-0f983b3327f8', 'image', 19),
  ('V2COL-5a1fe615-8faa-5265-ba44-b63a8f3faf40', 'scenes-et-detournements', 'Scènes et détournements', 'V2CAT-63aca6de-676e-5c23-96e4-0f983b3327f8', 'image', 20),
  ('V2COL-01a5fc90-7ea3-58b6-92e7-b76c86582e62', 'livres-et-divertissement', 'Livres et divertissement', 'V2CAT-20025de7-bffb-54fd-a5d6-dedb42b72bec', 'image', 21),
  ('V2COL-fb681b3d-c51e-58ad-9ac1-48fbfe0e5a4f', 'presse-et-magazines', 'Presse et magazines', 'V2CAT-20025de7-bffb-54fd-a5d6-dedb42b72bec', 'image', 22),
  ('V2COL-56dc364a-8014-5a1d-a516-7a291f4d7883', 'graphisme-contemporain', 'Graphisme contemporain', 'V2CAT-3d5e70ca-be6a-50c5-a08b-bddcaf23e3e5', 'image', 23),
  ('V2COL-4c1370de-aed6-5e8d-b135-a057c6a040bd', 'peinture-et-grands-maitres', 'Peinture et grands maîtres', 'V2CAT-3d5e70ca-be6a-50c5-a08b-bddcaf23e3e5', 'image', 24),
  ('V2COL-306b9d70-a383-5755-89ad-4e44685a4a24', 'matieres-et-patrimoine', 'Matières et patrimoine', 'V2CAT-3d5e70ca-be6a-50c5-a08b-bddcaf23e3e5', 'image', 25),
  ('V2COL-f7efbc4b-52c9-5792-a9da-7a3804bdbfa7', 'compositing-et-decors', 'Compositing et décors', 'V2CAT-8ba00a6e-9e84-505b-bd83-c63c86aefc64', 'image', 26),
  ('V2COL-4819be62-a936-57df-8392-216bcec44e76', 'lumiere-et-optique', 'Lumière et optique', 'V2CAT-8ba00a6e-9e84-505b-bd83-c63c86aefc64', 'image', 27),
  ('V2COL-c0fd11ae-3455-5028-9229-bec7f2fa5704', 'matieres-et-metamorphoses', 'Matières et métamorphoses', 'V2CAT-8ba00a6e-9e84-505b-bd83-c63c86aefc64', 'image', 28),
  ('V2COL-16a0212e-82e8-5f24-ac90-0bdcb283ccb1', 'temps-et-mouvement', 'Temps et mouvement', 'V2CAT-8ba00a6e-9e84-505b-bd83-c63c86aefc64', 'image', 29),
  ('V2COL-6824ee88-8ef5-5646-abcd-b5000871f3c6', 'narration-dessinee', 'Narration dessinée', 'V2CAT-fbd03895-4446-5a1d-bec6-e9c298ef2e50', 'image', 30),
  ('V2COL-70ffec69-ea10-5971-83ce-6aa709c64251', 'plans-et-documentation', 'Plans et documentation', 'V2CAT-fbd03895-4446-5a1d-bec6-e9c298ef2e50', 'image', 31),
  ('V2COL-0b916dca-29ac-5346-b19e-4c97cd524e69', 'dessin-et-ecriture', 'Dessin et écriture', 'V2CAT-fbd03895-4446-5a1d-bec6-e9c298ef2e50', 'image', 32),
  ('V2COL-52c537c0-7a79-511b-aa97-1f0bcfec67e3', 'animation-et-creatures', 'Animation et créatures', 'V2CAT-a865a414-bdf1-5cec-bc20-adce57903c56', 'image', 33),
  ('V2COL-c6e66902-70d2-5b8b-b5e1-53bd34d243cc', 'fantasy-et-uchronies', 'Fantasy et uchronies', 'V2CAT-a865a414-bdf1-5cec-bc20-adce57903c56', 'image', 34),
  ('V2COL-742d055d-9b18-5612-8df9-9e02019b2903', 'cinema-et-pop-culture', 'Cinéma et pop culture', 'V2CAT-a865a414-bdf1-5cec-bc20-adce57903c56', 'image', 35),
  ('V2COL-eb95bbab-cd23-5eb7-a817-07a1a7a5a8d4', 'univers-de-consommation', 'Univers de consommation', 'V2CAT-d3f30fe4-db07-523d-87fc-7bc2c680eae4', 'image', 36),
  ('V2COL-c512e077-a8e8-5996-8674-d0b657314797', 'presentation-produit', 'Présentation produit', 'V2CAT-d3f30fe4-db07-523d-87fc-7bc2c680eae4', 'image', 37),
  ('V2COL-e0b29aef-5ea8-5815-8218-c3526536edbc', 'campagnes-et-acquisition', 'Campagnes et acquisition', 'V2CAT-9a99a96d-5bcb-5cfd-b4ef-baa28f01821a', 'image', 38),
  ('V2COL-1b8aa891-da3a-56c1-af9b-34a5e9f7f362', 'identite-et-direction-artistique', 'Identité et direction artistique', 'V2CAT-9a99a96d-5bcb-5cfd-b4ef-baa28f01821a', 'image', 39),
  ('V2COL-54430d0f-5d94-5771-80ad-fb3a050e1d17', 'evenements-et-spectacles', 'Événements et spectacles', 'V2CAT-ca98b44e-8d9b-55b8-8485-a4c5dc38e64f', 'image', 40),
  ('V2COL-6e817aa2-da31-5f52-8135-63cb8ddd369c', 'creation-decorative', 'Création décorative', 'V2CAT-ca98b44e-8d9b-55b8-8485-a4c5dc38e64f', 'image', 41),
  ('V2COL-a2aab0ae-3533-5b53-92ce-a5750752c48e', 'sciences-et-technique', 'Sciences et technique', 'V2CAT-9665ef96-a819-59d0-b823-551ccbb90644', 'image', 42),
  ('V2COL-256bd8d6-7f9d-5304-b8ee-3a6863af0232', 'comprendre-et-comparer', 'Comprendre et comparer', 'V2CAT-9665ef96-a819-59d0-b823-551ccbb90644', 'image', 43),
  ('V2COL-baafcb5a-f209-5882-9e10-68f375543e64', 'espaces-professionnels', 'Espaces professionnels', 'V2CAT-f39a4eca-0fbf-53a0-a6d7-dcf69a67e9c1', 'image', 44),
  ('V2COL-74b5bf22-4888-5776-87e1-c7b602c712f4', 'architecture-et-urbanisme', 'Architecture et urbanisme', 'V2CAT-f39a4eca-0fbf-53a0-a6d7-dcf69a67e9c1', 'image', 45),
  ('V2COL-023827de-dddd-55c1-a0be-1f665c8bbebb', 'habitat-et-exterieur', 'Habitat et extérieur', 'V2CAT-f39a4eca-0fbf-53a0-a6d7-dcf69a67e9c1', 'image', 46),
  ('V2COL-872cd421-655b-563f-8b5d-901126cba9bf', 'univers-personnels', 'Univers personnels', 'V2CAT-ded5ded8-d063-5e98-bcc6-8919d0acb874', 'image', 47),
  ('V2COL-defd41ae-b123-560f-ba2e-0501b15b60b2', 'ecrans-et-interfaces', 'Écrans et interfaces', 'V2CAT-ded5ded8-d063-5e98-bcc6-8919d0acb874', 'image', 48),
  ('V2COL-820e17c1-2135-5079-8dca-25e8d5967828', 'laboratoire-visuel', 'Laboratoire visuel', 'V2CAT-36fd1e51-557d-582e-b6a1-56c2435939af', 'image', 49),
  ('V2COL-a66e2ce4-28a6-59cd-addf-50d2af1ac2d9', 'sources-et-documents', 'Sources et documents', 'V2CAT-b5c1a9af-f071-50cf-84a3-f9dc3e646793', 'texte', 50),
  ('V2COL-bee76d05-89d2-5fa1-8400-b72a54aa0e57', 'decisions-et-reunions', 'Décisions et réunions', 'V2CAT-b5c1a9af-f071-50cf-84a3-f9dc3e646793', 'texte', 51),
  ('V2COL-fc785583-8f2f-57eb-b3e1-74653574f505', 'memorisation-et-revision', 'Mémorisation et révision', 'V2CAT-b5c1a9af-f071-50cf-84a3-f9dc3e646793', 'texte', 52),
  ('V2COL-120afc63-686d-5742-8010-fd944467c462', 'donnees-et-activite', 'Données et activité', 'V2CAT-8a474f7f-e478-5c24-a125-d84bcf32c299', 'texte', 53),
  ('V2COL-e9003e23-36c0-525e-a0f8-c80780b9f75b', 'sources-et-fiabilite', 'Sources et fiabilité', 'V2CAT-8a474f7f-e478-5c24-a125-d84bcf32c299', 'texte', 54),
  ('V2COL-9fc7f838-1fc3-5a21-96e6-14552e4d7dcb', 'conformite-et-droit', 'Conformité et droit', 'V2CAT-8a474f7f-e478-5c24-a125-d84bcf32c299', 'texte', 55),
  ('V2COL-69bddb7c-ca12-5ce1-942b-f1bf3d9c3133', 'documents-et-conformite', 'Documents et conformité', 'V2CAT-577cc624-f025-514a-b38f-4625200ffdbf', 'texte', 56),
  ('V2COL-2f2736eb-d629-5af7-a209-64744635bdbe', 'pilotage-et-transmission', 'Pilotage et transmission', 'V2CAT-577cc624-f025-514a-b38f-4625200ffdbf', 'texte', 57),
  ('V2COL-0d339ec1-2890-5f87-b9d6-ec5d5594f439', 'communication-et-creation', 'Communication et création', 'V2CAT-577cc624-f025-514a-b38f-4625200ffdbf', 'texte', 58),
  ('V2COL-41103167-24f9-5088-9fe5-be7d4c5f4952', 'angle-et-public', 'Angle et public', 'V2CAT-6d22ceae-cdc4-5ea6-b0fd-2407272429f5', 'texte', 59),
  ('V2COL-69f288e9-b4c8-5870-b5a0-e628becce459', 'structure-et-format', 'Structure et format', 'V2CAT-6d22ceae-cdc4-5ea6-b0fd-2407272429f5', 'texte', 60),
  ('V2COL-61bf7689-1aaa-5b32-ad2a-c27c94673e6f', 'langue-et-lisibilite', 'Langue et lisibilité', 'V2CAT-6d22ceae-cdc4-5ea6-b0fd-2407272429f5', 'texte', 61),
  ('V2COL-90a64b60-176f-5261-bf9c-c455a95f1bfa', 'entreprise-et-developpement', 'Entreprise et développement', 'V2CAT-c5f63e07-eb1c-5ebc-b1de-44162c9ff98a', 'texte', 62),
  ('V2COL-b9493eeb-7abf-59a8-9b18-73d783f1bedf', 'expertise-et-metiers', 'Expertise et métiers', 'V2CAT-c5f63e07-eb1c-5ebc-b1de-44162c9ff98a', 'texte', 63),
  ('V2COL-b47e6e5d-a633-52de-b77d-b31024170628', 'organisation-et-execution', 'Organisation et exécution', 'V2CAT-c5f63e07-eb1c-5ebc-b1de-44162c9ff98a', 'texte', 64),
  ('V2COL-0198ef1f-a2e2-545a-ac1c-c1d26955b043', 'explorer-et-apprendre', 'Explorer et apprendre', 'V2CAT-3239d6a4-6104-5444-bde5-3f2754913427', 'texte', 65),
  ('V2COL-332799c8-917b-51c7-8fab-87069cf063a3', 'progresser-et-agir', 'Progresser et agir', 'V2CAT-3239d6a4-6104-5444-bde5-3f2754913427', 'texte', 66),
  ('V2COL-070d4ef7-fdc6-547c-8865-4f22ad8eb8be', 'decider-et-critiquer', 'Décider et critiquer', 'V2CAT-3239d6a4-6104-5444-bde5-3f2754913427', 'texte', 67),
  ('V2COL-2b9e1350-2186-5c4b-896d-70367c003f7e', 'fiction-et-enquete', 'Fiction et enquête', 'V2CAT-8221378a-581b-5359-8967-66d8f2cd835e', 'texte', 68),
  ('V2COL-b9388929-e1b2-5d8f-852a-05767c86e1d6', 'figures-et-idees', 'Figures et idées', 'V2CAT-8221378a-581b-5359-8967-66d8f2cd835e', 'texte', 69),
  ('V2COL-a463d4a7-850e-5d4a-9073-927bcfab3167', 'voix-et-narrateurs', 'Voix et narrateurs', 'V2CAT-8221378a-581b-5359-8967-66d8f2cd835e', 'texte', 70),
  ('V2COL-caf8a40a-8bc9-545f-81e7-667c3956066a', 'enquete-et-aventure', 'Enquête et aventure', 'V2CAT-25560c4d-56a0-5750-a1cd-c217c9d0d5d9', 'texte', 71),
  ('V2COL-9690bb1f-b6c7-5f27-976f-4e3518c0091e', 'quiz-et-defis', 'Quiz et défis', 'V2CAT-25560c4d-56a0-5750-a1cd-c217c9d0d5d9', 'texte', 72),
  ('V2COL-4ea759e3-9c54-54e2-ae9c-9ee14fc65f03', 'simulations-professionnelles', 'Simulations professionnelles', 'V2CAT-25560c4d-56a0-5750-a1cd-c217c9d0d5d9', 'texte', 73);

-- Les categories d'abord : une collection a besoin de sa parente.
--
-- La cle d'upsert est `external_ref`, pas le slug : deux refontes ont
-- deja reutilise un meme slug pour deux rayons differents, et la
-- reference stable est la seule chose qui ne bouge pas.
--
-- Un rayon qui porte le slug visé mais une autre reference est libere de
-- son slug plutot que de faire echouer le lot : il garde ses commandes et
-- son identifiant, il perd seulement une adresse qu'il ne peut pas
-- partager.
update public.categories c
set slug = c.slug || '-avant-v2'
where c.slug in (select slug from lot_v2_taxonomie)
  and (c.external_ref is null or c.external_ref not in (select ref from lot_v2_taxonomie));

insert into public.categories (external_ref, slug, name, mode, sort_order, status)
select l.ref, l.slug, l.nom, l.mode::public.app_mode, l.ordre, 'published'::public.content_status
from lot_v2_taxonomie l
where l.parent_ref is null
-- L'index de `external_ref` est partiel, comme celui des cartes :
-- l'inference doit reprendre sa condition.
on conflict (external_ref) where external_ref is not null do update
set slug = excluded.slug, name = excluded.name, mode = excluded.mode,
    sort_order = excluded.sort_order, updated_at = now();

insert into public.categories (external_ref, slug, name, mode, sort_order, status, parent_id)
select l.ref, l.slug, l.nom, l.mode::public.app_mode, l.ordre,
       'published'::public.content_status, p.id
from lot_v2_taxonomie l
join public.categories p on p.external_ref = l.parent_ref
where l.parent_ref is not null
on conflict (external_ref) where external_ref is not null do update
set slug = excluded.slug, name = excluded.name, mode = excluded.mode,
    sort_order = excluded.sort_order, parent_id = excluded.parent_id, updated_at = now();

do $rapport$
declare v_cat integer; v_col integer;
begin
  select count(*) into v_cat from public.categories where external_ref like 'V2CAT-%';
  select count(*) into v_col from public.categories where external_ref like 'V2COL-%';
  if v_cat <> 27 or v_col <> 73 then
    raise exception 'Taxonomie V2 : % categories et % collections au lieu de 27 et 73.', v_cat, v_col;
  end if;
  raise notice 'Taxonomie V2 : % categories, % collections.', v_cat, v_col;
end $rapport$;

commit;