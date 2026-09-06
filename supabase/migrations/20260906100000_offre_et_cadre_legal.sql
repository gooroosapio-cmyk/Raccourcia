-- =====================================================================
-- RaccourcIA - 22. Offre commerciale et cadre legal
--
-- Deux manques bloquaient la mise en ligne d'un produit payant :
--   - aucun prix n'etait affiche nulle part ;
--   - aucune mention legale, politique de confidentialite ni conditions.
--
-- Les deux vivent en configuration, jamais en dur dans le code :
--   - un prix change souvent, et un changement de prix ne doit pas demander
--     une mise en ligne ;
--   - les mentions legales dependent d'informations d'entreprise que seul
--     l'editeur detient. Les laisser en dur obligerait a un deploiement pour
--     chaque correction, et a ecrire dans le depot des donnees nominatives.
--
-- Les champs legaux non renseignes s'affichent comme "a completer" cote
-- public : mieux vaut une mention visiblement incomplete qu'une mention
-- inventee.
-- =====================================================================

create or replace function public.upsert_config(
  p_key text,
  p_value jsonb,
  p_description text,
  p_is_public boolean
) returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  insert into public.app_config (key, value, description, is_public)
  values (p_key, p_value, p_description, p_is_public)
  on conflict (key) do update
    set description = excluded.description,
        is_public = excluded.is_public;
$$;

comment on function public.upsert_config is
  'Pose un reglage sans jamais ecraser une valeur deja choisie par un admin.';

-- ---------------------------------------------------------------------
-- Offre
-- ---------------------------------------------------------------------

select public.upsert_config(
  'price_regular',
  '11000'::jsonb,
  'Prix de reference affiche barre. Mettre 0 pour ne rien barrer.',
  true
);

select public.upsert_config(
  'price_current',
  '3900'::jsonb,
  'Prix reellement demande. Doit correspondre a la fiche produit Chariow.',
  true
);

select public.upsert_config(
  'price_currency',
  '"FCFA"'::jsonb,
  'Devise affichee a cote du prix.',
  true
);

-- ---------------------------------------------------------------------
-- Cadre legal
--
-- Une ligne par information que l'editeur doit fournir. Les valeurs vides
-- sont volontaires : elles rendent visible ce qui reste a completer, dans
-- l'administration comme sur les pages publiques.
-- ---------------------------------------------------------------------

select public.upsert_config('legal_editor', '""'::jsonb,
  'Raison sociale ou nom et prenom de l''editeur.', true);
select public.upsert_config('legal_editor_form', '""'::jsonb,
  'Forme juridique (SARL, entreprise individuelle...).', true);
select public.upsert_config('legal_capital', '""'::jsonb,
  'Capital social, en FCFA.', true);
select public.upsert_config('legal_registration', '""'::jsonb,
  'RCCM ou numero d''immatriculation.', true);
select public.upsert_config('legal_address', '""'::jsonb,
  'Adresse complete du siege.', true);
select public.upsert_config('legal_representative', '""'::jsonb,
  'Representant legal : nom et qualite.', true);
select public.upsert_config('legal_publication_director', '""'::jsonb,
  'Directeur de la publication : nom et fonction.', true);
select public.upsert_config('legal_host', '""'::jsonb,
  'Nom de l''hebergeur du service.', true);
select public.upsert_config('legal_host_address', '""'::jsonb,
  'Adresse de l''hebergeur.', true);
select public.upsert_config('legal_host_contact', '""'::jsonb,
  'Contact de l''hebergeur.', true);
select public.upsert_config('legal_contact_email', '""'::jsonb,
  'Adresse de contact general.', true);
select public.upsert_config('legal_privacy_email', '""'::jsonb,
  'Adresse dediee aux demandes sur les donnees personnelles.', true);
select public.upsert_config('legal_support_email', '""'::jsonb,
  'Adresse du support, citee dans les conditions.', true);
select public.upsert_config('legal_payment_provider', '""'::jsonb,
  'Prestataire de paiement qui confirme la commande.', true);
select public.upsert_config('legal_refund_policy', '""'::jsonb,
  'Regles de remboursement, ou lien vers celles-ci.', true);
select public.upsert_config('legal_retention_account', '""'::jsonb,
  'Duree de conservation des donnees de compte apres fermeture.', true);
select public.upsert_config('legal_retention_support', '""'::jsonb,
  'Duree de conservation des demandes de support.', true);
select public.upsert_config('legal_retention_logs', '""'::jsonb,
  'Duree de conservation des journaux de securite.', true);
select public.upsert_config('legal_updated_at', '"5 septembre 2026"'::jsonb,
  'Date de la version en vigueur du cadre legal.', true);

drop function public.upsert_config(text, jsonb, text, boolean);
