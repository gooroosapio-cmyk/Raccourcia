-- =====================================================================
-- Catalogue v7 / 500 — identifiants
--
-- card_id est l'identite. Les 106 cartes publiees que le site connaissait
-- sans UUID (66 sans identifiant, 40 avec une chaine historique) recoivent
-- celui du kit ; les brouillons, celui du registre
-- data/catalogue/v7/identifiants-brouillons.csv (UUIDv5, meme espace de
-- noms que le kit). card_code suit.
-- =====================================================================
update public.prompts p
   set card_id = k.card_id
  from v7_correspondance c
  join v7_carte k on k.card_id = c.card_id
 where p.id = c.prompt_id and p.card_id is distinct from k.card_id;

update public.prompts p
   set card_id = b.card_id, card_code = b.card_code
  from v7_brouillon b
 where p.status = 'draft' and p.slug = b.slug
   and (p.card_id is distinct from b.card_id or p.card_code is distinct from b.card_code);
