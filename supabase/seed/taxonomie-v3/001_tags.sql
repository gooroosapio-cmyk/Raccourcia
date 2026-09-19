-- =====================================================================
-- Taxonomie initiale des tags
--
-- Ecrite en clair plutot que produite a la volee : une taxonomie se relit,
-- se corrige en revue, et doit pouvoir etre rejouee a l'identique.
--
-- LES TAGS SONT CREES, JAMAIS APPLIQUES. Les poser sur des commandes est un
-- second geste, qui demande d'examiner chaque commande. Un tag attribue a
-- tort est pire que pas de tag du tout : il promet un resultat qui ne vient
-- pas, et il faut ensuite le retrouver pour le retirer.
--
-- Le nom et le groupe se mettent a jour ; le reste — image, ordre, statut —
-- appartient a l'administration et n'est jamais ecrase. Sans cela, rejouer
-- le lot effacerait les visuels poses a la main.
--
-- 98 tags, 8 groupes.
-- =====================================================================

insert into public.tags (slug, name, groupe, sort_order) values
  ('images', 'Images', 'bibliotheque'::public.tag_group, 1),
  ('textes', 'Textes', 'bibliotheque'::public.tag_group, 2),
  ('reflexions', 'Réflexions', 'bibliotheque'::public.tag_group, 3),
  ('chatgpt', 'ChatGPT', 'ia'::public.tag_group, 4),
  ('claude', 'Claude', 'ia'::public.tag_group, 5),
  ('gemini', 'Gemini', 'ia'::public.tag_group, 6),
  ('portrait', 'Portrait', 'fonction'::public.tag_group, 7),
  ('produit', 'Produit', 'fonction'::public.tag_group, 8),
  ('marketing', 'Marketing', 'fonction'::public.tag_group, 9),
  ('publicite', 'Publicité', 'fonction'::public.tag_group, 10),
  ('technique', 'Technique', 'fonction'::public.tag_group, 11),
  ('pedagogie', 'Pédagogie', 'fonction'::public.tag_group, 12),
  ('retouche', 'Retouche', 'fonction'::public.tag_group, 13),
  ('photographie', 'Photographie', 'fonction'::public.tag_group, 14),
  ('illustration', 'Illustration', 'fonction'::public.tag_group, 15),
  ('montage', 'Montage', 'fonction'::public.tag_group, 16),
  ('design', 'Design', 'fonction'::public.tag_group, 17),
  ('mode', 'Mode', 'fonction'::public.tag_group, 18),
  ('architecture', 'Architecture', 'fonction'::public.tag_group, 19),
  ('decoration', 'Décoration', 'fonction'::public.tag_group, 20),
  ('identite-visuelle', 'Identité visuelle', 'fonction'::public.tag_group, 21),
  ('infographie', 'Infographie', 'fonction'::public.tag_group, 22),
  ('dessin', 'Dessin', 'fonction'::public.tag_group, 23),
  ('logo', 'Logo', 'fonction'::public.tag_group, 24),
  ('realiste', 'Réaliste', 'style'::public.tag_group, 25),
  ('photorealiste', 'Photoréaliste', 'style'::public.tag_group, 26),
  ('cinematographique', 'Cinématographique', 'style'::public.tag_group, 27),
  ('editorial', 'Éditorial', 'style'::public.tag_group, 28),
  ('minimaliste', 'Minimaliste', 'style'::public.tag_group, 29),
  ('luxueux', 'Luxueux', 'style'::public.tag_group, 30),
  ('fantastique', 'Fantastique', 'style'::public.tag_group, 31),
  ('surrealiste', 'Surréaliste', 'style'::public.tag_group, 32),
  ('anime', 'Anime', 'style'::public.tag_group, 33),
  ('manga', 'Manga', 'style'::public.tag_group, 34),
  ('cartoon', 'Cartoon', 'style'::public.tag_group, 35),
  ('vintage', 'Vintage', 'style'::public.tag_group, 36),
  ('retro', 'Rétro', 'style'::public.tag_group, 37),
  ('futuriste', 'Futuriste', 'style'::public.tag_group, 38),
  ('3d', '3D', 'style'::public.tag_group, 39),
  ('isometrique', 'Isométrique', 'style'::public.tag_group, 40),
  ('artistique', 'Artistique', 'style'::public.tag_group, 41),
  ('documentaire', 'Documentaire', 'style'::public.tag_group, 42),
  ('afrique', 'Afrique', 'contexte'::public.tag_group, 43),
  ('cote-divoire', 'Côte d’Ivoire', 'contexte'::public.tag_group, 44),
  ('abidjan', 'Abidjan', 'contexte'::public.tag_group, 45),
  ('afrique-de-louest', 'Afrique de l’Ouest', 'contexte'::public.tag_group, 46),
  ('asie', 'Asie', 'contexte'::public.tag_group, 47),
  ('europe', 'Europe', 'contexte'::public.tag_group, 48),
  ('ameriques', 'Amériques', 'contexte'::public.tag_group, 49),
  ('tradition', 'Tradition', 'contexte'::public.tag_group, 50),
  ('culture', 'Culture', 'contexte'::public.tag_group, 51),
  ('epoque', 'Époque', 'contexte'::public.tag_group, 52),
  ('celebration', 'Célébration', 'contexte'::public.tag_group, 53),
  ('voyage', 'Voyage', 'contexte'::public.tag_group, 54),
  ('mariage', 'Mariage', 'contexte'::public.tag_group, 55),
  ('anniversaire', 'Anniversaire', 'contexte'::public.tag_group, 56),
  ('noel', 'Noël', 'contexte'::public.tag_group, 57),
  ('halloween', 'Halloween', 'contexte'::public.tag_group, 58),
  ('entreprise', 'Entreprise', 'usage'::public.tag_group, 59),
  ('entrepreneuriat', 'Entrepreneuriat', 'usage'::public.tag_group, 60),
  ('vente', 'Vente', 'usage'::public.tag_group, 61),
  ('communication', 'Communication', 'usage'::public.tag_group, 62),
  ('comptabilite', 'Comptabilité', 'usage'::public.tag_group, 63),
  ('finance', 'Finance', 'usage'::public.tag_group, 64),
  ('gestion-de-projet', 'Gestion de projet', 'usage'::public.tag_group, 65),
  ('developpement', 'Développement', 'usage'::public.tag_group, 66),
  ('recherche', 'Recherche', 'usage'::public.tag_group, 67),
  ('formation', 'Formation', 'usage'::public.tag_group, 68),
  ('education', 'Éducation', 'usage'::public.tag_group, 69),
  ('ressources-humaines', 'Ressources humaines', 'usage'::public.tag_group, 70),
  ('juridique', 'Juridique', 'usage'::public.tag_group, 71),
  ('administration', 'Administration', 'usage'::public.tag_group, 72),
  ('productivite', 'Productivité', 'usage'::public.tag_group, 73),
  ('creation-de-contenu', 'Création de contenu', 'usage'::public.tag_group, 74),
  ('photo', 'Photo', 'resultat'::public.tag_group, 75),
  ('image', 'Image', 'resultat'::public.tag_group, 76),
  ('texte', 'Texte', 'resultat'::public.tag_group, 77),
  ('document', 'Document', 'resultat'::public.tag_group, 78),
  ('pdf', 'PDF', 'resultat'::public.tag_group, 79),
  ('presentation', 'Présentation', 'resultat'::public.tag_group, 80),
  ('tableau', 'Tableau', 'resultat'::public.tag_group, 81),
  ('schema', 'Schéma', 'resultat'::public.tag_group, 82),
  ('contrat', 'Contrat', 'resultat'::public.tag_group, 83),
  ('rapport', 'Rapport', 'resultat'::public.tag_group, 84),
  ('plan', 'Plan', 'resultat'::public.tag_group, 85),
  ('simulation', 'Simulation', 'resultat'::public.tag_group, 86),
  ('jeu', 'Jeu', 'resultat'::public.tag_group, 87),
  ('conversation', 'Conversation', 'resultat'::public.tag_group, 88),
  ('analyse', 'Analyse', 'resultat'::public.tag_group, 89),
  ('transformation', 'Transformation', 'experience'::public.tag_group, 90),
  ('creation', 'Création', 'experience'::public.tag_group, 91),
  ('amelioration', 'Amélioration', 'experience'::public.tag_group, 92),
  ('personnalisation', 'Personnalisation', 'experience'::public.tag_group, 93),
  ('immersion', 'Immersion', 'experience'::public.tag_group, 94),
  ('simulation-experience', 'Simulation', 'experience'::public.tag_group, 95),
  ('interaction', 'Interaction', 'experience'::public.tag_group, 96),
  ('apprentissage', 'Apprentissage', 'experience'::public.tag_group, 97),
  ('divertissement', 'Divertissement', 'experience'::public.tag_group, 98)
on conflict (slug) do update
set name = excluded.name,
    groupe = excluded.groupe,
    updated_at = now();

do $rapport$
declare
  v_n integer;
  v_g integer;
begin
  select count(*), count(distinct groupe) into v_n, v_g from public.tags;
  raise notice 'Taxonomie : % tags dans % groupes.', v_n, v_g;
end $rapport$;
