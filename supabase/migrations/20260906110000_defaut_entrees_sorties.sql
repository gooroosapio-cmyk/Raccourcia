-- =====================================================================
-- RaccourcIA - 23. Valeurs par defaut des entrees et sorties
--
-- La migration 21 a rempli `input_examples`, `output_formats` et
-- `result_summary` pour les commandes existantes. Elle ne dit rien des
-- suivantes : une commande creee ensuite, par l'import du catalogue ou depuis
-- l'administration, arrivait avec des listes vides, donc une fiche muette sur
-- ce qu'elle accepte et ce qu'elle produit.
--
-- Une reprise ponctuelle ne pouvait pas tenir cette promesse dans le temps.
-- La derivation vit donc dans un declencheur : elle s'applique a chaque
-- insertion, quelle que soit la voie empruntee.
--
-- Le declencheur ne fait que combler un vide. Des qu'un administrateur
-- renseigne une liste, elle est respectee telle quelle : c'est lui qui sait
-- si la commande attend une photo de personne ou une photo de produit.
-- =====================================================================

create or replace function public.prompt_defauts_fiche()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if cardinality(coalesce(new.input_examples, '{}')) = 0 then
    new.input_examples := case new.input_type
      when 'image' then array['photo_produit', 'capture_ecran']::public.input_example_kind[]
      when 'text' then array['texte_brut', 'brief']::public.input_example_kind[]
      when 'document' then array['document_pdf', 'texte_brut']::public.input_example_kind[]
      when 'mixed' then array['texte_brut', 'capture_ecran']::public.input_example_kind[]
    end;
  end if;

  if cardinality(coalesce(new.output_formats, '{}')) = 0 then
    new.output_formats := case new.output_type
      when 'image' then array['image']::public.output_format_kind[]
      when 'text' then array['texte']::public.output_format_kind[]
      -- Une analyse se lit : c'est un texte structure, pas un PDF impose.
      when 'analysis' then array['texte']::public.output_format_kind[]
    end;
  end if;

  if new.result_summary is null or btrim(new.result_summary) = '' then
    new.result_summary := case
      when new.expected_output is not null and length(new.expected_output) between 10 and 140
        then new.expected_output
      else new.short_description
    end;
  end if;

  return new;
end;
$$;

comment on function public.prompt_defauts_fiche is
  'Comble les listes vides de la fiche a partir des types declares. Ne remplace jamais une valeur choisie.';

drop trigger if exists prompts_defauts_fiche on public.prompts;

create trigger prompts_defauts_fiche
  before insert or update of input_type, output_type, expected_output, short_description
  on public.prompts
  for each row
  execute function public.prompt_defauts_fiche();

-- Reprise des lignes que la migration 21 n'a pas vues : celles inserees entre
-- les deux migrations, et celles des environnements ou le catalogue est
-- importe apres coup.
update public.prompts
set input_type = input_type
where cardinality(input_examples) = 0
   or cardinality(output_formats) = 0
   or result_summary is null;
