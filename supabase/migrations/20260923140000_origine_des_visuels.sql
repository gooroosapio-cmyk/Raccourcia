-- =====================================================================
-- L'origine d'un visuel
--
-- La regle produit est simple : seuls les visuels deposes depuis la console
-- d'administration restent, ceux poses par script s'effacent. Elle etait
-- inapplicable, parce que rien ne distinguait les deux.
--
-- Les deux voies ecrivent le meme chemin de stockage, au caractere pres
-- (`prompts/<id>/<kind>-<horodatage>.<ext>`, lib/actions/admin.ts et
-- scripts/import-visuels.mjs), et `created_by` n'etait jamais renseigne : la
-- console ne le posait pas, le script non plus. Toutes les lignes deja en base
-- portent donc un auteur nul, et « garder les visuels d'administration »
-- revenait a n'en garder aucun.
--
-- Cette migration installe la distinction, sans rien effacer.
--
-- La console ecrit par le client du membre, donc sous son jeton : `auth.uid()`
-- rend son identifiant. Les scripts d'import ecrivent en `service_role`, sans
-- jeton d'utilisateur : `auth.uid()` y rend nul. Un defaut de colonne suffit
-- donc a separer les deux, et il tient meme si un futur chemin d'ecriture
-- oublie de renseigner l'auteur — ce qui ne serait pas vrai d'un correctif
-- pose dans une seule Server Action.
--
-- Ce que cette migration ne fait pas : classer l'existant. Les lignes ecrites
-- avant elle restent indistinguables, et c'est a l'administration de trancher
-- ce qu'elle en fait, visuel par visuel ou en bloc. Voir CLAUDE.md,
-- « Visuels : seul l'administrateur en depose ».
-- =====================================================================

alter table public.prompt_media
  alter column created_by set default auth.uid();

comment on column public.prompt_media.created_by is
  'Auteur du depot. Renseigne automatiquement pour la console d''administration '
  '(jeton utilisateur), nul pour une ecriture service_role — donc pour un script. '
  'Nul sur toutes les lignes anterieures au 23 septembre 2026, dont l''origine '
  'n''est pas reconstituable.';
