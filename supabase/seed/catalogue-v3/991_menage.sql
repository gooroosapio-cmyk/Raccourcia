-- =====================================================================
-- Catalogue V3 — retrait de la table de travail
--
-- Le dictionnaire n'a servi qu'a transporter les textes. Il disparait avec
-- ses fonctions : rien d'etranger au produit ne reste dans le schema.
-- =====================================================================

drop function if exists public.import_v3_payload(integer[]);
drop function if exists public.import_v3_tab(integer[]);
drop function if exists public.import_v3_t(integer);
drop table if exists public.import_v3_texte;
