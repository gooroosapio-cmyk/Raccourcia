-- =====================================================================
-- Catalogue v7 : ce que le contrat d'import 7.0 apporte au schema
--
-- Le kit « RaccourcIA-final » (24 septembre 2026) livre 1 109 cartes et une
-- taxonomie de 72 tags. Deux choses lui manquent en base :
--
--   * un groupe de tags « Lieu » (Afrique, Asie, Europe, Ameriques,
--     Oceanie). « Contexte » existe mais dit autre chose ; la taxonomie du
--     kit fait reference, elle est reprise telle quelle ;
--   * le code lisible d'une carte, `RCIA-C-000001`. `card_id` reste
--     l'identite ; le code sert a la designer entre humains, et ne se
--     renumerote jamais — une carte supprimee ne libere pas le sien.
--
-- Idempotente. La nouvelle valeur d'enum n'est pas utilisee ici : Postgres
-- refuse de s'en servir dans la transaction qui la cree.
-- =====================================================================

alter type public.tag_group add value if not exists 'lieu';

alter table public.prompts add column if not exists card_code text;

do $contrainte$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.prompts'::regclass and conname = 'prompts_card_code_format'
  ) then
    alter table public.prompts
      add constraint prompts_card_code_format
      check (card_code is null or card_code ~ '^RCIA-C-[0-9]{6}$');
  end if;
end $contrainte$;

create unique index if not exists prompts_card_code_unique
  on public.prompts (card_code) where card_code is not null;

comment on column public.prompts.card_code is
  'Code lisible de la carte (RCIA-C-000001), attribue une fois, jamais renumerote. L''identite reste card_id.';
