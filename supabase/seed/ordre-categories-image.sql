-- =====================================================================
-- Ordre d'affichage des categories Image
--
-- L'ordre venait de l'import du classeur, qui suivait l'ordre de saisie et
-- non celui de la lecture. Il ouvrait sur « Technique & explication », la
-- categorie la plus specialisee, et repoussait « Styles creatifs & effets »
-- en derniere position — celle qui compte le plus de raccourcis et montre le
-- mieux ce que l'IA sait faire.
--
-- Le nouvel ordre est une decision editoriale : du plus demonstratif au plus
-- specialise.
--
--   1. Styles creatifs & effets        (IMG-06, 29 raccourcis)
--   2. Portrait, mode & identite       (IMG-03, 17)
--   3. Technique & explication         (IMG-01, 26)
--   4. Produit & publicite             (IMG-02, 26)
--   5. Lieux, architecture & lifestyle (IMG-05, 12)
--   6. Retouche & amelioration         (IMG-04, 20)
--
-- IMG-04 n'apparait pas dans la navigation : elle est masquee
-- (`is_visible = false`), et la RLS masque avec elle ses vingt raccourcis
-- publies. Sa place est fixee ici pour le jour ou elle sera publiee, mais sa
-- visibilite n'est pas touchee : ouvrir vingt raccourcis de plus est une
-- decision commerciale, pas une correction d'ordre.
--
-- Ce n'est pas une migration : aucun schema ne change. Le rapprochement se
-- fait par `external_ref`, la cle du classeur, et non par le libelle, qui
-- peut etre reecrit sans prevenir.
--
-- Idempotent : rejouable a l'identique.
-- =====================================================================

begin;

update public.categories set sort_order = 1 where external_ref = 'IMG-06';
update public.categories set sort_order = 2 where external_ref = 'IMG-03';
update public.categories set sort_order = 3 where external_ref = 'IMG-01';
update public.categories set sort_order = 4 where external_ref = 'IMG-02';
update public.categories set sort_order = 5 where external_ref = 'IMG-05';
update public.categories set sort_order = 6 where external_ref = 'IMG-04';

commit;
