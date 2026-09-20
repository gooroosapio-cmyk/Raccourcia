-- =====================================================================
-- L'ordre du feed Decouvrir
--
-- Le feed doit melanger les rayons. Pris dans l'ordre du catalogue, il
-- enchaine quarante portraits puis quarante produits : on croit avoir fait
-- le tour d'un catalogue de portraits avant d'avoir vu le reste.
--
-- POURQUOI UNE COLONNE ET PAS UN `order by random()`. Un feed se parcourt
-- par pages successives, et chaque page doit reprendre exactement ou la
-- precedente s'est arretee. Un ordre tire au sort a chaque requete rend les
-- doublons et les oublis inevitables — on revoit une carte deja vue, on en
-- saute une autre. Il empeche aussi de revenir a sa place apres avoir ouvert
-- une commande, ce que le feed doit permettre.
--
-- L'ordre est donc fixe une fois, par un hachage de l'identifiant : stable
-- d'une requete a l'autre et d'un visiteur au suivant, mais sans rapport
-- avec le rayon, la date ou le nom. C'est ce qui le rend varie.
--
-- Stocke et non calcule : un `order by` sur une expression ne peut pas
-- s'indexer simplement, et le feed trie plusieurs centaines de lignes a
-- chaque palier.
-- =====================================================================

alter table public.prompts
  add column if not exists discover_rank integer;

create or replace function public.prompts_rang_de_decouverte()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.discover_rank is null then
    -- `hashtext` rend un entier signe stable pour une chaine donnee : deux
    -- bases construites des memes migrations donnent le meme ordre.
    new.discover_rank := hashtext(new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists prompts_rang_de_decouverte on public.prompts;
create trigger prompts_rang_de_decouverte
  before insert or update on public.prompts
  for each row execute function public.prompts_rang_de_decouverte();

update public.prompts
set discover_rank = hashtext(id::text)
where discover_rank is null;

-- L'index porte les deux clefs du curseur : le rang, puis l'identifiant qui
-- departage deux rangs egaux. Sans la seconde, une page pourrait sauter ou
-- repeter une carte a la frontiere.
create index if not exists prompts_discover_idx
  on public.prompts (discover_rank, id)
  where status = 'published';
