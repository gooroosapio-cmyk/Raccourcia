-- =====================================================================
-- Catalogue v7 / 100 — apercu et bilan, avant toute ecriture
--
-- Ce que la base doit etre pour recevoir le kit :
--   * chaque carte publiee du kit retrouve UNE carte vivante du site, par
--     card_id sinon par slug, et elle est publiee ;
--   * aucune nouvelle carte ne heurte un card_id, un slug ou un couple
--     (commande, card_slug) qui restera en base ;
--   * les brouillons du registre sont bien ceux du site.
-- Puis le bilan chiffre de ce qui part, affiche avant de l'emporter.
-- =====================================================================
create temporary table v7_correspondance on commit drop as
select k.card_id, coalesce(
  (select p.id from public.prompts p where p.card_id = k.card_id and p.status <> 'archived'),
  (select p.id from public.prompts p where p.slug = k.slug and p.status <> 'archived')
) as prompt_id
from v7_carte k where k.publiee;

create temporary table v7_brouillons_exclus on commit drop as
select p.id from public.prompts p
where p.status = 'draft'
  and (p.command::text, p.card_slug) in (('/adcreative', 'creatif-publicitaire'),
                                          ('/timeslice', 'tranche-temporelle'),
                                          ('/mirrorworld', 'monde-miroir'));

do $apercu$
declare v_n integer;
begin
  if (select count(*) from v7_carte) <> 1109 or (select count(*) from v7_carte where publiee) <> 349 then
    raise exception 'Catalogue v7 : le kit charge ne compte pas 1109 cartes dont 349 publiees.';
  end if;

  select count(*) into v_n from v7_correspondance where prompt_id is null;
  if v_n > 0 then
    raise exception 'Catalogue v7 : % carte(s) publiee(s) du kit introuvable(s) sur le site.', v_n;
  end if;
  select count(*) into v_n from v7_correspondance c join public.prompts p on p.id = c.prompt_id
  where p.status <> 'published';
  if v_n > 0 then
    raise exception 'Catalogue v7 : % carte(s) publiee(s) du kit ne le sont pas sur le site.', v_n;
  end if;
  if (select count(distinct prompt_id) from v7_correspondance) <> 349 then
    raise exception 'Catalogue v7 : deux cartes du kit designent la meme carte du site.';
  end if;

  -- Ce qui restera en base apres le menage : les cartes vivantes, moins les
  -- trois brouillons exclus.
  -- Une carte deja inseree par un passage precedent porte le meme card_id :
  -- ce n'est pas une collision, c'est la meme carte.
  select count(*) into v_n from v7_carte k
  where not k.publiee and exists (
    select 1 from public.prompts p
    where p.status <> 'archived' and p.id not in (select id from v7_brouillons_exclus)
      and p.card_id is distinct from k.card_id
      and (p.slug = k.slug
           or (p.command::text = k.command and coalesce(p.card_slug, '') = k.card_slug)));
  if v_n > 0 then
    raise exception 'Catalogue v7 : % nouvelle(s) carte(s) heurte(nt) une carte vivante du site.', v_n;
  end if;

  select count(*) into v_n from v7_brouillon b
  where not exists (select 1 from public.prompts p where p.status = 'draft' and p.slug = b.slug);
  if v_n > 0 then
    raise exception 'Catalogue v7 : % brouillon(s) du registre absent(s) du site.', v_n;
  end if;
  if (select count(*) from public.prompts where status = 'draft')
     <> (select count(*) from v7_brouillon) + (select count(*) from v7_brouillons_exclus) then
    raise exception 'Catalogue v7 : le site porte des brouillons que le registre ne connait pas.';
  end if;
  if (select count(*) from v7_brouillons_exclus) > 3 then
    raise exception 'Catalogue v7 : plus de trois brouillons exclus.';
  end if;
end $apercu$;

-- Le bilan : ce qui part avec le menage, ce qui arrive avec le kit.
select
  (select count(*) from public.prompts where status = 'archived') as commandes_archivees_supprimees,
  (select count(*) from public.copy_events e join public.prompts p on p.id = e.prompt_id
     where p.status = 'archived' or p.id in (select id from v7_brouillons_exclus)) as lignes_du_journal_supprimees,
  (select count(*) from public.copy_events e join public.prompt_variants v on v.id = e.variant_id
     where v.status = 'archived') as lignes_du_journal_sans_version,
  (select count(*) from public.favorites f join public.prompts p on p.id = f.prompt_id
     where p.status = 'archived' or p.id in (select id from v7_brouillons_exclus)) as favoris_supprimes,
  (select count(*) from public.recent_items r join public.prompts p on p.id = r.prompt_id
     where p.status = 'archived' or p.id in (select id from v7_brouillons_exclus)) as recents_supprimes,
  (select count(*) from public.prompt_aliases a
     where a.alias_prompt_id in (select id from public.prompts where status = 'archived')
        or a.canonical_prompt_id in (select id from public.prompts where status = 'archived')) as anciens_liens_supprimes,
  (select count(*) from public.prompt_variants where status = 'archived') as variantes_archivees_supprimees,
  (select count(*) from v7_brouillons_exclus) as brouillons_supprimes,
  (select count(*) from public.tags) as tags_remplaces,
  (select count(*) from v7_tag) as tags_du_kit,
  349 as cartes_mises_a_jour,
  760 as cartes_ajoutees,
  1335 as champs_du_kit,
  3121 as liens_de_tags_du_kit;
