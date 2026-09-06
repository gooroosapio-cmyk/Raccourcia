-- =====================================================================
-- RaccourcIA - 20. Lien d'achat de l'acces a vie
--
-- La fenetre d'offre a besoin d'une destination pour son bouton principal.
-- Aucun lien d'achat n'existait dans l'application : l'activation, seule
-- voie proposee jusqu'ici, ne s'adresse qu'a un acheteur deja convaincu.
--
-- Le lien vit en configuration et non en dur dans le code : changer d'offre,
-- de boutique ou de page de vente ne doit pas demander un redeploiement.
-- Il est public, la fenetre etant rendue cote client.
-- =====================================================================

insert into public.app_config (key, value, description, is_public)
values (
  'purchase_url',
  '"https://oqyokpqq.mychariow.store/prd_kn3gxkco"'::jsonb,
  'Page de vente de l''acces a vie, ouverte depuis la fenetre d''offre.',
  true
)
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      is_public = excluded.is_public;
