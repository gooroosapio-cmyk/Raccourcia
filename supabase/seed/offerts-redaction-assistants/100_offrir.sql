-- =====================================================================
-- Lot offerts-redaction-assistants / 100 — six commandes offertes
--
-- Jusqu'ici, les 21 commandes offertes etaient toutes des Visuels : un
-- visiteur ne pouvait rien essayer en Redaction ni en Assistants. Decision
-- de cadrage 3A, validee le 24 septembre 2026 : trois de chaque.
--
--   Redaction   /message, /reecrire, /synthese — les usages les plus larges.
--   Assistants  /mode-organisation, /mode-socrate, /mode-entretien — un par
--               rayon (coach, personnage, simulation).
--
-- Les cartes sont visees par `card_id`, jamais par leur commande ou leur
-- slug. Le lot leve si l'une d'elles manque ou n'est pas publiee : offrir
-- un brouillon ne donnerait rien a copier.
--
-- Rejouable : une carte deja offerte n'est pas reecrite. Les commandes
-- offertes existantes ne sont pas touchees.
-- =====================================================================
begin;

create temporary table offertes (card_id text primary key, commande text not null) on commit drop;
insert into offertes values
  ('7adc2883-34e5-5128-9ef4-143bd4e54357', '/message'),
  ('b6b34f04-d74a-52b9-821c-90862136d87e', '/reecrire'),
  ('d54b5246-01eb-510c-86f8-2d1679985a68', '/synthese'),
  ('69dd56a6-75d9-591d-9659-55b388a8296c', '/mode-organisation'),
  ('af0f3b2d-08ce-5ae5-bb2b-3a81406a5e79', '/mode-socrate'),
  ('a0e207c8-1838-544e-96d8-63e27cec87f3', '/mode-entretien');

do $ctrl$
declare v_manquantes text;
begin
  select string_agg(o.commande, ', ') into v_manquantes
  from offertes o
  where not exists (
    select 1 from public.prompts p
    where p.card_id = o.card_id and p.status = 'published' and p.command = o.commande
  );
  if v_manquantes is not null then
    raise exception 'Lot offerts : carte(s) absente(s), non publiee(s) ou renommee(s) : %. Rien n''est ecrit.', v_manquantes;
  end if;
end $ctrl$;

-- Bilan avant ecriture.
select count(*) filter (where p.is_free) as deja_offertes,
       count(*) filter (where not p.is_free) as a_offrir,
       (select count(*) from public.prompts where is_free and status = 'published') as offertes_avant
from offertes o join public.prompts p on p.card_id = o.card_id;

update public.prompts p
   set is_free = true, updated_at = now()
  from offertes o
 where p.card_id = o.card_id and not p.is_free;

do $ctrl$
declare v_n integer;
begin
  select count(*) into v_n
  from offertes o join public.prompts p on p.card_id = o.card_id
  where p.is_free and p.status = 'published';
  if v_n <> 6 then
    raise exception 'Lot offerts : % commandes offertes sur 6.', v_n;
  end if;
end $ctrl$;

select coalesce(p.library::text, '(sans)') as bibliotheque, count(*) as offertes
from public.prompts p where p.is_free and p.status = 'published'
group by 1 order by 1;

commit;
