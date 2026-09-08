-- =====================================================================
-- Catalogue V3 — dix nouveautes offertes
--
-- Une commande gratuite sert de demonstration : elle se copie sans achat. Le
-- choix couvre huit familles sur treize, evite la famille encore masquee
-- (Retouche & amelioration) et les documents contractuels, dont la sortie
-- demande une relecture humaine avant tout usage. Aucune gratuite existante
-- n'est retiree : ce lot ajoute, il ne remplace pas.
-- =====================================================================

update public.prompts
set is_free = true
where command::text in (
  '/flowchartvisual',      -- Technique & explication
  '/tshirtmockup',         -- Produit & publicite
  '/eventposter',          -- Produit & publicite
  '/cvportrait',           -- Portrait, mode & identite
  '/kitchenredesign',      -- Lieux, architecture & lifestyle
  '/stickerpack',          -- Styles creatifs & effets
  '/animeportrait',        -- Styles creatifs & effets
  '/whatsappsales',        -- Marketing & vente
  '/whatsappmessage',      -- Communication & contenu
  '/invoicegenerator'      -- Finance & gestion
)
and source_status = 'new_v3'
and not is_free;
