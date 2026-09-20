-- =====================================================================
-- Referentiel de tags V2 (70 slugs)
--
-- Genere par scripts/generer-catalogue-v2.mjs. Ne pas modifier a la main :
-- la source est le CSV du catalogue V2, et une correction faite ici
-- disparaitrait a la prochaine generation.
-- =====================================================================

-- Le vocabulaire du referentiel V2 : 70 slugs, six familles.
--
-- Le nom affiche se deduit du slug et se corrige ensuite en administration :
-- ce lot le pose, il ne l'ecrase pas. Le visuel, l'ordre et l'activation
-- appartiennent a l'administration et ne sont jamais touches ici — sans
-- quoi rejouer le lot effacerait les tuiles posees a la main.
insert into public.tags (slug, name, groupe, sort_order) values
  ('image', 'Image', 'bibliotheque'::public.tag_group, 1),
  ('portrait', 'Portrait', 'usage'::public.tag_group, 2),
  ('retro', 'Retro', 'style'::public.tag_group, 3),
  ('studio', 'Studio', 'style'::public.tag_group, 4),
  ('contraste', 'Contraste', 'style'::public.tag_group, 5),
  ('papier', 'Papier', 'style'::public.tag_group, 6),
  ('technique', 'Technique', 'usage'::public.tag_group, 7),
  ('culture', 'Culture', 'usage'::public.tag_group, 8),
  ('cinema', 'Cinema', 'style'::public.tag_group, 9),
  ('celebration', 'Celebration', 'usage'::public.tag_group, 10),
  ('souvenir', 'Souvenir', 'usage'::public.tag_group, 11),
  ('miniature', 'Miniature', 'usage'::public.tag_group, 12),
  ('voyage', 'Voyage', 'usage'::public.tag_group, 13),
  ('photorealiste', 'Photorealiste', 'style'::public.tag_group, 14),
  ('mode', 'Mode', 'usage'::public.tag_group, 15),
  ('essayage', 'Essayage', 'usage'::public.tag_group, 16),
  ('beaute', 'Beaute', 'usage'::public.tag_group, 17),
  ('creatif', 'Creatif', 'usage'::public.tag_group, 18),
  ('surrealiste', 'Surrealiste', 'style'::public.tag_group, 19),
  ('3d', '3d', 'style'::public.tag_group, 20),
  ('editorial', 'Editorial', 'style'::public.tag_group, 21),
  ('couverture', 'Couverture', 'autre'::public.tag_group, 22),
  ('art', 'Art', 'usage'::public.tag_group, 23),
  ('illustration', 'Illustration', 'style'::public.tag_group, 24),
  ('effet', 'Effet', 'usage'::public.tag_group, 25),
  ('dessin', 'Dessin', 'usage'::public.tag_group, 26),
  ('fiction', 'Fiction', 'usage'::public.tag_group, 27),
  ('anime', 'Anime', 'style'::public.tag_group, 28),
  ('produit', 'Produit', 'usage'::public.tag_group, 29),
  ('ecommerce', 'Ecommerce', 'usage'::public.tag_group, 30),
  ('marketing', 'Marketing', 'usage'::public.tag_group, 31),
  ('publicite', 'Publicite', 'usage'::public.tag_group, 32),
  ('affiche', 'Affiche', 'autre'::public.tag_group, 33),
  ('design', 'Design', 'usage'::public.tag_group, 34),
  ('pedagogie', 'Pedagogie', 'usage'::public.tag_group, 35),
  ('interieur', 'Interieur', 'usage'::public.tag_group, 36),
  ('wallpaper', 'Wallpaper', 'autre'::public.tag_group, 37),
  ('experimental', 'Experimental', 'usage'::public.tag_group, 38),
  ('texte', 'Texte', 'bibliotheque'::public.tag_group, 39),
  ('synthese', 'Synthese', 'usage'::public.tag_group, 40),
  ('document', 'Document', 'autre'::public.tag_group, 41),
  ('conversation', 'Conversation', 'autre'::public.tag_group, 42),
  ('tableur', 'Tableur', 'autre'::public.tag_group, 43),
  ('donnees', 'Donnees', 'autre'::public.tag_group, 44),
  ('analyse', 'Analyse', 'usage'::public.tag_group, 45),
  ('decision', 'Decision', 'usage'::public.tag_group, 46),
  ('finance', 'Finance', 'usage'::public.tag_group, 47),
  ('juridique', 'Juridique', 'usage'::public.tag_group, 48),
  ('redaction', 'Redaction', 'usage'::public.tag_group, 49),
  ('professionnel', 'Professionnel', 'usage'::public.tag_group, 50),
  ('communication', 'Communication', 'usage'::public.tag_group, 51),
  ('presentation', 'Presentation', 'autre'::public.tag_group, 52),
  ('calcul', 'Calcul', 'usage'::public.tag_group, 53),
  ('prompt', 'Prompt', 'autre'::public.tag_group, 54),
  ('code', 'Code', 'autre'::public.tag_group, 55),
  ('transformation', 'Transformation', 'usage'::public.tag_group, 56),
  ('reflexion', 'Reflexion', 'bibliotheque'::public.tag_group, 57),
  ('assistant', 'Assistant', 'autre'::public.tag_group, 58),
  ('coaching', 'Coaching', 'autre'::public.tag_group, 59),
  ('simulation', 'Simulation', 'autre'::public.tag_group, 60),
  ('jeu', 'Jeu', 'autre'::public.tag_group, 61),
  ('interactif', 'Interactif', 'autre'::public.tag_group, 62),
  ('vfx', 'Vfx', 'usage'::public.tag_group, 63),
  ('compositing', 'Compositing', 'usage'::public.tag_group, 64),
  ('pop-culture', 'Pop Culture', 'usage'::public.tag_group, 65),
  ('cinematique', 'Cinematique', 'style'::public.tag_group, 66),
  ('artistique', 'Artistique', 'style'::public.tag_group, 67),
  ('fond-ecran', 'Fond Ecran', 'usage'::public.tag_group, 68),
  ('personnalisation', 'Personnalisation', 'usage'::public.tag_group, 69),
  ('personnage', 'Personnage', 'usage'::public.tag_group, 70)
on conflict (slug) do update
set groupe = excluded.groupe, updated_at = now();

do $rapport$
declare v_n integer;
begin
  select count(*) into v_n from public.tags;
  raise notice 'Referentiel de tags : % au total.', v_n;
end $rapport$;