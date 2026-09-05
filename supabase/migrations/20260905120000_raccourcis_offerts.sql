-- =====================================================================
-- RaccourcIA - 17. Raccourcis offerts (essai avant achat)
--
-- `resolve_prompt` exempte de droit d'acces les raccourcis marques
-- `is_free` : c'est le seul mecanisme d'essai du produit. Aucun raccourci
-- ne l'etait, si bien qu'un visiteur ne pouvait rien copier avant d'avoir
-- paye. La cle `free_prompt_limit` d'`app_config` valait bien 5, mais elle
-- n'est lue nulle part dans le code : elle ne verrouillait ni n'ouvrait
-- quoi que ce soit.
--
-- Cinq raccourcis sont offerts, choisis pour montrer la valeur du catalogue
-- sous des angles differents plutot que pour leur proximite thematique :
--
--   /explodeview   image, technique  - vue eclatee d'un objet
--   /packshot      image, commercial - produit en visuel studio
--   /headshot      image, humain     - portrait professionnel
--   /rewriteclear  texte, utilitaire - reecriture d'un texte
--   /linkedinpost  texte, notoriete  - post LinkedIn structure
--
-- Le seed du catalogue ne touche pas `is_free` : ce marquage survit donc a
-- un reimport. Il est pose ici, et non a la main en production, pour qu'un
-- environnement neuf reproduise le meme palier d'essai.
--
-- Le classement, lui, ne depend pas de `is_featured` : la bibliotheque
-- remonte les raccourcis offerts en tete pour les seuls visiteurs sans
-- acces (`getCatalogPage`), ce qui laisse l'ordre des membres intact.
-- =====================================================================

update public.prompts
set is_free = true
where slug in ('explodeview', 'packshot', 'headshot', 'rewriteclear', 'linkedinpost');

-- Aucun autre raccourci ne doit rester offert par accident : le palier
-- d'essai est exactement cette liste.
update public.prompts
set is_free = false
where is_free
  and slug not in ('explodeview', 'packshot', 'headshot', 'rewriteclear', 'linkedinpost');
