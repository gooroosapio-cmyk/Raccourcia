-- =====================================================================
-- Le prix affiche : 4 900 FCFA par an
--
-- Le catalogue est passe de six cents a mille cinq cents commandes, et il
-- continue de grandir. Le montant suit, et la periode change : ce n'est
-- plus un paiement unique mais un acces annuel.
--
-- LA PERIODE EST UNE DONNEE, PAS UN MOT DANS LE CODE. L'interface
-- affichait « une fois » en dur sous le montant : changer le prix sans
-- changer cette mention aurait annonce un tarif annuel sous une promesse
-- de paiement unique — un engagement qu'on ne tient pas. `price_period`
-- vit donc a cote du montant, et les deux se corrigent ensemble depuis
-- l'administration.
--
-- LE PRIX DE REFERENCE N'EST PAS BARRE. `price_regular` reste a zero : un
-- montant barre qu'on n'a jamais pratique est une fausse remise, et
-- l'interface ne barre de toute facon que ce qui est reellement superieur.
--
-- EN SQL DIRECT, ET NON PAR `upsert_config`. Cette fonction existait le
-- temps de la migration qui l'a ecrite, puis s'est supprimee elle-meme :
-- c'etait un outil de pose, pas une porte laissee ouverte sur la table de
-- configuration. On ne la ressuscite pas pour un lot de valeurs.
--
-- Rejouable : `on conflict` ecrase la valeur, sans doublon. La description
-- n'est ecrasee que si la ligne n'en avait pas — une precision ajoutee
-- depuis l'administration ne doit pas etre effacee par un redeploiement.
-- =====================================================================

insert into public.app_config (key, value, description, is_public) values
  ('price_current', '4900'::jsonb,
   'Prix reellement demande. Doit correspondre a la fiche produit du vendeur.', true),
  ('price_regular', '0'::jsonb,
   'Prix de reference affiche barre. Mettre 0 pour ne rien barrer.', true),
  ('price_currency', '"FCFA"'::jsonb,
   'Devise affichee a cote du prix.', true),
  ('price_period', '"par an"'::jsonb,
   'Ce que le prix couvre : « par an », « une fois ». Affiche sous le montant.', true)
on conflict (key) do update
  set value = excluded.value,
      description = coalesce(nullif(public.app_config.description, ''), excluded.description),
      is_public = excluded.is_public,
      updated_at = now();

do $$
declare
  v_prix text;
  v_periode text;
begin
  select value #>> '{}' into v_prix from public.app_config where key = 'price_current';
  select value #>> '{}' into v_periode from public.app_config where key = 'price_period';
  raise notice 'Offre : % FCFA %.', v_prix, v_periode;
end $$;
