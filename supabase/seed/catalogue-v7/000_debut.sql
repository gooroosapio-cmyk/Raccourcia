-- =====================================================================
-- Catalogue v7 / 000 — ouverture de la transaction
--
-- Les lots de ce dossier forment UNE transaction : ils se passent ensemble,
-- dans l'ordre, par le workflow Catalogue (psql lit leur concatenation). Le
-- 999 valide ; la repetition remplace le 999 par un echec volontaire.
--
-- Genere par scripts/build-catalogue-v7.py depuis data/catalogue/v7/ :
-- ne pas modifier a la main.
-- =====================================================================
begin;
set local lock_timeout = '15s';
