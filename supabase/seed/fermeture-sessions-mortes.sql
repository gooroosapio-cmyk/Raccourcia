-- =====================================================================
-- Fermeture des sessions applicatives orphelines
--
-- Avant la migration 20260907090000, rien ne refermait une ligne de
-- `app_sessions` : une session Auth detruite laissait la sienne « active »
-- indefiniment. La production comptait soixante lignes actives pour deux
-- sessions Auth reelles.
--
-- Cette requete referme les lignes deja orphelines au moment de la mise a
-- jour. La migration se charge des suivantes : elle nettoie a chaque
-- enregistrement d'appareil et a chaque deconnexion.
--
-- Ce n'est pas une migration : aucun schema ne change, seules des lignes de
-- journal sont remises en accord avec la realite. Rien n'est supprime — le
-- statut passe a `revoked`, l'historique reste lisible.
--
-- Idempotent : rejouable sans effet une fois les lignes refermees.
-- =====================================================================

update public.app_sessions s
set status = 'revoked',
    revoked_at = coalesce(s.revoked_at, now())
where s.status = 'active'
  and not exists (
    select 1 from auth.sessions a where a.id = s.auth_session_id
  );
